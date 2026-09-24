'use client';

import type { Team, Game } from './tower-game';
import type { Decree } from './decrees';
import type { Debuff } from './magic';

export interface PlayerSlot {
  id: string;
  name: string;
  team: Team;
  isHost: boolean;
  ready: boolean;
}

export type NetworkMessage =
  | { type: 'JOIN_REQUEST'; name: string; requestedTeam?: Team }
  | { type: 'LOBBY_STATE'; players: PlayerSlot[]; hostName: string }
  | { type: 'SELECT_TEAM'; team: Team }
  | { type: 'TOGGLE_READY' }
  | { type: 'START_GAME'; seed: number; humanTeams: Team[] }
  | {
      type: 'PLAYER_ACTION';
      action:
        | { kind: 'SEND_ARMY'; from: number; to: number; fraction: number }
        | { kind: 'UPGRADE'; towerId: number }
        | { kind: 'UPGRADE_CANNON'; towerId: number }
        | { kind: 'SPECIALIZE'; towerId: number; specialty: any }
        | { kind: 'AUTOMATION'; from: number; to: number | null }
        | { kind: 'AUTOMATION_CONFIG'; from: number; mode: 'assault' | 'supply' | 'excess'; reserve: number }
        | { kind: 'SCOUT'; from: number; x: number; y: number }
        | { kind: 'MESSAGE'; towerId: number; text: string }
        | { kind: 'SPELL_START'; prompt: string; roll: 'disabled' | 'rolling' }
        | { kind: 'SPELL_READY'; patch: Decree; epoch: number; debuff: Debuff | null; roll: string };
      team: Team;
    }
  | { type: 'GAME_SYNC'; game: Game };

export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getPeerId(roomCode: string): string {
  return `tw-host-${roomCode.toUpperCase().trim()}`;
}

export type MultiplayerCallbacks = {
  onLobbyChange?: (players: PlayerSlot[]) => void;
  onGameStart?: (seed: number, humanTeams: Team[]) => void;
  onPlayerAction?: (action: NetworkMessage & { type: 'PLAYER_ACTION' }) => void;
  onGameSync?: (game: Game) => void;
  onError?: (err: string) => void;
};

export class MultiplayerSession {
  peer: any = null;
  isHost = false;
  roomCode = '';
  myId = '';
  myName = '';
  myTeam: Team = 'you';
  connections: Map<string, any> = new Map();
  hostConnection: any = null;
  players: PlayerSlot[] = [];
  callbacks: MultiplayerCallbacks = {};

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  async initHost(roomCode: string, hostName: string): Promise<string> {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase().trim();
    this.myName = hostName;
    this.myTeam = 'you';

    const { default: Peer } = await import('peerjs');
    const peerId = getPeerId(this.roomCode);

    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, {
        debug: 1,
      });

