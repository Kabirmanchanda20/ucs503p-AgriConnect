import { z } from 'zod';

const email = z.email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);
const optionalLocation = z.string().trim().min(1).max(100).optional();

export const registerSchema = z
  .object({
    email,
    password,
    name: z.string().trim().min(1).max(100),
    role: z.enum(['FARMER', 'BUYER']),
    phone: z.string().trim().min(1).max(30).optional(),
    state: optionalLocation,
    district: optionalLocation,
    village: optionalLocation,
    languagePref: z.string().trim().min(2).max(20).default('en'),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1).max(128),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(512),
    password,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
