import { useId, useState } from 'react'
import { MobileTopNav } from '../components/MobileTopNav'

export type FamilyMember = {
  id: string
  name: string
}

export type Family = {
  id: string
  name: string
  members: FamilyMember[]
}

type FamilyManagementPageProps = {
  families: Family[]
  onBack: () => void
  onChange: (families: Family[]) => void
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function FamilyManagementPage({
  families,
  onBack,
  onChange,
}: FamilyManagementPageProps) {
  const [newFamilyName, setNewFamilyName] = useState('')
  const [memberDrafts, setMemberDrafts] = useState<Record<string, string>>({})
  const familyNameId = useId()

  function handleAddFamily() {
    const name = newFamilyName.trim()
    if (!name) return
    onChange([
      ...families,
      {
        id: createId('family'),
        name,
        members: [],
      },
    ])
    setNewFamilyName('')
  }

  function handleDeleteFamily(familyId: string) {
    const family = families.find((item) => item.id === familyId)
    if (!family) return
    const confirmed = window.confirm(`确定删除家庭「${family.name}」吗？`)
    if (!confirmed) return
    onChange(families.filter((item) => item.id !== familyId))
  }

  function handleAddMember(familyId: string) {
    const name = (memberDrafts[familyId] ?? '').trim()
    if (!name) return
    onChange(
      families.map((family) =>
        family.id === familyId
          ? {
              ...family,
              members: [
                ...family.members,
                { id: createId('member'), name },
              ],
            }
          : family,
      ),
    )
    setMemberDrafts((current) => ({ ...current, [familyId]: '' }))
  }

  function handleRemoveMember(familyId: string, memberId: string) {
    onChange(
      families.map((family) =>
        family.id === familyId
          ? {
              ...family,
              members: family.members.filter((member) => member.id !== memberId),
            }
          : family,
      ),
    )
  }

  return (
    <div className="profile-shell">
      <MobileTopNav title="家庭管理" onBack={onBack} />

      <main className="profile-shell__main profile-shell__main--form">
        <section className="settings-section" aria-label="添加家庭">
          <h2 className="settings-section__title">添加家庭</h2>
          <div className="family-add-row">
            <label className="settings-field settings-field--grow" htmlFor={familyNameId}>
              <span className="settings-field__label">家庭名称</span>
              <input
                id={familyNameId}
                type="text"
                value={newFamilyName}
                placeholder="例如：我的家"
                onChange={(event) => setNewFamilyName(event.target.value)}
              />
            </label>
            <button type="button" className="settings-inline-btn" onClick={handleAddFamily}>
              添加
            </button>
          </div>
        </section>

        <section className="settings-section" aria-label="家庭列表">
          <h2 className="settings-section__title">我的家庭</h2>

          {families.length === 0 ? (
            <p className="settings-empty">还没有家庭，先添加一个吧。</p>
          ) : (
            <ul className="family-list">
              {families.map((family) => (
                <li key={family.id} className="family-card">
                  <div className="family-card__header">
                    <p className="family-card__name">{family.name}</p>
                    <button
                      type="button"
                      className="family-card__delete"
                      onClick={() => handleDeleteFamily(family.id)}
                    >
                      删除
                    </button>
                  </div>

                  <div className="family-card__members">
                    <p className="family-card__members-title">家庭成员</p>
                    {family.members.length === 0 ? (
                      <p className="settings-empty settings-empty--compact">暂无成员</p>
                    ) : (
                      <ul className="family-member-list">
                        {family.members.map((member) => (
                          <li key={member.id} className="family-member">
                            <span>{member.name}</span>
                            <button
                              type="button"
                              className="family-member__remove"
                              aria-label={`移除 ${member.name}`}
                              onClick={() => handleRemoveMember(family.id, member.id)}
                            >
                              移除
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="family-add-member-row">
                      <input
                        type="text"
                        value={memberDrafts[family.id] ?? ''}
                        placeholder="成员昵称"
                        aria-label={`为 ${family.name} 添加成员`}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [family.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="settings-inline-btn"
                        onClick={() => handleAddMember(family.id)}
                      >
                        添加成员
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
