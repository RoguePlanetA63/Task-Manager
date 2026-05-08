import { useCallback, useEffect, useState } from 'react'
import EmptyState from './EmptyState.jsx'
import TaskCard from './TaskCard.jsx'
import { fetchProfile, fetchProfileByEmail, upsertProfile } from '../lib/profilesApi'
import { normalizeEmail } from '../lib/emailUtils'

export default function ProfilePage({
  profileUserId,
  profileEmail,
  viewerId,
  viewerEmail,
  allTasks,
  editingId,
  beginEditTask,
  cancelEditTask,
  handleUpdateTask,
  handleDeleteTask,
  onBack,
  onProfileUpdated,
}) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ displayName: '', phone: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setMessage({ type: '', text: '' })
    try {
      if (profileUserId) {
        const { data, error } = await fetchProfile(profileUserId)
        if (error) throw error
        setRow(data ?? null)
      } else if (profileEmail) {
        const { data, error } = await fetchProfileByEmail(profileEmail)
        if (error) throw error
        setRow(data ?? null)
      } else {
        setRow(null)
        setLoadError('Missing profile identifier.')
      }
    } catch (e) {
      setRow(null)
      setLoadError(e?.message ?? 'Could not load profile.')
    } finally {
      setLoading(false)
    }
  }, [profileUserId, profileEmail])

  useEffect(() => {
    const t = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    const nextDraft = row
      ? {
        displayName: row.display_name ?? '',
        phone: row.phone ?? '',
        description: row.description ?? '',
      }
      : { displayName: '', phone: '', description: '' }
    const t = setTimeout(() => setDraft(nextDraft), 0)
    return () => clearTimeout(t)
  }, [row])

  const isOwner =
    Boolean(viewerId) &&
    (Boolean(profileUserId && profileUserId === viewerId) ||
      Boolean(row && row.id === viewerId) ||
      Boolean(
        !row &&
          profileEmail &&
          normalizeEmail(viewerEmail) === normalizeEmail(profileEmail),
      ))

  useEffect(() => {
    if (!isOwner) {
      const t = setTimeout(() => setEditing(false), 0)
      return () => clearTimeout(t)
    }
    if (loading) return
    if (!row) {
      const t = setTimeout(() => setEditing(true), 0)
      return () => clearTimeout(t)
    }
    return undefined
  }, [isOwner, row, loading])

  const filterEmail = normalizeEmail(row?.email ?? profileEmail ?? '')
  const theirTasks = filterEmail
    ? allTasks.filter((t) => normalizeEmail(t.email ?? '') === filterEmail)
    : []

  const showForm = isOwner && (!row || editing)
  const showReadonlyBlock = isOwner && row && !editing
  const showVisitorReadonly = !isOwner

  const handleSave = async (e) => {
    e.preventDefault()
    if (!viewerId || !isOwner) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    const { error } = await upsertProfile(viewerId, {
      displayName: draft.displayName,
      phone: draft.phone,
      description: draft.description,
      accountEmail: viewerEmail,
    })
    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({ type: 'ok', text: 'Profile saved.' })
    setEditing(false)
    await load()
    onProfileUpdated?.()
  }

  const displayTitle =
    row?.display_name?.trim() || filterEmail || row?.email?.trim() || 'Profile'

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <button type="button" className="btn btn--ghost profile-page__back" onClick={onBack}>
          ← Team tasks
        </button>
        <h1>{displayTitle}</h1>
        <p className="muted profile-page__note">
          Profiles live in <code>public.users_table</code>. Names shown on team tasks come from this
          table (matched by email).
        </p>
      </header>

      {loadError ? (
        <p className="profile-page__banner profile-page__banner--error" role="alert">
          {loadError}
        </p>
      ) : null}
      {message.text ? (
        <p
          className={
            message.type === 'error'
              ? 'profile-page__banner profile-page__banner--error'
              : 'profile-page__banner profile-page__banner--ok'
          }
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Loading profile…</p>
      ) : (
        <section className="profile-page__card">
          <h2 className="profile-page__card-title">Details</h2>

          {showVisitorReadonly || showReadonlyBlock ? (
            <>
              <dl className="profile-page__dl">
                <div>
                  <dt>Email</dt>
                  <dd>{row?.email || profileEmail || '—'}</dd>
                </div>
                <div>
                  <dt>Display name</dt>
                  <dd>{row?.display_name?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{row?.phone?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd className="profile-page__dd-multiline">{row?.description?.trim() || '—'}</dd>
                </div>
              </dl>
              {showVisitorReadonly && !row ? (
                <p className="muted profile-page__empty-profile">
                  No profile row yet for this address — tasks are listed below.
                </p>
              ) : null}
              {showReadonlyBlock ? (
                <div className="profile-page__actions">
                  <button type="button" className="btn btn--primary" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {showForm ? (
            <form className="profile-page__form" onSubmit={(e) => void handleSave(e)}>
              <div className="field">
                <label className="field-label" htmlFor="profile-display-name">
                  Display name
                </label>
                <input
                  id="profile-display-name"
                  className="field-input"
                  type="text"
                  value={draft.displayName}
                  onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                  placeholder="How you appear on team tasks"
                  autoComplete="name"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="profile-phone">
                  Phone
                </label>
                <input
                  id="profile-phone"
                  className="field-input"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="+1 …"
                  autoComplete="tel"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="profile-description">
                  Description
                </label>
                <textarea
                  id="profile-description"
                  className="field-input profile-page__textarea"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="A short bio or note"
                />
              </div>
              <div className="profile-page__form-actions">
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {row ? (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setEditing(false)
                      setDraft({
                        displayName: row.display_name ?? '',
                        phone: row.phone ?? '',
                        description: row.description ?? '',
                      })
                      setMessage({ type: '', text: '' })
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
        </section>
      )}

      <section className="profile-page__tasks">
        <h2 className="profile-page__card-title">Tasks by this user</h2>
        <p className="muted">All tasks owned by {filterEmail || 'this account'}.</p>
        {theirTasks.length === 0 ? (
          <EmptyState title="No tasks" description="This user does not own any tasks yet." />
        ) : (
          <ul className="card-grid">
            {theirTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                mine={Boolean(viewerId && normalizeEmail(viewerEmail) === normalizeEmail(task.email))}
                isEditing={editingId === task.id}
                onBeginEdit={beginEditTask}
                onCancelEdit={cancelEditTask}
                onSubmitEdit={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </ul>
        )}
        <section className='weather-side'>
          Weather
        </section>
      </section>
    </div>
  )
}
