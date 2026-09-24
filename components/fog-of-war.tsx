'use client';
import { useEffect, useRef, useCallback } from 'react';
import type { Tower, Troop } from '@/lib/tower-game';

interface FogOfWarProps {
  towers: Tower[];
  troops: Troop[];
  width: number;
  height: number;
  theme?: string;
  enabled?: boolean;
  gameAge?: number;
}

// Crisp memory mask resolution
const MEM_W = 1200;
const MEM_H = 800;

export function FogOfWar({
  towers,
  troops,
  width,
  height,
  theme = 'dark-green',
  enabled = true,
  gameAge = 0,
}: FogOfWarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const memoryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastAgeRef = useRef<number>(gameAge);
  const isResetRef = useRef<boolean>(false);

  // ─── Theme Palettes: deep, rich, atmospheric without polka-dot circles ────
  const palette = (() => {
    switch (theme) {
      case 'night':
        return {
          fog: 'rgba(5, 10, 22, 0.97)',
          mist: 'rgba(8, 16, 36, 0.45)',
          fogGradientEnd: 'rgba(2, 6, 16, 0.98)',
        };
      case 'bonus-night':
        return {
          fog: 'rgba(4, 9, 26, 0.97)',
          mist: 'rgba(8, 18, 48, 0.45)',
          fogGradientEnd: 'rgba(2, 5, 18, 0.98)',
        };
      case 'autumn':
        return {
          fog: 'rgba(32, 18, 8, 0.96)',
          mist: 'rgba(44, 26, 12, 0.44)',
          fogGradientEnd: 'rgba(24, 12, 4, 0.98)',
        };
      case 'snow':
      case 'bonus-snow':
        return {
          fog: 'rgba(24, 38, 54, 0.95)',
          mist: 'rgba(38, 58, 80, 0.42)',
          fogGradientEnd: 'rgba(16, 28, 42, 0.98)',
        };
      case 'classic':
        return {
          fog: 'rgba(20, 32, 12, 0.95)',
          mist: 'rgba(28, 42, 18, 0.40)',
          fogGradientEnd: 'rgba(14, 24, 8, 0.97)',
        };
      case 'dark-green':
      default:
        return {
          fog: 'rgba(8, 20, 12, 0.96)',
          mist: 'rgba(12, 28, 18, 0.44)',
          fogGradientEnd: 'rgba(5, 14, 8, 0.98)',
        };
    }
  })();

  // ─── Collect Vision Sources (Towers & Troops) ──────────────────────────────
  const buildSources = useCallback(() => {
    const src: { x: number; y: number; r: number }[] = [];
    for (const t of towers) {
      if (t.team === 'you') {
        src.push({
          x: (t.x / 100) * width,
          y: (t.y / 100) * height,
          r: t.home ? width * 0.24 : width * 0.175,
        });
      }
    }
    for (const p of troops) {
      if (p.team === 'you') {
        src.push({
          x: (p.x / 100) * width,
          y: (p.y / 100) * height,
          r: p.scoutUntil ? width * 0.23 : width * 0.10,
        });
      }
    }
    return src;
  }, [towers, troops, width, height]);

  // ─── Carve Smooth Organic Vision Cloud Cutout (No hard circles) ────────────
  const carveVision = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    sx = 1,
    sy = 1,
  ) => {
    const px = cx * sx;
    const py = cy * sy;
    const pr = r * sx;

    // Smooth feathered radial mask — seamless gradient with zero visible hard edges
    const grad = ctx.createRadialGradient(
      px,
      py,
      pr * 0.60,
      px,
      py,
      pr * 0.98,
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  };

  // ─── Ensure Memory Canvas Is Initialized Cleanly ───────────────────────────
  const getMemoryCanvas = useCallback(() => {
    let mem = memoryCanvasRef.current;
    if (!mem) {
      mem = document.createElement('canvas');
      mem.width = MEM_W;
      mem.height = MEM_H;
      const mctx = mem.getContext('2d');
      if (mctx) {
        mctx.fillStyle = '#000000';
        mctx.fillRect(0, 0, MEM_W, MEM_H);
      }
      memoryCanvasRef.current = mem;
    }
    return mem;
  }, []);

  // ─── Render Pass ──────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const memCanvas = getMemoryCanvas();
    const memCtx = memCanvas.getContext('2d');
    if (!memCtx) return;

    const sources = buildSources();

    // 1. Update persistent exploration mask on offscreen canvas
    memCtx.save();
    memCtx.globalCompositeOperation = 'destination-out';
    const msx = MEM_W / width;
    const msy = MEM_H / height;
    for (const s of sources) {
      carveVision(memCtx, s.x, s.y, s.r, msx, msy);
    }
    memCtx.restore();

    // 2. Render Fog onto main screen canvas (1:1 with terrain, no offset)
    ctx.clearRect(0, 0, width, height);

    // Step A: Draw unexplored shroud (opaque fog where memCanvas is black)
    ctx.save();
    ctx.drawImage(memCanvas, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-in';

    // Rich atmospheric fog gradient — smooth lighting without any repeating circles
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, palette.fog);
    bgGrad.addColorStop(1, palette.fogGradientEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Step B: Explored territory mist (soft veil over previously scouted areas)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = palette.mist;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Step C: Carve live active vision holes (real-time vision)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const s of sources) {
      carveVision(ctx, s.x, s.y, s.r, 1, 1);
    }
    ctx.restore();
  }, [buildSources, getMemoryCanvas, height, palette, width]);

  // ─── Detect New Game Reset (No more flickering / winking at start) ──────────
  useEffect(() => {
    const isNewGame = gameAge < 0.15 && (lastAgeRef.current > 1 || !isResetRef.current);
    if (isNewGame && memoryCanvasRef.current) {
      const mctx = memoryCanvasRef.current.getContext('2d');
      if (mctx) {
        mctx.fillStyle = '#000000';
        mctx.fillRect(0, 0, MEM_W, MEM_H);
      }
      isResetRef.current = true;
      // Immediately render frame 1 synchronously so there is zero black flash
      render();
    }
    if (gameAge > 0.5) {
      isResetRef.current = false;
    }
    lastAgeRef.current = gameAge;
  }, [gameAge, render]);

  // ─── Optimized Render Loop ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // Render immediately on mount / state change
    render();

    let running = true;
    let lastRenderTime = 0;
    const loop = (time: number) => {
      if (!running) return;
      // Throttle render to ~30-40 FPS for ultra-low CPU load while remaining butter smooth
      if (time - lastRenderTime >= 28) {
        lastRenderTime = time;
        render();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, render]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="fog-of-war-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 150,
        // Silky smooth edge feathering with hardware acceleration
        filter: 'blur(7px)',
        transform: 'translateZ(0)',
        transition: 'opacity 0.4s ease',
      }}
    />
  );
}
