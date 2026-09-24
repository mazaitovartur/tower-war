import { validDebuff, type Debuff } from './magic';
import { validDecree, type Decree, type Target } from './decrees';
export type Team = 'you' | 'red' | 'purple' | 'green';
export type Kind =
  | 'tower'
  | 'supply'
  | 'relay'
  | 'gold'
  | 'lumber'
  | 'barracks';
export type Tower = {
  id: number;
  x: number;
  y: number;
  team: Team | null;
  count: number;
  kind: Kind;
  home?: Team;
  level: number;
  name: string;
  gunLevel?: number;
  shotAt?: number;
  ruinedAt?: number;
  aim?: number;
  idleAim?: number;
  idleSince?: number;
  specialty?: Specialty;
  stockGold?: number;
  stockWood?: number;
  caravanAt?: number;
};
export type Point = { x: number; y: number };
export type Troop = {
  id: number;
  team: Team;
  from: number;
  to: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  progress: number;
  delay: number;
  speech: string;
  cargo: boolean;
  strength: number;
  elite?: boolean;
  scoutUntil?: number;
  arrivedAt?: number;
  waypoint?: { x: number; y: number };
  path?: Point[];
  haul?: { gold: number; resources: number };
  stolenAt?: number;
};
export type Route = { from: number; to: number; team: Team; until: number };
export type Automation = {
  from: number;
  to: number;
  team: Team;
  nextAt: number;
  reserve?: number;
  mode?: 'assault' | 'supply' | 'excess';
};
export type Wallet = { gold: number; resources: number; earned: number };
export type Shot = {
  id: number;
  from: number;
  team: Team;
  x: number;
  y: number;
  at: number;
  sx?: number;
  sy?: number;
  target?: number;
  damage?: number;
  duration?: number;
  hit?: boolean;
};
export type Clash = {
  id: number;
  x: number;
  y: number;
  at: number;
  teamA: Team;
  teamB: Team;
};
export type Specialty = 'economy' | 'fortress' | 'swarm' | 'elite';
export type Spell = {
  team: Team;
  epoch: number;
  prompt: string;
  startedAt: number;
  castAt?: number;
  patch?: Decree;
  debuff?: Debuff | null;
  roll?: string;
};
export type MapEvent = {
  kind: 'deposit' | 'fortress' | 'caravan';
  x: number;
  y: number;
  target?: number;
  until: number;
  claimed?: Team;
};
export type Game = {
  humanTeams?: Team[];
  minesweeper?: { start: number; until: number; boards: { team: Team; finish: number; failed: boolean }[] };
  explosions?: { id: number; at: number }[];
  inputLocked?: Partial<Record<Team, boolean>>;
  players?: Partial<Record<Team, string>>;
  labels?: Partial<Record<Team, string>>;
  partyUntil?: number;
  screenShakeUntil?: number;
  blackholeUntil?: number;
  blizzardUntil?: number;
  polymorphUntil?: number;
  peaceUntil?: number;
  alienUntil?: number;
  titansUntil?: number;
  lightningStrikes?: { id: number; at: number }[];
  burningRule?: { team: Team; until: number };
  replayRoulette?: {
    stage: 'spinning' | 'submissions' | 'chosen';
    entries: { team: Team; text: string }[];
    selected?: number;
    until: number;
  };
  messages?: { team: Team; text: string; until: number }[];
  hideMessages?: boolean;
  announcement?: { team: Team; text: string; until: number };
  messageSentAt?: number;
  allowHeadquartersCapture?: boolean;
  shots?: Shot[];
  clashes?: Clash[];
  spell?: Spell;
  curses?: { team: Team; debuff: Debuff; at: number }[];
  event?: MapEvent;
  eventAt?: number;
  eventIndex?: number;
  towers: Tower[];
  troops: Troop[];
  routes: Route[];
  automation: Automation[];
  wallets: Record<Team, Wallet>;
  age: number;
  elapsed: number;
  botAt: number;
  supplyAt: number;
  nextId: number;
  notice: string;
  captures: number;
  orders: number;
  result: Team | 'draw' | null;
  flash: number | null;
  authority: Team | null;
  authorityEpoch: number;
  leaderSince: number;
  botDecreeAt: number;
  growth: Record<Team, number>;
  speed: Record<Team, number>;
  frozen?: Partial<Record<Team, number>>;
  shielded?: Partial<Record<Team, number>>;
  decreeLog: { team: Team; text: string; at: number }[];
};
export const TEAMS = {
  you: { name: 'Я', color: '#4295ff' },
  red: { name: 'Бот 1', color: '#f27160' },
  purple: { name: 'Бот 2', color: '#a281ed' },
  green: { name: 'Бот 3', color: '#54c886' },
};
export function playerName(g: Game, team: Team) {
  return g.players?.[team] ?? TEAMS[team].name;
}
export const TEAM_IDS = Object.keys(TEAMS) as Team[];
export const DURATION = 720;
export const DEVELOPMENT_SECONDS = 120;
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1700;
const MOVE_SPEED = 2.2;
export const KIND_LABEL: Record<Kind, string> = {
  tower: 'Форт',
  gold: 'Золотая шахта',
  lumber: 'Лесопилка',
  barracks: 'Казарма',
  supply: 'Снабжение',
  relay: 'Радиовышка',
};
const record = <T>(make: (team: Team) => T) =>
  Object.fromEntries(TEAM_IDS.map((t) => [t, make(t)])) as Record<Team, T>;
// ========================================================
// 1-to-1 MAP COLLISION & TERRAIN ROUTING FROM mask.jpeg
// ========================================================
import {
  isPointInRockMask,
  lineIntersectsRockMask,
  findRouteThroughMask,
} from './map-collision-mask';

export function isPointInRock(x: number, y: number, marginCells = 2): boolean {
  if (x < 8 || x > 92 || y < 8 || y > 92) return true;
  return isPointInRockMask(x, y, marginCells);
}

export function lineIntersectsRock(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  marginCells = 0,
): boolean {
  return lineIntersectsRockMask(x1, y1, x2, y2, marginCells);
}

export function findRoute(start: Point, dest: Point): Point[] {
  return findRouteThroughMask(start, dest);
}

export function getPathLength(path: Point[]): number {
  let len = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dy = (path[i + 1].y - path[i].y) * (WORLD_HEIGHT / WORLD_WIDTH);
    len += Math.hypot(dx, dy);
  }
  return Math.max(0.1, len);
}

export function getPointOnPath(
  path: Point[],
  progress: number,
): { x: number; y: number; dirX: number; dirY: number } {
  if (path.length <= 1) {
    const pt = path[0] ?? { x: 50, y: 50 };
    return { x: pt.x, y: pt.y, dirX: 1, dirY: 0 };
  }
  if (progress <= 0) {
    const dirX = path[1].x - path[0].x;
    const dirY = path[1].y - path[0].y;
    return { x: path[0].x, y: path[0].y, dirX, dirY };
  }
  if (progress >= 1) {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    return { x: last.x, y: last.y, dirX: last.x - prev.x, dirY: last.y - prev.y };
  }

  const distances: number[] = [0];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dy = (path[i + 1].y - path[i].y) * (WORLD_HEIGHT / WORLD_WIDTH);
    total += Math.hypot(dx, dy);
    distances.push(total);
  }

  const targetDist = progress * total;
  for (let i = 0; i < path.length - 1; i++) {
    const dStart = distances[i];
    const dEnd = distances[i + 1];
    if (targetDist <= dEnd || i === path.length - 2) {
      const segLen = dEnd - dStart;
      const t = segLen > 0.0001 ? (targetDist - dStart) / segLen : 0;
      const p1 = path[i];
      const p2 = path[i + 1];
      return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        dirX: p2.x - p1.x,
        dirY: p2.y - p1.y,
      };
    }
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y, dirX: 1, dirY: 0 };
}

