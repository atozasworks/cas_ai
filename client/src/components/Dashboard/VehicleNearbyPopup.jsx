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
  const { vehicleNearbyAlert, dismissVehicleNearbyAlert, riskData } = useSocket();
  const hasPlayedSound = useRef(false);
  const voiceIntervalRef = useRef(null);
  const [aiSuggestion, setAiSuggestion] = useState(FALLBACK_SUGGESTION);
  const isPopupVisible = Boolean(vehicleNearbyAlert);

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

  useEffect(() => {
    if (!vehicleNearbyAlert) {
      hasPlayedSound.current = false;
      return;
    }
    if (vehicleNearbyAlert.playSound && !hasPlayedSound.current) {
      playAlertSound();
      hasPlayedSound.current = true;
    }
  }, [vehicleNearbyAlert]);

  useEffect(() => {
    if (!isPopupVisible) {
      setAiSuggestion(FALLBACK_SUGGESTION);
      return;
    }

    const direction = resolveDirection(vehicleNearbyAlert, riskData);
    setAiSuggestion(buildSuggestion(direction));
  }, [isPopupVisible, vehicleNearbyAlert, riskData]);

  useEffect(() => {
    if (!isPopupVisible || !aiSuggestion?.voiceMessage) {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const playVoiceAlert = () => speakMessage(aiSuggestion.voiceMessage);
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
  }, [isPopupVisible, aiSuggestion?.voiceMessage, speakMessage]);

  if (!vehicleNearbyAlert) return null;

  const v = vehicleNearbyAlert.vehicle || {};
  const distance = vehicleNearbyAlert.distance ?? v.distance ?? 0;

  return (
    <div className="vehicle-nearby-popup-overlay" onClick={dismissVehicleNearbyAlert} role="dialog" aria-modal="true" aria-labelledby="vehicle-nearby-title">
      <div
        className="vehicle-nearby-popup-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vehicle-nearby-popup-header">
          <FiAlertTriangle className="vehicle-nearby-popup-icon" aria-hidden />
          <h2 id="vehicle-nearby-title" className="vehicle-nearby-popup-title">
            Vehicle nearby
          </h2>
          <button
            type="button"
            className="vehicle-nearby-popup-close"
            onClick={dismissVehicleNearbyAlert}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
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
          {aiSuggestion?.direction && (
            <div className="vehicle-nearby-popup-row">
              <span className="vehicle-nearby-popup-label">Direction</span>
              <span className="vehicle-nearby-popup-value">{aiSuggestion.direction}</span>
            </div>
          )}
        </div>

        <div className="vehicle-nearby-popup-ai">
          <div className="vehicle-nearby-popup-ai-title">🤖 AI Safety Suggestion</div>
          <div className="vehicle-nearby-popup-ai-message">{aiSuggestion.approachMessage}</div>
          <div className="vehicle-nearby-popup-ai-action">
            Recommended action: <strong>{aiSuggestion.recommendedAction}</strong>
          </div>
        </div>

        <button
          type="button"
          className="vehicle-nearby-popup-dismiss"
          onClick={dismissVehicleNearbyAlert}
        >
          OK, got it
        </button>
      </div>
    </div>
  );
}
