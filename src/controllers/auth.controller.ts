import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as authService from '../services/auth.service';
import { env } from '../config/env';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    // Cross-site in production (frontend and backend on different domains) requires
    // SameSite=None + Secure so the browser sends the refresh cookie back.
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const registrationQr = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await authService.getRegistrationQr() });
});

export const registerRequest = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.requestRegistration(req.body);
  res.status(201).json({
    success: true,
    data: { user, message: 'Registration submitted. An administrator will review and approve your account.' },
  });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.registerUser(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(201).json({ success: true, data: { user, accessToken: tokens.accessToken } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.loginUser(req.body.email, req.body.password);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ success: true, data: { user, accessToken: tokens.accessToken } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.unauthorized('Your session has expired. Please log in again to continue.', 'NO_REFRESH');
  const tokens = await authService.refreshTokens(token);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ success: true, data: { accessToken: tokens.accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.revokeTokens(req.user.id);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth', secure: env.isProd, sameSite: env.isProd ? 'none' : 'lax' });
  res.json({ success: true, data: { message: 'Signed out successfully.' } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json({ success: true, data: { user } });
});
