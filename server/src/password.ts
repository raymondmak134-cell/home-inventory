import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function normalizeUsername(username: string): string {
  return username.trim()
}

export function validateUsername(username: string): string | null {
  const value = normalizeUsername(username)
  if (!value) return '请输入账号'
  if (value.length < 2) return '账号至少 2 个字符'
  if (value.length > 32) return '账号最多 32 个字符'
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(value)) {
    return '账号仅支持中文、字母、数字和下划线'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return '请输入密码'
  if (password.length < 6) return '密码至少 6 位'
  if (password.length > 72) return '密码过长'
  return null
}
