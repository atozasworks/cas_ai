import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { formatDistance } from '../../utils/helpers';
import { FiAlertTriangle, FiX, FiNavigation } from 'react-icons/fi';

/** Play a short alert beep (works in mobile webview after user interaction) */
function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    // Second beep
    const o2 = audioContext.createOscillator();
    const g2 = audioContext.createGain();
    o2.connect(g2);
    g2.connect(audioContext.destination);
    o2.frequency.value = 1000;
    o2.type = 'sine';
    g2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.35);
    g2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.65);
    o2.start(audioContext.currentTime + 0.35);
    o2.stop(audioContext.currentTime + 0.65);
  } catch (_) {
    // Ignore if AudioContext not supported or autoplay blocked
  }
}

const SAFE_DIRECTION_LABELS = {
  left: 'Left side',
  right: 'Right side',
  front: 'Ahead',
  back: 'Behind',
};

export default function VehicleNearbyPopup() {
  const { vehicleNearbyAlert, dismissVehicleNearbyAlert, zoneAlert, dismissZoneAlert, riskData } = useSocket();
  const hasPlayedSound = useRef(false);

  const showVehicle = !!vehicleNearbyAlert;
  const showZone = !!zoneAlert;
  const dismiss = showVehicle ? dismissVehicleNearbyAlert : dismissZoneAlert;

  useEffect(() => {
    const alert = vehicleNearbyAlert || zoneAlert;
    if (!alert) {
      hasPlayedSound.current = false;
      return;
    }
    if (alert.playSound && !hasPlayedSound.current) {
      playAlertSound();
      hasPlayedSound.current = true;
    }
  }, [vehicleNearbyAlert, zoneAlert]);

  if (!showVehicle && !showZone) return null;

  // Zone-only popup (school, hospital, junction)
  if (showZone) {
    return (
      <div className="vehicle-nearby-popup-overlay" onClick={dismiss} role="dialog" aria-modal="true" aria-labelledby="vehicle-nearby-title">
        <div className="vehicle-nearby-popup-card vehicle-nearby-popup-card-zone" onClick={(e) => e.stopPropagation()}>
          <div className="vehicle-nearby-popup-header vehicle-nearby-popup-header-zone">
            <FiAlertTriangle className="vehicle-nearby-popup-icon" aria-hidden />
            <h2 id="vehicle-nearby-title" className="vehicle-nearby-popup-title">{zoneAlert.zoneLabel}</h2>
            <button type="button" className="vehicle-nearby-popup-close" onClick={dismiss} aria-label="Close"><FiX /></button>
          </div>
          <p className="vehicle-nearby-popup-message">
            <span className="vehicle-nearby-popup-ai-message">{zoneAlert.aiRecommendation}</span>
          </p>
          <p className="vehicle-nearby-popup-zone-hint">Map &amp; GPS analyzed — drive safely.</p>
          <button type="button" className="vehicle-nearby-popup-dismiss" onClick={dismiss}>OK, got it</button>
        </div>
      </div>
    );
  }

  // Vehicle nearby popup (with optional zone)
  const v = vehicleNearbyAlert.vehicle || {};
  const distance = vehicleNearbyAlert.distance ?? v.distance ?? 0;
  const zoneLabel = vehicleNearbyAlert.zoneLabel;
  const safestDir = riskData?.escapePath?.safestDirection;
  const actionLabel = riskData?.actionLabel;
  const showSafeSection = safestDir || actionLabel;

  return (
    <div className="vehicle-nearby-popup-overlay" onClick={dismiss} role="dialog" aria-modal="true" aria-labelledby="vehicle-nearby-title">
      <div className="vehicle-nearby-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="vehicle-nearby-popup-header">
          <FiAlertTriangle className="vehicle-nearby-popup-icon" aria-hidden />
          <h2 id="vehicle-nearby-title" className="vehicle-nearby-popup-title">
            {zoneLabel ? `${zoneLabel} · Vehicle nearby` : 'Vehicle nearby'}
          </h2>
          <button type="button" className="vehicle-nearby-popup-close" onClick={dismiss} aria-label="Close"><FiX /></button>
        </div>
        {zoneLabel && <div className="vehicle-nearby-popup-zone-badge">{zoneLabel}</div>}
        <p className="vehicle-nearby-popup-message">
          Another vehicle is within <strong>{formatDistance(distance)}</strong> of your vehicle.
        </p>
        <div className="vehicle-nearby-popup-details">
          {v.ownerName && (
            <div className="vehicle-nearby-popup-row">
              <span className="vehicle-nearby-popup-label">Driver</span>
              <span className="vehicle-nearby-popup-value">{v.ownerName}</span>
            </div>
          )}
          {v.plateNumber && (
            <div className="vehicle-nearby-popup-row">
              <span className="vehicle-nearby-popup-label">Plate</span>
              <span className="vehicle-nearby-popup-value">{v.plateNumber}</span>
            </div>
          )}
          {(v.make || v.model) && (
            <div className="vehicle-nearby-popup-row">
              <span className="vehicle-nearby-popup-label">Vehicle</span>
              <span className="vehicle-nearby-popup-value">{[v.make, v.model].filter(Boolean).join(' ')}</span>
            </div>
          )}
          {v.type && (
            <div className="vehicle-nearby-popup-row">
              <span className="vehicle-nearby-popup-label">Type</span>
              <span className="vehicle-nearby-popup-value">{v.type}</span>
            </div>
          )}
          <div className="vehicle-nearby-popup-row">
            <span className="vehicle-nearby-popup-label">Distance</span>
            <span className="vehicle-nearby-popup-value vehicle-nearby-popup-distance">{formatDistance(distance)}</span>
          </div>
        </div>
        {showSafeSection && (
          <div className="vehicle-nearby-popup-safe">
            <FiNavigation className="vehicle-nearby-popup-safe-icon" aria-hidden />
            <div>
              <div className="vehicle-nearby-popup-safe-title">To stay safe, move your vehicle</div>
              {safestDir && (
                <div className="vehicle-nearby-popup-safe-direction">
                  → <strong>{SAFE_DIRECTION_LABELS[safestDir] || safestDir}</strong>
                </div>
              )}
              {actionLabel && <div className="vehicle-nearby-popup-safe-action">{actionLabel}</div>}
            </div>
          </div>
        )}
        <button type="button" className="vehicle-nearby-popup-dismiss" onClick={dismiss}>OK, got it</button>
      </div>
    </div>
  );
}
