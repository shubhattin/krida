import { atom } from 'jotai';
import type { SimpleGameEditorAtoms } from './SimpleGameEditShell';
import type { EditableAttachment } from './SimpleGameAttachments';

export function createSimpleGameEditorAtoms<T>(emptyData: T): SimpleGameEditorAtoms<T> {
  return {
    title: atom(''),
    description: atom(''),
    listed: atom(false),
    puzzleData: atom(emptyData),
    attachments: atom<EditableAttachment[]>([]),
    lipi: atom(true)
  };
}
