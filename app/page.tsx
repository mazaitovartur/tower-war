'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TroopLayer } from '@/components/troop-layer';
import { OwnershipFilters } from '@/components/ownership-filters';
import { GameHelp } from '@/components/game-help';
import { DevConsole } from '@/components/dev-console';
import { FogOfWar } from '@/components/fog-of-war';
import { MultiplayerLobby } from '@/components/multiplayer-lobby';
import type { MultiplayerSession, NetworkMessage } from '@/lib/multiplayer';
import { initAudio, playBgm, playBeep, playSelect, playError, playShoot, playCapture, playVictory, playDefeat, playDecreeSuccess, playPenalty, playClash, restoreBgm, setSfxVolume, setBgmVolume } from '@/lib/audio';
import {
  Settings,
  Eye,
  ArrowUp,
  Coins,
  Trees,
  Crosshair,
  Plus,
  Minus,
  Repeat2,
  Crown,
  Send,
  Sparkles,
  LockKeyhole,
  Check,
  ChevronRight,
  Flag,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
  Terminal,
  X,
  Users,
  User,
  Pickaxe,
  Shield,
  BarChart3,
  HelpCircle,
  Map,
  Trophy,
  ScrollText,
  Swords,
  Zap,
} from 'lucide-react';
import { clampCamera, zoomCamera, type Camera } from '@/lib/camera';
import {
  advanceReplay,
  seekReplay,
  type Recording,
  type ReplayState,
} from '@/lib/replays';
import { validDecree, describeDecree } from '@/lib/decrees';
import { validDebuff } from '@/lib/magic';
import {
  DURATION,
  DEVELOPMENT_SECONDS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TEAM_IDS,
  KIND_LABEL,
  income,
  workers,
  cannon,
  cannonCost,
  cannonHeight,
  upgradeCannon,
  production,
  capacity,
  groupSize,
  upgradeCost,
  teamIncome,
  economicLeader,
  setAutomation,
  TEAMS,
  initialGame,
  sendArmy,
  tick,
  upgrade,
  playerName,
  type Team,
  messageOpportunity,
  sendMessage,
  startSpell,
  readySpell,
  sendScout,
  hasCannon,
  specialize,
  specialties,
  SPECIALTIES,
  configureAutomation,
  forceApplyDecree,
  forceApplyDecreeWithLog,
  findRoute,
  type Tower,
  type Game,
} from '@/lib/tower-game';

export type MapTheme = 'dark-green' | 'autumn' | 'night' | 'snow' | 'bonus-night' | 'bonus-snow';

export const THEME_OPTIONS: { id: MapTheme; label: string; bg: string }[] = [
  { id: 'night',       label: 'Лунная ночь (тактика)',            bg: '/assets/night.jpeg' },
  { id: 'dark-green',  label: 'Тёмный лес (изумрудный)',         bg: '/assets/dark-green.jpeg' },
  { id: 'autumn',      label: 'Золотая осень (янтарь)',           bg: '/assets/autumn.jpeg' },
  { id: 'snow',        label: 'Снежная пустошь',                  bg: '/assets/snow.jpeg' },
  { id: 'bonus-night', label: '🌟 Мистическая ночь (бонус)',      bg: '/assets/bonus-night.jpeg' },
  { id: 'bonus-snow',  label: '🌟 Зимняя сказка (бонус)',         bg: '/assets/bonus-snow.jpeg' },
];

