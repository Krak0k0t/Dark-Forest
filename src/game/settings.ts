import { DifficultyLevel, GameSettings, KeyBindings } from './types';

const STORAGE_KEY = 'nav_darkwoods_settings_v1';

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  panUp: 'ArrowUp',
  panDown: 'ArrowDown',
  panLeft: 'ArrowLeft',
  panRight: 'ArrowRight',
  rotateLeft: 'KeyZ',
  rotateRight: 'KeyC',
  heroJump: 'Space',
  abilityQ: 'KeyQ',
  abilityW: 'KeyW',
  abilityE: 'KeyE',
  cmdMove: 'KeyM',
  cmdAttack: 'KeyA',
  cmdStop: 'KeyS',
  selectHero: 'F1',
  selectHero2: 'F2',
  selectArmy: 'Digit1',
  selectBarracks: 'Digit2',
  selectStronghold: 'Digit3',
  pause: 'Escape',
  mouseRight: 'hero_jump',
  mouseMiddle: 'rotate_camera',
};

export const DEFAULT_SETTINGS: GameSettings = {
  language: 'en',
  difficulty: 'normal',
  graphics: 'high',
  musicVolume: 0.55,
  sfxVolume: 0.78,
  muted: false,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
};

export interface DifficultyModifier {
  enemyHpMult: number;
  enemyDmgMult: number;
  waveDelayMult: number;
  extraWaveEnemies: number;
  startingGold: number;
  startingWood: number;
  shrineHealMult: number;
}

export const DIFFICULTY_MODIFIERS: Record<DifficultyLevel, DifficultyModifier> = {
  story: {
    enemyHpMult: 0.75,
    enemyDmgMult: 0.68,
    waveDelayMult: 1.25,
    extraWaveEnemies: 0,
    startingGold: 460,
    startingWood: 260,
    shrineHealMult: 1.4,
  },
  normal: {
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    waveDelayMult: 1.0,
    extraWaveEnemies: 0,
    startingGold: 340,
    startingWood: 180,
    shrineHealMult: 1.0,
  },
  hard: {
    enemyHpMult: 1.25,
    enemyDmgMult: 1.25,
    waveDelayMult: 0.85,
    extraWaveEnemies: 1,
    startingGold: 300,
    startingWood: 150,
    shrineHealMult: 0.9,
  },
  nightmare: {
    enemyHpMult: 1.55,
    enemyDmgMult: 1.45,
    waveDelayMult: 0.75,
    extraWaveEnemies: 2,
    startingGold: 260,
    startingWood: 130,
    shrineHealMult: 0.75,
  },
};

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keyBindings: {
        ...DEFAULT_KEY_BINDINGS,
        ...(parsed.keyBindings ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
  }
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (code === 'Escape') return 'Esc';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  return code;
}
