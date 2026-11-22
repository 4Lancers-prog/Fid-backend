import { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: UserRole;
      name: string;
    }
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
