import React, { useEffect, useState } from 'react';
import { getT, LANGUAGE_OPTIONS } from '../game/i18n';
import { DEFAULT_KEY_BINDINGS, formatKeyCode } from '../game/settings';
import {
  DifficultyLevel,
  GameSettings,
  GraphicsQuality,
  KeyBindings,
  LanguageCode,
  MouseAction,
} from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  isFullscreen: boolean;
  onUpdateSettings: (next: GameSettings) => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

type SettingsTab = 'general' | 'audio' | 'controls';
type RebindableKey = Exclude<keyof KeyBindings, 'mouseRight' | 'mouseMiddle'>;

const REBINDABLE_KEYS: RebindableKey[] = [
  'heroJump',
  'abilityQ',
  'abilityW',
  'abilityE',
  'cmdMove',
  'cmdAttack',
  'cmdStop',
  'panUp',
  'panDown',
  'panLeft',
  'panRight',
  'rotateLeft',
  'rotateRight',
  'selectHero',
  'selectHero2',
  'selectArmy',
  'selectBarracks',
  'selectStronghold',
  'pause',
];

const DIFFICULTIES: DifficultyLevel[] = ['story', 'normal', 'hard', 'nightmare'];
const GRAPHICS_LEVELS: GraphicsQuality[] = ['low', 'medium', 'high', 'cinematic'];
const MOUSE_ACTIONS: MouseAction[] = ['hero_jump', 'order', 'rotate_camera', 'thunder_clap'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isFullscreen,
  onUpdateSettings,
  onToggleFullscreen,
  onClose,
}) => {
  const t = getT(settings.language);
  const [tab, setTab] = useState<SettingsTab>('general');
  const [listeningKey, setListeningKey] = useState<RebindableKey | null>(null);

  useEffect(() => {
    if (!listeningKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape' && listeningKey !== 'pause') {
        setListeningKey(null);
        return;
      }
      onUpdateSettings({
        ...settings,
        keyBindings: {
          ...settings.keyBindings,
          [listeningKey]: e.code,
        },
      });
      setListeningKey(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listeningKey, settings, onUpdateSettings]);

  const setLang = (language: LanguageCode) => {
    onUpdateSettings({ ...settings, language });
  };

  const setDifficulty = (difficulty: DifficultyLevel) => {
    onUpdateSettings({ ...settings, difficulty });
  };

  const setGraphics = (graphics: GraphicsQuality) => {
    onUpdateSettings({ ...settings, graphics });
  };

  const resetBindings = () => {
    setListeningKey(null);
    onUpdateSettings({
      ...settings,
      keyBindings: { ...DEFAULT_KEY_BINDINGS },
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(6,8,11,0.88)] p-3 sm:p-6 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t.settings}
    >
      <div className="slavic-frame w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(164,128,72,0.28)] flex items-center justify-between gap-3 shrink-0">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#f2d085] tracking-wide">
            {t.settings}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="slavic-inset min-w-[44px] min-h-[44px] px-3 text-sm font-semibold text-[#e8dfd1] hover:border-[#d8a146] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex flex-wrap gap-2 border-b border-[rgba(164,128,72,0.2)] pb-3 shrink-0">
          <button
            type="button"
            onClick={() => setTab('general')}
            className={`min-h-[44px] px-4 text-xs sm:text-sm font-display font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              tab === 'general'
                ? 'bg-[#d8a146] text-[#140f0a] border border-[#f2d085]'
                : 'slavic-inset text-[#cfc6b4] hover:border-[#d8a146]'
            }`}
          >
            {t.language} · {t.difficulty}
          </button>
          <button
            type="button"
            onClick={() => setTab('audio')}
            className={`min-h-[44px] px-4 text-xs sm:text-sm font-display font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              tab === 'audio'
                ? 'bg-[#d8a146] text-[#140f0a] border border-[#f2d085]'
                : 'slavic-inset text-[#cfc6b4] hover:border-[#d8a146]'
            }`}
          >
            {t.audio}
          </button>
          <button
            type="button"
            onClick={() => setTab('controls')}
            className={`min-h-[44px] px-4 text-xs sm:text-sm font-display font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              tab === 'controls'
                ? 'bg-[#d8a146] text-[#140f0a] border border-[#f2d085]'
                : 'slavic-inset text-[#cfc6b4] hover:border-[#d8a146]'
            }`}
          >
            {t.controls}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {tab === 'general' && (
            <>
              {/* Fullscreen Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 slavic-inset p-3.5">
                <span className="text-sm font-medium text-[#e8dfd1]">
                  {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
                </span>
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="min-h-[44px] px-4 text-xs font-display font-bold uppercase tracking-wider bg-[#26201a] text-[#f2d085] border border-[#a48048] hover:border-[#f2d085] cursor-pointer"
                >
                  {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
                </button>
              </div>

              {/* Difficulty */}
              <div className="space-y-2.5">
                <div className="text-xs font-display uppercase tracking-wider text-[#b7aea0]">
                  {t.difficulty}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DIFFICULTIES.map((diff) => {
                    const active = settings.difficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`min-h-[44px] px-3 py-2 text-xs font-semibold text-center cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#d8a146] text-[#140f0a] border border-[#f2d085]'
                            : 'slavic-inset text-[#e8dfd1] hover:border-[#d8a146]'
                        }`}
                      >
                        {t.difficulties[diff]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graphics Quality */}
              <div className="space-y-2.5">
                <div className="text-xs font-display uppercase tracking-wider text-[#b7aea0]">
                  {t.graphics}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRAPHICS_LEVELS.map((gfx) => {
                    const active = settings.graphics === gfx;
                    return (
                      <button
                        key={gfx}
                        type="button"
                        onClick={() => setGraphics(gfx)}
                        className={`min-h-[44px] px-3 py-2 text-xs font-semibold text-center cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#d8a146] text-[#140f0a] border border-[#f2d085]'
                            : 'slavic-inset text-[#e8dfd1] hover:border-[#d8a146]'
                        }`}
                      >
                        {t.graphicsLevels[gfx]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 16 Languages */}
              <div className="space-y-2.5">
                <div className="text-xs font-display uppercase tracking-wider text-[#b7aea0]">
                  {t.language} (16)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = settings.language === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        dir={opt.rtl ? 'rtl' : 'ltr'}
                        onClick={() => setLang(opt.code)}
                        className={`min-h-[44px] px-3 py-2 text-xs font-medium text-center cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#d8a146] text-[#140f0a] font-bold border border-[#f2d085]'
                            : 'slavic-inset text-[#e8dfd1] hover:border-[#d8a146]'
                        }`}
                      >
                        {opt.nativeName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <div className="space-y-5">
              <div className="slavic-inset p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-[#e8dfd1]">
                  <span>{t.musicVolume}</span>
                  <span className="font-mono-num text-[#f2d085]">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.musicVolume * 100)}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-[#d8a146] h-6 cursor-pointer"
                />
              </div>

              <div className="slavic-inset p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-[#e8dfd1]">
                  <span>{t.sfxVolume}</span>
                  <span className="font-mono-num text-[#f2d085]">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.sfxVolume * 100)}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-[#d8a146] h-6 cursor-pointer"
                />
              </div>

              <div className="slavic-inset p-4 flex items-center justify-between gap-3">
                <span className="text-sm text-[#e8dfd1]">{t.mutedLabel}</span>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
                  className={`min-h-[44px] px-5 text-xs font-display font-bold uppercase tracking-wider cursor-pointer ${
                    settings.muted
                      ? 'bg-[#6b1d17] text-[#ffe1dc] border border-[#e05b52]'
                      : 'bg-[#2a3326] text-[#c7ebc2] border border-[#56b858]'
                  }`}
                >
                  {settings.muted ? 'OFF' : 'ON'}
                </button>
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-5">
              {/* Mouse Bindings */}
              <div className="space-y-2">
                <div className="slavic-inset p-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-[#cfc6b4]">{t.mouseLeftLabel}</span>
                  <span className="text-xs font-semibold text-[#f2d085]">{t.mouseLeftValue}</span>
                </div>

                <div className="slavic-inset p-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-[#cfc6b4]">{t.mouseRightLabel}</span>
                  <select
                    value={settings.keyBindings.mouseRight}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        keyBindings: {
                          ...settings.keyBindings,
                          mouseRight: e.target.value as MouseAction,
                        },
                      })
                    }
                    className="min-h-[40px] bg-[#161310] border border-[#a48048] text-xs sm:text-sm text-[#f2d085] px-3 py-1.5 cursor-pointer"
                  >
                    {MOUSE_ACTIONS.map((act) => (
                      <option key={act} value={act}>
                        {t.mouseActions[act]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="slavic-inset p-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-[#cfc6b4]">{t.mouseMiddleLabel}</span>
                  <select
                    value={settings.keyBindings.mouseMiddle}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        keyBindings: {
                          ...settings.keyBindings,
                          mouseMiddle: e.target.value as MouseAction,
                        },
                      })
                    }
                    className="min-h-[40px] bg-[#161310] border border-[#a48048] text-xs sm:text-sm text-[#f2d085] px-3 py-1.5 cursor-pointer"
                  >
                    {MOUSE_ACTIONS.map((act) => (
                      <option key={act} value={act}>
                        {t.mouseActions[act]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keyboard Bindings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REBINDABLE_KEYS.map((actionKey) => {
                  const listening = listeningKey === actionKey;
                  return (
                    <div
                      key={actionKey}
                      className="slavic-inset px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-[#e8dfd1] truncate">{t.keyActions[actionKey]}</span>
                      <button
                        type="button"
                        onClick={() => setListeningKey(listening ? null : actionKey)}
                        className={`min-w-[84px] min-h-[38px] px-2.5 text-xs font-mono-num font-semibold cursor-pointer border ${
                          listening
                            ? 'bg-[#d8a146] text-[#140f0a] border-[#fff0c2]'
                            : 'bg-[#1b1714] text-[#f2d085] border-[#735933] hover:border-[#d8a146]'
                        }`}
                      >
                        {listening ? t.pressKeyPrompt : formatKeyCode(settings.keyBindings[actionKey])}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetBindings}
                  className="min-h-[44px] px-4 text-xs font-display uppercase tracking-wider slavic-inset text-[#cfc6b4] hover:border-[#d8a146] cursor-pointer"
                >
                  {t.resetDefaults}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[rgba(164,128,72,0.28)] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-7 font-display text-sm font-bold uppercase tracking-wider text-[#140f0a] bg-[#d8a146] hover:bg-[#e8b954] cursor-pointer border border-[#f2d085]"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
