import { ChapterId, RelicId, UnitKind } from './types';

export type BiomeId = 'taiga' | 'frostfen' | 'blight' | 'fen';

export interface BridgeSpec {
  x: number;
  z: number;
  rotY: number;
  width: number;
  length: number;
  style: 'timber' | 'frost' | 'basalt';
}

export interface BiomePalette {
  id: BiomeId;
  fogColor: number;
  fogDensity: number;
  skyZenith: number;
  skyMid: number;
  skyHorizon: number;
  skySunGlow: number;
  auroraStrength: number;
  emberSkyStrength: number;
  keyColor: number;
  keyIntensity: number;
  rimColor: number;
  rimIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  monolithLightColor: number;
  waterColor: number;
  waterRippleTint: number;
  waterFoamTint: number;
  waterRoughness: number;
  waterMetalness: number;
  waterOpacity: number;
  terrainPrimaryTint: number;
  terrainSecondaryRgb: [number, number, number];
  terrainRoadRgb: [number, number, number];
  terrainBankRgb: [number, number, number];
  snowCapStrength: number;
  emberCreviceStrength: number;
  treeLowerRgb: [number, number, number];
  treeMidRgb: [number, number, number];
  treeUpperRgb: [number, number, number];
  fernRgb: [number, number, number];
  rockTint: number;
  mountainColor: number;
  mistColor: number;
  mistMonolithColor: number;
  sunShaftColor: number;
  weatherKind: 'fireflies' | 'snow' | 'ash';
  minimapBg: string;
  minimapRiver: string;
  minimapRoad: string;
}

export interface ChapterMapLayout {
  chapter: ChapterId;
  biome: BiomeId;
  palette: BiomePalette;
  riverMode: 0 | 1 | 2 | 3;
  waterY: number;
  waterRotationY: number;
  waterWidth: number;
  riverMinimapLine: [number, number, number, number];
  roadMinimapLine: [number, number, number, number];
  bridges: BridgeSpec[];
  detinets: { x: number; z: number };
  kazarma: { x: number; z: number };
  kapishche: { x: number; z: number };
  vezha: { x: number; z: number };
  merchant: { x: number; z: number };
  fountain: { x: number; z: number };
  monoliths: Array<{ x: number; z: number }>;
  rallyDefault: { x: number; z: number };
  cameraHome: { x: number; z: number };
  resources: {
    goldHome: { x: number; z: number; name: string; remaining: number };
    goldMid: { x: number; z: number; name: string; remaining: number };
    woodHome: { x: number; z: number; name: string; remaining: number };
  };
  playerUnits: {
    voivode: { x: number; z: number };
    vedunya?: { x: number; z: number };
    ratniks: Array<{ x: number; z: number }>;
    luchniks: Array<{ x: number; z: number }>;
    goldWorker: { x: number; z: number };
    woodWorker: { x: number; z: number };
  };
  navOutpost: Array<{ kind: UnitKind; x: number; z: number }>;
  initialBoss?: { x: number; z: number };
  creepCamps: Array<{ kind: UnitKind; x: number; z: number; relic?: RelicId }>;
  palisadeSpots: Array<{ x: number; z: number; ry: number }>;
  totemSpots: Array<{ x: number; z: number; ry: number }>;
  archSpot: { x: number; z: number; ry: number };
  campfireSpots: Array<{ x: number; z: number; phase: number }>;
  groveCenters: Array<{ x: number; z: number }>;
  mistLocations: Array<{ x: number; z: number; op: number; sp: number; isMonolith?: boolean }>;
  ravenCenters: Array<{ cx: number; cz: number; radius: number; baseY: number; speed: number; phase: number }>;
}

