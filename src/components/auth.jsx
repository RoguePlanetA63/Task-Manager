import { useState } from 'react'
import '../css/auth.css'
import { signInWithPassword, signOut, signUp , signInWithGoogle, checkUserExists} from '../lib/authApi'
import { isValidEmail, normalizeEmail } from '../lib/emailUtils'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [layoutState, setLayoutState] = useState('InitialUI') // Updated layout state
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleAuth = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    const trimmed = normalizeEmail(email)
    if (!isValidEmail(trimmed)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }

    if (layoutState === 'LogIn') {
      const { data, error } = await signInWithPassword(trimmed, password)
      if (error) {
        setMessage({ type: 'error', text: error.message })
        return
      }
      if (data.user && !data.user.email_confirmed_at) {
        await signOut()
        setMessage({
          type: 'error',
          text: 'Confirm your email before signing in. Check your inbox for the link.',
        })
        return
      }
      setMessage({ type: 'ok', text: 'Signed in successfully.' })
      return
    }

    if (layoutState === 'SignIn') {
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match.' })
        return
      }
      if (password.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
        return
      }

      const { error } = await signUp(trimmed, password)
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({
          type: 'ok',
          text: 'Check your email to confirm your account, then sign in.',
        })
      }
    }
  }

  const switchLayout = async () => {
    const trimmed = normalizeEmail(email)
    if (!isValidEmail(trimmed)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }

    const userExists = await checkUserExists(trimmed)
    if (userExists) {
      setLayoutState('LogIn')
    } else {
      setLayoutState('SignIn')
    }
  }

  const renderFields = () => {
    switch (layoutState) {
      case 'InitialUI':
        return (
          <>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="button" className="auth-button" onClick={switchLayout}>
              Log In / Sign Up
            </button>
            <p className="auth-divider">or</p>
            <button className="auth-link" onClick={signInWithGoogle}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                width="18"
                height="18"
              />
              Continue with Google
            </button>
          </>
        )
      case 'LogIn':
        return (
          <>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                className="auth-input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="auth-button">
              Log In
            </button>
          </>
        )
      case 'SignIn':
        return (
          <>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-confirm-password">
                Confirm password
              </label>
              <input
                id="auth-confirm-password"
                className="auth-input"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="auth-button">
              Sign Up
            </button>
            <p className="auth-divider">or</p>
            <button className="auth-link" onClick={signInWithGoogle}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                width="18"
                height="18"
              />
              Continue with Google
            </button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h3 className="auth-title">Task Manager</h3>
        <form className="auth-form" onSubmit={handleAuth}>
          {message.text ? (
            <p
              className={`auth-message auth-message--${message.type === 'error' ? 'error' : 'ok'}`}
              role="alert"
            >
              {message.text}
            </p>
          ) : null}

          {renderFields()}
        </form>
      </div>
    </div>
  )
}

export default Auth
