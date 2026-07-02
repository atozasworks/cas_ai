import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiMapPin,
  FiX,
  FiSun,
  FiMoon,
  FiShield,
  FiUser,
  FiUsers,
  FiArrowRight,
  FiHeart,
  FiGithub,
  FiZap,
} from 'react-icons/fi';
import { useTheme } from '../../hooks/useTheme';
import './LandingPage.css';

const GITHUB_REPO_URL = String(process.env.REACT_APP_GITHUB_REPO_URL || '').trim();
const HERO_IMAGE = `${process.env.PUBLIC_URL || ''}/images/landing.png`;

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
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
    <div className="landing-page">
      <div className="landing-page__bg" aria-hidden="true">
        <div className="landing-page__orb landing-page__orb--1" />
        <div className="landing-page__orb landing-page__orb--2" />
        <div className="landing-page__orb landing-page__orb--3" />
        <div className="landing-page__glow" />
      </div>

      <nav className="landing-page__navbar">
        <div className="landing-page__brand-row">
          <span className="landing-page__brand-icon" aria-hidden="true">
            <FiShield />
          </span>
          <div className="landing-page__brand-block">
            <div className="landing-page__brand">UCASAAPP</div>
            <div className="landing-page__brand-sub">Universal Collision Avoidance System Advisory App</div>
          </div>
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <div style={styles.brandBlock}>
          <div style={styles.brand}>UCASAAPP....navya...</div>
          <div style={styles.brandSub}>Universal Collision Avoidance System Advisory App</div>
        </div>
        <div className="landing-page__nav-actions">
          <button
            type="button"
            className="landing-page__theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="landing-page__btn landing-page__btn--secondary"
            aria-label="Start Contribute"
          >
            <FiUsers aria-hidden />
            <span className="landing-page__btn-text landing-page__btn-text--hide-sm">Start Contribute</span>
          </button>
          <Link to="/login" className="landing-page__btn landing-page__btn--primary">
            <FiUser />
            <span>Login</span>
          </Link>
        </div>
      </nav>

      <main className="landing-page__main">
        <section className="landing-page__hero">
          <div className="landing-page__hero-content">
            <h1 className="landing-page__title">Universal Collision Avoidance System Advisory App</h1>
            <p className="landing-page__subtitle">
              Advanced safety system that quickly detects accidents, sends emergency alerts, tracks location with GPS, and reports incidents for vehicles and machines.
            </p>
            <p className="landing-page__invite">
              <FiShield />
              Join us in shaping the future of road safety
            </p>
          </div>

          <div className="landing-page__hero-visual">
            <img
              src={HERO_IMAGE}
              alt="3D isometric automotive safety illustration with car, shield, GPS, satellite, and analytics"
              className="landing-page__hero-img"
              loading="eager"
              decoding="async"
            />
          </div>
        </section>

        <section className="landing-page__feature-grid">
          <article className="landing-page__feature-card">
            <span className="landing-page__feature-icon"><FiAlertTriangle /></span>
            <div className="landing-page__feature-body">
              <h3 className="landing-page__feature-title">Quick Accident Detection</h3>
              <p className="landing-page__feature-text">Real-time alerting pipeline to detect and classify incidents faster.</p>
            </div>
            <FiArrowRight className="landing-page__feature-arrow" aria-hidden="true" />
          </article>
          <article className="landing-page__feature-card">
            <span className="landing-page__feature-icon"><FiBell /></span>
            <div className="landing-page__feature-body">
              <h3 className="landing-page__feature-title">Emergency Alerts</h3>
              <p className="landing-page__feature-text">Instant notification flow for responders and connected safety channels.</p>
            </div>
            <FiArrowRight className="landing-page__feature-arrow" aria-hidden="true" />
          </article>
          <article className="landing-page__feature-card">
            <span className="landing-page__feature-icon"><FiMapPin /></span>
            <div className="landing-page__feature-body">
              <h3 className="landing-page__feature-title">GPS Location Tracking</h3>
              <p className="landing-page__feature-text">Live location intelligence for smarter routing and rapid support.</p>
            </div>
            <FiArrowRight className="landing-page__feature-arrow" aria-hidden="true" />
          </article>
        </section>

        <section className="landing-page__callout">
          <span className="landing-page__callout-icon-wrap" aria-hidden="true">
            <FiUsers />
          </span>
          <div className="landing-page__callout-content">
            <h2 className="landing-page__callout-title">Join Us in Building the Future of Road Safety</h2>
            <p className="landing-page__callout-text">
              We at AtoZ Automation Solutions Pvt. Ltd. invite developers, designers, testers, and GIS enthusiasts to collaborate on this open-source MERN platform focused on public safety.
            </p>
          </div>
          <div className="landing-page__callout-actions">
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="landing-page__btn landing-page__btn--secondary"
            >
              <FiUsers />
              Start Contribute
            </button>
            <Link to="/login" className="landing-page__btn landing-page__btn--primary">
              <FiZap />
              Open App
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-page__footer">
        <div className="landing-page__footer-highlights">
          <div className="landing-page__footer-item">
            <FiGithub />
            <span>Open Source</span>
          </div>
          <div className="landing-page__footer-item">
            <FiShield />
            <span>For Road Safety</span>
          </div>
          <div className="landing-page__footer-item">
            <FiHeart />
            <span>Built with Care</span>
          </div>
        </div>
        <div className="landing-page__footer-divider" />
        <div className="landing-page__footer-credits">
          <div>Powered by ATOZAS</div>
          <div>Open Source — Built with care for Road Safety</div>
        </div>
      </footer>

      {legalOpen && (
        <div className="landing-page__modal-overlay" role="presentation" onClick={closeLegal}>
          <div
            className="landing-page__modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="landing-page__modal-header">
              <h2 id="legal-modal-title" className="landing-page__modal-title">About &amp; Legal</h2>
              <button type="button" onClick={closeLegal} className="landing-page__modal-close" aria-label="Close">
                <FiX size={22} />
              </button>
            </div>

            <div className="landing-page__modal-body">
              <p className="landing-page__modal-para">
                This application is part of the AtoZ Vehicle Collision Avoidance System, a GPS-based collision warning and proximity alert platform.
              </p>
              <h3 className="landing-page__modal-subheading">License</h3>
              <p className="landing-page__modal-para">
                This software is released under the <strong>MIT License</strong>. You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the conditions stated in that license.
              </p>
              <p className="landing-page__modal-para">
                The Software is provided <strong>&quot;as is&quot;</strong>, without warranty of any kind, express or implied.
              </p>
              <h3 className="landing-page__modal-subheading">Privacy &amp; Terms</h3>
              <p className="landing-page__modal-para">
                By using this application you agree to the applicable privacy and terms documents for this deployment.
              </p>
            </div>

            <div className="landing-page__modal-divider" />

            <div className="landing-page__modal-footer">
              <label className="landing-page__checkbox-row">
                <input
                  type="checkbox"
                  checked={legalAcknowledged}
                  onChange={(e) => setLegalAcknowledged(e.target.checked)}
                  className="landing-page__checkbox"
                />
                <span className="landing-page__checkbox-label">
                  I have read and understood the above information. Take me to the GitHub repository.
                </span>
              </label>
              <button
                type="button"
                onClick={openGitHub}
                disabled={!legalAcknowledged || !GITHUB_REPO_URL}
                className="landing-page__repo-btn"
              >
                Open GitHub repository
              </button>
              {!GITHUB_REPO_URL && (
                <p className="landing-page__repo-hint">
                  Set <code className="landing-page__code">REACT_APP_GITHUB_REPO_URL</code> in <code className="landing-page__code">.env</code> to enable the repository link.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
