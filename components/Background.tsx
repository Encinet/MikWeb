'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

const LIGHT_SPOTS = [
  {
    id: 'gold',
    color: 'rgba(255, 170, 0, 0.17)',
    degree: 0,
    size: '46vmax',
  },
  {
    id: 'green',
    color: 'rgba(85, 255, 85, 0.15)',
    degree: 120,
    size: '42vmax',
  },
  {
    id: 'purple',
    color: 'rgba(124, 58, 237, 0.17)',
    degree: 240,
    size: '50vmax',
  },
] as const;

const ORBIT_RADIUS_SHORT_SIDE_RATIO = 0.42;
const MIN_ORBIT_RADIUS_PX = 180;
const ORBIT_LAYER_OPACITY = 0.86;
const AUTO_ROTATION_BASE_SPEED_DEG_PER_SEC = 5.2;
const SCROLL_FORCE_TO_SPEED_DEG_PER_SEC = 0.06;
const USER_FORCE_BLEND_FACTOR = 0.55;
const USER_FORCE_DAMPING_PER_SEC = 5.4;
const MAX_USER_FORCE_DEG_PER_SEC = 220;
const VELOCITY_RESPONSE_PER_SEC = 7.2;
const MAX_FRAME_DELTA_SECONDS = 0.05;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function calcOrbitRadiusPx(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  return Math.max(
    MIN_ORBIT_RADIUS_PX,
    Math.min(safeWidth, safeHeight) * ORBIT_RADIUS_SHORT_SIDE_RATIO,
  );
}

function readScrollTop() {
  return Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);
}

