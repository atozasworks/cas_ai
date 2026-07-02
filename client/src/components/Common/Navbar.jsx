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
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <FiShield className="navbar-brand-icon" />
            <span className="navbar-brand-text">CAS</span>
          </Link>
          <div className="navbar-desktop-links navbar-links">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`navbar-link${location.pathname === item.to ? ' navbar-link--active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="navbar-right">
          <div className="navbar-status">
            {connected ? (
              <>
                <FiWifi style={{ color: 'var(--accent-green)' }} />
                <span className="navbar-status-text navbar-status-text--live">Live</span>
              </>
            ) : (
              <>
                <FiWifiOff style={{ color: 'var(--accent-red)' }} />
                <span className="navbar-status-text navbar-status-text--offline">Offline</span>
              </>
            )}
          </div>
          <button onClick={toggleTheme} className="navbar-icon-btn" title="Toggle theme">
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          <div ref={dropdownRef} className="navbar-profile-wrapper">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="navbar-hidden-input"
            />
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="navbar-profile-btn"
              title="Profile"
            >
              <div
                className="navbar-avatar"
                onClick={handleAvatarClick}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                title="Change profile photo"
              >
                {avatarImage ? (
                  <img src={avatarImage} alt="Profile" className="navbar-avatar-image" />
                ) : (
                  <span className="navbar-avatar-letter">{avatarInitial}</span>
                )}
                <div className="navbar-avatar-overlay" style={{ opacity: avatarHover ? 1 : 0 }}>
                  <FiCamera size={13} />
                </div>
              </div>
              <span className="navbar-user-name navbar-profile-name">{user?.name}</span>
              <FiChevronDown className={`navbar-chevron${showDropdown ? ' navbar-chevron--open' : ''}`} />
            </button>

            {showDropdown && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-header">
                  <div className="navbar-dropdown-avatar">
                    {avatarImage ? (
                      <img src={avatarImage} alt="Profile" className="navbar-avatar-image" />
                    ) : (
                      <span className="navbar-avatar-letter">{avatarInitial}</span>
                    )}
                  </div>
                  <div>
                    <div className="navbar-dropdown-name">{user?.name}</div>
                    <div className="navbar-dropdown-email">{user?.email}</div>
                  </div>
                </div>

                <div className="navbar-dropdown-divider" />

                <button
                  onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                  className="navbar-dropdown-item"
                >
                  <FiSettings style={{ fontSize: 16 }} />
                  <span>Settings</span>
                </button>

                <div className="navbar-dropdown-divider" />

                <button
                  onClick={() => { logout(); setShowDropdown(false); }}
                  className="navbar-dropdown-item navbar-dropdown-item--danger"
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
        <div className="navbar-avatar-modal-overlay" onClick={handleAvatarModalCancel}>
          <div className="navbar-avatar-modal-card" onClick={(event) => event.stopPropagation()}>
            <h3 className="navbar-avatar-modal-title">Adjust Profile Photo</h3>
            <p className="navbar-avatar-modal-text">Drag to move, use slider to zoom</p>

            <div
              className={`navbar-crop-area ${dragState.active ? 'navbar-crop-area--grabbing' : 'navbar-crop-area--grab'}`}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerEnd}
              onPointerCancel={handleCropPointerEnd}
            >
              {selectedAvatarSrc && (
                <img
                  src={selectedAvatarSrc}
                  alt="Avatar preview"
                  className="navbar-crop-image"
                  style={{
                    width: previewSize.width,
                    height: previewSize.height,
                    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
                  }}
                  draggable={false}
                />
              )}
              <div className="navbar-crop-ring" />
            </div>

            <div className="navbar-zoom-row">
              <span className="navbar-zoom-label">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropZoom}
                onChange={handleCropZoomChange}
                className="navbar-zoom-slider"
              />
            </div>

            <div className="navbar-avatar-modal-actions">
              <button type="button" onClick={handleAvatarModalCancel} className="navbar-avatar-cancel-btn">
                Cancel
              </button>
              <button type="button" onClick={handleAvatarModalSave} className="navbar-avatar-save-btn">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