const BIOME_PALETTES: Record<BiomeId, BiomePalette> = {
  taiga: {
    id: 'taiga',
    fogColor: 0x0e161f,
    fogDensity: 0.0128,
    skyZenith: 0x060b13,
    skyMid: 0x101825,
    skyHorizon: 0x18202a,
    skySunGlow: 0x733814,
    auroraStrength: 0.0,
    emberSkyStrength: 0.0,
    keyColor: 0xffc37d,
    keyIntensity: 2.85,
    rimColor: 0x618ec9,
    rimIntensity: 1.05,
    hemiSky: 0x52739c,
    hemiGround: 0x14110d,
    hemiIntensity: 0.44,
    monolithLightColor: 0x24d66c,
    waterColor: 0x06191f,
    waterRippleTint: 0x091317,
    waterFoamTint: 0x243638,
    waterRoughness: 0.16,
    waterMetalness: 0.22,
    waterOpacity: 0.94,
    terrainPrimaryTint: 0xffffff,
    terrainSecondaryRgb: [0.09, 0.14, 0.09],
    terrainRoadRgb: [0.24, 0.18, 0.12],
    terrainBankRgb: [0.05, 0.07, 0.07],
    snowCapStrength: 0.0,
    emberCreviceStrength: 0.0,
    treeLowerRgb: [0.032, 0.08, 0.052],
    treeMidRgb: [0.04, 0.095, 0.062],
    treeUpperRgb: [0.048, 0.112, 0.072],
    fernRgb: [0.045, 0.11, 0.048],
    rockTint: 0xffffff,
    mountainColor: 0x161d26,
    mistColor: 0x7d9eb2,
    mistMonolithColor: 0x3dc474,
    sunShaftColor: 0xffc67a,
    weatherKind: 'fireflies',
    minimapBg: '#0f1417',
    minimapRiver: '#1b3540',
    minimapRoad: 'rgba(130, 108, 78, 0.35)',
  },
  frostfen: {
    id: 'frostfen',
    fogColor: 0x18293b,
    fogDensity: 0.0112,
    skyZenith: 0x0a1629,
    skyMid: 0x17314d,
    skyHorizon: 0x2c4e6c,
    skySunGlow: 0x6292b8,
    auroraStrength: 0.95,
    emberSkyStrength: 0.0,
    keyColor: 0xe3f1ff,
    keyIntensity: 2.7,
    rimColor: 0x7be8dc,
    rimIntensity: 1.25,
    hemiSky: 0x86b5db,
    hemiGround: 0x1a2533,
    hemiIntensity: 0.58,
    monolithLightColor: 0x39e8c8,
    waterColor: 0x153b52,
    waterRippleTint: 0x2e6c8f,
    waterFoamTint: 0xb2dcf2,
    waterRoughness: 0.08,
    waterMetalness: 0.36,
    waterOpacity: 0.92,
    terrainPrimaryTint: 0xe4eef7,
    terrainSecondaryRgb: [0.54, 0.64, 0.74],
    terrainRoadRgb: [0.25, 0.27, 0.3],
    terrainBankRgb: [0.22, 0.35, 0.46],
    snowCapStrength: 0.85,
    emberCreviceStrength: 0.0,
    treeLowerRgb: [0.05, 0.105, 0.11],
    treeMidRgb: [0.09, 0.16, 0.175],
    treeUpperRgb: [0.28, 0.38, 0.44],
    fernRgb: [0.11, 0.19, 0.2],
    rockTint: 0xcfe0f0,
    mountainColor: 0x354d66,
    mistColor: 0xaad2eb,
    mistMonolithColor: 0x45e8c2,
    sunShaftColor: 0xa3deff,
    weatherKind: 'snow',
    minimapBg: '#121b24',
    minimapRiver: '#2e6480',
    minimapRoad: 'rgba(166, 186, 204, 0.38)',
  },
  blight: {
    id: 'blight',
    fogColor: 0x241316,
    fogDensity: 0.0124,
    skyZenith: 0x170810,
    skyMid: 0x2e121b,
    skyHorizon: 0x4d1e1d,
    skySunGlow: 0xb83b1c,
    auroraStrength: 0.0,
    emberSkyStrength: 0.95,
    keyColor: 0xff9f68,
    keyIntensity: 2.75,
    rimColor: 0x9b5de5,
    rimIntensity: 1.12,
    hemiSky: 0x7d4c5c,
    hemiGround: 0x1a0e0d,
    hemiIntensity: 0.45,
    monolithLightColor: 0x56f57e,
    waterColor: 0x132616,
    waterRippleTint: 0x2e6126,
    waterFoamTint: 0x59853b,
    waterRoughness: 0.2,
    waterMetalness: 0.18,
    waterOpacity: 0.96,
    terrainPrimaryTint: 0xc2b2aa,
    terrainSecondaryRgb: [0.11, 0.08, 0.08],
    terrainRoadRgb: [0.22, 0.14, 0.11],
    terrainBankRgb: [0.07, 0.11, 0.06],
    snowCapStrength: 0.0,
    emberCreviceStrength: 0.9,
    treeLowerRgb: [0.045, 0.038, 0.036],
    treeMidRgb: [0.058, 0.046, 0.042],
    treeUpperRgb: [0.076, 0.056, 0.048],
    fernRgb: [0.085, 0.062, 0.042],
    rockTint: 0x9c8e8a,
    mountainColor: 0x24171a,
    mistColor: 0x9c655c,
    mistMonolithColor: 0x4ee875,
    sunShaftColor: 0xff7b42,
    weatherKind: 'ash',
    minimapBg: '#171012',
    minimapRiver: '#284a28',
    minimapRoad: 'rgba(176, 98, 66, 0.38)',
  },
  fen: {
    id: 'fen',
    fogColor: 0x11241c,
    fogDensity: 0.0118,
    skyZenith: 0x05110d,
    skyMid: 0x0d261d,
    skyHorizon: 0x1c4534,
    skySunGlow: 0x62b886,
    auroraStrength: 0.42,
    emberSkyStrength: 0.0,
    keyColor: 0xd4f7d0,
    keyIntensity: 2.7,
    rimColor: 0x52f29b,
    rimIntensity: 1.25,
    hemiSky: 0x6ba88b,
    hemiGround: 0x111a14,
    hemiIntensity: 0.5,
    monolithLightColor: 0x4ef58b,
    waterColor: 0x051610,
    waterRippleTint: 0x0b261c,
    waterFoamTint: 0x163327,
    waterRoughness: 0.36,
    waterMetalness: 0.08,
    waterOpacity: 0.84,
    terrainPrimaryTint: 0xc8dbd0,
    terrainSecondaryRgb: [0.09, 0.19, 0.12],
    terrainRoadRgb: [0.22, 0.2, 0.14],
    terrainBankRgb: [0.04, 0.08, 0.06],
    snowCapStrength: 0.0,
    emberCreviceStrength: 0.0,
    treeLowerRgb: [0.028, 0.095, 0.058],
    treeMidRgb: [0.042, 0.13, 0.075],
    treeUpperRgb: [0.065, 0.17, 0.098],
    fernRgb: [0.06, 0.18, 0.075],
    rockTint: 0x9fc2ad,
    mountainColor: 0x1c3026,
    mistColor: 0x7bc29b,
    mistMonolithColor: 0x42f58d,
    sunShaftColor: 0x9af7b6,
    weatherKind: 'fireflies',
    minimapBg: '#0e1813',
    minimapRiver: '#1e543b',
    minimapRoad: 'rgba(164, 152, 98, 0.36)',
  },
};

