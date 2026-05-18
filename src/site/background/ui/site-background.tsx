'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

// ─── Scene config ──────────────────────────────────────────────────────────
const LIGHT_SPOTS = [
  { id: 'gold', color: 'rgba(255, 170, 0, 0.17)', degree: 0, size: '46vmax' },
  { id: 'green', color: 'rgba(85, 255, 85, 0.15)', degree: 120, size: '42vmax' },
  { id: 'purple', color: 'rgba(124, 58, 237, 0.17)', degree: 240, size: '50vmax' },
] as const;

// ─── Tunable constants ─────────────────────────────────────────────────────
const ORBIT_RADIUS_RATIO = 0.42; // fraction of shorter viewport side
const MIN_ORBIT_RADIUS_PX = 180;
const ORBIT_LAYER_OPACITY = 0.86;
const AUTO_ROTATION_DEG_SEC = 8; // base auto-spin speed (deg/s)
const SCROLL_ROT_DEG_VIEWPORT = 30; // extra rotation per viewport height scrolled
const SCROLL_LERP_SEC = 7.4; // scroll-rotation catch-up rate
const SCROLL_TO_FORCE = 0.1; // scroll velocity → angular force scale
const FORCE_BLEND = 0.6; // EMA blend weight for user-force
const FORCE_DAMPING_SEC = 6.2; // user-force exponential decay rate
const MAX_FORCE_DEG_SEC = 260; // clamp on user-force magnitude
const VELOCITY_LERP_SEC = 8.8; // angular-velocity smoothing rate
const MAX_FRAME_DT = 0.05; // cap delta-time to survive tab-switch lag

// ─── Pure helpers (no closures over component state) ───────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const readScrollTop = () =>
  Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop);

const calcOrbitRadius = (w: number, h: number) =>
  Math.max(MIN_ORBIT_RADIUS_PX, Math.min(Math.max(1, w), Math.max(1, h)) * ORBIT_RADIUS_RATIO);

const scrollToRotationTarget = (scrollTop: number) =>
  (scrollTop / Math.max(window.innerHeight, 1)) * SCROLL_ROT_DEG_VIEWPORT;