      this.peer.on('open', (id: string) => {
        this.myId = id;
        this.players = [
          {
            id: this.myId,
            name: this.myName,
            team: 'you',
            isHost: true,
            ready: true,
          },
        ];
        this.callbacks.onLobbyChange?.(this.players);
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn: any) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          this.callbacks.onError?.('Комната с таким кодом уже существует. Попробуйте другой код.');
        } else {
          this.callbacks.onError?.(err.message || 'Ошибка P2P соединения');
        }
        reject(err);
      });
    });
  }

  async join(roomCode: string, playerName: string, requestedTeam?: Team): Promise<void> {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase().trim();
    this.myName = playerName;

    const { default: Peer } = await import('peerjs');
    const hostPeerId = getPeerId(this.roomCode);

    return new Promise((resolve, reject) => {
      this.peer = new Peer({
        debug: 1,
      });

      this.peer.on('open', (id: string) => {
        this.myId = id;
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          conn.send({
            type: 'JOIN_REQUEST',
            name: this.myName,
            requestedTeam,
          } as NetworkMessage);
          resolve();
        });

        conn.on('data', (data: any) => {
          this.handleClientMessage(data as NetworkMessage);
        });

        conn.on('close', () => {
          this.callbacks.onError?.('Связь с хостом разорвана');
        });

        conn.on('error', (err: any) => {
          this.callbacks.onError?.('Ошибка подключения к хосту: ' + err.message);
          reject(err);
        });
      });

      this.peer.on('error', (err: any) => {
        this.callbacks.onError?.('Не удалось подключиться к серверу комнат');
        reject(err);
      });
    });
  }

  private handleIncomingConnection(conn: any) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data: any) => {
      this.handleHostMessage(conn, data as NetworkMessage);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.players = this.players.filter((p) => p.id !== conn.peer);
      this.broadcastLobby();
    });
  }

  private handleHostMessage(conn: any, msg: NetworkMessage) {
    if (msg.type === 'JOIN_REQUEST') {
      const availableTeams: Team[] = (['red', 'purple', 'green'] as Team[]).filter(
        (t) => !this.players.some((p) => p.team === t),
      );
      const chosenTeam: Team =
        msg.requestedTeam && availableTeams.includes(msg.requestedTeam)
          ? msg.requestedTeam
          : availableTeams[0] || 'red';

      const newPlayer: PlayerSlot = {
        id: conn.peer,
        name: msg.name || 'Игрок',
        team: chosenTeam,
        isHost: false,
        ready: false,
      };

      this.players.push(newPlayer);
      this.broadcastLobby();
    } else if (msg.type === 'SELECT_TEAM') {
      const targetTeam = msg.team;
      const slotOccupied = this.players.some((p) => p.team === targetTeam && p.id !== conn.peer);
      if (!slotOccupied && targetTeam !== 'you') {
        const p = this.players.find((item) => item.id === conn.peer);
        if (p) p.team = targetTeam;
        this.broadcastLobby();
      }
    } else if (msg.type === 'TOGGLE_READY') {
      const p = this.players.find((item) => item.id === conn.peer);
      if (p) {
        p.ready = !p.ready;
        this.broadcastLobby();
      }
    } else if (msg.type === 'PLAYER_ACTION') {
      this.callbacks.onPlayerAction?.(msg);
    }
  }

  private handleClientMessage(msg: NetworkMessage) {
    if (msg.type === 'LOBBY_STATE') {
      this.players = msg.players;
      const me = msg.players.find((p) => p.id === this.myId);
      if (me) this.myTeam = me.team;
      this.callbacks.onLobbyChange?.(this.players);
    } else if (msg.type === 'START_GAME') {
      this.callbacks.onGameStart?.(msg.seed, msg.humanTeams);
    } else if (msg.type === 'GAME_SYNC') {
      this.callbacks.onGameSync?.(msg.game);
    }
  }

  broadcastLobby() {
    if (!this.isHost) return;
    const msg: NetworkMessage = {
      type: 'LOBBY_STATE',
      players: this.players,
      hostName: this.myName,
    };
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
    this.callbacks.onLobbyChange?.(this.players);
  }

  selectTeam(team: Team) {
    if (this.isHost) {
      return;
    }
    this.hostConnection?.send({
      type: 'SELECT_TEAM',
      team,
    } as NetworkMessage);
  }

  toggleReady() {
    if (this.isHost) return;
    this.hostConnection?.send({
      type: 'TOGGLE_READY',
    } as NetworkMessage);
  }

  startGame(seed = Date.now()) {
    if (!this.isHost) return;
    const humanTeams: Team[] = this.players.map((p) => p.team);
    const msg: NetworkMessage = {
      type: 'START_GAME',
      seed,
      humanTeams,
    };
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
    this.callbacks.onGameStart?.(seed, humanTeams);
  }

  sendAction(action: (NetworkMessage & { type: 'PLAYER_ACTION' })['action']) {
    const msg: NetworkMessage = {
      type: 'PLAYER_ACTION',
      action,
      team: this.myTeam,
    };
    if (this.isHost) {
      this.callbacks.onPlayerAction?.(msg as any);
    } else {
      this.hostConnection?.send(msg);
    }
  }

  broadcastGameSync(game: Game) {
    if (!this.isHost) return;
    const msg: NetworkMessage = {
      type: 'GAME_SYNC',
      game,
    };
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
  }

  destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.hostConnection?.close();
    this.peer?.destroy();
    this.peer = null;
  }
}

