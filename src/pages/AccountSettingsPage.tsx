import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { MobileTopNav } from '../components/MobileTopNav'
import { validateRegisterPassword } from '../validation/password'

type AccountSettingsPageProps = {
  nickname: string
  avatarUrl: string | null
  onBack: () => void
  onSave: (patch: { nickname?: string; avatarUrl?: string | null }) => void
}

export function AccountSettingsPage({
  nickname,
  avatarUrl,
  onBack,
  onSave,
}: AccountSettingsPageProps) {
  const [draftNickname, setDraftNickname] = useState(nickname)
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | null>(avatarUrl)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nicknameId = useId()
  const currentPasswordId = useId()
  const newPasswordId = useId()
  const confirmPasswordId = useId()

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSavedMessage('请选择图片文件')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      setDraftAvatarUrl(result)
      setSavedMessage('')
    }
    reader.readAsDataURL(file)
  }

  function handleSaveProfile() {
    onSave({
      nickname: draftNickname.trim(),
      avatarUrl: draftAvatarUrl,
    })
    setSavedMessage('资料已保存')
  }

  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordMessage('')

    if (!currentPassword.trim()) {
      setPasswordMessage('请输入当前密码')
      return
    }
    const passwordError = validateRegisterPassword(newPassword)
    if (passwordError) {
      setPasswordMessage(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('两次输入的新密码不一致')
      return
    }

    setPasswordMessage('密码修改功能即将上线，当前为演示保存')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="profile-shell">
      <MobileTopNav title="账号设置" onBack={onBack} />

      <main className="profile-shell__main profile-shell__main--form">
        <section className="settings-section" aria-label="头像与昵称">
          <h2 className="settings-section__title">头像与昵称</h2>

          <div className="settings-avatar-row">
            <button
              type="button"
              className="settings-avatar-btn"
              aria-label="上传头像"
              onClick={() => fileInputRef.current?.click()}
            >
              {draftAvatarUrl ? (
                <img src={draftAvatarUrl} alt="" className="settings-avatar-btn__img" />
              ) : (
                <DefaultAvatarSmall />
              )}
              <span className="settings-avatar-btn__hint">点击上传</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </div>

          <label className="settings-field" htmlFor={nicknameId}>
            <span className="settings-field__label">昵称</span>
            <input
              id={nicknameId}
              type="text"
              value={draftNickname}
              maxLength={20}
              placeholder="请输入昵称"
              onChange={(event) => {
                setDraftNickname(event.target.value)
                setSavedMessage('')
              }}
            />
          </label>

          {savedMessage ? (
            <p className="settings-feedback is-success" role="status">
              {savedMessage}
            </p>
          ) : null}

          <button type="button" className="settings-primary-btn" onClick={handleSaveProfile}>
            保存资料
          </button>
        </section>

        <section className="settings-section" aria-label="修改密码">
          <h2 className="settings-section__title">修改密码</h2>
          <form className="settings-form" onSubmit={handlePasswordSubmit}>
            <label className="settings-field" htmlFor={currentPasswordId}>
              <span className="settings-field__label">当前密码</span>
              <input
                id={currentPasswordId}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="settings-field" htmlFor={newPasswordId}>
              <span className="settings-field__label">新密码</span>
              <input
                id={newPasswordId}
                type="password"
                autoComplete="new-password"
                maxLength={20}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="settings-field" htmlFor={confirmPasswordId}>
              <span className="settings-field__label">确认新密码</span>
              <input
                id={confirmPasswordId}
                type="password"
                autoComplete="new-password"
                maxLength={20}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            {passwordMessage ? (
              <p
                className={
                  passwordMessage.includes('即将上线')
                    ? 'settings-feedback is-info'
                    : 'settings-feedback is-error'
                }
                role="alert"
              >
                {passwordMessage}
              </p>
            ) : null}

            <button type="submit" className="settings-primary-btn">
              修改密码
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

function DefaultAvatarSmall() {
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <circle cx="28" cy="28" r="28" fill="#d7e8e1" />
      <circle cx="28" cy="21" r="8.5" fill="#f7faf9" />
      <path d="M11 48c3.7-8 9.2-12.5 17-12.5s13.3 4.5 17 12.5" fill="#f7faf9" />
    </svg>
  )
}
