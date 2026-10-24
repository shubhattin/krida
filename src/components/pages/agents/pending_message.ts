/**
 * The first message of a chat started from the New chat screen. The chat is created first,
 * then the chat page picks this up and sends it — so the reply streams on the chat's own URL.
 * Kept in sessionStorage (module state as fallback) so a reload between create and mount
 * doesn't orphan the chat.
 */
const pending = new Map<string, string>();

const storageKey = (chatId: string) => `agent-pending-message:${chatId}`;

function readStored(chatId: string): string | undefined {
  try {
    const text = sessionStorage.getItem(storageKey(chatId));
    return text === null ? undefined : text;
  } catch {
    return undefined;
  }
}

export function setPendingMessage(chatId: string, text: string) {
  pending.set(chatId, text);
  try {
    sessionStorage.setItem(storageKey(chatId), text);
  } catch {
    // Private mode etc: module state still covers the same-tab flow.
  }
}

export function takePendingMessage(chatId: string): string | undefined {
  const text = pending.get(chatId) ?? readStored(chatId);
  pending.delete(chatId);
  try {
    sessionStorage.removeItem(storageKey(chatId));
  } catch {
    // ignore
  }
  return text;
}