export function initialGame(): Game {
  const towers: Tower[] = [];
  // Center-to-center minimum distance in world pixels:
  // With 76x96 buildings, 165px gives at least 70-90px of clear grass between all buildings
  const MIN_BUILDING_DISTANCE_PX = 165;
  const isFarEnough = (x: number, y: number, distPx = MIN_BUILDING_DISTANCE_PX) =>
    towers.every((t) => {
      const dxPx = ((t.x - x) / 100) * WORLD_WIDTH;
      const dyPx = ((t.y - y) / 100) * WORLD_HEIGHT;
      return Math.hypot(dxPx, dyPx) >= distPx;
    });

  // 1. Procedural Placement for the 4 Team Bases with organic dynamic locations
  const quadrants = [
    { team: 'you' as Team,    name: 'Игрок', minX: 20, maxX: 34, minY: 42, maxY: 56 }, // West valley
    { team: 'red' as Team,    name: 'Бот 1', minX: 68, maxX: 80, minY: 36, maxY: 50 }, // East valley
    { team: 'purple' as Team, name: 'Бот 2', minX: 18, maxX: 36, minY: 76, maxY: 88 }, // SW glade & meadows
    { team: 'green' as Team,  name: 'Бот 3', minX: 64, maxX: 84, minY: 74, maxY: 88 }, // SE glade & meadows
  ];

  quadrants.forEach((q) => {
    let basePlaced = false;
    for (let tryHq = 0; tryHq < 200; tryHq++) {
      const bx = Math.round((q.minX + Math.random() * (q.maxX - q.minX)) * 10) / 10;
      const by = Math.round((q.minY + Math.random() * (q.maxY - q.minY)) * 10) / 10;
      if (isPointInRock(bx, by, 2) || !isFarEnough(bx, by, 180)) continue;

      let foundPair: { gx: number; gy: number; lx: number; ly: number } | null = null;
      for (let tryPair = 0; tryPair < 80; tryPair++) {
        const angG = Math.random() * Math.PI * 2;
        const dG = 6.8 + Math.random() * 2.8;
        const gx = Math.round((bx + Math.cos(angG) * dG) * 10) / 10;
        const gy = Math.round((by + Math.sin(angG) * dG) * 10) / 10;
        const distHQG = Math.hypot(((gx - bx) / 100) * WORLD_WIDTH, ((gy - by) / 100) * WORLD_HEIGHT);
        if (distHQG < MIN_BUILDING_DISTANCE_PX || isPointInRock(gx, gy, 2) || !isFarEnough(gx, gy, MIN_BUILDING_DISTANCE_PX)) continue;

        const angL = Math.random() * Math.PI * 2;
        const dL = 6.8 + Math.random() * 2.8;
        const lx = Math.round((bx + Math.cos(angL) * dL) * 10) / 10;
        const ly = Math.round((by + Math.sin(angL) * dL) * 10) / 10;
        const distHQL = Math.hypot(((lx - bx) / 100) * WORLD_WIDTH, ((ly - by) / 100) * WORLD_HEIGHT);
        const distGL = Math.hypot(((lx - gx) / 100) * WORLD_WIDTH, ((ly - gy) / 100) * WORLD_HEIGHT);
        if (
          distHQL < MIN_BUILDING_DISTANCE_PX ||
          distGL < MIN_BUILDING_DISTANCE_PX ||
          isPointInRock(lx, ly, 2) ||
          !isFarEnough(lx, ly, MIN_BUILDING_DISTANCE_PX)
        )
          continue;

        foundPair = { gx, gy, lx, ly };
        break;
      }

      if (foundPair) {
        // HQ Tower
        towers.push({
          id: towers.length,
          x: bx,
          y: by,
          kind: 'tower',
          count: 55,
          team: q.team,
          home: q.team,
          level: 1,
          name: `Штаб · ${TEAMS[q.team].name}`,
        });

        // Starter Gold Mine
        towers.push({
          id: towers.length,
          x: foundPair.gx,
          y: foundPair.gy,
          kind: 'gold',
          count: 12,
          team: null,
          level: 1,
          name: `Золотая шахта №${towers.length + 1}`,
        });

        // Starter Sawmill
        towers.push({
          id: towers.length,
          x: foundPair.lx,
          y: foundPair.ly,
          kind: 'lumber',
          count: 10,
          team: null,
          level: 1,
          name: `Лесопилка №${towers.length + 1}`,
        });

        basePlaced = true;
        break;
      }
    }
  });

  // 2. Procedural Placement of Neutral Buildings across North, South, and Central sectors
  const helperPlaceNeutral = (kind: Kind, minX: number, maxX: number, minY: number, maxY: number) => {
    for (let a = 0; a < 300; a++) {
      const cx = Math.round((minX + Math.random() * (maxX - minX)) * 10) / 10;
      const cy = Math.round((minY + Math.random() * (maxY - minY)) * 10) / 10;
      if (!isPointInRock(cx, cy, 2) && isFarEnough(cx, cy, MIN_BUILDING_DISTANCE_PX)) {
        const count =
          kind === 'tower'
            ? 22
            : kind === 'barracks'
              ? 18
              : kind === 'gold'
                ? 14
                : kind === 'lumber'
                  ? 12
                  : 15;
        towers.push({
          id: towers.length,
          x: cx,
          y: cy,
          kind,
          count,
          team: null,
          level: 1,
          name: `${KIND_LABEL[kind]} №${towers.length + 1}`,
        });
        break;
      }
    }
  };

  // 2a. Northern sector (upper mountain valleys & glades, y: 10..28)
  const northPool: Kind[] = ['tower', 'gold', 'lumber', 'barracks', 'supply', 'tower'];
  northPool.forEach((kind) => helperPlaceNeutral(kind, 14, 86, 10, 28));

  // 2b. Southern sector (southern meadows & trails, y: 74..90)
  const southPool: Kind[] = ['tower', 'gold', 'lumber', 'relay', 'supply', 'barracks'];
  southPool.forEach((kind) => helperPlaceNeutral(kind, 14, 86, 74, 90));

  // 2c. Central sector (main crossroads & tactical corridors, y: 28..72)
  const centerPool: Kind[] = ['tower', 'tower', 'tower', 'barracks', 'relay', 'gold', 'lumber', 'supply'];
  centerPool.forEach((kind) => helperPlaceNeutral(kind, 28, 72, 28, 72));
  return {
    humanTeams: ['you'],
    towers,
    troops: [],
    clashes: [],
    routes: [],
    automation: [],
    wallets: record(() => ({ gold: 60, resources: 40, earned: 0 })),
    age: 0,
    elapsed: 0,
    botAt: 10,
    supplyAt: 20,
    nextId: 1,
    notice: 'Захватите ближайшую шахту и лесопилку. Карту можно перетаскивать.',
    captures: 0,
    orders: 0,
    result: null,
    flash: null,
    authority: null,
    authorityEpoch: 0,
    leaderSince: 0,
    allowHeadquartersCapture: false,
    botDecreeAt: DEVELOPMENT_SECONDS + 12,
    growth: record(() => 1),
    speed: record(() => 1),
    decreeLog: [],
  };
}
export function workers(t: Tower) {
  return t.team ? Math.min(capacity(t), Math.max(0, Math.floor(t.count))) : 0;
}
export function hasCannon(t: Tower) {
  return t.ruinedAt === undefined && t.kind !== 'gold' && t.kind !== 'lumber';
}
export function cannonHeight(t: Tower) {
  return ['gold', 'lumber'].includes(t.kind) ? 55 : t.level >= 4 ? 97 : 85;
}
export function cannon(t: Tower) {
  const level = t.gunLevel ?? 1;
  return {
    level,
    damage: level * (t.specialty === 'fortress' ? 1.8 : 1),
    range: 180 + level * 30,
    interval: Math.max(0.8, 3 - level * 0.35),
  };
}
export function cannonCost(t: Tower) {
  const level = t.gunLevel ?? 1;
  return { gold: 40 * level, resources: 25 * level };
}
export function income(t: Tower) {
  const level = Math.max(1, t.level) * (t.specialty === 'economy' ? 1.75 : 1);
  return {
    gold: t.home
      ? 0.3 * level
      : t.kind === 'gold'
        ? workers(t) * 0.2 * level
        : 0,
    resources: t.home
      ? 0.2 * level
      : t.kind === 'lumber'
        ? workers(t) * 0.2 * level
        : 0,
  };
}
export function production(t: Tower) {
  return (
    (t.specialty === 'swarm' ? 1.6 : t.specialty === 'elite' ? 0.65 : 1) *
    (t.home
      ? 0.75 + t.level * 0.3
      : t.kind === 'barracks'
        ? 0.35 + t.level * 0.2
        : 0)
  );
}
export function capacity(t: Tower) {
  return 60 + t.level * 40 + (t.kind === 'tower' ? 40 : 0);
}
export function groupSize(t: Tower) {
  return Math.floor((10 + t.level * 5) * (t.specialty === 'swarm' ? 1.5 : 1));
}
export function upgradeCost(t: Tower) {
  return { gold: 50 * t.level, resources: 30 * t.level };
}
export function upgradeCannon(g: Game, id: number, actor: Team = 'you'): Game {
  const t = g.towers.find((t) => t.id === id);
  if (
    g.inputLocked?.[actor] ||
    !t ||
    !hasCannon(t) ||
    g.result ||
    t.team !== actor ||
    (t.gunLevel ?? 1) >= 5
  )
    return g;
  const cost = cannonCost(t),
    w = g.wallets[actor];
  if (w.gold < cost.gold || w.resources < cost.resources)
    return {
      ...g,
      notice: `Для пушки нужно ${cost.gold} золота и ${cost.resources} древесины.`,
    };
  return {
    ...g,
    towers: g.towers.map((b) =>
      b.id === id ? { ...b, gunLevel: (b.gunLevel ?? 1) + 1 } : b,
    ),
    wallets: {
      ...g.wallets,
      [actor]: {
        ...w,
        gold: w.gold - cost.gold,
        resources: w.resources - cost.resources,
      },
    },
    notice:
      actor === 'you'
        ? 'Пушка улучшена: больше урон и дальность, быстрее выстрелы.'
        : g.notice,
  };
}
export function teamIncome(g: Game, team: Team) {
  if ((g.frozen?.[team] ?? 0) > g.age) return { gold: 0, resources: 0 };
  return g.towers
    .filter((t) => t.team === team)
    .reduce(
      (sum, t) => ({
        gold:
          sum.gold +
          income(t).gold *
            modifier(g, team, 'income') *
            (g.event?.kind === 'deposit' && g.event.target === t.id ? 3 : 1),
        resources:
          sum.resources +
          income(t).resources *
            modifier(g, team, 'income') *
            (g.event?.kind === 'deposit' && g.event.target === t.id ? 3 : 1),
      }),
      { gold: 0, resources: 0 },
    );
}
export function dispatch(
  g: Game,
  from: number,
  to: number,
  fraction: number,
  cargo = false,
  limit = Infinity,
): Game {
  const source = g.towers.find((t) => t.id === from),
    target = g.towers.find((t) => t.id === to);
  if (
    !source?.team ||
    !target ||
    target.ruinedAt !== undefined ||
    source.ruinedAt !== undefined ||
    from === to ||
    g.result ||
    (g.frozen?.[source.team] ?? 0) > g.age
  )
    return g;

  if (target.home && target.team !== source.team && g.age < DEVELOPMENT_SECONDS) {
    return {
      ...g,
      notice: `🛡️ Вражеский штаб защищён щитом мира! До финальной эры: ${Math.ceil(DEVELOPMENT_SECONDS - g.age)} с.`,
    };
  }
  const amount = cargo
    ? 1
    : Math.floor(
        Math.min(limit, source.count * Math.min(1, Math.max(0, fraction))),
      );
  if (amount < 1) return g;
  const team = source.team,
    visualCount = Math.min(amount, 24);
  const route = findRoute({ x: source.x, y: source.y }, { x: target.x, y: target.y });
  const pathLen = getPathLength(route);
  const troops = Array.from(
    { length: visualCount },
    (_, i): Troop => ({
      id: g.nextId + i,
      strength: cargo
        ? 8 + source.level * 2
        : Math.floor(amount / visualCount) + (i < amount % visualCount ? 1 : 0),
      team,
      from,
      to,
      x: source.x,
      y: source.y,
      sx: source.x,
      sy: source.y,
      path: route,
      progress: 0,
      delay: i * 0.2,
      speech:
        i === 0
          ? cargo
            ? 'Подкрепление в пути!'
            : target.team === team
              ? 'Держитесь, мы идём!'
              : target.kind === 'gold'
                ? 'Золото будет нашим!'
                : target.kind === 'lumber'
                  ? 'Нужна древесина!'
                  : 'Выдвигаемся!'
          : '',
      cargo,
      elite: source.specialty === 'elite',
    }),
  );
  return {
    ...g,
    nextId: g.nextId + visualCount,
    towers: cargo
      ? g.towers
      : g.towers.map((t) =>
          t.id === from ? { ...t, count: t.count - amount } : t,
        ),
    troops: [...g.troops, ...troops],
    routes: [
      ...g.routes.filter((r) => r.from !== from || r.to !== to),
      {
        from,
        to,
        team,
        until:
          g.age +
          visualCount * 0.2 +
          pathLen / MOVE_SPEED +
          1,
      },
    ],
    orders: g.orders + (team === 'you' && !cargo ? 1 : 0),
  };
}
export function sendArmy(
  g: Game,
  from: number,
  to: number,
  fraction: number,
  actor: Team = 'you',
): Game {
  if (g.inputLocked?.[actor] || g.towers.find((t) => t.id === from)?.team !== actor)
    return g;
  const next = dispatch(g, from, to, fraction);
  return next === g
    ? g
    : {
        ...next,
        notice: actor === 'you' ? 'Отряд в пути. Перетаскивайте карту, чтобы следить за фронтом.' : next.notice,
      };
}
export function upgrade(g: Game, id: number, actor: Team = 'you'): Game {
  const t = g.towers.find((t) => t.id === id);
  if (
    g.inputLocked?.[actor] ||
    g.result ||
    !t ||
    t.team !== actor ||
    t.level >= 5
  )
    return g;
  const cost = upgradeCost(t),
    wallet = g.wallets[actor];
  if (wallet.gold < cost.gold || wallet.resources < cost.resources)
    return actor === 'you'
      ? {
          ...g,
          notice: `Нужно ${cost.gold} золота и ${cost.resources} древесины.`,
        }
      : g;
  return {
    ...g,
    wallets: {
      ...g.wallets,
      [actor]: {
        ...wallet,
        gold: wallet.gold - cost.gold,
        resources: wallet.resources - cost.resources,
      },
    },
    towers: g.towers.map((t) =>
      t.id === id ? { ...t, level: t.level + 1 } : t,
    ),
    notice:
      actor === 'you'
        ? `${t.name}: уровень ${t.level + 1}. Добыча, вместимость и размер групп увеличены.`
        : g.notice,
  };
}
export function setAutomation(
  g: Game,
  from: number,
  to: number | null,
  actor: Team = 'you',
): Game {
  const source = g.towers.find((t) => t.id === from);
  if (
    !source ||
    g.result ||
    g.inputLocked?.[actor] ||
    source.team !== actor ||
    to === from ||
    (to !== null && !g.towers.some((t) => t.id === to))
  )
    return g;

  if (to !== null) {
    const target = g.towers.find((t) => t.id === to);
    if (target?.home && target.team !== actor && g.age < DEVELOPMENT_SECONDS) {
      return {
        ...g,
        notice: `🛡️ Вражеский штаб защищён щитом мира! До финальной эры: ${Math.ceil(DEVELOPMENT_SECONDS - g.age)} с.`,
      };
    }
    const automation = g.automation.filter((a) => a.from !== from);
    automation.push({
      from,
      to,
      team: actor,
      nextAt: g.age + 1,
      reserve: ['gold', 'lumber'].includes(source.kind) ? 30 : 5,
      mode: g.towers[to].team === actor ? 'supply' : 'assault',
    });
    return {
      ...g,
      automation,
      notice: actor === 'you' ? `Маршрут → №${to + 1}` : g.notice,
    };
  }

  // to === null: Cancel route and recall troops!
  const automation = g.automation.filter((a) => a.from !== from);
  const routes = g.routes.filter((r) => !(r.from === from && r.team === actor));
  let recalledCount = 0;
  let refundedStrength = 0;
  const newTroops: Troop[] = [];

  for (const p of g.troops) {
    if (p.from === from && p.team === actor && !p.haul && !p.cargo && p.progress < 1) {
      if (p.delay > 0) {
        // Troop hasn't left the tower yet; refund directly to garrison
        refundedStrength += p.strength;
        continue;
      }
      recalledCount += p.strength;
      const currentPos = { x: p.x, y: p.y };
      const returnRoute = findRoute(currentPos, { x: source.x, y: source.y });
      newTroops.push({
        ...p,
        from: p.to,
        to: from,
        sx: p.x,
        sy: p.y,
        progress: 0,
        path: returnRoute,
        speech: 'Возвращаемся!',
      });
    } else {
      newTroops.push(p);
    }
  }

  const updatedTowers = refundedStrength > 0
    ? g.towers.map((t) => (t.id === from ? { ...t, count: t.count + refundedStrength } : t))
    : g.towers;

  return {
    ...g,
    automation,
    routes,
    towers: updatedTowers,
    troops: newTroops,
    notice:
      actor === 'you'
        ? recalledCount + refundedStrength > 0
          ? `Маршрут отменён: ${Math.round(recalledCount + refundedStrength)} воинов отозваны на базу.`
          : 'Автомаршрут отключён.'
        : g.notice,
  };
}
export const SPECIALTIES = {
  economy: 'Добыча ×1.75',
  fortress: 'Укрепление',
  swarm: 'Массовый набор',
  elite: 'Элитные бойцы',
};
export function specialties(t: Tower): Specialty[] {
  return t.home || t.kind === 'barracks'
    ? ['swarm', 'elite']
    : ['gold', 'lumber'].includes(t.kind)
      ? ['economy', 'fortress']
      : ['fortress'];
}
export function specialize(
  g: Game,
  id: number,
  choice: Specialty,
  actor: Team = 'you',
): Game {
  const t = g.towers.find((t) => t.id === id),
    w = g.wallets[actor];
  if (
    g.inputLocked?.[actor] ||
    g.result ||
    !t ||
    t.team !== actor ||
    t.level < 2 ||
    t.specialty ||
    !specialties(t).includes(choice) ||
    w.gold < 80 ||
    w.resources < 60
  )
    return g;
  return {
    ...g,
    towers: g.towers.map((b) =>
      b.id === id ? { ...b, specialty: choice } : b,
    ),
    wallets: {
      ...g.wallets,
      [actor]: { ...w, gold: w.gold - 80, resources: w.resources - 60 },
    },
    notice: SPECIALTIES[choice],
  };
}
export function configureAutomation(
  g: Game,
  from: number,
  mode: 'assault' | 'supply' | 'excess',
  reserve: number,
  actor: Team = 'you',
): Game {
  if (
    g.inputLocked?.[actor] ||
    g.result ||
    !Number.isFinite(reserve) ||
    !['assault', 'supply', 'excess'].includes(mode)
  )
    return g;
  return {
    ...g,
    automation: g.automation.map((a) =>
      a.from === from && a.team === actor
        ? {
            ...a,
            mode,
            reserve: Math.max(0, Math.min(1000, Math.floor(reserve))),
          }
        : a,
    ),
  };
}
export function modifier(
  g: Game,
  team: Team,
  stat: Debuff['effects'][number]['stat'],
) {
  return (g.curses ?? [])
    .filter((c) => c.team === team)
    .reduce(
      (n, c) =>
        n *
        c.debuff.effects
          .filter((e) => e.stat === stat && c.at + e.duration > g.age)
          .reduce((m, e) => m * e.factor, 1),
      1,
    );
}
export function messageOpportunity(g: Game, actor: Team = 'you') {
  const cycle = Math.floor((g.age - 45) / 80);
  return (
    !g.result &&
    !g.hideMessages &&
    !g.inputLocked?.[actor] &&
    g.towers.some((t) => t.home && t.team === actor) &&
    !g.spell &&
    g.age >= 45 &&
    (g.age - 45) % 80 < 20 &&
    (g.messageSentAt === undefined ||
      Math.floor((g.messageSentAt - 45) / 80) !== cycle)
  );
}
export function sendMessage(g: Game, team: Team, text: string): Game {
  if (
    g.inputLocked?.[team] ||
    g.result ||
    g.hideMessages ||
    !text.trim() ||
    !g.towers.some((t) => t.home && t.team === team)
  )
    return g;
  return {
    ...g,
    messages: [
      ...(g.messages ?? []).filter((m) => m.team !== team && m.until > g.age),
      { team, text: text.trim().slice(0, 350), until: g.age + 10 },
    ],
    messageSentAt: team === 'you' ? g.age : g.messageSentAt,
  };
}
export function announcePrompt(g: Game, team: Team, text: string): Game {
  return {
    ...g,
    announcement: { team, text: text.slice(0, 350), until: g.age + 4.5 },
  };
}
export function startSpell(
  g: Game,
  team: Team,
  prompt: string,
  roll = 'disabled',
): Game {
  if (g.inputLocked?.[team] || g.result || g.spell || leader(g) !== team)
    return g;
  return {
    ...announcePrompt(g, team, prompt),
    spell: {
      team,
      epoch: g.authorityEpoch,
      prompt: prompt.slice(0, 350),
      startedAt: g.age,
      roll,
    },
  };
}
export function readySpell(
  g: Game,
  patch: Decree,
  epoch: number,
  debuff: Debuff | null,
  roll: string,
): Game {
  if (
    !g.spell ||
    g.spell.epoch !== epoch ||
    g.authorityEpoch !== epoch ||
    leader(g) !== g.spell.team ||
    !validDecree(patch) ||
    (debuff !== null && !validDebuff(debuff))
  )
    return g;
  return {
    ...g,
    spell: {
      ...g.spell,
      patch,
      debuff,
      roll,
      castAt:
        Math.max(g.age, g.spell.startedAt + (roll === 'disabled' ? 0 : 3)) + 6,
    },
    notice: debuff
      ? `${debuff.title}: ${debuff.description}`
      : 'Приказ готовится · удержите лидерство 6 с',
  };
}
export function sendScout(
  g: Game,
  from: number,
  x: number,
  y: number,
  actor: Team = 'you',
): Game {
  const t = g.towers.find((t) => t.id === from),
    w = g.wallets[actor];
  if (
    g.inputLocked?.[actor] ||
    g.result ||
    !t ||
    t.team !== actor ||
    w.gold < 20 ||
    w.resources < 10 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    g.troops.filter((p) => p.team === actor && p.scoutUntil).length >= 3
  )
    return g;
  const dest = {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y)),
  };
  const route = findRoute({ x: t.x, y: t.y }, dest);
  return {
    ...g,
    nextId: g.nextId + 1,
    wallets: {
      ...g.wallets,
      [actor]: { ...w, gold: w.gold - 20, resources: w.resources - 10 },
    },
    troops: [
      ...g.troops,
      {
        id: g.nextId,
        team: actor,
        from,
        to: from,
        x: t.x,
        y: t.y,
        sx: t.x,
        sy: t.y,
        path: route,
        progress: 0,
        delay: 0,
        speech: 'Разведаю местность!',
        cargo: false,
        strength: 3,
        scoutUntil: g.age + 120,
        waypoint: dest,
      },
    ],
    notice: 'Разведчик в пути · обзор местности',
  };
}
export function economicLeader(g: Game): Team | null {
  const ranked = TEAM_IDS.filter((team) =>
    g.towers.some((t) => t.team === team),
  )
    .map((team) => ({ team, n: Math.floor(g.wallets[team].earned) }))
    .sort((a, b) => b.n - a.n);
  return ranked.length && (ranked.length === 1 || ranked[0].n > ranked[1].n)
    ? ranked[0].team
    : null;
}
export function leader(g: Game): Team | null {
  return g.age < DEVELOPMENT_SECONDS ? null : economicLeader(g);
}
export function refreshAuthority(g: Game): Game {
  const next = leader(g);
  return next === g.authority
    ? g
    : {
        ...g,
        authority: next,
        authorityEpoch: g.authorityEpoch + 1,
        leaderSince: g.age,
      };
}
export function tick(previous: Game, dt = 0.05): Game {
  if (previous.result) return previous;
  let g: Game = {
    ...previous,
    age: previous.age + dt,
    messages: (previous.messages ?? []).filter(
      (m) => m.until > previous.age + dt,
    ),
    announcement:
      previous.announcement && previous.announcement.until > previous.age + dt
        ? previous.announcement
        : undefined,
    elapsed: previous.elapsed + dt,
    flash: null,
    shots: (previous.shots ?? [])
      .filter((s) => previous.age - s.at < (s.duration ?? 0.4) + 0.3)
      .map((s) => ({ ...s })),
    clashes: (previous.clashes ?? [])
      .filter((c) => previous.age - c.at < 0.45)
      .map((c) => ({ ...c })),
    curses: (previous.curses ?? []).filter((c) =>
      c.debuff.effects.some((e) => c.at + e.duration > previous.age),
    ),
    towers: previous.towers.map((t) => ({ ...t })),
    wallets: record((team) => ({ ...previous.wallets[team] })),
    troops: [],
    routes: previous.routes.filter((r) => r.until > previous.age),
    automation: previous.automation
      .filter(
        (a) => previous.towers.find((t) => t.id === a.from)?.team === a.team,
      )
      .map((a) => ({ ...a })),
  };
  for (const t of g.towers) {
    if (
      g.burningRule &&
      g.burningRule.until > g.age &&
      t.team === g.burningRule.team &&
      t.kind === 'lumber' &&
      t.ruinedAt === undefined
    ) {
      t.ruinedAt = g.age;
      t.team = null;
      t.count = 0;
      t.stockGold = 0;
      t.stockWood = 0;
    }
    if (!t.team || (g.frozen?.[t.team] ?? 0) > g.age) continue;
    const w = g.wallets[t.team],
      earn = income(t);
    const efficiency =
      modifier(g, t.team, 'income') *
      (g.event?.kind === 'deposit' &&
      g.event.target === t.id &&
      g.event.until > g.age
        ? 3
        : 1);
    if (t.home) {
      w.gold += earn.gold * dt * efficiency;
      w.resources += earn.resources * dt * efficiency;
      w.earned += (earn.gold + earn.resources) * dt * efficiency;
    } else {
      t.stockGold = (t.stockGold ?? 0) + earn.gold * dt * efficiency;
      t.stockWood = (t.stockWood ?? 0) + earn.resources * dt * efficiency;
    }
    const rate =
      production(t) * g.growth[t.team] * modifier(g, t.team, 'growth');
    if (t.count < capacity(t))
      t.count = Math.min(capacity(t), t.count + rate * dt);
  }
  const incoming = previous.troops.map((p) => ({ ...p }));
  for (const shot of g.shots ?? []) {
    const tracked = incoming.find((p) => p.id === shot.target);
    if (!shot.hit && tracked) {
      shot.x = tracked.x;
      shot.y = tracked.y;
    }
    if (!shot.hit && g.age >= shot.at + (shot.duration ?? 0.4)) {
      shot.hit = true;
      const victim = incoming.find((p) => p.id === shot.target);
      if (victim && victim.team !== shot.team)
        victim.strength = Math.max(
          0,
          victim.strength - (shot.damage ?? 1) * (victim.elite ? 0.6 : 1),
        );
    }
  }
  for (const t of g.towers) {
    if (
      !t.team ||
      !hasCannon(t) ||
      t.count < 1 ||
      (g.frozen?.[t.team] ?? 0) > g.age
    )
      continue;
    const gun = cannon(t);
    const distance = (p: Troop) =>
      Math.hypot(
        ((p.x - t.x) * WORLD_WIDTH) / 100,
        ((p.y - t.y) * WORLD_HEIGHT) / 100,
      );
    const target = incoming
      .filter(
        (p) =>
          p.team !== t.team &&
          p.delay <= 0 &&
          p.progress > 0 &&
          p.strength > 0 &&
          distance(p) <= gun.range,
      )
      .sort((a, b) => distance(a) - distance(b))[0];
    if (!target) {
      if (t.idleSince === undefined) {
        t.idleSince = g.age;
        t.idleAim = t.aim ?? (t.id * 47) % 360;
      }
      t.aim = (t.idleAim ?? 0) + 18 * Math.sin((g.age - t.idleSince) * 0.55);
      continue;
    }
    t.idleSince = undefined;
    const desiredAim =
      (Math.atan2(
        (target.y - t.y) * WORLD_HEIGHT + cannonHeight(t) * 100,
        (target.x - t.x) * WORLD_WIDTH,
      ) *
        180) /
      Math.PI;
    const turn =
      t.aim === undefined
        ? 0
        : ((((desiredAim - t.aim + 540) % 360) + 360) % 360) - 180;
    t.aim =
      t.aim === undefined
        ? desiredAim
        : t.aim + Math.max(-270 * dt, Math.min(270 * dt, turn));
    if ((t.shotAt ?? 0) > g.age || Math.abs(turn) > 270 * dt + 5) continue;
    t.shotAt =
      g.age + gun.interval / Math.max(0.05, modifier(g, t.team, 'cannons'));
    const angle = (t.aim * Math.PI) / 180;
    const sx = t.x + ((Math.cos(angle) * 58) / WORLD_WIDTH) * 100,
      sy =
        t.y -
        (cannonHeight(t) / WORLD_HEIGHT) * 100 +
        ((Math.sin(angle) * 58) / WORLD_HEIGHT) * 100;
    g.shots!.push({
      id: g.nextId++,
      from: t.id,
      team: t.team,
      x: target.x,
      y: target.y,
      at: g.age,
      sx,
      sy,
      target: target.id,
      damage: gun.damage,
      duration: Math.max(0.25, distance(target) / 500),
    });
  }
  for (const old of incoming) {
    if (old.strength <= 0) continue;
    const p = { ...old };
    if ((g.frozen?.[p.team] ?? 0) > g.age) {
      g.troops.push(p);
      continue;
    }
    if (p.delay > 0) {
      p.delay -= dt;
      g.troops.push(p);
      continue;
    }
    if (p.scoutUntil) {
      if (g.age > p.scoutUntil) continue;
      const dest = p.waypoint ?? { x: p.sx, y: p.sy };
      const path = p.path && p.path.length > 1 ? p.path : [{ x: p.sx, y: p.sy }, dest];
      const pathLen = getPathLength(path);
      p.progress = Math.min(
        1,
        p.progress +
          (dt *
            MOVE_SPEED *
            1.8 *
            g.speed[p.team] *
            modifier(g, p.team, 'speed')) /
            pathLen,
      );
      const pt = getPointOnPath(path, p.progress);
      p.x = pt.x;
      p.y = pt.y;
      if (p.progress >= 1) {
        if (!p.arrivedAt) p.arrivedAt = g.age;
        // Survey target area for 7 seconds to lift fog, then complete mission
        if (g.age - p.arrivedAt > 7) {
          continue;
        }
      }
      g.troops.push(p);
      continue;
    }
    if (p.haul) {
      const thief = incoming.find(
        (a) =>
          !a.cargo &&
          !a.scoutUntil &&
          a.team !== p.team &&
          a.delay <= 0 &&
          a.strength >= 3 &&
          Math.hypot(a.x - p.x, a.y - p.y) < 1.5 &&
          g.towers.some((t) => t.home && t.team === a.team),
      );
      if (thief && g.age - (p.stolenAt ?? -10) > 5) {
        p.team = thief.team;
        p.stolenAt = g.age;
        p.progress = 0;
        p.sx = p.x;
        p.sy = p.y;
        p.speech = 'Караван перехвачен!';
        const home = g.towers
          .filter((t) => t.home && t.team === p.team)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
        if (home) {
          p.to = home.id;
          p.path = findRoute({ x: p.x, y: p.y }, { x: home.x, y: home.y });
        }
      }
      const home = g.towers
        .filter((t) => t.home && t.team === p.team)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
        )[0];
      if (!home) continue;
      if (p.to !== home.id) {
        p.to = home.id;
        p.sx = p.x;
        p.sy = p.y;
        p.path = findRoute({ x: p.x, y: p.y }, { x: home.x, y: home.y });
        p.progress = 0;
      }
    }
    const target = g.towers.find((t) => t.id === p.to);
    if (!target || target.ruinedAt !== undefined) continue;
    const boost = g.towers.some((t) => t.kind === 'relay' && t.team === p.team)
      ? 1.4
      : 1;
    const path = p.path && p.path.length > 1 ? p.path : [{ x: p.sx, y: p.sy }, { x: target.x, y: target.y }];
    const pathLen = getPathLength(path);
    p.progress +=
      (dt *
        MOVE_SPEED *
        boost *
        g.speed[p.team] *
        modifier(g, p.team, 'speed')) /
      pathLen;
    const pt = getPointOnPath(path, Math.min(1, p.progress));
    p.x = pt.x;
    p.y = pt.y;
    if (p.progress < 1) {
      g.troops.push(p);
      continue;
    }
    if (p.haul) {
      if (target.team === p.team) {
        const w = g.wallets[p.team];
        w.gold += p.haul.gold;
        w.resources += p.haul.resources;
        w.earned += p.haul.gold + p.haul.resources;
      }
      continue;
    }
    if (target.team === p.team)
      target.count = Math.min(1e9, target.count + p.strength);
    else if (target.team && (g.shielded?.[target.team] ?? 0) > g.age) {
    } else if (target.home && g.age < DEVELOPMENT_SECONDS) {
      target.count = Math.max(0, target.count - p.strength * (p.elite ? 2 : 1));
    } else {
      target.count -=
        (p.strength * (p.elite ? 2 : 1)) /
        ((1 + (target.level - 1) * 0.12) *
          (target.specialty === 'fortress' ? 1.5 : 1));
      if (target.count < 0) {
        target.team = p.team;
        if (target.home) target.home = p.team;
        target.count = Math.abs(target.count);
        g.flash = target.id;
        if (
          g.event?.kind === 'fortress' &&
          g.event.target === target.id &&
          !g.event.claimed &&
          g.event.until > g.age
        ) {
          target.count += 50;
          g.event = { ...g.event, claimed: p.team };
          g.notice = 'Древний форт: 50 бойцов присоединились к захватчику!';
        }
        if (p.team === 'you') {
          g.captures++;
          g.notice = `${target.name} захвачен. ${target.kind === 'gold' ? 'Шахта приносит золото.' : target.kind === 'lumber' ? 'Лесопилка приносит древесину.' : target.kind === 'barracks' ? 'Казарма набирает бойцов.' : 'Настройте улучшения и автомаршрут.'}`;
        }
      }
    }
  }

  // ----------------------------------------------------
  // Field Skirmishes: Opposing troops clash on the roads
  // ----------------------------------------------------
  const newClashes: Clash[] = [];
  const WORLD_ASPECT = WORLD_HEIGHT / WORLD_WIDTH;
  const CLASH_DIST = 2.0; // Distance in % coords
  const CLASH_RATE = 14;  // Casualties/sec in clash

  for (let i = 0; i < g.troops.length; i++) {
    const a = g.troops[i];
    if (a.cargo || a.scoutUntil || a.delay > 0 || a.strength <= 0) continue;
    for (let j = i + 1; j < g.troops.length; j++) {
      const b = g.troops[j];
      if (b.cargo || b.scoutUntil || b.delay > 0 || b.strength <= 0) continue;
      if (a.team === b.team) continue;

      const dx = a.x - b.x;
      const dy = (a.y - b.y) * WORLD_ASPECT;
      if (Math.hypot(dx, dy) < CLASH_DIST) {
        const dmgA = dt * CLASH_RATE * (b.elite ? 1.5 : 1) * (a.elite ? 0.7 : 1);
        const dmgB = dt * CLASH_RATE * (a.elite ? 1.5 : 1) * (b.elite ? 0.7 : 1);

        a.strength = Math.max(0, a.strength - dmgA);
        b.strength = Math.max(0, b.strength - dmgB);

        newClashes.push({
          id: g.nextId++,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          at: g.age,
          teamA: a.team,
          teamB: b.team,
        });

        if (a.strength <= 0) break;
      }
    }
  }

  if (newClashes.length > 0) {
    g.troops = g.troops.filter((p) => p.strength > 0);
    g.clashes = [...(g.clashes ?? []), ...newClashes];
  }

  for (const route of g.automation) {
    if (route.nextAt > g.age) continue;
    route.nextAt = g.age + 6;
    const source = g.towers.find((t) => t.id === route.from);
    const target = g.towers.find((t) => t.id === route.to);
    const reserve =
      route.mode === 'excess'
        ? Math.max(route.reserve ?? 5, capacity(source ?? g.towers[0]) * 0.75)
        : (route.reserve ?? 5);
    const inFlight = g.troops
      .filter(
        (p) =>
          p.team === route.team &&
          p.to === route.to &&
          !p.cargo &&
          !p.scoutUntil,
      )
      .reduce((n, p) => n + p.strength, 0);
    const need =
      route.mode === 'supply' && target?.team === route.team
        ? Math.max(0, 50 - target.count - inFlight)
        : Infinity;
    if (source?.team === route.team && source.count > reserve)
      g = dispatch(
        g,
        source.id,
        route.to,
        1,
        false,
        Math.min(groupSize(source), source.count - reserve, need),
      );
  }
  for (const t of g.towers) {
    if (
      !t.team ||
      (t.caravanAt ?? 12) > g.age ||
      (t.stockGold ?? 0) + (t.stockWood ?? 0) < 5
    )
      continue;
    const home = g.towers
      .filter((h) => h.team === t.team && h.home)
      .sort(
        (a, b) =>
          Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y),
      )[0];
    if (!home) continue;
    const route = findRoute({ x: t.x, y: t.y }, { x: home.x, y: home.y });
    g.troops.push({
      id: g.nextId++,
      team: t.team,
      from: t.id,
      to: home.id,
      x: t.x,
      y: t.y,
      sx: t.x,
      sy: t.y,
      path: route,
      progress: 0,
      delay: 0,
      speech: 'Везём добычу!',
      cargo: true,
      strength: 8 + t.level * 2,
      haul: { gold: t.stockGold ?? 0, resources: t.stockWood ?? 0 },
    });
    t.stockGold = 0;
    t.stockWood = 0;
    t.caravanAt = g.age + 12;
  }
  if (g.age >= (g.eventAt ?? 75)) {
    const index = g.eventIndex ?? 0,
      kind = (['deposit', 'fortress', 'caravan'] as const)[index % 3];
    const candidates = g.towers.filter((t) =>
      kind === 'deposit'
        ? ['gold', 'lumber'].includes(t.kind)
        : !t.home && !t.team,
    );
    const target = candidates[index % candidates.length];
    g.event = {
      kind: target ? kind : 'caravan',
      target: target?.id,
      x: target?.x ?? 50,
      y: target?.y ?? 50,
      until: g.age + 50,
    };
    g.eventIndex = index + 1;
    g.eventAt = g.age + 85;
    g.notice =
      kind === 'deposit'
        ? 'Богатая жила: добыча ×3 на 50 с'
        : kind === 'fortress'
          ? 'Захватите древний форт: +50 бойцов'
          : 'Золотой караван в центре: перехватите 150 золота';
  }
  if (g.event) {
    g.event = { ...g.event };
    if (g.event.until <= g.age) g.event = undefined;
    else if (g.event.kind === 'caravan' && !g.event.claimed) {
      g.event.x = 35 + (50 - (g.event.until - g.age)) * 0.6;
      const taker = g.troops.find(
        (p) =>
          p.delay <= 0 && Math.hypot(p.x - g.event!.x, p.y - g.event!.y) < 3,
      );
      if (taker) {
        g.wallets[taker.team].gold += 150;
        g.wallets[taker.team].earned += 150;
        g.event.claimed = taker.team;
        g.notice = `${playerName(g, taker.team)}: караван +150 золота`;
      }
    }
  }
  if (g.age >= g.botAt) {
    g.botAt = g.age + 10;
    for (const team of TEAM_IDS.filter((t) => !(g.humanTeams ?? ['you']).includes(t))) {
      if (g.inputLocked?.[team] || (g.frozen?.[team] ?? 0) > g.age) continue;
      const buildings = g.towers.filter((t) => t.team === team);
      const toUpgrade = [...buildings]
        .filter((t) => t.level < 5)
        .sort(
          (a, b) => a.level + (a.home ? 1 : 0) - (b.level + (b.home ? 1 : 0)),
        )[0];
      if (toUpgrade) g = upgrade(g, toUpgrade.id, team);
      const branch = g.towers.find(
        (t) => t.team === team && t.level >= 2 && !t.specialty,
      );
      if (branch) g = specialize(g, branch.id, specialties(branch)[0], team);
      if (
        buildings[0] &&
        g.age > 60 &&
        !g.troops.some((p) => p.team === team && p.scoutUntil)
      )
        g = sendScout(g, buildings[0].id, 50, 50, team);
      const armed = buildings.find(
        (t) =>
          hasCannon(t) &&
          (t.gunLevel ?? 1) < 3 &&
          g.troops.some((p) => p.team !== team && p.to === t.id),
      );
      if (armed) {
        const price = cannonCost(armed);
        if (
          g.wallets[team].gold >= price.gold &&
          g.wallets[team].resources >= price.resources
        )
          g = upgradeCannon(g, armed.id, team);
      }
      const source = g.towers
        .filter((t) => t.team === team && t.count >= 18)
        .sort((a, b) => b.count - a.count)[0];
      if (!source) continue;
      const target = g.towers
        .filter((t) => t.team !== team && (!t.home || g.age >= DEVELOPMENT_SECONDS))
        .sort(
          (a, b) =>
            a.count +
            Math.hypot(a.x - source.x, a.y - source.y) * 1.8 -
            (['gold', 'lumber'].includes(a.kind) ? 12 : 0) -
            (b.count +
              Math.hypot(b.x - source.x, b.y - source.y) * 1.8 -
              (['gold', 'lumber'].includes(b.kind) ? 12 : 0)),
        )[0];
      if (target && source.count * 0.7 > target.count * 0.8)
        g = dispatch(g, source.id, target.id, 0.7);
      const producer = buildings.find(
        (t) =>
          (t.home || t.kind === 'barracks') &&
          !g.automation.some((a) => a.from === t.id),
      );
      const front = buildings
        .filter((t) => !t.home && t.kind !== 'barracks')
        .sort((a, b) => b.count - a.count)[0];
      if (producer && front) g = setAutomation(g, producer.id, front.id, team);
    }
  }
  g = refreshAuthority(g);
  if (
    g.authority &&
    !((g.humanTeams ?? ['you']).includes(g.authority)) &&
    g.age - g.leaderSince >= 6 &&
    g.age >= g.botDecreeAt &&
    !g.spell
  ) {
    const leaderTeam = g.authority;
    const botPrompts: { prompt: string; patch: Decree }[] = [
      {
        prompt: 'Всеобщая мобилизация (+25 бойцов во все башни)',
        patch: { kind: 'reinforce', target: 'all', amount: 25 },
      },
      {
        prompt: 'Глобальный марш-бросок (+60% к скорости войск)',
        patch: { kind: 'speed', target: leaderTeam, amount: 1.6 },
      },
      {
        prompt: 'Ледяной шторм врагов (заморозка соперников на 10 с)',
        patch: { kind: 'freeze', target: 'enemies', amount: 10 },
      },
      {
        prompt: 'Золотая казна (+180 золота и +140 дерева)',
        patch: {
          kind: 'batch',
          actions: [
            { kind: 'gold', target: leaderTeam, amount: 180 },
            { kind: 'resources', target: leaderTeam, amount: 140 },
          ],
        },
      },
      {
        prompt: 'Магический щит цитадели (неуязвимость на 8 с)',
        patch: { kind: 'shield', target: leaderTeam, amount: 8 },
      },
      {
        prompt: 'Прирост ополчения (темп набора ×2.0)',
        patch: { kind: 'growth', target: leaderTeam, amount: 2.0 },
      },
      {
        prompt: 'Укрепление форпостов (уровень башен +1)',
        patch: { kind: 'upgrade', target: 'all', amount: 2 },
      },
      {
        prompt: 'Ударная мощь ополчения (численность отрядов ×1.4)',
        patch: { kind: 'multiply', target: 'all', amount: 1.4 },
      },
      {
        prompt: 'Штабная гвардия (+40 элитных бойцов в штаб)',
        patch: { kind: 'reinforce', target: 'main', amount: 40 },
      },
      {
        prompt: 'Диверсия на передовой (заморозка авангарда врагов на 12 с)',
        patch: { kind: 'freeze', target: 'enemies', amount: 12 },
      },
    ];

    const pick = botPrompts[Math.floor(Math.random() * botPrompts.length)];
    const rollDebuff = Math.random() < 0.4;
    const possibleDebuffs: Debuff[] = [
      {
        title: 'Усталость после марша',
        description: 'Скорость войск снижена на 30% на 25 секунд',
        effects: [{ stat: 'speed', factor: 0.7, duration: 25 }],
      },
      {
        title: 'Снижение урона орудий',
        description: 'Урон пушек снижен на 35% на 30 секунд',
        effects: [{ stat: 'cannons', factor: 0.65, duration: 30 }],
      },
      {
        title: 'Заминка в снабжении',
        description: 'Доход ресурсов снижен на 35% на 30 секунд',
        effects: [{ stat: 'income', factor: 0.65, duration: 30 }],
      },
    ];
    const debuff = rollDebuff ? possibleDebuffs[Math.floor(Math.random() * possibleDebuffs.length)] : null;

    g = startSpell(g, leaderTeam, pick.prompt, rollDebuff ? 'debuff' : 'pure');
    g = readySpell(
      g,
      pick.patch,
      g.authorityEpoch,
      debuff,
      rollDebuff ? 'debuff' : 'pure',
    );
    g.botDecreeAt = g.age + 20 + Math.floor(Math.random() * 10);
  }
  if (g.spell) {
    const spell = g.spell;
    if (g.authority !== spell.team || g.authorityEpoch !== spell.epoch) {
      g.spell = undefined;
      g.notice = 'Лидер сменился — заклинание сорвано!';
    } else if (
      spell.castAt !== undefined &&
      g.age >= spell.castAt &&
      spell.patch
    ) {
      g = applyDecree(
        { ...g, spell: undefined },
        spell.team,
        spell.patch,
        spell.epoch,
      );
      if (spell.debuff) {
        g.curses = [
          ...(g.curses ?? []),
          { team: spell.team, debuff: spell.debuff, at: g.age },
        ];
        g.notice += ` Побочный эффект: ${spell.debuff.title}.`;
      }
    } else if (!spell.patch && g.age - spell.startedAt > 25) {
      g.spell = undefined;
      g.notice = 'Время ожидания приказа истекло';
    }
  }

  // Final Era transition: peace shields fall after DEVELOPMENT_SECONDS
  if (g.age >= DEVELOPMENT_SECONDS && !g.allowHeadquartersCapture) {
    g.allowHeadquartersCapture = true;
    g.notice = '⚡ ФИНАЛЬНАЯ ЭРА! Щиты штабов пали — открыт штурм главных баз!';
    g.announcement = {
      team: 'you',
      text: '⚡ Финальная эра: щиты штабов пали!',
      until: g.age + 4.5,
    };
  }

  // Elimination victory (checked continuously every tick)
  const teamsWithTowers = TEAM_IDS.filter((team) =>
    g.towers.some((t) => t.team === team),
  );
  if (teamsWithTowers.length === 1) {
    const candidate = teamsWithTowers[0];
    const enemyTroops = g.troops.filter((p) => p.team !== candidate);
    if (enemyTroops.length === 0 || g.towers.every((t) => !t.team || t.team === candidate)) {
      g.result = candidate;
    }
  } else {
    const alive = TEAM_IDS.filter(
      (team) =>
        g.towers.some((t) => t.team === team) ||
        g.troops.some((p) => p.team === team),
    );
    if (alive.length === 1) g.result = alive[0];
  }
  if (g.elapsed >= DURATION && !g.result)
    g.result = economicLeader(g) ?? 'draw';
  return g;
}
function matches(t: Tower, target: Target, actor: Team): boolean {
  if (typeof target === 'number') return t.id === target;
  if (target === 'everyone') return true;
  if (target === 'neutral') return !t.team;
  if (target === 'enemies') return !!t.team && t.team !== actor;
  if (target === 'main') return t.team === actor && !!t.home;
  if (target === 'mines' || target === 'gold') return t.kind === 'gold';
  if (target === 'sawmills' || target === 'lumber') return t.kind === 'lumber';
  if (target === 'economy') return t.kind === 'gold' || t.kind === 'lumber';
  if (target === 'barracks') return t.kind === 'barracks';

  const sTarget = String(target);
  if (sTarget.includes('_')) {
    const [teamPart, kindPart] = sTarget.split('_');
    const targetTeam =
      teamPart === 'enemy' || teamPart === 'enemies'
        ? 'enemies'
        : teamPart === 'you'
          ? actor
          : teamPart;
    const teamMatches =
      targetTeam === 'enemies'
        ? !!t.team && t.team !== actor
        : t.team === targetTeam;
    if (!teamMatches) return false;
    if (kindPart === 'mines' || kindPart === 'gold') return t.kind === 'gold';
    if (kindPart === 'sawmills' || kindPart === 'lumber') return t.kind === 'lumber';
    if (kindPart === 'economy') return t.kind === 'gold' || t.kind === 'lumber';
    if (kindPart === 'barracks') return t.kind === 'barracks';
    return true;
  }

  return t.team === (target === 'all' ? actor : target);
}
export function applyDecree(
  g: Game,
  team: Team,
  p: Decree,
  epoch: number,
): Game {
  if (g.age < DEVELOPMENT_SECONDS)
    return { ...g, notice: 'Право промпта откроется после 4 минут развития.' };
  if (
    g.result ||
    !validDecree(p) ||
    leader(g) !== team ||
    g.authorityEpoch !== epoch
  )
    return {
      ...g,
      notice: 'Право перешло другому лидеру. Промпт не применён.',
    };
  const actions = p.kind === 'batch' ? p.actions : [p];
  const next: Game = {
    ...g,
    towers: g.towers.map((t) => ({ ...t })),
    troops: g.troops.map((t) => ({ ...t })),
    routes: g.routes.map((r) => ({ ...r })),
    growth: { ...g.growth },
    speed: { ...g.speed },
    frozen: { ...g.frozen },
    shielded: { ...g.shielded },
    labels: { ...g.labels },
    explosions: [...(g.explosions ?? [])],
    wallets: record((t) => ({ ...g.wallets[t] })),
    automation: g.automation.map((a) => ({ ...a })),
  };
  const log: string[] = [];
  for (const a of actions) {
    const targets = next.towers.filter((t) => matches(t, a.target, team));
    const targetIDs = new Set(targets.map((t) => t.id));
    const isBuildingTarget =
      typeof a.target === 'number' ||
      ['mines', 'gold', 'sawmills', 'lumber', 'economy', 'barracks'].includes(
        String(a.target),
      ) ||
      String(a.target).includes('_');
    const affected = (Object.keys(TEAMS) as Team[]).filter(
      (t) =>
        a.target === 'everyone' ||
        (a.target === 'enemies' && t !== team) ||
        a.target === t ||
        ((a.target === 'all' || a.target === 'main') && t === team) ||
        (isBuildingTarget && targets.some((x) => x.team === t)),
    );
    const troopMatches = (p: Troop) =>
      isBuildingTarget || a.target === 'main'
        ? targetIDs.has(p.from) || targetIDs.has(p.to)
        : affected.includes(p.team);
    if (a.kind === 'messages') {
      next.hideMessages = a.amount === 0;
      next.messages = [];
      log.push(a.amount === 0 ? 'Сообщения отключены' : 'Сообщения включены');
    } else if (a.kind === 'transfer' || a.kind === 'capture') {
      const transferredNames: string[] = [];
      for (const t of targets) {
        if (t.home && t.team && t.team !== team) {
          t.count = Math.max(5, Math.min(t.count, 10));
          continue;
        }
        t.team = team;
        if (t.home) t.home = team;
        transferredNames.push(`№${t.id + 1} ${t.name}`);
      }
      if (a.kind === 'transfer')
        for (const troop of next.troops)
          if (troopMatches(troop)) troop.team = team;
      if (isBuildingTarget) {
        next.routes = next.routes.filter((r) => !targetIDs.has(r.from));
      } else {
        next.routes = next.routes.filter((r) => !affected.includes(r.team));
      }
      log.push(
        `Под контроль перешли здания (${transferredNames.length})${a.kind === 'transfer' ? ' и бойцы' : ''}${transferredNames.length > 0 ? `: ${transferredNames.slice(0, 3).join(', ')}${transferredNames.length > 3 ? '...' : ''}` : ''}`,
      );
    } else if (a.kind === 'destroy' || a.kind === 'burn' || a.kind === 'nuke' || a.kind === 'explode' || a.kind === 'orbital') {
      const destroyedNames: string[] = [];
      for (const t of targets) {
        if (t.home && t.team && t.team !== team) {
          t.count = Math.max(5, Math.min(t.count, 8));
          t.ruinedAt = next.age;
          continue;
        }
        t.team = null;
        t.count = 0;
        t.home = undefined;
        t.level = 1;
        t.ruinedAt = next.age;
        destroyedNames.push(`№${t.id + 1} ${t.name}`);
      }
      next.explosions = [
        ...(next.explosions ?? []),
        ...targets.map((t) => ({ id: t.id, at: next.age })),
      ];
      next.troops = next.troops.filter((p) => !troopMatches(p));
      next.routes = next.routes.filter((r) => !affected.includes(r.team));
      if (a.kind === 'nuke' || a.kind === 'orbital' || a.kind === 'explode') {
        next.screenShakeUntil = next.age + 3.5;
      }
      log.push(
        a.kind === 'burn'
          ? `Сожжены дотла и тлеют углями (${destroyedNames.length} зд.)`
          : a.kind === 'nuke'
            ? `Ядерный удар обратил позиции в пепелище (${destroyedNames.length} зд.)`
            : a.kind === 'orbital'
              ? `Орбитальный лазер расплавил укрепления (${destroyedNames.length} зд.)`
              : `Укрепления взорваны в тлеющие угли (${destroyedNames.length} зд.)`,
      );
    } else if (a.kind === 'lightning') {
      next.lightningStrikes = [
        ...(next.lightningStrikes ?? []),
        ...targets.map((t) => ({ id: t.id, at: next.age })),
      ];
      next.explosions = [
        ...(next.explosions ?? []),
        ...targets.map((t) => ({ id: t.id, at: next.age })),
      ];
      for (const t of targets) {
        t.count = Math.max(1, Math.floor(t.count * 0.35));
      }
      next.troops = next.troops.filter((p) => !troopMatches(p));
      next.routes = next.routes.filter((r) => !affected.includes(r.team));
      log.push('Громовой шторм поразил молниями вражеские гарнизоны ⚡');
    } else if (a.kind === 'zombie') {
      const zombieCount = Math.max(10, Math.min(50, Math.floor(a.amount || 25)));
      const spawnBases = targets.length > 0 ? targets : next.towers.filter((t) => t.team === team);
      const enemyTowers = next.towers.filter((t) => t.team && t.team !== team);
      for (const b of spawnBases) {
        const dest = enemyTowers.length > 0 ? enemyTowers[Math.floor(Math.random() * enemyTowers.length)] : next.towers[0];
        const route = findRoute({ x: b.x, y: b.y }, { x: dest.x, y: dest.y });
        next.troops.push({
          id: next.nextId++,
          team,
          from: b.id,
          to: dest.id,
          x: b.x,
          y: b.y,
          sx: b.x,
          sy: b.y,
          path: route,
          progress: 0,
          delay: 0,
          speech: 'Мозгиии! 🧟',
          strength: zombieCount,
          cargo: false,
        });
      }
      log.push(`Орда нежити (${zombieCount} зомби) восстала из пепла! 🧟`);
    } else if (a.kind === 'blackhole') {
      next.blackholeUntil = next.age + 20;
      next.troops = next.troops.filter((p) => p.team === team);
      next.routes = next.routes.filter((r) => r.team === team);
      next.screenShakeUntil = next.age + 3;
      log.push('Черная дыра поглотила вражеские колонны! 🧲');
    } else if (a.kind === 'blizzard') {
      const dur = Math.min(60, Math.max(10, a.amount || 25));
      next.blizzardUntil = next.age + dur;
      for (const who of affected) {
        next.speed[who] = Math.min(next.speed[who] ?? 1, 0.25);
      }
      log.push(`Ледниковый период сковал долину на ${dur} с! ❄️`);
    } else if (a.kind === 'midas') {
      for (const t of targets) {
        t.kind = 'gold';
      }
      next.wallets[team].gold = Math.min(1e9, next.wallets[team].gold + 1000);
      log.push('Прикосновение Мидаса обратило здания в чистое золото! (+1000 💰)');
    } else if (a.kind === 'tornado') {
      for (const troop of next.troops) {
        if (affected.includes(troop.team)) {
          const randomTower = next.towers[Math.floor(Math.random() * next.towers.length)];
          troop.to = randomTower.id;
          troop.progress = 0;
          troop.path = findRoute({ x: troop.x, y: troop.y }, { x: randomTower.x, y: randomTower.y });
          troop.speech = 'Ааа! Торнадо! 🌪️';
        }
      }
      log.push('Смерч разметал войска во всех направлениях! 🌪️');
    } else if (a.kind === 'polymorph') {
      const dur = Math.min(60, Math.max(10, a.amount || 25));
      next.polymorphUntil = next.age + dur;
      for (const troop of next.troops) {
        if (troopMatches(troop)) {
          troop.speech = 'Квааа! 🐸';
          troop.strength = Math.max(1, Math.floor(troop.strength * 0.2));
        }
      }
      log.push(`Враги превращены в квакающих лягушек на ${dur} с! 🐸`);
    } else if (a.kind === 'peace') {
      const dur = Math.min(60, Math.max(10, a.amount || 25));
      next.peaceUntil = next.age + dur;
      for (const troop of next.troops) {
        troop.speech = 'Мир! 🏳️';
      }
      log.push(`Объявлено перемирие на ${dur} с! 🕊️ Белые флаги над долиной.`);
    } else if (a.kind === 'alien') {
      next.alienUntil = next.age + 15;
      next.troops = next.troops.filter((p) => p.team === team);
      for (const troop of next.troops) {
        troop.speech = 'НЛО в небе! 🛸';
      }
      log.push('Инопланетная тарелка похитила вражеские отряды! 🛸👽');
    } else if (a.kind === 'titans') {
      const dur = Math.min(60, Math.max(10, a.amount || 30));
      next.titansUntil = next.age + dur;
      for (const troop of next.troops) {
        if (troop.team === team) {
          troop.strength = Math.floor(troop.strength * 2.5);
          troop.speech = 'МЫ ТИТАНЫ! 💥👑';
        }
      }
      log.push(`Ваши воины обращены в могучих Титанов на ${dur} с! 👑`);
    } else if (a.kind === 'repair') {
      let restoredCount = 0;
      for (const t of targets) {
        if (t.ruinedAt !== undefined) {
          t.ruinedAt = undefined;
          t.count = Math.max(t.count, 20);
          t.team = team;
          restoredCount++;
        }
      }
      log.push(`Восстановлено зданий из пепла: ${restoredCount}`);
    } else if (a.kind === 'rename') {
      const newName = (a.text?.trim() || 'Безымянный').slice(0, 30);
      if (isBuildingTarget) {
        for (const t of targets) {
          t.name = newName;
        }
        log.push(`Здания переименованы в «${newName}»`);
      } else {
        next.players = next.players || {};
        for (const who of affected) {
          next.players[who] = newName;
        }
        log.push(`Команда переименована в «${newName}»`);
      }
    } else if (a.kind === 'confuse') {
      for (const troop of next.troops) {
        if (troopMatches(troop)) {
          const oldFrom = troop.from;
          troop.from = troop.to;
          troop.to = oldFrom;
          troop.progress = Math.max(0, 1 - troop.progress);
          troop.speech = 'Предательство! Назад!';
        }
      }
      next.routes = next.routes.filter((r) => !affected.includes(r.team));
      log.push('В рядах врага паника — войска развернулись назад');
    } else if (a.kind === 'party') {
      const dur = Math.min(60, Math.max(5, a.amount || 25));
      next.partyUntil = next.age + dur;
      for (const troop of next.troops) {
        troop.speech = 'Дискотека! 🎉🕺';
      }
      log.push(`Дискотека объявлена на ${dur} с! 🕺✨`);
    } else if (a.kind === 'growth' || a.kind === 'speed') {
      for (const who of affected) next[a.kind][who] = a.amount;
      log.push(
        `${a.kind === 'speed' ? 'Скорость' : 'Прирост'} выбранных команд ×${a.amount}`,
      );
    } else if (a.kind === 'freeze' || a.kind === 'shield') {
      const field = a.kind === 'freeze' ? 'frozen' : 'shielded';
      for (const who of affected) next[field]![who] = next.age + a.amount;
      log.push(
        `${a.kind === 'freeze' ? 'Заморозка' : 'Неуязвимость'} на ${a.amount} с`,
      );
    } else if (a.kind === 'label') {
      const labelText = (a.text?.trim() || 'Обесчещен').slice(0, 40);
      next.labels = next.labels || {};
      for (const who of affected) {
        next.labels[who] = labelText;
      }
      log.push(`Статус «${labelText}» присвоен`);
    } else if (a.kind === 'gold' || a.kind === 'resources') {
      for (const who of affected)
        next.wallets[who][a.kind] = Math.max(
          0,
          Math.min(1e9, next.wallets[who][a.kind] + a.amount),
        );
      log.push(`${a.kind === 'gold' ? 'Золото' : 'Древесина'}: +${a.amount}`);
    } else if (a.kind === 'time') {
      next.elapsed = Math.max(0, DURATION - a.amount);
      log.push(`До конца матча ${a.amount} с`);
    } else if (a.kind === 'upgrade') {
      for (const t of targets)
        t.level = Math.max(1, Math.min(10, Math.floor(a.amount)));
      log.push(`Уровень зданий: ${a.amount}`);
    } else {
      for (const t of targets)
        t.count = Math.max(
          0,
          Math.min(
            1e9,
            a.kind === 'set'
              ? a.amount
              : a.kind === 'multiply'
                ? t.count * a.amount
                : t.count + a.amount,
          ),
        );
      if (a.kind === 'reinforce' && a.amount < 0) {
        next.explosions = [
          ...(next.explosions ?? []),
          ...targets.map((t) => ({ id: t.id, at: next.age })),
        ];
        for (const t of targets) {
          if (t.count <= 0) {
            t.team = null;
            t.home = undefined;
            t.level = 1;
            t.ruinedAt = next.age;
          }
        }
      }
      if (a.kind === 'multiply')
        for (const troop of next.troops)
          if (troopMatches(troop))
            troop.strength = Math.max(
              0,
              Math.min(1e9, Math.floor(troop.strength * a.amount)),
            );
      next.troops = next.troops.filter((t) => t.strength > 0);
      log.push(
        a.kind === 'reinforce'
          ? `${a.amount >= 0 ? '+' : ''}${a.amount} бойцов в выбранных зданиях`
          : a.kind === 'multiply'
            ? `Численность ×${a.amount}`
            : `Гарнизоны: ${a.amount} бойцов`,
      );
    }
  }
  const text = log.join(' · ');
  next.decreeLog = [{ team, text, at: g.elapsed }, ...g.decreeLog].slice(0, 5);
  next.notice = `Указ: ${playerName(g, team)} — ${text}.`;
  next.automation = next.automation.filter(
    (a) => next.towers.find((t) => t.id === a.from)?.team === a.team,
  );
  return refreshAuthority(next);
}