// ─── Component ─────────────────────────────────────────────────────────────
export default function SiteBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  /**
   * All mutable animation state lives in one object.
   * - Eliminates per-tick ref-dereference overhead of 10+ individual refs.
   * - Keeps related fields in a single heap allocation (better cache locality).
   * - No React re-renders: direct DOM mutation inside rAF is intentional here.
   */
  const st = useRef({
    passiveDeg: 0, // degrees accumulated from auto-spin
    scrollDeg: 0, // current scroll-driven rotation (lerped)
    scrollTarget: 0, // target scroll rotation
    velocity: AUTO_ROTATION_DEG_SEC,
    userForce: 0, // transient boost from scroll momentum
    lastTime: 0, // previous rAF timestamp (ms)
    lastScrollTop: 0,
    lastScrollMs: 0,
    reducedMotion: false,
    needsRadiusSync: false, // deferred resize flag: update CSS var in next tick
  });

  useEffect(() => {
    const state = st.current;
    const ring = ringRef.current;
    const root = rootRef.current;
    if (!ring || !root) return;

    // ── Rendering ─────────────────────────────────────────────────────────
    /** Single DOM write: only update transform, no style object allocation. */
    const applyRot = (deg: number) => {
      ring.style.transform = `translate3d(-50%,-50%,0) rotate(${deg}deg)`;
    };

    const syncOrbitRadius = () => {
      root.style.setProperty(
        '--bg-orbit-radius',
        `${calcOrbitRadius(window.innerWidth, window.innerHeight).toFixed(1)}px`,
      );
    };

    // ── Animation loop ────────────────────────────────────────────────────
    /**
     * Single persistent rAF loop while page is visible and motion is allowed.
     * With auto-rotation there is no "settled" state, so the loop runs every
     * frame. All scroll/resize handlers only mutate state; rendering is
     * centralised here to avoid layout thrashing and redundant paints.
     */
    const tick = (nowMs: number) => {
      if (state.reducedMotion || document.hidden) {
        rafRef.current = 0;
        return;
      }

      // Deferred: update CSS custom property (avoids forced layout in event handlers)
      if (state.needsRadiusSync) {
        syncOrbitRadius();
        state.needsRadiusSync = false;
      }

      const lastMs = state.lastTime || nowMs;
      const dt = clamp((nowMs - lastMs) / 1000, 0, MAX_FRAME_DT);
      state.lastTime = nowMs;

      // Exponential decay of scroll-injected momentum
      state.userForce *= Math.exp(-FORCE_DAMPING_SEC * dt);

      // Smooth velocity toward (base auto-spin + current user force)
      const targetVel = AUTO_ROTATION_DEG_SEC + state.userForce;
      state.velocity += (targetVel - state.velocity) * (1 - Math.exp(-VELOCITY_LERP_SEC * dt));

      state.passiveDeg += state.velocity * dt;

      // Lerp scroll rotation toward target
      state.scrollDeg +=
        (state.scrollTarget - state.scrollDeg) * (1 - Math.exp(-SCROLL_LERP_SEC * dt));

      // Single style write per frame — no object allocation
      applyRot((state.passiveDeg + state.scrollDeg) % 360);

      rafRef.current = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafRef.current) return;
      state.lastTime = 0; // force dt=0 on first tick to avoid jump
      rafRef.current = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      state.lastTime = 0;
    };

    // ── Scroll ────────────────────────────────────────────────────────────
    /**
     * Scroll handler is now purely a state-mutator.
     * No rAF batching needed: the persistent loop renders every frame anyway.
     * Using performance.now() here so timing is decoupled from rAF timestamps.
     */
    const handleScroll = () => {
      const nowMs = performance.now();
      const scrollTop = readScrollTop();

      // Compute scroll-velocity → angular user force (EMA blend)
      if (state.lastScrollMs) {
        const dtMs = Math.max(1, nowMs - state.lastScrollMs);
        const velForce = ((scrollTop - state.lastScrollTop) / dtMs) * 1000 * SCROLL_TO_FORCE;
        state.userForce = clamp(
          state.userForce * (1 - FORCE_BLEND) + velForce * FORCE_BLEND,
          -MAX_FORCE_DEG_SEC,
          MAX_FORCE_DEG_SEC,
        );
      }
      state.lastScrollTop = scrollTop;
      state.lastScrollMs = nowMs;
      state.scrollTarget = scrollToRotationTarget(scrollTop);

      // Loop may have been stopped (e.g. tab was hidden); restart if needed
      if (!state.reducedMotion && !document.hidden) startLoop();
    };

    // ── Resize ────────────────────────────────────────────────────────────
    /**
     * Only set a flag; the actual CSS var update happens inside the loop.
     * Avoids triggering layout in a resize callback (which itself may be called
     * many times per frame during a resize drag).
     */
    const handleResize = () => {
      state.needsRadiusSync = true;
    };

    // ── Reduced-motion ────────────────────────────────────────────────────
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    state.reducedMotion = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      state.reducedMotion = e.matches;
      if (e.matches) {
        stopLoop();
        state.passiveDeg = 0;
        state.scrollDeg = 0;
        state.scrollTarget = 0;
        state.velocity = 0;
        state.userForce = 0;
        applyRot(0);
      } else if (!document.hidden) {
        startLoop();
      }
    };

    // ── Visibility ────────────────────────────────────────────────────────
    const handleVisibility = () => {
      if (document.hidden) stopLoop();
      else if (!state.reducedMotion) startLoop();
    };

    // ── Init ──────────────────────────────────────────────────────────────
    syncOrbitRadius();

    const initialScroll = readScrollTop();
    state.scrollTarget = scrollToRotationTarget(initialScroll);
    state.scrollDeg = state.scrollTarget; // no lerp on first paint
    state.lastScrollTop = initialScroll;

    applyRot((state.passiveDeg + state.scrollDeg) % 360);

    if (!state.reducedMotion && !document.hidden) startLoop();

    // ── Event wiring ──────────────────────────────────────────────────────
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      stopLoop();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ '--bg-orbit-radius': '320px' } as CSSProperties}
    >
      {/* Base gradient layer */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, var(--theme-bg-gradient-from) 0%, var(--theme-bg-gradient-to) 100%)',
          transition: 'background 0.3s ease',
        }}
      />

      {/* Orbit ring — single GPU layer, only transform changes */}
      <div
        ref={ringRef}
        className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
        style={{ transform: 'translate3d(-50%,-50%,0) rotate(0deg)', willChange: 'transform' }}
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
                transform: 'translate3d(-50%,-50%,0)',
                background: `radial-gradient(circle, ${spot.color} 0%, rgba(0,0,0,0) 72%)`,
                opacity: ORBIT_LAYER_OPACITY,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
