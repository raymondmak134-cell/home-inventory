import type { ButtonHTMLAttributes, ReactNode } from 'react'

type SubmitButtonProps = {
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

/**
 * 通用主操作按钮：复用登录/注册页的胶囊样式
 * （深色圆角、统一高度与按压反馈）。
 */
export function SubmitButton({
  children,
  className,
  type = 'button',
  ...rest
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      className={className ? `submit-btn ${className}` : 'submit-btn'}
      {...rest}
    >
      {children}
    </button>
  )
}
