import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.').max(320));

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z][a-z0-9_.]{2,29}$/,
    'Username must be 3–30 characters: letters, numbers, _ or ., starting with a letter.',
  );

export const roleSchema = z.enum(['Trainer', 'Member'], 'Choose Trainer or Member.');

export const signupSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Password must contain at least 8 characters.')
      .max(72, 'Password is too long.'),
    confirmPassword: z.string(),
    role: roleSchema.default('Member'),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  /** Email or username. */
  identifier: z.string().trim().toLowerCase().min(1, 'Enter your email or username.').max(320),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const resendConfirmationSchema = loginSchema.pick({ identifier: true });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required').max(500),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