export default function Home() {
  const [mapTheme, setMapTheme] = useState<MapTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fow_theme') as string | null;
      // Migrate old theme ids or default to night
      if (saved === 'classic' || saved === 'emerald' || saved === 'dark-green') return 'night';
      if (saved && THEME_OPTIONS.find((t) => t.id === saved)) return saved as MapTheme;
    }
    return 'night';
  });
  const [fogEnabled, setFogEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fow_enabled') !== 'false';
    }
    return true;
  });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1.0 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const field = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    camera: Camera;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const replayState = useRef<ReplayState | null>(null);
  const replayCarry = useRef(0);
  const savedLive = useRef<{
    game: ReturnType<typeof initialGame>;
    started: boolean;
  } | null>(null);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState('');
  const [autoCamera, setAutoCamera] = useState(true);
  const replayLoad = useRef<AbortController | null>(null);
  const [routeMode, setRouteMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [debuffsEnabled, setDebuffsEnabled] = useState(false);
  const [scoutMode, setScoutMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [typingDeadline, setTypingDeadline] = useState(0);
  const [typingSeconds, setTypingSeconds] = useState(20);
  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<'local' | 'mistral' | 'loading'>(
    'loading',
  );
  const [promptMessage, setPromptMessage] = useState('');
  const [promptIsError, setPromptIsError] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const [game, setGame] = useState(initialGame);
  const [nickname, setNickname] = useState('Командир');
  const [showNickModal, setShowNickModal] = useState(false);
  const [draftNick, setDraftNick] = useState('Командир');
  const [mpSession, setMpSession] = useState<MultiplayerSession | null>(null);
  const [showMpLobby, setShowMpLobby] = useState(false);
  const [initialRoomCode, setInitialRoomCode] = useState<string | undefined>(undefined);
  const [myTeam, setMyTeam] = useState<Team>('you');
  const [isMpHost, setIsMpHost] = useState(false);
  const mpSessionRef = useRef<MultiplayerSession | null>(null);
  mpSessionRef.current = mpSession;
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tower-player-name');
      if (saved && saved.trim()) {
        const cleanSaved = saved.trim();
        setNickname(cleanSaved);
        setDraftNick(cleanSaved);
        setGame((g) => ({
          ...g,
          players: { ...(g.players ?? {}), you: cleanSaved },
        }));
      }
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room && room.trim()) {
        setInitialRoomCode(room.trim().toUpperCase());
        setShowMpLobby(true);
      }
    } catch {}
  }, []);
  const [selected, setSelected] = useState<number | null>(0);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fraction, setFraction] = useState(0.5);
  const [speech, setSpeech] = useState(true);
  const [help, setHelp] = useState(false);
  const [sfxVol, setSfxVol] = useState(0.5);
  const [bgmVol, setBgmVol] = useState(0.3);
  const [devOpen, setDevOpen] = useState(false);
  const [exploredTowers, setExploredTowers] = useState<Set<number>>(() => new Set([0]));

  const activeVisionTowers = useMemo(() => {
    if (!fogEnabled) {
      return new Set(game.towers.map((t) => t.id));
    }
    const inVision = new Set<number>();
    const sources: { x: number; y: number; r: number }[] = [];
    for (const t of game.towers) {
      if (t.team === myTeam) {
        const r = t.home ? WORLD_WIDTH * 0.24 : WORLD_WIDTH * 0.175;
        sources.push({ x: (t.x / 100) * WORLD_WIDTH, y: (t.y / 100) * WORLD_HEIGHT, r });
      }
    }
    for (const p of game.troops) {
      if (p.team === myTeam) {
        const r = p.scoutUntil ? WORLD_WIDTH * 0.23 : WORLD_WIDTH * 0.1;
        sources.push({ x: (p.x / 100) * WORLD_WIDTH, y: (p.y / 100) * WORLD_HEIGHT, r });
      }
    }
    for (const t of game.towers) {
      const tx = (t.x / 100) * WORLD_WIDTH;
      const ty = (t.y / 100) * WORLD_HEIGHT;
      for (const s of sources) {
        if (Math.hypot(tx - s.x, ty - s.y) <= s.r + 35) {
          inVision.add(t.id);
          break;
        }
      }
    }
    return inVision;
  }, [game.towers, game.troops, fogEnabled]);

  useEffect(() => {
    if (!fogEnabled) return;
    if (game.age < 0.25) {
      setExploredTowers(new Set(activeVisionTowers));
    } else if (activeVisionTowers.size > 0) {
      setExploredTowers((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const id of activeVisionTowers) {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [activeVisionTowers, game.age, fogEnabled]);

  useEffect(() => {
    try {
      const s = localStorage.getItem('sfxVolume');
      if (s !== null) setSfxVol(parseFloat(s));
      const b = localStorage.getItem('bgmVolume');
      if (b !== null) setBgmVol(parseFloat(b));
    } catch {}

    const unlock = () => {
      initAudio();
      playBgm();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const handleDevKeys = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё' || e.key === 'F2') {
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT' && !target.classList.contains('dev-console-input')) {
          return;
        }
        e.preventDefault();
        setDevOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleDevKeys);
    return () => window.removeEventListener('keydown', handleDevKeys);
  }, []);

  useEffect(() => {
    if (!started || paused || help) return;
    let handle = 0;
    let last = performance.now();
    let carry = 0;
    const update = (now: number) => {
      // Ignore tab suspension; bound catch-up work so a slow frame cannot snowball.
      carry += document.hidden ? 0 : Math.min((now-last)/1000, .15);
      last = now;
      const steps = Math.min(3, Math.floor((carry+1e-8)/.05));
      if (steps > 0) {
        carry -= steps*.05;
        if (recording && replayState.current) {
          replayCarry.current += steps*.05*replaySpeed;
          const replayStep = Math.floor((replayCarry.current+1e-8)/.05)*.05;
          if (replayStep > 0) {
            replayCarry.current -= replayStep;
            const next = advanceReplay(replayState.current,replayStep,recording);
            replayState.current=next;
            setGame(next.game);
            if(next.game.age>=recording.duration)setPaused(true);
          }
        } else if (!mpSessionRef.current || isMpHost) {
          let nextState: Game | null = null;
          setGame((g) => {
            let next = g;
            for (let i = 0; i < steps; i++) next = tick(next, 0.05);
            nextState = next;
            return next;
          });
          if (isMpHost && mpSessionRef.current && nextState) {
            mpSessionRef.current.broadcastGameSync(nextState);
          }
        }
      }
      handle = requestAnimationFrame(update);
    };
    handle = requestAnimationFrame(update);
    return () => cancelAnimationFrame(handle);
  }, [started, paused, help, recording, replaySpeed, isMpHost]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setSelected(null);
        setSelectAllMode(false);
        setRouteMode(true);
        setHelp(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        setSelectAllMode((prev) => !prev);
        playSelect();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const gameRef = useRef(game);
  gameRef.current = game;
  const activeRef = useRef(false);
  activeRef.current = started && !paused && !help && !game.result && !recording;
  useEffect(() => {
    fetch('/api/decree')
      .then(async (r) => (await r.json()) as { provider?: string })
      .then((d) =>
        setProvider(d.provider === 'mistral' ? 'mistral' : 'local'),
      )
      .catch(() => setProvider('local'));
    return () => {
      pending.current?.abort();
      replayLoad.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (pending.current) {
      pending.current.abort();
      pending.current = null;
      setBusy(false);
      setPromptMessage('Право или состояние боя изменилось. Приказ отменён.');
      setGame((g) =>
        g.spell && !g.spell.patch ? { ...g, spell: undefined } : g,
      );
    }
  }, [game.authorityEpoch, paused, help, started]);
  const messageMode = !recording && messageOpportunity(game);
  useEffect(() => {
    setDraft('');
    setTypingDeadline(0);
    setTypingSeconds(20);
  }, [messageMode]);
  useEffect(() => {
    if (!typingDeadline) return;
    const update = () => {
      const left = Math.max(0, (typingDeadline - Date.now()) / 1000);
      setTypingSeconds(left);
      if (left === 0) {
        setTypingDeadline(0);
        setDraft('');
        setPromptMessage('Время вышло! Наберите новый приказ за 10 секунд.');
      }
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [typingDeadline]);
  useEffect(() => {
    setTypingDeadline(0);
    setTypingSeconds(20);
    setDraft('');
  }, [game.authorityEpoch, started]);
  
  const prevCaptures = useRef(game.captures || 0);
  const prevShots = useRef(game.shots?.length || 0);
  const prevResult = useRef<string | null>(null);
  const prevDecreeCount = useRef(game.decreeLog?.length || 0);
  const prevNotice = useRef(game.notice);
  const prevSpellRoll = useRef<string | undefined>(undefined);
  const prevCursesCount = useRef(game.curses?.length || 0);
  const prevClashCount = useRef(0);

  useEffect(() => {
    if (game.captures > prevCaptures.current) {
      playCapture();
    }
    prevCaptures.current = game.captures;

    if (game.shots && game.shots.length > prevShots.current) {
      playShoot();
    }
    prevShots.current = game.shots?.length || 0;

    if (game.decreeLog && game.decreeLog.length > prevDecreeCount.current) {
      const latest = game.decreeLog[0];
      if (latest && latest.team === 'you') {
        playDecreeSuccess();
      } else {
        playCapture();
      }
    }
    prevDecreeCount.current = game.decreeLog?.length || 0;

    if (game.notice !== prevNotice.current) {
      if (game.notice?.includes('сорвано') || game.notice?.includes('не применён') || game.notice?.includes('истекло')) {
        playError();
      }
      prevNotice.current = game.notice;
    }

    if (game.spell?.roll === 'debuff' && prevSpellRoll.current !== 'debuff') {
      playPenalty();
    }
    prevSpellRoll.current = game.spell?.roll;

    if (game.curses && game.curses.length > prevCursesCount.current) {
      playPenalty();
    }
    prevCursesCount.current = game.curses?.length || 0;

    if (game.clashes && game.clashes.length > 0 && game.clashes.length !== prevClashCount.current) {
      playClash();
    }
    prevClashCount.current = game.clashes?.length || 0;

    if (game.result && !prevResult.current) {
      if (game.result === 'you') {
        playVictory();
      } else {
        playDefeat();
      }
    }
    prevResult.current = game.result || null;
  }, [game.captures, game.shots, game.result, game.decreeLog, game.notice, game.spell?.roll, game.curses, game.clashes]);
  const blockPaste = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setPromptMessage('Приказ нужно набрать вручную. Вставка отключена.');
  };
  function focusPoint(x: number, y: number, zoom = cameraRef.current.zoom) {
    const v = viewportRef.current;
    setCamera(
      clampCamera(
        {
          x: v.w / 2 - (x / 100) * WORLD_WIDTH * zoom,
          y: v.h * 0.46 - (y / 100) * WORLD_HEIGHT * zoom,
          zoom,
        },
        v.w,
        v.h,
        WORLD_WIDTH,
        WORLD_HEIGHT,
      ),
    );
  }
  function focusHome() {
    const home =
      gameRef.current.towers.find((t) => t.team === 'you' && t.home) ??
      gameRef.current.towers[0];
    focusPoint(home.x, home.y, 1.0);
  }
  function changeZoom(multiplier: number) {
    const v = viewportRef.current;
    setCamera((c) =>
      zoomCamera(
        c,
        c.zoom * multiplier,
        v.w / 2,
        v.h / 2,
        v.w,
        v.h,
        WORLD_WIDTH,
        WORLD_HEIGHT,
      ),
    );
  }
  useEffect(() => {
    if (!started || !field.current) return;
    const el = field.current;
    const resize = () => {
      const v = { w: el.clientWidth, h: el.clientHeight };
      viewportRef.current = v;
      setViewport(v);
      if (!initialized.current) {
        initialized.current = true;
        focusHome();
      } else
        setCamera((c) => clampCamera(c, v.w, v.h, WORLD_WIDTH, WORLD_HEIGHT));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect(),
        v = viewportRef.current;
      setCamera((c) =>
        zoomCamera(
          c,
          c.zoom * Math.exp(-e.deltaY * 0.001),
          e.clientX - rect.left,
          e.clientY - rect.top,
          v.w,
          v.h,
          WORLD_WIDTH,
          WORLD_HEIGHT,
        ),
      );
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', wheel);
    };
  }, [started]);
  function panStart(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.button !== 1) return;
    suppressClick.current = false;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      camera: cameraRef.current,
      moved: false,
    };
  }
  function panMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    suppressClick.current = true;
    if (!e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.setPointerCapture(e.pointerId);
    const v = viewportRef.current;
    setCamera(
      clampCamera(
        { ...d.camera, x: d.camera.x + dx, y: d.camera.y + dy },
        v.w,
        v.h,
        WORLD_WIDTH,
        WORLD_HEIGHT,
      ),
    );
  }
  function panEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null;
  }
  const source = game.towers.find((t) => t.id === selected && t.team === myTeam);
  const developing = game.age < DEVELOPMENT_SECONDS;
  const developmentLeft = Math.max(
    0,
    Math.ceil(DEVELOPMENT_SECONDS - game.age),
  );
  const money = game.wallets[myTeam] ?? game.wallets.you;
  const rates = teamIncome(game, myTeam);
  const totalEarned = TEAM_IDS.reduce((n, t) => n + game.wallets[t].earned, 0);
  const currentLeader = economicLeader(game);
  const cost = source ? upgradeCost(source) : null;
  const gunCost = source ? cannonCost(source) : null;
  const auto = game.automation.find((a) => a.from === source?.id);
  const remaining = Math.max(0, Math.ceil(DURATION - game.elapsed));
  const yours = game.towers.filter((t) => t.team === myTeam);
  const chapter = recording
    ? recording.chapters.filter((c) => c.at <= game.age).at(-1)
    : undefined;
  const recordedTyping = recording?.typing.find(
    (t) => t.start <= game.age && t.end > game.age,
  );
  useEffect(() => {
    if (recording && chapter && autoCamera)
      focusPoint(
        chapter.x,
        chapter.y,
        Math.min(
          chapter.zoom,
          viewportRef.current.w < 600 ? 0.5 : chapter.zoom,
        ),
      );
  }, [recording, chapter?.at, autoCamera]);
  function seekRecording(time: number) {
    if (!recording) return;
    replayCarry.current = 0;
    const next = seekReplay(recording, time);
    replayState.current = next;
    setGame(next.game);
  }
  function leaveRecording() {
    const saved = savedLive.current;
    setRecording(null);
    replayState.current = null;
    setGame(saved?.game ?? initialGame());
    setStarted(saved?.started ?? false);
    setPaused(!!saved?.started);
    setShowSettings(false);
    setSelected(null);
    savedLive.current = null;
  }
  const settingsPanel = (
    <div className="settings-backdrop" onClick={() => setShowSettings(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <b>Настройки</b>
          <button
            className="settings-close-btn"
            aria-label="Закрыть"
            onClick={() => setShowSettings(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="settings-group">
          <label className="settings-slider-label">
            <div className="slider-header">
              <span>Тема карты</span>
              <b>{THEME_OPTIONS.find((t) => t.id === mapTheme)?.label.split(' ')[0]}</b>
            </div>
            <select
              value={mapTheme}
              onChange={(e) => {
                const next = e.target.value as MapTheme;
                setMapTheme(next);
                try {
                  localStorage.setItem('fow_theme', next);
                } catch {}
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '8px',
                background: '#fff2ce',
                border: '1.5px solid #dcb274',
                color: '#694625',
                fontWeight: 700,
                fontSize: '12px',
                marginTop: '5px',
                outline: 'none',
              }}
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className="settings-toggle-row"
            onClick={() => {
              const next = !fogEnabled;
              setFogEnabled(next);
              try {
                localStorage.setItem('fow_enabled', next ? 'true' : 'false');
              } catch {}
            }}
            role="button"
            tabIndex={0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '12px',
              background: fogEnabled ? '#edf6e2' : '#fff2ce',
              border: `2px solid ${fogEnabled ? '#7ca63e' : '#dcb274'}`,
              cursor: 'pointer',
              marginTop: '12px',
              userSelect: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px', color: '#573719' }}>
                Туман войны (разведка)
              </div>
              <small style={{ fontSize: '10px', color: '#886745', display: 'block', marginTop: '2px' }}>
                {fogEnabled ? 'Включен: неизведанные здания скрыты' : 'Отключен: вся карта полностью открыта'}
              </small>
            </div>
            <div
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: fogEnabled ? '#4ba635' : '#c9ba9b',
                position: 'relative',
                transition: 'background 0.2s ease',
                flexShrink: 0,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: fogEnabled ? '23px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                  transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 900,
                  color: fogEnabled ? '#4ba635' : '#888',
                }}
              >
                {fogEnabled ? '✓' : ''}
              </div>
            </div>
          </div>
        </div>

        <hr className="settings-divider" />

        <div className="settings-group">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={debuffsEnabled}
              onChange={(e) => {
                setDebuffsEnabled(e.target.checked);
                try {
                  localStorage.setItem(
                    'tower-debuffs',
                    e.target.checked ? 'on' : 'off',
                  );
                } catch {}
              }}
            />
            <span>Рулетка штрафов · 50%</span>
          </label>
          <small className="settings-hint">Рулетка требует подключения ИИ на сервере.</small>
        </div>

        <hr className="settings-divider" />

        <div className="settings-group">
          <label className="settings-slider-label">
            <div className="slider-header">
              <span>Эффекты</span>
              <b>{Math.round(sfxVol * 100)}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVol}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setSfxVol(v);
                setSfxVolume(v);
                playSelect();
              }}
            />
          </label>

          <label className="settings-slider-label">
            <div className="slider-header">
              <span>Музыка</span>
              <b>{Math.round(bgmVol * 100)}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVol}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setBgmVol(v);
                setBgmVolume(v);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
  const reset = () => {
    restoreBgm();
    replayLoad.current?.abort();
    setReplayLoading(false);
    if (recording) {
      leaveRecording();
      return;
    }
    if (mpSessionRef.current) {
      mpSessionRef.current.destroy();
      setMpSession(null);
      mpSessionRef.current = null;
      setIsMpHost(false);
      setMyTeam('you');
    }
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setDraft('');
    setPromptMessage('');
    const fresh = initialGame();
    const effectiveName = nickname.trim() || 'Командир';
    fresh.players = { ...(fresh.players ?? {}), you: effectiveName };
    setGame(fresh);
    setSelected(null);
    setScoutMode(false);
    setRouteMode(true);
    initialized.current = false;
    setPaused(false);
    setHelp(false);
    setStarted(false);
  };
  const begin = () => {
    initAudio();
    restoreBgm();
    playBgm();
    playBeep();
    try {
      setDebuffsEnabled(localStorage.getItem('tower-debuffs') === 'on');
    } catch {}
    reset();
    setStarted(true);
    const newG = initialGame();
    const effectiveName = nickname.trim() || 'Командир';
    newG.players = { ...(newG.players ?? {}), you: effectiveName };
    setGame(newG);
    const home = newG.towers.find((t) => t.team === 'you' && t.home) ?? newG.towers[0];
    if (home) {
      focusPoint(home.x, home.y, 1.0);
    }
  };

  const handleRemotePlayerAction = (msg: NetworkMessage & { type: 'PLAYER_ACTION' }) => {
    const actor = msg.team;
    const action = msg.action;
    setGame((g) => {
      switch (action.kind) {
        case 'SEND_ARMY':
          return sendArmy(g, action.from, action.to, action.fraction, actor);
        case 'UPGRADE':
          return upgrade(g, action.towerId, actor);
        case 'UPGRADE_CANNON':
          return upgradeCannon(g, action.towerId, actor);
        case 'SPECIALIZE':
          return specialize(g, action.towerId, action.specialty, actor);
        case 'AUTOMATION':
          return setAutomation(g, action.from, action.to, actor);
        case 'AUTOMATION_CONFIG':
          return configureAutomation(g, action.from, action.mode, action.reserve, actor);
        case 'SCOUT':
          return sendScout(g, action.from, action.x, action.y, actor);
        case 'MESSAGE':
          return sendMessage(g, actor, action.text);
        case 'SPELL_START':
          return startSpell(g, actor, action.prompt, action.roll);
        case 'SPELL_READY':
          return readySpell(g, action.patch, action.epoch, action.debuff, action.roll);
        default:
          return g;
      }
    });
  };

  const dispatchPlayerAction = (action: (NetworkMessage & { type: 'PLAYER_ACTION' })['action']) => {
    if (mpSessionRef.current && !mpSessionRef.current.isHost) {
      mpSessionRef.current.sendAction(action);
      return;
    }
    setGame((g) => {
      switch (action.kind) {
        case 'SEND_ARMY':
          return sendArmy(g, action.from, action.to, action.fraction, myTeam);
        case 'UPGRADE':
          return upgrade(g, action.towerId, myTeam);
        case 'UPGRADE_CANNON':
          return upgradeCannon(g, action.towerId, myTeam);
        case 'SPECIALIZE':
          return specialize(g, action.towerId, action.specialty, myTeam);
        case 'AUTOMATION':
          return setAutomation(g, action.from, action.to, myTeam);
        case 'AUTOMATION_CONFIG':
          return configureAutomation(g, action.from, action.mode, action.reserve, myTeam);
        case 'SCOUT':
          return sendScout(g, action.from, action.x, action.y, myTeam);
        case 'MESSAGE':
          return sendMessage(g, myTeam, action.text);
        case 'SPELL_START':
          return startSpell(g, myTeam, action.prompt, action.roll);
        case 'SPELL_READY':
          return readySpell(g, action.patch, action.epoch, action.debuff, action.roll);
        default:
          return g;
      }
    });
  };

  const handleStartMpGame = (
    sess: MultiplayerSession,
    seed: number,
    humanTeams: Team[],
    initialGameData?: Game,
  ) => {
    initAudio();
    restoreBgm();
    playBgm();
    playBeep();
    setMpSession(sess);
    mpSessionRef.current = sess;
    setShowMpLobby(false);
    setStarted(true);
    setPaused(false);
    setHelp(false);
    setMyTeam(sess.myTeam);
    setIsMpHost(sess.isHost);

    sess.callbacks.onPlayerAction = (msg) => {
      handleRemotePlayerAction(msg);
    };
    sess.callbacks.onGameSync = (syncedGame) => {
      setGame(syncedGame);
      if (!initialized.current) {
        const home = syncedGame.towers.find((t) => t.team === sess.myTeam && t.home);
        if (home) {
          initialized.current = true;
          focusPoint(home.x, home.y, 1.0);
        }
      }
    };

    if (sess.isHost) {
      const newG = initialGameData ?? initialGame();
      newG.humanTeams = humanTeams;
      const playerNames: Partial<Record<Team, string>> = {};
      for (const p of sess.players) {
        playerNames[p.team] = p.name;
      }
      newG.players = { ...(newG.players ?? {}), ...playerNames };
      setGame(newG);
      sess.broadcastGameSync(newG, true);

      const home = newG.towers.find((t: Tower) => t.team === sess.myTeam && t.home) ?? newG.towers[0];
      if (home) {
        focusPoint(home.x, home.y, 1.0);
      }
    } else {
      const startingG = initialGameData ?? initialGame();
      setGame(startingG);
      const home = startingG.towers.find((t: Tower) => t.team === sess.myTeam && t.home);
      if (home) {
        focusPoint(home.x, home.y, 1.0);
      }
    }
  };

  const clickTower = (t: Tower) => {
    if (
      t.ruinedAt !== undefined ||
      recording ||
      paused ||
      help ||
      game.result ||
      suppressClick.current
    )
      return;
    if (scoutMode && source) {
      dispatchPlayerAction({ kind: 'SCOUT', from: source.id, x: t.x, y: t.y });
      setScoutMode(false);
      return;
    }
    if ((selectAllMode || (source && source.id !== t.id) || routeMode) && t.home && t.team !== myTeam && game.age < DEVELOPMENT_SECONDS) {
      setGame((g) => ({
        ...g,
        notice: `🛡️ Вражеский штаб защищён щитом мира! До финальной эры: ${Math.ceil(DEVELOPMENT_SECONDS - game.age)} с.`,
      }));
      playError();
      return;
    }
    if (selectAllMode) {
      if (t.team === myTeam) {
        setSelected(t.id);
        setSelectAllMode(false);
        playSelect();
        return;
      }
      const playerTowers = game.towers.filter((tw) => tw.team === myTeam && tw.id !== t.id && tw.count >= 2);
      if (playerTowers.length > 0) {
        for (const pt of playerTowers) {
          dispatchPlayerAction({ kind: 'SEND_ARMY', from: pt.id, to: t.id, fraction });
        }
        setSelectAllMode(false);
        setSelected(null);
        playSelect();
        return;
      }
    }
    if (routeMode && source && source.id !== t.id) {
      dispatchPlayerAction({ kind: 'AUTOMATION', from: source.id, to: t.id });
      setSelected(null);
      return;
    }
    if (source && source.id === t.id) {
      setSelected(null);
      playBeep();
      return;
    }
    if (source && source.id !== t.id) {
      dispatchPlayerAction({ kind: 'SEND_ARMY', from: source.id, to: t.id, fraction });
      setSelected(null);
      playSelect();
    } else if (t.team === myTeam) {
      setSelected(t.id);
      playSelect();
    } else {
      setGame((g) => ({
        ...g,
        notice: 'Сначала выберите свою башню, затем нажмите на цель.',
      }));
      playError();
    }
  };
  async function submitPrompt(e: React.FormEvent) {
    e.preventDefault();
    const current = gameRef.current;
    if (!typingDeadline || Date.now() >= typingDeadline) {
      setTypingDeadline(0);
      setDraft('');
      setPromptMessage('Время ввода истекло. Наберите приказ заново.');
      return;
    }
    if (recording || paused || help || current.result) return;
    if (messageOpportunity(current, myTeam)) {
      dispatchPlayerAction({ kind: 'MESSAGE', towerId: 0, text: draft });
      setDraft('');
      setTypingDeadline(0);
      setPromptMessage('Сообщение над штабом · 10 секунд');
      return;
    }
    if (current.age < DEVELOPMENT_SECONDS) return;
    if (
      pending.current ||
      current.authority !== myTeam ||
      current.result ||
      current.spell ||
      paused ||
      help ||
      !draft.trim()
    )
      return;
    const submittedDraft = draft;
    setTypingDeadline(0);
    const epoch = current.authorityEpoch;
    const request = new AbortController();
    pending.current = request;
    setBusy(true);
    dispatchPlayerAction({
      kind: 'SPELL_START',
      prompt: submittedDraft,
      roll: debuffsEnabled ? 'rolling' : 'disabled',
    });
    setPromptMessage('');
    setPromptIsError(false);
    try {
      const effectiveNickname =
        nickname.trim() ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('tower-player-name')?.trim() || ''
          : '') ||
        playerName(current, myTeam) ||
        'Командир';

      const response = await fetch('/api/decree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: submittedDraft,
          debuffsEnabled,
          nickname: effectiveNickname,
        }),
        signal: request.signal,
      });
      const data = (await response.json()) as {
        error?: string;
        patch?: unknown;
        debuff?: unknown;
        roll?: string;
        provider?: string;
      };
      if (pending.current !== request || request.signal.aborted) return;
      if (!response.ok) {
        const err = data.error || 'Приказ не применён.';
        setPromptMessage(err);
        setPromptIsError(true);
        setDraft(submittedDraft);
        playError();
        setGame((g) => ({
          ...g,
          spell: undefined,
          notice: `❌ Ошибка приказа: ${err}`,
        }));
        return;
      }
      if (data.provider === 'mistral') setProvider('mistral');
      const patch = data.patch;
      if (
        !validDecree(patch) ||
        (data.roll === 'debuff' && !validDebuff(data.debuff))
      ) {
        const err = 'Не удалось разобрать приказ. Попробуйте сформулировать иначе.';
        setPromptMessage(err);
        setPromptIsError(true);
        setDraft(submittedDraft);
        playError();
        setGame((g) => ({
          ...g,
          spell: undefined,
          notice: `❌ Ошибка приказа: ${err}`,
        }));
        return;
      }
      if (!activeRef.current) {
        const err = 'Бой приостановлен. Приказ отменён.';
        setPromptMessage(err);
        setPromptIsError(true);
        setDraft(submittedDraft);
        playError();
        setGame((g) => ({
          ...g,
          spell: undefined,
          notice: `⚠️ ${err}`,
        }));
        return;
      }
      dispatchPlayerAction({
        kind: 'SPELL_READY',
        patch,
        epoch,
        debuff: validDebuff(data.debuff) ? data.debuff : null,
        roll: data.roll ?? 'disabled',
      });
      if (
        gameRef.current.authority === myTeam &&
        gameRef.current.authorityEpoch === epoch
      ) {
        setDraft('');
        setPromptIsError(false);
        setPromptMessage('✓ Указ отправлен на исполнение! Удержите лидерство.');
      } else {
        setPromptIsError(true);
        setDraft(submittedDraft);
        setPromptMessage('Вы потеряли лидерство в цитадели. Приказ не применён.');
        playError();
      }
    } catch {
      if (!request.signal.aborted) {
        const err = 'Ошибка связи с сервером ИИ. Проверьте интернет или повторите попытку.';
        setPromptMessage(err);
        setPromptIsError(true);
        setDraft(submittedDraft);
        playError();
        setGame((g) => ({
          ...g,
          spell: undefined,
          notice: `❌ Ошибка приказа: ${err}`,
        }));
      }
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setBusy(false);
        setGame((g) =>
          g.spell && !g.spell.patch ? { ...g, spell: undefined } : g,
        );
      }
    }
  }
  if (!started)
    return (
      <main
        className={`start-screen theme-${mapTheme}`}
        style={{
          backgroundImage: `url(${THEME_OPTIONS.find((t) => t.id === mapTheme)?.bg ?? '/assets/dark-green.jpeg'})`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="start-settings" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="square-button"
            aria-label="Настройки"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} />
          </button>
          {showSettings && settingsPanel}
          <DevConsole
            isOpen={devOpen}
            onClose={() => setDevOpen(false)}
            onExecuteDecree={(patch) => {
              let reports: string[] = [];
              setGame((g) => {
                const res = forceApplyDecreeWithLog(g, 'you', patch);
                reports = res.log;
                return res.game;
              });
              return reports;
            }}
          />
        </div>
        <div className="start-cloud">
          <span>СТРАТЕГИЯ, В КОТОРОЙ ВЛАСТЬ МЕНЯЕТ ПРАВИЛА</span>
        </div>
        <div className="start-title">
          <small>СОЛНЕЧНАЯ ДОЛИНА</small>
          <h1>
            FORGE<span>OF WILL</span>
          </h1>
          <p>
            Развивай экономику. Стань лидером.
            <br />
            Напиши свой закон победы.
          </p>
        </div>
        <div className="start-army" aria-hidden="true">
          <img className="menu-tower red" src="/assets/tower.png" alt="" />
          <img className="menu-tower blue" src="/assets/tower.png" alt="" />
          <img className="menu-soldier" src="/assets/soldier.png" alt="" />
        </div>
        <section className="start-panel">
          <div className="start-mode">
            <Crown />
            <span>
              БИТВА ЗА ПРАВО ЖЕЛАНИЯ
              <small>Вы + 3 бота · 12 минут · 24 здания</small>
            </span>
          </div>
          <button className="play-button" onClick={begin}>
            <Play fill="currentColor" /> В БОЙ!
          </button>
          <button
            type="button"
            className="play-button"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              marginTop: '10px',
              border: '1px solid rgba(147, 197, 253, 0.4)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
            onClick={() => setShowMpLobby(true)}
          >
            <Users size={18} /> Играть с друзьями
          </button>
          <div className="start-rules">
            <span>
              <Flag /> Захватывай здания
            </span>
            <span>
              <Crown /> Удерживай лидерство
            </span>
            <span>
              <Sparkles /> Меняй правила
            </span>
          </div>
          <p>Первые 2 минуты — развитие. Затем власть у самого богатого.</p>
          <div className="start-nickname-plate-wrap">
            <button
              type="button"
              className="start-nickname-plate"
              onClick={() => {
                setDraftNick(nickname);
                setShowNickModal(true);
              }}
              title="Нажмите, чтобы изменить позывной"
            >
              <div className="start-nick-avatar">
                <User size={16} />
              </div>
              <div className="start-nick-info">
                <span className="start-nick-label">Ваш позывной</span>
                <b className="start-nick-value">{nickname}</b>
              </div>
              <span className="start-nick-edit-badge">
                ✏️ Изменить
              </span>
            </button>
          </div>
        </section>
        <div className="start-bottom">Каждый матч — новая история</div>
        {showNickModal && (
          <div className="modal-backdrop">
            <div
              className="nickname-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  <User size={18} /> Ваш позывной
                </h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowNickModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <p className="modal-subtitle">
                Под этим именем вас будут знать все правители и подданные в
                Долине.
              </p>
              <div className="nickname-input-group">
                <input
                  type="text"
                  maxLength={22}
                  value={draftNick}
                  autoFocus
                  placeholder="Командир"
                  onChange={(e) => setDraftNick(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = draftNick.trim() || 'Командир';
                      setNickname(val);
                      try {
                        localStorage.setItem('tower-player-name', val);
                      } catch {}
                      setGame((g) => ({
                        ...g,
                        players: { ...(g.players ?? {}), [myTeam]: val },
                      }));
                      setShowNickModal(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="random-nick-btn"
                  title="Случайное имя"
                  onClick={() => {
                    const funNames = [
                      'Повелитель',
                      'Архимаг',
                      'Генералиссимус',
                      'Князь Долины',
                      'Легионер',
                      'Непобедимый',
                      'Громовержец',
                      'Хан',
                      'Султан',
                      'Царь Горы',
                    ];
                    const pick =
                      funNames[Math.floor(Math.random() * funNames.length)];
                    setDraftNick(pick);
                  }}
                >
                  🎲
                </button>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setShowNickModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="modal-btn-save"
                  onClick={() => {
                    const val = draftNick.trim() || 'Командир';
                    setNickname(val);
                    try {
                      localStorage.setItem('tower-player-name', val);
                    } catch {}
                    setGame((g) => ({
                      ...g,
                      players: { ...(g.players ?? {}), [myTeam]: val },
                    }));
                    setShowNickModal(false);
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
        {showMpLobby && (
          <MultiplayerLobby
            session={mpSession}
            nickname={nickname}
            initialRoomCode={initialRoomCode}
            onStartGame={handleStartMpGame}
            onCancel={() => setShowMpLobby(false)}
          />
        )}
      </main>
    );
  return (
    <main
      className={`war-shell ${game.screenShakeUntil && game.screenShakeUntil > game.age ? 'screen-shaking' : ''} ${game.partyUntil && game.partyUntil > game.age ? 'party-active' : ''} ${game.blizzardUntil && game.blizzardUntil > game.age ? 'blizzard-active' : ''} ${game.polymorphUntil && game.polymorphUntil > game.age ? 'polymorph-active' : ''} ${game.peaceUntil && game.peaceUntil > game.age ? 'peace-active' : ''} ${game.titansUntil && game.titansUntil > game.age ? 'titans-active' : ''}`}
    >
      <OwnershipFilters />
      <header className="war-header">
        <a className="war-brand" href="/">
          FORGE<span>OF WILL</span>
        </a>
        <div className="chapter">
          <span>01</span>
          <div>
            <small>{mpSession ? (mpSession.isHost ? 'ХОСТ КОМНАТЫ' : 'МУЛЬТИПЛЕЕР') : 'ПЕРВАЯ ЭКСПЕДИЦИЯ'}</small>
            <b style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Солнечная долина
            </b>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="square-button"
            aria-label="Настройки"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} />
          </button>
          {showSettings && settingsPanel}
          <DevConsole
            isOpen={devOpen}
            onClose={() => setDevOpen(false)}
            onExecuteDecree={(patch) => {
              let reports: string[] = [];
              setGame((g) => {
                const res = forceApplyDecreeWithLog(g, 'you', patch);
                reports = res.log;
                return res.game;
              });
              return reports;
            }}
          />

          <button
            className="header-btn"
            aria-pressed={showStats}
            title="Таблица экономики"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 size={15} />
            <span>Статистика</span>
          </button>
          <button
            className="header-btn"
            disabled={!!recording}
            title="Обучение и правила"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={15} />
            <span>Как играть</span>
          </button>
          <button
            className="square-button"
            aria-label="Начать заново"
            title="Начать заново"
            onClick={reset}
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>
      <section className="dominion">
        <div className="dominion-heading">
          <span className="dominion-title">
            <Crown size={18} />
            <b>
              {developing
                ? `РАЗВИТИЕ · ${Math.floor(developmentLeft / 60)}:${String(developmentLeft % 60).padStart(2, '0')}`
                : 'ВЛАСТЬ ЭКОНОМИКИ'}
            </b>
          </span>
          <span className="dominion-leader-badge">
            <i
              className="leader-team-dot"
              style={{
                background: currentLeader ? TEAMS[currentLeader].color : '#ffd465',
              }}
            />
            <span>
              {developing ? (
                'Приказы ИИ через 2 мин.'
              ) : game.authority ? (
                <>
                  Право ИИ:{' '}
                  <b
                    style={{
                      color:
                        game.authority === 'you'
                          ? '#195bbd'
                          : TEAMS[game.authority]?.color || '#784a1e',
                    }}
                  >
                    {playerName(game, game.authority)}
                  </b>
                </>
              ) : (
                'Равенство сил'
              )}
            </span>
          </span>
        </div>
        <div
          className="dominion-bar"
          role="img"
          aria-label={TEAM_IDS.map(
            (t) =>
              `${playerName(game, t)}: ${Math.floor(game.wallets[t].earned)} очков`,
          ).join(', ')}
        >
          {TEAM_IDS.map((t) => {
            const pct = totalEarned ? (game.wallets[t].earned / totalEarned) * 100 : 25;
            const points = Math.floor(game.wallets[t].earned);
            return (
              <span
                key={t}
                title={`${playerName(game, t)}: ${points} очков (${Math.round(pct)}%)`}
                style={{
                  width: `${pct}%`,
                  background: TEAMS[t].color,
                }}
              >
                {pct >= 14 ? (points >= 10000 ? `${(points / 1000).toFixed(1)}k` : points) : ''}
              </span>
            );
          })}
        </div>
      </section>
      <div className="economy-wallet">
        <span>
          <Coins />
          <b>{Math.floor(money.gold)}</b>
          <small>+{rates.gold.toFixed(1)}/с</small>
        </span>
        <span>
          <Trees />
          <b>{Math.floor(money.resources)}</b>
          <small>+{rates.resources.toFixed(1)}/с</small>
        </span>
        <p>Заработано: {Math.floor(money.earned)} очков</p>
      </div>
      <aside
        className={`economy-rank ${showStats ? 'is-open' : 'is-collapsed'}`}
      >
        <strong>ГОНКА ЭКОНОМИК</strong>
        {[...TEAM_IDS]
          .sort((a, b) => game.wallets[b].earned - game.wallets[a].earned)
          .map((t) => (
            <div key={t}>
              <i style={{ background: TEAMS[t].color }} />
              <span>
                {playerName(game, t)}
                <small>
                  {game.towers.filter((x) => x.team === t).length} зданий
                </small>
              </span>
              <b>{Math.floor(game.wallets[t].earned)}</b>
            </div>
          ))}
        <small>
          Золото + древесина за весь матч.
          <br />
          Улучшения не отнимают очки.
        </small>
      </aside>
      <nav className="camera-controls" aria-label="Управление картой">
        <button onClick={() => changeZoom(1.2)} aria-label="Приблизить" title="Приблизить (+)">
          <Plus size={16} />
        </button>
        <span className="zoom-display" title="Текущий масштаб">{Math.round(camera.zoom * 100)}%</span>
        <button onClick={() => changeZoom(1 / 1.2)} aria-label="Отдалить" title="Отдалить (−)">
          <Minus size={16} />
        </button>
        <button
          onClick={focusHome}
          title="К своему штабу"
          aria-label="К своему штабу"
        >
          <Crosshair size={16} />
        </button>
        <button
          onClick={() => {
            const v = viewportRef.current;
            focusPoint(50, 50, Math.min(v.w / WORLD_WIDTH, v.h / WORLD_HEIGHT));
          }}
          title="Обзор карты"
          aria-label="Обзор карты"
        >
          <Map size={16} />
        </button>
      </nav>
      <button
        className="minimap"
        style={{
          backgroundImage: `url(${THEME_OPTIONS.find((t) => t.id === mapTheme)?.bg ?? '/assets/dark-green.jpeg'})`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
        aria-label="Обзор карты: нажмите, чтобы переместить камеру"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          focusPoint(
            ((e.clientX - r.left) / r.width) * 100,
            ((e.clientY - r.top) / r.height) * 100,
          );
        }}
      >
        {game.towers
          .filter((t) => !fogEnabled || exploredTowers.has(t.id))
          .map((t) => (
            <i
              key={t.id}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                background: t.team ? TEAMS[t.team].color : '#fff2c5',
              }}
            />
          ))}
        <span
          style={{
            left: `${(-camera.x / (WORLD_WIDTH * camera.zoom)) * 100}%`,
            top: `${(-camera.y / (WORLD_HEIGHT * camera.zoom)) * 100}%`,
            width: `${(viewport.w / (WORLD_WIDTH * camera.zoom)) * 100}%`,
            height: `${(viewport.h / (WORLD_HEIGHT * camera.zoom)) * 100}%`,
          }}
        />
      </button>

      <section className="battle-card">
        <div className="battle-top">
          <div className="objective">
            <Flag size={19} />
            <b>Захватите долину</b>
            <span>Больше башен — ближе победа</span>
          </div>
          <div className="team-score">
            {Object.entries(TEAMS).map(([id, team]) => (
              <div
                key={id}
                style={{ '--color': team.color } as React.CSSProperties}
              >
                <i />
                <b>
                  {playerName(game, id as Team)}
                  {game.labels?.[id as Team] && (
                    <span className="player-bar-label">
                      {game.labels[id as Team]}
                    </span>
                  )}
                </b>
                <span>{game.towers.filter((t) => t.team === id).length}</span>
                <small>{id === 'you' ? 'ИГРОК' : 'БОТ'}</small>
              </div>
            ))}
          </div>
          <div className="clock">
            <i />
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, '0')}
          </div>
          {game.age < DEVELOPMENT_SECONDS ? (
            <div
              className="era-indicator shield"
              title={`Щит мира на штабах активен ещё ${Math.ceil(DEVELOPMENT_SECONDS - game.age)} с. До финальной эры атака вражеского штаба закрыта.`}
            >
              <Shield size={13} className="era-shield-icon" />
              <span>Щит: <b>{Math.floor((DEVELOPMENT_SECONDS - game.age) / 60)}:{String(Math.floor((DEVELOPMENT_SECONDS - game.age) % 60)).padStart(2, '0')}</b></span>
            </div>
          ) : (
            <div
              className="era-indicator final"
              title="Финальная эра! Щиты сняты — открыт полный штурм штабов!"
            >
              <Swords size={13} className="era-sword-icon" />
              <span>ФИНАЛ</span>
            </div>
          )}
          <button
            className="square-button"
            aria-label={paused ? 'Продолжить' : 'Пауза'}
            title={paused ? 'Продолжить игру' : 'Пауза'}
            disabled={!!game.result}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </div>
        <div
          ref={field}
          role="application"
          aria-label="Поле боя. Перетаскивание — камера, колесо — масштаб. Enter в режиме разведки отправляет разведчика в центр экрана."
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (
              e.key === 'Enter' &&
              scoutMode &&
              source &&
              !paused &&
              !help &&
              !game.result
            ) {
              e.preventDefault();
              setGame((g) =>
                sendScout(
                  g,
                  source.id,
                  ((viewport.w / 2 - camera.x) / camera.zoom / WORLD_WIDTH) *
                    100,
                  ((viewport.h / 2 - camera.y) / camera.zoom / WORLD_HEIGHT) *
                    100,
                ),
              );
              setScoutMode(false);
            }
          }}
          onPointerDown={panStart}
          onPointerMove={panMove}
          onPointerUp={panEnd}
          onPointerCancel={panEnd}
          onClick={(e) => {
            if (
              recording ||
              !scoutMode ||
              !source ||
              paused ||
              help ||
              game.result ||
              suppressClick.current ||
              (e.target as HTMLElement).closest('button')
            )
              return;
            const r = e.currentTarget.getBoundingClientRect();
            setGame((g) =>
              sendScout(
                g,
                source.id,
                ((e.clientX - r.left - camera.x) / camera.zoom / WORLD_WIDTH) *
                  100,
                ((e.clientY - r.top - camera.y) / camera.zoom / WORLD_HEIGHT) *
                  100,
              ),
            );
            setScoutMode(false);
          }}
          onClickCapture={(e) => {
            if (suppressClick.current) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          className={`battlefield theme-${mapTheme} ${paused || help || game.result ? 'frozen' : ''}`}
        >
          <div className="map-caption">
            {THEME_OPTIONS.find((t) => t.id === mapTheme)?.label.split(' ')[0].toUpperCase()} ДОЛИНА <span>36° N · 24° E</span>
          </div>
          <div
            className="world-map"
            style={
              {
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                '--label-scale': 1 / camera.zoom,
                '--chat-gap': `${42 / camera.zoom}px`,
              } as React.CSSProperties
            }
          >
            <div
              className="world-terrain"
              aria-hidden="true"
              style={{
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                left: 0,
                top: 0,
                transform: 'none',
                backgroundImage: `url(${THEME_OPTIONS.find((t) => t.id === mapTheme)?.bg ?? '/assets/dark-green.jpeg'})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <FogOfWar
              towers={game.towers}
              troops={game.troops}
              width={WORLD_WIDTH}
              height={WORLD_HEIGHT}
              theme={mapTheme}
              enabled={fogEnabled}
              gameAge={game.age}
            />
            <div className="battle-units">
              <svg
                className="routes"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 100 100"
                    refX="8"
                    refY="5"
                    markerWidth="3"
                    markerHeight="3"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#fff" />
                  </marker>
                </defs>
                {[
                  ...game.routes,
                  ...game.automation
                    .filter(
                      (a) =>
                        !game.routes.some(
                          (r) => r.from === a.from && r.to === a.to,
                        ),
                    )
                    .map((a) => ({ ...a, until: Infinity })),
                ]
                  .filter(
                    (r) =>
                      !fogEnabled ||
                      (exploredTowers.has(r.from) && exploredTowers.has(r.to)),
                  )
                  .map((r) => {
                  const a = game.towers[r.from],
                    b = game.towers[r.to];
                  if (!a || !b) return null;
                  const pts = findRoute({ x: a.x, y: a.y }, { x: b.x, y: b.y });
                  const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
                  return (
                    <g key={`${r.from}-${r.to}`}>
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={TEAMS[r.team].color}
                        strokeWidth=".5"
                        opacity=".25"
                      />
                      <polyline
                        className="route-dashes"
                        points={pointsStr}
                        fill="none"
                        stroke={TEAMS[r.team].color}
                        strokeWidth=".22"
                        strokeDasharray=".7 .8"
                        markerEnd="url(#arrow)"
                      />
                    </g>
                  );
                })}
                {source && hasCannon(source) && (
                  <ellipse
                    cx={source.x}
                    cy={source.y}
                    rx={(cannon(source).range / WORLD_WIDTH) * 100}
                    ry={(cannon(source).range / WORLD_HEIGHT) * 100}
                    fill="#ffffff08"
                    stroke="#fff5be99"
                    strokeWidth=".1"
                    strokeDasharray=".4 .4"
                  />
                )}
                {(game.shots ?? []).map((shot) => {
                  const t = game.towers[shot.from],
                    k = Math.min(
                      1,
                      (game.age - shot.at) / (shot.duration ?? 0.4),
                    ),
                    sx = shot.sx ?? t.x,
                    sy = shot.sy ?? t.y;
                  return (
                    <g key={shot.id}>
                      {k < 1 ? (
                        <>
                          <line
                            x1={sx + (shot.x - sx) * Math.max(0, k - 0.18)}
                            y1={sy + (shot.y - sy) * Math.max(0, k - 0.18)}
                            x2={sx + (shot.x - sx) * k}
                            y2={sy + (shot.y - sy) * k}
                            stroke={TEAMS[shot.team].color}
                            strokeWidth=".22"
                          />
                          <ellipse
                            cx={sx + (shot.x - sx) * k}
                            cy={sy + (shot.y - sy) * k}
                            rx=".23"
                            ry=".32"
                            fill={TEAMS[shot.team].color}
                            stroke="#fff"
                            strokeWidth=".07"
                          />
                        </>
                      ) : (
                        <ellipse
                          cx={shot.x}
                          cy={shot.y}
                          rx={
                            0.2 +
                            (game.age - shot.at - (shot.duration ?? 0.4)) * 2
                          }
                          ry={
                            0.3 +
                            (game.age - shot.at - (shot.duration ?? 0.4)) * 3
                          }
                          fill="none"
                          stroke={TEAMS[shot.team].color}
                          strokeWidth=".15"
                          opacity={Math.max(
                            0,
                            1 -
                              (game.age - shot.at - (shot.duration ?? 0.4)) /
                                0.3,
                          )}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
              {(source || selectAllMode) && (
                <div className="target-hint">
                  {selectAllMode ? (
                    <>
                      <Zap size={15} style={{ color: '#fbbf24' }} />
                      <b>ВСЯ АРМИЯ:</b> укажите цель для штурма
                    </>
                  ) : (
                    <>
                      Выбрано: {source?.name}
                      <ChevronRight size={16} />{' '}
                      {scoutMode
                        ? 'Укажите точку разведки'
                        : routeMode
                          ? 'Цель маршрута'
                          : 'Цель атаки'}
                    </>
                  )}{' '}
                  <button
                    onClick={() => {
                      setSelected(null);
                      setSelectAllMode(false);
                    }}
                    aria-label="Отменить выбор"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {game.towers.map((t) => {
                const inVision = !fogEnabled || activeVisionTowers.has(t.id);
                const explored = !fogEnabled || inVision || exploredTowers.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={explored ? () => clickTower(t) : undefined}
                    tabIndex={explored ? 0 : -1}
                    aria-hidden={!explored}
                    className={`tower team-${t.team ?? 'neutral'} ${(source?.id === t.id || (selectAllMode && t.team === 'you')) ? 'selected' : ''} ${t.kind} ${t.ruinedAt !== undefined ? 'ruined' : ''} ${t.ruinedAt !== undefined && game.age - t.ruinedAt < 8 ? 'burning-site' : ''} ${t.home ? 'headquarters' : ''} ${game.flash === t.id ? 'captured' : ''} ${!explored ? 'fog-shrouded' : ''} ${explored && !inVision ? 'fog-obscured' : ''}`}
                    style={
                      {
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        zIndex: Math.round(t.y) + 20,
                        '--color': t.team ? TEAMS[t.team].color : '#a8a9a1',
                        '--gun-height': `${cannonHeight(t)}px`,
                      } as React.CSSProperties
                    }
                    aria-label={`${t.name}, ${t.team ? playerName(game, t.team) : 'нейтральная'}, ${Math.floor(t.count)} бойцов`}
                  >
                  {game.explosions?.some(e => e.id === t.id && game.age-e.at < 3) && <span className="base-explosion" key={Math.floor(game.age)}>💥</span>}
                  {game.lightningStrikes?.some(s => s.id === t.id && game.age-s.at < 2.5) && <span className="lightning-strike-anim" key={`bolt-${t.id}-${Math.floor(game.age)}`}>⚡</span>}
                  {t.ruinedAt !== undefined && (
                    <span
                      className={`burn-remains ${game.age - t.ruinedAt < 6 ? 'burning' : 'coals'}`}
                      aria-label="Сгорело до углей"
                      title="Разрушено: тлеющие угольки"
                    >
                      {game.age - t.ruinedAt < 6 ? '🔥' : '🪨'}
                      {game.age - t.ruinedAt >= 6 && (
                        <small className="ember-spark">♨️</small>
                      )}
                    </span>
                  )}
                  <span className="selection-ring" />
                  {!t.home && <span className="building-id">№{t.id + 1}</span>}
                  <img
                    className={`tower-art level-${t.level}`}
                    src={
                      t.kind === 'gold'
                        ? '/assets/gold-mine.png'
                        : t.kind === 'lumber'
                          ? '/assets/sawmill.png'
                          : '/assets/tower.png'
                    }
                    alt=""
                    draggable={false}
                  />
                  {!['gold', 'lumber'].includes(t.kind) && (
                    <span className="tower-roof" />
                  )}
                  {t.team && hasCannon(t) && (
                    <span
                      className="turret-pivot"
                      style={{ transform: `rotate(${t.aim ?? 0}deg)` }}
                    >
                      <img
                        className={`turret-art ${game.shots?.some((s) => s.from === t.id && game.age - s.at < 0.2) ? 'recoil' : ''}`}
                        src="/assets/turret.png"
                        alt=""
                        draggable={false}
                      />
                      {game.shots?.some(
                        (s) => s.from === t.id && game.age - s.at < 0.12,
                      ) && <i className="muzzle-flash" />}
                    </span>
                  )}
                  {game.spell && t.home && t.team === game.spell.team && (
                    <span className="cast-beacon" title="Подготовка указа ИИ">
                      <ScrollText size={28} />
                      <b>
                        {game.spell.castAt
                          ? `${Math.max(0, Math.ceil(game.spell.castAt - game.age))} с`
                          : '✦'}
                      </b>
                    </span>
                  )}
                  {t.specialty && (
                    <span
                      className="specialty-badge"
                      title={SPECIALTIES[t.specialty]}
                    >
                      {t.specialty === 'economy' ? (
                        '◆'
                      ) : t.specialty === 'fortress' ? (
                        <Shield size={14} strokeWidth={2.4} />
                      ) : t.specialty === 'elite' ? (
                        '★'
                      ) : (
                        '♟'
                      )}
                    </span>
                  )}
                  <span className="tower-number">
                    {Math.floor(t.count).toLocaleString('ru-RU')}
                    <small>
                      {Array.from({ length: t.level }, (_, i) => (
                        <i key={i} />
                      ))}
                    </small>
                  </span>
                  {game.automation.some((a) => a.from === t.id) && (
                    <span className="auto-badge">
                      <Repeat2 size={12} />
                    </span>
                  )}
                  {t.home && (game.age < DEVELOPMENT_SECONDS || (t.team && (game.shielded?.[t.team] ?? 0) > game.age)) && (
                    <img
                      className="hq-shield-overlay"
                      src="/shield.png"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.triedAssets) {
                          img.dataset.triedAssets = 'true';
                          img.src = '/assets/shield.png';
                        } else {
                          img.style.display = 'none';
                        }
                      }}
                      alt="Щит мира"
                      draggable={false}
                    />
                  )}
                  {t.home && t.team && (
                    <span
                      className="hq-nickname"
                      style={{ color: TEAMS[t.team].color }}
                    >
                      {playerName(game, t.team)}
                      {game.labels?.[t.team] && (
                        <small className="player-status">
                          {game.labels[t.team]}
                        </small>
                      )}
                      {game.inputLocked?.[t.team] && (
                        <small
                          className="input-lock-status"
                          title="Мышь и клавиатура отключены"
                        >
                          🖱 ⌨ ⊘
                        </small>
                      )}
                    </span>
                  )}
                  {t.home &&
                    t.team &&
                    !game.hideMessages &&
                    speech &&
                    (game.messages ?? [])
                      .filter((m) => m.team === t.team && m.until > game.age)
                      .map((m) => (
                        <span
                          className="hq-message"
                          key={`${m.team}-${m.until}`}
                        >
                          {m.text}
                        </span>
                      ))}
                  {t.home && (
                    <span className="hq-label">
                      <Crown size={12} /> ШТАБ{' '}
                      <small>
                        +{(production(t) * game.growth[t.team!]).toFixed(1)}/с
                      </small>
                    </span>
                  )}
                  {t.kind !== 'tower' && (
                    <span className="special-label">
                      {t.kind === 'gold' ? (
                        <Coins size={15} />
                      ) : t.kind === 'lumber' ? (
                        <Trees size={15} />
                      ) : t.kind === 'relay' ? (
                        <Radio size={15} />
                      ) : (
                        <Package size={15} />
                      )}{' '}
                      {KIND_LABEL[t.kind]}
                      {t.kind === 'gold'
                        ? ` +${income(t).gold.toFixed(1)}/с`
                        : t.kind === 'lumber'
                          ? ` +${income(t).resources.toFixed(1)}/с`
                          : ''}
                    </span>
                  )}
                  {source?.id === t.id && !t.home && (
                    <span className="source-label">ВАША БАШНЯ</span>
                  )}
                </button>
                );
              })}

            </div>
      {game.event && !game.event.claimed && (
              <button
                className="event-beacon"
                style={{ left: `${game.event.x}%`, top: `${game.event.y}%` }}
                title="Отправьте отряд или разведчика к событию"
                onClick={() => {
                  if (source) {
                    if (game.event?.kind === 'caravan')
                      setGame((g) =>
                        sendScout(g, source.id, game.event!.x, game.event!.y),
                      );
                    else if (game.event?.target !== undefined)
                      clickTower(game.towers[game.event.target]);
                  }
                }}
              >
                {game.event.kind === 'deposit'
                  ? '💎 ×3'
                  : game.event.kind === 'fortress'
                    ? '⚑ +50'
                    : '💰 150'}
                <small>{Math.ceil(game.event.until - game.age)} с</small>
              </button>
            )}
          </div>
          <div className="field-legend">
            <span>
              <i className="blue-dot" /> Ваши башни
            </span>
            <span>
              <i className="gray-dot" /> Нейтральные
            </span>
          </div>
          <button
            className="speech-toggle"
            onClick={() => setSpeech(!speech)}
            title={speech ? 'Скрыть реплики' : 'Показать реплики'}
            aria-label={speech ? 'Скрыть реплики' : 'Показать реплики'}
          >
            {speech ? <Volume2 size={18} /> : <VolumeX size={18} />} Реплики
          </button>
          <TroopLayer game={game} camera={camera} viewport={viewport} speech={speech} paused={paused || help} fogEnabled={fogEnabled} />
          {!recording && (paused || help || game.result) && (
            <div className="game-overlay">
              <section className={`overlay-card ${game.result ? 'victory-card' : ''}`}>
                {help ? (
                  <GameHelp onClose={() => setHelp(false)} />
                ) : game.result ? (
                  <div className="victory-modal-content">
                    <div className="victory-trophy-podium">
                      <img
                        src="/assets/trophy.jpg"
                        alt="Победный кубок"
                        className="victory-trophy-art"
                      />
                    </div>
                    <h1 className="victory-title">
                      {game.result === 'you'
                        ? 'Долина ваша!'
                        : game.result === 'draw'
                          ? 'Боевая ничья'
                          : `Победа: ${playerName(game, game.result)}`}
                    </h1>
                    <div className="victory-stats-row">
                      <div className="victory-stat-chip">
                        <Flag size={15} />
                        <span>Контроль: <b>{yours.length} / {game.towers.length}</b></span>
                      </div>
                      <div className="victory-stat-chip gold">
                        <Coins size={15} />
                        <span>Слава: <b>{Math.floor(money.earned)}</b></span>
                      </div>
                    </div>
                    <button className="primary victory-replay-btn" onClick={begin}>
                      <span>Ещё один бой</span> <RotateCcw size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Pause size={32} />
                    <h1>Привал</h1>
                    <p>Бойцы ждут вашего приказа.</p>
                    <button
                      className="primary"
                      onClick={() => setPaused(false)}
                    >
                      Продолжить <Play size={18} />
                    </button>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
      {!recording && (
        <section className="controls compact-controls">
          <div className="selected-summary">
            {selectAllMode ? (
              <div className="select-all-summary-banner">
                <div className="selected-header-left">
                  <span className="selected-kind-icon crown" style={{ background: '#2563eb', color: '#fff' }}>
                    <Zap size={16} />
                  </span>
                  <div className="selected-title-group">
                    <span className="selected-title" style={{ color: '#1d4ed8', fontWeight: 800 }}>
                      ВСЯ АРМИЯ ВЫБРАНА
                    </span>
                    <span className="selected-number">
                      {game.towers.filter((t) => t.team === 'you').length} фортов
                    </span>
                  </div>
                </div>
                <div className="selected-header-right">
                  <button
                    className="selected-close-btn"
                    title="Снять выбор (Esc)"
                    aria-label="Снять выбор"
                    onClick={() => setSelectAllMode(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : source ? (
              <>
                <div className="selected-header-left">
                  <span className={`selected-kind-icon ${source.home ? 'crown' : source.kind}`}>
                    {source.home ? (
                      <Crown size={16} />
                    ) : source.kind === 'barracks' ? (
                      <Users size={16} />
                    ) : source.kind === 'gold' ? (
                      <Coins size={16} />
                    ) : source.kind === 'lumber' ? (
                      <Trees size={16} />
                    ) : source.kind === 'relay' ? (
                      <Radio size={16} />
                    ) : source.kind === 'supply' ? (
                      <Package size={16} />
                    ) : (
                      <Shield size={16} />
                    )}
                  </span>
                  <div className="selected-title-group">
                    <span className="selected-title">
                      {source.home ? 'Штаб' : KIND_LABEL[source.kind]}
                    </span>
                    <span className="selected-number">№{source.id + 1}</span>
                  </div>
                </div>

                <div className="selected-header-right">
                  <span className="selected-chip count" title="Гарнизон">
                    <Users size={13} strokeWidth={2.4} />
                    <b>{Math.floor(source.count)}</b>
                  </span>
                  <span className="selected-chip level" title="Уровень башни">
                    ур.{source.level}
                  </span>
                  <button
                    className="selected-close-btn"
                    title="Снять выбор"
                    aria-label="Снять выбор"
                    onClick={() => setSelected(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </>
            ) : (
              <span className="empty-selection-hint">Выберите башню</span>
            )}
          </div>

          {!source && (
            <div className="select-all-action-row">
              <button
                className={`select-all-toggle-btn ${selectAllMode ? 'active' : ''}`}
                title="Выбрать все свои форты для синхронного штурма (горячая клавиша: A)"
                onClick={() => {
                  setSelectAllMode((prev) => !prev);
                  playSelect();
                }}
              >
                <Zap size={13} strokeWidth={2.4} />
                <span>{selectAllMode ? 'Отменить выбор всех (Esc)' : 'Все форты (A)'}</span>
              </button>
            </div>
          )}
          {source && (
            <>
              <div className="compact-row segmented">
                <button
                  className={routeMode && !scoutMode ? 'active' : ''}
                  onClick={() => {
                    setRouteMode(true);
                    setScoutMode(false);
                    playSelect();
                  }}
                  title="Автопоток: войска отправляются непрерывно в выбранную цель"
                >
                  ↻ Авто
                </button>
                <button
                  className={!routeMode && !scoutMode ? 'active' : ''}
                  onClick={() => {
                    setRouteMode(false);
                    setScoutMode(false);
                    playSelect();
                  }}
                  title="Разовая атака: отправить часть войск один раз"
                >
                  ➜ Разово
                </button>
                <button
                  className={scoutMode ? 'active' : ''}
                  title="Разведка: 20 золота, 10 дерева — открыть туман войны на карте"
                  disabled={
                    money.gold < 20 ||
                    money.resources < 10 ||
                    paused ||
                    help ||
                    !!game.result
                  }
                  onClick={() => {
                    setScoutMode(!scoutMode);
                    playSelect();
                  }}
                >
                  <Eye size={13} style={{ marginRight: 3 }} /> Разведка
                </button>
              </div>

              <div className="action-hint-bar">
                {scoutMode ? (
                  <span>👁 <b>Разведка активна:</b> выберите точку на карте для обзора</span>
                ) : routeMode ? (
                  <span>↻ <b>Автопоток:</b> кликните башню-цель для постоянного маршрута</span>
                ) : (
                  <span>➜ <b>Разовая атака:</b> кликните цель для отправки отряда ({fraction * 100}%)</span>
                )}
              </div>

              {!routeMode && !scoutMode && (
                <div className="fraction-row">
                  <small>Отряд:</small>
                  <div className="compact-row segmented">
                    {[0.5, 1].map((n) => (
                      <button
                        key={n}
                        className={fraction === n ? 'active' : ''}
                        onClick={() => {
                          setFraction(n);
                          playSelect();
                        }}
                      >
                        {n === 0.5 ? '50% (половина)' : '100% (все)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="compact-row upgrade-row">
                <button
                  className="upgrade-button"
                  title={`Вместимость ${capacity(source)} · группа ${groupSize(source)}`}
                  disabled={
                    source.level >= 5 ||
                    money.gold < cost!.gold ||
                    money.resources < cost!.resources ||
                    paused ||
                    help ||
                    !!game.result
                  }
                  onClick={() => {
                    dispatchPlayerAction({ kind: 'UPGRADE', towerId: source.id });
                    playSelect();
                  }}
                >
                  <span className="upgrade-icon-wrap">
                    <ArrowUp size={18} strokeWidth={3} />
                  </span>
                  <div className="upgrade-info">
                    <b className="upgrade-title">
                      {source.level >= 5 ? 'Башня MAX' : `Башня ур.${source.level + 1}`}
                    </b>
                    {source.level >= 5 ? (
                      <span className="cost-tag max">MAX ур.5</span>
                    ) : (
                      <div className="upgrade-cost-row">
                        <span className="cost-tag gold">
                          <Coins size={13} /> {cost!.gold}
                        </span>
                        <span className="cost-tag wood">
                          <Trees size={13} /> {cost!.resources}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                {hasCannon(source) && (
                  <button
                    className="upgrade-button cannon-upgrade"
                    title={`Урон ${cannon(source).damage} · перезарядка ${cannon(source).interval.toFixed(1)} с`}
                    disabled={
                      cannon(source).level >= 5 ||
                      money.gold < gunCost!.gold ||
                      money.resources < gunCost!.resources ||
                      paused ||
                      help ||
                      !!game.result
                    }
                    onClick={() => {
                      dispatchPlayerAction({ kind: 'UPGRADE_CANNON', towerId: source.id });
                      playSelect();
                    }}
                  >
                    <span className="upgrade-icon-wrap cannon">
                      <Crosshair size={18} strokeWidth={2.5} />
                    </span>
                    <div className="upgrade-info">
                      <b className="upgrade-title">
                        {cannon(source).level >= 5 ? 'Пушка MAX' : `Пушка ур.${cannon(source).level + 1}`}
                      </b>
                      {cannon(source).level >= 5 ? (
                        <span className="cost-tag max">MAX ур.5</span>
                      ) : (
                        <div className="upgrade-cost-row">
                          <span className="cost-tag gold">
                            <Coins size={13} /> {gunCost!.gold}
                          </span>
                          <span className="cost-tag wood">
                            <Trees size={13} /> {gunCost!.resources}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </div>

              {auto && (
                <button
                  className="cancel-route-btn"
                  disabled={paused || help || !!game.result}
                  onClick={() => {
                    dispatchPlayerAction({ kind: 'AUTOMATION', from: source.id, to: null });
                    playBeep();
                  }}
                >
                  <X size={14} /> Отменить маршрут → №{auto.to + 1}
                </button>
              )}

              {/* Always-visible prominent stats banner */}
              <div className="tower-quick-stats">
                {production(source) > 0 ? (
                  <div className="quick-stat-card troop">
                    <span className="quick-stat-icon troop">
                      <Users size={18} strokeWidth={2.4} />
                    </span>
                    <div className="quick-stat-content">
                      <span className="quick-stat-label">Набор пехоты</span>
                      <b className="quick-stat-value">+{production(source).toFixed(1)} <small>/ сек</small></b>
                    </div>
                  </div>
                ) : (
                  <div className="quick-stat-card resource">
                    <span className="quick-stat-icon resource">
                      <Pickaxe size={18} strokeWidth={2.4} />
                    </span>
                    <div className="quick-stat-content">
                      <span className="quick-stat-label">Добыча ресурсов</span>
                      <div className="quick-stat-val-row">
                        <b className="quick-stat-value">
                          +{(income(source).gold + income(source).resources).toFixed(1)} <small>/ сек</small>
                        </b>
                        <span className="quick-stat-workers">
                          ({workers(source)} раб.)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {source.specialty && (
                  <div className="quick-stat-specialty">
                    <Sparkles size={13} />
                    <span>{SPECIALTIES[source.specialty]}</span>
                  </div>
                )}
              </div>

              {!source.specialty && (
                <details className="specialty-collapse-card">
                  <summary className="specialty-collapse-summary">
                    <div className="specialty-sum-left">
                      <Sparkles size={12} className="specialty-sparkle-icon" />
                      <span className="specialty-header-title">Специализация</span>
                      {source.level < 2 && (
                        <span className="specialty-req-badge">Ур. 2+</span>
                      )}
                    </div>
                    <div className="specialty-sum-right">
                      <span className="cost-combo-chip" title="Стоимость специализации: 80 золота, 60 древесины">
                        <Coins size={10} className="cost-chip-gold-icon" /> 80
                        <span className="cost-combo-sep">·</span>
                        <Trees size={10} className="cost-chip-wood-icon" /> 60
                      </span>
                      <ChevronRight size={12} className="specialty-arrow" />
                    </div>
                  </summary>

                  <div className="specialty-btn-grid">
                    {specialties(source).map((choice) => {
                      const isDisabled =
                        source.level < 2 ||
                        money.gold < 80 ||
                        money.resources < 60 ||
                        paused ||
                        help ||
                        !!game.result;
                      return (
                        <button
                          key={choice}
                          type="button"
                          className={`specialty-3d-btn ${choice} ${isDisabled ? 'disabled' : ''}`}
                          disabled={isDisabled}
                          title={
                            source.level < 2
                              ? 'Сначала улучшите башню до ур. 2'
                              : money.gold < 80 || money.resources < 60
                                ? 'Нужно 80 золота и 60 древесины'
                                : `Выбрать: ${SPECIALTIES[choice]}`
                          }
                          onClick={() => {
                            dispatchPlayerAction({ kind: 'SPECIALIZE', towerId: source.id, specialty: choice });
                            playCapture();
                          }}
                        >
                          <div className="spec-btn-icon-wrap">
                            {choice === 'economy' ? (
                              <Pickaxe size={13} strokeWidth={2.4} />
                            ) : choice === 'fortress' ? (
                              <Shield size={13} strokeWidth={2.4} />
                            ) : choice === 'swarm' ? (
                              <Users size={13} strokeWidth={2.4} />
                            ) : (
                              <Crosshair size={13} strokeWidth={2.4} />
                            )}
                          </div>
                          <div className="spec-btn-text-wrap">
                            <span className="spec-btn-name">{SPECIALTIES[choice]}</span>
                            <span className="spec-btn-desc">
                              {choice === 'economy'
                                ? 'Ресурсы ×1.75'
                                : choice === 'fortress'
                                  ? 'Орудие ×1.8'
                                  : choice === 'swarm'
                                    ? 'Прирост +60%'
                                    : 'Урон ×1.5'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}

              <div className="select-all-action-row">
                <button
                  className={`select-all-toggle-btn ${selectAllMode ? 'active' : ''}`}
                  title="Выбрать все свои форты для синхронного штурма (горячая клавиша: A)"
                  onClick={() => {
                    setSelectAllMode((prev) => !prev);
                    playSelect();
                  }}
                >
                  <Zap size={13} strokeWidth={2.4} />
                  <span>{selectAllMode ? 'Отменить выбор всех (Esc)' : 'Все форты (A)'}</span>
                </button>
              </div>

              <details className="advanced-controls">
                <summary>
                  <b>Тактика и гарнизон</b> {auto ? '· ↻ Маршрут активен' : ''} {source.specialty ? '· ★' : ''}
                </summary>

                {auto && (
                  <div className="automation-config-card">
                    <div className="auto-config-header">
                      <div className="auto-route-title">
                        <Repeat2 size={15} className="auto-route-icon" />
                        <span>Автомаршрут в башню <b>№{auto.to + 1}</b></span>
                      </div>
                      <span className="auto-target-name">{game.towers[auto.to]?.name || 'Здание'}</span>
                    </div>

                    <div className="auto-config-field">
                      <label className="field-label">Режим отправки бойцов:</label>
                      <div className="styled-select-wrap">
                        <select
                          aria-label="Приоритет маршрута"
                          value={auto.mode ?? 'assault'}
                          disabled={paused || help || !!game.result}
                          onChange={(e) =>
                            dispatchPlayerAction({
                              kind: 'AUTOMATION_CONFIG',
                              from: source.id,
                              mode: e.target.value as 'assault' | 'supply' | 'excess',
                              reserve: auto.reserve ?? 5,
                            })
                          }
                        >
                          <option value="assault">⚔️ Штурм (отправлять всех)</option>
                          <option value="supply">🛡️ Подкрепление (до 50 в цели)</option>
                          <option value="excess">📦 Избыток (при складе &gt;75%)</option>
                        </select>
                        <ChevronRight size={14} className="select-chevron" />
                      </div>
                      <small className="field-hint">
                        {auto.mode === 'supply'
                          ? 'Подкрепление: бойцы идут, пока в целевой башне меньше 50 гарнизона.'
                          : auto.mode === 'excess'
                            ? 'Избыток: отправка только при заполнении склада более чем на 75%.'
                            : 'Штурм: отправлять всех появляющихся бойцов на передовую.'}
                      </small>
                    </div>

                    <div className="auto-config-field">
                      <div className="field-title-row">
                        <label className="field-label">Неприкосновенный гарнизон:</label>
                        <span className="reserve-val-badge">
                          <Users size={13} strokeWidth={2.4} />
                          <b>{auto.reserve ?? 5}</b>
                        </span>
                      </div>
                      <div className="reserve-stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={paused || (auto.reserve ?? 5) <= 0}
                          onClick={() =>
                            dispatchPlayerAction({
                              kind: 'AUTOMATION_CONFIG',
                              from: source.id,
                              mode: auto.mode ?? 'assault',
                              reserve: Math.max(0, (auto.reserve ?? 5) - 5),
                            })
                          }
                        >
                          -5
                        </button>
                        <input
                          type="range"
                          className="custom-range"
                          min="0"
                          max={Math.max(10, capacity(source))}
                          step="5"
                          value={auto.reserve ?? 5}
                          disabled={paused || help || !!game.result}
                          onChange={(e) =>
                            dispatchPlayerAction({
                              kind: 'AUTOMATION_CONFIG',
                              from: source.id,
                              mode: auto.mode ?? 'assault',
                              reserve: Number(e.target.value),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={paused || (auto.reserve ?? 5) >= capacity(source)}
                          onClick={() =>
                            dispatchPlayerAction({
                              kind: 'AUTOMATION_CONFIG',
                              from: source.id,
                              mode: auto.mode ?? 'assault',
                              reserve: Math.min(capacity(source), (auto.reserve ?? 5) + 5),
                            })
                          }
                        >
                          +5
                        </button>
                      </div>
                      <small className="field-hint">
                        Башня оставит себе минимум {auto.reserve ?? 5} бойцов для защиты и не отдаст их в атаку.
                      </small>
                    </div>
                  </div>
                )}
              </details>
            </>
          )}
        </section>
      )}
            <div className="hud-notifications" aria-live="polite">
        <div className="battle-notice">
          <span className="notice-dot" />
          <p>{game.notice}</p>
          <span className="captured-count">
            <Flag size={15} />
            {yours.length} / {game.towers.length}
          </span>
        </div>
      {game.event && !game.event.claimed && (
        <button
          className="event-notice"
          onClick={() => focusPoint(game.event!.x, game.event!.y)}
        >
          {game.event.kind === 'deposit'
            ? '💎 Жила ×3'
            : game.event.kind === 'fortress'
              ? '⚑ Форт +50'
              : '💰 Караван'}{' '}
          · {Math.ceil(game.event.until - game.age)} с ↗
        </button>
      )}
      {game.spell && (
        <output className="spell-toast roulette-card-enhanced">
          <div className="roulette-disc-wrap">
            <div
              className={`roulette-disc ${game.spell.patch || game.spell.roll === 'disabled' ? 'settled' : ''} ${game.spell.debuff ? 'debuff' : game.spell.patch ? 'pure' : ''}`}
            >
              {game.spell.roll === 'debuff' ? '☠' : game.spell.patch ? '✦' : '🎲'}
            </div>
          </div>
          <div className="roulette-card-body">
            <div className="roulette-top-badge">
              <Sparkles size={13} className="roulette-sparkle" />
              <span>РУЛЕТКА ПРИКАЗОВ ЛИДЕРА</span>
            </div>
            <div className="roulette-status-line">
              <span className="roulette-caster" style={{ color: TEAMS[game.spell.team].color }}>
                {playerName(game, game.spell.team)}
              </span>
              <span className={`roulette-outcome-badge ${game.spell.debuff ? 'penalty' : 'pure'}`}>
                {game.spell.patch
                  ? game.spell.debuff
                    ? `⚠️ Штраф: ${game.spell.debuff.title}`
                    : '✓ Без штрафа (чистый приказ)'
                  : game.spell.roll === 'disabled'
                    ? 'Подготовка приказа'
                    : 'Вращение рулетки…'}
              </span>
            </div>
            <div className="roulette-prompt-hero">
              <div className="roulette-hero-badges">
                <span
                  className="roulette-hero-author"
                  style={{
                    borderColor: TEAMS[game.spell.team].color,
                    color: TEAMS[game.spell.team].color,
                  }}
                >
                  👑 {playerName(game, game.spell.team)}
                </span>
                <span className="roulette-hero-type">
                  {game.spell.prompt.startsWith('⚡') ? 'СОБЫТИЕ ЭРЫ' : 'УКАЗ ВЛАСТЕЛИНА'}
                </span>
              </div>
              <div className="roulette-hero-text">
                {game.spell.patch
                  ? describeDecree(game.spell.patch)[0] || game.spell.prompt
                  : game.spell.prompt}
              </div>
            </div>
            <div className="roulette-countdown-bar">
              <small>
                {game.spell.patch
                  ? `Вступает в силу через ${Math.max(0, Math.ceil((game.spell.castAt ?? game.age) - game.age))} с (удержите цитадель)`
                  : 'Бой продолжается…'}
              </small>
            </div>
            {game.spell.debuff && (
              <p className="roulette-debuff-desc">⚠️ {game.spell.debuff.description}</p>
            )}
          </div>
        </output>
      )}
      {(game.curses ?? [])
        .filter((c) => c.team === 'you')
        .map((c, i) => (
          <div
            className="curse-toast"
            key={`${c.at}-${i}`}
            title={c.debuff.description}
          >
            ☠ {c.debuff.title} ·{' '}
            {Math.ceil(
              Math.max(
                ...c.debuff.effects.map((e) => c.at + e.duration - game.age),
              ),
            )}{' '}
            с
          </div>
        ))}

      </div>
      {game.minesweeper && game.age < game.minesweeper.until && (
        <aside className="replay-mines" aria-label="Сапёр соперников">
          {game.minesweeper.boards.map(board => {
            const elapsed = game.age-game.minesweeper!.start;
            const done = game.age >= board.finish;
            const mines = [3,11,17,22];
            const safe = Array.from({length:25},(_,i)=>i).filter(i=>!mines.includes(i));
            const opened = new Set(safe.slice(0, done && !board.failed ? 21 : Math.min(20,Math.floor(elapsed/(board.finish-game.minesweeper!.start)*21))));
            return <section key={board.team} className={done ? board.failed ? 'failed' : 'solved' : ''} style={{borderColor:TEAMS[board.team].color}}>
              <b style={{color:TEAMS[board.team].color}}>{playerName(game,board.team)}</b>
              <small>{done ? board.failed ? '💥 Мина · база уничтожена' : '✓ Поле пройдено' : `Сапёр · ${Math.max(0,Math.ceil(30-elapsed))} с`}</small>
              <div className="mine-grid">{Array.from({length:25},(_,i)=> {
                const n=mines.filter(m=>Math.abs(m%5-i%5)<=1 && Math.abs(Math.floor(m/5)-Math.floor(i/5))<=1).length;
                return <span key={i} className={opened.has(i) ? 'open' : ''}>{done && mines.includes(i) ? board.failed ? '💣' : '⚑' : opened.has(i) ? n || '' : ''}</span>;
              })}</div>
            </section>;
          })}
        </aside>
      )}
      {game.replayRoulette && game.replayRoulette.until > game.age && (
        <aside className={`rival-roulette ${game.replayRoulette.stage}`}>
          <div
            className={`roulette-disc ${game.replayRoulette.stage === 'spinning' ? '' : 'settled'}`}
          >
            {game.replayRoulette.stage === 'spinning' ? '?' : '☠'}
          </div>
          <div>
            <b>
              {game.replayRoulette.stage === 'spinning'
                ? 'Рулетка · 50 / 50'
                : game.replayRoulette.stage === 'submissions'
                  ? 'Соперники вводят дебаффы'
                  : 'Выбран дебафф'}
            </b>
            {game.replayRoulette.entries.map((entry, i) =>
              game.replayRoulette!.stage === 'submissions' &&
              (recording?.typing.find(
                (t) => t.team === entry.team && t.kind === 'debuff',
              )?.end ?? 0) > game.age ? null : (
                <p
                  key={entry.team}
                  className={
                    i === game.replayRoulette!.selected ? 'chosen' : ''
                  }
                >
                  <strong style={{ color: TEAMS[entry.team].color }}>
                    {playerName(game, entry.team)}:
                  </strong>{' '}
                  {entry.text}
                </p>
              ),
            )}
          </div>
        </aside>
      )}
      {!game.spell && game.announcement && game.announcement.until > game.age && (
        <output
          key={`${game.announcement.team}-${game.announcement.until}`}
          className="center-prompt"
        >
          <div className="center-prompt-badge-row">
            <span
              className="center-prompt-author-tag"
              style={{
                borderColor: TEAMS[game.announcement.team].color,
                color: TEAMS[game.announcement.team].color,
              }}
            >
              👑 {playerName(game, game.announcement.team)}
            </span>
            <span className="center-prompt-type-tag">
              {game.announcement.text.startsWith('⚡') ? 'СОБЫТИЕ ЭРЫ' : 'УКАЗ ВЛАСТЕЛИНА'}
            </span>
          </div>
          <div className="center-prompt-text-content">
            {game.announcement.text}
          </div>
        </output>
      )}
      {recording && (
        <>
          <div className="replay-chapter">
            <b>{chapter?.title}</b>
          </div>
          {recordedTyping && (
            <section className="wish-panel granted replay-typing">
              <div className="wish-heading">
                <h2>
                  {playerName(game, recordedTyping.team)} ·{' '}
                  Приказ
                </h2>
              </div>
              <div className="wish-input">
                <textarea
                  aria-label="Записанный ввод игрока"
                  readOnly
                  rows={2}
                  value={recordedTyping.text.slice(
                    0,
                    Math.floor(
                      recordedTyping.text.length *
                        Math.min(
                          1,
                          (game.age - recordedTyping.start) /
                            (recordedTyping.end - recordedTyping.start - 0.8),
                        ),
                    ),
                  )}
                />
                <button disabled>
                  <Send size={17} />{' '}
                  Исполнить
                </button>
              </div>
              <small>Игрок печатает…</small>
            </section>
          )}
          <div className="replay-controls">
            <button
              aria-label={paused ? 'Продолжить запись' : 'Приостановить запись'}
              onClick={() => {
                if (game.age >= recording.duration) seekRecording(0);
                setPaused(!paused);
              }}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <span>
              {Math.floor(game.age / 60)}:
              {String(Math.floor(game.age % 60)).padStart(2, '0')} /{' '}
              {Math.floor(recording.duration / 60)}:
              {String(recording.duration % 60).padStart(2, '0')}
            </span>
            <input
              aria-label="Перемотка записи"
              type="range"
              min={0}
              max={recording.duration}
              step={1}
              value={game.age}
              onChange={(e) => seekRecording(Number(e.target.value))}
            />
            <select
              aria-label="Скорость записи"
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(Number(e.target.value))}
            >
              {[0.5, 1, 2, 4].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
            <button
              className={autoCamera ? 'active' : ''}
              title="Автоматическая камера"
              aria-pressed={autoCamera}
              onClick={() => setAutoCamera(!autoCamera)}
            >
              Камера
            </button>
            <button aria-label="Закрыть запись" onClick={leaveRecording}>
              <X size={18} />
            </button>
          </div>
          {game.result && (
            <div className="replay-winner">
              🏆{' '}
              {game.result && game.result !== 'draw'
                ? playerName(game, game.result)
                : ''}{' '}
              побеждает!
            </div>
          )}
        </>
      )}
      {!recording && (
        <section
          className={`wish-panel ${game.authority === 'you' || messageMode ? 'granted' : 'locked'}`}
        >
          <div className="wish-heading">
            <span className="wish-medal">
              {game.authority === 'you' || messageMode ? <Sparkles /> : <LockKeyhole />}
            </span>
            <div>
              <span className="eyebrow">ПРАВО ЛИДЕРА</span>
              <h2>
                {game.result
                  ? 'Битва завершена'
                  : messageMode
                    ? 'Ваш приказ · 10 секунд'
                    : developing
                      ? `Приказы через ${Math.floor(developmentLeft / 60)}:${String(developmentLeft % 60).padStart(2, '0')}`
                      : game.authority === 'you'
                        ? 'Ваш приказ · 10 секунд'
                        : game.authority
                          ? `Лидер: ${playerName(game, game.authority)}`
                          : 'Обгони соперников по заработку'}
              </h2>
            </div>
            <span className="wish-status">
              {game.authority === 'you' || messageMode
                ? '👑 ВАША ВЛАСТЬ'
                : `${Math.floor(money.earned)} ОЧКОВ ЭКОНОМИКИ`}
            </span>
          </div>
          {(messageMode || (!developing && game.authority === 'you')) &&
          !game.result ? (
            <form onSubmit={submitPrompt}>
              <label htmlFor="wish">
                Меняй армии и правила. Нельзя только объявить «я победил».
              </label>
              <div className="wish-input">
                <textarea
                  id="wish"
                  value={draft}
                  disabled={paused || help || busy || !!game.spell}
                  onPaste={blockPaste}
                  onDrop={blockPaste}
                  onDragOver={(e) => e.preventDefault()}
                  onBeforeInput={(e) => {
                    if (
                      [
                        'insertFromPaste',
                        'insertFromDrop',
                        'insertFromYank',
                      ].includes((e.nativeEvent as InputEvent).inputType)
                    )
                      blockPaste(e);
                  }}
                  onKeyDown={(e) => {
                    if (
                      ((e.ctrlKey || e.metaKey) &&
                        e.key.toLowerCase() === 'v') ||
                      (e.shiftKey && e.key === 'Insert')
                    ) {
                      blockPaste(e);
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!paused && !help && !busy && !game.spell && draft.trim()) {
                        submitPrompt(e as unknown as React.FormEvent);
                      }
                    }
                  }}
                  onChange={(e) => {
                    if (!typingDeadline) {
                      setTypingDeadline(Date.now() + 20000);
                      setTypingSeconds(20);
                    }
                    if (promptIsError) setPromptIsError(false);
                    if (promptMessage) setPromptMessage('');
                    setDraft(e.target.value);
                  }}
                  maxLength={350}
                  rows={2}
                  placeholder="Введите приказ…"
                />
                <button
                  type="submit"
                  disabled={
                    paused || help || busy || !!game.spell || !draft.trim()
                  }
                >
                  <Send size={20} />
                  {busy ? 'Колдуем…' : 'ИСПОЛНИТЬ'}
                </button>
              </div>
              <div className="wish-meta">
                <span>
                  {busy
                    ? 'Бой продолжается. Удерживайте лидерство…'
                    : provider === 'mistral'
                      ? 'Желание понимает ИИ'
                      : provider === 'loading'
                        ? 'Проверяем связь…'
                        : 'Простые приказы · ИИ ещё не подключён'}
                </span>
                <span
                  className={`typing-clock ${typingSeconds <= 3 ? 'urgent' : ''}`}
                >
                  {busy
                    ? 'Приказ отправлен'
                    : typingDeadline
                      ? `${typingSeconds.toFixed(1)} с`
                      : '10 с на ввод · без вставки'}{' '}
                  · {draft.length}/350
                </span>
              </div>
              <div className="wish-examples">
                <span>Попробуй:</span>
                {[
                  'Все красные теперь мои',
                  'Уничтожь красных',
                  'Заморозь врагов на 30 секунд',
                ].map((text) => (
                  <span key={text}>{text}</span>
                ))}
              </div>
            </form>
          ) : (
            <p className="locked-description">
              {developing
                ? 'Добывайте и доставляйте ресурсы в штаб'
                : 'Право у лидера по заработку'}
            </p>
          )}
          {promptMessage && (
            <div
              className={`prompt-feedback-card ${promptIsError ? 'error' : 'success'}`}
              role="alert"
            >
              <div className="feedback-card-header">
                <span className="feedback-badge-icon">{promptIsError ? '⚠️' : '✓'}</span>
                <b>{promptIsError ? 'Ошибка исполнения приказа' : 'Статус приказа'}</b>
                <button
                  type="button"
                  className="feedback-dismiss-btn"
                  onClick={() => setPromptMessage('')}
                  title="Скрыть"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="feedback-card-body">{promptMessage}</p>
              {promptIsError && (
                <div className="feedback-quick-hints">
                  <small>💡 Рабочие примеры (нажмите для вставки):</small>
                  <div className="feedback-chip-row">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft('Все красные теперь мои');
                        setPromptMessage('');
                        setPromptIsError(false);
                      }}
                    >
                      «Все красные мои»
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft('+50 бойцов в штаб');
                        setPromptMessage('');
                        setPromptIsError(false);
                      }}
                    >
                      «+50 бойцов в штаб»
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft('Заморозь врагов на 20 секунд');
                        setPromptMessage('');
                        setPromptIsError(false);
                      }}
                    >
                      «Заморозь врагов»
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {game.decreeLog[0] && (
            <div className="last-decree">
              <Sparkles size={14} />
              <span>
                Последний указ:{' '}
                <b style={{ color: TEAMS[game.decreeLog[0].team].color }}>
                  {playerName(game, game.decreeLog[0].team)}
                </b>{' '}
                · {game.decreeLog[0].text}
              </span>
            </div>
          )}
        </section>
      )}
      <footer className="tips">
        <span>
          <span className={game.orders ? 'step complete' : 'step'}>
            {game.orders ? <Check size={13} /> : 1}
          </span>{' '}
          Отправьте первый отряд
        </span>
        <ChevronRight size={14} />
        <span>
          <span
            className={
              yours.some((t) => t.kind === 'supply') ? 'step complete' : 'step'
            }
          >
            2
          </span>{' '}
          Захватите снабжение
        </span>
        <ChevronRight size={14} />
        <span>
          <span className={game.result === 'you' ? 'step complete' : 'step'}>
            3
          </span>{' '}
          Подчините долину
        </span>
        <small>Противники — боты</small>
      </footer>
    </main>
  );
}
