'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, X, Zap } from 'lucide-react';
import { playSelect, playError, playCapture } from '@/lib/audio';
import { describeDecree, type Decree } from '@/lib/decrees';

export interface DevConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDecree: (patch: Decree) => string[] | void;
  onFastForwardToDecrees?: () => void;
}

const PRESETS = [
  { label: '⏩ Промотать до приказов (120с)', prompt: 'промотать время' },
  { label: '+500 Золота и Дерева', prompt: 'Дай мне 500 золота и 500 дерева' },
  { label: 'Все башни мои', prompt: 'Сделай все башни на карте моими' },
  { label: 'Заморозить врагов', prompt: 'Заморозь всех врагов на 25 секунд' },
  { label: '+100 бойцов в штаб', prompt: 'Добавь моему главному зданию 100 бойцов' },
  { label: 'Башни MAX ур.5', prompt: 'Улучши все мои башни до 5 уровня' },
  { label: 'Скорость войск x2', prompt: 'Увеличь скорость моих войск в 2 раза' },
];

export function DevConsole({ isOpen, onClose, onExecuteDecree, onFastForwardToDecrees }: DevConsoleProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ type: 'in' | 'out' | 'err' | 'action' | 'report'; text: string; time: string }>>([
    {
      type: 'out',
      text: 'Дев-консоль активирована. Вводите любые приказы ИИ или команду "промотать" ("skip"), чтобы сразу открыть ввод приказов в игре.',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  const addLog = (type: 'in' | 'out' | 'err' | 'action' | 'report', text: string) => {
    setLogs((prev) => [
      ...prev,
      { type, text, time: new Date().toLocaleTimeString() },
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? prompt).trim();
    if (!text || loading) return;

    addLog('in', '> ' + text);
    setHistory((prev) => [text, ...prev.filter((item) => item !== text)]);
    setHistoryIndex(-1);
    setPrompt('');

    const cleanLower = text.toLowerCase();
    const isFastForward =
      cleanLower === 'skip' ||
      cleanLower === '/skip' ||
      cleanLower === 'time' ||
      cleanLower === '/time' ||
      cleanLower === 'ff' ||
      cleanLower === '120' ||
      cleanLower === 'приказ' ||
      cleanLower === 'приказы' ||
      cleanLower.includes('промот') ||
      cleanLower.includes('перемот') ||
      (cleanLower.includes('разблок') && cleanLower.includes('приказ')) ||
      cleanLower === 'fastforward';

    if (isFastForward) {
      if (onFastForwardToDecrees) {
        onFastForwardToDecrees();
        addLog('report', '⏩ [УСПЕХ]: Время промотано до 120+ секунд! Ввод боевых приказов в игре разблокирован, право лидера у вас.');
        playCapture();
      } else {
        addLog('err', '❌ Перемотка времени недоступна в текущем режиме.');
        playError();
      }
      setTimeout(() => inputRef.current?.focus(), 60);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/decree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, debuffsEnabled: false }),
      });

      const data = (await response.json()) as any;
      if (!response.ok || data.error) {
        addLog('err', '❌ [Ошибка]: ' + (data.error || 'Не удалось распознать приказ'));
        playError();
        return;
      }

      if (data.patch) {
        const patch = data.patch as Decree;
        const descriptions = describeDecree(patch);
        for (const desc of descriptions) {
          addLog('action', '📜 ' + desc);
        }

        const reports = onExecuteDecree(patch);
        if (Array.isArray(reports) && reports.length > 0) {
          for (const rep of reports) {
            addLog('report', '✔ ' + rep);
          }
        } else {
          addLog('report', '✔ Приказ успешно применён к миру игры');
        }

        if (data.debuff?.title) {
          addLog('err', `⚠️ [Дебафф]: ${data.debuff.title} — ${data.debuff.description || ''}`);
        }

        playCapture();
      } else {
        addLog('err', '❌ [Ошибка]: ИИ вернул пустой приказ');
        playError();
      }
    } catch (err: any) {
      addLog('err', '❌ [Ошибка сети]: ' + (err.message || 'Ошибка соединения'));
      playError();
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setPrompt(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setPrompt(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setPrompt('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="dev-console-backdrop" onClick={onClose}>
      <div className="dev-console-window" onClick={(e) => e.stopPropagation()}>
        <div className="dev-console-header">
          <div className="dev-console-title">
            <Terminal size={17} />
            <b>DEV CONSOLE · ПРЯМЫЕ ПРИКАЗЫ ИИ</b>
            <span className="dev-status-pill">ONLINE</span>
          </div>
          <button className="dev-console-close" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="dev-presets-bar">
          <span className="presets-label"><Zap size={13} /> Быстрые читы:</span>
          <div className="presets-scroll">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="dev-preset-btn"
                disabled={loading}
                onClick={() => handleSend(p.prompt)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dev-console-logs">
          {logs.map((log, i) => (
            <div key={i} className={'dev-log-line ' + log.type}>
              <span className="dev-log-time">[{log.time}]</span>
              <span className="dev-log-text">{log.text}</span>
            </div>
          ))}
          {loading && (
            <div className="dev-log-line loading">
              <span className="dev-log-time">[{new Date().toLocaleTimeString()}]</span>
              <span className="dev-log-text">ИИ обрабатывает ваш приказ...</span>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        <div className="dev-console-input-row">
          <span className="dev-prompt-symbol">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="dev-console-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите любой приказ ИИ (Enter — отправить, Esc — закрыть)..."
            disabled={loading}
            autoFocus
          />
          <button
            type="button"
            className="dev-console-submit"
            onClick={() => handleSend()}
            disabled={loading || !prompt.trim()}
          >
            <Send size={15} />
            <span>Выполнить</span>
          </button>
        </div>
      </div>
    </div>
  );
}
