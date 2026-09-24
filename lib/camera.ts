export type Camera = { x: number; y: number; zoom: number };

/** Minimum zoom so the world always fills the viewport on its shortest axis. */
function minZoom(w: number, h: number, worldW: number, worldH: number) {
  // Ensure the world generously covers the viewport with a small buffer for subpixel anti-aliasing
  return Math.max(w / worldW, h / worldH, 0.45) * 1.004;
}

export function clampCamera(
  c: Camera,
  w: number,
  h: number,
  worldW: number,
  worldH: number,
): Camera {
  const zMin = minZoom(w, h, worldW, worldH);
  const zoom = Math.max(zMin, Math.min(1.6, c.zoom));
  const cw = worldW * zoom;
  const ch = worldH * zoom;

  // Extra safety margin ensures the camera never pulls the world map off any edge
  const xMin = Math.min(0, Math.floor(w - cw)) - 2;
  const xMax = 0;
  const yMin = Math.min(0, Math.floor(h - ch)) - 2;
  const yMax = 0;

  return {
    zoom,
    x: Math.max(xMin, Math.min(xMax, c.x)),
    y: Math.max(yMin, Math.min(yMax, c.y)),
  };
}

export function zoomCamera(
  c: Camera,
  zoom: number,
  x: number,
  y: number,
  w: number,
  h: number,
  worldW: number,
  worldH: number,
) {
  const zMin = minZoom(w, h, worldW, worldH);
  const z = Math.max(zMin, Math.min(1.6, zoom));
  const ratio = z / c.zoom;
  return clampCamera(
    { x: x - (x - c.x) * ratio, y: y - (y - c.y) * ratio, zoom: z },
    w,
    h,
    worldW,
    worldH,
  );
}
