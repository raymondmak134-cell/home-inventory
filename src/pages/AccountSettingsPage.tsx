import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { UserProfile } from '../api/profile'
import { changePassword, updateProfile } from '../api/profile'
import { AppPage } from '../components/AppPage'

type AccountSettingsPageProps = {
  profile: UserProfile
  onBack: () => void
  onSaved: (profile: UserProfile) => void
}

export function AccountSettingsPage({ profile, onBack, onSaved }: AccountSettingsPageProps) {
  const [draftNickname, setDraftNickname] = useState(profile.nickname)
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | null>(profile.avatarUrl)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [submittingProfile, setSubmittingProfile] = useState(false)
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nicknameId = useId()
  const currentPasswordId = useId()
  const newPasswordId = useId()
  const confirmPasswordId = useId()
  const savedMessageId = useId()
  const passwordMessageId = useId()

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

  async function handleSaveProfile() {
    setSubmittingProfile(true)
    setSavedMessage('')
    const result = await updateProfile({
      nickname: draftNickname.trim(),
      avatarUrl: draftAvatarUrl,
    })
    setSubmittingProfile(false)
    if ('error' in result) {
      setSavedMessage(result.error.message)
      return
    }
    onSaved(result.profile)
    setSavedMessage('资料已保存')
  }

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
      <section className="app-section" aria-label="头像与昵称">
        <h2 className="account-panel__title">头像与昵称</h2>

        <div className="profile-panel__avatar-row">
          <button
            type="button"
            className="profile-panel__avatar-btn"
            aria-label="上传头像"
            onClick={() => fileInputRef.current?.click()}
          >
            {draftAvatarUrl ? (
              <img src={draftAvatarUrl} alt="" className="profile-panel__avatar-img" />
            ) : (
              <DefaultAvatarSmall />
            )}
            <span className="brand-tagline profile-panel__avatar-hint">点击上传</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="field-block">
          <label className="field" htmlFor={nicknameId}>
            <span className="sr-only">昵称</span>
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
        </div>

        <p
          id={savedMessageId}
          className={savedMessage === '资料已保存' ? 'boot-status' : savedMessage ? 'form-error is-visible' : 'form-error'}
          role={savedMessage ? 'status' : undefined}
        >
          {savedMessage || ''}
        </p>

        <button
          type="button"
          className="submit-btn"
          disabled={submittingProfile}
          onClick={() => void handleSaveProfile()}
        >
          {submittingProfile ? '保存中…' : '保存资料'}
        </button>
      </section>

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

function DefaultAvatarSmall() {
  return (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <circle cx="28" cy="28" r="28" fill="#f3f4f6" />
      <circle cx="28" cy="21" r="8.5" fill="#ffffff" />
      <path d="M11 48c3.7-8 9.2-12.5 17-12.5s13.3 4.5 17 12.5" fill="#ffffff" />
    </svg>
  )
}
