'use client';

import { motion, useInView } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

const REVEAL_VIEWPORT_MARGIN = 50;

const revealOffsetByDirection = {
  up: { y: 40, x: 0 },
  down: { y: -40, x: 0 },
  left: { y: 0, x: 40 },
  right: { y: 0, x: -40 },
  none: { y: 0, x: 0 },
} as const;

function isVisibleOnInitialPaint(element: HTMLDivElement) {
  const { top, bottom } = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  return top <= viewportHeight - REVEAL_VIEWPORT_MARGIN && bottom >= REVEAL_VIEWPORT_MARGIN;
}

export default function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.5,
  className = '',
  style = {},
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [skipInitialReveal, setSkipInitialReveal] = useState(false);
  const isInView = useInView(containerRef, {
    once: true,
    margin: `-${REVEAL_VIEWPORT_MARGIN}px`,
  });

  useLayoutEffect(() => {
    const element = containerRef.current;

    if (!element || !isVisibleOnInitialPaint(element)) {
      return;
    }

    setSkipInitialReveal(true);
  }, []);

  const hiddenState = {
    opacity: 0,
    ...revealOffsetByDirection[direction],
  };

  const isRevealed = skipInitialReveal || isInView;

  return (
    <motion.div
      ref={containerRef}
      initial={skipInitialReveal ? false : hiddenState}
      animate={
        isRevealed
          ? {
              opacity: 1,
              y: 0,
              x: 0,
            }
          : hiddenState
      }
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
