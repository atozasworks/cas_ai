import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiShield, FiMail, FiLock, FiUser, FiPhone, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getRuntimeConfig, loadRuntimeConfig } from '../../services/runtimeConfig';

// Sign-up steps: 'details' (google + name, email, phone) -> 'otp' -> done
const SIGNUP_STEPS = { DETAILS: 'details', OTP: 'otp' };

/* ── Load Google Identity Services script once ── */
let gsiLoadPromise = null;
let gsiInitializedClientId = '';
function loadGsiScript() {
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
  return gsiLoadPromise;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => getRuntimeConfig().googleClientId || '');
  const [signupStep, setSignupStep] = useState(SIGNUP_STEPS.DETAILS);
  const [otpVerified, setOtpVerified] = useState(false);
  const { login, requestOtp, verifySignupOtp, register, googleAuth } = useAuth();
  const googleBtnRef = useRef(null);
  const loginGoogleBtnRef = useRef(null);

  /* ── Google callback ── */
  const handleGoogleResponse = useCallback(async (response) => {
    if (!response?.credential) { toast.error('Google sign-in failed'); return; }
    setSubmitting(true);
    try {
      await googleAuth(response.credential);
      toast.success('Signed in with Google!');
    } catch (err) {
      toast.error(err?.message || 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }, [googleAuth]);

  useEffect(() => {
    let active = true;
    loadRuntimeConfig().then((cfg) => {
      if (active) setGoogleClientId(cfg.googleClientId || '');
    });
    return () => { active = false; };
  }, []);

  /* ── Initialize GIS and render Google button ── */
  useEffect(() => {
    if (!googleClientId) return;
    // Show on login page OR signup details step
    const showOnLogin = isLogin;
    const showOnSignup = !isLogin && signupStep === SIGNUP_STEPS.DETAILS;
    if (!showOnLogin && !showOnSignup) return;

    let cancelled = false;
    loadGsiScript().then(() => {
      if (cancelled) return;
      if (gsiInitializedClientId !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          ux_mode: 'popup',
        });
        gsiInitializedClientId = googleClientId;
      }
      // Render on signup details
      if (showOnSignup && googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: googleBtnRef.current.offsetWidth || 340,
        });
      }
      // Render on login
      if (showOnLogin && loginGoogleBtnRef.current) {
        loginGoogleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(loginGoogleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: loginGoogleBtnRef.current.offsetWidth || 340,
        });
      }
    }).catch(() => {
      // script failed to load — fallback handled below
    });

    return () => { cancelled = true; };
  }, [isLogin, signupStep, googleClientId, handleGoogleResponse]);

  /* ───── LOGIN HANDLER ───── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!otpSent) {
        await requestOtp(form.email, 'login');
        setOtpSent(true);
        toast.success('OTP sent to your email');
      } else {
        await login(form.email, form.otp);
        toast.success('Welcome back!');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── SIGNUP: Submit Details & Send OTP ───── */
  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter your full name'); return; }
    if (!form.email.trim()) { toast.error('Please enter your email address'); return; }
    if (!form.phone.trim()) { toast.error('Please enter your phone number'); return; }
    setSubmitting(true);
    try {
      await requestOtp(form.email, 'signup');
      setSignupStep(SIGNUP_STEPS.OTP);
      toast.success('OTP sent to your email');
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── SIGNUP: Verify OTP & Create Account ───── */
  const handleVerifyAndCreate = async (e) => {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 6) { toast.error('Please enter the 6-digit OTP'); return; }
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.phone, form.otp);
      toast.success('Account created!');
      resetToLogin();
    } catch (err) {
      const message = err?.message || 'Verification failed';
      if (/invalid|expired otp/i.test(message)) {
        toast.error('OTP verification failed. Please try again.');
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleError = (err) => {
    const message = err?.message || 'Authentication failed';
    if (/invalid|expired otp/i.test(message)) {
      toast.error('OTP verification failed. Please try again.');
    } else {
      toast.error(message);
    }
  };

  const resetToLogin = () => {
    setIsLogin(true);
    setOtpSent(false);
    setOtpVerified(false);
    setSignupStep(SIGNUP_STEPS.DETAILS);
    setForm({ name: '', email: '', phone: '', otp: '' });
  };

  const resetSignup = () => {
    setOtpSent(false);
    setOtpVerified(false);
    setSignupStep(SIGNUP_STEPS.DETAILS);
    setForm({ name: '', email: '', phone: '', otp: '' });
  };

  const update = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'email' && otpSent ? { otp: '' } : {}),
    }));
    if (field === 'email' && otpSent) { setOtpSent(false); setOtpVerified(false); }
  };

  /* ───── RENDER: LOGIN ───── */
  const renderLogin = () => (
    <div style={styles.form}>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={styles.inputGroup}>
          <FiMail style={styles.inputIcon} />
          <input type="email" placeholder="Email Address" value={form.email}
            onChange={update('email')} required style={styles.input} />
        </div>
        {otpSent && (
          <div style={styles.inputGroup}>
            <FiLock style={styles.inputIcon} />
            <input type="text" placeholder="Enter OTP" value={form.otp}
              onChange={update('otp')} required inputMode="numeric" maxLength={6} style={styles.input} />
          </div>
        )}
        <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Please wait...' : otpSent ? 'Sign In' : 'Send OTP'}
        </button>
      </form>

      <div style={styles.divider}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>or</span>
        <span style={styles.dividerLine} />
      </div>

      {googleClientId ? (
        <div ref={loginGoogleBtnRef} style={styles.googleBtnContainer} />
      ) : (
        <button type="button" disabled style={{ ...styles.googleBtn, opacity: 0.5, cursor: 'not-allowed' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: 10, flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google not configured
        </button>
      )}
    </div>
  );

  /* ───── RENDER: SIGNUP DETAILS (Google + Name, Email, Phone — all visible) ───── */
  const renderSignupDetails = () => (
    <div style={styles.form}>
      {googleClientId ? (
        <div ref={googleBtnRef} style={styles.googleBtnContainer} />
      ) : (
        <button type="button" disabled style={{ ...styles.googleBtn, opacity: 0.5, cursor: 'not-allowed' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: 10, flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google not configured
        </button>
      )}

      <div style={styles.divider}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>or sign up with email</span>
        <span style={styles.dividerLine} />
      </div>

      <form onSubmit={handleDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={styles.inputGroup}>
          <FiUser style={styles.inputIcon} />
          <input type="text" placeholder="Full Name *" value={form.name}
            onChange={update('name')} required style={styles.input} />
        </div>
        <div style={styles.inputGroup}>
          <FiMail style={styles.inputIcon} />
          <input type="email" placeholder="Email Address *" value={form.email}
            onChange={update('email')} required style={styles.input} />
        </div>
        <div style={styles.inputGroup}>
          <FiPhone style={styles.inputIcon} />
          <input type="tel" placeholder="Phone Number *" value={form.phone}
            onChange={update('phone')} required style={styles.input} />
        </div>
        <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Sending OTP...' : 'Continue — Send OTP'}
        </button>
      </form>
    </div>
  );

  /* ───── RENDER: SIGNUP OTP (verify & create account) ───── */
  const renderSignupOtp = () => (
    <form onSubmit={handleVerifyAndCreate} style={styles.form}>
      <div style={styles.verifiedBadge}>
        <FiUser style={{ color: '#3b82f6', fontSize: 16, marginRight: 6 }} />
        <span>{form.name}</span>
      </div>
      <p style={styles.infoText}>A 6-digit OTP has been sent to <strong>{form.email}</strong></p>
      <div style={styles.inputGroup}>
        <FiLock style={styles.inputIcon} />
        <input type="text" placeholder="Enter 6-digit OTP" value={form.otp}
          onChange={update('otp')} required inputMode="numeric" maxLength={6} style={styles.input} />
      </div>
      <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
        {submitting ? 'Creating Account...' : 'Verify & Create Account'}
      </button>
      <button type="button" onClick={() => setSignupStep(SIGNUP_STEPS.DETAILS)} style={styles.backBtn}>
        ← Back to details
      </button>
    </form>
  );

  /* ───── RENDER: SIGNUP (router) ───── */
  const renderSignup = () => {
    switch (signupStep) {
      case SIGNUP_STEPS.DETAILS: return renderSignupDetails();
      case SIGNUP_STEPS.OTP:     return renderSignupOtp();
      default:                   return renderSignupDetails();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <FiShield style={{ fontSize: 48, color: '#3b82f6' }} />
          <h1 style={styles.title}>Collision Avoidance System</h1>
          <p style={styles.subtitle}>AI-Enhanced Real-Time Safety</p>
        </div>

        {isLogin ? renderLogin() : renderSignup()}

        <p style={styles.toggle}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button"
            onClick={() => { if (isLogin) { setIsLogin(false); resetSignup(); } else { resetToLogin(); } }}
            style={styles.toggleBtn}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-auth-gradient)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 40,
    boxShadow: 'var(--shadow-card)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 12,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-muted)',
    marginTop: 4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputGroup: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    fontSize: 16,
  },
  input: {
    width: '100%',
    paddingLeft: 42,
  },
  submitBtn: {
    width: '100%',
    padding: '12px 0',
    fontSize: 15,
    marginTop: 8,
  },
  toggle: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: 'var(--text-muted)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 600,
    background: '#fff',
    color: '#333',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  googleBtnContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    minHeight: 44,
  },
  emailOtpBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 600,
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '4px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border-color)',
  },
  dividerText: {
    fontSize: 13,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 14,
    textAlign: 'center',
    padding: 4,
  },
  infoText: {
    fontSize: 14,
    color: 'var(--text-muted)',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5,
  },
  verifiedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: '#22c55e',
    padding: '8px 12px',
    background: 'rgba(34,197,94,0.08)',
    borderRadius: 8,
    fontWeight: 500,
  },
};