export default function Background() {
  const backgroundRootRef = useRef<HTMLDivElement>(null);
  const orbitRingRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const scrollFrameIdRef = useRef<number | null>(null);
  const resizeFrameIdRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const rotationDegRef = useRef(0);
  const angularVelocityDegPerSecRef = useRef(AUTO_ROTATION_BASE_SPEED_DEG_PER_SEC);
  const userForceDegPerSecRef = useRef(0);
  const lastFrameTimeMsRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const lastScrollTimeMsRef = useRef<number | null>(null);
  const isReducedMotionRef = useRef(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotionRef.current = motionQuery.matches;

    const renderOrbitRotation = (rotationDeg: number) => {
      if (!orbitRingRef.current) return;
      orbitRingRef.current.style.transform = `translate3d(-50%, -50%, 0) rotate(${rotationDeg}deg)`;
    };

    const updateOrbitRadius = () => {
      if (!backgroundRootRef.current) return;
      const radiusPx = calcOrbitRadiusPx(window.innerWidth, window.innerHeight);
      backgroundRootRef.current.style.setProperty('--bg-orbit-radius', `${radiusPx.toFixed(1)}px`);
    };

    const updateUserForceFromScroll = (scrollTop: number, timestampMs: number) => {
      const previousTimeMs = lastScrollTimeMsRef.current;
      if (previousTimeMs !== null) {
        const deltaTimeMs = Math.max(1, timestampMs - previousTimeMs);
        const deltaScrollPx = scrollTop - lastScrollTopRef.current;
        const scrollVelocityPxPerMs = deltaScrollPx / deltaTimeMs;
        const userForceFromScroll =
          scrollVelocityPxPerMs * 1000 * SCROLL_FORCE_TO_SPEED_DEG_PER_SEC;

        const mixedUserForce =
          userForceDegPerSecRef.current * (1 - USER_FORCE_BLEND_FACTOR) +
          userForceFromScroll * USER_FORCE_BLEND_FACTOR;
        userForceDegPerSecRef.current = clamp(
          mixedUserForce,
          -MAX_USER_FORCE_DEG_PER_SEC,
          MAX_USER_FORCE_DEG_PER_SEC,
        );
      }

      lastScrollTopRef.current = scrollTop;
      lastScrollTimeMsRef.current = timestampMs;
    };

    const animateFrame = (timestampMs: number) => {
      if (isReducedMotionRef.current || document.hidden) {
        animationFrameIdRef.current = null;
        return;
      }

      const lastFrameTimeMs = lastFrameTimeMsRef.current ?? timestampMs;
      const deltaTimeSeconds = clamp(
        (timestampMs - lastFrameTimeMs) / 1000,
        0,
        MAX_FRAME_DELTA_SECONDS,
      );
      lastFrameTimeMsRef.current = timestampMs;

      const userForceDecay = Math.exp(-USER_FORCE_DAMPING_PER_SEC * deltaTimeSeconds);
      userForceDegPerSecRef.current *= userForceDecay;

      const targetVelocityDegPerSec = Math.max(
        0,
        AUTO_ROTATION_BASE_SPEED_DEG_PER_SEC + userForceDegPerSecRef.current,
      );
      const currentVelocityDegPerSec = angularVelocityDegPerSecRef.current;
      const velocityLerpFactor = 1 - Math.exp(-VELOCITY_RESPONSE_PER_SEC * deltaTimeSeconds);
      const nextVelocityDegPerSec =
        currentVelocityDegPerSec +
        (targetVelocityDegPerSec - currentVelocityDegPerSec) * velocityLerpFactor;

      angularVelocityDegPerSecRef.current = nextVelocityDegPerSec;

      const nextRotation = normalizeAngle(
        rotationDegRef.current + nextVelocityDegPerSec * deltaTimeSeconds,
      );
      rotationDegRef.current = nextRotation;
      renderOrbitRotation(nextRotation);

      animationFrameIdRef.current = window.requestAnimationFrame(animateFrame);
    };

    const startAnimationLoop = () => {
      if (animationFrameIdRef.current !== null) return;
      lastFrameTimeMsRef.current = null;
      animationFrameIdRef.current = window.requestAnimationFrame(animateFrame);
    };

    const stopAnimationLoop = () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      lastFrameTimeMsRef.current = null;
    };

    const handleScroll = () => {
      pendingScrollTopRef.current = readScrollTop();
      if (scrollFrameIdRef.current !== null) return;
      scrollFrameIdRef.current = window.requestAnimationFrame((timestampMs) => {
        scrollFrameIdRef.current = null;
        const nextScrollTop = pendingScrollTopRef.current ?? readScrollTop();
        pendingScrollTopRef.current = null;
        updateUserForceFromScroll(nextScrollTop, timestampMs);
        if (!isReducedMotionRef.current && !document.hidden) {
          startAnimationLoop();
        }
      });
    };

    const handleResize = () => {
      if (resizeFrameIdRef.current !== null) return;
      resizeFrameIdRef.current = window.requestAnimationFrame(() => {
        resizeFrameIdRef.current = null;
        updateOrbitRadius();
      });
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      isReducedMotionRef.current = event.matches;
      if (event.matches) {
        stopAnimationLoop();
        userForceDegPerSecRef.current = 0;
        angularVelocityDegPerSecRef.current = AUTO_ROTATION_BASE_SPEED_DEG_PER_SEC;
        rotationDegRef.current = 0;
        renderOrbitRotation(0);
        return;
      }

      updateUserForceFromScroll(readScrollTop(), performance.now());
      if (!document.hidden) {
        startAnimationLoop();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimationLoop();
        return;
      }
      if (!isReducedMotionRef.current) {
        startAnimationLoop();
      }
    };

    updateOrbitRadius();
    updateUserForceFromScroll(readScrollTop(), performance.now());
    const initialRotation = rotationDegRef.current;
    renderOrbitRotation(initialRotation);

    if (!isReducedMotionRef.current && !document.hidden) {
      startAnimationLoop();
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const removeMotionListener =
      typeof motionQuery.addEventListener === 'function'
        ? (() => {
            motionQuery.addEventListener('change', handleMotionChange);
            return () => motionQuery.removeEventListener('change', handleMotionChange);
          })()
        : (() => {
            motionQuery.addListener(handleMotionChange);
            return () => motionQuery.removeListener(handleMotionChange);
          })();

    return () => {
      stopAnimationLoop();
      if (scrollFrameIdRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameIdRef.current);
        scrollFrameIdRef.current = null;
      }
      if (resizeFrameIdRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameIdRef.current);
        resizeFrameIdRef.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeMotionListener();
    };
  }, []);

  return (
    <div
      ref={backgroundRootRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        {
          '--bg-orbit-radius': '320px',
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, var(--theme-bg-gradient-from) 0%, var(--theme-bg-gradient-to) 100%)',
          transition: 'background 0.3s ease',
        }}
      />

      <div
        ref={orbitRingRef}
        className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
        style={{
          transform: 'translate3d(-50%, -50%, 0) rotate(0deg)',
          willChange: 'transform',
        }}
      >
        {LIGHT_SPOTS.map((spot) => (
          <div
            key={spot.id}
            className="absolute left-0 top-0"
            style={{
              transform: `rotate(${spot.degree}deg) translate3d(var(--bg-orbit-radius), 0, 0)`,
              transformOrigin: '0 0',
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: spot.size,
                height: spot.size,
                transform: 'translate3d(-50%, -50%, 0)',
                background: `radial-gradient(circle, ${spot.color} 0%, rgba(0, 0, 0, 0) 72%)`,
                opacity: ORBIT_LAYER_OPACITY,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
