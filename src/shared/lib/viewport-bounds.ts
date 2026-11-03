export interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function readViewportBounds(): ViewportBounds {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width || window.innerWidth,
    height: viewport?.height || window.innerHeight,
  };
}

/** Resolve env()/var() through real length properties; custom-property strings may stay unresolved. */
export function readSafeViewportBounds(): ViewportBounds {
  const bounds = readViewportBounds();
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;border:0;' +
    'padding:var(--viewport-top-inset,0px) var(--viewport-right-inset,0px) var(--viewport-bottom-inset,0px) var(--viewport-left-inset,0px)';
  document.body.append(probe);
  try {
    const style = window.getComputedStyle(probe);
    const top = Number.parseFloat(style.paddingTop) || 0;
    const right = Number.parseFloat(style.paddingRight) || 0;
    const bottom = Number.parseFloat(style.paddingBottom) || 0;
    const left = Number.parseFloat(style.paddingLeft) || 0;
    return {
      left: bounds.left + left,
      top: bounds.top + top,
      width: Math.max(0, bounds.width - left - right),
      height: Math.max(0, bounds.height - top - bottom),
    };
  } finally {
    probe.remove();
  }
}

/** Keep anchored controls inside the usable viewport, including its notch and keyboard insets. */
export function anchoredSurfacePosition(
  anchor: { right: number; top: number; bottom: number },
  surface: { width: number; height: number },
  viewport: ViewportBounds,
  gap = 8,
): { left: number; top: number } {
  const left = viewport.left + gap;
  const top = viewport.top + gap;
  const bottom = viewport.top + viewport.height - gap;
  const preferredTop =
    anchor.bottom + surface.height + 4 <= bottom
      ? anchor.bottom + 4
      : anchor.top - surface.height - 4;
  return {
    left: Math.max(
      left,
      Math.min(anchor.right - surface.width, viewport.left + viewport.width - surface.width - gap),
    ),
    top: Math.max(top, Math.min(preferredTop, bottom - surface.height)),
  };
}

export function pointedSurfacePosition(
  point: { x: number; y: number },
  surface: { width: number; height: number },
  viewport: ViewportBounds,
  gap = 8,
): { left: number; top: number } {
  return {
    left: Math.max(
      viewport.left + gap,
      Math.min(point.x, viewport.left + viewport.width - surface.width - gap),
    ),
    top: Math.max(
      viewport.top + gap,
      Math.min(point.y, viewport.top + viewport.height - surface.height - gap),
    ),
  };
}
