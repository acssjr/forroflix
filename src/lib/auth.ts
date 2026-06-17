import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chave-secreta-forroflix-2026-roots-orange-gradient'
);

// Gerar token JWT assinado (expira em 7 dias)
export async function signJWT(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Verificar e decodificar token JWT
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (_error) {
    return null;
  }
}

// Criptografar senha
export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Verificar senha criptografada
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
