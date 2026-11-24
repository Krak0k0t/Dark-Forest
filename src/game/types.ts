export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type Faction = 'player' | 'nav' | 'neutral';

export type LanguageCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elv'
  | 'orc';

export type DifficultyLevel = 'story' | 'normal' | 'hard' | 'nightmare';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'cinematic';

export type MouseAction = 'hero_jump' | 'order' | 'rotate_camera' | 'thunder_clap';

export type MusicZone = 'title' | 'sanctuary' | 'river' | 'cursed_woods' | 'combat' | 'victory' | 'defeat';

export interface KeyBindings {
  panUp: string;
  panDown: string;
  panLeft: string;
  panRight: string;
  rotateLeft: string;
  rotateRight: string;
  heroJump: string;
  abilityQ: string;
  abilityW: string;
  abilityE: string;
  cmdMove: string;
  cmdAttack: string;
  cmdStop: string;
  selectHero: string;
  selectHero2: string;
  selectArmy: string;
  selectBarracks: string;
  selectStronghold: string;
  pause: string;
  mouseRight: MouseAction;
  mouseMiddle: MouseAction;
}

export interface GameSettings {
  language: LanguageCode;
  difficulty: DifficultyLevel;
  graphics: GraphicsQuality;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  keyBindings: KeyBindings;
}

export type UnitKind =
  | 'voivode'
  | 'vedunya'
  | 'spirit_wolf'
  | 'ratnik'
  | 'luchnik'
  | 'volkhv'
  | 'strelomet'
  | 'kholop'
  | 'upyr'
  | 'likho'
  | 'morovik'
  | 'leshy';

export type BuildingKind = 'detinets' | 'kazarma' | 'kapishche' | 'vezha' | 'monolith' | 'merchant' | 'fountain';

export type ResourceKind = 'gold' | 'wood';

export type ChapterId = 1 | 2 | 3 | 4;

export type FormationKind = 'line' | 'wedge' | 'box';

export type CommandMode = 'normal' | 'attack' | 'move' | 'jump' | 'ability_q' | 'build' | 'rally';

export type AbilityId =
  | 'thunder_clap'
  | 'war_cry'
  | 'sunfire'
  | 'frost_nova'
  | 'summon_wolf'
  | 'ancestral_mend';

export type UpgradeId = 'forged_blades' | 'oak_shields' | 'bodkin_arrows' | 'rod_blessing';

export interface UpgradeDef {
  id: UpgradeId;
  building: BuildingKind;
  maxLevel: number;
  goldBase: number;
  woodBase: number;
  goldStep: number;
  woodStep: number;
  researchTime: number;
}

export type RelicId = 'living_water' | 'perun_amulet' | 'rod_ward' | 'svarog_ring' | 'veles_cloak';

export interface RelicDef {
  id: RelicId;
  consumable: boolean;
  color: string;
  goldCost: number;
}

export interface RelicDropEntity {
  id: string;
  relicId: RelicId;
  x: number;
  z: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface UnitStats {
  kind: UnitKind;
  name: string;
  role: string;
  faction: Faction;
  maxHp: number;
  maxMp: number;
  damage: number;
  armor: number;
  attackRange: number;
  attackCooldown: number;
  windupDuration: number;
  moveSpeed: number;
  radius: number;
  goldCost: number;
  woodCost: number;
  supplyCost: number;
  trainTime: number;
  isRanged: boolean;
  isHero?: boolean;
  isBoss?: boolean;
  xpReward: number;
  goldReward: number;
}

export interface BuildingStats {
  kind: BuildingKind;
  name: string;
  role: string;
  faction: Faction;
  maxHp: number;
  radius: number;
  supplyProvided: number;
  goldCost: number;
  woodCost: number;
  buildTime: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  trainableUnits: UnitKind[];
}

export interface AbilityState {
  id: AbilityId;
  key: 'Q' | 'W' | 'E';
  name: string;
  description: string;
  manaCost: number;
  cooldown: number;
  remainingCooldown: number;
  autocast?: boolean;
}

export interface ChapterDef {
  id: ChapterId;
  startingGoldBonus: number;
  startingWoodBonus: number;
  startWithVedunya?: boolean;
  monoliths: Array<{ x: number; z: number }>;
  waves: Array<{
    delay: number;
    label: string;
    squad: Array<{ kind: UnitKind; count: number }>;
  }>;
}

export interface SaveSlotSummary {
  chapter: ChapterId;
  difficulty: DifficultyLevel;
  elapsed: number;
  wave: number;
  gold: number;
  wood: number;
  savedAt: number;
}

export interface UnitEntity {
  id: string;
  kind: UnitKind;
  faction: Faction;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  xpToNext: number;
  attackTimer: number;
  windupTimer: number;
  windupTargetId: string | null;
  hitFlashTimer: number;
  buffTimer: number;
  slowTimer: number;
  koTimer: number;
  dead: boolean;
  lifeTimer?: number;
  isCreepGuard?: boolean;
  guardX?: number;
  guardZ?: number;
  dropRelicId?: RelicId;
  inventory?: RelicId[];
  jumpTime: number;
  jumpDuration: number;
  jumpStartX: number;
  jumpStartZ: number;
  jumpTargetX: number;
  jumpTargetZ: number;
  jumpCooldown: number;
  landSquashTimer: number;
  order:
    | { type: 'idle' }
    | { type: 'move'; x: number; z: number }
    | { type: 'attackMove'; x: number; z: number }
    | { type: 'attack'; targetId: string }
    | { type: 'gather'; nodeId: string; carrying: ResourceKind | null; amount: number; returning: boolean }
    | { type: 'build'; buildingId: string };
  bossPhase?: 1 | 2 | 3;
  bossSlamTimer: number;
  bossTelegraphTimer: number;
  bossTelegraphX: number;
  bossTelegraphZ: number;
  stridePhase: number;
}

export interface BuildingEntity {
  id: string;
  kind: BuildingKind;
  faction: Faction;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  radius: number;
  underConstruction?: boolean;
  buildProgress?: number;
  attackTimer: number;
  hitFlashTimer: number;
  dead: boolean;
  rallyX: number;
  rallyZ: number;
  queue: Array<{ kind: UnitKind; remaining: number; total: number }>;
  researchQueue?: { id: UpgradeId; remaining: number; total: number } | null;
}

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  name: string;
  x: number;
  z: number;
  remaining: number;
  maxRemaining: number;
  radius: number;
}

