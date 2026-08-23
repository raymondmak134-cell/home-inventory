import { useId, useState, type FormEvent } from 'react'
import { changePassword } from '../api/profile'
import { AppPage } from '../components/AppPage'
import { LockIcon } from '../components/fieldIcons'
import { TextField } from '../components/TextField'
import { validateRegisterPassword } from '../validation/password'

type AccountSettingsPageProps = {
  onBack: () => void
}

type PasswordErrors = {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  form?: string
}

export function AccountSettingsPage({ onBack }: AccountSettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formErrorId = useId()

  function syncNewPasswordErrors(nextPassword: string, nextConfirmPassword: string) {
    setErrors((current) => {
      const newPasswordError = validateRegisterPassword(nextPassword, {
        allowEmpty: true,
      })
      let confirmPasswordError: string | undefined
      if (!nextConfirmPassword) {
        confirmPasswordError =
          current.confirmPassword === '请确认新密码' ? current.confirmPassword : undefined
      } else if (nextConfirmPassword !== nextPassword) {
        confirmPasswordError = '两次输入的新密码不一致'
      }

      return {
        ...current,
        newPassword: newPasswordError ?? undefined,
        confirmPassword: confirmPasswordError,
        form: undefined,
      }
    })
  }

  function validate(): PasswordErrors {
    const next: PasswordErrors = {}
    if (!currentPassword.trim()) next.currentPassword = '请输入当前密码'
    if (!newPassword) {
      next.newPassword = '请输入新密码'
    } else {
      const newPasswordError = validateRegisterPassword(newPassword)
      if (newPasswordError) next.newPassword = newPasswordError
    }
    if (!confirmPassword) {
      next.confirmPassword = '请确认新密码'
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = '两次输入的新密码不一致'
    }
    return next
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setSuccessMessage('')
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0 || submitting) return

    setSubmitting(true)
    const result = await changePassword(currentPassword, newPassword)
    setSubmitting(false)

    if ('error' in result) {
      if (result.error.field === 'password') {
        setErrors({ currentPassword: result.error.message })
      } else {
        setErrors({ form: result.error.message })
      }
      return
    }

    setErrors({})
    setSuccessMessage('密码已修改')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const formInvalid = Boolean(errors.form)

  return (
    <AppPage title="账号设置" onBack={onBack}>
      <section className="app-section" aria-label="修改密码">
        <h2 className="account-panel__title">修改密码</h2>
        <form
          className="auth-form"
          onSubmit={(event) => void handlePasswordSubmit(event)}
          noValidate
          aria-describedby={formInvalid ? formErrorId : undefined}
        >
          <TextField
            label="当前密码"
            name="currentPassword"
            type="password"
            allowReveal
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="请输入当前密码"
            icon={<LockIcon />}
            value={currentPassword}
            error={errors.currentPassword}
            onValueChange={(next) => {
              setCurrentPassword(next)
              setSuccessMessage('')
              if (errors.currentPassword || errors.form) {
                setErrors((current) => ({
                  ...current,
                  currentPassword: undefined,
                  form: undefined,
                }))
              }
            }}
          />

          <TextField
            label="新密码"
            name="newPassword"
            type="password"
            allowReveal
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="请输入新密码"
            icon={<LockIcon />}
            maxLength={20}
            value={newPassword}
            error={errors.newPassword}
            onValueChange={(next) => {
              setNewPassword(next)
              setSuccessMessage('')
              syncNewPasswordErrors(next, confirmPassword)
            }}
          />

          <TextField
            label="确认新密码"
            name="confirmNewPassword"
            type="password"
            allowReveal
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="请再次确认新密码"
            icon={<LockIcon />}
            maxLength={20}
            value={confirmPassword}
            error={errors.confirmPassword}
            onValueChange={(next) => {
              setConfirmPassword(next)
              setSuccessMessage('')
              syncNewPasswordErrors(newPassword, next)
            }}
          />

          <p
            id={formErrorId}
            className={
              successMessage
                ? 'boot-status'
                : formInvalid
                  ? 'form-error is-visible'
                  : 'form-error'
            }
            role={successMessage ? 'status' : formInvalid ? 'alert' : undefined}
          >
            {successMessage || errors.form || ''}
          </p>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? '修改中…' : '修改密码'}
          </button>
        </form>
      </section>
    </AppPage>
  )
}
