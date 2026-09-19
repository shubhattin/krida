export type SessionUserSnapshot = {
  id: string;
  name: string;
};

export type SessionUserFields = {
  user_id: string | null;
};

/** Snapshot the signed-in user onto a play session, or leave null for guests. */
export function sessionUserFields(user: SessionUserSnapshot | null | undefined): SessionUserFields {
  if (!user) {
    return { user_id: null };
  }
  return { user_id: user.id };
}

/** Prefer the resolved display name; fall back to a short player label. */
export function displayUserName(userId: string, userName: string | null | undefined): string {
  const trimmed = userName?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return `Player ${userId.slice(0, 8)}`;
}
