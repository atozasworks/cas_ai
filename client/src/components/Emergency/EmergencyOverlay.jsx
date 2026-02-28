import React, { useState, useEffect, useCallback } from 'react';
import { confirmSafe, reportEmergency } from '../../services/socket';
import { useSocket } from '../../context/SocketContext';
import { FiAlertOctagon, FiPhoneCall, FiShield } from 'react-icons/fi';

export default function EmergencyOverlay() {
  const { emergency, activeVehicleId, lastPosition } = useSocket();
  const [countdown, setCountdown] = useState(30);
  const [dismissed, setDismissed] = useState(false);

  const handleAutoEscalate = useCallback(() => {
    if (activeVehicleId && lastPosition) {
      reportEmergency({
        vehicleId: activeVehicleId,
        userId: lastPosition.userId,
        latitude: lastPosition.latitude,
        longitude: lastPosition.longitude,
        incidentType: 'crash_detected',
        description: 'Auto-escalated: no safe confirmation within countdown',
      });
    }
  }, [activeVehicleId, lastPosition]);

  useEffect(() => {
    if (!emergency) {
      setDismissed(false);
      setCountdown(30);
      return;
    }

    setCountdown(emergency.countdownSeconds || 30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoEscalate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [emergency, handleAutoEscalate]);

  const handleSafe = () => {
    if (emergency?.incidentId) {
      confirmSafe(emergency.incidentId);
    }
    setDismissed(true);
  };

  const handleCallEmergency = () => {
    handleAutoEscalate();
    window.open('tel:112', '_self');
  };

  if (!emergency || dismissed) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.iconPulse}>
          <FiAlertOctagon style={{ fontSize: 64, color: 'white' }} />
        </div>

        <h1 style={styles.title}>CRASH DETECTED</h1>
        <p style={styles.severity}>
          Severity: <strong>{emergency.severity?.toUpperCase()}</strong>
        </p>
        <p style={styles.message}>{emergency.message}</p>

        <div style={styles.countdown}>
          <div style={styles.countdownCircle}>
            <span style={styles.countdownNumber}>{countdown}</span>
          </div>
          <p style={styles.countdownText}>
            Emergency services will be notified automatically
          </p>
        </div>

        <div style={styles.buttons}>
          <button onClick={handleSafe} style={styles.safeBtn}>
            <FiShield style={{ fontSize: 22 }} />
            I AM SAFE
          </button>
          <button onClick={handleCallEmergency} style={styles.emergencyBtn}>
            <FiPhoneCall style={{ fontSize: 20 }} />
            CALL EMERGENCY
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(127, 29, 29, 0.95)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'emergencyFlash 1.5s ease infinite',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 40,
    maxWidth: 420,
    textAlign: 'center',
  },
  iconPulse: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 1s ease infinite',
  },
  title: {
    fontSize: 32,
    fontWeight: 900,
    color: 'white',
    letterSpacing: 3,
  },
  severity: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  countdown: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    margin: '8px 0',
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: 900,
    color: 'white',
  },
  countdownText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    maxWidth: 250,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  safeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '16px 0',
    fontSize: 18,
    fontWeight: 800,
    borderRadius: 12,
    background: '#22c55e',
    color: 'white',
    border: 'none',
    letterSpacing: 2,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emergencyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    cursor: 'pointer',
  },
};
