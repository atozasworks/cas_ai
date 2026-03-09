import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { formatDistance } from '../../utils/helpers';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

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

const DIRECTION_ACTION_MAP = {
  LEFT: {
    approachMessage: 'Vehicle approaching from LEFT',
    recommendedAction: 'MOVE RIGHT IMMEDIATELY',
    voiceMessage: 'Warning. Vehicle approaching from the left. Please move right immediately.',
  },
  RIGHT: {
    approachMessage: 'Vehicle approaching from RIGHT',
    recommendedAction: 'MOVE LEFT IMMEDIATELY',
    voiceMessage: 'Warning. Vehicle approaching from the right. Please move left immediately.',
  },
  FRONT: {
    approachMessage: 'Vehicle detected in FRONT',
    recommendedAction: 'SLOW DOWN OR MOVE BACK',
    voiceMessage: 'Warning. Vehicle detected in front. Please slow down immediately.',
  },
  BACK: {
    approachMessage: 'Vehicle approaching from BACK',
    recommendedAction: 'MOVE FORWARD CAREFULLY',
    voiceMessage: 'Warning. Vehicle approaching from behind. Please move forward carefully.',
  },
};

const FALLBACK_SUGGESTION = {
  direction: null,
  approachMessage: 'Vehicle detected nearby',
  recommendedAction: 'SLOW DOWN AND MAINTAIN SAFE DISTANCE',
  voiceMessage: 'Warning. Vehicle nearby. Please slow down and maintain a safe distance.',
};

function normalizeDirection(rawDirection) {
  if (!rawDirection || typeof rawDirection !== 'string') return null;

  const value = rawDirection.trim().toUpperCase();
  if (value === 'LEFT' || value === 'RIGHT' || value === 'FRONT' || value === 'BACK') {
    return value;
  }

  return null;
}

function resolveDirection(vehicleNearbyAlert, riskData) {
  const directDirection = normalizeDirection(
    vehicleNearbyAlert?.direction || vehicleNearbyAlert?.vehicle?.direction
  );
  if (directDirection) return directDirection;

  const alertVehicleId = vehicleNearbyAlert?.vehicle?.vehicleId
    || vehicleNearbyAlert?.vehicle?._id
    || vehicleNearbyAlert?.vehicle?.id;

  if (alertVehicleId && riskData?.assessments?.length) {
    const matchedAssessment = riskData.assessments.find((assessment) => {
      if (!assessment?.vehicleId) return false;
      return String(assessment.vehicleId) === String(alertVehicleId);
    });

    const matchedDirection = normalizeDirection(matchedAssessment?.components?.direction);
    if (matchedDirection) return matchedDirection;
  }

  return normalizeDirection(riskData?.assessments?.[0]?.components?.direction);
}

function buildSuggestion(direction) {
  if (!direction || !DIRECTION_ACTION_MAP[direction]) {
    return FALLBACK_SUGGESTION;
  }

  return {
    direction,
    ...DIRECTION_ACTION_MAP[direction],
  };
}

