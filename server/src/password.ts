import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

/** Keep in sync with src/validation/password.ts */
export const PASSWORD_RULE_MESSAGE = '密码需为8-20位字母和数字组合'
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/

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

export function validatePassword(
  password: string,
  options?: { allowEmpty?: boolean },
): string | null {
  if (!password) {
    return options?.allowEmpty ? null : '请输入密码'
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return PASSWORD_RULE_MESSAGE
  }
  return null
}
