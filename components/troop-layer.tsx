'use client';
import { memo, useEffect, useRef } from 'react';
import { type Game, WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/tower-game';
import type { Camera } from '@/lib/camera';

// One drawing surface instead of hundreds of independently animated DOM images.
export const TroopLayer = memo(function TroopLayer({game, camera, viewport, speech, paused, fogEnabled = true}: {
  game: Game; camera: Camera; viewport: {w:number;h:number}; speech:boolean; paused:boolean; fogEnabled?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef({game,camera,viewport,speech,paused,fogEnabled,at:0,interval:50,previous:new Map<number,{x:number;y:number}>()});
  useEffect(()=> {
    const old=frame.current;
    if (old.game === game) {
      frame.current={...old,camera,viewport,speech,paused,fogEnabled};
      return;
    }
    const now=performance.now();
    frame.current={game,camera,viewport,speech,paused,fogEnabled,at:now,interval:Math.max(16,Math.min(150,now-old.at)),
      previous: game.age>=old.game.age && game.age-old.game.age<=.25
        ? new Map(old.game.troops.map(p=>[p.id,{x:p.x,y:p.y}])) : new Map()};
  },[game,camera,viewport,speech,paused,fogEnabled]);
  useEffect(()=> {
    let id=0,disposed=false;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const source=new Image();
    const sprites:Record<string,HTMLCanvasElement>={};
    source.onload=()=> {
      for(const [team,filter] of Object.entries({you:'none',red:'hue-rotate(140deg) saturate(.9)',purple:'hue-rotate(45deg) saturate(.8)',green:'hue-rotate(-85deg) saturate(.9)'})) {
        const tile=document.createElement('canvas');tile.width=96;tile.height=120;
        const ctx=tile.getContext('2d')!;ctx.filter=filter;
        const scale=Math.min(96/source.width,120/source.height);
        ctx.drawImage(source,(96-source.width*scale)/2,(120-source.height*scale)/2,source.width*scale,source.height*scale);
        sprites[team]=tile;
      }
    };
    source.src='/assets/soldier.png';
    const draw=(now:number)=> {
      if(disposed)return;
      const el=canvas.current, f=frame.current;
      if(el) {
        const ratio=Math.min(window.devicePixelRatio||1,1.5), zoom=f.camera.zoom;
        const width=Math.max(1,Math.round(f.viewport.w*ratio)),height=Math.max(1,Math.round(f.viewport.h*ratio));
        if(el.width!==width||el.height!==height){el.width=width;el.height=height;}
        const ctx=el.getContext('2d');
        if(ctx){
          ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,f.viewport.w,f.viewport.h);
          const blend=f.paused?1:Math.min(1,(now-f.at)/f.interval);
          const motion=f.paused?f.game.age:now/1000;
          for(const p of f.game.troops){
            if(p.delay>0)continue;
            if(f.fogEnabled && p.team !== 'you') {
              let bestDist = Infinity; // distance to nearest vision source (0 = inside)
              const WORLD_ASPECT = WORLD_HEIGHT / WORLD_WIDTH;
              // Check towers
              for(const t of f.game.towers) {
                if(t.team === 'you') {
                  const r = t.home ? 24 : 17.5;
                  const dx = t.x - p.x;
                  const dy = (t.y - p.y) * WORLD_ASPECT;
                  const dist = Math.hypot(dx, dy);
                  const margin = dist - r; // negative = inside vision
                  if(margin < bestDist) bestDist = margin;
                }
              }
              // Check allied troops
              if(bestDist > 0) {
                for(const ally of f.game.troops) {
                  if(ally.team === 'you') {
                    const r = ally.scoutUntil ? 23 : 10;
                    const dx = ally.x - p.x;
                    const dy = (ally.y - p.y) * WORLD_ASPECT;
                    const dist = Math.hypot(dx, dy);
                    const margin = dist - r;
                    if(margin < bestDist) bestDist = margin;
                  }
                }
              }
              if(bestDist > 2) continue; // fully in fog, skip
              // Smooth emergence: fades in over 6 world units across the fog boundary
              const fogAlpha = Math.max(0, Math.min(1, (-bestDist + 2) / 6));
              if(fogAlpha <= 0.02) continue;
              ctx.globalAlpha = fogAlpha;
            }
            const old=f.previous.get(p.id)??p;
            const x=(old.x+(p.x-old.x)*blend)/100*WORLD_WIDTH*zoom+f.camera.x;
            const y=(old.y+(p.y-old.y)*blend)/100*WORLD_HEIGHT*zoom+f.camera.y;
            if(x < -100 || y < -100 || x>f.viewport.w+100 || y>f.viewport.h+100){ctx.globalAlpha=1;continue;}
            ctx.save();ctx.translate(x,y);ctx.scale(zoom,zoom);
            ctx.fillStyle='#3b572d38';ctx.beginPath();ctx.ellipse(0,0,8,3,0,0,Math.PI*2);ctx.fill();
            if(p.cargo){
              ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText(p.haul?.gold?'💰':'📦',0,-3);
              ctx.font='bold 10px Arial';ctx.fillStyle='#fff';ctx.strokeStyle='#805025';ctx.lineWidth=2.5;
              const text=p.haul?String(Math.floor(p.haul.gold+p.haul.resources)):`+${p.strength}`;
              ctx.strokeText(text,0,-22);ctx.fillText(text,0,-22);
            }else if(sprites[p.team]){
              const isScoutIdle = !!(p.scoutUntil && p.progress >= 0.98);
              const bob = reducedMotion.matches
                ? 0
                : isScoutIdle
                  ? Math.sin(motion * 3 + p.id) * 0.4
                  : Math.sin(motion * 26 + p.id) * 1.5;
              const rot = reducedMotion.matches
                ? 0
                : isScoutIdle
                  ? 0
                  : Math.sin(motion * 26 + p.id) * 0.08;

              // Smooth fade-out when scout completes reconnaissance
              if (p.arrivedAt && f.game.age - p.arrivedAt > 5.5) {
                const fade = Math.max(0, Math.min(1, (7 - (f.game.age - p.arrivedAt)) / 1.5));
                ctx.globalAlpha *= fade;
              }

              ctx.save();
              ctx.translate(0, -14 + bob);
              const dx = (p.x - (old.x ?? p.x)) !== 0
                ? (p.x - old.x)
                : ((p.waypoint?.x ?? f.game.towers[p.to]?.x ?? p.sx) - p.sx);
              if (dx < 0) ctx.scale(-1, 1);
              ctx.rotate(rot);
              ctx.drawImage(sprites[p.team], -14, -18, 28, 36);
              ctx.restore();
              if (p.scoutUntil || p.elite) {
                ctx.fillStyle = '#fff1a2';
                ctx.font = 'bold 11px Arial';
                ctx.fillText(p.elite ? '★' : '◉', -5, -28);
              }
            }
            if(f.speech&&!f.game.hideMessages&&p.speech&&p.progress>.07&&p.progress<.8){
              ctx.font='12px Arial';ctx.textAlign='center';const w=ctx.measureText(p.speech).width+16;
              ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(-w/2,-68,w,23,7);ctx.fill();
              ctx.fillStyle='#3b4937';ctx.fillText(p.speech,0,-52);
            }
            ctx.restore();
            ctx.globalAlpha=1; // always reset after each troop
          }

          // Draw active field skirmishes (crossed swords ⚔️ + spark burst)
          for (const clash of f.game.clashes ?? []) {
            const age = f.game.age - clash.at;
            if (age < 0 || age > 0.45) continue;
            const cx = (clash.x / 100) * WORLD_WIDTH * zoom + f.camera.x;
            const cy = (clash.y / 100) * WORLD_HEIGHT * zoom + f.camera.y;
            if (cx < -50 || cy < -50 || cx > f.viewport.w + 50 || cy > f.viewport.h + 50) continue;

            ctx.save();
            ctx.translate(cx, cy - 20 * zoom);
            ctx.scale(zoom, zoom);

            const pulse = Math.sin((motion * 20 + clash.id) % Math.PI);
            const alpha = Math.max(0, 1 - age / 0.45);
            ctx.globalAlpha = alpha;

            // Flash glow
            ctx.fillStyle = 'rgba(255, 238, 140, 0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, 8 + pulse * 4, 0, Math.PI * 2);
            ctx.fill();

            // Crossed swords icon ⚔️
            ctx.font = 'bold 15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#eab308';
            ctx.shadowBlur = 6;
            ctx.fillText('⚔️', 0, 0);

            // Flying sparks
            ctx.fillStyle = '#fff494';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 4;
            for (let s = 0; s < 4; s++) {
              const ang = (s * Math.PI) / 2 + motion * 9 + clash.id;
              const dist = 9 + pulse * 7;
              ctx.beginPath();
              ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }
      }
      id=requestAnimationFrame(draw);
    };
    id=requestAnimationFrame(draw);
    return()=>{disposed=true;cancelAnimationFrame(id);source.onload=null;};
  },[]);
  return <canvas ref={canvas} className="troop-canvas" aria-hidden="true"/>;
});
