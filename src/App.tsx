import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { SettingsModal } from './components/SettingsModal';
import { TitleOverlay } from './components/TitleOverlay';
import { audioEngine } from './game/audio';
import { INITIAL_HERO2_ABILITIES, INITIAL_HERO_ABILITIES } from './game/constants';
import { BoxSelectRect, SlavicRtsEngine, TouchMode } from './game/engine';
import { getT, isRtlLanguage } from './game/i18n';
import {
  getSavedWorldSummary,
  loadHighestChapter,
  loadWorldFromStorage,
  saveWorldToStorage,
  unlockNextChapter,
} from './game/persistence';
import { loadSettings, saveSettings } from './game/settings';
import {
  AbilityId,
  BuildingKind,
  ChapterId,
  FormationKind,
  GameSettings,
  HudSnapshot,
  RelicId,
  SaveSlotSummary,
  UnitKind,
  UpgradeId,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  outcome: null,
  difficulty: 'normal',
  chapter: 1,
  formation: 'line',
  musicZone: 'title',
  gold: 340,
  wood: 180,
  supplyUsed: 8,
  supplyCap: 26,
  wave: 0,
  maxWaves: 3,
  waveTimer: 75,
  elapsed: 0,
  kills: 0,
  unitsLost: 0,
  monolithHp: 1900,
  monolithMaxHp: 1900,
  strongholdHp: 1750,
  strongholdMaxHp: 1750,
  heroHp: 720,
  heroMaxHp: 720,
  heroLevel: 1,
  heroJumpCooldown: 0,
  hero2Hp: 0,
  hero2MaxHp: 540,
  hero2Level: 1,
  activeHeroKind: 'voivode',
  commandMode: 'normal',
  pendingBuildKind: null,
  announcementWave: null,
  bossInfo: null,
  bossPhaseBanner: null,
  selectedUnits: [],
  selectedBuilding: null,
  controlGroups: { 1: 0, 2: 0, 3: 0 },
  upgrades: {
    forged_blades: 0,
    oak_shields: 0,
    bodkin_arrows: 0,
    rod_blessing: 0,
  },
  abilities: INITIAL_HERO_ABILITIES,
  hero2Abilities: INITIAL_HERO2_ABILITIES,
  minimapFog: [],
  minimapUnits: [],
  minimapBuildings: [],
  minimapResources: [],
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<SlavicRtsEngine | null>(null);

  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [touchMode, setTouchMode] = useState<TouchMode>('select');
  const [selectedChapter, setSelectedChapter] = useState<ChapterId>(1);
  const [highestUnlockedChapter, setHighestUnlockedChapter] = useState<ChapterId>(() => loadHighestChapter());
  const [savedSummary, setSavedSummary] = useState<SaveSlotSummary | null>(() => getSavedWorldSummary());
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [isStartingTransition, setIsStartingTransition] = useState(false);

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    ...INITIAL_HUD,
    phase: autostart ? 'playing' : 'title',
  }));
  const [boxRect, setBoxRect] = useState<BoxSelectRect>({
    active: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

  const isFullscreen = nativeFullscreen || pseudoFullscreen;

  // Sync game state to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = hud.phase;
  }, [hud.phase]);

  // Unlock next campaign chapter upon victory
  useEffect(() => {
    if (hud.phase === 'gameover' && hud.outcome === 'victory') {
      const nextHighest = unlockNextChapter(hud.chapter);
      setHighestUnlockedChapter(nextHighest);
    }
  }, [hud.phase, hud.outcome, hud.chapter]);

  // Sync document language, RTL direction & HTML title
  useEffect(() => {
    const t = getT(settings.language);
    document.documentElement.lang = settings.language;
    document.documentElement.dir = isRtlLanguage(settings.language) ? 'rtl' : 'ltr';
    document.title = t.htmlTitle;
  }, [settings.language]);

  // Listen to browser fullscreenchange
  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setNativeFullscreen(active);
      if (!active) setPseudoFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Mount Three.js WebGL scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const initialSettings = loadSettings();
    const engine = new SlavicRtsEngine(
      container,
      autostart ? 'playing' : 'title',
      initialSettings,
      (snap) => setHud(snap),
      (rect) => setBoxRect(rect),
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [autostart]);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore if disallowed
      }
      setNativeFullscreen(false);
      setPseudoFullscreen(false);
      return;
    }

    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }

    const target = rootRef.current ?? document.documentElement;
    if (target.requestFullscreen) {
      try {
        await target.requestFullscreen();
        setNativeFullscreen(true);
        return;
      } catch {
        // Fallback inside sandboxed iframes or headless Chromium
      }
    }
    setPseudoFullscreen(true);
  }, [pseudoFullscreen]);

  const handleSelectChapter = useCallback((chapter: ChapterId) => {
    setSelectedChapter(chapter);
    engineRef.current?.setChapter(chapter);
  }, []);

  const handleStart = useCallback(() => {
    if (isStartingTransition) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsStartingTransition(true);
    engineRef.current?.startGameTransition(settings.difficulty, selectedChapter, () => {
      setIsStartingTransition(false);
      document.body.dataset.state = 'playing';
    });
  }, [isStartingTransition, settings.difficulty, selectedChapter]);

  const handleSaveBattle = useCallback(() => {
    const world = engineRef.current?.getWorldState();
    if (!world) return;
    const summary = saveWorldToStorage(world);
    if (summary) {
      setSavedSummary(summary);
      setSaveFeedback(true);
      window.setTimeout(() => setSaveFeedback(false), 1800);
    }
  }, []);

  const handleLoadBattle = useCallback(() => {
    const payload = loadWorldFromStorage();
    if (!payload) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsStartingTransition(false);
    setSelectedChapter(payload.world.chapter);
    document.body.dataset.state = 'playing';
    engineRef.current?.loadWorldState(payload.world);
  }, []);

  const handleNextChapter = useCallback(() => {
    const nextCh: ChapterId = hud.chapter === 1 ? 2 : hud.chapter === 2 ? 3 : 4;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedChapter(nextCh);
    engineRef.current?.startGame(settings.difficulty, nextCh);
  }, [hud.chapter, settings.difficulty]);

  const handlePause = useCallback(() => {
    engineRef.current?.setPhase('paused');
  }, []);

  const handleResume = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    engineRef.current?.setPhase('playing');
  }, []);

  const handleRestart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    engineRef.current?.restartGame(settings.difficulty, selectedChapter);
  }, [settings.difficulty, selectedChapter]);

  const handleReturnTitle = useCallback(() => {
    setSettingsOpen(false);
    engineRef.current?.setPhase('title');
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !settings.muted;
    const next = { ...settings, muted: nextMuted };
    audioEngine.setMuted(nextMuted);
    handleUpdateSettings(next);
  }, [settings, handleUpdateSettings]);

  const handleSetTouchMode = useCallback((mode: TouchMode) => {
    setTouchMode(mode);
    engineRef.current?.setTouchMode(mode);
  }, []);

  // Global keyboard shortcuts (Title Enter, Pause keybinding, Mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (hud.phase === 'title' && e.code === 'Enter') {
        e.preventDefault();
        handleStart();
        return;
      }

      const pauseCode = settings.keyBindings.pause;
      const isPauseKey = e.code === pauseCode || e.code === 'KeyP';

      if (hud.phase === 'playing' && isPauseKey && !(e.code === 'Escape' && hud.commandMode !== 'normal')) {
        e.preventDefault();
        handlePause();
        return;
      }
      if (hud.phase === 'paused' && isPauseKey) {
        e.preventDefault();
        handleResume();
        return;
      }
      if (e.code === 'Escape' && pseudoFullscreen && hud.phase !== 'playing') {
        setPseudoFullscreen(false);
        return;
      }
      if (e.code === 'KeyM' && hud.phase === 'playing' && e.shiftKey) {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    settingsOpen,
    hud.phase,
    hud.commandMode,
    settings.keyBindings.pause,
    pseudoFullscreen,
    handleStart,
    handlePause,
    handleResume,
    handleToggleMute,
  ]);

  return (
    <main
      ref={rootRef}
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      className={`overflow-hidden bg-[#0b0e12] ${
        pseudoFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'relative w-full h-full'
      }`}
    >
      {/* Isolated WebGL mount container */}
      <div ref={mountRef} data-testid="rts-canvas-mount" className="absolute inset-0 w-full h-full" />

      {/* RTS Drag Box Selection Rect */}
      {boxRect.active && hud.phase === 'playing' && (
        <div
          className="fixed z-20 pointer-events-none border border-[#e8b954] bg-[rgba(232,185,84,0.14)]"
          style={{
            left: boxRect.x1,
            top: boxRect.y1,
            width: boxRect.x2 - boxRect.x1,
            height: boxRect.y2 - boxRect.y1,
          }}
        />
      )}

      {hud.phase === 'title' ? (
        <TitleOverlay
          settings={settings}
          selectedChapter={selectedChapter}
          highestUnlockedChapter={highestUnlockedChapter}
          savedSummary={savedSummary}
          isFullscreen={isFullscreen}
          transitioning={isStartingTransition}
          onSelectChapter={handleSelectChapter}
          onStart={handleStart}
          onContinueSaved={handleLoadBattle}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleFullscreen={handleToggleFullscreen}
          onUpdateSettings={handleUpdateSettings}
        />
      ) : (
        <GameHud
          hud={hud}
          settings={settings}
          isFullscreen={isFullscreen}
          touchMode={touchMode}
          savedSummary={savedSummary}
          saveFeedback={saveFeedback}
          onSetTouchMode={handleSetTouchMode}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenSettings={() => setSettingsOpen(true)}
          onPause={handlePause}
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
          onSaveBattle={handleSaveBattle}
          onLoadBattle={handleLoadBattle}
          onNextChapter={handleNextChapter}
          onCastAbility={(id: AbilityId) => engineRef.current?.triggerAbility(id)}
          onToggleAutocast={(id: AbilityId) => engineRef.current?.toggleAutocast(id)}
          onSetFormation={(formation: FormationKind) => engineRef.current?.setFormation(formation)}
          onSelectGroup={(slot: 1 | 2 | 3) => engineRef.current?.handleGroupSlot(slot, false)}
          onTrainUnit={(kind: UnitKind) => engineRef.current?.trainFromSelected(kind)}
          onResearchUpgrade={(id: UpgradeId) => engineRef.current?.researchFromSelected(id)}
          onBuyRelic={(id: RelicId) => engineRef.current?.buyRelicFromMerchant(id)}
          onUseRelicSlot={(slot: number) => engineRef.current?.useRelicSlot(slot)}
          onSetCommandMode={(mode) => engineRef.current?.setCommandMode(mode)}
          onStopSelected={() => engineRef.current?.stopSelected()}
          onSelectHero={() => engineRef.current?.selectHero()}
          onSelectHero2={() => engineRef.current?.selectHero2()}
          onStartBuildMode={(kind: BuildingKind) => engineRef.current?.startBuildMode(kind)}
          onSelectArmy={() => engineRef.current?.selectAllCombatUnits()}
          onSelectBarracks={() => engineRef.current?.selectBuildingByKind('kazarma')}
          onSelectStronghold={() => engineRef.current?.selectBuildingByKind('detinets')}
          onSelectWorker={() => engineRef.current?.selectWorker()}
          onMinimapClick={(x, z) => engineRef.current?.panToWorld(x, z)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          isFullscreen={isFullscreen}
          onUpdateSettings={handleUpdateSettings}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
