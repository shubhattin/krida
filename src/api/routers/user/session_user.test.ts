import { describe, expect, it } from 'vitest';
import { displayUserName, sessionUserFields } from './session_user';

describe('sessionUserFields', () => {
  it('returns null when there is no signed-in user', () => {
    expect(sessionUserFields(undefined)).toEqual({ user_id: null });
  });

  it('snapshots id from the auth user', () => {
    expect(sessionUserFields({ id: 'user_abc', name: 'Ada' })).toEqual({
      user_id: 'user_abc'
    });
  });
});

describe('displayUserName', () => {
  it('uses a trimmed stored name', () => {
    expect(displayUserName('user_abc', '  Ada  ')).toBe('Ada');
  });

  it('falls back to a short player label', () => {
    expect(displayUserName('abcdefghijk', null)).toBe('Player abcdefgh');
    expect(displayUserName('short', '   ')).toBe('Player short');
  });
});