export interface ProjectileEntity {
  id: string;
  faction: Faction;
  style: 'arrow' | 'spirit' | 'bogfire' | 'tower' | 'frost' | 'bolt';
  x: number;
  y: number;
  z: number;
  startX: number;
  startZ: number;
  targetId: string;
  targetX: number;
  targetZ: number;
  progress: number;
  speed: number;
  damage: number;
  buildingMult?: number;
  arcHeight: number;
}

export interface GameEvent {
  type:
    | 'hit'
    | 'heavy_hit'
    | 'kill'
    | 'thunder_clap'
    | 'war_cry'
    | 'sunfire'
    | 'frost_nova'
    | 'summon_wolf'
    | 'ancestral_mend'
    | 'hero_jump'
    | 'hero_land'
    | 'arrow_shot'
    | 'magic_shot'
    | 'boss_slam'
    | 'boss_telegraph'
    | 'boss_phase'
    | 'deposit'
    | 'build_start'
    | 'build_complete'
    | 'train_complete'
    | 'upgrade_complete'
    | 'relic_pickup'
    | 'relic_use'
    | 'level_up'
    | 'wave_start'
    | 'order_ack';
  x: number;
  z: number;
  intensity?: number;
  faction?: Faction;
  label?: string;
}

export interface WorldState {
  phase: GamePhase;
  outcome: 'victory' | 'defeat' | null;
  difficulty: DifficultyLevel;
  chapter: ChapterId;
  formation: FormationKind;
  elapsed: number;
  hitstopTimer: number;
  trauma: number;
  gold: number;
  wood: number;
  wave: number;
  maxWaves: number;
  waveTimer: number;
  bossSpawned: boolean;
  kills: number;
  unitsLost: number;
  commandMode: CommandMode;
  pendingBuildKind: BuildingKind | null;
  selectedUnitIds: string[];
  selectedBuildingId: string | null;
  controlGroups: Record<1 | 2 | 3, string[]>;
  abilities: AbilityState[];
  hero2Abilities: AbilityState[];
  upgrades: Record<UpgradeId, number>;
  relicDrops: RelicDropEntity[];
  fogGrid: number[];
  units: UnitEntity[];
  buildings: BuildingEntity[];
  resources: ResourceNode[];
  projectiles: ProjectileEntity[];
  events: GameEvent[];
  nextEntitySeq: number;
  announcementWave: number | null;
  announcementTimer: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  outcome: 'victory' | 'defeat' | null;
  difficulty: DifficultyLevel;
  chapter: ChapterId;
  formation: FormationKind;
  musicZone: MusicZone;
  gold: number;
  wood: number;
  supplyUsed: number;
  supplyCap: number;
  wave: number;
  maxWaves: number;
  waveTimer: number;
  elapsed: number;
  kills: number;
  unitsLost: number;
  monolithHp: number;
  monolithMaxHp: number;
  strongholdHp: number;
  strongholdMaxHp: number;
  heroHp: number;
  heroMaxHp: number;
  heroLevel: number;
  heroJumpCooldown: number;
  hero2Hp: number;
  hero2MaxHp: number;
  hero2Level: number;
  activeHeroKind: 'voivode' | 'vedunya';
  commandMode: CommandMode;
  pendingBuildKind: BuildingKind | null;
  announcementWave: number | null;
  bossInfo?: { hp: number; maxHp: number; phase: 1 | 2 | 3 } | null;
  bossPhaseBanner?: 2 | 3 | null;
  selectedUnits: Array<{
    id: string;
    kind: UnitKind;
    name: string;
    role: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    level: number;
    xp: number;
    xpToNext: number;
    damage: number;
    armor: number;
    buffed: boolean;
    inventory?: RelicId[];
  }>;
  selectedBuilding: {
    id: string;
    kind: BuildingKind;
    name: string;
    role: string;
    hp: number;
    maxHp: number;
    underConstruction?: boolean;
    buildProgress?: number;
    trainableUnits: UnitKind[];
    queue: Array<{ kind: UnitKind; remaining: number; total: number }>;
    researchQueue?: { id: UpgradeId; remaining: number; total: number } | null;
  } | null;
  controlGroups: Record<1 | 2 | 3, number>;
  upgrades: Record<UpgradeId, number>;
  abilities: AbilityState[];
  hero2Abilities: AbilityState[];
  minimapFog: number[];
  minimapUnits: Array<{ x: number; z: number; faction: Faction; isHero?: boolean; isBoss?: boolean }>;
  minimapBuildings: Array<{ x: number; z: number; faction: Faction; kind: BuildingKind; underConstruction?: boolean }>;
  minimapResources: Array<{ x: number; z: number; kind: ResourceKind }>;
}
