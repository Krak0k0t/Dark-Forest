import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  getBiomeForChapter,
  getMapLayout,
  getRiverDistance,
  getRoadDistance,
} from './biomes';
import {
  BUILDING_STATS,
  MAP_HALF_SIZE,
  PLAYABLE_HALF_SIZE,
  UNIT_STATS,
  groundHeightAt,
} from './constants';
import { audioEngine } from './audio';
import {
  FOG_GRID_SIZE,
  downsampleFogForMinimap,
  getFogStateAt,
} from './fog';
import {
  MaterialPalette,
  UnitVisualRig,
  buildBuildingMesh,
  buildCampfireProp,
  buildRelicMesh,
  buildResourceMesh,
  buildRunicArchProp,
  buildSlavicTotemProp,
  buildUnitRig,
  createMaterialPalette,
} from './models';
import { PooledParticleSystem } from './particles';
import {
  assignControlGroup,
  buyRelicFromMerchant,
  canPlaceBuilding,
  castHeroAbility,
  createInitialWorld,
  getHero,
  getHero2,
  getSupplyCounts,
  getUnitEffectiveStats,
  issueAttackOrder,
  issueBuildOrder,
  issueGatherOrder,
  issueMoveOrder,
  recallControlGroup,
  researchUpgrade,
  setBuildingRallyPoint,
  setWorldFormation,
  startBuildingConstruction,
  stepWorld,
  stopSelectedUnits,
  toggleAbilityAutocast,
  trainUnit,
  triggerHeroJump,
  useHeroRelic,
} from './rules';
import { DEFAULT_SETTINGS } from './settings';
import { GameTextureSet, loadGameTextures } from './textures';
import {
  AbilityId,
  BuildingKind,
  ChapterId,
  DifficultyLevel,
  FormationKind,
  GameSettings,
  HudSnapshot,
  MouseAction,
  MusicZone,
  RelicId,
  UnitKind,
  UpgradeId,
  WorldState,
} from './types';

export type TouchMode = 'select' | 'order' | 'jump';

// Scratch objects outside render loop for zero GC
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _projVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface GroundRingFx {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
}

export interface BoxSelectRect {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignetteDarkness: { value: 0.44 },
    vignetteOffset: { value: 0.92 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float vignetteDarkness;
    uniform float vignetteOffset;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;

      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.88, 0.94, 1.08);
      vec3 highlightTint = vec3(1.08, 1.01, 0.92);
      col *= mix(shadowTint, highlightTint, smoothstep(0.10, 0.72, luma));

      col = clamp((col - 0.5) * 1.1 + 0.5, 0.0, 1.0);

      vec2 uv = (vUv - 0.5) * 2.0;
      float vig = smoothstep(vignetteOffset, vignetteOffset - 0.85, length(uv) * 0.78);
      col *= mix(1.0 - vignetteDarkness, 1.0, vig);

