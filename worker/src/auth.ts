import { SignJWT, jwtVerify } from 'jose';

export interface AuthUser {
  userId: string;
  email: string;
}

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );
  return `${bytesToBase64(salt)}.${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltValue, hashValue] = stored.split('.');
  if (!saltValue || !hashValue) return false;

  const salt = base64ToBytes(saltValue);
  const expected = base64ToBytes(hashValue);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < actual.length; i += 1) {
    mismatch |= actual[i] ^ expected[i];
  }
  return mismatch === 0;
}

export async function signToken(userId: string, email: string, secret: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encoder.encode(secret));
}

export async function verifyToken(token: string, secret: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  const userId = payload.sub;
  const email = typeof payload.email === 'string' ? payload.email : '';
  if (!userId) throw new Error('Invalid token');
  return { userId, email };
}

export function getBearerToken(request: Request) {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}