export function forceApplyDecreeWithLog(
  g: Game,
  team: Team,
  p: Decree,
): { game: Game; log: string[] } {
  if (!validDecree(p))
    return { game: { ...g, notice: 'Некорректный указ ИИ.' }, log: ['Некорректный указ ИИ.'] };
  const actions = p.kind === 'batch' ? p.actions : [p];
  const next: Game = {
    ...g,
    towers: g.towers.map((t) => ({ ...t })),
    troops: g.troops.map((t) => ({ ...t })),
    routes: g.routes.map((r) => ({ ...r })),
    growth: { ...g.growth },
    speed: { ...g.speed },
    frozen: { ...g.frozen },
    shielded: { ...g.shielded },
    labels: { ...g.labels },
    explosions: [...(g.explosions ?? [])],
    wallets: record((t) => ({ ...g.wallets[t] })),
    automation: g.automation.map((a) => ({ ...a })),
  };
  const log: string[] = [];
  for (const a of actions) {
    const targets = next.towers.filter((t) => matches(t, a.target, team));
    const targetIDs = new Set(targets.map((t) => t.id));
    const isBuildingTarget =
      typeof a.target === 'number' ||
      ['mines', 'gold', 'sawmills', 'lumber', 'economy', 'barracks'].includes(
        String(a.target),
      ) ||
      String(a.target).includes('_');
    const affected = (Object.keys(TEAMS) as Team[]).filter(
      (t) =>
        a.target === 'everyone' ||
        (a.target === 'enemies' && t !== team) ||
        a.target === t ||
        ((a.target === 'all' || a.target === 'main') && t === team) ||
        (isBuildingTarget && targets.some((x) => x.team === t)),
    );
    const troopMatches = (p: Troop) =>
      isBuildingTarget || a.target === 'main'
        ? targetIDs.has(p.from) || targetIDs.has(p.to)
        : affected.includes(p.team);

    if (a.kind === 'messages') {
      next.hideMessages = a.amount === 0;
      next.messages = [];
      log.push(a.amount === 0 ? 'Сообщения отключены' : 'Сообщения включены');
    } else if (a.kind === 'transfer' || a.kind === 'capture') {
      const transferredNames: string[] = [];
      for (const t of targets) {
        if (t.home && t.team && t.team !== team) {
          t.count = Math.max(5, Math.min(t.count, 10));
          continue;
        }
        t.team = team;
        if (t.home) t.home = team;
        transferredNames.push(`№${t.id + 1} ${t.name}`);
      }
      if (a.kind === 'transfer')
        for (const troop of next.troops)
          if (troopMatches(troop)) troop.team = team;
      if (isBuildingTarget) {
        next.routes = next.routes.filter((r) => !targetIDs.has(r.from));
      } else {
        next.routes = next.routes.filter((r) => !affected.includes(r.team));
      }
      log.push(
        `Под контроль перешли здания (${transferredNames.length})${a.kind === 'transfer' ? ' и бойцы' : ''}${transferredNames.length > 0 ? `: ${transferredNames.slice(0, 3).join(', ')}${transferredNames.length > 3 ? '...' : ''}` : ''}`,
      );
    } else if (a.kind === 'destroy' || a.kind === 'burn' || a.kind === 'nuke' || a.kind === 'explode' || a.kind === 'orbital') {
      const destroyedNames: string[] = [];
      for (const t of targets) {
        if (t.home && t.team && t.team !== team) {
          t.count = Math.max(5, Math.min(t.count, 8));
          t.ruinedAt = next.age;
          continue;
        }
        t.team = null;
        t.count = 0;
        t.home = undefined;
        t.level = 1;
        t.ruinedAt = next.age;
        destroyedNames.push(`№${t.id + 1} ${t.name}`);
      }
      next.explosions = [
        ...(next.explosions ?? []),
        ...targets.map((t) => ({ id: t.id, at: next.age })),
      ];
      next.troops = next.troops.filter((p) => !troopMatches(p));
      next.routes = next.routes.filter((r) => !affected.includes(r.team));
      if (a.kind === 'nuke' || a.kind === 'orbital' || a.kind === 'explode') {
        next.screenShakeUntil = next.age + 3.5;
      }
      log.push(
        a.kind === 'burn'
          ? `Сожжены дотла и тлеют углями (${destroyedNames.length} зд.)`
          : a.kind === 'nuke'
            ? `Ядерный удар обратил позиции в пепелище (${destroyedNames.length} зд.)`
            : a.kind === 'orbital'
              ? `Орбитальный лазер расплавил укрепления (${destroyedNames.length} зд.)`
              : `Укрепления взорваны в тлеющие угли (${destroyedNames.length} зд.)`,
      );
    } else if (a.kind === 'lightning') {
      next.lightningStrikes = [
        ...(next.lightningStrikes ?? []),
        ...targets.map((t) => ({ id: t.id, at: next.age })),
      ];
      next.explosions = [
        ...(next.explosions ?? []),
        ...targets.map((t) => ({ id: t.id, at: next.age })),
      ];
      for (const t of targets) {
        t.count = Math.max(1, Math.floor(t.count * 0.35));
      }
      next.troops = next.troops.filter((p) => !troopMatches(p));
      next.routes = next.routes.filter((r) => !affected.includes(r.team));
      log.push('Громовой шторм поразил молниями вражеские гарнизоны ⚡');
    } else if (a.kind === 'zombie') {
      const zombieCount = Math.max(10, Math.min(50, Math.floor(a.amount || 25)));
      const spawnBases = targets.length > 0 ? targets : next.towers.filter((t) => t.team === team);
      const enemyTowers = next.towers.filter((t) => t.team && t.team !== team);
      for (const b of spawnBases) {
        const dest = enemyTowers.length > 0 ? enemyTowers[Math.floor(Math.random() * enemyTowers.length)] : next.towers[0];
        const route = findRoute({ x: b.x, y: b.y }, { x: dest.x, y: dest.y });
        next.troops.push({
          id: next.nextId++,
          team,
          from: b.id,
          to: dest.id,
          x: b.x,
          y: b.y,
          sx: b.x,
          sy: b.y,
          path: route,
          progress: 0,
          delay: 0,
          speech: 'Мозгиии! 🧟',
          strength: zombieCount,
          cargo: false,
        });
      }
      log.push(`Орда нежити (${zombieCount} зомби) восстала из пепла! 🧟`);
    } else if (a.kind === 'blackhole') {
      next.blackholeUntil = next.age + 20;
      next.troops = next.troops.filter((p) => p.team === team);
      next.routes = next.routes.filter((r) => r.team === team);
      next.screenShakeUntil = next.age + 3;
      log.push('Черная дыра поглотила вражеские колонны! 🧲');
    } else if (a.kind === 'blizzard') {
      const dur = Math.min(60, Math.max(10, a.amount || 25));
      next.blizzardUntil = next.age + dur;
      for (const who of affected) {
        next.speed[who] = Math.min(next.speed[who] ?? 1, 0.25);
      }
      log.push(`Ледниковый период сковал долину на ${dur} с! ❄️`);
    } else if (a.kind === 'midas') {
      for (const t of targets) {
        t.kind = 'gold';
      }
      next.wallets[team].gold = Math.min(1e9, next.wallets[team].gold + 1000);
      log.push('Прикосновение Мидаса обратило здания в чистое золото! (+1000 💰)');
    } else if (a.kind === 'tornado') {
      for (const troop of next.troops) {
        if (affected.includes(troop.team)) {
          const randomTower = next.towers[Math.floor(Math.random() * next.towers.length)];
          troop.to = randomTower.id;
          troop.progress = 0;
          troop.path = findRoute({ x: troop.x, y: troop.y }, { x: randomTower.x, y: randomTower.y });
          troop.speech = 'Ааа! Торнадо! 🌪️';
        }
      }
      log.push('Смерч разметал войска во всех направлениях! 🌪️');
    } else if (a.kind === 'polymorph') {
      const dur = Math.min(60, Math.max(10, a.amount || 25));
      next.polymorphUntil = next.age + dur;
      for (const troop of next.troops) {
        if (troopMatches(troop)) {
          troop.speech = 'Квааа! 🐸';
          troop.strength = Math.max(1, Math.floor(troop.strength * 0.2));
        }
      }
      log.push(`Враги превращены в квакающих лягушек на ${dur} с! 🐸`);
    } else if (a.kind === 'peace') {
      const dur = Math.min(60, Math.max(10, a.amount || 25));
      next.peaceUntil = next.age + dur;
      for (const troop of next.troops) {
        troop.speech = 'Мир! 🏳️';
      }
      log.push(`Объявлено перемирие на ${dur} с! 🕊️ Белые флаги над долиной.`);
    } else if (a.kind === 'alien') {
      next.alienUntil = next.age + 15;
      next.troops = next.troops.filter((p) => p.team === team);
      for (const troop of next.troops) {
        troop.speech = 'НЛО в небе! 🛸';
      }
      log.push('Инопланетная тарелка похитила вражеские отряды! 🛸👽');
    } else if (a.kind === 'titans') {
      const dur = Math.min(60, Math.max(10, a.amount || 30));
      next.titansUntil = next.age + dur;
      for (const troop of next.troops) {
        if (troop.team === team) {
          troop.strength = Math.floor(troop.strength * 2.5);
          troop.speech = 'МЫ ТИТАНЫ! 💥👑';
        }
      }
      log.push(`Ваши воины обращены в могучих Титанов на ${dur} с! 👑`);
    } else if (a.kind === 'repair') {
      let restoredCount = 0;
      for (const t of targets) {
        if (t.ruinedAt !== undefined) {
          t.ruinedAt = undefined;
          t.count = Math.max(t.count, 20);
          t.team = team;
          restoredCount++;
        }
      }
      log.push(`Восстановлено зданий из пепла: ${restoredCount}`);
    } else if (a.kind === 'rename') {
      const newName = (a.text?.trim() || 'Безымянный').slice(0, 30);
      if (isBuildingTarget) {
        for (const t of targets) {
          t.name = newName;
        }
        log.push(`Здания переименованы в «${newName}»`);
      } else {
        next.players = next.players || {};
        for (const who of affected) {
          next.players[who] = newName;
        }
        log.push(`Команда переименована в «${newName}»`);
      }
    } else if (a.kind === 'confuse') {
      for (const troop of next.troops) {
        if (troopMatches(troop)) {
          const oldFrom = troop.from;
          troop.from = troop.to;
          troop.to = oldFrom;
          troop.progress = Math.max(0, 1 - troop.progress);
          troop.speech = 'Предательство! Назад!';
        }
      }
      next.routes = next.routes.filter((r) => !affected.includes(r.team));
      log.push('В рядах врага паника — войска развернулись назад');
    } else if (a.kind === 'party') {
      const dur = Math.min(60, Math.max(5, a.amount || 25));
      next.partyUntil = next.age + dur;
      for (const troop of next.troops) {
        troop.speech = 'Дискотека! 🎉🕺';
      }
      log.push(`Дискотека объявлена на ${dur} с! 🕺✨`);
    } else if (a.kind === 'growth' || a.kind === 'speed') {
      for (const who of affected) next[a.kind][who] = a.amount;
      log.push(
        `${a.kind === 'speed' ? 'Скорость' : 'Прирост'} выбранных команд ×${a.amount}`,
      );
    } else if (a.kind === 'freeze' || a.kind === 'shield') {
      const field = a.kind === 'freeze' ? 'frozen' : 'shielded';
      for (const who of affected) next[field]![who] = next.age + a.amount;
      log.push(
        `${a.kind === 'freeze' ? 'Заморозка' : 'Неуязвимость'} на ${a.amount} с`,
      );
    } else if (a.kind === 'label') {
      const labelText = (a.text?.trim() || 'Обесчещен').slice(0, 40);
      next.labels = next.labels || {};
      for (const who of affected) {
        next.labels[who] = labelText;
      }
      log.push(`Статус «${labelText}» присвоен`);
    } else if (a.kind === 'gold' || a.kind === 'resources') {
      for (const who of affected)
        next.wallets[who][a.kind] = Math.max(
          0,
          Math.min(1e9, next.wallets[who][a.kind] + a.amount),
        );
      log.push(`${a.kind === 'gold' ? 'Золото' : 'Древесина'}: +${a.amount}`);
    } else if (a.kind === 'time') {
      next.elapsed = Math.max(0, DURATION - a.amount);
      log.push(`Остаток матча изменён`);
    } else if (a.kind === 'upgrade') {
      for (const t of targets)
        t.level = Math.max(1, Math.min(10, Math.floor(a.amount)));
      log.push(`Уровень зданий изменён (${targets.length})`);
    } else {
      for (const t of targets)
        t.count = Math.max(
          0,
          Math.min(
            1e9,
            Math.floor(
              a.kind === 'set'
                ? a.amount
                : a.kind === 'multiply'
                  ? t.count * a.amount
                  : t.count + a.amount,
            ),
          ),
        );
      if (a.kind === 'reinforce' && a.amount < 0) {
        next.explosions = [
          ...(next.explosions ?? []),
          ...targets.map((t) => ({ id: t.id, at: next.age })),
        ];
        for (const t of targets) {
          if (t.count <= 0) {
            t.team = null;
            t.home = undefined;
            t.level = 1;
            t.ruinedAt = next.age;
          }
        }
      }
      if (a.kind === 'multiply')
        for (const troop of next.troops)
          if (troopMatches(troop))
            troop.strength = Math.max(
              0,
              Math.min(1e9, Math.floor(troop.strength * a.amount)),
            );
      next.troops = next.troops.filter((t) => t.strength > 0);
      log.push(
        a.kind === 'reinforce'
          ? `${a.amount >= 0 ? '+' : ''}${a.amount} бойцов в выбранных зданиях`
          : a.kind === 'multiply'
            ? `Численность ×${a.amount}`
            : `Гарнизоны: ${a.amount} бойцов`,
      );
    }
  }
  const text = log.join(' · ');
  next.decreeLog = [{ team, text, at: g.elapsed }, ...g.decreeLog].slice(0, 5);
  next.notice = `Дев-консоль: ${text}`;
  next.automation = next.automation.filter(
    (a) => next.towers.find((t) => t.id === a.from)?.team === a.team,
  );
  return { game: refreshAuthority(next), log };
}

