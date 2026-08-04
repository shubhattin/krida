import { describe, expect, it } from 'vitest';
import {
  BadRequestError,
  ConfigError,
  DatabaseError,
  NotFoundError,
  ValidationError,
  isKnownError
} from './errors';

describe('isKnownError', () => {
  it('recognizes tagged application errors', () => {
    expect(isKnownError(NotFoundError.make({ resource: 'puzzle', message: 'missing' }))).toBe(true);
    expect(isKnownError(BadRequestError.make({ message: 'bad' }))).toBe(true);
    expect(isKnownError(ValidationError.make({ message: 'invalid' }))).toBe(true);
    expect(isKnownError(ConfigError.make({ message: 'cfg' }))).toBe(true);
    expect(isKnownError(DatabaseError.make({ operation: 'query', cause: new Error('db') }))).toBe(
      true
    );
  });

  it('rejects plain objects and Error instances', () => {
    expect(isKnownError(new Error('nope'))).toBe(false);
    expect(isKnownError({ message: 'looks similar' })).toBe(false);
    expect(isKnownError({ _tag: 'NotARealError' })).toBe(false);
    expect(isKnownError(null)).toBe(false);
    expect(isKnownError(undefined)).toBe(false);
  });
});
