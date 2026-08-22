import { useId, useState, type FormEvent } from 'react'
import { changePassword } from '../api/profile'
import { AppPage } from '../components/AppPage'

type AccountSettingsPageProps = {
  onBack: () => void
}

export function AccountSettingsPage({ onBack }: AccountSettingsPageProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const currentPasswordId = useId()
  const newPasswordId = useId()
  const confirmPasswordId = useId()
  const passwordMessageId = useId()

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordMessage('')

    if (!currentPassword.trim()) {
      setPasswordMessage('请输入当前密码')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('两次输入的新密码不一致')
      return
    }

    setSubmittingPassword(true)
    const result = await changePassword(currentPassword, newPassword)
    setSubmittingPassword(false)

    if ('error' in result) {
      setPasswordMessage(result.error.message)
      return
    }

    setPasswordMessage('密码已修改')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <AppPage title="账号设置" onBack={onBack}>
      <section className="app-section" aria-label="修改密码">
        <h2 className="account-panel__title">修改密码</h2>
        <form className="auth-form" onSubmit={(event) => void handlePasswordSubmit(event)}>
          <div className="field-block">
            <label className="field" htmlFor={currentPasswordId}>
              <span className="sr-only">当前密码</span>
              <input
                id={currentPasswordId}
                type="password"
                autoComplete="current-password"
                placeholder="请输入当前密码"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
          </div>
          <div className="field-block">
            <label className="field" htmlFor={newPasswordId}>
              <span className="sr-only">新密码</span>
              <input
                id={newPasswordId}
                type="password"
                autoComplete="new-password"
                maxLength={20}
                placeholder="请输入新密码"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
          </div>
          <div className="field-block">
            <label className="field" htmlFor={confirmPasswordId}>
              <span className="sr-only">确认新密码</span>
              <input
                id={confirmPasswordId}
                type="password"
                autoComplete="new-password"
                maxLength={20}
                placeholder="请再次确认新密码"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          </div>

          <p
            id={passwordMessageId}
            className={
              passwordMessage === '密码已修改'
                ? 'boot-status'
                : passwordMessage
                  ? 'form-error is-visible'
                  : 'form-error'
            }
            role={passwordMessage ? 'alert' : undefined}
          >
            {passwordMessage || ''}
          </p>

          <button type="submit" className="submit-btn" disabled={submittingPassword}>
            {submittingPassword ? '修改中…' : '修改密码'}
          </button>
        </form>
      </section>
    </AppPage>
  )
}
