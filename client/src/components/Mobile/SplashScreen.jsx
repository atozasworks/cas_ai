import React, { useState, useCallback, useRef } from 'react';
import { FiHeart, FiArrowRight } from 'react-icons/fi';
import splashImage from './asset/ChatGPT Image Mar 6, 2026, 12_24_49 PM.png';
import driveSmartImage from './asset/ChatGPT Image Mar 6, 2026, 12_59_16 PM.png';

const SLIDES = [
  {
    id: 'app',
    image: splashImage,
    title: '',
    subtitle: 'Collision Avoidance System',
    text: 'AI-enhanced real-time safety. Track your vehicle, get risk alerts, and drive with confidence.',
    accent: 'var(--accent-blue)',
  },
  {
    id: 'driving',
    image: driveSmartImage,
    title: 'Drive Smart',
    subtitle: 'Driving Safety',
    text: 'Every trip matters. Stay alert, follow speed limits, and keep a safe distance. Your safety is in your hands.',
    accent: 'var(--accent-cyan)',
  },
  {
    id: 'safety',
    icon: FiHeart,
    title: 'Safety First',
    subtitle: 'Motivational',
    text: 'One safe decision today can save a life tomorrow. Be the driver you want others to be.',
    accent: 'var(--accent-green)',
  },
];

const SWIPE_THRESHOLD = 50;

export default function SplashScreen({ onFinish }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef({ x: 0 });

  const total = SLIDES.length;
  const isLast = current === total - 1;

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX };
  };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) goNext();
    else if (current > 0) goPrev();
  };

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish?.();
      return;
    }
    setCurrent((c) => Math.min(c + 1, total - 1));
  }, [isLast, total, onFinish]);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  const handleSkip = useCallback(() => {
    onFinish?.();
  }, [onFinish]);

  const goToSlide = (index) => setCurrent(index);

  return (
    <div
      className="splash-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="splash-skip"
        onClick={handleSkip}
        aria-label="Skip to login"
      >
        Skip
      </button>

      <div className="splash-slider-wrap">
        <button
          type="button"
          className="splash-arrow-side splash-arrow-left"
          onClick={goPrev}
          aria-label="Previous"
          disabled={current === 0}
        >
          ‹
        </button>
        {!isLast && (
          <button
            type="button"
            className="splash-arrow-side splash-arrow-right"
            onClick={goNext}
            aria-label="Next"
          >
            ›
          </button>
        )}
        <div className="splash-slider" role="region" aria-label="Splash slides">
          <div
            className="splash-track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
          {SLIDES.map((slide, index) => {
            const Icon = slide.icon;
            return (
            <div
              key={slide.id}
              className="splash-slide"
              aria-hidden={index !== current}
            >
              <div className="splash-slide-inner">
                <div
                  className={`splash-icon-wrap ${slide.image ? 'splash-icon-wrap--image' : ''}`}
                  style={slide.image ? undefined : { background: `linear-gradient(135deg, ${slide.accent}22, ${slide.accent}11)` }}
                >
                  {slide.image ? (
                    <img src={slide.image} alt="" className="splash-slide-image" />
                  ) : (
                    <Icon style={{ fontSize: 56, color: slide.accent }} />
                  )}
                </div>
                {slide.title ? <h2 className="splash-title">{slide.title}</h2> : null}
                <p className="splash-subtitle">{slide.subtitle}</p>
                <p className="splash-text">{slide.text}</p>
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>

      <div className="splash-footer">
        <div className="splash-dots" role="tablist" aria-label="Slides">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === current}
              aria-label={`Slide ${index + 1}`}
              className={`splash-dot ${index === current ? 'splash-dot-active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>

        <div className="splash-actions">
          {isLast && (
            <button
              type="button"
              className="splash-btn-getstarted btn btn-primary"
              onClick={goNext}
            >
              Get Started <FiArrowRight style={{ marginLeft: 6 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
