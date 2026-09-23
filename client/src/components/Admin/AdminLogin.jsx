import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FiLock, FiShield, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import '../Common/AuthPage.css';

export default function AdminLogin() {
  const { login, isAdminAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAdminAuthenticated) {
    return <Navigate to="/home/admin/panel" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/home/admin/panel', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Invalid admin username or password');
    } finally {
      setSubmitting(false);
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
          <p className="auth-page__subtitle">Admin Sign In</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-page__form">
          <div className="auth-page__form-inner">
            <div className="auth-page__input-group">
              <FiUser className="auth-page__input-icon" aria-hidden="true" />
              <input
                type="text"
                className="auth-page__input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="auth-page__input-group">
              <FiLock className="auth-page__input-icon" aria-hidden="true" />
              <input
                type="password"
                className="auth-page__input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="auth-page__submit" disabled={submitting}>
              {submitting ? 'Please wait...' : 'Sign in as Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
