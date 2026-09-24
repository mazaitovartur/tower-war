'use client';

import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Play, LogOut, Shield, Crown, Sparkles } from 'lucide-react';
import type { Team } from '@/lib/tower-game';
import { TEAMS } from '@/lib/tower-game';
import type { PlayerSlot, MultiplayerSession } from '@/lib/multiplayer';
import { generateRoomCode } from '@/lib/multiplayer';

export interface MultiplayerLobbyProps {
  session: MultiplayerSession | null;
  nickname: string;
  onStartGame: (session: MultiplayerSession, seed: number, humanTeams: Team[]) => void;
  onCancel: () => void;
  initialRoomCode?: string;
}

export function MultiplayerLobby({
  session,
  nickname,
  onStartGame,
  onCancel,
  initialRoomCode,
}: MultiplayerLobbyProps) {
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || '');
  const [activeSession, setActiveSession] = useState<MultiplayerSession | null>(session);
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [inLobby, setInLobby] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sanitizeRoomCode = (raw: string) => {
    let clean = raw.trim().toUpperCase();
    if (clean.includes('ROOM=')) {
      clean = clean.split('ROOM=')[1]?.slice(0, 5) || clean;
    }
    clean = clean.replace(/[^A-Z0-9]/g, '');
    return clean.slice(0, 5);
  };

  // Auto-connect if initialRoomCode provided
  useEffect(() => {
    if (initialRoomCode && !inLobby && !loading) {
      handleJoin(sanitizeRoomCode(initialRoomCode));
    }
  }, [initialRoomCode]);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    const code = generateRoomCode();
    try {
      const { MultiplayerSession } = await import('@/lib/multiplayer');
      const sess = new MultiplayerSession({
        onLobbyChange: (newPlayers) => setPlayers([...newPlayers]),
        onGameStart: (seed, humanTeams) => onStartGame(sess, seed, humanTeams),
        onError: (err) => setError(err),
      });

      await sess.initHost(code, nickname);
      setActiveSession(sess);
      setRoomCode(code);
      setIsHost(true);
      setInLobby(true);
      setPlayers(sess.players);
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать комнату');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (targetCode?: string) => {
    const code = sanitizeRoomCode(targetCode || roomCodeInput);
    if (!code) {
      setError('Введите код комнаты');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { MultiplayerSession } = await import('@/lib/multiplayer');
      const sess = new MultiplayerSession({
        onLobbyChange: (newPlayers) => setPlayers([...newPlayers]),
        onGameStart: (seed, humanTeams) => onStartGame(sess, seed, humanTeams),
        onError: (err) => setError(err),
      });

      await sess.join(code, nickname);
      setActiveSession(sess);
      setRoomCode(code);
      setIsHost(false);
      setInLobby(true);
    } catch (err: any) {
      setError(err?.message || 'Не удалось подключиться к комнате');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeave = () => {
    activeSession?.destroy();
    setInLobby(false);
    setActiveSession(null);
    onCancel();
  };

  const TEAM_SLOTS: { team: Team; title: string; defaultRole: string }[] = [
    { team: 'you', title: 'Синий легион', defaultRole: 'Хост' },
    { team: 'red', title: 'Красный орден', defaultRole: 'Бот 1' },
    { team: 'purple', title: 'Фиолетовый культ', defaultRole: 'Бот 2' },
    { team: 'green', title: 'Зелёный клан', defaultRole: 'Бот 3' },
  ];

  return (
    <div className="modal-backdrop">
      <div className="mp-lobby-modal" onClick={(e) => e.stopPropagation()}>
        {!inLobby ? (
          <div className="mp-lobby-tabs-wrap">
            <div className="mp-lobby-header">
              <h3>
                <Users size={20} /> Мультиплеер с друзьями
              </h3>
              <p className="modal-subtitle">
                Сразитесь друг против друга на одной карте в реальном времени!
              </p>
            </div>

            <div className="mp-tab-buttons">
              <button
                type="button"
                className={`mp-tab-btn ${tab === 'create' ? 'active' : ''}`}
                onClick={() => { setTab('create'); setError(''); }}
              >
                Создать комнату
              </button>
              <button
                type="button"
                className={`mp-tab-btn ${tab === 'join' ? 'active' : ''}`}
                onClick={() => { setTab('join'); setError(''); }}
              >
                Войти по коду
              </button>
            </div>

            {error && <div className="mp-error-msg">{error}</div>}

            {tab === 'create' ? (
              <div className="mp-tab-content">
                <p className="mp-info-text">
                  Вы станете хостом битвы. После создания вам будет доступна ссылка-приглашение для друзей.
                </p>
                <div className="mp-form-row">
                  <span className="mp-label">Ваш позывной:</span>
                  <b className="mp-player-nick">{nickname}</b>
                </div>
                <button
                  type="button"
                  className="mp-action-btn mp-primary-btn"
                  disabled={loading}
                  onClick={handleCreate}
                >
                  <Sparkles size={16} />
                  <span>{loading ? 'Создание комнаты...' : 'Создать комнату'}</span>
                </button>
              </div>
            ) : (
              <div className="mp-tab-content">
                <p className="mp-info-text">
                  Введите 5-значный код комнаты, полученный от друга:
                </p>
                <div className="mp-code-field-wrapper">
                  <span className="mp-code-hash-icon">#</span>
                  <input
                    type="text"
                    maxLength={5}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(sanitizeRoomCode(e.target.value))}
                    placeholder="КОД КОМНАТЫ"
                    className="mp-code-input"
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoin();
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="mp-action-btn mp-primary-btn"
                  disabled={loading || !roomCodeInput.trim()}
                  onClick={() => handleJoin()}
                >
                  <Users size={16} />
                  <span>{loading ? 'Подключение...' : 'Присоединиться к битве'}</span>
                </button>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="modal-btn-cancel" onClick={handleLeave}>
                Назад
              </button>
            </div>
          </div>
        ) : (
          <div className="mp-room-wrap">
            <div className="mp-room-header">
              <div
                onClick={handleCopyCode}
                style={{ cursor: 'pointer' }}
                title="Нажмите, чтобы скопировать код"
              >
                <span className="mp-room-tag">КОМНАТА МУЛЬТИПЛЕЕРА</span>
                <h2 className="mp-room-code">#{roomCode}</h2>
              </div>
              <button
                type="button"
                className={`mp-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyCode}
                title="Скопировать код комнаты"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Код скопирован!' : 'Скопировать код'}</span>
              </button>
            </div>

            {error && <div className="mp-error-msg">{error}</div>}

            <div className="mp-slots-grid">
              {TEAM_SLOTS.map((slot) => {
                const player = players.find((p) => p.team === slot.team);
                const isMe = player?.id === activeSession?.myId;
                const canSelect = !isHost && !player && slot.team !== 'you';

                return (
                  <div
                    key={slot.team}
                    className={`mp-slot-card ${player ? 'occupied' : 'empty'} ${isMe ? 'is-me' : ''}`}
                    style={{ borderColor: TEAMS[slot.team].color }}
                  >
                    <div className="mp-slot-icon" style={{ background: TEAMS[slot.team].color }}>
                      {slot.team === 'you' ? <Crown size={14} /> : <Shield size={14} />}
                    </div>
                    <div className="mp-slot-info">
                      <span className="mp-slot-team" style={{ color: TEAMS[slot.team].color }}>
                        {slot.title}
                      </span>
                      <b className="mp-slot-name">
                        {player ? (
                          <>
                            {player.name} {isMe && <small className="me-badge">(Вы)</small>}
                          </>
                        ) : (
                          <span className="bot-placeholder">🤖 {slot.defaultRole}</span>
                        )}
                      </b>
                    </div>
                    {canSelect && (
                      <button
                        type="button"
                        className="mp-select-team-btn"
                        onClick={() => activeSession?.selectTeam(slot.team)}
                      >
                        Занять
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mp-room-hint">
              💡 Все незанятые слоты займут боты Долины. Хост может начать битву в любой момент!
            </p>

            <div className="mp-room-footer">
              <button type="button" className="modal-btn-cancel" onClick={handleLeave}>
                <LogOut size={15} /> Выйти
              </button>
              {isHost ? (
                <button
                  type="button"
                  className="mp-action-btn mp-primary-btn start-battle-btn"
                  onClick={() => activeSession?.startGame()}
                >
                  <Play size={18} fill="currentColor" />
                  <span>В БОЙ!</span>
                </button>
              ) : (
                <div className="mp-client-waiting">
                  <span className="pulsing-dot" /> Ожидание хоста...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
