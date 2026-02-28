import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiShield, FiMail, FiLock, FiUser, FiPhone } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.name, form.email, form.password, form.phone);
        toast.success('Account created!');
      }
    } catch (err) {
      toast.error(err?.message || 'Authentication failed');
    }
    setSubmitting(false);
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <FiShield style={{ fontSize: 48, color: '#3b82f6' }} />
          <h1 style={styles.title}>Collision Avoidance System</h1>
          <p style={styles.subtitle}>AI-Enhanced Real-Time Safety</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.inputGroup}>
              <FiUser style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={update('name')}
                required={!isLogin}
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <FiMail style={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={update('email')}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <FiLock style={styles.inputIcon} />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <FiPhone style={styles.inputIcon} />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={update('phone')}
                style={styles.input}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={styles.toggle}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} style={styles.toggleBtn}>
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
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 40,
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
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
};