export function forceApplyDecree(
  g: Game,
  team: Team,
  p: Decree,
): Game {
  return forceApplyDecreeWithLog(g, team, p).game;
}

export type MilitaryPower = Record<
  Team,
  { total: number; inTowers: number; inMarch: number; percent: number }
>;

export function getMilitaryPower(g: Game): MilitaryPower {
  const power: MilitaryPower = {
    you: { total: 0, inTowers: 0, inMarch: 0, percent: 25 },
    red: { total: 0, inTowers: 0, inMarch: 0, percent: 25 },
    purple: { total: 0, inTowers: 0, inMarch: 0, percent: 25 },
    green: { total: 0, inTowers: 0, inMarch: 0, percent: 25 },
  };

  for (const t of g.towers) {
    if (t.team && power[t.team]) {
      const c = Math.max(0, Math.floor(t.count));
      power[t.team].inTowers += c;
      power[t.team].total += c;
    }
  }

  for (const p of g.troops) {
    if (p.team && power[p.team] && !p.cargo && !p.scoutUntil && p.strength > 0) {
      const s = Math.max(0, Math.ceil(p.strength));
      power[p.team].inMarch += s;
      power[p.team].total += s;
    }
  }

  const grandTotal = Object.values(power).reduce((sum, item) => sum + item.total, 0);
  for (const team of TEAM_IDS) {
    power[team].percent = grandTotal > 0 ? (power[team].total / grandTotal) * 100 : 25;
  }

  return power;
}