export default function VehicleNearbyPopup() {
  const {
    vehicleNearbyAlert,
    dismissVehicleNearbyAlert,
    zoneAlert,
    dismissZoneAlert,
    riskData,
  } = useSocket();

  const hasPlayedSound = useRef(false);
  const voiceIntervalRef = useRef(null);
  const [aiSuggestion, setAiSuggestion] = useState(FALLBACK_SUGGESTION);

  const showVehicle = Boolean(vehicleNearbyAlert);
  const showZone = Boolean(zoneAlert);
  const isPopupVisible = showVehicle || showZone;
  const dismiss = showVehicle ? dismissVehicleNearbyAlert : dismissZoneAlert;
  const activeAlert = showVehicle ? vehicleNearbyAlert : zoneAlert;

  const speakMessage = useCallback((message) => {
    if (!message || typeof window === 'undefined') return;
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === 'undefined') return;

    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleEmergencyDial = useCallback((number) => {
    window.location.href = `tel:${number}`;
  }, []);

  const handleEmergencyNotify = useCallback((number, message) => {
    const text = encodeURIComponent(message || 'Emergency alert from Collision Avoidance System.');
    window.location.href = `sms:${number}?body=${text}`;
  }, []);

  useEffect(() => {
    if (!activeAlert) {
      hasPlayedSound.current = false;
      return;
    }

    if (activeAlert.playSound && !hasPlayedSound.current) {
      playAlertSound();
      hasPlayedSound.current = true;
    }
  }, [activeAlert]);

  useEffect(() => {
    if (!showVehicle) {
      setAiSuggestion(FALLBACK_SUGGESTION);
      return;
    }

    const direction = resolveDirection(vehicleNearbyAlert, riskData);
    setAiSuggestion(buildSuggestion(direction));
  }, [showVehicle, vehicleNearbyAlert, riskData]);

  const zoneVoiceMessage = zoneAlert?.aiRecommendation
    ? `Warning. ${zoneAlert.aiRecommendation}`
    : null;
  const voiceMessage = showVehicle ? aiSuggestion.voiceMessage : zoneVoiceMessage;

  useEffect(() => {
    if (!isPopupVisible || !voiceMessage) {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const playVoiceAlert = () => speakMessage(voiceMessage);
    playVoiceAlert();
    voiceIntervalRef.current = setInterval(playVoiceAlert, 5000);

    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPopupVisible, voiceMessage, speakMessage]);

  if (!isPopupVisible) return null;

  if (showZone && !showVehicle) {
    return (
      <div className="vehicle-nearby-popup-overlay" onClick={dismiss} role="dialog" aria-modal="true" aria-labelledby="vehicle-nearby-title">
        <div className="vehicle-nearby-popup-card vehicle-nearby-popup-card-zone" onClick={(e) => e.stopPropagation()}>
          <div className="vehicle-nearby-popup-header vehicle-nearby-popup-header-zone">
            <FiAlertTriangle className="vehicle-nearby-popup-icon" aria-hidden />
            <h2 id="vehicle-nearby-title" className="vehicle-nearby-popup-title">{zoneAlert.zoneLabel}</h2>
            <button type="button" className="vehicle-nearby-popup-close" onClick={dismiss} aria-label="Close">
              <FiX />
            </button>
          </div>
          <p className="vehicle-nearby-popup-message">
            <span className="vehicle-nearby-popup-ai-message">{zoneAlert.aiRecommendation}</span>
          </p>
          <p className="vehicle-nearby-popup-zone-hint">Map and GPS analyzed. Drive safely.</p>
          <button type="button" className="vehicle-nearby-popup-dismiss" onClick={dismiss}>OK, got it</button>
        </div>
      </div>
    );
  }

  const v = vehicleNearbyAlert?.vehicle || {};
  const distance = vehicleNearbyAlert?.distance ?? v.distance ?? 0;
  const zoneLabel = vehicleNearbyAlert?.zoneLabel || null;
  const topAssessment = riskData?.assessments?.[0];
  const ttcSeconds = topAssessment?.components?.ttc ?? null;
  const showDangerWarning = Boolean(
    (distance <= 12 && (riskData?.riskLevel === 'high' || (riskData?.finalRisk || 0) >= 60))
    || (ttcSeconds != null && ttcSeconds <= 20)
  );
  const notifyMessage = showDangerWarning
    ? 'Danger - Possible accident ahead. Please send immediate emergency assistance.'
    : 'Nearby vehicle collision risk detected. Please provide emergency assistance.';

  return (
    <div className="vehicle-nearby-popup-overlay" onClick={dismiss} role="dialog" aria-modal="true" aria-labelledby="vehicle-nearby-title">
      <div className="vehicle-nearby-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="vehicle-nearby-popup-header">
          <FiAlertTriangle className="vehicle-nearby-popup-icon" aria-hidden />
          <h2 id="vehicle-nearby-title" className="vehicle-nearby-popup-title">
            {zoneLabel ? `${zoneLabel} - Vehicle nearby` : 'Vehicle nearby'}
          </h2>
          <button type="button" className="vehicle-nearby-popup-close" onClick={dismiss} aria-label="Close">
            <FiX />
          </button>
        </div>

        {zoneLabel && <div className="vehicle-nearby-popup-zone-badge">{zoneLabel}</div>}

        <p className="vehicle-nearby-popup-message">
          Another vehicle is within <strong>{formatDistance(distance)}</strong> of your vehicle.
        </p>

        {showDangerWarning && (
          <div className="vehicle-nearby-popup-danger-warning">
            <div className="vehicle-nearby-popup-danger-warning-title">
              🚨 Danger - Possible Accident Ahead
            </div>
            <div className="vehicle-nearby-popup-danger-warning-text">
              Please slow down or change direction immediately.
            </div>
          </div>
        )}

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
          {aiSuggestion.direction && (
            <div className="vehicle-nearby-popup-row">
              <span className="vehicle-nearby-popup-label">Direction</span>
              <span className="vehicle-nearby-popup-value">{aiSuggestion.direction}</span>
            </div>
          )}
        </div>

        <div className="vehicle-nearby-popup-ai">
          <div className="vehicle-nearby-popup-ai-title">AI Safety Suggestion</div>
          <div className="vehicle-nearby-popup-ai-message">{aiSuggestion.approachMessage}</div>
          <div className="vehicle-nearby-popup-ai-action">
            Recommended action: <strong>{aiSuggestion.recommendedAction}</strong>
          </div>
        </div>

        <div className="vehicle-nearby-popup-emergency-list">
          <div className="vehicle-nearby-popup-emergency-row ambulance">
            <div className="vehicle-nearby-popup-emergency-service">
              <span className="vehicle-nearby-popup-emergency-emoji">🚑</span>
              <span>Ambulance</span>
            </div>
            <div className="vehicle-nearby-popup-emergency-actions">
              <button type="button" className="vehicle-nearby-popup-emergency-action-btn" onClick={() => handleEmergencyDial('108')}>Call</button>
              <button type="button" className="vehicle-nearby-popup-emergency-action-btn notify" onClick={() => handleEmergencyNotify('108', notifyMessage)}>Notify</button>
            </div>
          </div>

          <div className="vehicle-nearby-popup-emergency-row hospital">
            <div className="vehicle-nearby-popup-emergency-service">
              <span className="vehicle-nearby-popup-emergency-emoji">🏥</span>
              <span>Hospital</span>
            </div>
            <div className="vehicle-nearby-popup-emergency-actions">
              <button type="button" className="vehicle-nearby-popup-emergency-action-btn" onClick={() => handleEmergencyDial('112')}>Call</button>
              <button type="button" className="vehicle-nearby-popup-emergency-action-btn notify" onClick={() => handleEmergencyNotify('112', notifyMessage)}>Notify</button>
            </div>
          </div>

          <div className="vehicle-nearby-popup-emergency-row police">
            <div className="vehicle-nearby-popup-emergency-service">
              <span className="vehicle-nearby-popup-emergency-emoji">🚓</span>
              <span>Police</span>
            </div>
            <div className="vehicle-nearby-popup-emergency-actions">
              <button type="button" className="vehicle-nearby-popup-emergency-action-btn" onClick={() => handleEmergencyDial('100')}>Call</button>
              <button type="button" className="vehicle-nearby-popup-emergency-action-btn notify" onClick={() => handleEmergencyNotify('100', notifyMessage)}>Notify</button>
            </div>
          </div>
        </div>

        <button type="button" className="vehicle-nearby-popup-dismiss" onClick={dismiss}>OK, got it</button>
      </div>
    </div>
  );
}
