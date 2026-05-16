import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../hooks/useTheme';
import { FiShield, FiMap, FiBarChart2, FiSettings, FiLogOut, FiSun, FiMoon, FiWifi, FiWifiOff, FiChevronDown, FiCamera } from 'react-icons/fi';

const AVATAR_PREVIEW_SIZE = 220;
const AVATAR_OUTPUT_SIZE = 256;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [avatarImage, setAvatarImage] = useState('');
  const [avatarHover, setAvatarHover] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [selectedAvatarSrc, setSelectedAvatarSrc] = useState('');
  const [selectedAvatarMeta, setSelectedAvatarMeta] = useState({ width: 0, height: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
  const dropdownRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    try {
      const savedAvatar = localStorage.getItem('cas_profile_avatar');
      if (savedAvatar) {
        setAvatarImage(savedAvatar);
      }
    } catch {
      // Ignore storage read issues (private mode / blocked storage)
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!avatarModalOpen) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setAvatarModalOpen(false);
        setSelectedAvatarSrc('');
        setSelectedAvatarMeta({ width: 0, height: 0 });
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [avatarModalOpen]);

  const handleAvatarClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    avatarInputRef.current?.click();
  };

  const getFitScale = (zoomValue = cropZoom) => {
    if (!selectedAvatarMeta.width || !selectedAvatarMeta.height) {
      return { width: AVATAR_PREVIEW_SIZE, height: AVATAR_PREVIEW_SIZE };
    }
    const baseScale = Math.max(
      AVATAR_PREVIEW_SIZE / selectedAvatarMeta.width,
      AVATAR_PREVIEW_SIZE / selectedAvatarMeta.height
    );
    return {
      width: selectedAvatarMeta.width * baseScale * zoomValue,
      height: selectedAvatarMeta.height * baseScale * zoomValue,
    };
  };

  const clampCropOffset = (offset, zoomValue = cropZoom) => {
    const size = getFitScale(zoomValue);
    const maxX = Math.max(0, (size.width - AVATAR_PREVIEW_SIZE) / 2);
    const maxY = Math.max(0, (size.height - AVATAR_PREVIEW_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const probe = new Image();
        probe.onload = () => {
          setSelectedAvatarMeta({ width: probe.width, height: probe.height });
          setSelectedAvatarSrc(reader.result);
          setCropZoom(1);
          setCropOffset({ x: 0, y: 0 });
          setAvatarModalOpen(true);
        };
        probe.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAvatarModalCancel = () => {
    setAvatarModalOpen(false);
    setSelectedAvatarSrc('');
    setSelectedAvatarMeta({ width: 0, height: 0 });
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setDragState({ active: false, x: 0, y: 0, startX: 0, startY: 0 });
  };

  const handleAvatarModalSave = () => {
    if (!selectedAvatarSrc || !selectedAvatarMeta.width || !selectedAvatarMeta.height) {
      return;
    }
    const sourceImage = new Image();
    sourceImage.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_OUTPUT_SIZE;
      canvas.height = AVATAR_OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const previewSize = getFitScale();
      const ratio = AVATAR_OUTPUT_SIZE / AVATAR_PREVIEW_SIZE;
      const drawWidth = previewSize.width * ratio;
      const drawHeight = previewSize.height * ratio;
      const drawX = (AVATAR_OUTPUT_SIZE / 2) - (drawWidth / 2) + (cropOffset.x * ratio);
      const drawY = (AVATAR_OUTPUT_SIZE / 2) - (drawHeight / 2) + (cropOffset.y * ratio);

      ctx.save();
      ctx.beginPath();
      ctx.arc(
        AVATAR_OUTPUT_SIZE / 2,
        AVATAR_OUTPUT_SIZE / 2,
        AVATAR_OUTPUT_SIZE / 2,
        0,
        Math.PI * 2
      );
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();

      const nextAvatar = canvas.toDataURL('image/png');
      setAvatarImage(nextAvatar);
      try {
        localStorage.setItem('cas_profile_avatar', nextAvatar);
      } catch {
        // Ignore storage write issues and still keep current-session avatar
      }
      handleAvatarModalCancel();
    };
    sourceImage.src = selectedAvatarSrc;
  };

  const handleCropZoomChange = (event) => {
    const nextZoom = Number(event.target.value);
    setCropZoom(nextZoom);
    setCropOffset((prev) => clampCropOffset(prev, nextZoom));
  };

  const handleCropPointerDown = (event) => {
    if (!selectedAvatarSrc) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      active: true,
      x: event.clientX,
      y: event.clientY,
      startX: cropOffset.x,
      startY: cropOffset.y,
    });
  };

  const handleCropPointerMove = (event) => {
    if (!dragState.active) return;
    const deltaX = event.clientX - dragState.x;
    const deltaY = event.clientY - dragState.y;
    const next = clampCropOffset({
      x: dragState.startX + deltaX,
      y: dragState.startY + deltaY,
    });
    setCropOffset(next);
  };

  const handleCropPointerEnd = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragState((prev) => ({ ...prev, active: false }));
  };

  const navItems = [
    { to: '/', icon: <FiMap />, label: 'Dashboard' },
    { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
  ];

  const avatarInitial = user?.name?.charAt(0)?.toUpperCase() || 'H';
  const previewSize = getFitScale();

  return (
    <>
      <nav className="navbar" style={styles.nav}>
        <div style={styles.left}>
          <Link to="/" style={styles.brand}>
            <FiShield style={{ color: '#3b82f6', fontSize: 24 }} />
            <span style={styles.brandText}>CAS</span>
          </Link>
          <div className="navbar-desktop-links" style={styles.links}>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  ...styles.link,
                  ...(location.pathname === item.to ? styles.activeLink : {}),
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="navbar-right" style={styles.right}>
          <div style={styles.status}>
            {connected
              ? <><FiWifi style={{ color: '#22c55e' }} /> <span style={{ color: '#22c55e', fontSize: 12 }}>Live</span></>
              : <><FiWifiOff style={{ color: '#ef4444' }} /> <span style={{ color: '#ef4444', fontSize: 12 }}>Offline</span></>
            }
          </div>
          <button onClick={toggleTheme} style={styles.iconBtn} title="Toggle theme">
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          {/* Profile Dropdown */}
          <div ref={dropdownRef} style={styles.profileWrapper}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={styles.hiddenInput}
            />
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={styles.profileBtn}
              title="Profile"
            >
              <div
                style={styles.avatar}
                onClick={handleAvatarClick}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                title="Change profile photo"
              >
                {avatarImage ? (
                  <img src={avatarImage} alt="Profile" style={styles.avatarImage} />
                ) : (
                  <span style={styles.avatarLetter}>{avatarInitial}</span>
                )}
                <div style={{ ...styles.avatarOverlay, opacity: avatarHover ? 1 : 0 }}>
                  <FiCamera size={13} />
                </div>
              </div>
              <span className="navbar-user-name" style={styles.profileName}>{user?.name}</span>
              <FiChevronDown style={{
                fontSize: 14, color: 'var(--text-muted)',
                transition: 'transform 0.2s',
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              }} />
            </button>

            {showDropdown && (
              <div style={styles.dropdown}>
                {/* User info */}
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownAvatar}>
                    {avatarImage ? (
                      <img src={avatarImage} alt="Profile" style={styles.avatarImage} />
                    ) : (
                      <span style={styles.avatarLetter}>{avatarInitial}</span>
                    )}
                  </div>
                  <div>
                    <div style={styles.dropdownName}>{user?.name}</div>
                    <div style={styles.dropdownEmail}>{user?.email}</div>
                  </div>
                </div>

                <div style={styles.dropdownDivider} />

                {/* Settings */}
                <button
                  onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                  style={styles.dropdownItem}
                >
                  <FiSettings style={{ fontSize: 16 }} />
                  <span>Settings</span>
                </button>

                <div style={styles.dropdownDivider} />

                {/* Logout */}
                <button
                  onClick={() => { logout(); setShowDropdown(false); }}
                  style={{ ...styles.dropdownItem, color: '#ef4444' }}
                >
                  <FiLogOut style={{ fontSize: 16 }} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {avatarModalOpen && (
        <div style={styles.avatarModalOverlay} onClick={handleAvatarModalCancel}>
          <div style={styles.avatarModalCard} onClick={(event) => event.stopPropagation()}>
            <h3 style={styles.avatarModalTitle}>Adjust Profile Photo</h3>
            <p style={styles.avatarModalText}>Drag to move, use slider to zoom</p>

            <div
              style={{ ...styles.cropArea, cursor: dragState.active ? 'grabbing' : 'grab' }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerEnd}
              onPointerCancel={handleCropPointerEnd}
            >
              {selectedAvatarSrc && (
                <img
                  src={selectedAvatarSrc}
                  alt="Avatar preview"
                  style={{
                    ...styles.cropImage,
                    width: previewSize.width,
                    height: previewSize.height,
                    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
                  }}
                  draggable={false}
                />
              )}
              <div style={styles.cropRing} />
            </div>

            <div style={styles.zoomRow}>
              <span style={styles.zoomLabel}>Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropZoom}
                onChange={handleCropZoomChange}
                style={styles.zoomSlider}
              />
            </div>

            <div style={styles.avatarModalActions}>
              <button type="button" onClick={handleAvatarModalCancel} style={styles.avatarCancelBtn}>
                Cancel
              </button>
              <button type="button" onClick={handleAvatarModalSave} style={styles.avatarSaveBtn}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 56,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  left: { display: 'flex', alignItems: 'center', gap: 32 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  brandText: { fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: 1 },
  links: { display: 'flex', gap: 4 },
  link: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 8, color: 'var(--text-secondary)', textDecoration: 'none',
    fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
  },
  activeLink: {
    background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
  },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  status: { display: 'flex', alignItems: 'center', gap: 4 },
  iconBtn: {
    background: 'none', border: 'none', color: 'var(--text-secondary)',
    fontSize: 18, cursor: 'pointer', padding: 6, borderRadius: 6,
    display: 'flex', alignItems: 'center',
  },
  profileWrapper: {
    position: 'relative',
  },
  profileBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '4px 10px 4px 4px', borderRadius: 50,
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  hiddenInput: {
    display: 'none',
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: 14, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative', overflow: 'hidden',
    cursor: 'pointer',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1,
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2, 6, 23, 0.58)',
    color: '#e2e8f0',
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
  },
  profileName: {
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
    maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  /* Dropdown */
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
    minWidth: 220, background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)', borderRadius: 12,
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    padding: '6px 0', zIndex: 200,
    animation: 'fadeSlideDown 0.15s ease',
  },
  dropdownHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px',
  },
  dropdownAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  dropdownName: {
    fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
  },
  dropdownEmail: {
    fontSize: 12, color: 'var(--text-muted)', marginTop: 1,
  },
  dropdownDivider: {
    height: 1, background: 'var(--border-color)', margin: '4px 0',
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 500,
    color: 'var(--text-primary)', background: 'none', border: 'none',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  avatarModalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 400,
    background: 'rgba(2, 6, 23, 0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  avatarModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    padding: 22,
    background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))',
    border: '1px solid rgba(148, 163, 184, 0.24)',
    boxShadow: '0 24px 56px rgba(2, 6, 23, 0.56)',
  },
  avatarModalTitle: {
    margin: 0,
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 700,
  },
  avatarModalText: {
    margin: '6px 0 16px',
    color: '#94a3b8',
    fontSize: 13,
  },
  cropArea: {
    width: AVATAR_PREVIEW_SIZE,
    height: AVATAR_PREVIEW_SIZE,
    margin: '0 auto',
    borderRadius: '50%',
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(51, 65, 85, 0.65)',
    boxShadow: 'inset 0 0 0 2px rgba(148, 163, 184, 0.3), 0 10px 24px rgba(2, 6, 23, 0.42)',
    touchAction: 'none',
    userSelect: 'none',
  },
  cropImage: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transformOrigin: 'center',
    willChange: 'transform',
  },
  cropRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(191, 219, 254, 0.75)',
    pointerEvents: 'none',
  },
  zoomRow: {
    marginTop: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  zoomLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
    minWidth: 42,
  },
  zoomSlider: {
    width: '100%',
    accentColor: '#3b82f6',
  },
  avatarModalActions: {
    marginTop: 18,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  avatarCancelBtn: {
    border: '1px solid rgba(148, 163, 184, 0.32)',
    background: 'rgba(51, 65, 85, 0.55)',
    color: '#e2e8f0',
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  avatarSaveBtn: {
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 10px 22px rgba(37, 99, 235, 0.35)',
  },
};
