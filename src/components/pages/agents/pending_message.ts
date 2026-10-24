/**
 * The first message of a chat started from the New chat screen. The chat is created first,
 * then the chat page picks this up and sends it — so the reply streams on the chat's own URL.
 */
const pending = new Map<string, string>();

export function setPendingMessage(chatId: string, text: string) {
  pending.set(chatId, text);
}

export function takePendingMessage(chatId: string): string | undefined {
  const text = pending.get(chatId);
  pending.delete(chatId);
  return text;
}
