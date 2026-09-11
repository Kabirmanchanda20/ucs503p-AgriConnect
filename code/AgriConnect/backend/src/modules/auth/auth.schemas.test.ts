import { describe, expect, it } from 'vitest';
import { loginSchema } from './auth.schemas.js';

describe('loginSchema', () => {
  it('rejects an empty password', () => {
    expect(
      loginSchema.safeParse({ email: 'farmer@example.com', password: '' }).success,
    ).toBe(false);
  });

  it('accepts a non-empty password', () => {
    const parsed = loginSchema.parse({
      email: 'farmer@example.com',
      password: 'secret',
    });
    expect(parsed.password).toBe('secret');
  });
});