const CHAPTER_LAYOUTS: Record<ChapterId, ChapterMapLayout> = {
  1: {
    chapter: 1,
    biome: 'taiga',
    palette: BIOME_PALETTES.taiga,
    riverMode: 0,
    waterY: -0.32,
    waterRotationY: -Math.PI / 4,
    waterWidth: 7.6,
    riverMinimapLine: [-38, -38, 38, 38],
    roadMinimapLine: [-18, 17, 23, -21],
    bridges: [{ x: 0, z: 0, rotY: -Math.PI / 4, width: 5.6, length: 8.6, style: 'timber' }],
    detinets: { x: -18, z: 17 },
    kazarma: { x: -11, z: 20 },
    kapishche: { x: -21, z: 9 },
    vezha: { x: -9.5, z: 11.5 },
    merchant: { x: -16.5, z: -5.5 },
    fountain: { x: 12.5, z: 1.5 },
    monoliths: [{ x: 23, z: -21 }],
    rallyDefault: { x: -12, z: 12 },
    cameraHome: { x: -12, z: 14 },
    resources: {
      goldHome: { x: -24.5, z: 18.5, name: 'Золотая жила', remaining: 3200 },
      goldMid: { x: -5.5, z: -7.5, name: 'Курганное злато', remaining: 4500 },
      woodHome: { x: -16.5, z: 25.5, name: 'Вековой бор', remaining: 3600 },
    },
    playerUnits: {
      voivode: { x: -11.5, z: 13.5 },
      ratniks: [
        { x: -9.2, z: 14.8 },
        { x: -13.2, z: 11.8 },
      ],
      luchniks: [{ x: -13.5, z: 15.6 }],
      goldWorker: { x: -21.2, z: 17.5 },
      woodWorker: { x: -17.2, z: 21.8 },
    },
    navOutpost: [
      { kind: 'upyr', x: 12, z: -11 },
      { kind: 'upyr', x: 14.5, z: -13.5 },
      { kind: 'likho', x: 16.5, z: -15 },
      { kind: 'upyr', x: 20, z: -18 },
      { kind: 'morovik', x: 21.5, z: -23.5 },
    ],
    creepCamps: [
      { kind: 'upyr', x: 4.8, z: 3.2, relic: 'living_water' },
      { kind: 'upyr', x: -5.0, z: -9.5 },
      { kind: 'upyr', x: -7.8, z: -10.8 },
      { kind: 'likho', x: -6.4, z: -12.0, relic: 'perun_amulet' },
      { kind: 'upyr', x: 10.2, z: 13.5 },
      { kind: 'upyr', x: 12.6, z: 14.2 },
      { kind: 'morovik', x: 11.4, z: 15.8, relic: 'rod_ward' },
      { kind: 'upyr', x: 3.4, z: -20.5 },
      { kind: 'likho', x: 5.6, z: -21.2, relic: 'veles_cloak' },
      { kind: 'morovik', x: 4.4, z: -22.8, relic: 'svarog_ring' },
    ],
    palisadeSpots: [
      { x: -8.2, z: 16.8, ry: -Math.PI / 4 },
      { x: -16.8, z: 8.2, ry: -Math.PI / 4 },
      { x: -22.8, z: 19.8, ry: Math.PI / 4 },
    ],
    totemSpots: [
      { x: -13.2, z: 15.8, ry: -Math.PI * 0.22 },
      { x: -20.5, z: 13.8, ry: Math.PI * 0.35 },
      { x: -7.5, z: 8.5, ry: -Math.PI * 0.25 },
    ],
    archSpot: { x: -4.3, z: 4.3, ry: -Math.PI / 4 },
    campfireSpots: [
      { x: -15.4, z: 16.4, phase: 0.4 },
      { x: -12.6, z: 18.2, phase: 2.1 },
    ],
    groveCenters: [
      { x: -16, z: -12 },
      { x: 14, z: 13 },
      { x: -2, z: -22 },
      { x: 3, z: 22 },
    ],
    mistLocations: [
      { x: -12, z: -12, op: 0.24, sp: 0.35 },
      { x: 11, z: 11, op: 0.24, sp: -0.3 },
      { x: 22, z: -20, op: 0.28, sp: 0.25, isMonolith: true },
      { x: -2, z: 2, op: 0.16, sp: 0.2 },
    ],
    ravenCenters: [
      { cx: -6, cz: 4, radius: 13, baseY: 11.5, speed: 0.42, phase: 0 },
      { cx: 14, cz: -14, radius: 11, baseY: 12.8, speed: -0.48, phase: 1.7 },
      { cx: 20, cz: -19, radius: 9, baseY: 13.6, speed: 0.54, phase: 3.1 },
      { cx: -16, cz: 15, radius: 12, baseY: 12.2, speed: -0.36, phase: 4.5 },
    ],
  },
  2: {
    chapter: 2,
    biome: 'frostfen',
    palette: BIOME_PALETTES.frostfen,
    riverMode: 1,
    waterY: -0.3,
    waterRotationY: Math.atan(0.25),
    waterWidth: 7.4,
    riverMinimapLine: [-38, 9.5, 38, -9.5],
    roadMinimapLine: [-14, 19, 10, -14],
    bridges: [
      { x: -10, z: 2.5, rotY: Math.atan(0.25), width: 5.4, length: 8.4, style: 'frost' },
      { x: 10, z: -2.5, rotY: Math.atan(0.25), width: 5.4, length: 8.4, style: 'frost' },
    ],
    detinets: { x: -14, z: 19 },
    kazarma: { x: -7, z: 21 },
    kapishche: { x: -19, z: 13 },
    vezha: { x: -7.5, z: 13.5 },
    merchant: { x: 11.5, z: 14.5 },
    fountain: { x: -1.5, z: -9.5 },
    monoliths: [
      { x: -16, z: -20 },
      { x: 20, z: -18 },
    ],
    rallyDefault: { x: -10, z: 12 },
    cameraHome: { x: -11, z: 16 },
    resources: {
      goldHome: { x: -21.5, z: 20, name: 'Мерзлая жила', remaining: 3400 },
      goldMid: { x: 15.5, z: 8.5, name: 'Волховское злато', remaining: 4800 },
      woodHome: { x: -12, z: 26, name: 'Заиндевелый бор', remaining: 3800 },
    },
    playerUnits: {
      voivode: { x: -11.5, z: 13.5 },
      ratniks: [
        { x: -9.0, z: 15.0 },
        { x: -13.0, z: 11.8 },
        { x: -10.4, z: 16.4 },
      ],
      luchniks: [
        { x: -14.2, z: 15.2 },
        { x: -15.4, z: 12.8 },
      ],
      goldWorker: { x: -18.0, z: 19.6 },
      woodWorker: { x: -13.2, z: 22.8 },
    },
    navOutpost: [
      { kind: 'upyr', x: -11, z: -13 },
      { kind: 'likho', x: -14, z: -15 },
      { kind: 'morovik', x: -17, z: -16 },
      { kind: 'upyr', x: 13, z: -12 },
      { kind: 'likho', x: 16, z: -14 },
      { kind: 'morovik', x: 19, z: -15 },
      { kind: 'upyr', x: 15, z: -20 },
    ],
    creepCamps: [
      { kind: 'upyr', x: -9.5, z: -4.2, relic: 'living_water' },
      { kind: 'upyr', x: 15.0, z: 11.8 },
      { kind: 'likho', x: 18.0, z: 10.2, relic: 'perun_amulet' },
      { kind: 'upyr', x: 4.5, z: 16.5 },
      { kind: 'morovik', x: 6.5, z: 18.2, relic: 'rod_ward' },
      { kind: 'likho', x: -2.5, z: -13.2, relic: 'veles_cloak' },
      { kind: 'morovik', x: 2.5, z: -15.5, relic: 'svarog_ring' },
    ],
    palisadeSpots: [
      { x: -12.5, z: 8.5, ry: Math.atan(0.25) },
      { x: -7.2, z: 8.5, ry: Math.atan(0.25) },
      { x: -19.5, z: 22.0, ry: -Math.PI / 4 },
    ],
    totemSpots: [
      { x: -10.5, z: 16.2, ry: 0.15 },
      { x: -18.5, z: 17.5, ry: 0.6 },
      { x: -10.0, z: 7.4, ry: 0.1 },
    ],
    archSpot: { x: -10.0, z: 7.8, ry: Math.atan(0.25) },
    campfireSpots: [
      { x: -12.2, z: 17.8, phase: 0.2 },
      { x: -16.2, z: 15.2, phase: 1.9 },
    ],
    groveCenters: [
      { x: -22, z: 2 },
      { x: 22, z: 4 },
      { x: 2, z: -22 },
      { x: 4, z: 23 },
    ],
    mistLocations: [
      { x: -16, z: 4, op: 0.22, sp: 0.3 },
      { x: 14, z: -4, op: 0.22, sp: -0.25 },
      { x: -16, z: -20, op: 0.28, sp: 0.25, isMonolith: true },
      { x: 20, z: -18, op: 0.28, sp: -0.25, isMonolith: true },
    ],
    ravenCenters: [
      { cx: -10, cz: 2.5, radius: 11, baseY: 12.2, speed: 0.4, phase: 0.3 },
      { cx: 14, cz: -14, radius: 12, baseY: 13.0, speed: -0.45, phase: 1.8 },
      { cx: -15, cz: -18, radius: 10, baseY: 13.5, speed: 0.5, phase: 3.4 },
    ],
  },
  3: {
    chapter: 3,
    biome: 'blight',
    palette: BIOME_PALETTES.blight,
    riverMode: 2,
    waterY: -0.34,
    waterRotationY: Math.atan2(1, 0.35),
    waterWidth: 7.8,
    riverMinimapLine: [-13.3, 38, 13.3, -38],
    roadMinimapLine: [-20, 12, 20, -18],
    bridges: [{ x: 0, z: 0, rotY: Math.atan2(1, 0.35), width: 6.0, length: 9.2, style: 'basalt' }],
    detinets: { x: -20, z: 12 },
    kazarma: { x: -14, z: 17 },
    kapishche: { x: -23, z: 5 },
    vezha: { x: -12.5, z: 8.5 },
    merchant: { x: -12, z: -14.5 },
    fountain: { x: 9.5, z: 13.5 },
    monoliths: [
      { x: 23, z: -15 },
      { x: 17, z: -23 },
    ],
    rallyDefault: { x: -12, z: 7 },
    cameraHome: { x: -15, z: 10 },
    resources: {
      goldHome: { x: -26, z: 14.5, name: 'Жар-жила', remaining: 3600 },
      goldMid: { x: -4.5, z: -17.5, name: 'Пепельное злато', remaining: 5000 },
      woodHome: { x: -18, z: 22.5, name: 'Обугленный лес', remaining: 3800 },
    },
    playerUnits: {
      voivode: { x: -15.5, z: 9.5 },
      vedunya: { x: -18.2, z: 7.0 },
      ratniks: [
        { x: -13.0, z: 10.8 },
        { x: -16.8, z: 6.4 },
        { x: -14.5, z: 12.6 },
      ],
      luchniks: [
        { x: -17.5, z: 10.6 },
        { x: -19.0, z: 9.0 },
      ],
      goldWorker: { x: -23.0, z: 13.6 },
      woodWorker: { x: -18.8, z: 18.6 },
    },
    navOutpost: [
      { kind: 'upyr', x: 11, z: -8 },
      { kind: 'upyr', x: 13.5, z: -10.5 },
      { kind: 'likho', x: 16.5, z: -12 },
      { kind: 'morovik', x: 18.5, z: -15 },
      { kind: 'morovik', x: 22.0, z: -15.5 },
      { kind: 'likho', x: 16.8, z: -22.5 },
      { kind: 'upyr', x: 19, z: -20 },
      { kind: 'morovik', x: 23, z: -19 },
    ],
    creepCamps: [
      { kind: 'upyr', x: 5.2, z: -1.8, relic: 'living_water' },
      { kind: 'upyr', x: -3.2, z: -19.5 },
      { kind: 'likho', x: -6.5, z: -20.5, relic: 'perun_amulet' },
      { kind: 'upyr', x: 11.2, z: 15.8 },
      { kind: 'morovik', x: 13.4, z: 16.5, relic: 'rod_ward' },
      { kind: 'likho', x: 9.2, z: -23.5, relic: 'veles_cloak' },
      { kind: 'morovik', x: 11.5, z: -25.2, relic: 'svarog_ring' },
    ],
    palisadeSpots: [
      { x: -10.5, z: 12.2, ry: -Math.PI / 5 },
      { x: -15.2, z: 3.5, ry: -Math.PI / 4 },
      { x: -24.5, z: 16.5, ry: Math.PI / 4 },
    ],
    totemSpots: [
      { x: -17.0, z: 11.5, ry: -0.4 },
      { x: -22.0, z: 9.2, ry: 0.7 },
      { x: -9.5, z: 5.5, ry: -0.35 },
    ],
    archSpot: { x: -5.8, z: 2.2, ry: Math.atan2(1, 0.35) },
    campfireSpots: [
      { x: -17.4, z: 12.0, phase: 0.5 },
      { x: -15.5, z: 14.5, phase: 2.4 },
    ],
    groveCenters: [
      { x: -20, z: -7 },
      { x: 17, z: 6 },
      { x: 4, z: -25 },
      { x: -3, z: 23 },
    ],
    mistLocations: [
      { x: -3, z: 12, op: 0.24, sp: 0.35 },
      { x: 5, z: -14, op: 0.24, sp: -0.3 },
      { x: 23, z: -15, op: 0.3, sp: 0.25, isMonolith: true },
      { x: 17, z: -23, op: 0.3, sp: -0.25, isMonolith: true },
    ],
    ravenCenters: [
      { cx: 0, cz: 0, radius: 13, baseY: 11.8, speed: 0.45, phase: 0.1 },
      { cx: 19, cz: -18, radius: 10, baseY: 13.6, speed: -0.52, phase: 2.0 },
      { cx: -16, cz: 10, radius: 12, baseY: 12.0, speed: 0.38, phase: 3.8 },
    ],
  },
  4: {
    chapter: 4,
    biome: 'fen',
    palette: BIOME_PALETTES.fen,
    riverMode: 3,
    waterY: -0.32,
    waterRotationY: -Math.atan2(0.55, 1),
    waterWidth: 7.4,
    riverMinimapLine: [-40, -22, 40, 22],
    roadMinimapLine: [-18, -21, 18, 21],
    bridges: [
      { x: -8, z: -4.4, rotY: -Math.atan2(0.55, 1), width: 5.2, length: 8.6, style: 'timber' },
      { x: 8, z: 4.4, rotY: -Math.atan2(0.55, 1), width: 5.2, length: 8.6, style: 'timber' },
    ],
    detinets: { x: -18, z: -21 },
    kazarma: { x: -11, z: -22 },
    kapishche: { x: -24, z: -22 },
    vezha: { x: -11.5, z: -15.0 },
    merchant: { x: -2, z: -14 },
    fountain: { x: -13, z: 14 },
    monoliths: [
      { x: 20, z: 22 },
      { x: 11, z: 24 },
    ],
    rallyDefault: { x: -12, z: -16 },
    cameraHome: { x: -13, z: -18 },
    resources: {
      goldHome: { x: -24, z: -27, name: 'Болотный самородок', remaining: 3800 },
      goldMid: { x: 2, z: 14, name: 'Корень злата', remaining: 5200 },
      woodHome: { x: -14, z: -28, name: 'Древняя роща', remaining: 4000 },
    },
    playerUnits: {
      voivode: { x: -13.5, z: -18.5 },
      vedunya: { x: -16.5, z: -16.5 },
      ratniks: [
        { x: -11.8, z: -17.5 },
        { x: -15.0, z: -15.0 },
        { x: -12.8, z: -19.8 },
      ],
      luchniks: [
        { x: -15.8, z: -18.8 },
        { x: -17.2, z: -17.5 },
      ],
      goldWorker: { x: -21.2, z: -24.5 },
      woodWorker: { x: -14.8, z: -25.0 },
    },
    initialBoss: { x: 13, z: 16 },
    navOutpost: [
      { kind: 'upyr', x: 11, z: 12 },
      { kind: 'upyr', x: 15, z: 14 },
      { kind: 'likho', x: 17, z: 18 },
      { kind: 'morovik', x: 18, z: 21 },
      { kind: 'morovik', x: 12, z: 22 },
      { kind: 'likho', x: 9, z: 20 },
    ],
    creepCamps: [
      { kind: 'upyr', x: -2, z: -10.5, relic: 'living_water' },
      { kind: 'upyr', x: 0, z: 12 },
      { kind: 'likho', x: 4, z: 13.5, relic: 'perun_amulet' },
      { kind: 'upyr', x: -11, z: 16.5 },
      { kind: 'morovik', x: -15, z: 17.5, relic: 'rod_ward' },
      { kind: 'likho', x: 20, z: -8, relic: 'veles_cloak' },
      { kind: 'morovik', x: 22, z: -11, relic: 'svarog_ring' },
    ],
    palisadeSpots: [
      { x: -15.6, z: -14.2, ry: -Math.PI / 5 },
      { x: -9.8, z: -12.5, ry: -Math.PI / 5 },
      { x: -22.8, z: -24.5, ry: Math.PI / 4 },
    ],
    totemSpots: [
      { x: -15.0, z: -19.0, ry: -0.4 },
      { x: -21.5, z: -19.5, ry: 0.7 },
      { x: -8.5, z: -9.5, ry: -0.5 },
    ],
    archSpot: { x: -8.2, z: -7.5, ry: -Math.atan2(0.55, 1) },
    campfireSpots: [
      { x: -15.5, z: -18.5, phase: 0.4 },
      { x: -13.2, z: -20.6, phase: 2.1 },
    ],
    groveCenters: [
      { x: -24, z: 2 },
      { x: 22, z: -2 },
      { x: 2, z: -24 },
      { x: -4, z: 25 },
    ],
    mistLocations: [
      { x: -6, z: -4, op: 0.24, sp: 0.3 },
      { x: 8, z: 4, op: 0.24, sp: -0.28 },
      { x: 20, z: 22, op: 0.32, sp: 0.25, isMonolith: true },
      { x: 11, z: 24, op: 0.32, sp: -0.25, isMonolith: true },
    ],
    ravenCenters: [
      { cx: 14, cz: 17, radius: 11, baseY: 13.0, speed: 0.48, phase: 0.3 },
      { cx: -12, cz: -14, radius: 10, baseY: 11.8, speed: -0.4, phase: 2.2 },
    ],
  },
};

