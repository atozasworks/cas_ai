import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { confirmSafe, markSosSent } from '../../services/socket';
import { useSocket } from '../../context/SocketContext';
import {
  buildSosText,
  callEmergencyNumber,
  canShareSos,
  mapsUrl,
  openSms,
  openWhatsApp,
  shareSos,
} from '../../services/sos';
import { FiAlertOctagon, FiMessageCircle, FiPhoneCall, FiShare2, FiShield } from 'react-icons/fi';

export default function EmergencyOverlay() {
  const { emergency } = useSocket();
  const [countdown, setCountdown] = useState(30);
  const [dismissed, setDismissed] = useState(false);
  const [sosDue, setSosDue] = useState(false);
  const [shareReady, setShareReady] = useState(false);

  useEffect(() => {
    setShareReady(canShareSos());
  }, []);

  useEffect(() => {
    if (!emergency) {
      setDismissed(false);
      setCountdown(30);
      setSosDue(false);
      return undefined;
    }

    setDismissed(false);
    setSosDue(false);
    setCountdown(emergency.countdownSeconds || 30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSosDue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [emergency]);

  const contacts = emergency?.contacts || [];
  const locationLink = mapsUrl(emergency?.latitude, emergency?.longitude);
  const sosText = buildSosText({
    userName: emergency?.userName,
    mapsUrl: locationLink,
    isTest: emergency?.isTest,
  });

  const recordSend = (channel) => {
    if (emergency?.incidentId) markSosSent(emergency.incidentId, channel);
  };

  const handleSafe = () => {
    if (emergency?.incidentId) confirmSafe(emergency.incidentId);
    setDismissed(true);
  };

  const handleTextContacts = () => {
    if (!contacts.length) {
      toast.error('Add an emergency contact in Profile first');
      return;
    }
    if (!locationLink) {
      toast.error('Location is missing. Allow GPS and try again.');
      return;
    }
    recordSend('sms');
    openSms(contacts.map((contact) => contact.phone), sosText);
  };

  const handleWhatsApp = (contact) => {
    if (!locationLink) {
      toast.error('Location is missing. Allow GPS and try again.');
      return;
    }
    recordSend('whatsapp');
    openWhatsApp(contact.phone, sosText);
  };

  const handleShare = async () => {
    if (!locationLink) {
      toast.error('Location is missing. Allow GPS and try again.');
      return;
    }
    try {
      const shared = await shareSos(sosText);
      if (shared) recordSend('share');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not open the share sheet');
    }
  };

  const handleCallEmergency = () => {
    recordSend('tel-112');
    callEmergencyNumber();
  };

  if (!emergency || dismissed) return null;

  const directionArrows = ['↑', '↓', '←', '→'];

  return (
    <div style={styles.overlay} className="emergency-overlay-mobile">
      <div style={styles.content} className="emergency-content">
        <div style={styles.iconPulse}>
          <FiAlertOctagon style={{ fontSize: 64, color: 'white' }} />
        </div>

        <h1 style={styles.title} className="emergency-title">
          {emergency.isTest ? 'TEST SOS' : 'CRASH DETECTED'}
        </h1>
        <p style={styles.severity}>
          Severity: <strong>{emergency.severity?.toUpperCase()}</strong>
        </p>
        <p style={styles.message}>{emergency.message}</p>
        {locationLink && (
          <p style={styles.location}>Location ready to send</p>
        )}

        <div className="emergency-direction-arrows" aria-hidden="true">
          {directionArrows.map((arrow) => (
            <span key={arrow}>{arrow}</span>
          ))}
        </div>

        <div style={styles.countdown}>
          <div style={styles.countdownCircle}>
            <span style={styles.countdownNumber}>{countdown}</span>
          </div>
          <p style={styles.countdownText}>
            {sosDue
              ? 'Tap a send button. This phone cannot text your contacts by itself.'
              : 'If you do not tap I AM SAFE, send your location before the timer ends.'}
          </p>
        </div>

        {contacts.length > 0 ? (
          <div style={styles.contactList}>
            {contacts.map((contact) => (
              <div key={contact.phone} style={styles.contactRow}>
                <span style={styles.contactName}>{contact.name}</span>
                <button type="button" onClick={() => handleWhatsApp(contact)} style={styles.contactBtn}>
                  <FiMessageCircle />
                  WhatsApp
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.message}>No emergency contacts yet. Add them in Profile, then test again.</p>
        )}

        <div style={styles.buttons} className="emergency-buttons">
          <button type="button" onClick={handleSafe} style={styles.safeBtn}>
            <FiShield style={{ fontSize: 22 }} />
            I AM SAFE
          </button>
          <button type="button" onClick={handleTextContacts} style={styles.emergencyBtn}>
            <FiMessageCircle style={{ fontSize: 20 }} />
            TEXT MY CONTACTS
          </button>
          {shareReady && (
            <button type="button" onClick={handleShare} style={styles.emergencyBtn}>
              <FiShare2 style={{ fontSize: 20 }} />
              SHARE LOCATION
            </button>
          )}
          <button type="button" onClick={handleCallEmergency} style={styles.emergencyBtn}>
            <FiPhoneCall style={{ fontSize: 20 }} />
            CALL 112
          </button>
        </div>
        <p style={styles.finePrint}>
          Text, WhatsApp, and 112 open on this phone after you tap. UCASA does not contact the 112 center by itself.
        </p>
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
    overflowY: 'auto',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 40,
    maxWidth: 420,
    width: '100%',
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
    margin: 0,
  },
  severity: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    margin: 0,
  },
  location: {
    fontSize: 13,
    color: '#bbf7d0',
    margin: 0,
    fontWeight: 700,
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
    maxWidth: 280,
    margin: 0,
  },
  contactList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.08)',
  },
  contactName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'left',
  },
  contactBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'transparent',
    color: 'white',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 700,
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
  finePrint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    margin: 0,
    lineHeight: 1.4,
  },
};
