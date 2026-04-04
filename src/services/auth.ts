import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/user';

const JWT_SECRET = process.env.JWT_SECRET || 'pos-secret-key-change-in-production';
const JWT_EXPIRES = '24h';

export interface TokenPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
}

export async function register(email: string, password: string, name: string, role?: string) {
  const existing = await userRepo.getUserByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }
  
  const result = await userRepo.createUser({ email, password, name, role });
  const user = await userRepo.getUserById(Number(result[0]?.insertId));
  if (!user) {
    throw new Error('Failed to create user');
  }
  
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(email: string, password: string) {
  const user = await userRepo.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }
  if (!user.isActive) {
    throw new Error('Account is disabled');
  }
  
  const isValid = await userRepo.verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  await userRepo.updateUserLastLogin(user.id);
  
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  
  return { token, user: payload };
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new Error('Invalid token');
  }
}

export async function resetPassword(email: string, newPassword: string) {
  const user = await userRepo.getUserByEmail(email);
  if (!user) {
    throw new Error('Email not found');
  }
  
  await userRepo.updatePassword(user.id, newPassword);
  return { success: true };
}