import { MapPin, Coins, Trees, Eye, Crosshair, Sparkles, Wand2, ChevronRight, Swords } from 'lucide-react';
import { initAudio, playBeep, playBgm } from '@/lib/audio';

export function GameHelp({ onClose }: { onClose: () => void }) {
  const handleClose = () => {
    initAudio();
    playBeep();
    playBgm();
    onClose();
  };

  return (
    <>
      <span className="eyebrow">ЭКОНОМИКА · РАЗВЕДКА · ПРИКАЗЫ ИИ</span>
      <h1 className="help-modal-title">Освойте долину</h1>

      <div className="prompt-announcement help-feature-card">
        <h3 className="help-feature-header">
          <Sparkles size={18} color="#FFD700" />
          Главная фишка: Приказы ИИ
        </h3>
        <p className="help-feature-text">
          Спустя 2 минуты экономический лидер получает власть над игрой. Вы сможете отдавать <b>любые текстовые приказы ИИ</b> (например, «заморозь врагов», «сделай все красные башни моими»).
        </p>
      </div>

      <div className="new-help-list">
        <div className="help-item">
          <div className="help-icon-badge">
            <Swords size={18} />
          </div>
          <div className="help-item-content">
            <b>Управление войсками</b>
            <span>Своя башня → цель: отправка отряда или постоянный маршрут.</span>
          </div>
        </div>

        <div className="help-item">
          <div className="help-icon-badge">
            <Coins size={18} />
          </div>
          <div className="help-item-content">
            <b>Добыча и караваны</b>
            <span>Шахты и лесопилки добывают ресурсы. Караваны везут их в штаб.</span>
          </div>
        </div>

        <div className="help-item">
          <div className="help-icon-badge">
            <Eye size={18} />
          </div>
          <div className="help-item-content">
            <b>Быстрая разведка</b>
            <div className="help-item-sub">
              <span>Глаз → точка карты: открывает туман войны</span>
            </div>
          </div>
        </div>

        <div className="help-item">
          <div className="help-icon-badge">
            <Crosshair size={18} />
          </div>
          <div className="help-item-content">
            <b>Модернизация и пушки</b>
            <span>Улучшайте башню и орудие отдельно. Выбирайте тактику гарнизона.</span>
          </div>
        </div>

        <div className="help-item">
          <div className="help-icon-badge">
            <Wand2 size={18} />
          </div>
          <div className="help-item-content">
            <b>Рулетка желаний</b>
            <span>50% шанс на штраф от ИИ. Запрещено только прямое «я победил».</span>
          </div>
        </div>
      </div>

      <p className="help-match-footer">Матч длится до 12 минут · Соперников трое (боты)</p>
      <button className="primary help-confirm-btn" onClick={handleClose}>
        Понятно, в бой! <ChevronRight size={18} />
      </button>
    </>
  );
}