      gl_FragColor = vec4(col, tex.a);
    }
  `,
};

function createDeformedConiferBoughGeo(baseRadius: number, height: number, radialSegs = 9, seed = 17): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(baseRadius, height, radialSegs, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.05) {
      const a = Math.atan2(z, x);
      // Organic jagged spruce branch silhouette + subtle droop on outer tips
      const jitter = 1 + Math.sin(a * 5 + seed) * 0.18 + Math.cos(a * 3 - seed * 0.7) * 0.12;
      const droop = (r / baseRadius) * 0.22;
      pos.setXYZ(i, x * jitter, y - droop, z * jitter);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function createFernClumpGeo(): THREE.BufferGeometry {
  const fronds = 7;
  const positions: number[] = [];
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + (f % 2) * 0.22;
    const len = 0.44 + (f % 3) * 0.08;
    const h = 0.2 + (f % 2) * 0.06;
    const w = 0.24;

    const bx = 0;
    const by = 0.02;
    const bz = 0;
    const mx1 = Math.cos(a - w) * (len * 0.52);
    const mz1 = Math.sin(a - w) * (len * 0.52);
    const mx2 = Math.cos(a + w) * (len * 0.52);
    const mz2 = Math.sin(a + w) * (len * 0.52);
    const tx = Math.cos(a) * len;
    const ty = h * 0.55;
    const tz = Math.sin(a) * len;

    positions.push(bx, by, bz, mx1, h, mz1, mx2, h, mz2);
    positions.push(mx1, h, mz1, tx, ty, tz, mx2, h, mz2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export class SlavicRtsEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: GameTextureSet;
  private palette: MaterialPalette;
  private particles: PooledParticleSystem;

  private world: WorldState;
  private unitRigs = new Map<string, UnitVisualRig>();
  private buildingRigs = new Map<
    string,
    {
      root: THREE.Group;
      structureGroup: THREE.Group;
      scaffoldGroup: THREE.Group;
      selectionRing: THREE.Mesh;
      hpBg: THREE.Mesh;
      hpFill: THREE.Mesh;
      flameMesh?: THREE.Group | THREE.Mesh;
      orbitShards?: THREE.Group;
    }
  >();
  private resourceMeshes = new Map<string, THREE.Group>();
  private relicMeshes = new Map<string, THREE.Group>();
  private projectileMeshes = new Map<string, THREE.Mesh>();
  private ringFxList: GroundRingFx[] = [];
  private bossTelegraphMesh: THREE.Mesh;
  private fogOverlayMesh!: THREE.Mesh;
  private fogTexData = new Uint8Array(FOG_GRID_SIZE * FOG_GRID_SIZE * 4);
  private fogTexture!: THREE.DataTexture;
  private fogUpdateAccum = 0;
  private fogDirty = true;
  private buildPreviewGroup!: THREE.Group;
  private buildPreviewRing!: THREE.Mesh;
  private buildPreviewBody!: THREE.Mesh;
  private rallyMarkerGroup!: THREE.Group;
  private rallyRingMesh!: THREE.Mesh;
  private rallyFlagMesh!: THREE.Mesh;
  private hoverWorldX = -12;
  private hoverWorldZ = 14;
  private environmentGroup = new THREE.Group();
  private builtBiomeChapter: ChapterId | null = null;
  private terrainMesh!: THREE.Mesh;
  private waterMesh!: THREE.Mesh;
  private skyMesh!: THREE.Mesh;
  private foliageMaterials: THREE.MeshStandardMaterial[] = [];
  private mistMeshes: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; speed: number; phase: number }> = [];
  private fireLights: Array<{ light: THREE.PointLight; baseIntensity: number; phase: number }> = [];
  private campfireFlames: Array<{ flame: THREE.Group; phase: number }> = [];
  private sunShafts: THREE.Mesh[] = [];
  private ravens: Array<{
    group: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    cx: number;
    cz: number;
    radius: number;
    baseY: number;
    speed: number;
    phase: number;
  }> = [];
  private heroLight!: THREE.PointLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private emberSpawnAccum = 0;
  private weatherSpawnAccum = 0;
  private buildSparkAccum = 0;
  private lastLeftClickMs = 0;
  private lastLeftClickKind: UnitKind | null = null;
  private titleHeroActionTimer = 0;
  private titleTransitionTimer = 0;
  private pendingTransitionCb: (() => void) | null = null;
  private bossPhaseBannerTimer = 0;
  private activeBossPhaseBanner: 2 | 3 | null = null;

  private settings: GameSettings;
  private touchMode: TouchMode = 'select';
  private activeTouches = new Map<number, { x: number; y: number }>();
  private touchGestureStart = { x: 0, y: 0, moved: false, pinchDist: 0, wasPinch: false };

  private camTargetX = -12;
  private camTargetZ = 14;
  private camGoalX = -12;
  private camGoalZ = 14;
  private camDist = 23.5;
  private camDistGoal = 23.5;
  private camYaw = 0.72;
  private camYawGoal = 0.72;

  private keysHeld = new Set<string>();
  private draggingBox = false;
  private boxStartX = 0;
  private boxStartY = 0;
  private rightDraggingRotate = false;
  private middleDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private frameId = 0;
  private disposed = false;
  private lastFrameMs = 0;
  private hudAccum = 0;
  private onHudUpdate: (snap: HudSnapshot) => void;
  private onBoxSelectUpdate: (rect: BoxSelectRect) => void;

  private sharedRingGeom = new THREE.RingGeometry(0.75, 1.0, 28);
  private arrowGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.78, 5);
  private boltGeom = new THREE.CylinderGeometry(0.055, 0.055, 1.32, 6);
  private orbGeom = new THREE.OctahedronGeometry(0.22, 0);
  private arrowMat = new THREE.MeshStandardMaterial({
    color: 0xf4d58d,
    emissive: 0x8a5b1e,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
  private boltMat = new THREE.MeshStandardMaterial({
    color: 0xd0d6de,
    emissive: 0x6b4b22,
    emissiveIntensity: 0.45,
    roughness: 0.32,
    metalness: 0.8,
  });
  private spiritMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff6a1a,
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });
  private bogMat = new THREE.MeshStandardMaterial({
    color: 0x7effaa,
    emissive: 0x29e378,
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });
  private frostMat = new THREE.MeshStandardMaterial({
    color: 0x9ef0ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });

  constructor(
    container: HTMLElement,
    initialPhase: WorldState['phase'],
    initialSettings: GameSettings,
    onHudUpdate: (snap: HudSnapshot) => void,
    onBoxSelectUpdate: (rect: BoxSelectRect) => void,
  ) {
    this.container = container;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...initialSettings,
      keyBindings: { ...DEFAULT_SETTINGS.keyBindings, ...initialSettings.keyBindings },
    };
    this.onHudUpdate = onHudUpdate;
    this.onBoxSelectUpdate = onBoxSelectUpdate;

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const fogColor = 0x0e161f;
    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0128);

    const aspect = (container.clientWidth || 1280) / Math.max(1, container.clientHeight || 720);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 180);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.textures = loadGameTextures(this.renderer);
    this.palette = createMaterialPalette(this.textures);
    this.particles = new PooledParticleSystem();
    this.scene.add(this.particles.mesh);

    this.bossTelegraphMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 6.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff492e,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.bossTelegraphMesh.rotation.x = -Math.PI / 2;
    this.bossTelegraphMesh.visible = false;
    this.scene.add(this.bossTelegraphMesh);

    this.scene.add(this.environmentGroup);
    this.buildSkyDome();
    this.setupLighting();
    this.buildFogOverlay();
    this.buildPlacementGhost();
    this.buildRallyMarker();

    this.world = createInitialWorld(initialPhase, this.settings.difficulty);
    this.rebuildBiomeEnvironment(this.world.chapter);

    if (!this.isSoftwareGl) {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.55, 0.84);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new ShaderPass(CinematicGradeShader));
      this.composer.addPass(new OutputPass());
    }

    this.syncMeshesToWorld();
    this.applyGraphicsSettings();
    this.applyAudioSettings();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHudSnapshot();
    this.startLoop();
  }

  private buildSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(125, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.55, 0.25, 0.48).normalize() },
        uZenith: { value: new THREE.Color(0x060b13) },
        uMidSky: { value: new THREE.Color(0x101825) },
        uHorizon: { value: new THREE.Color(0x18202a) },
        uSunGlow: { value: new THREE.Color(0x733814) },
        uAuroraStrength: { value: 0.0 },
        uEmberSkyStrength: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uZenith;
        uniform vec3 uMidSky;
        uniform vec3 uHorizon;
        uniform vec3 uSunGlow;
        uniform float uAuroraStrength;
        uniform float uEmberSkyStrength;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, -0.1, 1.0);

          vec3 col = mix(uHorizon, uMidSky, smoothstep(0.0, 0.25, h));
          col = mix(col, uZenith, smoothstep(0.22, 0.75, h));

          float sunDot = max(0.0, dot(dir, uSunDir));
          col += uSunGlow * pow(sunDot, 5.0) * smoothstep(0.45, 0.0, h);
          col += (uSunGlow * 1.65) * pow(sunDot, 56.0);
          float moonDisc = smoothstep(0.994, 0.9985, sunDot);
          col += (uSunGlow * 1.15 + vec3(0.32, 0.34, 0.38)) * moonDisc * 0.7;

          if (h > -0.02) {
            vec2 cloudUv = dir.xz / (max(0.05, dir.y) + 0.18) * 1.4 + vec2(uTime * 0.008, uTime * 0.004);
            float c = noise(cloudUv) * 0.65 + noise(cloudUv * 2.3) * 0.35;
            float band = smoothstep(0.46, 0.85, c) * smoothstep(-0.02, 0.2, h) * smoothstep(0.8, 0.22, h);
            vec3 cloudCol = mix(uMidSky * 1.45, uSunGlow * 0.85, pow(sunDot, 2.0));
            col = mix(col, cloudCol, band * 0.58);
          }

          if (uAuroraStrength > 0.01 && h > -0.04) {
            float wave = sin(dir.x * 8.5 + uTime * 0.42 + dir.z * 3.0) * cos(dir.z * 6.5 - uTime * 0.28);
            float ribbon = smoothstep(0.18, 0.82, wave * 0.5 + 0.5) * smoothstep(-0.04, 0.24, h) * smoothstep(0.85, 0.32, h);
            vec3 aurCol = mix(vec3(0.16, 0.88, 0.68), vec3(0.32, 0.64, 0.98), dir.x * 0.5 + 0.5);
            col += aurCol * ribbon * uAuroraStrength * 0.58;
          }

          if (uEmberSkyStrength > 0.01) {
            float emberGlow = smoothstep(0.48, -0.08, h) * (0.68 + 0.32 * sin(dir.x * 9.0 + uTime * 0.6));
            col += vec3(0.66, 0.17, 0.06) * emberGlow * uEmberSkyStrength * 0.62;
          }

          col = mix(uHorizon * 0.94, col, smoothstep(-0.08, 0.12, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  private setupLighting(): void {
    // Lower Hemisphere fill so chiaroscuro shadows and warm firelight read dramatically
    this.hemiLight = new THREE.HemisphereLight(0x52739c, 0x14110d, 0.44);
    this.scene.add(this.hemiLight);

    // Warm golden low-angle dusk sun key light
    this.keyLight = new THREE.DirectionalLight(0xffc37d, 2.85);
    this.keyLight.position.set(24, 28, 22);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 85;
    const d = 28;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.025;
    this.keyLight.shadow.radius = 2.5;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Cool moonlight rim backlight for dramatic silhouette edges
    this.rimLight = new THREE.DirectionalLight(0x618ec9, 1.05);
    this.rimLight.position.set(-28, 15, -24);
    this.scene.add(this.rimLight);

    // 4 atmospheric flickering PointLights casting rich local warm/emerald light pools
    const addFireLight = (x: number, y: number, z: number, color: number, intensity: number, dist: number, phase: number) => {
      const l = new THREE.PointLight(color, intensity, dist, 1.6);
      l.position.set(x, y, z);
      this.scene.add(l);
      this.fireLights.push({ light: l, baseIntensity: intensity, phase });
    };

    addFireLight(-16.5, 2.7, 19.2, 0xff7b24, 34, 22, 0.0); // Stronghold hearth & gate brazier
    addFireLight(-21.0, 2.4, 10.2, 0xff9f34, 24, 18, 1.7); // Pagan Shrine altar fire
    addFireLight(-13.8, 2.1, 21.8, 0xff7020, 22, 16, 3.1); // Barracks smithy forge
    addFireLight(23.0, 3.8, -21.0, 0x24d66c, 18, 22, 4.4); // Cursed Nav Monolith aura

    // Warm dynamic torchlight carried by Voivode Svyatoslav
    this.heroLight = new THREE.PointLight(0xffa44c, 13, 13, 1.6);
    this.heroLight.position.set(-11.5, 2.2, 13.5);
    this.scene.add(this.heroLight);
  }

  private clearBiomeEnvironment(): void {
    const disposedGeos = new Set<THREE.BufferGeometry>();
    const disposedMats = new Set<THREE.Material>();
    const protectedMats = new Set<THREE.Material>([
      this.palette.stone,
      this.palette.obsidian,
      this.palette.timber,
      this.palette.oak,
      this.palette.bark,
      this.palette.gold,
      this.palette.emberCore,
      this.palette.darkIron,
      this.palette.iron,
      this.palette.navGlow,
      this.palette.spiritBlue,
      this.palette.runeCyan,
      this.palette.crimson,
      this.palette.skin,
    ]);

    this.environmentGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        if (!disposedGeos.has(obj.geometry)) {
          obj.geometry.dispose();
          disposedGeos.add(obj.geometry);
        }
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && !protectedMats.has(m) && !disposedMats.has(m)) {
            m.dispose();
            disposedMats.add(m);
          }
        }
      }
    });
    this.environmentGroup.clear();
    this.foliageMaterials = [];
    this.mistMeshes = [];
    this.campfireFlames = [];
    this.sunShafts = [];
    this.ravens = [];
  }

  private rebuildBiomeEnvironment(chapter: ChapterId): void {
    if (this.builtBiomeChapter === chapter) return;
    this.builtBiomeChapter = chapter;
    this.clearBiomeEnvironment();

    const layout = getMapLayout(chapter);
    const pal = layout.palette;

    // Update atmosphere, sky, fog, and lighting for the chapter biome
    this.scene.background = new THREE.Color(pal.fogColor);
    this.scene.fog = new THREE.FogExp2(pal.fogColor, pal.fogDensity);

    const skyMat = this.skyMesh.material as THREE.ShaderMaterial;
    skyMat.uniforms.uZenith.value.setHex(pal.skyZenith);
    skyMat.uniforms.uMidSky.value.setHex(pal.skyMid);
    skyMat.uniforms.uHorizon.value.setHex(pal.skyHorizon);
    skyMat.uniforms.uSunGlow.value.setHex(pal.skySunGlow);
    skyMat.uniforms.uAuroraStrength.value = pal.auroraStrength;
    skyMat.uniforms.uEmberSkyStrength.value = pal.emberSkyStrength;

    this.hemiLight.color.setHex(pal.hemiSky);
    this.hemiLight.groundColor.setHex(pal.hemiGround);
    this.hemiLight.intensity = pal.hemiIntensity;
    this.keyLight.color.setHex(pal.keyColor);
    this.keyLight.intensity = pal.keyIntensity;
    this.rimLight.color.setHex(pal.rimColor);
    this.rimLight.intensity = pal.rimIntensity;

    // Reposition atmospheric hearth & monolith lights to match this chapter's buildings
    const lightAnchors = [
      { x: layout.detinets.x + 1.5, y: 2.7, z: layout.detinets.z + 2.2, col: 0xff7b24 },
      { x: layout.kapishche.x, y: 2.4, z: layout.kapishche.z + 1.2, col: 0xff9f34 },
      { x: layout.kazarma.x - 2.4, y: 2.1, z: layout.kazarma.z + 1.8, col: 0xff7020 },
      { x: layout.monoliths[0].x, y: 3.8, z: layout.monoliths[0].z, col: pal.monolithLightColor },
    ];
    this.fireLights.forEach((fl, i) => {
      const a = lightAnchors[i];
      if (a) {
        fl.light.position.set(a.x, a.y, a.z);
        fl.light.color.setHex(a.col);
      }
    });

    // Re-seat Fog of War plane heights for this chapter's terrain
    if (this.fogOverlayMesh) {
      const fPos = this.fogOverlayMesh.geometry.attributes.position;
      for (let i = 0; i < fPos.count; i++) {
        const vx = fPos.getX(i);
        const vz = fPos.getZ(i);
        const gy = groundHeightAt(vx, vz, chapter);
        fPos.setY(i, Math.max(-0.18, gy) + 0.35);
      }
      fPos.needsUpdate = true;
    }

    // 1. Biome Earth Terrain with calibrated low envMapIntensity + dynamic FBM shader
    const size = 116;
    const segs = 80;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = groundHeightAt(vx, vz, chapter);
      pos.setY(i, vy);

      const pathDist = getRoadDistance(chapter, vx, vz);
      const onPath = Math.max(0, 1 - pathDist / 5.8);
      const creekDist = getRiverDistance(chapter, vx, vz);
      const nearCreek = Math.max(0, 1 - creekDist / 4.8);
      const mossPatch = Math.sin(vx * 0.28) * Math.cos(vz * 0.28) * 0.5 + 0.5;

      let r = 0.64 + mossPatch * 0.04;
      let g = 0.7 + mossPatch * 0.08;
      let b = 0.6 + mossPatch * 0.02;

      if (chapter === 2) {
        r = 0.68 + mossPatch * 0.1;
        g = 0.78 + mossPatch * 0.1;
        b = 0.88 + mossPatch * 0.08;
      } else if (chapter === 3) {
        r = 0.58 + mossPatch * 0.06;
        g = 0.45 + mossPatch * 0.04;
        b = 0.44 + mossPatch * 0.04;
      } else if (chapter === 4) {
        r = 0.54 + mossPatch * 0.07;
        g = 0.76 + mossPatch * 0.1;
        b = 0.52 + mossPatch * 0.04;
      }

      if (onPath > 0.15) {
        r += onPath * (chapter === 3 ? 0.18 : 0.2);
        g += onPath * (chapter === 3 ? 0.07 : 0.12);
      }
      if (nearCreek > 0.15) {
        r -= nearCreek * 0.24;
        g -= nearCreek * 0.16;
        b -= nearCreek * 0.12;
      }
      if (vy > 1.15) {
        r *= chapter === 2 ? 1.05 : 0.82;
        g *= chapter === 2 ? 1.08 : 0.85;
        b *= chapter === 2 ? 1.14 : 0.92;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: pal.terrainPrimaryTint,
      map: this.textures.earthMap,
      normalMap: this.textures.earthNormal,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughnessMap: this.textures.earthRoughness,
      vertexColors: true,
      roughness: chapter === 2 ? 0.84 : 0.94,
      metalness: 0.02,
      envMapIntensity: chapter === 2 ? 0.34 : 0.24,
    });

    terrainMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uRiverMode = { value: layout.riverMode };
      shader.uniforms.uSecondaryCol = { value: new THREE.Color(...pal.terrainSecondaryRgb) };
      shader.uniforms.uRoadCol = { value: new THREE.Color(...pal.terrainRoadRgb) };
      shader.uniforms.uBankCol = { value: new THREE.Color(...pal.terrainBankRgb) };
      shader.uniforms.uSnowCap = { value: pal.snowCapStrength };
      shader.uniforms.uEmberGlow = { value: pal.emberCreviceStrength };
      terrainMat.userData.shader = shader;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vTerrainWorldPos;`,
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
           vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vTerrainWorldPos;
           uniform float uTime;
           uniform float uRiverMode;
           uniform vec3 uSecondaryCol;
           uniform vec3 uRoadCol;
           uniform vec3 uBankCol;
           uniform float uSnowCap;
           uniform float uEmberGlow;
           float tHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
           float tNoise(vec2 p) {
             vec2 i = floor(p);
             vec2 f = fract(p);
             f = f * f * (3.0 - 2.0 * f);
             return mix(
               mix(tHash(i), tHash(i + vec2(1.0, 0.0)), f.x),
               mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), f.x),
               f.y
             );
           }
           float getRiverD(vec2 wp) {
             if (uRiverMode > 2.5) return abs(wp.y - 0.55 * wp.x) / 1.14127;
             if (uRiverMode > 1.5) return abs(wp.x + 0.35 * wp.y) / 1.05948;
             if (uRiverMode > 0.5) return abs(wp.y + 0.25 * wp.x) / 1.03078;
             return abs(wp.x - wp.y) * 0.7071;
           }
           float getRoadD(vec2 wp) {
             if (uRiverMode > 2.5) return abs(wp.x - 0.85 * wp.y) / 1.31244;
             if (uRiverMode > 1.5) return abs(0.75 * wp.x + wp.y) / 1.25;
             if (uRiverMode > 0.5) return abs(1.375 * wp.x + wp.y) / 1.70018;
             return abs(wp.x + wp.y) * 0.7071;
           }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           vec2 wp = vTerrainWorldPos.xz;
           float fbm = tNoise(wp * 0.35) * 0.6 + tNoise(wp * 0.95) * 0.4;
           float creekD = getRiverD(wp);
           float bankWet = 1.0 - smoothstep(1.6, 5.4, creekD);
           float pathD = getRoadD(wp);
           float roadMix = 1.0 - smoothstep(1.5, 4.6, pathD);

           diffuseColor.rgb = mix(diffuseColor.rgb, uSecondaryCol, smoothstep(0.42, 0.78, fbm) * 0.52);
           diffuseColor.rgb = mix(diffuseColor.rgb, uRoadCol, roadMix * 0.44);
           diffuseColor.rgb = mix(diffuseColor.rgb, uBankCol, bankWet * 0.68);
           if (uSnowCap > 0.01) {
             float snowDrift = smoothstep(0.32, 0.68, fbm) * (1.0 - bankWet * 0.62) * (1.0 - roadMix * 0.5);
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.85, 0.94), snowDrift * uSnowCap);
           }
           if (uEmberGlow > 0.01) {
             float crack = smoothstep(0.78, 0.93, tNoise(wp * 0.55 + vec2(3.1, 1.7))) * smoothstep(8.0, 22.0, length(wp - vec2(-20.0, 12.0)));
             float pulse = 0.72 + 0.28 * sin(uTime * 2.4 + wp.x * 0.3);
             diffuseColor.rgb += vec3(0.72, 0.20, 0.04) * crack * pulse * uEmberGlow;
           }`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           float creekRw = getRiverD(vTerrainWorldPos.xz);
           float wetGloss = 1.0 - smoothstep(1.4, 4.5, creekRw);
           roughnessFactor = mix(roughnessFactor, 0.22, wetGloss * 0.85);`,
        );
    };

    this.terrainMesh = new THREE.Mesh(geo, terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.environmentGroup.add(this.terrainMesh);

    // 2. Animated Shimmering River / Glacial Stream / Sulfurous Moat
    const waterGeo = new THREE.PlaneGeometry(118, layout.waterWidth, 64, 10);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: pal.waterColor,
      roughness: pal.waterRoughness,
      metalness: pal.waterMetalness,
      clearcoat: 0.08,
      clearcoatRoughness: chapter === 2 ? 0.25 : 0.45,
      envMapIntensity: 0.14,
      transparent: true,
      opacity: pal.waterOpacity,
    });
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uRippleTint = { value: new THREE.Color(pal.waterRippleTint) };
      shader.uniforms.uFoamTint = { value: new THREE.Color(pal.waterFoamTint) };
      waterMat.userData.shader = shader;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           varying vec2 vWaterUv;
           varying vec3 vWaterWorld;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vWaterUv = uv;
           vWaterWorld = (modelMatrix * vec4(position, 1.0)).xyz;
           transformed.y += sin(position.x * 0.9 + uTime * 2.0) * 0.028 + cos(position.z * 1.4 - uTime * 1.5) * 0.022;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform vec3 uRippleTint;
           uniform vec3 uFoamTint;
           varying vec2 vWaterUv;
           varying vec3 vWaterWorld;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           vec2 wp = vWaterWorld.xz;
           float w1 = sin(dot(wp, vec2(1.4, 0.9)) + uTime * 2.2);
           float w2 = cos(dot(wp, vec2(-1.1, 1.6)) - uTime * 1.7);
           float w3 = sin(dot(wp, vec2(0.5, -2.1)) + uTime * 1.3);
           float ripple = (w1 * w2 + w3 * 0.5) * 0.5;
           float bankFoam = smoothstep(0.37, 0.49, abs(vWaterUv.y - 0.5));
           diffuseColor.rgb += uRippleTint * max(0.0, ripple);
           diffuseColor.rgb = mix(diffuseColor.rgb, uFoamTint, bankFoam * 0.38);`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
           vec2 nwp = vWaterWorld.xz;
           float nx = (cos(dot(nwp, vec2(1.7, 1.1)) + uTime * 2.1) + sin(dot(nwp, vec2(-0.8, 1.9)) - uTime * 1.6)) * 0.035;
           float nz = (sin(dot(nwp, vec2(1.2, -1.5)) + uTime * 1.8) + cos(dot(nwp, vec2(2.1, 0.7)) - uTime * 2.3)) * 0.035;
           normal = normalize(normal + vec3(nx, 0.0, nz));`,
        );
    };
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(0, layout.waterY, 0);
    this.waterMesh.rotation.y = layout.waterRotationY;
    this.environmentGroup.add(this.waterMesh);

    // 3. Chapter Bridges (Timber Ford / Twin Frostfen Bridges / Basalt Causeway)
    for (const br of layout.bridges) {
      const bridge = new THREE.Group();
      const by = groundHeightAt(br.x, br.z, chapter);
      bridge.position.set(br.x, by, br.z);
      bridge.rotation.y = br.rotY;

      const deckMat = br.style === 'basalt' ? this.palette.stone : this.palette.timber;
      const abutmentMat = br.style === 'basalt' ? this.palette.darkIron : this.palette.stone;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(br.width, 0.38, br.length), deckMat);
      deck.position.y = 0.25;
      deck.receiveShadow = true;
      deck.castShadow = true;
      bridge.add(deck);

      const abOffset = br.length * 0.48;
      for (const sz of [-abOffset, abOffset]) {
        const abutment = new THREE.Mesh(new THREE.BoxGeometry(br.width + 0.5, 0.9, 1.3), abutmentMat);
        abutment.position.set(0, 0.02, sz);
        abutment.receiveShadow = true;
        bridge.add(abutment);
      }

      const postX = br.width * 0.46;
      const spanZ = br.length * 0.42;
      for (const sx of [-postX, postX]) {
        for (const sz of [-spanZ, 0, spanZ]) {
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.21, 1.35, 8),
            br.style === 'basalt' ? this.palette.darkIron : this.palette.timber,
          );
          post.position.set(sx, 0.72, sz);
          post.castShadow = true;
          bridge.add(post);
          if (Math.abs(sz) > 2) {
            const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.24, 6), this.palette.darkIron);
            cage.position.set(sx, 1.45, sz);
            bridge.add(cage);
            const flame = new THREE.Mesh(
              new THREE.ConeGeometry(0.09, 0.22, 6),
              br.style === 'frost' ? this.palette.spiritBlue : this.palette.emberCore,
            );
            flame.position.set(sx, 1.62, sz);
            bridge.add(flame);
          }
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, br.length * 0.9), this.palette.oak);
        rail.position.set(sx, 1.12, 0);
        bridge.add(rail);
      }
      this.environmentGroup.add(bridge);
    }

    // 4. Palisade Gate Stakes flanking player approach
    for (const ps of layout.palisadeSpots) {
      const grp = new THREE.Group();
      const gy = groundHeightAt(ps.x, ps.z, chapter);
      grp.position.set(ps.x, gy, ps.z);
      grp.rotation.y = ps.ry;
      for (let k = -2; k <= 2; k++) {
        const stake = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.15, 1.65 + (Math.abs(k) % 2) * 0.2, 6),
          this.palette.timber,
        );
        stake.position.set(k * 0.38, 0.75, 0);
        stake.rotation.x = 0.22;
        stake.castShadow = true;
        grp.add(stake);
      }
      this.environmentGroup.add(grp);
    }

    // 5. Instanced 3-Tier Organic Gnarled Conifer Forest with Biome Foliage Palettes
    const isClearZone = (px: number, pz: number): boolean => {
      if (Math.hypot(px - layout.detinets.x, pz - layout.detinets.z) < 14.5) return true;
      for (const m of layout.monoliths) {
        if (Math.hypot(px - m.x, pz - m.z) < 12.0) return true;
      }
      if (Math.hypot(px - layout.merchant.x, pz - layout.merchant.z) < 5.8) return true;
      if (Math.hypot(px - layout.fountain.x, pz - layout.fountain.z) < 5.6) return true;
      if (Math.hypot(px - layout.resources.goldMid.x, pz - layout.resources.goldMid.z) < 5.2) return true;
      if (Math.hypot(px - layout.resources.goldHome.x, pz - layout.resources.goldHome.z) < 5.2) return true;
      if (Math.hypot(px - layout.resources.woodHome.x, pz - layout.resources.woodHome.z) < 5.2) return true;
      for (const br of layout.bridges) {
        if (Math.hypot(px - br.x, pz - br.z) < 7.2) return true;
      }
      if (getRiverDistance(chapter, px, pz) < 6.4) return true;
      if (getRoadDistance(chapter, px, pz) < 6.2) return true;
      return false;
    };

    const treePositions: Array<{ x: number; z: number; scale: number }> = [];
    let seed = 4242 + chapter * 917;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 230; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 24 + rand() * 24;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      if (isClearZone(tx, tz)) continue;
      treePositions.push({ x: tx, z: tz, scale: 0.9 + rand() * 0.65 });
    }
    for (const c of layout.groveCenters) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rand() * 0.4;
        const r = 1.6 + rand() * 2.8;
        const tx = c.x + Math.cos(a) * r;
        const tz = c.z + Math.sin(a) * r;
        if (!isClearZone(tx, tz)) {
          treePositions.push({ x: tx, z: tz, scale: 0.85 + rand() * 0.5 });
        }
      }
    }

    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.34, 2.9, 7),
      this.palette.bark,
      treePositions.length,
    );

    const makeFoliageMat = () => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        normalMap: this.textures.barkNormal,
        normalScale: new THREE.Vector2(1.0, 1.0),
        roughnessMap: this.textures.barkRoughness,
        roughness: chapter === 2 ? 0.88 : 0.95,
        metalness: 0.01,
        envMapIntensity: chapter === 2 ? 0.25 : 0.18,
      });
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        mat.userData.shader = shader;
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
             uniform float uTime;`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             float sway = sin(uTime * 1.35 + position.y * 0.8) * max(0.0, position.y) * 0.04;
             transformed.x += sway;`,
          );
      };
      this.foliageMaterials.push(mat);
      return mat;
    };

    const foliageLower = new THREE.InstancedMesh(
      createDeformedConiferBoughGeo(1.65, 2.55, 9, 11 + chapter * 3),
      makeFoliageMat(),
      treePositions.length,
    );
    const foliageMid = new THREE.InstancedMesh(
      createDeformedConiferBoughGeo(1.28, 2.2, 9, 23 + chapter * 5),
      makeFoliageMat(),
      treePositions.length,
    );
    const foliageUpper = new THREE.InstancedMesh(
      createDeformedConiferBoughGeo(0.88, 1.9, 8, 37 + chapter * 7),
      makeFoliageMat(),
      treePositions.length,
    );
    trunkMesh.castShadow = true;
    foliageLower.castShadow = true;
    foliageMid.castShadow = true;
    foliageUpper.castShadow = true;

    treePositions.forEach((tp, idx) => {
      const gy = groundHeightAt(tp.x, tp.z, chapter);
      const rotY = rand() * Math.PI * 2;
      _dummy.position.set(tp.x, gy + 1.35 * tp.scale, tp.z);
      _dummy.rotation.set(0, rotY, 0);
      _dummy.scale.setScalar(tp.scale);
      _dummy.updateMatrix();
      trunkMesh.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(tp.x, gy + 2.85 * tp.scale, tp.z);
      _dummy.updateMatrix();
      foliageLower.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(tp.x, gy + 4.1 * tp.scale, tp.z);
      _dummy.rotation.set(0, rotY + 0.7, 0);
      _dummy.updateMatrix();
      foliageMid.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(tp.x, gy + 5.2 * tp.scale, tp.z);
      _dummy.rotation.set(0, rotY + 1.4, 0);
      _dummy.updateMatrix();
      foliageUpper.setMatrixAt(idx, _dummy.matrix);

      const tint = 0.72 + rand() * 0.35;
      _color.setRGB(pal.treeLowerRgb[0] * tint, pal.treeLowerRgb[1] * tint, pal.treeLowerRgb[2] * tint);
      foliageLower.setColorAt(idx, _color);
      _color.setRGB(pal.treeMidRgb[0] * tint, pal.treeMidRgb[1] * tint, pal.treeMidRgb[2] * tint);
      foliageMid.setColorAt(idx, _color);
      _color.setRGB(pal.treeUpperRgb[0] * tint, pal.treeUpperRgb[1] * tint, pal.treeUpperRgb[2] * tint);
      foliageUpper.setColorAt(idx, _color);
    });
    trunkMesh.computeBoundingSphere();
    foliageLower.computeBoundingSphere();
    foliageMid.computeBoundingSphere();
    foliageUpper.computeBoundingSphere();
    this.environmentGroup.add(trunkMesh, foliageLower, foliageMid, foliageUpper);

    // 6. Instanced Boulders outside clearings & warpath
    const boulderCoords: Array<{ x: number; z: number; sc: number }> = [];
    for (let i = 0; i < 95 && boulderCoords.length < 48; i++) {
      const a = (i / 95) * Math.PI * 2 + rand() * 0.3;
      const dist = 16 + rand() * 25;
      const rx = Math.cos(a) * dist;
      const rz = Math.sin(a) * dist;
      if (isClearZone(rx, rz)) continue;
      boulderCoords.push({ x: rx, z: rz, sc: 0.68 + rand() * 1.05 });
    }
    const rockMat = new THREE.MeshStandardMaterial({
      color: pal.rockTint,
      map: this.textures.stoneMap,
      normalMap: this.textures.stoneNormal,
      roughness: chapter === 2 ? 0.78 : 0.9,
      metalness: 0.05,
      envMapIntensity: 0.25,
    });
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.88, 0),
      rockMat,
      boulderCoords.length,
    );
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    boulderCoords.forEach((b, i) => {
      const ry = groundHeightAt(b.x, b.z, chapter);
      _dummy.position.set(b.x, ry + 0.34 * b.sc, b.z);
      _dummy.rotation.set(rand(), rand(), rand());
      _dummy.scale.set(b.sc * 1.25, b.sc * 0.78, b.sc);
      _dummy.updateMatrix();
      rockMesh.setMatrixAt(i, _dummy.matrix);
    });
    rockMesh.computeBoundingSphere();
    this.environmentGroup.add(rockMesh);

    // 7. Instanced 3D Multi-Frond Forest Undergrowth Ferns / Ice Shrubs / Scorched Bushes
    const fernSpots: Array<{ x: number; z: number; sc: number }> = [];
    for (let i = 0; i < 110; i++) {
      const fx = (rand() - 0.5) * 66;
      const fz = (rand() - 0.5) * 66;
      if (Math.hypot(fx - layout.detinets.x, fz - layout.detinets.z) < 9.5) continue;
      if (layout.monoliths.some((m) => Math.hypot(fx - m.x, fz - m.z) < 6.5)) continue;
      if (getRiverDistance(chapter, fx, fz) < 4.0) continue;
      fernSpots.push({ x: fx, z: fz, sc: 0.65 + rand() * 0.65 });
    }
    const fernMesh = new THREE.InstancedMesh(
      createFernClumpGeo(),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.92,
        metalness: 0.01,
        envMapIntensity: 0.18,
        side: THREE.DoubleSide,
      }),
      fernSpots.length,
    );
    fernSpots.forEach((fs, idx) => {
      const gy = groundHeightAt(fs.x, fs.z, chapter);
      _dummy.position.set(fs.x, gy, fs.z);
      _dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      _dummy.scale.set(fs.sc, fs.sc * 1.15, fs.sc);
      _dummy.updateMatrix();
      fernMesh.setMatrixAt(idx, _dummy.matrix);
      const t = 0.6 + rand() * 0.4;
      _color.setRGB(pal.fernRgb[0] * t, pal.fernRgb[1] * t, pal.fernRgb[2] * t);
      fernMesh.setColorAt(idx, _color);
    });
    fernMesh.computeBoundingSphere();
    this.environmentGroup.add(fernMesh);

    // 8. Atmospheric Drifting Mist & Subtle Volumetric Sun-Shafts
    const mistGeo = new THREE.PlaneGeometry(14, 14);
    mistGeo.rotateX(-Math.PI / 2);
    layout.mistLocations.forEach((m, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.mistTex,
        color: m.isMonolith ? pal.mistMonolithColor : pal.mistColor,
        transparent: true,
        opacity: m.op,
        depthWrite: false,
      });
      const plane = new THREE.Mesh(mistGeo.clone(), mat);
      plane.position.set(m.x, 0.28 + idx * 0.05, m.z);
      plane.renderOrder = 2;
      this.environmentGroup.add(plane);
      this.mistMeshes.push({ mesh: plane, baseX: m.x, baseZ: m.z, speed: m.sp, phase: idx * 1.4 });
    });
    mistGeo.dispose();

    const shaftGeo = new THREE.ConeGeometry(5.5, 22, 16, 1, true);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: pal.sunShaftColor,
      transparent: true,
      opacity: 0.038,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const pt of [
      { x: layout.detinets.x + 2, z: layout.detinets.z - 1 },
      { x: layout.kapishche.x, z: layout.kapishche.z + 1 },
    ]) {
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set(pt.x + 4, 8.5, pt.z + 3);
      shaft.rotation.set(0.32, 0, 0.38);
      shaft.renderOrder = 3;
      this.environmentGroup.add(shaft);
      this.sunShafts.push(shaft);
    }

    // 9. Distant Craggy Mountain Ridge framing horizon with snow/ember altitude gradient
    const mountainGeo = new THREE.ConeGeometry(8.5, 19, 6);
    const mPos = mountainGeo.attributes.position;
    const mCols = new Float32Array(mPos.count * 3);
    for (let i = 0; i < mPos.count; i++) {
      const hNorm = Math.max(0, (mPos.getY(i) + 9.5) / 19);
      if (chapter === 2) {
        const cap = Math.max(0, (hNorm - 0.42) / 0.58);
        mCols[i * 3] = 0.55 + cap * 0.45;
        mCols[i * 3 + 1] = 0.62 + cap * 0.38;
        mCols[i * 3 + 2] = 0.72 + cap * 0.28;
      } else if (chapter === 3) {
        const emberBase = Math.max(0, 1 - hNorm * 1.9);
        mCols[i * 3] = 0.72 + emberBase * 0.5;
        mCols[i * 3 + 1] = 0.55 + emberBase * 0.14;
        mCols[i * 3 + 2] = 0.55;
      } else {
        const frost = Math.max(0, (hNorm - 0.62) / 0.38);
        mCols[i * 3] = 0.58 + frost * 0.34;
        mCols[i * 3 + 1] = 0.62 + frost * 0.32;
        mCols[i * 3 + 2] = 0.68 + frost * 0.3;
      }
    }
    mountainGeo.setAttribute('color', new THREE.BufferAttribute(mCols, 3));
    const mountainMat = new THREE.MeshStandardMaterial({
      color: pal.mountainColor,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      envMapIntensity: 0.22,
    });
    const peakCount = 22;
    const mountainInst = new THREE.InstancedMesh(mountainGeo, mountainMat, peakCount);
    for (let i = 0; i < peakCount; i++) {
      const a = (i / peakCount) * Math.PI * 2 + 0.12 + chapter * 0.2;
      const dist = 59 + (i % 3) * 5;
      const sc = 0.8 + ((i * 7) % 5) * 0.22;
      _dummy.position.set(Math.cos(a) * dist, 5.2 * sc, Math.sin(a) * dist);
      _dummy.rotation.set(0, a * 1.7, 0);
      _dummy.scale.set(sc * 1.45, sc, sc * 1.2);
      _dummy.updateMatrix();
      mountainInst.setMatrixAt(i, _dummy.matrix);
    }
    mountainInst.computeBoundingSphere();
    this.environmentGroup.add(mountainInst);

    // 10. Sacred Slavic Zbruch Totems, Runic Stone Arch & Campfires
    for (const ts of layout.totemSpots) {
      const totem = buildSlavicTotemProp(this.palette);
      totem.position.set(ts.x, groundHeightAt(ts.x, ts.z, chapter), ts.z);
      totem.rotation.y = ts.ry;
      this.environmentGroup.add(totem);
    }

    const arch = buildRunicArchProp(this.palette);
    arch.position.set(layout.archSpot.x, groundHeightAt(layout.archSpot.x, layout.archSpot.z, chapter), layout.archSpot.z);
    arch.rotation.y = layout.archSpot.ry;
    this.environmentGroup.add(arch);

    for (const cs of layout.campfireSpots) {
      const cf = buildCampfireProp(this.palette);
      cf.group.position.set(cs.x, groundHeightAt(cs.x, cs.z, chapter), cs.z);
      this.environmentGroup.add(cf.group);
      this.campfireFlames.push({ flame: cf.flame, phase: cs.phase });
    }

    // 11. Circling Dark Forest Ravens over the Wilds
    const ravenBodyGeo = new THREE.ConeGeometry(0.11, 0.48, 5);
    ravenBodyGeo.rotateX(Math.PI / 2);
    const wingGeo = new THREE.BoxGeometry(0.42, 0.02, 0.18);
    for (const rc of layout.ravenCenters) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(ravenBodyGeo, this.palette.obsidian);
      group.add(body);
      const leftWing = new THREE.Mesh(wingGeo, this.palette.obsidian);
      leftWing.position.set(-0.21, 0.02, 0);
      group.add(leftWing);
      const rightWing = new THREE.Mesh(wingGeo, this.palette.obsidian);
      rightWing.position.set(0.21, 0.02, 0);
      group.add(rightWing);
      this.environmentGroup.add(group);
      this.ravens.push({ group, leftWing, rightWing, ...rc });
    }

    const showDetails = this.settings.graphics !== 'low';
    for (const s of this.sunShafts) s.visible = showDetails;
    for (const m of this.mistMeshes) m.mesh.visible = showDetails;
    for (const rv of this.ravens) rv.group.visible = showDetails;
  }

  private buildFogOverlay(): void {
    const span = MAP_HALF_SIZE * 2;
    const fogGeo = new THREE.PlaneGeometry(span, span, 48, 48);
    fogGeo.rotateX(-Math.PI / 2);
    const pos = fogGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const gy = groundHeightAt(vx, vz, 1);
      pos.setY(i, Math.max(-0.18, gy) + 0.35);
    }

    this.fogTexture = new THREE.DataTexture(
      this.fogTexData,
      FOG_GRID_SIZE,
      FOG_GRID_SIZE,
      THREE.RGBAFormat,
    );
    this.fogTexture.magFilter = THREE.LinearFilter;
    this.fogTexture.minFilter = THREE.LinearFilter;
    this.fogTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.fogTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.fogTexture.needsUpdate = true;

    const fogMat = new THREE.MeshBasicMaterial({
      map: this.fogTexture,
      transparent: true,
      depthWrite: false,
    });
    this.fogOverlayMesh = new THREE.Mesh(fogGeo, fogMat);
    this.fogOverlayMesh.renderOrder = 4;
    this.scene.add(this.fogOverlayMesh);
  }

  private buildPlacementGhost(): void {
    this.buildPreviewGroup = new THREE.Group();
    this.buildPreviewGroup.visible = false;

    this.buildPreviewRing = new THREE.Mesh(
      new THREE.RingGeometry(0.84, 1.0, 32),
      new THREE.MeshBasicMaterial({
        color: 0x52f28e,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.buildPreviewRing.rotation.x = -Math.PI / 2;
    this.buildPreviewRing.position.y = 0.08;
    this.buildPreviewGroup.add(this.buildPreviewRing);

    this.buildPreviewBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.9, 2.4, 12),
      new THREE.MeshBasicMaterial({
        color: 0x52f28e,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.buildPreviewBody.position.y = 1.2;
    this.buildPreviewGroup.add(this.buildPreviewBody);
    this.scene.add(this.buildPreviewGroup);
  }

  private buildRallyMarker(): void {
    this.rallyMarkerGroup = new THREE.Group();
    this.rallyMarkerGroup.visible = false;

    this.rallyRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.92, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf2d085,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.rallyRingMesh.rotation.x = -Math.PI / 2;
    this.rallyRingMesh.position.y = 0.07;
    this.rallyMarkerGroup.add(this.rallyRingMesh);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.3, 6), this.palette.timber);
    pole.position.y = 1.15;
    this.rallyMarkerGroup.add(pole);

    this.rallyFlagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.45, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0xf2d085,
        emissive: 0xa86e1c,
        emissiveIntensity: 0.85,
        roughness: 0.35,
      }),
    );
    this.rallyFlagMesh.position.set(0.42, 1.95, 0);
    this.rallyMarkerGroup.add(this.rallyFlagMesh);
    this.scene.add(this.rallyMarkerGroup);
  }

  private updateFogTexture(force = false): void {
    if (this.world.phase === 'title') {
      this.fogOverlayMesh.visible = false;
      return;
    }
    this.fogOverlayMesh.visible = true;
    if (!force && !this.fogDirty && this.fogUpdateAccum < 0.14) {
      return;
    }
    this.fogUpdateAccum = 0;
    this.fogDirty = false;
    const grid = this.world.fogGrid;
    for (let gz = 0; gz < FOG_GRID_SIZE; gz++) {
      const texRow = FOG_GRID_SIZE - 1 - gz;
      for (let gx = 0; gx < FOG_GRID_SIZE; gx++) {
        const val = grid[gz * FOG_GRID_SIZE + gx] ?? 0;
        const off = (texRow * FOG_GRID_SIZE + gx) * 4;
        if (val === 2) {
          this.fogTexData[off] = 0;
          this.fogTexData[off + 1] = 0;
          this.fogTexData[off + 2] = 0;
          this.fogTexData[off + 3] = 0;
        } else if (val === 1) {
          this.fogTexData[off] = 8;
          this.fogTexData[off + 1] = 12;
          this.fogTexData[off + 2] = 18;
          this.fogTexData[off + 3] = 132;
        } else {
          this.fogTexData[off] = 6;
          this.fogTexData[off + 1] = 9;
          this.fogTexData[off + 2] = 13;
          this.fogTexData[off + 3] = 232;
        }
      }
    }
    this.fogTexture.needsUpdate = true;
  }

  private getActiveHeroKind(): 'voivode' | 'vedunya' {
    const primary = this.world.units.find((u) => !u.dead && this.world.selectedUnitIds.includes(u.id));
    if (primary?.kind === 'vedunya') return 'vedunya';
    if (primary?.kind === 'voivode') return 'voivode';
    if (!getHero(this.world) && getHero2(this.world)) return 'vedunya';
    return 'voivode';
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      audioEngine.unlockAndStartMusic();
      this.keysHeld.add(e.code);

      if (this.world.phase !== 'playing') return;

      if (e.ctrlKey || e.metaKey) {
        const slot = e.code === 'Digit1' ? 1 : e.code === 'Digit2' ? 2 : e.code === 'Digit3' ? 3 : null;
        if (slot) {
          e.preventDefault();
          this.handleGroupSlot(slot, true);
          return;
        }
      }

      const kb = this.settings.keyBindings;
      const activeHero = this.getActiveHeroKind();
      if (e.code === kb.heroJump) {
        e.preventDefault();
        this.triggerHeroLeap();
      } else if (e.code === kb.abilityQ) {
        this.triggerAbility(activeHero === 'vedunya' ? 'frost_nova' : 'thunder_clap');
      } else if (e.code === kb.abilityW) {
        this.triggerAbility(activeHero === 'vedunya' ? 'summon_wolf' : 'war_cry');
      } else if (e.code === kb.abilityE) {
        this.triggerAbility(activeHero === 'vedunya' ? 'ancestral_mend' : 'sunfire');
      } else if (e.code === kb.cmdAttack) {
        this.setCommandMode('attack');
      } else if (e.code === kb.cmdMove && !e.shiftKey) {
        this.setCommandMode('move');
      } else if (e.code === kb.cmdStop) {
        this.stopSelected();
      } else if (e.code === kb.selectHero) {
        e.preventDefault();
        this.selectHero();
      } else if (e.code === kb.selectHero2) {
        e.preventDefault();
        this.selectHero2();
      } else if (e.code === kb.selectArmy) {
        if (!this.tryRecallGroup(1)) {
          this.selectAllCombatUnits();
        }
      } else if (e.code === kb.selectBarracks) {
        if (!this.tryRecallGroup(2)) {
          this.selectBuildingByKind('kazarma');
        }
      } else if (e.code === kb.selectStronghold) {
        if (!this.tryRecallGroup(3)) {
          this.selectBuildingByKind('detinets');
        }
      } else if (e.code === 'Escape') {
        if (this.world.commandMode !== 'normal') {
          this.world.commandMode = 'normal';
          this.world.pendingBuildKind = null;
          this.emitHudSnapshot();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
    };

    const onBlur = () => {
      this.keysHeld.clear();
      this.draggingBox = false;
      this.middleDragging = false;
      this.rightDraggingRotate = false;
      this.activeTouches.clear();
      this.onBoxSelectUpdate({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 });
    };

    const onPointerDown = (e: PointerEvent) => {
      audioEngine.unlockAndStartMusic();
      if (this.world.phase === 'title') {
        if (e.button === 0 && this.titleTransitionTimer <= 0) {
          const hero = getHero(this.world);
          if (hero) {
            const hit = this.raycastGround(e.clientX, e.clientY);
            const rect = canvas.getBoundingClientRect();
            _projVec.set(hero.x, groundHeightAt(hero.x, hero.z, this.world.chapter) + 1.1, hero.z);
            _projVec.project(this.camera);
            const screenX = rect.left + ((_projVec.x + 1) / 2) * rect.width;
            const screenY = rect.top + ((-_projVec.y + 1) / 2) * rect.height;
            const nearScreen = Math.hypot(e.clientX - screenX, e.clientY - screenY) <= 78;
            const nearGround = Boolean(hit && Math.hypot(hit.x - hero.x, hit.z - hero.z) <= 2.8);
            if (nearScreen || nearGround) {
              this.titleHeroActionTimer = 1.05;
              const gy = groundHeightAt(hero.x, hero.z, this.world.chapter);
              this.particles.spawnBurst(hero.x, gy + 1.25, hero.z, 22, 0xffbe42, 5.4, 1.05, 1.0, 0.72);
              this.spawnGroundRing(hero.x, hero.z, 0xf2d085, 0.45, 3.8, 0.6);
              audioEngine.playHeroSalute();
            }
          }
        }
        return;
      }
      if (this.world.phase !== 'playing') return;

      if (e.pointerType === 'touch') {
        this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.activeTouches.size === 1) {
          this.touchGestureStart = { x: e.clientX, y: e.clientY, moved: false, pinchDist: 0, wasPinch: false };
          this.lastPointerX = e.clientX;
          this.lastPointerY = e.clientY;
        } else if (this.activeTouches.size === 2) {
          const pts = Array.from(this.activeTouches.values());
          this.touchGestureStart.pinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          this.touchGestureStart.wasPinch = true;
        }
        return;
      }

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        if (e.button === 1 && this.settings.keyBindings.mouseMiddle !== 'rotate_camera') {
          this.executeMouseAction(this.settings.keyBindings.mouseMiddle, e.clientX, e.clientY);
          return;
        }
        this.middleDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        return;
      }

      if (e.button === 0) {
        if (this.world.commandMode === 'build' && this.world.pendingBuildKind) {
          const hit = this.raycastGround(e.clientX, e.clientY);
          if (hit) {
            const res = startBuildingConstruction(
              this.world,
              this.world.selectedUnitIds,
              this.world.pendingBuildKind,
              hit.x,
              hit.z,
            );
            if (res.ok) {
              this.spawnGroundRing(hit.x, hit.z, 0x52f28e, 0.5, BUILDING_STATS[this.world.pendingBuildKind].radius * 1.25, 0.55);
              audioEngine.playOrderAck();
              this.world.commandMode = 'normal';
              this.world.pendingBuildKind = null;
              this.emitHudSnapshot();
            } else {
              this.spawnGroundRing(hit.x, hit.z, 0xff492e, 0.4, 2.0, 0.4);
            }
          }
          return;
        }
        if (this.world.commandMode === 'jump') {
          const hit = this.raycastGround(e.clientX, e.clientY);
          if (hit) {
            this.triggerHeroLeap(hit.x, hit.z);
          }
          this.world.commandMode = 'normal';
          this.emitHudSnapshot();
          return;
        }
        if (this.world.commandMode === 'rally' && this.world.selectedBuildingId) {
          const hit = this.raycastGround(e.clientX, e.clientY);
          if (hit && setBuildingRallyPoint(this.world, this.world.selectedBuildingId, hit.x, hit.z)) {
            this.spawnGroundRing(hit.x, hit.z, 0xf2d085, 0.25, 1.45, 0.48);
            audioEngine.playOrderAck();
          }
          this.world.commandMode = 'normal';
          this.emitHudSnapshot();
          return;
        }
        if (this.world.commandMode === 'attack' || this.world.commandMode === 'move') {
          const hit = this.raycastGround(e.clientX, e.clientY);
          if (hit) {
            issueMoveOrder(
              this.world,
              this.world.selectedUnitIds,
              hit.x,
              hit.z,
              this.world.commandMode === 'attack',
            );
            this.spawnGroundRing(
              hit.x,
              hit.z,
              this.world.commandMode === 'attack' ? 0xe05246 : 0xe8b954,
              0.25,
              1.4,
              0.42,
            );
            audioEngine.playOrderAck();
          }
          this.world.commandMode = 'normal';
          this.emitHudSnapshot();
          return;
        }
        this.draggingBox = true;
        this.boxStartX = e.clientX;
        this.boxStartY = e.clientY;
        this.onBoxSelectUpdate({ active: false, x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
      } else if (e.button === 2) {
        if (this.world.commandMode === 'build') {
          this.world.commandMode = 'normal';
          this.world.pendingBuildKind = null;
          this.emitHudSnapshot();
          return;
        }
        const rightAction = this.settings.keyBindings.mouseRight;
        if (rightAction === 'rotate_camera') {
          this.rightDraggingRotate = true;
          this.lastPointerX = e.clientX;
          this.lastPointerY = e.clientY;
        } else {
          this.executeMouseAction(rightAction, e.clientX, e.clientY);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.world.phase === 'playing' && this.world.commandMode === 'build') {
        const hit = this.raycastGround(e.clientX, e.clientY);
        if (hit) {
          this.hoverWorldX = hit.x;
          this.hoverWorldZ = hit.z;
        }
      }

      if (e.pointerType === 'touch' && this.activeTouches.has(e.pointerId)) {
        this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.activeTouches.size === 2) {
          const pts = Array.from(this.activeTouches.values());
          const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const delta = d - this.touchGestureStart.pinchDist;
          this.touchGestureStart.pinchDist = d;
          this.camDistGoal = THREE.MathUtils.clamp(this.camDistGoal - delta * 0.045, 13, 38);
          return;
        }
        if (this.activeTouches.size === 1 && !this.touchGestureStart.wasPinch) {
          const totalMoved = Math.hypot(e.clientX - this.touchGestureStart.x, e.clientY - this.touchGestureStart.y);
          if (totalMoved > 10) {
            this.touchGestureStart.moved = true;
            const dx = e.clientX - this.lastPointerX;
            const dy = e.clientY - this.lastPointerY;
            const scale = this.camDist * 0.0022;
            const forwardX = -Math.sin(this.camYaw);
            const forwardZ = -Math.cos(this.camYaw);
            const rightX = Math.cos(this.camYaw);
            const rightZ = -Math.sin(this.camYaw);
            this.camGoalX -= (rightX * dx - forwardX * dy) * scale;
            this.camGoalZ -= (rightZ * dx - forwardZ * dy) * scale;
          }
          this.lastPointerX = e.clientX;
          this.lastPointerY = e.clientY;
        }
        return;
      }

      if (this.middleDragging || this.rightDraggingRotate) {
        const dx = e.clientX - this.lastPointerX;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.camYawGoal -= dx * 0.006;
        return;
      }
      if (this.draggingBox) {
        const dist = Math.hypot(e.clientX - this.boxStartX, e.clientY - this.boxStartY);
        this.onBoxSelectUpdate({
          active: dist > 8,
          x1: Math.min(this.boxStartX, e.clientX),
          y1: Math.min(this.boxStartY, e.clientY),
          x2: Math.max(this.boxStartX, e.clientX),
          y2: Math.max(this.boxStartY, e.clientY),
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        this.activeTouches.delete(e.pointerId);
        if (
          this.activeTouches.size === 0 &&
          !this.touchGestureStart.moved &&
          !this.touchGestureStart.wasPinch &&
          this.world.phase === 'playing'
        ) {
          if (this.world.commandMode === 'build' && this.world.pendingBuildKind) {
            const hit = this.raycastGround(e.clientX, e.clientY);
            if (hit) {
              const res = startBuildingConstruction(
                this.world,
                this.world.selectedUnitIds,
                this.world.pendingBuildKind,
                hit.x,
                hit.z,
              );
              if (res.ok) {
                this.spawnGroundRing(hit.x, hit.z, 0x52f28e, 0.5, BUILDING_STATS[this.world.pendingBuildKind].radius * 1.25, 0.55);
                audioEngine.playOrderAck();
                this.world.commandMode = 'normal';
                this.world.pendingBuildKind = null;
                this.emitHudSnapshot();
              } else {
                this.spawnGroundRing(hit.x, hit.z, 0xff492e, 0.4, 2.0, 0.4);
              }
            }
          } else if (this.world.commandMode === 'jump') {
            const hit = this.raycastGround(e.clientX, e.clientY);
            if (hit) this.triggerHeroLeap(hit.x, hit.z);
            this.world.commandMode = 'normal';
            this.emitHudSnapshot();
          } else if (this.world.commandMode === 'rally' && this.world.selectedBuildingId) {
            const hit = this.raycastGround(e.clientX, e.clientY);
            if (hit && setBuildingRallyPoint(this.world, this.world.selectedBuildingId, hit.x, hit.z)) {
              this.spawnGroundRing(hit.x, hit.z, 0xf2d085, 0.25, 1.45, 0.48);
              audioEngine.playOrderAck();
            }
            this.world.commandMode = 'normal';
            this.emitHudSnapshot();
          } else if (this.world.commandMode === 'attack' || this.world.commandMode === 'move') {
            const hit = this.raycastGround(e.clientX, e.clientY);
            if (hit) {
              issueMoveOrder(
                this.world,
                this.world.selectedUnitIds,
                hit.x,
                hit.z,
                this.world.commandMode === 'attack',
              );
              this.spawnGroundRing(hit.x, hit.z, this.world.commandMode === 'attack' ? 0xe05246 : 0xe8b954, 0.25, 1.4, 0.42);
              audioEngine.playOrderAck();
            }
            this.world.commandMode = 'normal';
            this.emitHudSnapshot();
          } else if (this.touchMode === 'jump') {
            const hit = this.raycastGround(e.clientX, e.clientY);
            if (hit) this.triggerHeroLeap(hit.x, hit.z);
          } else if (this.touchMode === 'order') {
            this.handleRightClickOrder(e.clientX, e.clientY);
          } else {
            this.handleLeftClickSelect(e.clientX, e.clientY, false);
          }
        }
        return;
      }

      if (this.middleDragging || this.rightDraggingRotate) {
        this.middleDragging = false;
        this.rightDraggingRotate = false;
        return;
      }
      if (!this.draggingBox || e.button !== 0) return;
      this.draggingBox = false;
      const dragDist = Math.hypot(e.clientX - this.boxStartX, e.clientY - this.boxStartY);
      this.onBoxSelectUpdate({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 });

      if (dragDist > 8) {
        this.selectUnitsInBox(
          Math.min(this.boxStartX, e.clientX),
          Math.min(this.boxStartY, e.clientY),
          Math.max(this.boxStartX, e.clientX),
          Math.max(this.boxStartY, e.clientY),
        );
      } else {
        this.handleLeftClickSelect(e.clientX, e.clientY, e.shiftKey);
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onWheel = (e: WheelEvent) => {
      if (this.world.phase !== 'playing') return;
      e.preventDefault();
      this.camDistGoal = THREE.MathUtils.clamp(this.camDistGoal + e.deltaY * 0.015, 13, 38);
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer?.setSize(w, h);
      this.bloomPass?.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    this.cleanupListeners = () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  private executeMouseAction(action: MouseAction, clientX: number, clientY: number): void {
    if (action === 'hero_jump') {
      const hit = this.raycastGround(clientX, clientY);
      if (hit) {
        this.triggerHeroLeap(hit.x, hit.z);
      } else {
        this.triggerHeroLeap();
      }
    } else if (action === 'order') {
      this.handleRightClickOrder(clientX, clientY);
    } else if (action === 'thunder_clap') {
      this.triggerAbility('thunder_clap');
    }
  }

  private cleanupListeners: () => void = () => {};

  private raycastGround(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_ndc, this.camera);
    const hits = _raycaster.intersectObject(this.terrainMesh, false);
    if (hits.length > 0) return hits[0].point;
    return null;
  }

  private handleLeftClickSelect(clientX: number, clientY: number, additive: boolean): void {
    const pt = this.raycastGround(clientX, clientY);
    if (!pt) return;

    let bestUnitId: string | null = null;
    let bestUnitDist = 1.9;
    for (const u of this.world.units) {
      if (u.dead) continue;
      const d = Math.hypot(u.x - pt.x, u.z - pt.z);
      if (d < bestUnitDist + UNIT_STATS[u.kind].radius * 0.4) {
        bestUnitDist = d;
        bestUnitId = u.id;
      }
    }

    if (bestUnitId) {
      const unit = this.world.units.find((u) => u.id === bestUnitId)!;
      if (unit.faction === 'player') {
        const nowMs = performance.now();
        const isDoubleClick =
          !additive && nowMs - this.lastLeftClickMs <= 360 && this.lastLeftClickKind === unit.kind;
        this.lastLeftClickMs = nowMs;
        this.lastLeftClickKind = unit.kind;

        if (isDoubleClick) {
          this.world.selectedUnitIds = this.world.units
            .filter((u) => !u.dead && u.faction === 'player' && u.kind === unit.kind)
            .map((u) => u.id);
        } else if (additive) {
          if (!this.world.selectedUnitIds.includes(bestUnitId)) {
            this.world.selectedUnitIds = [...this.world.selectedUnitIds, bestUnitId];
          }
        } else {
          this.world.selectedUnitIds = [bestUnitId];
        }
        this.world.selectedBuildingId = null;
      } else {
        this.lastLeftClickKind = null;
        this.world.selectedUnitIds = [bestUnitId];
        this.world.selectedBuildingId = null;
      }
      this.emitHudSnapshot();
      return;
    }

    this.lastLeftClickKind = null;

    let bestBldId: string | null = null;
    let bestBldDist = 3.6;
    for (const b of this.world.buildings) {
      if (b.dead) continue;
      const d = Math.hypot(b.x - pt.x, b.z - pt.z);
      if (d <= b.radius + 0.8 && d < bestBldDist) {
        bestBldDist = d;
        bestBldId = b.id;
      }
    }

    if (bestBldId) {
      this.world.selectedBuildingId = bestBldId;
      this.world.selectedUnitIds = [];
      this.emitHudSnapshot();
    }
  }

  private selectUnitsInBox(x1: number, y1: number, x2: number, y2: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const picked: string[] = [];
    for (const u of this.world.units) {
      if (u.dead || u.faction !== 'player') continue;
      _projVec.set(u.x, groundHeightAt(u.x, u.z, this.world.chapter) + 0.9, u.z);
      _projVec.project(this.camera);
      if (_projVec.z < -1 || _projVec.z > 1) continue;
      const sx = rect.left + ((_projVec.x + 1) / 2) * rect.width;
      const sy = rect.top + ((-_projVec.y + 1) / 2) * rect.height;
      if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
        picked.push(u.id);
      }
    }
    if (picked.length > 0) {
      this.world.selectedUnitIds = picked;
      this.world.selectedBuildingId = null;
      this.emitHudSnapshot();
    }
  }

  private handleRightClickOrder(clientX: number, clientY: number): void {
    const pt = this.raycastGround(clientX, clientY);
    if (!pt) return;

    if (this.world.selectedBuildingId) {
      if (setBuildingRallyPoint(this.world, this.world.selectedBuildingId, pt.x, pt.z)) {
        const b = this.world.buildings.find((item) => item.id === this.world.selectedBuildingId);
        if (b && b.rallyX !== undefined && b.rallyZ !== undefined) {
          this.spawnGroundRing(b.rallyX, b.rallyZ, 0xf2d085, 0.25, 1.35, 0.45);
        }
        audioEngine.playOrderAck();
        this.emitHudSnapshot();
        return;
      }
    }

    if (this.world.selectedUnitIds.length === 0) return;

    const enemyUnit = this.world.units.find(
      (u) => !u.dead && u.faction === 'nav' && Math.hypot(u.x - pt.x, u.z - pt.z) <= UNIT_STATS[u.kind].radius + 1.25,
    );
    if (enemyUnit) {
      issueAttackOrder(this.world, this.world.selectedUnitIds, enemyUnit.id);
      this.spawnGroundRing(enemyUnit.x, enemyUnit.z, 0xe04f4f, 0.3, 1.5, 0.45);
      audioEngine.playOrderAck();
      return;
    }

    const enemyBld = this.world.buildings.find(
      (b) => !b.dead && b.faction === 'nav' && Math.hypot(b.x - pt.x, b.z - pt.z) <= b.radius + 1.2,
    );
    if (enemyBld) {
      issueAttackOrder(this.world, this.world.selectedUnitIds, enemyBld.id);
      this.spawnGroundRing(enemyBld.x, enemyBld.z, 0xe04f4f, 0.5, 2.4, 0.5);
      audioEngine.playOrderAck();
      return;
    }

    const unfinishedBld = this.world.buildings.find(
      (b) =>
        !b.dead &&
        b.faction === 'player' &&
        b.underConstruction &&
        Math.hypot(b.x - pt.x, b.z - pt.z) <= b.radius + 1.1,
    );
    if (
      unfinishedBld &&
      this.world.units.some((u) => this.world.selectedUnitIds.includes(u.id) && u.kind === 'kholop')
    ) {
      issueBuildOrder(this.world, this.world.selectedUnitIds, unfinishedBld.id);
      this.spawnGroundRing(unfinishedBld.x, unfinishedBld.z, 0x52f28e, 0.35, 1.8, 0.45);
      audioEngine.playOrderAck();
      return;
    }

    const node = this.world.resources.find(
      (r) => r.remaining > 0 && Math.hypot(r.x - pt.x, r.z - pt.z) <= r.radius + 1.2,
    );
    if (node && this.world.units.some((u) => this.world.selectedUnitIds.includes(u.id) && u.kind === 'kholop')) {
      issueGatherOrder(this.world, this.world.selectedUnitIds, node.id);
      this.spawnGroundRing(node.x, node.z, 0xf2c94c, 0.35, 1.8, 0.45);
      audioEngine.playOrderAck();
      return;
    }

    const relicDrop = this.world.relicDrops.find(
      (d) =>
        Math.hypot(d.x - pt.x, d.z - pt.z) <= 1.85 &&
        (this.world.phase === 'title' || getFogStateAt(this.world, d.x, d.z) >= 1),
    );
    if (
      relicDrop &&
      this.world.units.some((u) => this.world.selectedUnitIds.includes(u.id) && UNIT_STATS[u.kind].isHero)
    ) {
      issueMoveOrder(this.world, this.world.selectedUnitIds, relicDrop.x, relicDrop.z, false);
      this.spawnGroundRing(relicDrop.x, relicDrop.z, 0xf2d085, 0.3, 1.5, 0.45);
      audioEngine.playOrderAck();
      return;
    }

    issueMoveOrder(this.world, this.world.selectedUnitIds, pt.x, pt.z, false);
    this.spawnGroundRing(pt.x, pt.z, 0x56b858, 0.2, 1.25, 0.4);
    audioEngine.playOrderAck();
  }

  private spawnGroundRing(
    x: number,
    z: number,
    colorHex: number,
    startScale: number,
    endScale: number,
    maxLife: number,
  ): void {
    const mesh = new THREE.Mesh(
      this.sharedRingGeom,
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, groundHeightAt(x, z, this.world.chapter) + 0.04, z);
    mesh.scale.setScalar(startScale);
    this.scene.add(mesh);
    this.ringFxList.push({ mesh, life: maxLife, maxLife, startScale, endScale });
  }

  private syncMeshesToWorld(): void {
    const ch = this.world.chapter ?? 1;
    const activeUnitIds = new Set<string>();
    for (const u of this.world.units) {
      activeUnitIds.add(u.id);
      let rig = this.unitRigs.get(u.id);
      if (!rig) {
        rig = buildUnitRig(u.kind, this.palette, this.textures);
        this.scene.add(rig.root);
        this.unitRigs.set(u.id, rig);
      }

      const gy = groundHeightAt(u.x, u.z, ch);
      rig.root.position.set(u.x, gy + u.y, u.z);
      rig.root.rotation.y = u.facing;

      const isVisibleInFog =
        this.world.phase === 'title' ||
        u.faction === 'player' ||
        getFogStateAt(this.world, u.x, u.z) === 2;
      rig.root.visible = isVisibleInFog;
      if (!isVisibleInFog) continue;

      if (rig.shadowDisc) {
        rig.shadowDisc.position.y = 0.03 - u.y;
        const airScale = Math.max(0.45, 1 - u.y * 0.16);
        rig.shadowDisc.scale.setScalar(airScale);
      }

      if (u.kind === 'leshy') {
        const bPhase = u.bossPhase ?? 1;
        rig.root.scale.setScalar(bPhase === 3 ? 1.18 : bPhase === 2 ? 1.08 : 1.0);
      } else {
        rig.root.scale.setScalar(1.0);
      }

      if (u.dead) {
        const koRatio = 1 - u.koTimer / 0.42;
        rig.bodyGroup.rotation.x = koRatio * (Math.PI * 0.48);
        rig.bodyGroup.position.y = -koRatio * 0.35;
        rig.selectionRing.visible = false;
        rig.hpBg.visible = false;
        rig.hpFill.visible = false;
      } else {
        const isTitleHeroSalute = this.world.phase === 'title' && u.kind === 'voivode' && this.titleHeroActionTimer > 0;
        const moving = Math.hypot(u.vx, u.vz) > 0.25;
        const bob = moving ? Math.abs(Math.sin(u.stridePhase)) * 0.09 : Math.sin(this.world.elapsed * 2.2 + u.stridePhase) * 0.025;
        rig.bodyGroup.position.y = u.kind === 'likho' ? 0.22 + Math.sin(this.world.elapsed * 3.1) * 0.12 : bob;
        rig.bodyGroup.rotation.x = isTitleHeroSalute ? -0.1 : u.jumpTime > 0 ? 0.26 : moving ? 0.08 : 0;

        if (isTitleHeroSalute) {
          const swing = Math.sin((1.05 - this.titleHeroActionTimer) * 9.0);
          rig.rightArm.rotation.x = -1.65 + swing * 0.55;
          rig.leftArm.rotation.x = -0.85 + Math.cos(this.titleHeroActionTimer * 6) * 0.2;
        } else if (u.jumpTime > 0) {
          rig.rightArm.rotation.x = -0.95;
          rig.leftArm.rotation.x = -0.75;
        } else if (u.windupTimer > 0) {
          rig.rightArm.rotation.x = -1.15;
          rig.leftArm.rotation.x = 0.25;
        } else if (u.attackTimer > UNIT_STATS[u.kind].attackCooldown * 0.72) {
          rig.rightArm.rotation.x = 0.95;
          rig.leftArm.rotation.x = -0.2;
        } else if (moving) {
          rig.rightArm.rotation.x = Math.sin(u.stridePhase) * 0.45;
          rig.leftArm.rotation.x = -Math.sin(u.stridePhase) * 0.35;
        } else {
          rig.rightArm.rotation.x = Math.sin(this.world.elapsed * 1.4 + u.stridePhase) * 0.04;
          rig.leftArm.rotation.x = -Math.sin(this.world.elapsed * 1.4 + u.stridePhase) * 0.04;
        }

        if (rig.headGroup && !moving && u.windupTimer <= 0) {
          rig.headGroup.rotation.y = Math.sin(this.world.elapsed * 0.9 + u.stridePhase) * 0.18;
        } else if (rig.headGroup) {
          rig.headGroup.rotation.y = 0;
        }

        if (rig.cloakMesh) {
          const speedBillow = u.jumpTime > 0 ? 0.42 : moving ? 0.24 : 0.05;
          rig.cloakMesh.rotation.x = speedBillow + Math.sin(this.world.elapsed * 4.5 + u.stridePhase) * 0.07;
        }

        if (rig.carryMesh) {
          if (u.order.type === 'gather' && u.order.returning && u.order.carrying) {
            rig.carryMesh.visible = true;
            rig.carryMesh.material = u.order.carrying === 'gold' ? this.palette.gold : this.palette.timber;
          } else {
            rig.carryMesh.visible = false;
          }
        }

        rig.selectionRing.visible = this.world.selectedUnitIds.includes(u.id);
        rig.buffRing.visible = u.buffTimer > 0 || (u.kind === 'leshy' && (u.bossPhase ?? 1) >= 2);
        if (rig.buffRing.visible) {
          rig.buffRing.rotation.z = this.world.elapsed * (u.kind === 'leshy' ? 2.6 : 1.8);
        }

        const flashScale = u.hitFlashTimer > 0 ? 1.09 : isTitleHeroSalute ? 1.05 : 1;
        if (u.jumpTime > 0) {
          rig.bodyGroup.scale.set(0.92 * flashScale, 1.12 * flashScale, 0.92 * flashScale);
        } else if (u.landSquashTimer > 0) {
          const sq = u.landSquashTimer / 0.24;
          rig.bodyGroup.scale.set((1 + 0.16 * sq) * flashScale, (1 - 0.14 * sq) * flashScale, (1 + 0.16 * sq) * flashScale);
        } else {
          rig.bodyGroup.scale.setScalar(flashScale);
        }

        const hpRatio = Math.max(0.01, u.hp / u.maxHp);
        rig.hpBg.visible = this.world.phase === 'playing';
        rig.hpFill.visible = this.world.phase === 'playing';
        rig.hpBg.quaternion.copy(this.camera.quaternion);
        rig.hpFill.quaternion.copy(this.camera.quaternion);
        rig.hpFill.scale.x = hpRatio;
        const barW = (rig.hpBg.geometry as THREE.PlaneGeometry).parameters.width;
        rig.hpFill.position.x = -(1 - hpRatio) * (barW * 0.48);
      }
    }

    for (const [id, rig] of this.unitRigs.entries()) {
      if (!activeUnitIds.has(id)) {
        this.scene.remove(rig.root);
        this.unitRigs.delete(id);
      }
    }

    for (const b of this.world.buildings) {
      let rig = this.buildingRigs.get(b.id);
      if (!rig) {
        rig = buildBuildingMesh(b.kind, this.palette, this.textures);
        rig.root.position.set(b.x, groundHeightAt(b.x, b.z, ch), b.z);
        this.scene.add(rig.root);
        this.buildingRigs.set(b.id, rig);
      }

      const bldDiscovered =
        this.world.phase === 'title' ||
        b.faction === 'player' ||
        getFogStateAt(this.world, b.x, b.z) >= 1;
      rig.root.visible = !b.dead && bldDiscovered;
      if (b.dead || !bldDiscovered) continue;

      rig.scaffoldGroup.visible = Boolean(b.underConstruction);
      const buildRatio = b.underConstruction ? Math.max(0.08, b.buildProgress ?? 0.1) : 1;
      rig.structureGroup.scale.set(1, 0.22 + 0.78 * buildRatio, 1);

      rig.selectionRing.visible = this.world.selectedBuildingId === b.id;
      const hpRatio = Math.max(0.01, b.hp / b.maxHp);
      rig.hpBg.visible =
        b.faction !== 'neutral' &&
        this.world.phase === 'playing' &&
        (b.hp < b.maxHp || Boolean(b.underConstruction) || rig.selectionRing.visible);
      rig.hpFill.visible = rig.hpBg.visible;
      rig.hpBg.quaternion.copy(this.camera.quaternion);
      rig.hpFill.quaternion.copy(this.camera.quaternion);
      rig.hpFill.scale.x = hpRatio;

      if (rig.flameMesh) {
        rig.flameMesh.visible = !b.underConstruction;
        rig.flameMesh.rotation.y = this.world.elapsed * 1.8;
        const pulseY = 0.92 + Math.sin(this.world.elapsed * 9.5 + b.x) * 0.18;
        const pulseXZ = 0.94 + Math.cos(this.world.elapsed * 7.2 + b.z) * 0.08;
        rig.flameMesh.scale.set(pulseXZ, pulseY, pulseXZ);
      }
      if (rig.orbitShards) {
        const baseOrbitY = b.kind === 'fountain' ? 2.5 : 4.55;
        rig.orbitShards.rotation.y = this.world.elapsed * 0.9;
        rig.orbitShards.position.y = baseOrbitY + Math.sin(this.world.elapsed * 2.1) * 0.22;
      }
    }

    for (const r of this.world.resources) {
      let mesh = this.resourceMeshes.get(r.id);
      if (!mesh) {
        mesh = buildResourceMesh(r.kind, this.palette, this.textures);
        mesh.position.set(r.x, groundHeightAt(r.x, r.z, ch), r.z);
        this.scene.add(mesh);
        this.resourceMeshes.set(r.id, mesh);
      }
      mesh.visible =
        r.remaining > 0 &&
        (this.world.phase === 'title' || getFogStateAt(this.world, r.x, r.z) >= 1);
    }

    const activeRelicIds = new Set<string>();
    for (const d of this.world.relicDrops) {
      activeRelicIds.add(d.id);
      let mesh = this.relicMeshes.get(d.id);
      if (!mesh) {
        mesh = buildRelicMesh(d.relicId, this.palette);
        mesh.position.set(d.x, groundHeightAt(d.x, d.z, ch), d.z);
        this.scene.add(mesh);
        this.relicMeshes.set(d.id, mesh);
      }
      mesh.visible = this.world.phase === 'title' || getFogStateAt(this.world, d.x, d.z) >= 1;
      if (mesh.visible) {
        const gem = mesh.getObjectByName('relic_gem');
        if (gem) {
          gem.rotation.y = this.world.elapsed * 2.1;
          gem.position.y = 0.92 + Math.sin(this.world.elapsed * 3.2 + d.x) * 0.12;
        }
      }
    }
    for (const [id, mesh] of this.relicMeshes.entries()) {
      if (!activeRelicIds.has(id)) {
        this.scene.remove(mesh);
        this.relicMeshes.delete(id);
      }
    }

    const activeProjIds = new Set<string>();
    for (const p of this.world.projectiles) {
      activeProjIds.add(p.id);
      let mesh = this.projectileMeshes.get(p.id);
      if (!mesh) {
        const isArrow = p.style === 'arrow' || p.style === 'tower';
        const isBolt = p.style === 'bolt';
        mesh = new THREE.Mesh(
          isBolt ? this.boltGeom : isArrow ? this.arrowGeom : this.orbGeom,
          isBolt
            ? this.boltMat
            : isArrow
              ? this.arrowMat
              : p.style === 'spirit'
                ? this.spiritMat
                : p.style === 'frost'
                  ? this.frostMat
                  : this.bogMat,
        );
        this.scene.add(mesh);
        this.projectileMeshes.set(p.id, mesh);
      }
      const py = groundHeightAt(p.x, p.z, ch) + p.y;
      mesh.position.set(p.x, py, p.z);
      if (p.style === 'arrow' || p.style === 'tower' || p.style === 'bolt') {
        mesh.lookAt(p.targetX, groundHeightAt(p.targetX, p.targetZ, ch) + 0.8, p.targetZ);
        mesh.rotateX(Math.PI / 2);
      } else {
        mesh.rotation.y += 0.2;
      }
    }
    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!activeProjIds.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }

    const boss = this.world.units.find(
      (u) => !u.dead && u.kind === 'leshy' && u.bossTelegraphTimer > 0 && getFogStateAt(this.world, u.x, u.z) === 2,
    );
    if (boss) {
      this.bossTelegraphMesh.visible = true;
      this.bossTelegraphMesh.position.set(
        boss.bossTelegraphX,
        groundHeightAt(boss.bossTelegraphX, boss.bossTelegraphZ, ch) + 0.06,
        boss.bossTelegraphZ,
      );
      const t = 1 - boss.bossTelegraphTimer / 0.72;
      this.bossTelegraphMesh.scale.setScalar(0.35 + t * 0.65);
    } else {
      this.bossTelegraphMesh.visible = false;
    }

    if (this.world.phase === 'playing' && this.world.commandMode === 'build' && this.world.pendingBuildKind) {
      const kind = this.world.pendingBuildKind;
      const rad = BUILDING_STATS[kind].radius;
      const canPlace = canPlaceBuilding(this.world, kind, this.hoverWorldX, this.hoverWorldZ).ok;
      const colHex = canPlace ? 0x52f28e : 0xff492e;
      this.buildPreviewGroup.visible = true;
      this.buildPreviewGroup.position.set(
        this.hoverWorldX,
        groundHeightAt(this.hoverWorldX, this.hoverWorldZ, ch),
        this.hoverWorldZ,
      );
      this.buildPreviewRing.scale.setScalar(rad);
      this.buildPreviewBody.scale.set(rad, 1, rad);
      (this.buildPreviewRing.material as THREE.MeshBasicMaterial).color.setHex(colHex);
      (this.buildPreviewBody.material as THREE.MeshBasicMaterial).color.setHex(colHex);
    } else {
      this.buildPreviewGroup.visible = false;
    }

    const rallyBld =
      this.world.phase === 'playing' && this.world.selectedBuildingId
        ? this.world.buildings.find(
            (b) =>
              b.id === this.world.selectedBuildingId &&
              !b.dead &&
              b.faction === 'player' &&
              !b.underConstruction &&
              (b.kind === 'detinets' || b.kind === 'kazarma' || b.kind === 'kapishche'),
          )
        : undefined;
    if (rallyBld && rallyBld.rallyX !== undefined && rallyBld.rallyZ !== undefined) {
      this.rallyMarkerGroup.visible = true;
      this.rallyMarkerGroup.position.set(
        rallyBld.rallyX,
        groundHeightAt(rallyBld.rallyX, rallyBld.rallyZ, ch),
        rallyBld.rallyZ,
      );
    } else {
      this.rallyMarkerGroup.visible = false;
    }

    this.updateFogTexture();
  }

  private processWorldEvents(): void {
    const ch = this.world.chapter ?? 1;
    for (const ev of this.world.events) {
      const gy = groundHeightAt(ev.x, ev.z, ch);
      if (ev.type === 'hit') {
        this.particles.spawnBurst(ev.x, gy + 1.0, ev.z, 5, ev.faction === 'nav' ? 0x56f092 : 0xff7b47, 3.2, 0.75, 7, 0.42);
        audioEngine.playHit(false);
      } else if (ev.type === 'heavy_hit') {
        this.particles.spawnBurst(ev.x, gy + 1.1, ev.z, 14, 0xffb347, 4.8, 1.0, 6.5, 0.55);
        audioEngine.playHit(true);
      } else if (ev.type === 'kill') {
        this.particles.spawnBurst(ev.x, gy + 1.0, ev.z, 22, ev.faction === 'nav' ? 0x45e68b : 0xd9483b, 5.5, 1.25, 5.5, 0.75);
        audioEngine.playHit(true);
      } else if (ev.type === 'thunder_clap') {
        this.particles.spawnBurst(ev.x, gy + 0.7, ev.z, 28, 0x7de2f4, 8.2, 1.35, 3.5, 0.7);
        this.spawnGroundRing(ev.x, ev.z, 0x7de2f4, 0.5, 6.8, 0.55);
        audioEngine.playThunderClap();
      } else if (ev.type === 'war_cry') {
        this.particles.spawnBurst(ev.x, gy + 1.2, ev.z, 20, 0xffbe42, 6.2, 1.15, -0.5, 0.85);
        this.spawnGroundRing(ev.x, ev.z, 0xffbe42, 0.6, 8.5, 0.65);
        audioEngine.playWarHorn();
      } else if (ev.type === 'sunfire') {
        this.particles.spawnBurst(ev.x, gy + 1.0, ev.z, 24, 0xff8533, 5.8, 1.1, 1.2, 0.75);
        this.spawnGroundRing(ev.x, ev.z, 0xff9b3d, 0.4, 5.5, 0.52);
        audioEngine.playChime(false);
      } else if (ev.type === 'frost_nova') {
        this.particles.spawnBurst(ev.x, gy + 0.8, ev.z, 28, 0x8ae8ff, 7.6, 1.25, 2.0, 0.72);
        this.spawnGroundRing(ev.x, ev.z, 0x8ae8ff, 0.5, 7.4, 0.55);
        audioEngine.playFrostNova();
      } else if (ev.type === 'summon_wolf') {
        this.particles.spawnBurst(ev.x, gy + 0.9, ev.z, 22, 0x67d8ef, 5.4, 1.05, 1.0, 0.7);
        this.spawnGroundRing(ev.x, ev.z, 0x67d8ef, 0.5, 3.6, 0.55);
        audioEngine.playWolfHowl();
      } else if (ev.type === 'ancestral_mend') {
        this.particles.spawnBurst(ev.x, gy + 1.1, ev.z, 24, 0x6ce69c, 5.2, 1.05, -0.8, 0.85);
        this.spawnGroundRing(ev.x, ev.z, 0x6ce69c, 0.5, 7.5, 0.6);
        audioEngine.playChime(true);
      } else if (ev.type === 'build_start') {
        this.particles.spawnBurst(ev.x, gy + 0.4, ev.z, 12, 0xd8a146, 4.0, 0.85, 3.0, 0.5);
        audioEngine.playOrderAck();
      } else if (ev.type === 'build_complete') {
        this.particles.spawnBurst(ev.x, gy + 1.5, ev.z, 26, 0xffdf6b, 5.5, 1.15, 2.0, 0.8);
        this.spawnGroundRing(ev.x, ev.z, 0xf2d085, 0.5, 3.5, 0.65);
        audioEngine.playBuildComplete();
      } else if (ev.type === 'upgrade_complete') {
        this.particles.spawnBurst(ev.x, gy + 1.8, ev.z, 26, 0xf2d085, 5.8, 1.1, 1.5, 0.85);
        this.spawnGroundRing(ev.x, ev.z, 0xf2d085, 0.6, 4.0, 0.7);
        audioEngine.playUpgradeComplete();
      } else if (ev.type === 'relic_pickup') {
        this.particles.spawnBurst(ev.x, gy + 1.0, ev.z, 22, 0x7de2f4, 5.2, 1.05, 1.0, 0.75);
        this.spawnGroundRing(ev.x, ev.z, 0xf2d085, 0.3, 2.4, 0.55);
        audioEngine.playRelicPickup();
      } else if (ev.type === 'relic_use') {
        this.particles.spawnBurst(ev.x, gy + 1.1, ev.z, 24, 0x45e68b, 5.0, 1.0, -0.8, 0.8);
        this.spawnGroundRing(ev.x, ev.z, 0x45e68b, 0.4, 3.2, 0.6);
        audioEngine.playChime(true);
      } else if (ev.type === 'boss_telegraph') {
        audioEngine.playBossTelegraph();
      } else if (ev.type === 'boss_phase') {
        const p: 2 | 3 = ev.intensity === 3 ? 3 : 2;
        audioEngine.playBossPhaseRoar(p);
        this.particles.spawnBurst(
          ev.x,
          gy + 1.5,
          ev.z,
          36,
          p === 3 ? 0xff492e : 0x52f28e,
          8.5,
          1.55,
          4.0,
          0.9,
        );
        this.spawnGroundRing(ev.x, ev.z, p === 3 ? 0xff492e : 0x52f28e, 0.7, 9.5, 0.85);
        this.activeBossPhaseBanner = p;
        this.bossPhaseBannerTimer = 6.0;
      } else if (ev.type === 'boss_slam') {
        this.particles.spawnBurst(ev.x, gy + 0.6, ev.z, 30, 0x52f28e, 7.6, 1.45, 5.0, 0.75);
        this.spawnGroundRing(ev.x, ev.z, 0xff492e, 0.6, (ev.intensity ?? 1) === 3 ? 7.0 : 6.2, 0.55);
        audioEngine.playThunderClap();
      } else if (ev.type === 'arrow_shot') {
        audioEngine.playArrow();
      } else if (ev.type === 'level_up') {
        this.particles.spawnBurst(ev.x, gy + 1.2, ev.z, 24, 0xffdf6b, 4.5, 1.2, -1.2, 1.0);
        this.spawnGroundRing(ev.x, ev.z, 0xffdf6b, 0.4, 3.4, 0.7);
        audioEngine.playChime(true);
      } else if (ev.type === 'hero_jump') {
        this.particles.spawnBurst(ev.x, gy + 0.5, ev.z, 16, 0x9fe4ff, 5.2, 0.9, 2.5, 0.48);
        this.spawnGroundRing(ev.x, ev.z, 0x9fe4ff, 0.35, 2.3, 0.38);
        audioEngine.playJump();
      } else if (ev.type === 'hero_land') {
        this.particles.spawnBurst(ev.x, gy + 0.4, ev.z, 24, 0xffbe55, 6.8, 1.15, 4.2, 0.55);
        this.spawnGroundRing(ev.x, ev.z, 0xffbe55, 0.4, 3.8, 0.48);
        audioEngine.playHit(true);
      } else if (ev.type === 'wave_start') {
        audioEngine.playWarHorn();
      } else if (ev.type === 'deposit') {
        this.particles.spawnMote(ev.x, gy + 2.2, ev.z, 0xf2c94c, 1.05);
      }
    }
  }

  private updateCamera(dt: number, elapsed: number): void {
    const ch = this.world.chapter ?? 1;
    if (this.world.phase === 'title') {
      const layout = getMapLayout(ch);
      const angle = elapsed * 0.12;
      const focusX = layout.detinets.x + 2.5 + Math.cos(angle) * 2.0;
      const focusZ = layout.detinets.z - 2.5 + Math.sin(angle) * 2.0;
      const orbitCamX = focusX + 13.5 + Math.cos(angle) * 4.0;
      const orbitCamZ = focusZ + 12.0 + Math.sin(angle) * 4.0;
      const orbitY = 8.6 + Math.sin(elapsed * 0.3) * 0.65;

      if (this.titleTransitionTimer > 0) {
        const rawT = Math.min(1, Math.max(0, 1 - this.titleTransitionTimer / 0.72));
        const ease = rawT * rawT * (3 - 2 * rawT);
        const targetY = groundHeightAt(layout.cameraHome.x, layout.cameraHome.z, ch);
        const destCamX = layout.cameraHome.x + Math.sin(0.72) * (23.5 * 0.72);
        const destCamY = targetY + 23.5 * 0.78;
        const destCamZ = layout.cameraHome.z + Math.cos(0.72) * (23.5 * 0.72);
        this.camera.position.set(
          THREE.MathUtils.lerp(orbitCamX, destCamX, ease),
          THREE.MathUtils.lerp(orbitY, destCamY, ease),
          THREE.MathUtils.lerp(orbitCamZ, destCamZ, ease),
        );
        this.camera.lookAt(
          THREE.MathUtils.lerp(focusX - 2.6, layout.cameraHome.x, ease),
          THREE.MathUtils.lerp(2.35, targetY + 0.8, ease),
          THREE.MathUtils.lerp(focusZ + 0.6, layout.cameraHome.z, ease),
        );
        return;
      }

      this.camera.position.set(orbitCamX, orbitY, orbitCamZ);
      this.camera.lookAt(focusX - 2.6, 2.35, focusZ + 0.6);
      return;
    }

    const kb = this.settings.keyBindings;
    const panSpeed = 22 * dt;
    const forwardX = -Math.sin(this.camYaw);
    const forwardZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    if (this.keysHeld.has(kb.panUp)) {
      this.camGoalX += forwardX * panSpeed;
      this.camGoalZ += forwardZ * panSpeed;
    }
    if (this.keysHeld.has(kb.panDown)) {
      this.camGoalX -= forwardX * panSpeed;
      this.camGoalZ -= forwardZ * panSpeed;
    }
    if (this.keysHeld.has(kb.panLeft)) {
      this.camGoalX -= rightX * panSpeed;
      this.camGoalZ -= rightZ * panSpeed;
    }
    if (this.keysHeld.has(kb.panRight)) {
      this.camGoalX += rightX * panSpeed;
      this.camGoalZ += rightZ * panSpeed;
    }
    if (this.keysHeld.has(kb.rotateLeft)) {
      this.camYawGoal -= 1.6 * dt;
    }
    if (this.keysHeld.has(kb.rotateRight)) {
      this.camYawGoal += 1.6 * dt;
    }

    this.camGoalX = THREE.MathUtils.clamp(this.camGoalX, -MAP_HALF_SIZE + 4, MAP_HALF_SIZE - 4);
    this.camGoalZ = THREE.MathUtils.clamp(this.camGoalZ, -MAP_HALF_SIZE + 4, MAP_HALF_SIZE - 4);

    this.camTargetX = THREE.MathUtils.damp(this.camTargetX, this.camGoalX, 10, dt);
    this.camTargetZ = THREE.MathUtils.damp(this.camTargetZ, this.camGoalZ, 10, dt);
    this.camDist = THREE.MathUtils.damp(this.camDist, this.camDistGoal, 10, dt);
    this.camYaw = THREE.MathUtils.damp(this.camYaw, this.camYawGoal, 10, dt);

    const shake = this.world.trauma * this.world.trauma * 0.45;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;

    const elev = this.camDist * 0.78;
    const horiz = this.camDist * 0.72;
    const targetY = groundHeightAt(this.camTargetX, this.camTargetZ, ch);

    this.camera.position.set(
      this.camTargetX + Math.sin(this.camYaw) * horiz + shakeX,
      targetY + elev + shakeY,
      this.camTargetZ + Math.cos(this.camYaw) * horiz,
    );
    this.camera.lookAt(this.camTargetX, targetY + 0.8, this.camTargetZ);

    this.keyLight.position.set(this.camTargetX + 22, 28, this.camTargetZ + 20);
    this.keyLight.target.position.set(this.camTargetX, 0, this.camTargetZ);
  }

  private updateEffects(dt: number, elapsed: number): void {
    const ch = this.world.chapter ?? 1;
    const layout = getMapLayout(ch);
    const biome = getBiomeForChapter(ch);

    const skyMat = this.skyMesh.material as THREE.ShaderMaterial;
    skyMat.uniforms.uTime.value = elapsed;

    const terrainMat = this.terrainMesh?.material as THREE.MeshStandardMaterial | undefined;
    if (terrainMat?.userData.shader) {
      terrainMat.userData.shader.uniforms.uTime.value = elapsed;
    }

    const waterMat = this.waterMesh.material as THREE.MeshPhysicalMaterial;
    if (waterMat.userData.shader) {
      waterMat.userData.shader.uniforms.uTime.value = elapsed;
    }
    for (const fm of this.foliageMaterials) {
      if (fm.userData.shader) {
        fm.userData.shader.uniforms.uTime.value = elapsed;
      }
    }

    if (this.rallyMarkerGroup.visible) {
      this.rallyRingMesh.rotation.z = elapsed * 1.4;
      const pulse = 0.92 + Math.sin(elapsed * 4.5) * 0.1;
      this.rallyRingMesh.scale.setScalar(pulse);
      this.rallyFlagMesh.rotation.y = Math.sin(elapsed * 4.8) * 0.25;
    }

    for (const fl of this.fireLights) {
      const flicker = Math.sin(elapsed * 9.5 + fl.phase) * 0.1 + Math.sin(elapsed * 16.3 + fl.phase) * 0.06;
      fl.light.intensity = fl.baseIntensity * (1 + flicker);
    }

    for (const m of this.mistMeshes) {
      m.mesh.position.x = m.baseX + Math.sin(elapsed * 0.25 + m.phase) * 2.2 * m.speed;
      m.mesh.position.z = m.baseZ + Math.cos(elapsed * 0.22 + m.phase) * 1.8 * m.speed;
      m.mesh.rotation.y = elapsed * 0.04 * m.speed;
    }

    for (const cf of this.campfireFlames) {
      cf.flame.rotation.y = elapsed * 2.4 + cf.phase;
      const py = 0.85 + Math.sin(elapsed * 11 + cf.phase) * 0.18;
      const px = 0.92 + Math.cos(elapsed * 8.4 + cf.phase) * 0.08;
      cf.flame.scale.set(px, py, px);
    }

    const hero = getHero(this.world);
    if (hero && this.settings.graphics !== 'low') {
      const gy = groundHeightAt(hero.x, hero.z, ch);
      const baseHeroInt = this.settings.graphics === 'cinematic' ? 18 : this.settings.graphics === 'high' ? 13 : 8;
      this.heroLight.intensity = baseHeroInt * (0.9 + Math.sin(elapsed * 11.2) * 0.1);
      this.heroLight.position.set(hero.x, gy + hero.y + 1.85, hero.z);
    } else {
      this.heroLight.intensity = 0;
    }

    if (this.settings.graphics !== 'low') {
      for (const rv of this.ravens) {
        const a = elapsed * rv.speed + rv.phase;
        const x = rv.cx + Math.cos(a) * rv.radius;
        const z = rv.cz + Math.sin(a) * rv.radius;
        const y = rv.baseY + Math.sin(elapsed * 1.7 + rv.phase) * 0.8;
        rv.group.position.set(x, y, z);
        rv.group.rotation.y = -a + (rv.speed > 0 ? 0 : Math.PI);
        const flap = Math.sin(elapsed * 9.5 + rv.phase) * 0.55;
        rv.leftWing.rotation.z = flap;
        rv.rightWing.rotation.z = -flap;
      }
    }

    for (let i = this.ringFxList.length - 1; i >= 0; i--) {
      const fx = this.ringFxList[i];
      fx.life -= dt;
      if (fx.life <= 0) {
        this.scene.remove(fx.mesh);
        (fx.mesh.material as THREE.Material).dispose();
        this.ringFxList.splice(i, 1);
        continue;
      }
      const p = 1 - fx.life / fx.maxLife;
      const sc = fx.startScale + (fx.endScale - fx.startScale) * p;
      fx.mesh.scale.setScalar(sc);
      (fx.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
    }

    this.emberSpawnAccum += dt;
    if (this.emberSpawnAccum >= 0.16) {
      this.emberSpawnAccum = 0;
      this.particles.spawnMote(
        layout.detinets.x + 1.5 + (Math.random() - 0.5) * 1.4,
        groundHeightAt(layout.detinets.x, layout.detinets.z, ch) + 1.8,
        layout.detinets.z + 2.2,
        0xff8c38,
        0.7,
      );
      this.particles.spawnMote(
        layout.kapishche.x + (Math.random() - 0.5) * 1.2,
        groundHeightAt(layout.kapishche.x, layout.kapishche.z, ch) + 1.4,
        layout.kapishche.z + 1.2,
        0xffaa44,
        0.65,
      );
      this.particles.spawnMote(
        layout.kazarma.x - 2.4 + (Math.random() - 0.5) * 0.9,
        groundHeightAt(layout.kazarma.x, layout.kazarma.z, ch) + 1.1,
        layout.kazarma.z + 1.8,
        0xff7b29,
        0.55,
      );
      const mono = this.world.buildings.find((b) => b.kind === 'monolith' && !b.dead);
      if (mono) {
        this.particles.spawnMote(
          mono.x + (Math.random() - 0.5) * 2.6,
          groundHeightAt(mono.x, mono.z, ch) + 1.2,
          mono.z + (Math.random() - 0.5) * 2.6,
          layout.palette.monolithLightColor,
          0.85,
        );
      }
    }

    if (this.settings.graphics !== 'low') {
      this.weatherSpawnAccum += dt;
      if (this.weatherSpawnAccum >= 0.11) {
        this.weatherSpawnAccum = 0;
        const focusX = this.world.phase === 'title' ? layout.detinets.x : this.camTargetX;
        const focusZ = this.world.phase === 'title' ? layout.detinets.z : this.camTargetZ;
        const wx = focusX + (Math.random() - 0.5) * 28;
        const wz = focusZ + (Math.random() - 0.5) * 28;
        const wy = groundHeightAt(wx, wz, ch);

        if (biome.weatherKind === 'snow') {
          this.particles.spawnWeatherMote(
            wx,
            wy + 8.5 + Math.random() * 4.0,
            wz,
            0xdcf0ff,
            (Math.random() - 0.5) * 1.1 - 0.4,
            -2.1 - Math.random() * 0.9,
            (Math.random() - 0.5) * 1.1,
            0,
            0.55 + Math.random() * 0.35,
            3.2,
          );
        } else if (biome.weatherKind === 'ash') {
          const isEmber = Math.random() < 0.38;
          this.particles.spawnWeatherMote(
            wx,
            wy + (isEmber ? 0.5 : 5.5 + Math.random() * 4),
            wz,
            isEmber ? 0xff7a33 : 0x9e958e,
            (Math.random() - 0.5) * 1.4,
            isEmber ? 0.9 + Math.random() * 0.8 : -0.9 - Math.random() * 0.5,
            (Math.random() - 0.5) * 1.4,
            0,
            isEmber ? 0.58 : 0.45,
            2.5,
          );
        } else {
          this.particles.spawnWeatherMote(
            wx,
            wy + 0.6 + Math.random() * 2.2,
            wz,
            Math.random() < 0.5 ? 0xb4f87a : 0xf2d085,
            (Math.random() - 0.5) * 0.8,
            0.25 + Math.random() * 0.45,
            (Math.random() - 0.5) * 0.8,
            -0.08,
            0.48,
            2.1,
          );
        }
      }

      this.buildSparkAccum += dt;
      if (this.buildSparkAccum >= 0.24) {
        this.buildSparkAccum = 0;
        for (const b of this.world.buildings) {
          if (!b.dead && b.faction === 'player' && b.underConstruction) {
            const by = groundHeightAt(b.x, b.z, ch);
            this.particles.spawnMote(
              b.x + (Math.random() - 0.5) * b.radius,
              by + 0.8 + Math.random() * 0.8,
              b.z + (Math.random() - 0.5) * b.radius,
              0xffc55c,
              0.6,
            );
          }
        }
      }
    }

    this.particles.update(dt);
  }

  private startLoop(): void {
    this.lastFrameMs = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;
      const nowMs = performance.now();
      const rawDt = Math.min(Math.max(0, (nowMs - this.lastFrameMs) / 1000), 0.05);
      this.lastFrameMs = nowMs;
      const prevPhase = this.world.phase;

      if (this.world.phase === 'title') {
        this.world.elapsed += rawDt;
        if (this.titleHeroActionTimer > 0) {
          this.titleHeroActionTimer = Math.max(0, this.titleHeroActionTimer - rawDt);
        }
        if (this.titleTransitionTimer > 0) {
          this.titleTransitionTimer = Math.max(0, this.titleTransitionTimer - rawDt);
          if (this.titleTransitionTimer === 0 && this.pendingTransitionCb) {
            const cb = this.pendingTransitionCb;
            this.pendingTransitionCb = null;
            cb();
          }
        }
      } else if (this.world.phase === 'playing') {
        this.fogUpdateAccum += rawDt;
        if (this.bossPhaseBannerTimer > 0) {
          this.bossPhaseBannerTimer = Math.max(0, this.bossPhaseBannerTimer - rawDt);
          if (this.bossPhaseBannerTimer === 0) this.activeBossPhaseBanner = null;
        }
        stepWorld(this.world, rawDt);
        this.processWorldEvents();
        if ((this.world.phase as string) === 'gameover' && prevPhase === 'playing') {
          if (this.world.outcome === 'victory') audioEngine.playVictoryFanfare();
          else audioEngine.playDefeatToll();
        }
      }

      this.syncMeshesToWorld();
      this.updateCamera(rawDt, this.world.elapsed);
      this.updateEffects(rawDt, this.world.elapsed);

      if (this.composer && !this.isSoftwareGl && (this.settings.graphics === 'high' || this.settings.graphics === 'cinematic')) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      this.hudAccum += rawDt;
      if (this.hudAccum >= 0.1 || this.world.phase !== prevPhase) {
        this.hudAccum = 0;
        this.emitHudSnapshot();
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  private computeMusicZone(): MusicZone {
    if (this.world.phase === 'title') return 'title';
    if (this.world.phase === 'gameover') {
      return this.world.outcome === 'victory' ? 'victory' : 'defeat';
    }

    // Active combat detection
    const playerUnits = this.world.units.filter((u) => !u.dead && u.faction === 'player');
    const navUnits = this.world.units.filter((u) => !u.dead && u.faction === 'nav');
    const inCombat = playerUnits.some(
      (pu) =>
        pu.windupTimer > 0 ||
        navUnits.some((nu) => Math.hypot(nu.x - pu.x, nu.z - pu.z) <= (nu.kind === 'leshy' ? 14 : 7.5)),
    );
    if (inCombat) return 'combat';

    const hero = getHero(this.world) ?? getHero2(this.world);
    const fx = hero ? hero.x : this.camTargetX;
    const fz = hero ? hero.z : this.camTargetZ;
    const ch = this.world.chapter ?? 1;
    const layout = getMapLayout(ch);

    const creekDist = getRiverDistance(ch, fx, fz);
    if (creekDist <= 6.2) return 'river';
    if (layout.monoliths.some((m) => Math.hypot(fx - m.x, fz - m.z) <= 17)) return 'cursed_woods';
    if (ch === 1 && fx - fz > 8) return 'cursed_woods';
    return 'sanctuary';
  }

  private emitHudSnapshot(): void {
    const supply = getSupplyCounts(this.world);
    const monoliths = this.world.buildings.filter((b) => b.kind === 'monolith');
    const monolithHp = monoliths.reduce((acc, m) => acc + Math.max(0, m.hp), 0);
    const monolithMaxHp = monoliths.length > 0 ? monoliths.reduce((acc, m) => acc + m.maxHp, 0) : 1900;
    const stronghold = this.world.buildings.find((b) => b.kind === 'detinets');
    const hero = getHero(this.world);
    const hero2 = getHero2(this.world);
    const activeHeroKind = this.getActiveHeroKind();
    const musicZone = this.computeMusicZone();
    audioEngine.setMusicContext(musicZone, this.world.phase);

    const aliveIds = new Set(this.world.units.filter((u) => !u.dead).map((u) => u.id));
    const controlGroups: Record<1 | 2 | 3, number> = {
      1: (this.world.controlGroups?.[1] ?? []).filter((id) => aliveIds.has(id)).length,
      2: (this.world.controlGroups?.[2] ?? []).filter((id) => aliveIds.has(id)).length,
      3: (this.world.controlGroups?.[3] ?? []).filter((id) => aliveIds.has(id)).length,
    };

    const selectedUnits = this.world.units
      .filter((u) => !u.dead && this.world.selectedUnitIds.includes(u.id))
      .map((u) => {
        const s = UNIT_STATS[u.kind];
        const eff = getUnitEffectiveStats(this.world, u);
        return {
          id: u.id,
          kind: u.kind,
          name: s.name,
          role: s.role,
          hp: Math.round(u.hp),
          maxHp: Math.round(u.maxHp),
          mp: Math.round(u.mp),
          maxMp: Math.round(u.maxMp),
          level: u.level,
          xp: Math.round(u.xp),
          xpToNext: Math.round(u.xpToNext),
          damage: eff.damage,
          armor: eff.armor,
          buffed: u.buffTimer > 0,
          inventory: u.inventory ? [...u.inventory] : undefined,
        };
      });

    const bld = this.world.buildings.find((b) => !b.dead && b.id === this.world.selectedBuildingId);
    const selectedBuilding = bld
      ? {
          id: bld.id,
          kind: bld.kind,
          name: BUILDING_STATS[bld.kind].name,
          role: BUILDING_STATS[bld.kind].role,
          hp: Math.round(bld.hp),
          maxHp: Math.round(bld.maxHp),
          underConstruction: bld.underConstruction,
          buildProgress: bld.buildProgress,
          trainableUnits: bld.underConstruction ? [] : BUILDING_STATS[bld.kind].trainableUnits,
          queue: bld.queue.map((q) => ({ ...q })),
          researchQueue: bld.researchQueue ? { ...bld.researchQueue } : null,
        }
      : null;

      const activeBoss = this.world.units.find((u) => !u.dead && u.kind === 'leshy');
      const bossInfo =
        activeBoss && this.world.phase === 'playing'
          ? {
              hp: Math.round(activeBoss.hp),
              maxHp: Math.round(activeBoss.maxHp),
              phase: activeBoss.bossPhase ?? 1,
            }
          : null;

      this.onHudUpdate({
      phase: this.world.phase,
      outcome: this.world.outcome,
      difficulty: this.world.difficulty,
      chapter: this.world.chapter ?? 1,
      formation: this.world.formation ?? 'line',
      musicZone,
      gold: Math.round(this.world.gold),
      wood: Math.round(this.world.wood),
      supplyUsed: supply.used,
      supplyCap: supply.cap,
      wave: this.world.wave,
      maxWaves: this.world.maxWaves,
      waveTimer: Math.max(0, Math.round(this.world.waveTimer)),
      elapsed: Math.round(this.world.elapsed),
      kills: this.world.kills,
      unitsLost: this.world.unitsLost,
      monolithHp: Math.round(monolithHp),
      monolithMaxHp: Math.round(monolithMaxHp),
      strongholdHp: stronghold ? Math.round(stronghold.hp) : 0,
      strongholdMaxHp: stronghold ? Math.round(stronghold.maxHp) : 1750,
      heroHp: hero ? Math.round(hero.hp) : 0,
      heroMaxHp: hero ? Math.round(hero.maxHp) : 720,
      heroLevel: hero ? hero.level : 1,
      heroJumpCooldown: hero ? Math.max(0, Number(hero.jumpCooldown.toFixed(1))) : 0,
      hero2Hp: hero2 ? Math.round(hero2.hp) : 0,
      hero2MaxHp: hero2 ? Math.round(hero2.maxHp) : 540,
      hero2Level: hero2 ? hero2.level : 1,
      activeHeroKind,
      commandMode: this.world.commandMode,
      pendingBuildKind: this.world.pendingBuildKind,
      announcementWave: this.world.announcementWave,
      bossInfo,
      bossPhaseBanner: this.bossPhaseBannerTimer > 0 ? this.activeBossPhaseBanner : null,
      selectedUnits,
      selectedBuilding,
      controlGroups,
      upgrades: { ...this.world.upgrades },
      abilities: this.world.abilities.map((a) => ({ ...a })),
      hero2Abilities: this.world.hero2Abilities.map((a) => ({ ...a })),
      minimapFog: downsampleFogForMinimap(this.world.fogGrid),
      minimapUnits: this.world.units
        .filter((u) => !u.dead && (u.faction === 'player' || getFogStateAt(this.world, u.x, u.z) === 2))
        .map((u) => ({
          x: u.x,
          z: u.z,
          faction: u.faction,
          isHero: Boolean(UNIT_STATS[u.kind].isHero),
          isBoss: u.kind === 'leshy',
        })),
      minimapBuildings: this.world.buildings
        .filter(
          (b) =>
            !b.dead &&
            (b.faction === 'player' || b.faction === 'neutral' || getFogStateAt(this.world, b.x, b.z) >= 1),
        )
        .map((b) => ({
          x: b.x,
          z: b.z,
          faction: b.faction,
          kind: b.kind,
          underConstruction: b.underConstruction,
        })),
      minimapResources: this.world.resources
        .filter((r) => r.remaining > 0 && getFogStateAt(this.world, r.x, r.z) >= 1)
        .map((r) => ({ x: r.x, z: r.z, kind: r.kind })),
    });
  }

  private applyGraphicsSettings(): void {
    const g = this.settings.graphics;
    const dpr = window.devicePixelRatio || 1;
    const pixelRatio = this.isSoftwareGl
      ? 1
      : g === 'low'
        ? 0.85
        : g === 'medium'
          ? 1
          : g === 'high'
            ? Math.min(dpr, 1.5)
            : Math.min(dpr, 2);
    this.renderer.setPixelRatio(pixelRatio);

    const shadows = !this.isSoftwareGl && g !== 'low';
    this.renderer.shadowMap.enabled = shadows;
    this.keyLight.castShadow = shadows;

    if (this.bloomPass) {
      this.bloomPass.strength = g === 'cinematic' ? 0.52 : 0.38;
    }
    for (const s of this.sunShafts) s.visible = g !== 'low';
    for (const m of this.mistMeshes) m.mesh.visible = g !== 'low';
    for (const rv of this.ravens) rv.group.visible = g !== 'low';
  }

  private applyAudioSettings(): void {
    audioEngine.setMusicVolume(this.settings.musicVolume);
    audioEngine.setSfxVolume(this.settings.sfxVolume);
    audioEngine.setMuted(this.settings.muted);
  }

  public updateSettings(next: GameSettings): void {
    const prevDiff = this.world.difficulty;
    this.settings = {
      ...next,
      keyBindings: { ...next.keyBindings },
    };
    this.applyGraphicsSettings();
    this.applyAudioSettings();
    if (this.world.phase === 'title' && prevDiff !== next.difficulty) {
      this.resetWorld('title', next.difficulty, this.world.chapter);
    } else {
      this.emitHudSnapshot();
    }
  }

  public setTouchMode(mode: TouchMode): void {
    this.touchMode = mode;
  }

  public setChapter(chapter: ChapterId): void {
    if (this.world.phase === 'title') {
      this.resetWorld('title', this.settings.difficulty, chapter);
    } else {
      this.world.chapter = chapter;
      this.emitHudSnapshot();
    }
  }

  public startGameTransition(difficulty: DifficultyLevel, chapter: ChapterId, onFinish: () => void): void {
    audioEngine.unlockAndStartMusic();
    if (this.isSoftwareGl) {
      this.startGame(difficulty, chapter);
      onFinish();
      return;
    }
    this.titleTransitionTimer = 0.72;
    this.pendingTransitionCb = () => {
      this.startGame(difficulty, chapter);
      onFinish();
    };
  }

  public startGame(difficulty?: DifficultyLevel, chapter?: ChapterId): void {
    audioEngine.unlockAndStartMusic();
    this.titleTransitionTimer = 0;
    this.pendingTransitionCb = null;
    this.resetWorld('playing', difficulty ?? this.settings.difficulty, chapter ?? this.world.chapter);
    audioEngine.playWarHorn();
  }

  public restartGame(difficulty?: DifficultyLevel, chapter?: ChapterId): void {
    audioEngine.unlockAndStartMusic();
    this.titleTransitionTimer = 0;
    this.pendingTransitionCb = null;
    this.resetWorld('playing', difficulty ?? this.settings.difficulty, chapter ?? this.world.chapter);
    audioEngine.playWarHorn();
  }

  public setPhase(phase: WorldState['phase']): void {
    this.world.phase = phase;
    this.keysHeld.clear();
    if (phase === 'title') {
      this.titleTransitionTimer = 0;
      this.pendingTransitionCb = null;
      this.resetWorld('title', this.settings.difficulty, this.world.chapter);
    } else {
      this.emitHudSnapshot();
    }
  }

  public getWorldState(): WorldState {
    return this.world;
  }

  public loadWorldState(saved: WorldState): void {
    this.clearDynamicMeshes();
    audioEngine.unlockAndStartMusic();
    this.world = saved;
    this.world.phase = 'playing';
    this.world.outcome = null;
    this.world.commandMode = 'normal';
    this.world.pendingBuildKind = null;
    this.keysHeld.clear();
    this.fogDirty = true;
    this.activeBossPhaseBanner = null;
    this.bossPhaseBannerTimer = 0;
    this.rebuildBiomeEnvironment(this.world.chapter ?? 1);
    this.syncMeshesToWorld();
    this.centerOnHeroOrBase();
    this.camTargetX = this.camGoalX;
    this.camTargetZ = this.camGoalZ;
    this.emitHudSnapshot();
  }

  private disposeDynamicObjectGeometries(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const g = obj.geometry;
        if (g && g !== this.sharedRingGeom && g !== this.arrowGeom && g !== this.boltGeom && g !== this.orbGeom) {
          g.dispose();
        }
      }
    });
  }

  private clearDynamicMeshes(): void {
    for (const rig of this.unitRigs.values()) {
      this.scene.remove(rig.root);
      this.disposeDynamicObjectGeometries(rig.root);
    }
    this.unitRigs.clear();
    for (const rig of this.buildingRigs.values()) {
      this.scene.remove(rig.root);
      this.disposeDynamicObjectGeometries(rig.root);
    }
    this.buildingRigs.clear();
    for (const m of this.resourceMeshes.values()) {
      this.scene.remove(m);
      this.disposeDynamicObjectGeometries(m);
    }
    this.resourceMeshes.clear();
    for (const rm of this.relicMeshes.values()) {
      this.scene.remove(rm);
      this.disposeDynamicObjectGeometries(rm);
    }
    this.relicMeshes.clear();
    for (const p of this.projectileMeshes.values()) this.scene.remove(p);
    this.projectileMeshes.clear();
  }

  private resetWorld(phase: WorldState['phase'], difficulty: DifficultyLevel, chapter: ChapterId = 1): void {
    this.clearDynamicMeshes();

    this.world = createInitialWorld(phase, difficulty, chapter);
    this.fogDirty = true;
    this.activeBossPhaseBanner = null;
    this.bossPhaseBannerTimer = 0;
    this.rebuildBiomeEnvironment(this.world.chapter);
    const layout = getMapLayout(this.world.chapter);
    this.camTargetX = layout.cameraHome.x;
    this.camTargetZ = layout.cameraHome.z;
    this.camGoalX = layout.cameraHome.x;
    this.camGoalZ = layout.cameraHome.z;
    this.camDistGoal = 23.5;
    this.camYawGoal = 0.72;
    this.syncMeshesToWorld();
    this.emitHudSnapshot();
  }

  public triggerHeroLeap(targetX?: number, targetZ?: number): void {
    if (triggerHeroJump(this.world, targetX, targetZ)) {
      this.processWorldEvents();
      this.emitHudSnapshot();
    }
  }

  public triggerAbility(id: AbilityId): void {
    if (castHeroAbility(this.world, id)) {
      this.processWorldEvents();
      this.emitHudSnapshot();
    }
  }

  public setFormation(formation: FormationKind): void {
    setWorldFormation(this.world, formation);
    this.emitHudSnapshot();
  }

  public toggleAutocast(id: AbilityId): void {
    toggleAbilityAutocast(this.world, id);
    this.emitHudSnapshot();
  }

  private tryRecallGroup(slot: 1 | 2 | 3): boolean {
    const ids = recallControlGroup(this.world, slot);
    if (ids.length === 0) return false;
    this.world.selectedUnitIds = ids;
    this.world.selectedBuildingId = null;
    const lead = this.world.units.find((u) => u.id === ids[0] && !u.dead);
    if (lead) {
      this.camGoalX = lead.x;
      this.camGoalZ = lead.z;
    }
    this.emitHudSnapshot();
    return true;
  }

  public handleGroupSlot(slot: 1 | 2 | 3, assign: boolean): void {
    if (assign) {
      const targetIds =
        this.world.selectedUnitIds.length > 0
          ? this.world.selectedUnitIds
          : this.world.units
              .filter((u) => !u.dead && u.faction === 'player' && u.kind !== 'kholop')
              .map((u) => u.id);
      if (targetIds.length === 0) return;
      assignControlGroup(this.world, slot, targetIds);
      this.world.selectedUnitIds = [...targetIds];
      this.world.selectedBuildingId = null;
      this.emitHudSnapshot();
    } else {
      this.tryRecallGroup(slot);
    }
  }

  public trainFromSelected(kind: UnitKind): void {
    const bId = this.world.selectedBuildingId || this.world.buildings.find((b) => b.kind === 'kazarma' && !b.dead)?.id;
    if (!bId) return;
    if (trainUnit(this.world, bId, kind).ok) {
      audioEngine.playOrderAck();
      this.emitHudSnapshot();
    }
  }

  public researchFromSelected(upgradeId: UpgradeId): void {
    const bId = this.world.selectedBuildingId;
    if (!bId) return;
    if (researchUpgrade(this.world, bId, upgradeId).ok) {
      audioEngine.playOrderAck();
      this.emitHudSnapshot();
    }
  }

  public buyRelicFromMerchant(relicId: RelicId): void {
    const bId =
      this.world.selectedBuildingId ||
      this.world.buildings.find((b) => b.kind === 'merchant' && !b.dead)?.id;
    if (!bId) return;
    if (buyRelicFromMerchant(this.world, bId, relicId).ok) {
      this.processWorldEvents();
      this.emitHudSnapshot();
    }
  }

  public useRelicSlot(slotIndex: number): void {
    const selectedHero = this.world.units.find(
      (u) => !u.dead && this.world.selectedUnitIds.includes(u.id) && UNIT_STATS[u.kind].isHero,
    );
    const targetHero = selectedHero ?? getHero(this.world) ?? getHero2(this.world);
    if (!targetHero) return;
    if (useHeroRelic(this.world, targetHero.id, slotIndex)) {
      this.processWorldEvents();
      this.emitHudSnapshot();
    }
  }

  public setCommandMode(mode: WorldState['commandMode']): void {
    this.world.commandMode = mode;
    if (mode !== 'build') {
      this.world.pendingBuildKind = null;
    }
    this.emitHudSnapshot();
  }

  public startBuildMode(kind: BuildingKind): void {
    if (this.world.phase !== 'playing') return;
    const stats = BUILDING_STATS[kind];
    if (this.world.gold < stats.goldCost || this.world.wood < stats.woodCost) return;

    const hasSelectedWorker = this.world.selectedUnitIds.some((id) => {
      const u = this.world.units.find((item) => item.id === id && !item.dead && item.faction === 'player');
      return u?.kind === 'kholop';
    });
    if (!hasSelectedWorker) {
      const worker = this.world.units.find((u) => !u.dead && u.faction === 'player' && u.kind === 'kholop');
      if (!worker) return;
      this.world.selectedUnitIds = [worker.id];
      this.world.selectedBuildingId = null;
    }

    this.world.commandMode = 'build';
    this.world.pendingBuildKind = kind;
    this.hoverWorldX = this.camTargetX;
    this.hoverWorldZ = this.camTargetZ;
    this.emitHudSnapshot();
  }

  public stopSelected(): void {
    stopSelectedUnits(this.world);
    this.world.commandMode = 'normal';
    this.world.pendingBuildKind = null;
    this.emitHudSnapshot();
  }

  public selectAllCombatUnits(): void {
    const combatIds = this.world.units
      .filter((u) => !u.dead && u.faction === 'player' && u.kind !== 'kholop')
      .map((u) => u.id);
    if (combatIds.length > 0) {
      this.world.selectedUnitIds = combatIds;
      this.world.selectedBuildingId = null;
      this.emitHudSnapshot();
    }
  }

  public selectBuildingByKind(kind: 'detinets' | 'kazarma' | 'kapishche'): void {
    const b = this.world.buildings.find((item) => !item.dead && item.kind === kind);
    if (b) {
      this.world.selectedBuildingId = b.id;
      this.world.selectedUnitIds = [];
      this.camGoalX = b.x;
      this.camGoalZ = b.z;
      this.emitHudSnapshot();
    }
  }

  public selectWorker(): void {
    const workers = this.world.units.filter((u) => !u.dead && u.faction === 'player' && u.kind === 'kholop');
    if (workers.length === 0) return;
    const idleWorkers = workers.filter((w) => w.order.type === 'idle');
    const pool = idleWorkers.length > 0 ? idleWorkers : workers;
    const currentIdx = pool.findIndex((w) => this.world.selectedUnitIds.includes(w.id));
    const worker = pool[(currentIdx + 1) % pool.length];
    this.world.selectedUnitIds = [worker.id];
    this.world.selectedBuildingId = null;
    this.world.commandMode = 'normal';
    this.world.pendingBuildKind = null;
    this.camGoalX = worker.x;
    this.camGoalZ = worker.z;
    this.emitHudSnapshot();
  }

  public selectHero(): void {
    const hero = getHero(this.world);
    if (hero) {
      this.world.selectedUnitIds = [hero.id];
      this.world.selectedBuildingId = null;
      this.camGoalX = hero.x;
      this.camGoalZ = hero.z;
      this.emitHudSnapshot();
    } else {
      this.centerOnHeroOrBase();
    }
  }

  public selectHero2(): void {
    const hero2 = getHero2(this.world);
    if (hero2) {
      this.world.selectedUnitIds = [hero2.id];
      this.world.selectedBuildingId = null;
      this.camGoalX = hero2.x;
      this.camGoalZ = hero2.z;
      this.emitHudSnapshot();
    } else {
      this.selectBuildingByKind('kapishche');
    }
  }

  public centerOnHeroOrBase(): void {
    const hero = getHero(this.world) ?? getHero2(this.world);
    if (hero) {
      this.camGoalX = hero.x;
      this.camGoalZ = hero.z;
    } else {
      const layout = getMapLayout(this.world.chapter ?? 1);
      this.camGoalX = layout.detinets.x;
      this.camGoalZ = layout.detinets.z;
    }
    this.camYawGoal = 0.72;
  }

  public panToWorld(x: number, z: number): void {
    this.camGoalX = THREE.MathUtils.clamp(x, -MAP_HALF_SIZE + 4, MAP_HALF_SIZE - 4);
    this.camGoalZ = THREE.MathUtils.clamp(z, -MAP_HALF_SIZE + 4, MAP_HALF_SIZE - 4);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();

    this.clearDynamicMeshes();
    this.clearBiomeEnvironment();
    this.skyMesh.geometry.dispose();
    (this.skyMesh.material as THREE.Material).dispose();
    this.rallyRingMesh.geometry.dispose();
    (this.rallyRingMesh.material as THREE.Material).dispose();
    this.rallyFlagMesh.geometry.dispose();
    (this.rallyFlagMesh.material as THREE.Material).dispose();
    this.particles.dispose();
    this.palette.dispose();
    this.textures.dispose();
    this.fogTexture.dispose();
    this.fogOverlayMesh.geometry.dispose();
    (this.fogOverlayMesh.material as THREE.Material).dispose();
    this.buildPreviewRing.geometry.dispose();
    (this.buildPreviewRing.material as THREE.Material).dispose();
    this.buildPreviewBody.geometry.dispose();
    (this.buildPreviewBody.material as THREE.Material).dispose();
    this.sharedRingGeom.dispose();
    this.arrowGeom.dispose();
    this.boltGeom.dispose();
    this.orbGeom.dispose();
    this.arrowMat.dispose();
    this.boltMat.dispose();
    this.spiritMat.dispose();
    this.bogMat.dispose();
    this.frostMat.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
