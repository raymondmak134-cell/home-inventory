/** Shared-style register password rule (mirrored on the server). */
export const PASSWORD_RULE_MESSAGE = '密码需为8-20位字母和数字组合'

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/

export function validateRegisterPassword(
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
