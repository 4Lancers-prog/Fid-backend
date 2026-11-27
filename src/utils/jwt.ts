import { randomUUID } from 'crypto';
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
  sub: string; // userId who started the session
  sid: string; // unique session id (keys the temporary uploads)
  typ: 'upload';
}

export function signUploadToken(userId: string): string {
  return jwt.sign({ sub: userId, sid: randomUUID(), typ: 'upload' } as UploadTokenPayload, env.jwt.accessSecret, {
    expiresIn: '2h',
  });
}

export function verifyUploadToken(token: string): UploadTokenPayload {
  const payload = jwt.verify(token, env.jwt.accessSecret) as UploadTokenPayload;
  if (payload.typ !== 'upload') throw new Error('Not an upload token');
  return payload;
}
