import { useState } from 'react'
import '../css/auth.css'
import { signInWithPassword, signOut, signUp } from '../lib/authApi'
import { isValidEmail, normalizeEmail } from '../lib/emailUtils'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignIn, setIsSignIn] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSwitchToSignUp = () => {
    setIsSignIn(false)
    setConfirmPassword('')
    setMessage({ type: '', text: '' })
  }

  const handleSwitchToSignIn = () => {
    setIsSignIn(true)
    setConfirmPassword('')
    setMessage({ type: '', text: '' })
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    const trimmed = normalizeEmail(email)
    if (!isValidEmail(trimmed)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }

    if (isSignIn) {
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

  const title = isSignIn ? 'Welcome back' : 'Create your account'
  const submitLabel = isSignIn ? 'Sign in' : 'Sign up'

  return (
    <div className="auth-page">
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleAuth}>
          <h1 className="auth-title">{title}</h1>

          {message.text ? (
            <p
              className={`auth-message auth-message--${message.type === 'error' ? 'error' : 'ok'}`}
              role="alert"
            >
              {message.text}
            </p>
          ) : null}

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
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {!isSignIn ? (
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
          ) : null}

          <button type="submit" className="auth-button">
            {submitLabel}
          </button>
        </form>

        {isSignIn ? (
          <p className="auth-link-text">
            Not a member?{' '}
            <button type="button" className="auth-link" onClick={handleSwitchToSignUp}>
              Sign up
            </button>
          </p>
        ) : (
          <p className="auth-link-text">
            Already have an account?{' '}
            <button type="button" className="auth-link" onClick={handleSwitchToSignIn}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export default Auth
