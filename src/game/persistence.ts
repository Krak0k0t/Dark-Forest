import { ChapterId, SaveSlotSummary, WorldState } from './types';

const SAVE_STORAGE_KEY = 'nav_darkwoods_save_v1';
const CAMPAIGN_STORAGE_KEY = 'nav_darkwoods_campaign_v1';

export interface SerializedSavePayload {
  version: 1;
  summary: SaveSlotSummary;
  world: WorldState;
}

export function serializeWorld(world: WorldState): string {
  const cleanWorld: WorldState = {
    ...world,
    phase: 'playing',
    outcome: null,
    commandMode: 'normal',
    pendingBuildKind: null,
    events: [],
  };
  const summary: SaveSlotSummary = {
    chapter: cleanWorld.chapter,
    difficulty: cleanWorld.difficulty,
    elapsed: Math.round(cleanWorld.elapsed),
    wave: cleanWorld.wave,
    gold: Math.round(cleanWorld.gold),
    wood: Math.round(cleanWorld.wood),
    savedAt: Date.now(),
  };
  const payload: SerializedSavePayload = {
    version: 1,
    summary,
    world: cleanWorld,
  };
  return JSON.stringify(payload);
}

export function deserializeWorld(raw: string): SerializedSavePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SerializedSavePayload>;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !parsed.world ||
      !parsed.summary ||
      !Array.isArray(parsed.world.units) ||
      !Array.isArray(parsed.world.buildings) ||
      !Array.isArray(parsed.world.fogGrid)
    ) {
      return null;
    }
    const w = parsed.world;
    const controlGroups = w.controlGroups ?? { 1: [], 2: [], 3: [] };
    return {
      version: 1,
      summary: parsed.summary,
      world: {
        ...w,
        phase: 'playing',
        outcome: null,
        chapter: w.chapter ?? 1,
        formation: w.formation ?? 'line',
        controlGroups: {
          1: Array.isArray(controlGroups[1]) ? controlGroups[1] : [],
          2: Array.isArray(controlGroups[2]) ? controlGroups[2] : [],
          3: Array.isArray(controlGroups[3]) ? controlGroups[3] : [],
        },
        upgrades: w.upgrades ?? {
          forged_blades: 0,
          oak_shields: 0,
          bodkin_arrows: 0,
          rod_blessing: 0,
        },
        relicDrops: Array.isArray(w.relicDrops) ? w.relicDrops : [],
        commandMode: 'normal',
        pendingBuildKind: null,
        events: [],
      },
    };
  } catch {
    return null;
  }
}

export function saveWorldToStorage(world: WorldState): SaveSlotSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const encoded = serializeWorld(world);
    window.localStorage.setItem(SAVE_STORAGE_KEY, encoded);
    const decoded = deserializeWorld(encoded);
    return decoded?.summary ?? null;
  } catch {
    return null;
  }
}

export function loadWorldFromStorage(): SerializedSavePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return deserializeWorld(raw);
  } catch {
    return null;
  }
}

export function getSavedWorldSummary(): SaveSlotSummary | null {
  return loadWorldFromStorage()?.summary ?? null;
}

export function loadHighestChapter(): ChapterId {
  return 4;
}

export function unlockNextChapter(completed: ChapterId): ChapterId {
  const current = loadHighestChapter();
  const next: ChapterId = completed === 1 ? 2 : completed === 2 ? 3 : 4;
  const highest = (Math.max(current, next) as ChapterId);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, String(highest));
    } catch {
      // Ignore storage quota errors
    }
  }
  return highest;
}
