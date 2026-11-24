import React from 'react';
import { audioEngine } from '../game/audio';
import { getT, LANGUAGE_OPTIONS } from '../game/i18n';
import { ChapterId, DifficultyLevel, GameSettings, LanguageCode, SaveSlotSummary } from '../game/types';

interface TitleOverlayProps {
  settings: GameSettings;
  selectedChapter: ChapterId;
  highestUnlockedChapter: ChapterId;
  savedSummary: SaveSlotSummary | null;
  isFullscreen: boolean;
  transitioning?: boolean;
  onSelectChapter: (chapter: ChapterId) => void;
  onStart: () => void;
  onContinueSaved: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onUpdateSettings: (next: GameSettings) => void;
}

const DIFFICULTIES: DifficultyLevel[] = ['story', 'normal', 'hard', 'nightmare'];
const CHAPTERS: ChapterId[] = [1, 2, 3, 4];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  settings,
  selectedChapter,
  highestUnlockedChapter,
  savedSummary,
  isFullscreen,
  transitioning = false,
  onSelectChapter,
  onStart,
  onContinueSaved,
  onOpenSettings,
  onToggleFullscreen,
  onUpdateSettings,
}) => {
  const t = getT(settings.language);
  const activeChapterLoc = t.chapters[selectedChapter];

  return (
    <div
      className={`fixed inset-0 z-20 flex flex-col justify-between pointer-events-none transition-opacity duration-500 ${
        transitioning ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: transitioning
          ? 'rgba(7, 9, 13, 0.72)'
          : 'linear-gradient(90deg, rgba(9, 11, 15, 0.92) 0%, rgba(11, 13, 18, 0.72) 42%, rgba(11, 13, 18, 0.14) 76%, rgba(9, 11, 15, 0.38) 100%)',
      }}
    >
      {/* Top Utility Row: Language Quick Switcher, Fullscreen, Settings */}
      <div className="px-4 sm:px-8 md:px-16 pt-4 flex items-center justify-end gap-2 pointer-events-auto">
        <label className="sr-only" htmlFor="title-lang-select">
          {t.language}
        </label>
        <select
          id="title-lang-select"
          data-testid="title-language-select"
          value={settings.language}
          onChange={(e) => {
            audioEngine.playMenuClick();
            onUpdateSettings({ ...settings, language: e.target.value as LanguageCode });
          }}
          className="slavic-frame min-h-[44px] px-3 py-1.5 text-xs sm:text-sm text-[#e8dfd1] bg-[#14110f] cursor-pointer"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.nativeName}
            </option>
          ))}
        </select>

        <button
          type="button"
          onMouseEnter={() => audioEngine.playMenuHover()}
          onClick={() => {
            audioEngine.playMenuClick();
            onToggleFullscreen();
          }}
          data-testid="title-fullscreen-btn"
          aria-label={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
          className="slavic-frame min-h-[44px] px-3 py-1.5 text-xs font-medium text-[#e8dfd1] hover:border-[#d8a146] transition-transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
        >
          {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
        </button>

        <button
          type="button"
          onMouseEnter={() => audioEngine.playMenuHover()}
          onClick={() => {
            audioEngine.playMenuClick();
            onOpenSettings();
          }}
          data-testid="title-settings-btn"
          className="slavic-frame min-h-[44px] px-3.5 py-1.5 text-xs font-medium text-[#f2d085] hover:border-[#d8a146] transition-transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
        >
          {t.settings}
        </button>
      </div>

      {/* Main Left-Aligned Hero Composition */}
      <div className="flex-1 flex items-center px-5 sm:px-8 md:px-16 max-w-3xl">
        <div className="pointer-events-auto flex flex-col items-start gap-3.5 sm:gap-4 w-full">
          {/* Bespoke Dark Slavic Sun-Axe & Kolovrat Emblem */}
          <svg
            viewBox="0 0 88 88"
            className="w-12 h-12 sm:w-16 sm:h-16 text-[#d8a146]"
            aria-hidden="true"
          >
            <circle cx="44" cy="44" r="38" fill="rgba(18,15,13,0.9)" stroke="#a48048" strokeWidth="2.5" />
            <circle cx="44" cy="44" r="30" fill="none" stroke="rgba(216,161,70,0.45)" strokeWidth="1.2" strokeDasharray="5 4" />
            <path d="M24 64 L64 24 M64 64 L24 24" stroke="#8b949e" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M56 18 C67 20 71 29 66 36 L54 28 Z" fill="#c7ccd1" stroke="#30363d" strokeWidth="1.4" />
            <path d="M32 18 C21 20 17 29 22 36 L34 28 Z" fill="#c7ccd1" stroke="#30363d" strokeWidth="1.4" />
            <polygon points="44,24 58,38 44,64 30,38" fill="#6b1d17" stroke="#d8a146" strokeWidth="2" />
            <circle cx="44" cy="42" r="5" fill="#e8c373" />
          </svg>

          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-wide text-[#efe4d2] hud-text-shadow leading-[1.06] text-balance">
              {t.gameTitle}
            </h1>
            <p className="font-body text-sm sm:text-base md:text-lg text-[#b7aea0] max-w-md leading-relaxed hud-text-shadow">
              {t.gameSubtitle}
            </p>
          </div>

          {/* Campaign Chapter Selector */}
          <div className="space-y-1.5 w-full">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.chapterLabel}>
              {CHAPTERS.map((ch) => {
                const locked = ch > highestUnlockedChapter;
                const active = selectedChapter === ch;
                const chLoc = t.chapters[ch];
                return (
                  <button
                    key={ch}
                    type="button"
                    data-testid={`title-chapter-${ch}`}
                    disabled={locked}
                    onMouseEnter={() => {
                      if (!locked) audioEngine.playMenuHover();
                    }}
                    onClick={() => {
                      audioEngine.playMenuClick();
                      onSelectChapter(ch);
                    }}
                    className={`min-h-[38px] px-3 py-1 text-xs font-semibold transition-all border ${
                      locked
                        ? 'bg-[rgba(12,11,10,0.45)] text-[#625b52] border-[rgba(164,128,72,0.16)] cursor-not-allowed'
                        : active
                          ? 'bg-[#2e2418] text-[#f2d085] border-[#d8a146] shadow-[0_0_14px_rgba(216,161,70,0.22)] cursor-pointer'
                          : 'bg-[rgba(12,11,10,0.75)] text-[#b7aea0] border-[rgba(164,128,72,0.28)] hover:text-[#e8dfd1] hover:border-[#a48048] hover:scale-[1.02] cursor-pointer'
                    }`}
                  >
                    {t.chapterLabel} {chLoc.short}: {chLoc.title}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#c9bfa8] hud-text-shadow">{activeChapterLoc.desc}</p>
          </div>

          {/* Inline Compact Difficulty Selector */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.difficulty}>
            {DIFFICULTIES.map((diff) => {
              const active = settings.difficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onMouseEnter={() => audioEngine.playMenuHover()}
                  onClick={() => {
                    audioEngine.playMenuClick();
                    onUpdateSettings({ ...settings, difficulty: diff });
                  }}
                  className={`min-h-[38px] px-3 py-1 text-xs font-medium cursor-pointer transition-all border ${
                    active
                      ? 'bg-[#2e2418] text-[#f2d085] border-[#d8a146]'
                      : 'bg-[rgba(12,11,10,0.75)] text-[#9c9487] border-[rgba(164,128,72,0.28)] hover:text-[#e8dfd1] hover:scale-[1.02]'
                  }`}
                >
                  {t.difficulties[diff]}
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-start="true"
              onMouseEnter={() => audioEngine.playMenuHover()}
              onClick={() => {
                audioEngine.playMenuClick();
                onStart();
              }}
              className="min-h-[48px] px-6 sm:px-7 py-3 font-display text-sm sm:text-base font-bold tracking-wider uppercase text-[#140f0a] bg-[#d8a146] hover:bg-[#e8b954] hover:scale-[1.02] active:translate-y-0.5 transition-all cursor-pointer border border-[#f2d085] shadow-[0_8px_28px_rgba(216,161,70,0.28)] whitespace-nowrap"
            >
              {t.startBattle}
            </button>
            {savedSummary && (
              <button
                type="button"
                data-testid="title-continue-btn"
                onMouseEnter={() => audioEngine.playMenuHover()}
                onClick={() => {
                  audioEngine.playMenuClick();
                  onContinueSaved();
                }}
                className="min-h-[48px] px-4 sm:px-5 py-3 font-display text-sm font-semibold tracking-wider uppercase text-[#f2d085] slavic-frame hover:border-[#d8a146] transition-transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
              >
                {t.continueBattle} · {t.chapters[savedSummary.chapter]?.short ?? savedSummary.chapter}
              </button>
            )}
            <button
              type="button"
              onMouseEnter={() => audioEngine.playMenuHover()}
              onClick={() => {
                audioEngine.playMenuClick();
                onOpenSettings();
              }}
              className="min-h-[48px] px-5 py-3 font-display text-sm font-semibold tracking-wider uppercase text-[#e8dfd1] slavic-frame hover:border-[#d8a146] transition-transform hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            >
              {t.settings}
            </button>
          </div>
        </div>
      </div>

      {/* Single flat borderless bottom control hint */}
      <div className="px-5 sm:px-8 md:px-16 pb-5 sm:pb-7 flex items-center justify-between text-[11px] sm:text-xs text-[#cfc7b8] tracking-wide">
        <p className="hud-text-shadow leading-snug">{t.titleControlHint}</p>
      </div>
    </div>
  );
};
