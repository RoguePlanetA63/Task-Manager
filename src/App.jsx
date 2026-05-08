import { useCallback, useEffect, useMemo, useState } from 'react'
import Auth from './components/auth.jsx'
import AppShell from './components/AppShell.jsx'
import EmptyState from './components/EmptyState.jsx'
import Modal from './components/Modal.jsx'
import SkeletonCards from './components/SkeletonCards.jsx'
import TaskCard from './components/TaskCard.jsx'
import Weather from './components/Weather.jsx'
import './css/App.css'
import { isAdminSession } from './lib/adminAuth'
import { normalizeEmail } from './lib/emailUtils'
import { signOut, saveGoogleRefreshToken } from './lib/authApi'
import { fetchGoogleConnectionStatus, fetchProfilesByEmails } from './lib/profilesApi'
import ProfilePage from './components/ProfilePage.jsx'
import AdminPanel from './taskList/AdminPanel.jsx'
import { useTaskApp } from './taskList/useTaskApp'
import { supabase } from './lib/supabaseClient'
import { getDefaultTaskWindow } from './lib/taskDateRules'
import { getTaskStatus } from './lib/taskStatus'

const THEME_STORAGE_KEY = 'tm:theme'

function isGoogleSession(session) {
  return Boolean(
    session?.provider_refresh_token ||
      session?.user?.app_metadata?.provider === 'google' ||
      session?.user?.app_metadata?.providers?.includes?.('google'),
  )
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const {
    conn,
    tasks,
    session,
    authReady,
    userEmail,
    userId,
    editingId,
    handleAddTask,
    beginEditTask,
    cancelEditTask,
    handleUpdateTask,
    handleDeleteTask,
    isTaskOwner,
  } = useTaskApp()

  const isAdmin = isAdminSession(session)
  const [appView, setAppView] = useState('tasks')
  const [profilePage, setProfilePage] = useState(null)
  const [profilesRefreshKey, setProfilesRefreshKey] = useState(0)
  const [profileByEmail, setProfileByEmail] = useState(() => new Map())
  const [theme, setTheme] = useState(getInitialTheme)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [loadDelayElapsed, setLoadDelayElapsed] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')
  const [taskSearch, setTaskSearch] = useState('')
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [theme])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isGoogleSession(session)) {
        void saveGoogleRefreshToken(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Tiny delay before showing the empty state so the skeleton doesn't flash
  // for fast loads. Once the window passes (or tasks arrive), we never go back
  // to showing skeletons in this session — keeps the effect free of sync setState.
  useEffect(() => {
    if (!session || loadDelayElapsed) return
    const t = setTimeout(() => setLoadDelayElapsed(true), 600)
    return () => clearTimeout(t)
  }, [session, loadDelayElapsed])

  const tasksHydrated = tasks.length > 0 || loadDelayElapsed

  const navOptions = useMemo(
    () => [
      { value: 'tasks', label: 'My tasks' },
      ...(isAdmin ? [{ value: 'admin', label: 'Admin' }] : []),
    ],
    [isAdmin],
  )

  const ownerEmailList = useMemo(() => {
    const s = new Set()
    for (const t of tasks) {
      const e = normalizeEmail(t.email ?? '')
      if (e) s.add(e)
    }
    return [...s].sort()
  }, [tasks])

  const ownerEmailsKey = ownerEmailList.join('|')

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      const t = setTimeout(() => {
        setIsGoogleConnected(false)
        setDisplayName('')
      }, 0)
      return () => {
        cancelled = true
        clearTimeout(t)
      }
    }

    ;(async () => {
      const { connected, displayName: userDisplayName, error } = await fetchGoogleConnectionStatus(userId)
      if (cancelled) return
      if (error) {
        console.warn('Google connection status:', error.message)
      }
      setIsGoogleConnected(connected)
      setDisplayName(userDisplayName)
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!ownerEmailList.length) {
        setProfileByEmail(new Map())
        return
      }
      const { data, error } = await fetchProfilesByEmails(ownerEmailList)
      if (cancelled || error) return
      const m = new Map()
      for (const pr of data ?? []) {
        const k = normalizeEmail(pr.email ?? '')
        if (k) m.set(k, pr)
      }
      setProfileByEmail(m)
    })()
    return () => {
      cancelled = true
    }
  }, [ownerEmailList, ownerEmailsKey, profilesRefreshKey])

  const openProfile = useCallback((target) => {
    setProfilePage({
      userId: target.userId,
      email: target.email ? normalizeEmail(target.email) : undefined,
    })
  }, [])

  const activeAppView = !isAdmin && appView === 'admin' ? 'tasks' : appView

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()
    return tasks.filter((task) => {
      const status = getTaskStatus(task)
      const mine = isTaskOwner(task)
      const matchesFilter =
        taskFilter === 'all' ||
        (taskFilter === 'mine' && mine) ||
        (taskFilter === 'completed' && status === 'done')
      const matchesSearch =
        !query ||
        [task.Task, task.Description, task.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))

      return matchesFilter && matchesSearch
    })
  }, [tasks, taskFilter, taskSearch, isTaskOwner])

  const newTaskWindow = getDefaultTaskWindow()

  if (!authReady) {
    return (
      <div className="boot">
        <div className="boot__inner">
          <span className="boot__logo" aria-hidden />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  const handleNewTaskSubmit = async (e) => {
    const saved = await handleAddTask(e)
    if (saved) setNewTaskOpen(false)
  }

  return (
    <AppShell
      email={userEmail}
      displayName={displayName}
      theme={theme}
      isGoogleConnected={isGoogleConnected}
      onToggleTheme={toggleTheme}
      onSignOut={() => void signOut()}
      onOpenProfile={() =>
        openProfile({ userId, email: userEmail ? normalizeEmail(userEmail) : undefined })
      }
      navOptions={navOptions}
      navValue={appView}
      onNavChange={(v) => {
        setProfilePage(null)
        setAppView(v)
      }}
      suppressSegmentedNav={!!profilePage}
      mainWide={activeAppView === 'admin' && !profilePage}
      conn={conn}
      aside={activeAppView === 'tasks' && !profilePage ? <Weather /> : null}
    >
      {profilePage ? (
        <ProfilePage
          profileUserId={profilePage.userId}
          profileEmail={profilePage.email}
          viewerId={userId}
          viewerEmail={userEmail}
          allTasks={tasks}
          editingId={editingId}
          beginEditTask={beginEditTask}
          cancelEditTask={cancelEditTask}
          handleUpdateTask={handleUpdateTask}
          handleDeleteTask={handleDeleteTask}
          onBack={() => setProfilePage(null)}
          onProfileUpdated={() => setProfilesRefreshKey((k) => k + 1)}
        />
      ) : activeAppView === 'admin' && isAdmin ? (
        <AdminPanel session={session} />
      ) : (
        <section className="tasks">
          <div className="tasks__header">
            <div>
              <h1>Your team's tasks</h1>
              <p className="muted">
                Signed in as <strong>{userEmail}</strong>. You can edit or delete only the tasks you
                own.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setNewTaskOpen(true)}
            >
              + New task
            </button>
          </div>
          <div className="tasks__panel">
            <div className="tasks__toolbar">
              <div className="task-tabs" role="tablist" aria-label="Task filter">
                <button
                  type="button"
                  role="tab"
                  aria-selected={taskFilter === 'all'}
                  className={taskFilter === 'all' ? 'task-tabs__btn task-tabs__btn--active' : 'task-tabs__btn'}
                  onClick={() => setTaskFilter('all')}
                >
                  <span aria-hidden>☷</span>
                  All tasks
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={taskFilter === 'mine'}
                  className={taskFilter === 'mine' ? 'task-tabs__btn task-tabs__btn--active' : 'task-tabs__btn'}
                  onClick={() => setTaskFilter('mine')}
                >
                  <span aria-hidden>♙</span>
                  My tasks
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={taskFilter === 'completed'}
                  className={taskFilter === 'completed' ? 'task-tabs__btn task-tabs__btn--active' : 'task-tabs__btn'}
                  onClick={() => setTaskFilter('completed')}
                >
                  <span aria-hidden>✓</span>
                  Completed
                </button>
              </div>
              <label className="task-search">
                <span aria-hidden>⌕</span>
                <span className="visually-hidden">Search tasks</span>
                <input
                  type="search"
                  value={taskSearch}
                  placeholder="Search tasks..."
                  onChange={(e) => setTaskSearch(e.target.value)}
                />
              </label>
            </div>
            {!tasksHydrated && tasks.length === 0 ? (
              <SkeletonCards count={3} />
            ) : tasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                description="Create the first task for your team. You'll be able to edit and delete the ones you own."
                actionLabel="Create your first task"
                onAction={() => setNewTaskOpen(true)}
              />
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                title="No matching tasks"
                description="Try a different search or filter to bring more tasks back into view."
                actionLabel="Clear filters"
                onAction={() => {
                  setTaskFilter('all')
                  setTaskSearch('')
                }}
              />
            ) : (
              <ul className="card-grid">
                {visibleTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    mine={isTaskOwner(task)}
                    isEditing={editingId === task.id}
                    onBeginEdit={beginEditTask}
                    onCancelEdit={cancelEditTask}
                    onSubmitEdit={handleUpdateTask}
                    onDelete={handleDeleteTask}
                    ownerProfile={profileByEmail.get(normalizeEmail(task.email ?? ''))}
                    onOpenProfileOwner={openProfile}
                  />
                ))}
              </ul>
            )}
            <div className="tasks__count">{visibleTasks.length} tasks total</div>
          </div>
        </section>
      )}

      <Modal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        title="New task"
        labelledBy="new-task-title"
      >
        <form className="new-task-form" onSubmit={handleNewTaskSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="task-name">
              Task name
            </label>
            <input
              type="text"
              name="taskName"
              id="task-name"
              className="field-input"
              placeholder="e.g. Draft launch checklist"
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="task-description">
              Description
            </label>
            <input
              type="text"
              name="taskDescription"
              id="task-description"
              className="field-input"
              placeholder="Optional details"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="task-start-at">
              Start at
            </label>
            <input
              type="datetime-local"
              name="taskStartAt"
              id="task-start-at"
              className="field-input"
              min={newTaskWindow.minStart}
              defaultValue={newTaskWindow.defaultStart}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="task-end-at">
              End at
            </label>
            <input
              type="datetime-local"
              name="taskEndAt"
              id="task-end-at"
              className="field-input"
              min={newTaskWindow.minEnd}
              defaultValue={newTaskWindow.defaultEnd}
            />
          </div>
          <div className="new-task-form__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setNewTaskOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Add task
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  )
}

export default App
