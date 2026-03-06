import React from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiMapPin } from 'react-icons/fi';

export default function MobileHomeScreen() {
  return (
    <div className="mobile-home-screen mobile-main">
      <div className="mobile-home-card">
        <h1 className="mobile-home-title">
          Stay safe on the road
        </h1>
        <p className="mobile-home-subtitle">
          Real-time collision avoidance with AI. Track your vehicle, get risk alerts, and navigate with confidence.
        </p>
        <div className="mobile-home-illustration" aria-hidden="true">
          <FiShield style={{ fontSize: 64, color: 'var(--accent-blue)', opacity: 0.9 }} />
        </div>
        <Link
          to="/track"
          className="btn btn-primary mobile-home-cta"
        >
          <FiMapPin style={{ fontSize: 20 }} />
          Get Started
        </Link>
      </div>
    </div>
  );
}
