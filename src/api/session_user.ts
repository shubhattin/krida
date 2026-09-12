export type SessionUserSnapshot = {
  id: string;
  name: string;
};

export type SessionUserFields = {
  user_id: string | null;
  user_name: string | null;
};

/** Snapshot the signed-in user onto a play session, or leave both fields null. */
export function sessionUserFields(user: SessionUserSnapshot | null | undefined): SessionUserFields {
  if (!user) {
    return { user_id: null, user_name: null };
  }
  return {
    user_id: user.id,
    user_name: user.name
  };
}

/** Prefer the stored display name; fall back to a short player label. */
export function displayUserName(userId: string, userName: string | null | undefined): string {
  const trimmed = userName?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return `Player ${userId.slice(0, 8)}`;
}
