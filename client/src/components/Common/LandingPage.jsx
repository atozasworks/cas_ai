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
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand-block">
          <div className="landing-brand">UCASAAPP</div>
          <div className="landing-brand-sub">Universal Smart Collision Shield Advisory App</div>
        </div>
        <div className="landing-nav-actions">
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="landing-btn landing-btn-secondary"
          >
            Start Contribute
          </button>
          <Link to="/login" className="landing-btn landing-btn-primary">Login</Link>
        </div>
      </nav>

      <main className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-hero-title">Universal Smart Collision Shield Advisory App</h1>
          <p className="landing-hero-subtitle">
            Advanced safety system that quickly detects accidents, sends emergency alerts, tracks location with GPS, and reports incidents for vehicles and machines.
          </p>
          <p className="landing-hero-invite">
            Join us in shaping the future of road safety and help make every journey safer for all.
          </p>
        </section>

        <section className="landing-feature-grid">
          <article className="landing-feature-card">
            <div className="landing-feature-icon"><FiAlertTriangle /></div>
            <h3 className="landing-feature-title">Quick Accident Detection</h3>
            <p className="landing-feature-text">Real-time alerting pipeline to detect and classify incidents faster.</p>
          </article>
          <article className="landing-feature-card">
            <div className="landing-feature-icon"><FiBell /></div>
            <h3 className="landing-feature-title">Emergency Alerts</h3>
            <p className="landing-feature-text">Instant notification flow for responders and connected safety channels.</p>
          </article>
          <article className="landing-feature-card">
            <div className="landing-feature-icon"><FiMapPin /></div>
            <h3 className="landing-feature-title">GPS Location Tracking</h3>
            <p className="landing-feature-text">Live location intelligence for smarter routing and rapid support.</p>
          </article>
        </section>

        <section className="landing-callout">
          <h2 className="landing-callout-title">Join Us in Building the Future of Road Safety</h2>
          <p className="landing-callout-text">
            We at AtoZ Automation Solutions Pvt. Ltd. are inviting developers, designers, testers, GIS/GPS enthusiasts, and documentation contributors to collaborate on this open-source MERN platform.
          </p>
          <p className="landing-callout-text">
            This is a high-impact project focused on public safety. If you are ready to learn and contribute, you are welcome.
          </p>
          <div className="landing-callout-actions">
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="landing-btn landing-btn-secondary"
            >
              Start Contribute
            </button>
            <Link to="/login" className="landing-btn landing-btn-primary">Open App</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div>Powered by ATOZAS</div>
        <div>Open Source - Built with care for Road Safety</div>
      </footer>

      {legalOpen && (
        <div
          className="landing-modal-overlay"
          role="presentation"
          onClick={closeLegal}
        >
          <div
            className="landing-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="landing-modal-header">
              <h2 id="legal-modal-title" className="landing-modal-title">About &amp; Legal</h2>
              <button type="button" onClick={closeLegal} className="landing-modal-close" aria-label="Close">
                <FiX size={22} />
              </button>
            </div>

            <div className="landing-modal-body">
              <p className="landing-modal-para">
                This application is part of the AtoZ Vehicle Smart Collision Shield, a GPS-based collision warning and proximity alert platform.
              </p>

              <h3 className="landing-modal-subheading">License</h3>
              <p className="landing-modal-para">
                This software is released under the <strong>MIT License</strong>. You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the conditions stated in that license (including retaining the copyright notice and permission notice in copies or substantial portions of the Software).
              </p>
              <p className="landing-modal-para">
                The Software is provided <strong>&quot;as is&quot;</strong>, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. See the MIT License for full terms.
              </p>

              <h3 className="landing-modal-subheading">Privacy &amp; Terms</h3>
              <p className="landing-modal-para">
                By using this application you agree to the applicable privacy and terms documents for this deployment. These documents explain how GPS/location data is collected, how it is used to provide collision warnings, and what your responsibilities are when using the app.
              </p>
            </div>

            <div className="landing-modal-divider" />

            <div className="landing-modal-footer">
              <label className="landing-checkbox-row">
                <input
                  type="checkbox"
                  checked={legalAcknowledged}
                  onChange={(e) => setLegalAcknowledged(e.target.checked)}
                  className="landing-checkbox"
                />
                <span className="landing-checkbox-label">
                  I have read and understood the above information. Take me to the GitHub repository.
                </span>
              </label>

              <button
                type="button"
                onClick={openGitHub}
                disabled={!legalAcknowledged || !GITHUB_REPO_URL}
                className="landing-repo-btn"
              >
                Open GitHub repository
              </button>
              {!GITHUB_REPO_URL && (
                <p className="landing-repo-hint">
                  Set <code className="landing-code">REACT_APP_GITHUB_REPO_URL</code> in <code className="landing-code">.env</code> to enable the repository link.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
