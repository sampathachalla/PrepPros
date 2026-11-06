import type { Request, Response } from 'express';
import { loginSchema, refreshTokenSchema, resendConfirmationSchema, signupSchema } from './schema.js';
import * as service from './service.js';

export async function signup(req: Request, res: Response) {
  const input = signupSchema.parse(req.body);
  res.status(201).json(await service.signup(input));
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  res.json(await service.login(input));
}

/** Answers the same whether or not the account exists. */
export async function resendConfirmation(req: Request, res: Response) {
  const { identifier } = resendConfirmationSchema.parse(req.body);
  await service.resendConfirmation(identifier);
  res.status(202).json({ detail: 'If this account still needs confirming, a new email is on its way.' });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshTokenSchema.parse(req.body);
  res.json(await service.refresh(refreshToken));
}

/** Requires the session's access token (`requireAuth` has already validated it). */
export async function logout(req: Request, res: Response) {
  const accessToken = req.headers.authorization!.slice('Bearer '.length).trim();
  await service.logout(accessToken);
  res.status(204).end();
}
