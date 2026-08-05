'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react';
import { useStore, type PrimitiveAtom } from 'jotai';

// jotai atoms are invariant; callers pass PrimitiveAtom<T> for many T.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- AtomMap must accept heterogeneous atom value types
type AtomMap = Record<string, PrimitiveAtom<any>>;
type SnapshotOf<M extends AtomMap> = {
  [K in keyof M]: M[K] extends PrimitiveAtom<infer V> ? V : never;
};

const MAX_STACK = 100;

type HistoryActions = {
  undo(): void;
  redo(): void;
  commit(): void;
  beginTyping(): void;
  endTyping(): void;
  /** Freeze the current snapshot as the in-flight save baseline. */
  beginSave(): void;
  /**
   * Mark the beginSave() snapshot (or current, if none) as saved.
   * Optional patch overlays fields reconciled after the server response (e.g. attachment ids).
   */
  markSaved(patch?: Record<string, unknown>): void;
  /** Copy current values of the given keys into the saved baseline (e.g. after persisted image save). */
  acceptKeysAsSaved(...keys: string[]): void;
};

type HistoryState = {
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  changeCount: number;
};

type HistoryContextValue = {
  actions: HistoryActions;
  subscribe: (listener: () => void) => () => void;
  getState: () => HistoryState;
  getServerSnapshot: () => HistoryState;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

const EMPTY_STATE: HistoryState = {
  canUndo: false,
  canRedo: false,
  isDirty: false,
  changeCount: 0
};

function cloneSnapshot<T>(value: T): T {
  return structuredClone(value);
}

function serializeSnapshot(value: unknown): string {
  return JSON.stringify(value);
}

export function EditorHistoryProvider<M extends AtomMap>({
  atoms,
  comparable,
  children
}: {
  atoms: M;
  comparable?: (snapshot: SnapshotOf<M>) => unknown;
  children: ReactNode;
}) {
  const store = useStore();
  // Stable list of [key, atom] for the lifetime of this atoms object.
  const atomEntriesRef = useRef(Object.entries(atoms) as [keyof M & string, M[keyof M]][]);
  const comparableRef = useRef(comparable);

  const lastCommittedRef = useRef<SnapshotOf<M> | null>(null);
  const savedBaselineRef = useRef<SnapshotOf<M> | null>(null);
  const undoStackRef = useRef<SnapshotOf<M>[]>([]);
  const redoStackRef = useRef<SnapshotOf<M>[]>([]);
  const typingDepthRef = useRef(0);
  const isRestoringRef = useRef(false);
  const savedStackDepthRef = useRef(0);
  const commitScheduledRef = useRef(false);
  const didInitRef = useRef(false);
  const pendingSaveRef = useRef<SnapshotOf<M> | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  // Cached state so useSyncExternalStore can bail out on referential equality.
  const stateCacheRef = useRef<HistoryState>(EMPTY_STATE);

  const takeSnapshot = useCallback((): SnapshotOf<M> => {
    const snap = {} as SnapshotOf<M>;
    for (const [key, atom] of atomEntriesRef.current) {
      snap[key] = store.get(atom) as SnapshotOf<M>[typeof key];
    }
    return snap;
  }, [store]);

  const restoreSnapshot = useCallback(
    (snapshot: SnapshotOf<M>) => {
      for (const [key, atom] of atomEntriesRef.current) {
        store.set(atom, cloneSnapshot(snapshot[key]));
      }
    },
    [store]
  );

  const serialize = useCallback((snapshot: SnapshotOf<M>) => {
    const comparableFn = comparableRef.current;
    return serializeSnapshot(comparableFn ? comparableFn(snapshot) : snapshot);
  }, []);

  const computeState = useCallback((): HistoryState => {
    const saved = savedBaselineRef.current;
    if (!saved) return EMPTY_STATE;
    const current = takeSnapshot();
    return {
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
      isDirty: serialize(current) !== serialize(saved),
      changeCount: Math.max(0, undoStackRef.current.length - savedStackDepthRef.current)
    };
  }, [serialize, takeSnapshot]);

  const notify = useCallback(() => {
    stateCacheRef.current = computeState();
    for (const listener of listenersRef.current) listener();
  }, [computeState]);

  const getState = useCallback(() => stateCacheRef.current, []);
  const getServerSnapshot = useCallback(() => EMPTY_STATE, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const commitNow = useCallback(() => {
    if (isRestoringRef.current) return;
    if (typingDepthRef.current > 0) return;

    const current = takeSnapshot();
    const last = lastCommittedRef.current;
    if (!last) {
      lastCommittedRef.current = cloneSnapshot(current);
      if (!savedBaselineRef.current) {
        savedBaselineRef.current = cloneSnapshot(current);
      }
      notify();
      return;
    }

    if (serialize(current) === serialize(last)) {
      // Comparable-equal but raw snapshot may still differ (e.g. client-only word ids).
      // Refresh lastCommitted so later commits don't push a no-op undo entry.
      lastCommittedRef.current = cloneSnapshot(current);
      notify();
      return;
    }

    undoStackRef.current.push(cloneSnapshot(last));
    if (undoStackRef.current.length > MAX_STACK) {
      undoStackRef.current.shift();
      savedStackDepthRef.current = Math.max(0, savedStackDepthRef.current - 1);
    }
    lastCommittedRef.current = cloneSnapshot(current);
    redoStackRef.current = [];
    notify();
  }, [notify, serialize, takeSnapshot]);

  const scheduleCommit = useCallback(() => {
    if (isRestoringRef.current || typingDepthRef.current > 0) return;
    if (commitScheduledRef.current) return;
    commitScheduledRef.current = true;
    queueMicrotask(() => {
      commitScheduledRef.current = false;
      commitNow();
    });
  }, [commitNow]);

  // Keep latest commit helpers in refs so the atom-subscription effect stays mounted once.
  const scheduleCommitRef = useRef(scheduleCommit);
  const notifyRef = useRef(notify);
  const takeSnapshotRef = useRef(takeSnapshot);

  useEffect(() => {
    atomEntriesRef.current = Object.entries(atoms) as [keyof M & string, M[keyof M]][];
    comparableRef.current = comparable;
    scheduleCommitRef.current = scheduleCommit;
    notifyRef.current = notify;
    takeSnapshotRef.current = takeSnapshot;
  }, [atoms, comparable, scheduleCommit, notify, takeSnapshot]);

  // Seed baselines once, then subscribe for the lifetime of this provider instance.
  useEffect(() => {
    if (!didInitRef.current) {
      const initial = takeSnapshotRef.current();
      lastCommittedRef.current = cloneSnapshot(initial);
      savedBaselineRef.current = cloneSnapshot(initial);
      undoStackRef.current = [];
      redoStackRef.current = [];
      savedStackDepthRef.current = 0;
      didInitRef.current = true;
      notifyRef.current();
    }

    const unsubscribers = atomEntriesRef.current.map(([, atom]) =>
      store.sub(atom, () => {
        if (isRestoringRef.current) return;
        // Refresh dirty UI immediately; commit only when not mid-typing.
        notifyRef.current();
        if (typingDepthRef.current > 0) return;
        scheduleCommitRef.current();
      })
    );

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [store]);

  const actions = useMemo<HistoryActions>(
    () => ({
      undo() {
        if (undoStackRef.current.length === 0) return;
        const current = takeSnapshot();
        const previous = undoStackRef.current.pop()!;
        redoStackRef.current.push(cloneSnapshot(current));
        isRestoringRef.current = true;
        restoreSnapshot(previous);
        lastCommittedRef.current = cloneSnapshot(previous);
        isRestoringRef.current = false;
        notify();
      },
      redo() {
        if (redoStackRef.current.length === 0) return;
        const current = takeSnapshot();
        const next = redoStackRef.current.pop()!;
        undoStackRef.current.push(cloneSnapshot(current));
        isRestoringRef.current = true;
        restoreSnapshot(next);
        lastCommittedRef.current = cloneSnapshot(next);
        isRestoringRef.current = false;
        notify();
      },
      commit() {
        commitNow();
      },
      beginTyping() {
        typingDepthRef.current += 1;
      },
      endTyping() {
        typingDepthRef.current = Math.max(0, typingDepthRef.current - 1);
        if (typingDepthRef.current === 0) {
          commitNow();
        }
      },
      beginSave() {
        pendingSaveRef.current = cloneSnapshot(takeSnapshot());
      },
      markSaved(patch?: Record<string, unknown>) {
        const base = pendingSaveRef.current ?? takeSnapshot();
        pendingSaveRef.current = null;
        const next = cloneSnapshot(base);
        if (patch) {
          for (const [key, value] of Object.entries(patch)) {
            (next as Record<string, unknown>)[key] = cloneSnapshot(value);
          }
        }
        savedBaselineRef.current = next;
        lastCommittedRef.current = cloneSnapshot(next);
        savedStackDepthRef.current = undoStackRef.current.length;
        notify();
      },
      acceptKeysAsSaved(...keys: string[]) {
        const current = takeSnapshot();
        const baseline = savedBaselineRef.current;
        const last = lastCommittedRef.current;
        if (!baseline) {
          savedBaselineRef.current = cloneSnapshot(current);
          lastCommittedRef.current = cloneSnapshot(current);
          notify();
          return;
        }
        const nextBaseline = cloneSnapshot(baseline);
        const nextLast = last ? cloneSnapshot(last) : cloneSnapshot(current);
        for (const key of keys) {
          if (key in current) {
            const value = cloneSnapshot((current as Record<string, unknown>)[key]);
            (nextBaseline as Record<string, unknown>)[key] = value;
            (nextLast as Record<string, unknown>)[key] = value;
          }
        }
        savedBaselineRef.current = nextBaseline;
        lastCommittedRef.current = nextLast;
        notify();
      }
    }),
    [commitNow, notify, restoreSnapshot, takeSnapshot]
  );

  const value = useMemo<HistoryContextValue>(
    () => ({ actions, subscribe, getState, getServerSnapshot }),
    [actions, subscribe, getState, getServerSnapshot]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

function useHistoryContext(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error('Editor history hooks must be used within EditorHistoryProvider');
  }
  return ctx;
}

export function useEditorHistoryActions(): HistoryActions {
  return useHistoryContext().actions;
}

export function useEditorHistoryState(): HistoryState {
  const { subscribe, getState, getServerSnapshot } = useHistoryContext();
  return useSyncExternalStore(subscribe, getState, getServerSnapshot);
}

export function useHistoryTextField(): {
  onFocus: () => void;
  onBlur: () => void;
} {
  const { beginTyping, endTyping } = useEditorHistoryActions();
  const focusedRef = useRef(false);

  useEffect(
    () => () => {
      // Field unmounted while focused (list row removed, etc.) — balance typingDepth.
      if (focusedRef.current) {
        focusedRef.current = false;
        endTyping();
      }
    },
    [endTyping]
  );

  return useMemo(
    () => ({
      onFocus: () => {
        if (focusedRef.current) return;
        focusedRef.current = true;
        beginTyping();
      },
      onBlur: () => {
        if (!focusedRef.current) return;
        focusedRef.current = false;
        endTyping();
      }
    }),
    [beginTyping, endTyping]
  );
}
