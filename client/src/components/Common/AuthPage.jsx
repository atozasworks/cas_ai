import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiShield, FiMail, FiLock, FiUser, FiPhone, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getRuntimeConfig, loadRuntimeConfig } from '../../services/runtimeConfig';
import './AuthPage.css';

// Sign-up steps: 'details' (google + name, email, phone) -> 'otp' -> done
const SIGNUP_STEPS = { DETAILS: 'details', OTP: 'otp' };

const GOOGLE_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:7760',
  'https://casai.testatozas.in',
  'https://www.casai.testatozas.in',
]);

const DEV_GOOGLE_ORIGIN = 'http://localhost:7760';

function isGoogleOriginAllowed() {
  return GOOGLE_ALLOWED_ORIGINS.has(window.location.origin);
}

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

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function AuthPage({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [form, setForm] = useState({ name: '', email: '', phone: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => getRuntimeConfig().googleClientId || '');
  const [signupStep, setSignupStep] = useState(SIGNUP_STEPS.DETAILS);
  const [otpVerified, setOtpVerified] = useState(false);
  const { login, requestOtp, verifySignupOtp, register, googleAuth } = useAuth();
  const googleBtnRef = useRef(null);
  const loginGoogleBtnRef = useRef(null);

  useEffect(() => {
    const shouldLoginMode = initialMode !== 'register';
    setIsLogin(shouldLoginMode);
    setOtpSent(false);
    setOtpVerified(false);
    setSignupStep(SIGNUP_STEPS.DETAILS);
    setForm({ name: '', email: '', phone: '', otp: '' });
  }, [initialMode]);

  /* Dev: redirect IP / 127.0.0.1 / wrong port → localhost:7760 (Google Console origin) */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (window.location.origin === DEV_GOOGLE_ORIGIN) return;
    if (isGoogleOriginAllowed()) return;
    const target = `${DEV_GOOGLE_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  /* ── Google callback — no loading UI; go straight to dashboard ── */
  const handleGoogleResponse = useCallback(async (response) => {
    if (!response?.credential) { toast.error('Google sign-in failed'); return; }
    try {
      await googleAuth(response.credential);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Google sign-in failed');
    }
  }, [googleAuth, navigate]);

  useEffect(() => {
    let active = true;
    loadRuntimeConfig().then((cfg) => {
      if (active) setGoogleClientId(cfg.googleClientId || '');
    });
    return () => { active = false; };
  }, []);

  /* ── Initialize GIS and render Google button ── */
  useEffect(() => {
    if (!googleClientId || !isGoogleOriginAllowed()) return;
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
          use_fedcm_for_prompt: false,
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
        const data = await requestOtp(form.email, 'login');
        setOtpSent(true);
        toast.success(data?.message || 'OTP sent to your email');
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
      const data = await requestOtp(form.email, 'signup');
      setSignupStep(SIGNUP_STEPS.OTP);
      toast.success(data?.message || 'OTP sent to your email');
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── SIGNUP: Verify OTP & Create Account ───── */
  const handleVerifyAndCreate = async (e) => {
    e.preventDefault();
    if (!form.otp || form.otp.length !== 4) { toast.error('Please enter the 4-digit OTP'); return; }
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
    <div className="auth-page__form">
      <form onSubmit={handleLogin} className="auth-page__form-inner">
        <div className="auth-page__input-group">
          <FiMail className="auth-page__input-icon" aria-hidden="true" />
          <input
            type="email"
            className="auth-page__input"
            placeholder="Email Address"
            value={form.email}
            onChange={update('email')}
            required
          />
        </div>
        {otpSent && (
          <div className="auth-page__input-group">
            <FiLock className="auth-page__input-icon" aria-hidden="true" />
            <input
              type="text"
              className="auth-page__input"
              placeholder="Enter OTP"
              value={form.otp}
              onChange={update('otp')}
              required
              inputMode="numeric"
              maxLength={4}
            />
          </div>
        )}
        <button type="submit" className="auth-page__submit" disabled={submitting}>
          {submitting ? 'Please wait...' : otpSent ? 'Sign In' : 'Send OTP'}
        </button>
      </form>

      <div className="auth-page__divider">
        <span className="auth-page__divider-line" />
        <span className="auth-page__divider-text">or</span>
        <span className="auth-page__divider-line" />
      </div>

      {googleClientId ? (
        <div ref={loginGoogleBtnRef} className="auth-page__google-wrap" />
      ) : (
        <button type="button" disabled className="auth-page__google-fallback">
          <GoogleIcon />
          Google not configured
        </button>
      )}

      <button type="button" onClick={() => navigate('/')} className="auth-page__home-btn">
        <FiArrowLeft aria-hidden="true" />
        Back to home
      </button>
    </div>
  );

  /* ───── RENDER: SIGNUP DETAILS (Google + Name, Email, Phone — all visible) ───── */
  const renderSignupDetails = () => (
    <div className="auth-page__form">
      {googleClientId ? (
        <div ref={googleBtnRef} className="auth-page__google-wrap" />
      ) : (
        <button type="button" disabled className="auth-page__google-fallback">
          <GoogleIcon />
          Google not configured
        </button>
      )}

      <div className="auth-page__divider">
        <span className="auth-page__divider-line" />
        <span className="auth-page__divider-text">or sign up with email</span>
        <span className="auth-page__divider-line" />
      </div>

      <form onSubmit={handleDetailsSubmit} className="auth-page__form-inner">
        <div className="auth-page__input-group">
          <FiUser className="auth-page__input-icon" aria-hidden="true" />
          <input
            type="text"
            className="auth-page__input"
            placeholder="Full Name *"
            value={form.name}
            onChange={update('name')}
            required
          />
        </div>
        <div className="auth-page__input-group">
          <FiMail className="auth-page__input-icon" aria-hidden="true" />
          <input
            type="email"
            className="auth-page__input"
            placeholder="Email Address *"
            value={form.email}
            onChange={update('email')}
            required
          />
        </div>
        <div className="auth-page__input-group">
          <FiPhone className="auth-page__input-icon" aria-hidden="true" />
          <input
            type="tel"
            className="auth-page__input"
            placeholder="Phone Number *"
            value={form.phone}
            onChange={update('phone')}
            required
          />
        </div>
        <button type="submit" className="auth-page__submit" disabled={submitting}>
          {submitting ? 'Sending OTP...' : 'Continue — Send OTP'}
        </button>
      </form>
    </div>
  );

  /* ───── RENDER: SIGNUP OTP (verify & create account) ───── */
  const renderSignupOtp = () => (
    <form onSubmit={handleVerifyAndCreate} className="auth-page__form">
      <div className="auth-page__verified-badge">
        <FiUser aria-hidden="true" />
        <span>{form.name}</span>
      </div>
      <p className="auth-page__info-text">
        A 4-digit OTP has been sent to <strong>{form.email}</strong>
      </p>
      <div className="auth-page__input-group">
        <FiLock className="auth-page__input-icon" aria-hidden="true" />
        <input
          type="text"
          className="auth-page__input"
          placeholder="Enter 4-digit OTP"
          value={form.otp}
          onChange={update('otp')}
          required
          inputMode="numeric"
          maxLength={4}
        />
      </div>
      <button type="submit" className="auth-page__submit" disabled={submitting}>
        {submitting ? 'Creating Account...' : 'Verify & Create Account'}
      </button>
      <button type="button" onClick={() => setSignupStep(SIGNUP_STEPS.DETAILS)} className="auth-page__back-btn">
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
    <div className="auth-page">
      <div className="auth-page__bg" aria-hidden="true">
        <span className="auth-page__orb auth-page__orb--1" />
        <span className="auth-page__orb auth-page__orb--2" />
        <span className="auth-page__orb auth-page__orb--3" />
      </div>

      <div className="auth-page__card">
        <div className="auth-page__header">
          <div className="auth-page__shield">
            <FiShield className="auth-page__shield-icon" aria-hidden="true" />
          </div>
          <h1 className="auth-page__title">Collision Avoidance System</h1>
          <p className="auth-page__subtitle">AI-Enhanced Real-Time Safety</p>
        </div>

        {isLogin ? renderLogin() : renderSignup()}

        {process.env.NODE_ENV === 'development' && !isGoogleOriginAllowed() && (
          <p className="auth-page__origin-warn" role="alert">
            Redirecting to <strong>{DEV_GOOGLE_ORIGIN}/login</strong> for Google Sign-In…
          </p>
        )}
      </div>
    </div>
  );
}
