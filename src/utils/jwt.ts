import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  name: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export interface UploadTokenPayload {
  sub: string; // userId whose documents these uploads belong to
  typ: 'upload';
}

export function signUploadToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'upload' } as UploadTokenPayload, env.jwt.accessSecret, {
    expiresIn: '30m',
  });
}

export function verifyUploadToken(token: string): UploadTokenPayload {
  const payload = jwt.verify(token, env.jwt.accessSecret) as UploadTokenPayload;
  if (payload.typ !== 'upload') throw new Error('Not an upload token');
  return payload;
}
