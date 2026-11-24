import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../game/audio';
import { getMapLayout } from '../game/biomes';
import { BUILDING_STATS, MAP_HALF_SIZE, RELIC_DEFS, UNIT_STATS, UPGRADE_DEFS } from '../game/constants';
import { TouchMode } from '../game/engine';
import { getT } from '../game/i18n';
import { getBuildingUpgrades, getUpgradeCost } from '../game/rules';
import { formatKeyCode } from '../game/settings';
import {
  AbilityId,
  BuildingKind,
  CommandMode,
  FormationKind,
  GameSettings,
  HudSnapshot,
  RelicId,
  SaveSlotSummary,
  UnitKind,
  UpgradeId,
} from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  settings: GameSettings;
  isFullscreen: boolean;
  touchMode: TouchMode;
  savedSummary: SaveSlotSummary | null;
  saveFeedback: boolean;
  onSetTouchMode: (mode: TouchMode) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onSaveBattle: () => void;
  onLoadBattle: () => void;
  onNextChapter: () => void;
  onCastAbility: (id: AbilityId) => void;
  onToggleAutocast: (id: AbilityId) => void;
  onSetFormation: (formation: FormationKind) => void;
  onSelectGroup: (slot: 1 | 2 | 3) => void;
  onTrainUnit: (kind: UnitKind) => void;
  onResearchUpgrade: (id: UpgradeId) => void;
  onBuyRelic: (id: RelicId) => void;
  onUseRelicSlot: (slotIndex: number) => void;
  onSetCommandMode: (mode: CommandMode) => void;
  onStartBuildMode: (kind: BuildingKind) => void;
  onStopSelected: () => void;
  onSelectHero: () => void;
  onSelectHero2: () => void;
  onSelectArmy: () => void;
  onSelectBarracks: () => void;
  onSelectStronghold: () => void;
  onSelectWorker: () => void;
  onMinimapClick: (x: number, z: number) => void;
}

const PortraitGlyph: React.FC<{ kind: string }> = ({ kind }) => {
  if (kind === 'voivode') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#171210" />
        <path d="M14 54 C16 40 48 40 50 54" fill="#6b1d17" stroke="#d8a146" strokeWidth="2" />
        <circle cx="32" cy="30" r="11" fill="#c29a7d" />
        <path d="M20 26 L32 8 L44 26 Z" fill="#9aa4af" stroke="#d8a146" strokeWidth="2" />
        <rect x="30.5" y="22" width="3" height="11" fill="#d8a146" />
        <path d="M24 35 Q32 42 40 35" fill="none" stroke="#4a3122" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === 'vedunya') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#0d191b" />
        <path d="M13 54 C16 39 48 39 51 54" fill="#234d3d" stroke="#85e8ff" strokeWidth="2" />
        <path d="M21 20 Q16 10 25 8 M43 20 Q48 10 39 8" fill="none" stroke="#d8b97a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M23 19 Q32 13 41 19" fill="none" stroke="#f2d085" strokeWidth="3" />
        <circle cx="32" cy="29" r="9.5" fill="#d8b9a3" />
        <circle cx="50" cy="18" r="4.5" fill="#6ee7ff" />
        <line x1="50" y1="22" x2="50" y2="54" stroke="#8f673f" strokeWidth="2.5" />
      </svg>
    );
  }
  if (kind === 'spirit_wolf') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#09151c" />
        <polygon points="18,48 22,22 28,12 32,22 36,12 42,22 46,48" fill="#328ca8" stroke="#8eeeff" strokeWidth="2" />
        <circle cx="27" cy="29" r="2.3" fill="#c7fbff" />
        <circle cx="37" cy="29" r="2.3" fill="#c7fbff" />
        <polygon points="32,34 28,42 36,42" fill="#9ef0ff" />
      </svg>
    );
  }
  if (kind === 'ratnik') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#141618" />
        <circle cx="32" cy="36" r="16" fill="#5c3c24" stroke="#9aa4af" strokeWidth="3" />
        <circle cx="32" cy="36" r="5" fill="#9aa4af" />
        <path d="M22 22 L32 9 L42 22 Z" fill="#88929b" stroke="#2d333b" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === 'luchnik') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#121814" />
        <path d="M18 50 Q42 32 18 14" fill="none" stroke="#a3774c" strokeWidth="3.5" />
        <line x1="18" y1="14" x2="18" y2="50" stroke="#c8c0b4" strokeWidth="1.2" />
        <line x1="14" y1="32" x2="48" y2="32" stroke="#f0d28c" strokeWidth="2.2" />
        <polygon points="48,32 41,28 41,36" fill="#9aa4af" />
      </svg>
    );
  }
  if (kind === 'volkhv') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#161210" />
        <path d="M24 28 L14 10 M40 28 L50 10" stroke="#bcb3a2" strokeWidth="3" strokeLinecap="round" />
        <polygon points="32,18 42,32 32,48 22,32" fill="#ff7b29" stroke="#ffd27d" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === 'kholop') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#171410" />
        <path d="M16 54 C19 40 45 40 48 54" fill="#b89f80" stroke="#7a5b3b" strokeWidth="2" />
        <circle cx="32" cy="28" r="9.5" fill="#c99f80" />
        <path d="M23 24 Q32 15 41 24" fill="#5e4128" />
        <line x1="47" y1="16" x2="47" y2="52" stroke="#8f673f" strokeWidth="3" />
        <path d="M47 16 L57 20 L55 29 L47 26 Z" fill="#9aa4af" stroke="#d8a146" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'vezha') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#131618" />
        <polygon points="18,24 32,10 46,24" fill="#3a291c" stroke="#d8a146" strokeWidth="2" />
        <rect x="23" y="24" width="18" height="28" fill="#5c4028" stroke="#a48048" strokeWidth="2" />
        <rect x="29" y="30" width="6" height="8" fill="#ff9e3b" />
      </svg>
    );
  }
  if (kind === 'kapishche') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#121716" />
        <ellipse cx="32" cy="48" rx="20" ry="7" fill="#4f565b" stroke="#8f98a0" strokeWidth="2" />
        <rect x="27" y="16" width="10" height="30" fill="#8b653c" stroke="#d8a146" strokeWidth="1.5" />
        <polygon points="25,16 32,9 39,16" fill="#d8a146" />
        <circle cx="20" cy="40" r="4" fill="#ff8d2e" />
      </svg>
    );
  }
  if (kind === 'strelomet') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#171410" />
        <path d="M16 42 Q32 22 48 42" fill="none" stroke="#8b653c" strokeWidth="4" />
        <line x1="16" y1="42" x2="48" y2="42" stroke="#c8c0b4" strokeWidth="1.5" />
        <line x1="32" y1="52" x2="32" y2="14" stroke="#d8a146" strokeWidth="3.5" />
        <polygon points="32,8 26,20 38,20" fill="#cbd5e1" />
        <circle cx="18" cy="49" r="5" fill="#52341f" stroke="#9aa4af" strokeWidth="2" />
        <circle cx="46" cy="49" r="5" fill="#52341f" stroke="#9aa4af" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === 'merchant') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#191210" />
        <polygon points="10,32 32,10 54,32" fill="#7a1e18" stroke="#e8b954" strokeWidth="2.5" />
        <rect x="16" y="32" width="32" height="20" fill="#4f3622" stroke="#a48048" strokeWidth="2" />
        <circle cx="32" cy="42" r="5.5" fill="#f2c94c" />
      </svg>
    );
  }
  if (kind === 'fountain') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#0d171c" />
        <ellipse cx="32" cy="46" rx="20" ry="8" fill="#3a454d" stroke="#7de2f4" strokeWidth="2" />
        <ellipse cx="32" cy="44" rx="14" ry="5" fill="#38bdf8" />
        <polygon points="32,12 40,26 32,38 24,26" fill="#7de2f4" stroke="#e0f9ff" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'monolith' || kind === 'upyr' || kind === 'likho' || kind === 'morovik' || kind === 'leshy') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
        <rect width="64" height="64" fill="#0d1712" />
        <polygon points="32,8 46,52 18,52" fill="#232a27" stroke="#3ce882" strokeWidth="2" />
        <circle cx="32" cy="34" r="5" fill="#52f28e" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-14 sm:h-14">
      <rect width="64" height="64" fill="#161412" />
      <polygon points="12,34 32,14 52,34 52,52 12,52" fill="#4f3622" stroke="#a48048" strokeWidth="2" />
      <rect x="26" y="38" width="12" height="14" fill="#1a1410" />
    </svg>
  );
};

