import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiBell, FiMapPin, FiX } from 'react-icons/fi';

const GITHUB_REPO_URL = String(process.env.REACT_APP_GITHUB_REPO_URL || '').trim();

export default function LandingPage() {
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);

  const closeLegal = useCallback(() => {
    setLegalOpen(false);
    setLegalAcknowledged(false);
  }, []);

  useEffect(() => {
    if (!legalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeLegal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [legalOpen, closeLegal]);

  const openGitHub = () => {
    if (!legalAcknowledged || !GITHUB_REPO_URL) return;
    window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.brandBlock}>
          <div style={styles.brand}>UCASAAPP</div>
          <div style={styles.brandSub}>Universal Collision Avoidance System Advisory App</div>
        </div>
        <div style={styles.navActions}>
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            style={{ ...styles.navBtn, ...styles.navBtnSecondary }}
          >
            Start Contribute
          </button>
          <Link to="/login" style={{ ...styles.navBtn, ...styles.navBtnPrimary }}>Login</Link>
        </div>
      </nav>

      <main style={styles.main}>
        <section style={styles.hero}>
          <h1 style={styles.title}>Universal Collision.... Avoidance System Advisory App</h1>
          <p style={styles.subtitle}>
            Advanced safety system that quickly detects accidents, sends emergency alerts, tracks location with GPS, and reports incidents for vehicles and machines.
          </p>
          <p style={styles.invite}>
            Join us in shaping the future of road safety and help make every journey safer for all.
          </p>
        </section>

        <section style={styles.featureGrid}>
          <article style={styles.featureCard}>
            <FiAlertTriangle style={styles.featureIcon} />
            <h3 style={styles.featureTitle}>Quick Accident Detection</h3>
            <p style={styles.featureText}>Real-time alerting pipeline to detect and classify incidents faster.</p>
          </article>
          <article style={styles.featureCard}>
            <FiBell style={styles.featureIcon} />
            <h3 style={styles.featureTitle}>Emergency Alerts</h3>
            <p style={styles.featureText}>Instant notification flow for responders and connected safety channels.</p>
          </article>
          <article style={styles.featureCard}>
            <FiMapPin style={styles.featureIcon} />
            <h3 style={styles.featureTitle}>GPS Location Tracking</h3>
            <p style={styles.featureText}>Live location intelligence for smarter routing and rapid support.</p>
          </article>
        </section>

        <section style={styles.callout}>
          <h2 style={styles.calloutTitle}>Join Us in Building the Future of Road Safety</h2>
          <p style={styles.calloutText}>
            We at AtoZ Automation Solutions Pvt. Ltd. are inviting developers, designers, testers, GIS/GPS enthusiasts, and documentation contributors to collaborate on this open-source MERN platform.
          </p>
          <p style={styles.calloutText}>
            This is a high-impact project focused on public safety. If you are ready to learn and contribute, you are welcome.
          </p>
          <div style={styles.calloutActions}>
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              style={{ ...styles.navBtn, ...styles.navBtnSecondary }}
            >
              Start Contribute
            </button>
            <Link to="/login" style={{ ...styles.navBtn, ...styles.navBtnPrimary }}>Open App</Link>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <div>Powered by ATOZAS</div>
        <div>Open Source - Built with care for Road Safety</div>
      </footer>

      {legalOpen && (
        <div
          style={styles.modalOverlay}
          role="presentation"
          onClick={closeLegal}
        >
          <div
            style={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 id="legal-modal-title" style={styles.modalTitle}>About &amp; Legal</h2>
              <button type="button" onClick={closeLegal} style={styles.modalClose} aria-label="Close">
                <FiX size={22} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalPara}>
                This application is part of the AtoZ Vehicle Collision Avoidance System, a GPS-based collision warning and proximity alert platform.
              </p>

              <h3 style={styles.modalSubheading}>License</h3>
              <p style={styles.modalPara}>
                This software is released under the <strong>MIT License</strong>. You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the conditions stated in that license (including retaining the copyright notice and permission notice in copies or substantial portions of the Software).
              </p>
              <p style={styles.modalPara}>
                The Software is provided <strong>&quot;as is&quot;</strong>, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. See the MIT License for full terms.
              </p>

              <h3 style={styles.modalSubheading}>Privacy &amp; Terms</h3>
              <p style={styles.modalPara}>
                By using this application you agree to the applicable privacy and terms documents for this deployment. These documents explain how GPS/location data is collected, how it is used to provide collision warnings, and what your responsibilities are when using the app.
              </p>

            </div>

            <div style={styles.modalDivider} />

            <div style={styles.modalFooter}>
              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={legalAcknowledged}
                  onChange={(e) => setLegalAcknowledged(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxLabel}>
                  I have read and understood the above information. Take me to the GitHub repository.
                </span>
              </label>

              <button
                type="button"
                onClick={openGitHub}
                disabled={!legalAcknowledged || !GITHUB_REPO_URL}
                style={{
                  ...styles.repoBtn,
                  ...((!legalAcknowledged || !GITHUB_REPO_URL) ? styles.repoBtnDisabled : {}),
                }}
              >
                Open GitHub repository
              </button>
              {!GITHUB_REPO_URL && (
                <p style={styles.repoHint}>
                  Set <code style={styles.code}>REACT_APP_GITHUB_REPO_URL</code> in <code style={styles.code}>.env</code> to enable the repository link.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 20px',
  },
  brandBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  brand: {
    fontWeight: 800,
    fontSize: 20,
    color: '#3b82f6',
    letterSpacing: 0.6,
  },
  brandSub: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  navActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  navBtn: {
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
    borderRadius: 10,
    padding: '9px 14px',
    border: '1px solid transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  navBtnPrimary: {
    background: '#2563eb',
    color: '#fff',
  },
  navBtnSecondary: {
    background: 'transparent',
    color: '#2563eb',
    borderColor: '#2563eb',
  },
  main: {
    width: '100%',
    maxWidth: 1120,
    margin: '0 auto',
    padding: '28px 20px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  hero: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.2,
  },
  subtitle: {
    margin: '12px 0 0',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  invite: {
    margin: '10px 0 0',
    color: 'var(--text-muted)',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  },
  featureCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 14,
    padding: 18,
  },
  featureIcon: {
    color: '#3b82f6',
    fontSize: 22,
  },
  featureTitle: {
    margin: '8px 0 4px',
    fontSize: 18,
  },
  featureText: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: 14,
    lineHeight: 1.5,
  },
  callout: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: 24,
  },
  calloutTitle: {
    margin: 0,
    fontSize: 24,
  },
  calloutText: {
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: '10px 0 0',
  },
  calloutActions: {
    marginTop: 16,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid var(--border-color)',
    padding: '16px 20px 20px',
    color: 'var(--text-muted)',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: 'min(90vh, 720px)',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: 12,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
  },
  modalClose: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  modalBody: {
    padding: '16px 20px',
    overflowY: 'auto',
    flex: 1,
    fontSize: 14,
    lineHeight: 1.55,
  },
  modalPara: {
    margin: '0 0 12px',
    color: '#334155',
  },
  modalSubheading: {
    margin: '16px 0 8px',
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  modalDivider: {
    height: 1,
    background: '#e2e8f0',
    flexShrink: 0,
  },
  modalFooter: {
    padding: '16px 20px 20px',
    flexShrink: 0,
    background: '#f8fafc',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
    marginBottom: 14,
  },
  checkbox: {
    marginTop: 3,
    width: 18,
    height: 18,
    flexShrink: 0,
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 1.45,
  },
  repoBtn: {
    width: '100%',
    padding: '11px 16px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  repoBtnDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed',
  },
  repoHint: {
    margin: '10px 0 0',
    fontSize: 12,
    color: '#64748b',
  },
  code: {
    fontSize: 12,
    background: '#e2e8f0',
    padding: '1px 6px',
    borderRadius: 4,
  },
};