export function getMapLayout(chapter: ChapterId = 1): ChapterMapLayout {
  return CHAPTER_LAYOUTS[chapter] ?? CHAPTER_LAYOUTS[1];
}

export function getBiomeForChapter(chapter: ChapterId = 1): BiomePalette {
  return getMapLayout(chapter).palette;
}

export function getRiverDistance(chapter: ChapterId, x: number, z: number): number {
  if (chapter === 2) {
    // River line: z + 0.25 * x = 0
    return Math.abs(z + 0.25 * x) / 1.0307764;
  }
  if (chapter === 3) {
    // Moat line: x + 0.35 * z = 0
    return Math.abs(x + 0.35 * z) / 1.059481;
  }
  if (chapter === 4) {
    // Fen river line: z - 0.55 * x = 0
    return Math.abs(z - 0.55 * x) / 1.1412712;
  }
  // Chapter 1: x - z = 0
  return Math.abs(x - z) / Math.SQRT2;
}

export function getRoadDistance(chapter: ChapterId, x: number, z: number): number {
  if (chapter === 2) {
    // Road line from (-14, 19) to (10, -14): roughly 1.375 * x + z = 0
    return Math.abs(1.375 * x + z) / 1.70018;
  }
  if (chapter === 3) {
    // Road line across center: 0.75 * x + z = 0
    return Math.abs(0.75 * x + z) / 1.25;
  }
  if (chapter === 4) {
    // Trail from (-18, -21) to (20, 22): roughly x - 0.85 * z = 0
    return Math.abs(x - 0.85 * z) / 1.31244;
  }
  return Math.abs(x + z) / Math.SQRT2;
}

export function groundHeightAtForChapter(chapter: ChapterId, x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);
  const creekDist = getRiverDistance(chapter, x, z);
  const riverCarve = Math.min(1, creekDist / 5.2);
  const rim = Math.max(0, (distFromCenter - 30) * 0.24) * riverCarve;
  const creekDip = Math.max(0, 1 - creekDist / 4.4) * -0.82;

  const layout = getMapLayout(chapter);
  let fordLift = 0;
  for (const br of layout.bridges) {
    const fordDist = Math.hypot(x - br.x, z - br.z);
    fordLift = Math.max(fordLift, Math.max(0, 1 - fordDist / 4.3) * 0.45);
  }

  let micro = Math.sin(x * 0.14) * Math.cos(z * 0.14) * 0.14;
  if (chapter === 2) {
    micro += Math.sin(x * 0.09 + 0.7) * Math.sin(z * 0.08) * 0.18;
  } else if (chapter === 3) {
    micro += Math.cos(x * 0.11 - z * 0.08) * 0.22;
  } else if (chapter === 4) {
    micro += Math.sin(x * 0.1 + z * 0.1) * 0.18;
  }
  return Math.max(-0.85, rim + creekDip + fordLift + micro);
}