const RelicGlyph: React.FC<{ id: RelicId }> = ({ id }) => {
  const color = RELIC_DEFS[id].color;
  if (id === 'living_water') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M9 3h6v3l3 4.5V19a2 2 0 01-2 2H8a2 2 0 01-2-2v-8.5L9 6V3z" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.8" />
        <path d="M8 14h8v5H8z" fill={color} fillOpacity="0.65" />
      </svg>
    );
  }
  if (id === 'perun_amulet') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <polygon points="13,2 6,13 12,13 11,22 18,11 12,11" fill={color} fillOpacity="0.7" stroke={color} strokeWidth="1.4" />
      </svg>
    );
  }
  if (id === 'rod_ward') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.8" />
        <circle cx="12" cy="11" r="2.2" fill={color} />
      </svg>
    );
  }
  if (id === 'svarog_ring') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <circle cx="12" cy="13" r="6" stroke={color} strokeWidth="2.4" />
        <polygon points="12,3 15,7 12,10 9,7" fill={color} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M12 3L5 19l7-3 7 3L12 3z" fill={color} fillOpacity="0.32" stroke={color} strokeWidth="1.8" />
    </svg>
  );
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  settings,
  isFullscreen,
  touchMode,
  savedSummary,
  saveFeedback,
  onSetTouchMode,
  onToggleMute,
  onToggleFullscreen,
  onOpenSettings,
  onPause,
  onResume,
  onRestart,
  onReturnTitle,
  onSaveBattle,
  onLoadBattle,
  onNextChapter,
  onCastAbility,
  onToggleAutocast,
  onSetFormation,
  onSelectGroup,
  onTrainUnit,
  onResearchUpgrade,
  onBuyRelic,
  onUseRelicSlot,
  onSetCommandMode,
  onStartBuildMode,
  onStopSelected,
  onSelectHero,
  onSelectHero2,
  onSelectArmy,
  onSelectBarracks,
  onSelectStronghold,
  onSelectWorker,
  onMinimapClick,
}) => {
  const t = getT(settings.language);
  const kb = settings.keyBindings;
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (hud.announcementWave !== null && hud.phase === 'playing') {
      const msg = t.waves[hud.announcementWave];
      if (msg) {
        audioEngine.playEventVoice(`wave_${hud.announcementWave}`, msg, settings.language);
      }
    }
  }, [hud.announcementWave, hud.phase, settings.language, t.waves]);

  useEffect(() => {
    if (hud.bossPhaseBanner && hud.phase === 'playing') {
      const msg = t.bossPhaseAlerts[hud.bossPhaseBanner];
      if (msg) {
        audioEngine.playEventVoice(`boss_phase_${hud.bossPhaseBanner}`, msg, settings.language);
      }
    }
  }, [hud.bossPhaseBanner, hud.phase, settings.language, t.bossPhaseAlerts]);

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const toPx = (val: number) => ((val + MAP_HALF_SIZE) / (MAP_HALF_SIZE * 2)) * w;
    const layout = getMapLayout(hud.chapter ?? 1);
    const pal = layout.palette;

    ctx.fillStyle = pal.minimapBg;
    ctx.fillRect(0, 0, w, h);

    const [rx1, rz1, rx2, rz2] = layout.riverMinimapLine;
    ctx.strokeStyle = pal.minimapRiver;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(toPx(rx1), toPx(rz1));
    ctx.lineTo(toPx(rx2), toPx(rz2));
    ctx.stroke();

    const [dx1, dz1, dx2, dz2] = layout.roadMinimapLine;
    ctx.strokeStyle = pal.minimapRoad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(toPx(dx1), toPx(dz1));
    ctx.lineTo(toPx(dx2), toPx(dz2));
    ctx.stroke();

    ctx.fillStyle = '#8b6a44';
    for (const br of layout.bridges) {
      ctx.fillRect(toPx(br.x) - 4, toPx(br.z) - 4, 8, 8);
    }

    for (const r of hud.minimapResources) {
      ctx.fillStyle = r.kind === 'gold' ? '#f2c94c' : '#4a8f5c';
      ctx.fillRect(toPx(r.x) - 2.5, toPx(r.z) - 2.5, 5, 5);
    }

    for (const b of hud.minimapBuildings) {
      ctx.fillStyle = b.underConstruction
        ? '#f2c94c'
        : b.faction === 'player'
          ? '#d8a146'
          : b.faction === 'neutral'
            ? '#7de2f4'
            : '#45e68b';
      ctx.fillRect(toPx(b.x) - 4, toPx(b.z) - 4, 8, 8);
    }

    if (hud.minimapFog.length > 0) {
      const fogDim = Math.round(Math.sqrt(hud.minimapFog.length));
      if (fogDim > 0) {
        const cellW = w / fogDim;
        const cellH = h / fogDim;
        for (let gz = 0; gz < fogDim; gz++) {
          for (let gx = 0; gx < fogDim; gx++) {
            const v = hud.minimapFog[gz * fogDim + gx];
            if (v === 0) {
              ctx.fillStyle = 'rgba(5, 8, 12, 0.92)';
              ctx.fillRect(gx * cellW, gz * cellH, cellW + 0.6, cellH + 0.6);
            } else if (v === 1) {
              ctx.fillStyle = 'rgba(7, 10, 15, 0.56)';
              ctx.fillRect(gx * cellW, gz * cellH, cellW + 0.6, cellH + 0.6);
            }
          }
        }
      }
    }

    for (const u of hud.minimapUnits) {
      ctx.fillStyle = u.isHero ? '#ffe07d' : u.isBoss ? '#ff492e' : u.faction === 'player' ? '#5ec26e' : '#e04f4f';
      const r = u.isHero || u.isBoss ? 3.2 : 2.1;
      ctx.beginPath();
      ctx.arc(toPx(u.x), toPx(u.z), r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of hud.minimapBuildings) {
      if (b.faction !== 'neutral') continue;
      ctx.fillStyle = b.kind === 'merchant' ? '#f2c94c' : '#7de2f4';
      ctx.strokeStyle = '#0f1417';
      ctx.lineWidth = 1.2;
      ctx.fillRect(toPx(b.x) - 3.5, toPx(b.z) - 3.5, 7, 7);
      ctx.strokeRect(toPx(b.x) - 3.5, toPx(b.z) - 3.5, 7, 7);
    }
  }, [hud.chapter, hud.minimapUnits, hud.minimapBuildings, hud.minimapResources, hud.minimapFog]);

  const handleMinimapPointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const nz = (e.clientY - rect.top) / rect.height;
    const wx = nx * MAP_HALF_SIZE * 2 - MAP_HALF_SIZE;
    const wz = nz * MAP_HALF_SIZE * 2 - MAP_HALF_SIZE;
    onMinimapClick(wx, wz);
  };

  const primaryUnit = hud.selectedUnits[0] ?? null;
  const hasWorkerSelected = hud.selectedUnits.some((u) => u.kind === 'kholop');
  const showingVedunya = hud.activeHeroKind === 'vedunya' || primaryUnit?.kind === 'vedunya';
  const activeAbilities = showingVedunya ? hud.hero2Abilities : hud.abilities;
  const activeHeroAlive = showingVedunya ? hud.hero2Hp > 0 : hud.heroHp > 0;
  const BUILD_OPTIONS: BuildingKind[] = ['vezha', 'kapishche', 'kazarma'];
  const buildingUpgrades =
    hud.selectedBuilding && !hud.selectedBuilding.underConstruction
      ? getBuildingUpgrades(hud.selectedBuilding.kind)
      : [];
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const abilityHotkeys = [
    formatKeyCode(kb.abilityQ),
    formatKeyCode(kb.abilityW),
    formatKeyCode(kb.abilityE),
  ];

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
      {/* Top Perimeter Resource & Utility Strip */}
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 gap-2">
        <div className="pointer-events-auto slavic-frame px-2.5 sm:px-4 py-1.5 flex items-center gap-2 sm:gap-4 text-xs sm:text-sm min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f2c94c]" fill="currentColor" aria-hidden="true">
              <polygon points="12,2 21,9 17,21 7,21 3,9" />
            </svg>
            <span className="hidden md:inline text-[11px] uppercase tracking-wider text-[#9c9487]">{t.gold}</span>
            <span className="font-mono-num font-semibold text-[#f5d57a]" data-testid="hud-gold">
              {hud.gold}
            </span>
          </div>

          <span className="text-[#5e5242] hidden sm:inline" aria-hidden="true">·</span>

          <div className="flex items-center gap-1.5 shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6ab070]" fill="currentColor" aria-hidden="true">
              <polygon points="12,2 19,12 15,12 20,20 4,20 9,12 5,12" />
            </svg>
            <span className="hidden md:inline text-[11px] uppercase tracking-wider text-[#9c9487]">{t.wood}</span>
            <span className="font-mono-num font-semibold text-[#a5d6a7]" data-testid="hud-wood">
              {hud.wood}
            </span>
          </div>

          <span className="text-[#5e5242] hidden sm:inline" aria-hidden="true">·</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden lg:inline text-[11px] uppercase tracking-wider text-[#9c9487]">{t.supply}</span>
            <span className="font-mono-num font-semibold text-[#e8dfd1]" data-testid="hud-supply">
              {hud.supplyUsed}/{hud.supplyCap}
            </span>
          </div>

          <span className="text-[#5e5242] hidden sm:inline" aria-hidden="true">·</span>

          <div className="hidden sm:flex items-center gap-1 shrink-0" data-testid="hud-chapter-badge">
            <span className="text-[11px] font-semibold text-[#d8a146]">
              {t.chapters[hud.chapter]?.short ?? hud.chapter}
            </span>
          </div>

          <span className="text-[#5e5242] hidden sm:inline" aria-hidden="true">·</span>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9c9487]">
              <span className="sm:hidden">{t.wave.slice(0, 1)}</span>
              <span className="hidden sm:inline">{t.wave}</span>
            </span>
            <span className="font-mono-num font-semibold text-[#e8b954]">
              {hud.wave}/{hud.maxWaves}
            </span>
            {hud.wave < hud.maxWaves && (
              <span className="font-mono-num text-[11px] text-[#9c9487] hidden sm:inline">
                ({hud.waveTimer}{t.unitShort.sec})
              </span>
            )}
          </div>

          <span className="text-[#5e5242] hidden md:inline" aria-hidden="true">·</span>

          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-[#6ce69c]">{t.monolithLabel}</span>
            <span className="font-mono-num font-semibold text-[#6ce69c]">
              {Math.round((hud.monolithHp / Math.max(1, hud.monolithMaxHp)) * 100)}%
            </span>
          </div>

          <span className="text-[#5e5242] hidden 2xl:inline" aria-hidden="true">·</span>

          <div className="hidden 2xl:flex items-center gap-1.5 shrink-0 text-[11px] text-[#b7aea0]" data-testid="hud-music-zone">
            <span aria-hidden="true">♪</span>
            <span>{t.musicZones[hud.musicZone]}</span>
          </div>
        </div>

        {/* Right Quick-Select & Utility Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <div className="hidden lg:flex items-center gap-1">
            {([1, 2, 3] as const).map((slot) =>
              hud.controlGroups[slot] > 0 ? (
                <button
                  key={`grp-${slot}`}
                  type="button"
                  data-testid={`hud-group-${slot}`}
                  tabIndex={-1}
                  title={`${t.groupLabel} ${slot} (Ctrl+${slot})`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectGroup(slot);
                  }}
                  className="slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-mono-num font-semibold text-[#7de2f4] border-[#3d7c8f] hover:bg-[#19282e] cursor-pointer whitespace-nowrap"
                >
                  [{slot}] {hud.controlGroups[slot]}
                </button>
              ) : null,
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectHero();
              }}
              className="slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-medium text-[#f2d085] hover:bg-[#2a231c] cursor-pointer whitespace-nowrap"
            >
              {t.heroBtn} [{formatKeyCode(kb.selectHero)}]
            </button>
            <button
              type="button"
              data-testid="hud-hero2-btn"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectHero2();
              }}
              className={`slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-medium hover:bg-[#2a231c] cursor-pointer whitespace-nowrap ${
                hud.hero2Hp > 0 ? 'text-[#8eeeff]' : 'text-[#9c9487]'
              }`}
            >
              {t.hero2Btn} [{formatKeyCode(kb.selectHero2)}]
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectArmy();
              }}
              className="slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-medium text-[#e8dfd1] hover:bg-[#2a231c] cursor-pointer whitespace-nowrap"
            >
              {t.armyBtn} [{formatKeyCode(kb.selectArmy)}]
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectBarracks();
              }}
              className="slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-medium text-[#e8dfd1] hover:bg-[#2a231c] cursor-pointer whitespace-nowrap"
            >
              {t.barracksBtn} [{formatKeyCode(kb.selectBarracks)}]
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectStronghold();
              }}
              className="slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-medium text-[#e8dfd1] hover:bg-[#2a231c] cursor-pointer whitespace-nowrap"
            >
              {t.keepBtn} [{formatKeyCode(kb.selectStronghold)}]
            </button>
            <button
              type="button"
              data-testid="hud-builder-btn"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectWorker();
              }}
              className="slavic-frame px-2 py-1.5 text-[11px] xl:text-xs font-medium text-[#7be8a2] hover:bg-[#192821] cursor-pointer whitespace-nowrap"
            >
              {t.builderBtn}
            </button>
          </div>

          <button
            type="button"
            data-testid="hud-fullscreen-btn"
            aria-label={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFullscreen();
            }}
            className="slavic-frame min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] px-2 flex items-center justify-center text-[#c9bfa8] hover:text-[#f2d085] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              {isFullscreen ? (
                <path d="M9 3v4a2 2 0 01-2 2H3m18 0h-4a2 2 0 01-2-2V3m0 18v-4a2 2 0 012-2h4M3 15h4a2 2 0 012 2v4" />
              ) : (
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              )}
            </svg>
          </button>

          <button
            type="button"
            aria-label={t.muteToggle}
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="slavic-frame min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-[#c9bfa8] hover:text-[#f2d085] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              {settings.muted ? (
                <path d="M22 9l-6 6M16 9l6 6" />
              ) : (
                <path d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" />
              )}
            </svg>
          </button>

          <button
            type="button"
            data-testid="hud-menu-btn"
            aria-label={t.menu}
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="slavic-frame min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] px-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-[#f2d085] hover:border-[#d8a146] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
            <span className="hidden sm:inline">{t.menu}</span>
          </button>
        </div>
      </header>

      {/* Center Top Boss Health & Phase Bar */}
      {hud.bossInfo && hud.phase === 'playing' && (
        <div
          data-testid="hud-boss-bar"
          className="mx-auto mt-1 slavic-frame px-3.5 py-2 pointer-events-none w-[min(420px,90vw)] space-y-1"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
            <span className="font-display font-bold text-[#f2d085] truncate">{t.bossTitle}</span>
            <span
              className={`font-semibold shrink-0 px-1.5 py-0.5 text-[10px] border ${
                hud.bossInfo.phase === 3
                  ? 'bg-[#3b1212] text-[#ff8b80] border-[#ef4444]'
                  : hud.bossInfo.phase === 2
                    ? 'bg-[#362210] text-[#ffd075] border-[#f59e0b]'
                    : 'bg-[#10291c] text-[#7be8a2] border-[#45e68b]'
              }`}
            >
              {t.bossPhaseLabels[hud.bossInfo.phase]}
            </span>
          </div>
          <div className="h-2.5 sm:h-3 slavic-inset relative overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                hud.bossInfo.phase === 3
                  ? 'bg-[#d94436]'
                  : hud.bossInfo.phase === 2
                    ? 'bg-[#d98826]'
                    : 'bg-[#3cc474]'
              }`}
              style={{
                width: `${Math.max(0, (hud.bossInfo.hp / Math.max(1, hud.bossInfo.maxHp)) * 100)}%`,
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-mono-num text-[9px] sm:text-[10px] text-white hud-text-shadow">
              {hud.bossInfo.hp} / {hud.bossInfo.maxHp}
            </span>
          </div>
        </div>
      )}

      {/* Center Top Wave or Boss Phase Alert Banner */}
      {hud.bossPhaseBanner ? (
        <div
          data-testid="hud-boss-phase-banner"
          className="mx-auto mt-1 slavic-frame border-[#ef4444] px-5 py-2 text-center pointer-events-none max-w-[92vw]"
        >
          <p className="font-display text-xs sm:text-base tracking-wider text-[#ff9385] hud-text-shadow">
            {t.bossPhaseAlerts[hud.bossPhaseBanner]}
          </p>
        </div>
      ) : (
        hud.announcementWave !== null && (
          <div className="mx-auto mt-1 slavic-frame px-5 py-2 text-center pointer-events-none max-w-[92vw]">
            <p className="font-display text-xs sm:text-base tracking-wider text-[#f2d085] hud-text-shadow">
              {t.waves[hud.announcementWave] ?? ''}
            </p>
          </div>
        )
      )}

      <div className="flex-1" />

      {/* Mobile & Tablet Touch Action Bar (hidden on Desktop lg+) */}
      <div className="lg:hidden px-2 sm:px-4 pb-1.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-auto">
        <div className="slavic-frame p-1 flex items-center gap-1">
          {(['select', 'order', 'jump'] as TouchMode[]).map((mode) => {
            const active = touchMode === mode;
            const label =
              mode === 'select' ? t.touchModeSelect : mode === 'order' ? t.touchModeOrder : t.touchModeJump;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onSetTouchMode(mode)}
                className={`min-h-[36px] px-2.5 text-[11px] font-semibold cursor-pointer ${
                  active ? 'bg-[#d8a146] text-[#140f0a]' : 'text-[#cfc6b4]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onSelectHero}
            className="slavic-frame min-h-[36px] px-2 text-[11px] font-semibold text-[#f2d085] cursor-pointer shrink-0"
          >
            {t.heroBtn}
          </button>
          {hud.hero2Hp > 0 && (
            <button
              type="button"
              onClick={onSelectHero2}
              className="slavic-frame min-h-[36px] px-2 text-[11px] font-semibold text-[#8eeeff] cursor-pointer shrink-0"
            >
              {t.hero2Btn}
            </button>
          )}
          <button
            type="button"
            onClick={onSelectArmy}
            className="slavic-frame min-h-[36px] px-2 text-[11px] font-semibold text-[#e8dfd1] cursor-pointer shrink-0"
          >
            {t.armyBtn}
          </button>
          <button
            type="button"
            onClick={onSelectBarracks}
            className="slavic-frame min-h-[36px] px-2 text-[11px] font-semibold text-[#e8dfd1] cursor-pointer shrink-0"
          >
            {t.barracksBtn}
          </button>
          <button
            type="button"
            onClick={onSelectStronghold}
            className="slavic-frame min-h-[36px] px-2 text-[11px] font-semibold text-[#e8dfd1] cursor-pointer shrink-0"
          >
            {t.keepBtn}
          </button>
          <button
            type="button"
            onClick={onSelectWorker}
            className="slavic-frame min-h-[36px] px-2 text-[11px] font-semibold text-[#7be8a2] cursor-pointer shrink-0"
          >
            {t.builderBtn}
          </button>
        </div>
      </div>

      {/* Bottom Warcraft-3 Style Tactical Console */}
      <footer className="px-2 sm:px-4 pb-2 sm:pb-3 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2 sm:gap-3">
        {/* Bottom-Left: Interactive Minimap (tablet md+ & desktop) */}
        <div className="hidden md:block pointer-events-auto slavic-frame p-1.5 lg:p-2 shrink-0">
          <canvas
            ref={minimapRef}
            width={132}
            height={132}
            onClick={handleMinimapPointer}
            className="block w-[112px] h-[112px] lg:w-[132px] lg:h-[132px] cursor-crosshair border border-[#4a3b28]"
            aria-label={t.minimapAria}
          />
        </div>

        {/* Bottom-Center: Selected Unit / Building Portrait & Stats */}
        <div className="pointer-events-auto slavic-frame px-3 py-2 sm:px-4 sm:py-3 flex-1 max-w-xl min-h-[84px] sm:min-h-[144px] flex items-center gap-3 sm:gap-4 min-w-0">
          {primaryUnit ? (
            <>
              <div className="slavic-inset p-1 shrink-0">
                <PortraitGlyph kind={primaryUnit.kind} />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-sm sm:text-base font-bold text-[#f2d085] truncate">
                    {t.units[primaryUnit.kind]?.name ?? primaryUnit.name}
                    {hud.selectedUnits.length > 1 ? ` (+${hud.selectedUnits.length - 1})` : ''}
                  </h2>
                  {(primaryUnit.kind === 'voivode' || primaryUnit.kind === 'vedunya') && (
                    <span className="font-mono-num text-[11px] sm:text-xs text-[#c7b38a] shrink-0">
                      {t.lvlShort} {primaryUnit.level}
                    </span>
                  )}
                </div>

                <p className="hidden sm:block text-xs text-[#9c9487] truncate">
                  {t.units[primaryUnit.kind]?.role ?? primaryUnit.role}
                </p>

                <div className="space-y-1">
                  <div className="h-3.5 sm:h-4 slavic-inset relative overflow-hidden">
                    <div
                      className="h-full bg-[#4fa34f] transition-all duration-150"
                      style={{ width: `${Math.max(0, (primaryUnit.hp / Math.max(1, primaryUnit.maxHp)) * 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-mono-num text-[9px] sm:text-[10px] leading-none text-white hud-text-shadow">
                      {primaryUnit.hp} / {primaryUnit.maxHp}
                    </span>
                  </div>

                  {primaryUnit.maxMp > 0 && (
                    <div className="h-3 sm:h-3.5 slavic-inset relative overflow-hidden">
                      <div
                        className="h-full bg-[#367eb8] transition-all duration-150"
                        style={{ width: `${Math.max(0, (primaryUnit.mp / Math.max(1, primaryUnit.maxMp)) * 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-mono-num text-[8px] sm:text-[9px] leading-none text-white hud-text-shadow">
                        {primaryUnit.mp} / {primaryUnit.maxMp}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3 text-[11px] sm:text-xs text-[#cfc6b4] font-mono-num">
                    <span>{t.dmgLabel}: {primaryUnit.damage}</span>
                    <span>{t.armorLabel}: {primaryUnit.armor}</span>
                    {primaryUnit.buffed && <span className="text-[#ffbe42]">{t.buffLabel}</span>}
                  </div>

                  {primaryUnit.inventory !== undefined && (
                    <div className="flex items-center gap-1" aria-label={t.relicsLabel}>
                      {[0, 1, 2, 3].map((slotIdx) => {
                        const rId = primaryUnit.inventory?.[slotIdx];
                        const rLoc = rId ? t.relics[rId] : null;
                        const isConsumable = Boolean(rId && RELIC_DEFS[rId].consumable);
                        return (
                          <button
                            key={slotIdx}
                            type="button"
                            data-testid={`hud-relic-slot-${slotIdx}`}
                            tabIndex={-1}
                            disabled={!isConsumable}
                            title={rLoc ? `${rLoc.name} — ${rLoc.desc}` : t.relicsLabel}
                            aria-label={rLoc ? `${rLoc.name}: ${rLoc.desc}` : `${t.relicsLabel} ${slotIdx + 1}`}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              if (isConsumable) onUseRelicSlot(slotIdx);
                            }}
                            className={`slavic-inset w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center relative ${
                              isConsumable
                                ? 'border-[#45e68b] hover:bg-[#192b21] cursor-pointer'
                                : rId
                                  ? 'border-[#8f7245] cursor-default'
                                  : 'opacity-45 cursor-default'
                            }`}
                          >
                            {rId ? (
                              <RelicGlyph id={rId} />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4a3e2e]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : hud.selectedBuilding ? (
            <>
              <div className="slavic-inset p-1 shrink-0">
                <PortraitGlyph kind={hud.selectedBuilding.kind} />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-sm sm:text-base font-bold text-[#f2d085] truncate">
                    {t.buildings[hud.selectedBuilding.kind]?.name ?? hud.selectedBuilding.name}
                  </h2>
                  {hud.selectedBuilding.kind !== 'merchant' && hud.selectedBuilding.kind !== 'fountain' && (
                    <span className="font-mono-num text-[11px] sm:text-xs text-[#9c9487] shrink-0">
                      {hud.selectedBuilding.hp} / {hud.selectedBuilding.maxHp}
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-xs text-[#9c9487] truncate">
                  {t.buildings[hud.selectedBuilding.kind]?.role ?? hud.selectedBuilding.role}
                </p>
                {hud.selectedBuilding.kind !== 'merchant' && hud.selectedBuilding.kind !== 'fountain' && (
                  <div className="h-2.5 sm:h-3 slavic-inset relative overflow-hidden">
                    <div
                      className="h-full bg-[#c98b32] transition-all duration-150"
                      style={{
                        width: `${Math.max(
                          0,
                          (hud.selectedBuilding.hp / Math.max(1, hud.selectedBuilding.maxHp)) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                )}
                {hud.selectedBuilding.underConstruction ? (
                  <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-[#7be8a2]">
                    <span>{t.underConstruction}</span>
                    <span className="font-mono-num font-semibold">
                      {Math.round((hud.selectedBuilding.buildProgress ?? 0) * 100)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-[#e8dfd1] flex-wrap">
                    {hud.selectedBuilding.queue.length > 0 && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">
                          {t.trainingLabel}: {t.units[hud.selectedBuilding.queue[0].kind]?.name ?? ''}
                        </span>
                        <span className="font-mono-num text-[#f2c94c]">
                          {hud.selectedBuilding.queue[0].remaining.toFixed(1)}{t.unitShort.sec}
                        </span>
                      </div>
                    )}
                    {hud.selectedBuilding.researchQueue && (
                      <div className="flex items-center gap-1.5 min-w-0 text-[#9fe4ff]">
                        <span className="truncate">
                          {t.researchingLabel}:{' '}
                          {t.upgrades[hud.selectedBuilding.researchQueue.id]?.name ??
                            hud.selectedBuilding.researchQueue.id}
                        </span>
                        <span className="font-mono-num font-semibold">
                          {hud.selectedBuilding.researchQueue.remaining.toFixed(1)}{t.unitShort.sec}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-[#8f877b]">{t.emptySelectHint}</div>
          )}
        </div>

        {/* Bottom-Right: Responsive Warcraft-3 Command Card */}
        <div className="pointer-events-auto slavic-frame p-2 sm:p-2.5 w-full sm:w-[324px] lg:w-[404px] shrink-0">
          {hud.commandMode === 'build' && hud.pendingBuildKind ? (
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <div className="text-xs font-display font-bold text-[#7be8a2] truncate">
                  {t.buildMenuLabel}: {t.buildings[hud.pendingBuildKind]?.name ?? BUILDING_STATS[hud.pendingBuildKind].name}
                </div>
                <div className="text-[11px] text-[#cfc6b4] mt-0.5 leading-snug">{t.placeBuildingHint}</div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSetCommandMode('normal');
                }}
                className="slavic-inset min-h-[44px] px-3 text-xs font-semibold text-[#f0938c] hover:border-[#e04f4f] cursor-pointer shrink-0"
              >
                {t.cancelBuild}
              </button>
            </div>
          ) : hud.commandMode === 'rally' && hud.selectedBuilding ? (
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <div className="text-xs font-display font-bold text-[#f2d085] truncate">
                  {t.rallyBtn}: {t.buildings[hud.selectedBuilding.kind]?.name ?? hud.selectedBuilding.name}
                </div>
                <div className="text-[11px] text-[#cfc6b4] mt-0.5 leading-snug">{t.placeRallyHint}</div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSetCommandMode('normal');
                }}
                className="slavic-inset min-h-[44px] px-3 text-xs font-semibold text-[#f0938c] hover:border-[#e04f4f] cursor-pointer shrink-0"
              >
                {t.cancelBuild}
              </button>
            </div>
          ) : hud.selectedBuilding?.kind === 'merchant' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-[#f2d085]">
                <span className="truncate">{t.shopLabel}</span>
                {hud.heroHp <= 0 && hud.hero2Hp <= 0 && (
                  <span className="text-[#f0938c] normal-case truncate">{t.shopNeedHeroHint}</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {(Object.keys(RELIC_DEFS) as RelicId[]).map((rId) => {
                  const def = RELIC_DEFS[rId];
                  const rLoc = t.relics[rId];
                  const hasAliveHero = hud.heroHp > 0 || hud.hero2Hp > 0;
                  const canBuy = hasAliveHero && hud.gold >= def.goldCost;
                  return (
                    <button
                      key={rId}
                      type="button"
                      data-testid={`hud-shop-${rId}`}
                      tabIndex={-1}
                      disabled={!canBuy}
                      title={`${rLoc?.name ?? rId} — ${rLoc?.desc ?? ''}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onBuyRelic(rId);
                      }}
                      className={`slavic-inset min-h-[42px] px-1.5 py-1 text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                        canBuy ? 'hover:border-[#d8a146]' : 'opacity-45 cursor-not-allowed'
                      }`}
                    >
                      <span className="shrink-0">
                        <RelicGlyph id={rId} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold text-[#f2d085] truncate">
                          {rLoc?.name ?? rId}
                        </span>
                        <span className="block font-mono-num text-[9px] text-[#f5d57a]">
                          {def.goldCost}{t.unitShort.gold}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : hud.selectedBuilding?.kind === 'fountain' ? (
            <div className="py-2 px-1 text-xs text-[#9fe4ff] leading-relaxed">{t.springAuraHint}</div>
          ) : hud.selectedBuilding && (hud.selectedBuilding.trainableUnits.length > 0 || buildingUpgrades.length > 0) ? (
            <div className="space-y-1.5">
              {hud.selectedBuilding.trainableUnits.length > 0 && (
                <div
                  className={`grid gap-1.5 ${
                    hud.selectedBuilding.trainableUnits.length === 1
                      ? 'grid-cols-1'
                      : hud.selectedBuilding.trainableUnits.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2'
                  }`}
                >
                  {hud.selectedBuilding.trainableUnits.map((uKind) => {
                    const s = UNIT_STATS[uKind];
                    const vedunyaLocked =
                      uKind === 'vedunya' &&
                      (hud.hero2Hp > 0 || hud.selectedBuilding?.queue.some((q) => q.kind === 'vedunya'));
                    const supplyBlocked = hud.supplyUsed + s.supplyCost > hud.supplyCap;
                    const canAfford = hud.gold >= s.goldCost && hud.wood >= s.woodCost && !vedunyaLocked && !supplyBlocked;
                    const unitLoc = t.units[uKind];
                    return (
                      <button
                        key={uKind}
                        type="button"
                        data-testid={`hud-train-${uKind}`}
                        tabIndex={-1}
                        disabled={!canAfford}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onTrainUnit(uKind);
                        }}
                        className={`slavic-inset min-h-[42px] px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          canAfford ? 'hover:border-[#d8a146]' : 'opacity-45 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-[11px] leading-tight font-semibold text-[#f2d085] truncate">
                          {unitLoc?.name ?? s.name}
                        </div>
                        <div className="font-mono-num text-[10px] text-[#b7aea0] mt-0.5">
                          {s.goldCost}{t.unitShort.gold}{' '}
                          {s.woodCost > 0 ? `· ${s.woodCost}${t.unitShort.wood} ` : ''}
                          · {s.supplyCost}{t.unitShort.supply}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {hud.selectedBuilding.trainableUnits.length > 0 && hud.supplyUsed >= hud.supplyCap && (
                <div className="text-[10px] text-[#f0938c] truncate">{t.supplyFullHint}</div>
              )}

              {buildingUpgrades.length > 0 && (
                <div className={`grid gap-1.5 ${buildingUpgrades.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {buildingUpgrades.map((upId) => {
                    const def = UPGRADE_DEFS[upId];
                    const curLvl = hud.upgrades[upId] ?? 0;
                    const maxed = curLvl >= def.maxLevel;
                    const cost = getUpgradeCost(upId, curLvl);
                    const busy = Boolean(hud.selectedBuilding?.researchQueue);
                    const canResearch = !maxed && !busy && hud.gold >= cost.gold && hud.wood >= cost.wood;
                    const upLoc = t.upgrades[upId];
                    return (
                      <button
                        key={upId}
                        type="button"
                        data-testid={`hud-upgrade-${upId}`}
                        tabIndex={-1}
                        disabled={!canResearch}
                        title={upLoc?.desc}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onResearchUpgrade(upId);
                        }}
                        className={`slavic-inset min-h-[42px] px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          canResearch ? 'hover:border-[#7de2f4]' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px] leading-tight font-semibold text-[#9fe4ff]">
                          <span className="truncate">{upLoc?.name ?? upId}</span>
                          <span className="font-mono-num text-[10px] text-[#f2d085] shrink-0">
                            {maxed ? t.maxedLabel : `${t.lvlShort} ${curLvl}/${def.maxLevel}`}
                          </span>
                        </div>
                        <div className="font-mono-num text-[10px] text-[#b7aea0] mt-0.5 truncate">
                          {maxed
                            ? upLoc?.desc
                            : `${cost.gold}${t.unitShort.gold} · ${cost.wood}${t.unitShort.wood}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {hud.selectedBuilding.kind === 'detinets' && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#7be8a2]">{t.buildMenuLabel}</span>
                    {!hud.selectedBuilding.underConstruction && (
                      <button
                        type="button"
                        data-testid="hud-rally-btn"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onSetCommandMode('rally');
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold text-[#f2d085] border border-[rgba(216,161,70,0.45)] hover:bg-[#2a231c] cursor-pointer"
                      >
                        {t.rallyBtn}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BUILD_OPTIONS.map((bKind) => {
                      const bs = BUILDING_STATS[bKind];
                      const canAfford = hud.gold >= bs.goldCost && hud.wood >= bs.woodCost;
                      const bLoc = t.buildings[bKind];
                      return (
                        <button
                          key={`keep-build-${bKind}`}
                          type="button"
                          data-testid={`hud-keep-build-${bKind}`}
                          tabIndex={-1}
                          disabled={!canAfford}
                          onClick={(e) => {
                            e.currentTarget.blur();
                            onStartBuildMode(bKind);
                          }}
                          className={`slavic-inset min-h-[40px] px-2 py-1 text-left cursor-pointer ${
                            canAfford ? 'hover:border-[#56b858]' : 'opacity-45 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-[10px] font-semibold text-[#7be8a2] truncate">
                            {bLoc?.name ?? bs.name}
                          </div>
                          <div className="font-mono-num text-[9px] text-[#b7aea0] mt-0.5">
                            {bs.goldCost}{t.unitShort.gold} · {bs.woodCost}{t.unitShort.wood}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(hud.selectedBuilding.kind === 'kazarma' || hud.selectedBuilding.kind === 'kapishche') &&
                !hud.selectedBuilding.underConstruction && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      data-testid="hud-rally-btn"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSetCommandMode('rally');
                      }}
                      className="slavic-inset min-h-[32px] px-2.5 py-1 text-[10px] font-semibold text-[#f2d085] hover:border-[#d8a146] cursor-pointer"
                    >
                      {t.rallyBtn}
                    </button>
                  </div>
                )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetCommandMode('move');
                  }}
                  className={`slavic-inset min-h-[44px] px-1.5 py-1 text-center cursor-pointer flex flex-col items-center justify-center ${
                    hud.commandMode === 'move' ? 'border-[#56b858]' : 'hover:border-[#a48048]'
                  }`}
                >
                  <div className="text-[10px] sm:text-[11px] font-semibold text-[#e8dfd1] leading-tight">
                    {t.cmdMove}
                  </div>
                  <div className="text-[9px] font-mono-num text-[#9c9487]">[{formatKeyCode(kb.cmdMove)}]</div>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetCommandMode('attack');
                  }}
                  className={`slavic-inset min-h-[44px] px-1.5 py-1 text-center cursor-pointer flex flex-col items-center justify-center ${
                    hud.commandMode === 'attack' ? 'border-[#e04f4f]' : 'hover:border-[#a48048]'
                  }`}
                >
                  <div className="text-[10px] sm:text-[11px] font-semibold text-[#f0938c] leading-tight">
                    {t.cmdAttack}
                  </div>
                  <div className="text-[9px] font-mono-num text-[#c78680]">[{formatKeyCode(kb.cmdAttack)}]</div>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStopSelected();
                  }}
                  className="slavic-inset min-h-[44px] px-1.5 py-1 text-center hover:border-[#a48048] cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="text-[10px] sm:text-[11px] font-semibold text-[#e8dfd1] leading-tight">
                    {t.cmdStop}
                  </div>
                  <div className="text-[9px] font-mono-num text-[#9c9487]">[{formatKeyCode(kb.cmdStop)}]</div>
                </button>
                <button
                  type="button"
                  data-testid="hud-jump-btn"
                  tabIndex={-1}
                  disabled={hud.heroHp <= 0 || hud.heroJumpCooldown > 0}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetCommandMode(hud.commandMode === 'jump' ? 'normal' : 'jump');
                  }}
                  className={`slavic-inset min-h-[44px] px-1.5 py-1 text-center cursor-pointer flex flex-col items-center justify-center ${
                    hud.commandMode === 'jump'
                      ? 'border-[#7de2f4] bg-[#14252e]'
                      : hud.heroJumpCooldown > 0
                        ? 'opacity-55 cursor-not-allowed'
                        : 'hover:border-[#7de2f4]'
                  }`}
                >
                  {hud.heroJumpCooldown > 0 ? (
                    <div className="text-[10px] sm:text-[11px] font-mono-num font-semibold text-[#9fe4ff]">
                      {hud.heroJumpCooldown.toFixed(1)}{t.unitShort.sec}
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] sm:text-[11px] font-semibold text-[#9fe4ff] leading-tight">
                        {t.cmdJump}
                      </div>
                      <div className="text-[9px] font-mono-num text-[#74b6cc]">[{formatKeyCode(kb.heroJump)}]</div>
                    </>
                  )}
                </button>
              </div>

              {hasWorkerSelected ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {BUILD_OPTIONS.map((bKind) => {
                    const bs = BUILDING_STATS[bKind];
                    const canAfford = hud.gold >= bs.goldCost && hud.wood >= bs.woodCost;
                    const bLoc = t.buildings[bKind];
                    return (
                      <button
                        key={bKind}
                        type="button"
                        data-testid={`hud-build-${bKind}`}
                        tabIndex={-1}
                        disabled={!canAfford}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onStartBuildMode(bKind);
                        }}
                        className={`slavic-inset min-h-[44px] px-2 py-1.5 text-left cursor-pointer ${
                          canAfford ? 'hover:border-[#56b858]' : 'opacity-45 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-[10px] font-semibold text-[#7be8a2] truncate">
                          {bLoc?.name ?? bs.name}
                        </div>
                        <div className="font-mono-num text-[9px] text-[#b7aea0] mt-0.5">
                          {bs.goldCost}{t.unitShort.gold} · {bs.woodCost}{t.unitShort.wood}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {activeAbilities.map((ab, idx) => {
                    const ready = ab.remainingCooldown <= 0 && activeHeroAlive;
                    const abLoc = t.abilities[ab.id];
                    const isAuto = Boolean(ab.autocast);
                    return (
                      <div
                        key={ab.id}
                        className={`slavic-inset min-h-[48px] relative overflow-hidden ${
                          isAuto ? 'border-[#d8a146] ring-1 ring-[#d8a146]/45' : ''
                        }`}
                      >
                        <button
                          type="button"
                          data-testid={`hud-ability-${ab.id}`}
                          tabIndex={-1}
                          disabled={!ready}
                          title={abLoc?.desc ?? ab.description}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onToggleAutocast(ab.id);
                          }}
                          onClick={(e) => {
                            e.currentTarget.blur();
                            onCastAbility(ab.id);
                          }}
                          className={`w-full h-full px-2 py-1.5 pb-5 text-left cursor-pointer ${
                            ready ? 'hover:bg-[#231d15]' : 'opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-[#f2d085]">
                            <span>[{abilityHotkeys[idx]}]</span>
                            <span className="font-mono-num text-[10px] text-[#7db8e8]">{ab.manaCost}</span>
                          </div>
                          <div className="text-[10px] text-[#dfd6c5] truncate mt-0.5">{abLoc?.name ?? ab.name}</div>
                          {ab.remainingCooldown > 0 && (
                            <div className="font-mono-num text-[10px] text-[#ffbe42]">
                              {ab.remainingCooldown.toFixed(1)}{t.unitShort.sec}
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          data-testid={`hud-ability-auto-${ab.id}`}
                          aria-pressed={isAuto}
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.currentTarget.blur();
                            onToggleAutocast(ab.id);
                          }}
                          className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border cursor-pointer ${
                            isAuto
                              ? 'bg-[#d8a146] text-[#140f0a] border-[#f2d085]'
                              : 'bg-[#171410] text-[#9c9487] border-[#4a3b28] hover:text-[#f2d085]'
                          }`}
                        >
                          {t.autocastLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Squad Formation Selector Strip */}
              <div className="grid grid-cols-3 gap-1 pt-0.5" role="group" aria-label={t.formationLabel}>
                {(['line', 'wedge', 'box'] as FormationKind[]).map((f) => {
                  const active = hud.formation === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      data-testid={`hud-formation-${f}`}
                      aria-pressed={active}
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSetFormation(f);
                      }}
                      className={`min-h-[28px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#2e2418] text-[#f2d085] border-[#d8a146]'
                          : 'bg-[#12100d] text-[#9c9487] border-[rgba(164,128,72,0.25)] hover:text-[#e8dfd1]'
                      }`}
                    >
                      {t.formations[f]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* Pause / Game Menu Modal */}
      {hud.phase === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(6,8,11,0.8)] p-4 pointer-events-auto">
          <div className="slavic-frame w-full max-w-sm p-6 sm:p-7 text-center space-y-5">
            <h2 className="font-display text-2xl font-bold text-[#f2d085]">{t.pausedTitle}</h2>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="min-h-[44px] w-full py-2.5 font-display font-bold text-sm uppercase tracking-wider text-[#140f0a] bg-[#d8a146] hover:bg-[#e8b954] cursor-pointer"
              >
                {t.resume}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="pause-save-btn"
                  onClick={onSaveBattle}
                  className="min-h-[44px] py-2 font-display text-xs sm:text-sm text-[#7be8a2] slavic-inset hover:border-[#56b858] cursor-pointer"
                >
                  {saveFeedback ? t.savedLabel : t.saveBattle}
                </button>
                <button
                  type="button"
                  data-testid="pause-load-btn"
                  disabled={!savedSummary}
                  onClick={onLoadBattle}
                  className={`min-h-[44px] py-2 font-display text-xs sm:text-sm slavic-inset ${
                    savedSummary
                      ? 'text-[#f2d085] hover:border-[#d8a146] cursor-pointer'
                      : 'text-[#6e675d] opacity-50 cursor-not-allowed'
                  }`}
                >
                  {savedSummary ? t.loadBattle : t.noSaveLabel}
                </button>
              </div>
              <button
                type="button"
                data-testid="pause-settings-btn"
                onClick={onOpenSettings}
                className="min-h-[44px] w-full py-2.5 font-display text-sm text-[#f2d085] slavic-inset hover:border-[#d8a146] cursor-pointer"
              >
                {t.settings}
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="min-h-[44px] w-full py-2.5 font-display text-sm text-[#e8dfd1] slavic-inset hover:border-[#d8a146] cursor-pointer"
              >
                {isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="min-h-[44px] w-full py-2.5 font-display text-sm text-[#e8dfd1] slavic-inset hover:border-[#d8a146] cursor-pointer"
              >
                {t.restart}
              </button>
              <button
                type="button"
                data-testid="pause-exit-menu-btn"
                onClick={onReturnTitle}
                className="min-h-[44px] w-full py-2 text-xs font-medium text-[#b7aea0] hover:text-[#f2d085] cursor-pointer"
              >
                {t.exitToMenu}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {hud.phase === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(6,8,11,0.84)] p-4 pointer-events-auto">
          <div className="slavic-frame w-full max-w-md p-6 sm:p-8 text-center space-y-6">
            <div className="space-y-2">
              <h2
                className={`font-display text-2xl sm:text-3xl font-extrabold tracking-wide ${
                  hud.outcome === 'victory' ? 'text-[#f2d085]' : 'text-[#e05b52]'
                }`}
              >
                {hud.outcome === 'victory' ? t.victoryTitle : t.defeatTitle}
              </h2>
              <p className="text-sm text-[#b7aea0]">
                {hud.outcome === 'victory' ? t.victoryDesc : t.defeatDesc}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="slavic-inset p-3">
                <div className="text-[10px] uppercase text-[#9c9487]">{t.killsLabel}</div>
                <div className="font-mono-num text-xl font-semibold text-[#f2d085] mt-1">{hud.kills}</div>
              </div>
              <div className="slavic-inset p-3">
                <div className="text-[10px] uppercase text-[#9c9487]">{t.wavesLabel}</div>
                <div className="font-mono-num text-xl font-semibold text-[#e8dfd1] mt-1">
                  {hud.wave}/{hud.maxWaves}
                </div>
              </div>
              <div className="slavic-inset p-3">
                <div className="text-[10px] uppercase text-[#9c9487]">{t.timeLabel}</div>
                <div className="font-mono-num text-xl font-semibold text-[#e8dfd1] mt-1">
                  {formatTime(hud.elapsed)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {hud.outcome === 'victory' && hud.chapter < 4 && (
                <button
                  type="button"
                  data-testid="victory-next-chapter-btn"
                  onClick={onNextChapter}
                  className="min-h-[48px] w-full py-3 font-display font-bold text-sm uppercase tracking-wider text-[#140f0a] bg-[#56b858] hover:bg-[#6bd46d] cursor-pointer"
                >
                  {t.nextChapter}
                </button>
              )}
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="min-h-[48px] w-full py-3 font-display font-bold text-sm uppercase tracking-wider text-[#140f0a] bg-[#d8a146] hover:bg-[#e8b954] cursor-pointer"
              >
                {t.playAgain}
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="min-h-[44px] w-full py-2 text-xs text-[#9c9487] hover:text-[#e8dfd1] cursor-pointer"
              >
                {t.mainMenu}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
