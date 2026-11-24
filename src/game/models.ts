import * as THREE from 'three';
import { RELIC_DEFS } from './constants';
import { GameTextureSet } from './textures';
import { BuildingKind, RelicId, ResourceKind, UnitKind } from './types';

export interface MaterialPalette {
  iron: THREE.MeshPhysicalMaterial;
  darkIron: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshPhysicalMaterial;
  crimson: THREE.MeshPhysicalMaterial;
  oak: THREE.MeshStandardMaterial;
  fur: THREE.MeshPhysicalMaterial;
  leather: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  linen: THREE.MeshPhysicalMaterial;
  cloakGreen: THREE.MeshPhysicalMaterial;
  shieldFace: THREE.MeshStandardMaterial;
  runeCyan: THREE.MeshPhysicalMaterial;
  emberCore: THREE.MeshStandardMaterial;
  emberOuter: THREE.MeshBasicMaterial;
  coalBed: THREE.MeshStandardMaterial;
  hearthWindow: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  navFlesh: THREE.MeshStandardMaterial;
  navCloth: THREE.MeshPhysicalMaterial;
  navGlow: THREE.MeshPhysicalMaterial;
  bark: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  roofSlate: THREE.MeshStandardMaterial;
  spiritBlue: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

export function createMaterialPalette(textures: GameTextureSet): MaterialPalette {
  const mats: THREE.Material[] = [];
  const reg = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  return {
    iron: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x8e98a4,
        metalness: 0.9,
        roughness: 0.36,
        roughnessMap: textures.metalRoughness,
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.8, 0.8),
        anisotropy: 0.75,
        envMapIntensity: 0.95,
      }),
    ),
    darkIron: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x2c3138,
        metalness: 0.86,
        roughness: 0.5,
        roughnessMap: textures.metalRoughness,
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(1.0, 1.0),
        anisotropy: 0.45,
        envMapIntensity: 0.78,
      }),
    ),
    gold: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0xc99338,
        metalness: 0.92,
        roughness: 0.28,
        roughnessMap: textures.metalRoughness,
        normalMap: textures.metalNormal,
        normalScale: new THREE.Vector2(0.65, 0.65),
        anisotropy: 0.85,
        envMapIntensity: 0.95,
      }),
    ),
    crimson: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x5c1512,
        metalness: 0.0,
        roughness: 0.94,
        roughnessMap: textures.clothRoughness,
        normalMap: textures.clothNormal,
        normalScale: new THREE.Vector2(0.9, 0.9),
        sheen: 0.65,
        sheenRoughness: 0.75,
        sheenColor: new THREE.Color(0x8c2a24),
        envMapIntensity: 0.3,
      }),
    ),
    oak: reg(
      new THREE.MeshStandardMaterial({
        color: 0x52341f,
        roughness: 0.86,
        roughnessMap: textures.timberRoughness,
        normalMap: textures.timberNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        metalness: 0.03,
        envMapIntensity: 0.28,
      }),
    ),
    fur: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x32251c,
        metalness: 0.0,
        roughness: 0.97,
        roughnessMap: textures.barkRoughness,
        normalMap: textures.barkNormal,
        normalScale: new THREE.Vector2(1.15, 1.15),
        sheen: 0.45,
        sheenRoughness: 0.9,
        sheenColor: new THREE.Color(0x5b483a),
        envMapIntensity: 0.24,
      }),
    ),
    leather: reg(
      new THREE.MeshStandardMaterial({
        color: 0x3e2719,
        metalness: 0.04,
        roughness: 0.68,
        roughnessMap: textures.clothRoughness,
        normalMap: textures.clothNormal,
        normalScale: new THREE.Vector2(0.75, 0.75),
        envMapIntensity: 0.32,
      }),
    ),
    skin: reg(
      new THREE.MeshStandardMaterial({
        color: 0xb68a6d,
        metalness: 0.02,
        roughness: 0.74,
        roughnessMap: textures.clothRoughness,
        normalMap: textures.earthNormal,
        normalScale: new THREE.Vector2(0.25, 0.25),
        envMapIntensity: 0.28,
      }),
    ),
    linen: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x8f836e,
        metalness: 0.0,
        roughness: 0.94,
        roughnessMap: textures.clothRoughness,
        normalMap: textures.clothNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        sheen: 0.3,
        sheenColor: new THREE.Color(0xb2a692),
        envMapIntensity: 0.26,
      }),
    ),
    cloakGreen: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x1c3021,
        metalness: 0.0,
        roughness: 0.92,
        roughnessMap: textures.clothRoughness,
        normalMap: textures.clothNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        sheen: 0.5,
        sheenColor: new THREE.Color(0x36543a),
        envMapIntensity: 0.26,
      }),
    ),
    shieldFace: reg(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.shieldMap,
        normalMap: textures.timberNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughnessMap: textures.timberRoughness,
        roughness: 0.78,
        metalness: 0.12,
        envMapIntensity: 0.4,
      }),
    ),
    runeCyan: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x8de8ff,
        emissive: 0x38bdf8,
        emissiveIntensity: 2.3,
        metalness: 0.3,
        roughness: 0.18,
        clearcoat: 0.9,
      }),
    ),
    emberCore: reg(
      new THREE.MeshStandardMaterial({
        color: 0xffa438,
        emissive: 0xff4e08,
        emissiveIntensity: 1.75,
        roughness: 0.35,
      }),
    ),
    emberOuter: reg(
      new THREE.MeshBasicMaterial({
        color: 0xff6a1a,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
    coalBed: reg(
      new THREE.MeshStandardMaterial({
        color: 0x24120c,
        emissive: 0xd93c08,
        emissiveIntensity: 1.5,
        roughness: 0.9,
      }),
    ),
    hearthWindow: reg(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.windowMap,
        emissiveMap: textures.windowMap,
        emissive: 0xff8528,
        emissiveIntensity: 2.2,
        roughness: 0.45,
        metalness: 0.15,
      }),
    ),
    bone: reg(
      new THREE.MeshStandardMaterial({
        color: 0xa89d88,
        metalness: 0.04,
        roughness: 0.78,
        roughnessMap: textures.stoneRoughness,
        normalMap: textures.stoneNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        envMapIntensity: 0.3,
      }),
    ),
    navFlesh: reg(
      new THREE.MeshStandardMaterial({
        color: 0x2c3631,
        metalness: 0.04,
        roughness: 0.86,
        roughnessMap: textures.barkRoughness,
        normalMap: textures.barkNormal,
        normalScale: new THREE.Vector2(0.7, 0.7),
        envMapIntensity: 0.28,
      }),
    ),
    navCloth: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x121815,
        metalness: 0.0,
        roughness: 0.96,
        roughnessMap: textures.clothRoughness,
        normalMap: textures.clothNormal,
        sheen: 0.35,
        sheenColor: new THREE.Color(0x284d3a),
        envMapIntensity: 0.24,
      }),
    ),
    navGlow: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x0b4a24,
        emissive: 0x16c95e,
        emissiveIntensity: 1.15,
        roughness: 0.28,
        metalness: 0.22,
        envMapIntensity: 0.35,
      }),
    ),
    bark: reg(
      new THREE.MeshStandardMaterial({
        color: 0x241d17,
        metalness: 0.02,
        roughness: 0.95,
        roughnessMap: textures.barkRoughness,
        normalMap: textures.barkNormal,
        normalScale: new THREE.Vector2(1.2, 1.2),
        envMapIntensity: 0.2,
      }),
    ),
    timber: reg(
      new THREE.MeshStandardMaterial({
        color: 0xd6cab9,
        map: textures.timberMap,
        normalMap: textures.timberNormal,
        normalScale: new THREE.Vector2(1.05, 1.05),
        roughnessMap: textures.timberRoughness,
        roughness: 0.88,
        metalness: 0.03,
        envMapIntensity: 0.28,
      }),
    ),
    stone: reg(
      new THREE.MeshStandardMaterial({
        color: 0xdad7cf,
        map: textures.stoneMap,
        normalMap: textures.stoneNormal,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: textures.stoneRoughness,
        roughness: 0.88,
        metalness: 0.04,
        envMapIntensity: 0.28,
      }),
    ),
    obsidian: reg(
      new THREE.MeshStandardMaterial({
        color: 0x1a2220,
        normalMap: textures.stoneNormal,
        normalScale: new THREE.Vector2(1.2, 1.2),
        roughnessMap: textures.stoneRoughness,
        roughness: 0.72,
        metalness: 0.14,
        envMapIntensity: 0.32,
      }),
    ),
    roofSlate: reg(
      new THREE.MeshStandardMaterial({
        color: 0x563f31,
        map: textures.timberMap,
        normalMap: textures.timberNormal,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: textures.timberRoughness,
        roughness: 0.9,
        metalness: 0.04,
        envMapIntensity: 0.24,
      }),
    ),
    spiritBlue: reg(
      new THREE.MeshPhysicalMaterial({
        color: 0x67d8ef,
        emissive: 0x1ea3cc,
        emissiveIntensity: 1.25,
        roughness: 0.28,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
      }),
    ),
    dispose: () => mats.forEach((m) => m.dispose()),
  };
}

export interface UnitVisualRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  headGroup?: THREE.Group;
  cloakMesh?: THREE.Mesh;
  shadowDisc?: THREE.Mesh;
  carryMesh?: THREE.Mesh;
  selectionRing: THREE.Mesh;
  buffRing: THREE.Mesh;
  hpBg: THREE.Mesh;
  hpFill: THREE.Mesh;
}

function addShadowDisc(root: THREE.Group, textures: GameTextureSet, radius: number): THREE.Mesh {
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowTex,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.42, 18), shadowMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.016;
  root.add(disc);
  return disc;
}

function addCourtyardDecal(root: THREE.Group, tex: THREE.CanvasTexture, radius: number): void {
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.94,
    metalness: 0.02,
    envMapIntensity: 0.2,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const pad = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), mat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.024;
  pad.receiveShadow = true;
  root.add(pad);
}

function addSelectionAndHp(
  root: THREE.Group,
  textures: GameTextureSet,
  radius: number,
  barY: number,
  isEnemy: boolean,
): { selectionRing: THREE.Mesh; buffRing: THREE.Mesh; hpBg: THREE.Mesh; hpFill: THREE.Mesh } {
  const ringMat = new THREE.MeshBasicMaterial({
    map: textures.selectionRingTex,
    color: isEnemy ? 0xe04f4f : 0xe8b954,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const selectionRing = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.55, radius * 2.55), ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.03;
  selectionRing.visible = false;
  root.add(selectionRing);

  const buffMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const buffRing = new THREE.Mesh(new THREE.RingGeometry(radius * 1.12, radius * 1.3, 24), buffMat);
  buffRing.rotation.x = -Math.PI / 2;
  buffRing.position.y = 0.035;
  buffRing.visible = false;
  root.add(buffRing);

  const barWidth = radius * 1.85;
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barWidth, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x0d0d0e, side: THREE.DoubleSide }),
  );
  hpBg.position.set(0, barY, 0);
  root.add(hpBg);

  const hpFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barWidth - 0.04, 0.09),
    new THREE.MeshBasicMaterial({
      color: isEnemy ? 0xc93b3b : 0x56b858,
      side: THREE.DoubleSide,
    }),
  );
  hpFill.position.set(0, barY, 0.01);
  root.add(hpFill);

  return { selectionRing, buffRing, hpBg, hpFill };
}

function makeVolumetricFire(mats: MaterialPalette, scale = 1): THREE.Group {
  const g = new THREE.Group();

  // Glowing ember coal bed
  const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 * scale, 0), mats.coalBed);
  coals.scale.set(1.2, 0.45, 1.2);
  g.add(coals);

  // 3 tapered flickering flame tongues (no solid polygon ball!)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.11 * scale, 0.48 * scale, 6), mats.emberCore);
    tongue.position.set(Math.cos(a) * 0.06 * scale, 0.24 * scale, Math.sin(a) * 0.06 * scale);
    tongue.rotation.z = Math.cos(a) * 0.16;
    tongue.rotation.x = Math.sin(a) * 0.16;
    g.add(tongue);
  }

  // Soft additive outer flame aura
  const halo = new THREE.Mesh(new THREE.ConeGeometry(0.24 * scale, 0.68 * scale, 8), mats.emberOuter);
  halo.position.y = 0.3 * scale;
  g.add(halo);

  return g;
}

function makeSlavicHelm(mat: THREE.Material, trimMat: THREE.Material, scale = 1, ornate = false): THREE.Group {
  const g = new THREE.Group();
  const pts = [
    new THREE.Vector2(0.21 * scale, 0),
    new THREE.Vector2(0.2 * scale, 0.12 * scale),
    new THREE.Vector2(0.11 * scale, 0.26 * scale),
    new THREE.Vector2(0.015 * scale, 0.38 * scale),
  ];
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), mat);
  dome.castShadow = true;
  g.add(dome);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.215 * scale, 0.22 * scale, 0.06 * scale, 12), trimMat);
  rim.position.y = 0.025 * scale;
  g.add(rim);

  const aventail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21 * scale, 0.24 * scale, 0.14 * scale, 10, 1, true, Math.PI * 0.25, Math.PI * 1.5),
    trimMat,
  );
  aventail.position.y = -0.06 * scale;
  aventail.rotation.y = Math.PI;
  g.add(aventail);

  const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.036 * scale, 0.16 * scale, 0.05 * scale), trimMat);
  nasal.position.set(0, -0.02 * scale, 0.2 * scale);
  g.add(nasal);

  if (ornate) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.035 * scale, 0.14 * scale, 6), trimMat);
    finial.position.y = 0.42 * scale;
    g.add(finial);
  }
  return g;
}

function createAxeBladeGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.08);
  shape.lineTo(0.28, -0.22);
  shape.quadraticCurveTo(0.42, 0, 0.28, 0.24);
  shape.lineTo(0, 0.1);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createCloakGeo(width: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.34, height * 0.5);
  shape.lineTo(width * 0.34, height * 0.5);
  shape.lineTo(width * 0.5, -height * 0.5);
  shape.lineTo(0, -height * 0.44);
  shape.lineTo(-width * 0.5, -height * 0.5);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createGableRoofGeo(width: number, height: number, length: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

const _sharedAxeBladeGeo = createAxeBladeGeo();
const _sharedHeroCloakGeo = createCloakGeo(0.76, 1.24);
const _sharedRangerCloakGeo = createCloakGeo(0.56, 0.88);
const _sharedBarracksRoofGeo = createGableRoofGeo(4.85, 1.75, 4.1);

export function buildUnitRig(
  kind: UnitKind,
  mats: MaterialPalette,
  textures: GameTextureSet,
): UnitVisualRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftArm = new THREE.Group();
  root.add(bodyGroup);

  const isEnemy = kind === 'upyr' || kind === 'likho' || kind === 'morovik' || kind === 'leshy';
  let radius = 0.55;
  let barY = 2.25;
  let carryMesh: THREE.Mesh | undefined;
  let headGroup: THREE.Group | undefined;
  let cloakMesh: THREE.Mesh | undefined;

  if (kind === 'voivode') {
    radius = 0.78;
    barY = 2.85;
    for (const sx of [-0.17, 0.17]) {
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.62, 10), mats.darkIron);
      boot.position.set(sx, 0.31, 0);
      boot.castShadow = true;
      bodyGroup.add(boot);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), mats.gold);
      knee.position.set(sx, 0.54, 0.04);
      bodyGroup.add(knee);
    }

    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.58, 10), mats.crimson);
    skirt.position.y = 0.76;
    skirt.castShadow = true;
    bodyGroup.add(skirt);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.315, 0.12, 10), mats.gold);
    belt.position.y = 0.98;
    bodyGroup.add(belt);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.7, 10), mats.iron);
    chest.position.y = 1.26;
    chest.castShadow = true;
    bodyGroup.add(chest);

    const furCollar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 14), mats.fur);
    furCollar.rotation.x = Math.PI / 2;
    furCollar.position.y = 1.58;
    bodyGroup.add(furCollar);

    cloakMesh = new THREE.Mesh(_sharedHeroCloakGeo, mats.crimson);
    cloakMesh.position.set(0, 0.98, -0.32);
    cloakMesh.rotation.x = 0.16;
    cloakMesh.castShadow = true;
    bodyGroup.add(cloakMesh);

    for (const sx of [-0.4, 0.4]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65),
        mats.gold,
      );
      pauldron.position.set(sx, 1.5, 0);
      pauldron.castShadow = true;
      bodyGroup.add(pauldron);
    }

    headGroup = new THREE.Group();
    headGroup.position.y = 1.77;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), mats.skin);
    headGroup.add(head);

    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 7), mats.fur);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.14, 0.11);
    headGroup.add(beard);

    const helm = makeSlavicHelm(mats.iron, mats.gold, 1.12, true);
    helm.position.y = 0.06;
    headGroup.add(helm);
    bodyGroup.add(headGroup);

    rightArm.position.set(0.4, 1.44, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.54, 8), mats.iron);
    armR.position.set(0, -0.22, 0.08);
    armR.rotation.x = -0.35;
    rightArm.add(armR);

    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 1.45, 8), mats.oak);
    haft.position.set(0.02, -0.14, 0.38);
    haft.rotation.x = Math.PI * 0.38;
    haft.castShadow = true;
    rightArm.add(haft);

    const axeBlade = new THREE.Mesh(_sharedAxeBladeGeo, mats.iron);
    axeBlade.position.set(0.02, 0.35, 0.78);
    axeBlade.rotation.y = Math.PI / 2;
    axeBlade.rotation.z = -Math.PI * 0.12;
    axeBlade.scale.setScalar(1.25);
    axeBlade.castShadow = true;
    rightArm.add(axeBlade);

    const axeRune = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.08), mats.runeCyan);
    axeRune.position.set(0.02, 0.38, 0.96);
    axeRune.rotation.x = Math.PI * 0.38;
    rightArm.add(axeRune);
    bodyGroup.add(rightArm);

    leftArm.position.set(-0.42, 1.38, 0);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.07, 14), mats.shieldFace);
    shield.rotation.x = Math.PI / 2;
    shield.rotation.y = 0.25;
    shield.position.set(-0.08, -0.15, 0.24);
    shield.castShadow = true;
    leftArm.add(shield);

    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.036, 6, 18), mats.gold);
    shieldRim.rotation.y = 0.25;
    shieldRim.position.set(-0.08, -0.15, 0.25);
    leftArm.add(shieldRim);

    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.gold);
    boss.position.set(-0.08, -0.15, 0.29);
    leftArm.add(boss);
    bodyGroup.add(leftArm);
  } else if (kind === 'vedunya') {
    radius = 0.6;
    barY = 2.65;
    const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 1.18, 10), mats.cloakGreen);
    gown.position.y = 0.6;
    gown.castShadow = true;
    bodyGroup.add(gown);

    const goldHem = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 14), mats.gold);
    goldHem.rotation.x = Math.PI / 2;
    goldHem.position.y = 0.08;
    bodyGroup.add(goldHem);

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.16, 10), mats.gold);
    sash.position.y = 1.02;
    bodyGroup.add(sash);

    const mantle = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.085, 7, 12), mats.fur);
    mantle.rotation.x = Math.PI / 2;
    mantle.position.y = 1.38;
    bodyGroup.add(mantle);

    cloakMesh = new THREE.Mesh(_sharedRangerCloakGeo, mats.cloakGreen);
    cloakMesh.position.set(0, 0.95, -0.26);
    cloakMesh.rotation.x = 0.14;
    cloakMesh.castShadow = true;
    bodyGroup.add(cloakMesh);

    headGroup = new THREE.Group();
    headGroup.position.y = 1.56;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), mats.skin);
    headGroup.add(face);

    // Ornate Slavic kokoshnik / lunar crescent headdress
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.036, 6, 12, Math.PI), mats.gold);
    crown.position.set(0, 0.11, -0.02);
    headGroup.add(crown);

    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.42, 6), mats.gold);
      horn.position.set(sx * 0.21, 0.28, -0.02);
      horn.rotation.z = -sx * 0.42;
      headGroup.add(horn);
    }
    bodyGroup.add(headGroup);

    rightArm.position.set(0.32, 1.24, 0);
    const staffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, -0.98, 0.12),
      new THREE.Vector3(0.05, 0.0, 0.16),
      new THREE.Vector3(0.0, 0.65, 0.2),
      new THREE.Vector3(0.04, 0.95, 0.16),
    ]);
    const staff = new THREE.Mesh(new THREE.TubeGeometry(staffCurve, 12, 0.032, 7, false), mats.oak);
    staff.castShadow = true;
    rightArm.add(staff);

    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 6, 12, Math.PI * 1.45), mats.gold);
    crescent.position.set(0.04, 1.08, 0.16);
    crescent.rotation.z = -Math.PI * 0.22;
    rightArm.add(crescent);

    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mats.runeCyan);
    orb.position.set(0.04, 1.08, 0.16);
    rightArm.add(orb);
    bodyGroup.add(rightArm);

    leftArm.position.set(-0.3, 1.2, 0);
    const spiritWisp = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), mats.spiritBlue);
    spiritWisp.position.set(-0.04, -0.18, 0.22);
    leftArm.add(spiritWisp);
    bodyGroup.add(leftArm);
  } else if (kind === 'spirit_wolf') {
    radius = 0.48;
    barY = 1.68;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.96, 8), mats.spiritBlue);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.56, 0);
    torso.castShadow = true;
    bodyGroup.add(torso);

    const mane = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), mats.spiritBlue);
    mane.position.set(0, 0.64, 0.28);
    bodyGroup.add(mane);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.52, 6), mats.spiritBlue);
    tail.position.set(0, 0.66, -0.62);
    tail.rotation.x = -Math.PI * 0.68;
    bodyGroup.add(tail);

    headGroup = new THREE.Group();
    headGroup.position.set(0, 0.78, 0.52);
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17, 0), mats.spiritBlue);
    headGroup.add(skull);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), mats.spiritBlue);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.22);
    headGroup.add(snout);
    for (const sx of [-0.09, 0.09]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), mats.spiritBlue);
      ear.position.set(sx, 0.18, -0.02);
      headGroup.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), mats.runeCyan);
      eye.position.set(sx * 0.7, 0.04, 0.14);
      headGroup.add(eye);
    }
    bodyGroup.add(headGroup);

    rightArm.position.set(0.16, 0.45, 0.3);
    leftArm.position.set(-0.16, 0.45, 0.3);
    for (const legPivot of [rightArm, leftArm]) {
      const frontLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.48, 6), mats.spiritBlue);
      frontLeg.position.set(0, -0.22, 0);
      legPivot.add(frontLeg);
      bodyGroup.add(legPivot);
    }
    for (const sx of [-0.15, 0.15]) {
      const hindLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.042, 0.48, 6), mats.spiritBlue);
      hindLeg.position.set(sx, 0.24, -0.34);
      bodyGroup.add(hindLeg);
    }
  } else if (kind === 'ratnik') {
    radius = 0.56;
    barY = 2.25;
    for (const sx of [-0.14, 0.14]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.52, 8), mats.leather);
      leg.position.set(sx, 0.26, 0);
      bodyGroup.add(leg);
    }
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.74, 10), mats.darkIron);
    torso.position.y = 0.88;
    torso.castShadow = true;
    bodyGroup.add(torso);

    const surcoat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.38, 10), mats.crimson);
    surcoat.position.y = 0.64;
    bodyGroup.add(surcoat);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mats.skin);
    head.position.y = 1.42;
    bodyGroup.add(head);

    const helm = makeSlavicHelm(mats.iron, mats.darkIron, 0.92, false);
    helm.position.y = 1.48;
    bodyGroup.add(helm);

    rightArm.position.set(0.29, 1.12, 0);
    const axeHaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.96, 7), mats.oak);
    axeHaft.position.set(0, -0.05, 0.22);
    axeHaft.rotation.x = Math.PI * 0.35;
    rightArm.add(axeHaft);
    const blade = new THREE.Mesh(_sharedAxeBladeGeo, mats.iron);
    blade.position.set(0, 0.25, 0.48);
    blade.rotation.y = Math.PI / 2;
    blade.scale.setScalar(0.75);
    rightArm.add(blade);
    bodyGroup.add(rightArm);

    leftArm.position.set(-0.31, 1.08, 0);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), mats.shieldFace);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(-0.04, -0.1, 0.16);
    shield.castShadow = true;
    leftArm.add(shield);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.028, 6, 16), mats.iron);
    rim.position.set(-0.04, -0.1, 0.17);
    leftArm.add(rim);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), mats.iron);
    boss.position.set(-0.04, -0.1, 0.2);
    leftArm.add(boss);
    bodyGroup.add(leftArm);
  } else if (kind === 'luchnik') {
    radius = 0.5;
    barY = 2.15;
    for (const sx of [-0.11, 0.11]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.52, 7), mats.leather);
      leg.position.set(sx, 0.26, 0);
      bodyGroup.add(leg);
    }
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, 0.74, 9), mats.cloakGreen);
    torso.position.y = 0.88;
    torso.castShadow = true;
    bodyGroup.add(torso);

    cloakMesh = new THREE.Mesh(_sharedRangerCloakGeo, mats.cloakGreen);
    cloakMesh.position.set(0, 0.92, -0.22);
    cloakMesh.rotation.x = 0.18;
    bodyGroup.add(cloakMesh);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 10), mats.fur);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.26;
    bodyGroup.add(collar);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.36, 9), mats.cloakGreen);
    hood.position.y = 1.48;
    bodyGroup.add(hood);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mats.skin);
    face.position.set(0, 1.38, 0.04);
    bodyGroup.add(face);

    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.52, 7), mats.leather);
    quiver.position.set(-0.15, 1.05, -0.24);
    quiver.rotation.z = -0.32;
    bodyGroup.add(quiver);

    leftArm.position.set(-0.24, 1.1, 0.12);
    const bowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.18, -0.42, 0.15),
      new THREE.Vector3(0.22, -0.18, 0.35),
      new THREE.Vector3(0.22, 0.18, 0.35),
      new THREE.Vector3(0.18, 0.42, 0.15),
    ]);
    const bow = new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 12, 0.025, 6, false), mats.oak);
    leftArm.add(bow);
    const bowString = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.84, 4), mats.linen);
    bowString.position.set(0.18, 0, 0.15);
    leftArm.add(bowString);
    bodyGroup.add(leftArm);

    rightArm.position.set(0.24, 1.1, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.4, 7), mats.cloakGreen);
    armR.position.set(0, -0.15, 0.1);
    armR.rotation.x = -0.5;
    rightArm.add(armR);
    bodyGroup.add(rightArm);
  } else if (kind === 'volkhv') {
    radius = 0.56;
    barY = 2.45;
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 1.26, 10), mats.fur);
    robe.position.y = 0.63;
    robe.castShadow = true;
    bodyGroup.add(robe);

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.24, 10), mats.crimson);
    sash.position.y = 0.92;
    bodyGroup.add(sash);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mats.skin);
    head.position.y = 1.44;
    bodyGroup.add(head);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.18), mats.bone);
    mask.position.set(0, 1.47, 0.07);
    bodyGroup.add(mask);
    for (const sx of [-1, 1]) {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.042, 0.52, 6), mats.bone);
      antler.position.set(sx * 0.2, 1.74, 0);
      antler.rotation.z = -sx * 0.46;
      bodyGroup.add(antler);
    }

    rightArm.position.set(0.32, 1.15, 0);
    const staffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, -0.9, 0.14),
      new THREE.Vector3(0.06, -0.1, 0.16),
      new THREE.Vector3(0.02, 0.48, 0.2),
      new THREE.Vector3(0.05, 0.78, 0.16),
    ]);
    const staff = new THREE.Mesh(new THREE.TubeGeometry(staffCurve, 12, 0.036, 7, false), mats.bark);
    staff.castShadow = true;
    rightArm.add(staff);

    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 6, 16), mats.gold);
    haloRing.position.set(0.05, 0.9, 0.16);
    rightArm.add(haloRing);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mats.emberCore);
    crystal.position.set(0.05, 0.9, 0.16);
    rightArm.add(crystal);
    bodyGroup.add(rightArm);
    bodyGroup.add(leftArm);
  } else if (kind === 'strelomet') {
    radius = 0.78;
    barY = 2.15;

    // 4 heavy iron-rimmed oak wheels
    for (const wx of [-0.48, 0.48]) {
      for (const wz of [-0.42, 0.42]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), mats.oak);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.28, wz);
        wheel.castShadow = true;
        bodyGroup.add(wheel);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.032, 6, 14), mats.darkIron);
        rim.rotation.y = Math.PI / 2;
        rim.position.set(wx, 0.28, wz);
        bodyGroup.add(rim);

        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), mats.iron);
        hub.position.set(wx > 0 ? wx + 0.05 : wx - 0.05, 0.28, wz);
        bodyGroup.add(hub);
      }
    }

    // Chassis axles & longitudinal deck
    for (const wz of [-0.42, 0.42]) {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.04, 8), mats.darkIron);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, 0.28, wz);
      bodyGroup.add(axle);
    }

    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 1.15), mats.timber);
    bed.position.set(0, 0.46, 0);
    bed.castShadow = true;
    bodyGroup.add(bed);

    const mountPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.42, 8), mats.darkIron);
    mountPost.position.set(0, 0.68, 0.06);
    bodyGroup.add(mountPost);

    // Ballista stock & iron flight trough
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 1.45), mats.oak);
    stock.position.set(0, 0.92, 0.18);
    stock.rotation.x = -0.08;
    stock.castShadow = true;
    bodyGroup.add(stock);

    const ironRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 1.42), mats.iron);
    ironRail.position.set(0, 1.02, 0.18);
    ironRail.rotation.x = -0.08;
    bodyGroup.add(ironRail);

    // Dual brass-bound torsion capstans & flexing arms
    for (const sx of [-1, 1]) {
      const capstan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.44, 8), mats.gold);
      capstan.position.set(sx * 0.26, 0.98, 0.56);
      bodyGroup.add(capstan);

      const bowArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.85, 7), mats.oak);
      bowArm.rotation.z = sx * (Math.PI / 2 - 0.18);
      bowArm.rotation.y = sx * 0.24;
      bowArm.position.set(sx * 0.58, 1.0, 0.46);
      bowArm.castShadow = true;
      bodyGroup.add(bowArm);
    }

    // Cocked iron siege bolt ready on rail
    const readyBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 6), mats.oak);
    readyBolt.rotation.x = Math.PI / 2 - 0.08;
    readyBolt.position.set(0, 1.07, 0.45);
    bodyGroup.add(readyBolt);

    const boltTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 6), mats.iron);
    boltTip.rotation.x = Math.PI / 2 - 0.08;
    boltTip.position.set(0, 1.11, 1.02);
    bodyGroup.add(boltTip);

    // Rear windlass crank attached to rightArm for firing animation
    rightArm.position.set(0.24, 0.92, -0.45);
    const crank = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), mats.gold);
    crank.position.set(0, 0.08, -0.05);
    rightArm.add(crank);
    bodyGroup.add(rightArm);
    bodyGroup.add(leftArm);
  } else if (kind === 'kholop') {
    radius = 0.46;
    barY = 1.98;
    for (const sx of [-0.11, 0.11]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.45, 7), mats.leather);
      leg.position.set(sx, 0.23, 0);
      bodyGroup.add(leg);
    }
    const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.66, 9), mats.linen);
    tunic.position.y = 0.78;
    tunic.castShadow = true;
    bodyGroup.add(tunic);

    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.46, 0.06), mats.leather);
    apron.position.set(0, 0.65, 0.21);
    bodyGroup.add(apron);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.skin);
    head.position.y = 1.28;
    bodyGroup.add(head);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.175, 0.17, 9), mats.fur);
    cap.position.y = 1.4;
    bodyGroup.add(cap);

    rightArm.position.set(0.24, 1.0, 0);
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.74, 6), mats.oak);
    pick.position.set(0, -0.1, 0.16);
    pick.rotation.x = Math.PI * 0.35;
    rightArm.add(pick);
    const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.28), mats.iron);
    pickHead.position.set(0, 0.18, 0.34);
    pickHead.rotation.x = Math.PI * 0.35;
    rightArm.add(pickHead);
    bodyGroup.add(rightArm);

    carryMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mats.gold);
    carryMesh.position.set(0, 1.05, -0.26);
    carryMesh.visible = false;
    bodyGroup.add(carryMesh);
    bodyGroup.add(leftArm);
  } else if (kind === 'upyr') {
    radius = 0.5;
    barY = 1.98;
    for (const sx of [-0.14, 0.14]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.052, 0.52, 7), mats.navFlesh);
      leg.position.set(sx, 0.26, 0);
      bodyGroup.add(leg);
    }
    const loincloth = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.26, 0.34, 7), mats.navCloth);
    loincloth.position.set(0, 0.52, 0.02);
    bodyGroup.add(loincloth);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.16, 0.64, 8), mats.navFlesh);
    torso.position.set(0, 0.84, 0.08);
    torso.rotation.x = 0.48;
    torso.castShadow = true;
    bodyGroup.add(torso);

    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 5), mats.bone);
      spine.position.set(0, 0.72 + i * 0.16, -0.07 + i * 0.05);
      spine.rotation.x = -0.7;
      bodyGroup.add(spine);
    }

    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 7), mats.navCloth);
    cowl.position.set(0, 1.24, 0.2);
    cowl.rotation.x = 0.35;
    bodyGroup.add(cowl);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), mats.bone);
    head.position.set(0, 1.16, 0.28);
    bodyGroup.add(head);

    for (const sx of [-0.055, 0.055]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), mats.navGlow);
      eye.position.set(sx, 1.17, 0.41);
      bodyGroup.add(eye);
    }

    rightArm.position.set(0.26, 0.96, 0.16);
    leftArm.position.set(-0.26, 0.96, 0.16);
    for (const arm of [rightArm, leftArm]) {
      const clawArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.68, 7), mats.navFlesh);
      clawArm.position.set(0, -0.22, 0.22);
      clawArm.rotation.x = -0.7;
      arm.add(clawArm);
      const claws = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), mats.darkIron);
      claws.position.set(0, -0.44, 0.44);
      claws.rotation.x = Math.PI * 0.7;
      arm.add(claws);
      bodyGroup.add(arm);
    }
  } else if (kind === 'likho') {
    radius = 0.52;
    barY = 2.4;
    const pts = [
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.32, 0.45),
      new THREE.Vector2(0.24, 1.05),
      new THREE.Vector2(0.16, 1.48),
    ];
    const shroud = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), mats.navCloth);
    shroud.position.y = 0.15;
    shroud.castShadow = true;
    bodyGroup.add(shroud);

    const boneMantle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 6, 10), mats.bone);
    boneMantle.rotation.x = Math.PI / 2;
    boneMantle.position.y = 1.45;
    bodyGroup.add(boneMantle);

    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), mats.bone);
    skull.position.set(0, 1.66, 0.06);
    bodyGroup.add(skull);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), mats.navGlow);
    eye.position.set(0, 1.67, 0.18);
    bodyGroup.add(eye);

    rightArm.position.set(0.3, 1.32, 0);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 1.36, 7), mats.bark);
    staff.position.set(0, -0.1, 0.22);
    rightArm.add(staff);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 5, 8), mats.darkIron);
    cage.position.set(0, 0.54, 0.26);
    rightArm.add(cage);
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), mats.navGlow);
    lantern.position.set(0, 0.54, 0.26);
    rightArm.add(lantern);
    bodyGroup.add(rightArm);
    bodyGroup.add(leftArm);
  } else if (kind === 'morovik') {
    radius = 0.7;
    barY = 2.6;
    for (const sx of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.1, 0.6, 8), mats.darkIron);
      leg.position.set(sx, 0.3, 0);
      bodyGroup.add(leg);
    }
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.85, 10), mats.darkIron);
    chest.position.y = 1.02;
    chest.castShadow = true;
    bodyGroup.add(chest);

    for (const sx of [-0.4, 0.4]) {
      const paul = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 6), mats.darkIron);
      paul.position.set(sx, 1.46, 0);
      paul.rotation.z = -sx * 0.7;
      bodyGroup.add(paul);
    }

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mats.navGlow);
    core.position.set(0, 1.06, 0.29);
    bodyGroup.add(core);

    const helm = makeSlavicHelm(mats.darkIron, mats.navGlow, 1.08, true);
    helm.position.y = 1.56;
    bodyGroup.add(helm);

    rightArm.position.set(0.42, 1.25, 0);
    const maulHaft = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.3, 7), mats.darkIron);
    maulHaft.position.set(0, -0.1, 0.28);
    maulHaft.rotation.x = Math.PI * 0.36;
    rightArm.add(maulHaft);
    const maulHead = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.44, 8), mats.darkIron);
    maulHead.position.set(0, 0.34, 0.64);
    maulHead.rotation.x = Math.PI * 0.86;
    rightArm.add(maulHead);
    bodyGroup.add(rightArm);

    leftArm.position.set(-0.44, 1.2, 0);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 0.58), mats.darkIron);
    shield.position.set(-0.08, -0.15, 0.24);
    shield.rotation.y = 0.22;
    shield.castShadow = true;
    leftArm.add(shield);
    bodyGroup.add(leftArm);
  } else if (kind === 'leshy') {
    radius = 1.15;
    barY = 3.95;
    for (const sx of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.08, 8), mats.bark);
      leg.position.set(sx, 0.54, 0);
      leg.castShadow = true;
      bodyGroup.add(leg);
    }
    const trunkPts = [
      new THREE.Vector2(0.48, 0),
      new THREE.Vector2(0.62, 0.55),
      new THREE.Vector2(0.7, 1.15),
      new THREE.Vector2(0.45, 1.55),
    ];
    const trunk = new THREE.Mesh(new THREE.LatheGeometry(trunkPts, 10), mats.bark);
    trunk.position.y = 0.95;
    trunk.castShadow = true;
    bodyGroup.add(trunk);

    const heartRune = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mats.navGlow);
    heartRune.position.set(0, 1.82, 0.54);
    bodyGroup.add(heartRune);

    const skullHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), mats.bone);
    skullHead.position.set(0, 2.66, 0.16);
    bodyGroup.add(skullHead);

    for (const sx of [-1, 1]) {
      const mainAntler = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.095, 1.15, 7), mats.bone);
      mainAntler.position.set(sx * 0.4, 3.15, 0);
      mainAntler.rotation.z = -sx * 0.44;
      bodyGroup.add(mainAntler);

      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.055, 0.56, 6), mats.bone);
      tine.position.set(sx * 0.66, 3.32, 0.12);
      tine.rotation.z = -sx * 0.85;
      bodyGroup.add(tine);
    }

    rightArm.position.set(0.78, 2.15, 0);
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.11, 2.2, 8), mats.bark);
    club.position.set(0.1, -0.35, 0.48);
    club.rotation.x = Math.PI * 0.35;
    club.castShadow = true;
    rightArm.add(club);
    const clubVine = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 5, 10), mats.navGlow);
    clubVine.position.set(0.12, 0.25, 0.96);
    clubVine.rotation.x = Math.PI * 0.35;
    rightArm.add(clubVine);
    bodyGroup.add(rightArm);

    leftArm.position.set(-0.78, 2.08, 0);
    const clawArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 1.32, 8), mats.bark);
    clawArm.position.set(-0.08, -0.45, 0.28);
    clawArm.rotation.x = -0.35;
    leftArm.add(clawArm);
    bodyGroup.add(leftArm);
  }

  const shadowDisc = addShadowDisc(root, textures, radius);
  const hud = addSelectionAndHp(root, textures, radius, barY, isEnemy);
  return {
    root,
    bodyGroup,
    rightArm,
    leftArm,
    headGroup,
    cloakMesh,
    shadowDisc,
    carryMesh,
    ...hud,
  };
}

export function buildBuildingMesh(
  kind: BuildingKind,
  mats: MaterialPalette,
  textures: GameTextureSet,
): {
  root: THREE.Group;
  structureGroup: THREE.Group;
  scaffoldGroup: THREE.Group;
  selectionRing: THREE.Mesh;
  hpBg: THREE.Mesh;
  hpFill: THREE.Mesh;
  flameMesh?: THREE.Group | THREE.Mesh;
  orbitShards?: THREE.Group;
} {
  const root = new THREE.Group();
  const structureGroup = new THREE.Group();
  root.add(structureGroup);
  const scaffoldGroup = new THREE.Group();
  scaffoldGroup.visible = false;
  root.add(scaffoldGroup);

  const isEnemy = kind === 'monolith';
  let radius = 2.6;
  let barY = 5.4;
  let flameMesh: THREE.Group | THREE.Mesh | undefined;
  let orbitShards: THREE.Group | undefined;

  if (kind === 'detinets') {
    radius = 3.2;
    barY = 6.4;
    addCourtyardDecal(root, textures.courtyardDecalTex, 5.2);

    const stoneBase = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.55, 0.85, 8), mats.stone);
    stoneBase.position.y = 0.42;
    stoneBase.castShadow = true;
    stoneBase.receiveShadow = true;
    structureGroup.add(stoneBase);

    const logKeep = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.55, 2.45, 8), mats.timber);
    logKeep.position.y = 1.95;
    logKeep.castShadow = true;
    logKeep.receiveShadow = true;
    structureGroup.add(logKeep);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.4, 6), mats.oak);
      beam.position.set(Math.cos(a) * 2.42, 1.95, Math.sin(a) * 2.42);
      beam.castShadow = true;
      structureGroup.add(beam);
    }

    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.38, 8), mats.roofSlate);
    lowerRoof.position.y = 3.72;
    lowerRoof.castShadow = true;
    structureGroup.add(lowerRoof);

    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.48, 8), mats.roofSlate);
    upperRoof.position.y = 4.68;
    upperRoof.castShadow = true;
    structureGroup.add(upperRoof);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.95, 8), mats.gold);
    spire.position.y = 5.78;
    structureGroup.add(spire);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.35;
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.14), mats.hearthWindow);
      win.position.set(Math.cos(a) * 2.4, 2.15, Math.sin(a) * 2.4);
      win.rotation.y = -a + Math.PI / 2;
      structureGroup.add(win);
    }

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.2, 0.68), mats.stone);
    chimney.position.set(-1.3, 3.9, -1.1);
    chimney.castShadow = true;
    structureGroup.add(chimney);

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.88, 3.5, 8), mats.timber);
    turret.position.set(1.9, 2.15, -1.4);
    turret.castShadow = true;
    structureGroup.add(turret);

    const turretRoof = new THREE.Mesh(new THREE.ConeGeometry(1.08, 1.35, 8), mats.roofSlate);
    turretRoof.position.set(1.9, 4.5, -1.4);
    turretRoof.castShadow = true;
    structureGroup.add(turretRoof);

    const porch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 1.3), mats.timber);
    porch.position.set(0, 1.35, 2.35);
    porch.castShadow = true;
    structureGroup.add(porch);

    const porchRoof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.85, 4), mats.roofSlate);
    porchRoof.position.set(0, 2.7, 2.35);
    porchRoof.rotation.y = Math.PI / 4;
    structureGroup.add(porchRoof);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.5, 0.06), mats.crimson);
    banner.position.set(-1.35, 2.55, 2.15);
    structureGroup.add(banner);

    const brazierBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.22, 0.55, 8), mats.darkIron);
    brazierBowl.position.set(1.45, 1.05, 2.25);
    structureGroup.add(brazierBowl);

    flameMesh = makeVolumetricFire(mats, 1.0);
    flameMesh.position.set(1.45, 1.32, 2.25);
    structureGroup.add(flameMesh);
  } else if (kind === 'kazarma') {
    radius = 2.6;
    barY = 4.6;
    addCourtyardDecal(root, textures.courtyardDecalTex, 4.4);

    const base = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.58, 3.7), mats.stone);
    base.position.y = 0.29;
    base.receiveShadow = true;
    structureGroup.add(base);

    const hall = new THREE.Mesh(new THREE.BoxGeometry(3.95, 1.95, 3.15), mats.timber);
    hall.position.y = 1.48;
    hall.castShadow = true;
    hall.receiveShadow = true;
    structureGroup.add(hall);

    const roof = new THREE.Mesh(_sharedBarracksRoofGeo, mats.roofSlate);
    roof.position.y = 3.22;
    roof.castShadow = true;
    structureGroup.add(roof);

    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.4, 8), mats.oak);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.y = 4.15;
    structureGroup.add(ridge);

    const konyokFinial = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.52, 6), mats.gold);
    konyokFinial.position.set(0, 4.42, 2.05);
    structureGroup.add(konyokFinial);

    for (const sx of [-1.1, 1.1]) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 12), mats.shieldFace);
      sh.rotation.x = Math.PI / 2;
      sh.position.set(sx, 1.58, 1.62);
      structureGroup.add(sh);
    }

    const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.14), mats.hearthWindow);
    win.position.set(0, 1.65, 1.62);
    structureGroup.add(win);

    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.45), mats.darkIron);
    anvil.position.set(2.25, 0.82, 1.1);
    anvil.castShadow = true;
    structureGroup.add(anvil);

    const forgePit = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.45, 8), mats.stone);
    forgePit.position.set(2.15, 0.45, 0.2);
    structureGroup.add(forgePit);

    flameMesh = makeVolumetricFire(mats, 0.9);
    flameMesh.position.set(2.15, 0.68, 0.2);
    structureGroup.add(flameMesh);
  } else if (kind === 'kapishche') {
    radius = 2.2;
    barY = 4.7;
    addCourtyardDecal(root, textures.courtyardDecalTex, 3.8);

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.45, 0.5, 12), mats.stone);
    dais.position.y = 0.25;
    dais.receiveShadow = true;
    structureGroup.add(dais);

    const idol = new THREE.Mesh(new THREE.BoxGeometry(0.78, 3.2, 0.78), mats.timber);
    idol.position.y = 1.95;
    idol.castShadow = true;
    structureGroup.add(idol);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.68, 4), mats.gold);
    cap.position.y = 3.82;
    cap.rotation.y = Math.PI / 4;
    structureGroup.add(cap);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const menhir = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.5, 0.36), mats.stone);
      menhir.position.set(Math.cos(a) * 1.58, 0.92, Math.sin(a) * 1.58);
      menhir.rotation.y = -a;
      menhir.castShadow = true;
      structureGroup.add(menhir);
    }

    const altarBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.55, 8), mats.darkIron);
    altarBowl.position.set(0, 0.72, 1.18);
    structureGroup.add(altarBowl);

    flameMesh = makeVolumetricFire(mats, 0.85);
    flameMesh.position.set(0, 0.98, 1.18);
    structureGroup.add(flameMesh);
  } else if (kind === 'vezha') {
    radius = 1.75;
    barY = 5.65;
    addCourtyardDecal(root, textures.courtyardDecalTex, 3.2);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.75, 1.15, 8), mats.stone);
    base.position.y = 0.57;
    base.castShadow = true;
    structureGroup.add(base);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.75, 1.65), mats.timber);
    shaft.position.y = 2.42;
    shaft.castShadow = true;
    structureGroup.add(shaft);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.72, 2.2), mats.timber);
    parapet.position.y = 3.9;
    parapet.castShadow = true;
    structureGroup.add(parapet);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.82, 1.4, 4), mats.roofSlate);
    roof.position.y = 4.92;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    structureGroup.add(roof);

    flameMesh = makeVolumetricFire(mats, 0.7);
    flameMesh.position.set(0, 4.05, 1.18);
    structureGroup.add(flameMesh);
  } else if (kind === 'monolith') {
    radius = 2.9;
    barY = 7.2;
    addCourtyardDecal(root, textures.cursedDecalTex, 5.8);

    const mound = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.3, 0.75, 10), mats.obsidian);
    mound.position.y = 0.37;
    mound.receiveShadow = true;
    structureGroup.add(mound);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const menhir = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 5), mats.obsidian);
      menhir.position.set(Math.cos(a) * 1.95, 1.35, Math.sin(a) * 1.95);
      menhir.rotation.z = Math.cos(a) * 0.22;
      menhir.rotation.x = -Math.sin(a) * 0.22;
      menhir.castShadow = true;
      structureGroup.add(menhir);
    }

    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.22, 5.8, 6), mats.obsidian);
    spire.position.y = 3.35;
    spire.castShadow = true;
    structureGroup.add(spire);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), mats.navGlow);
    core.position.set(0, 2.65, 0.78);
    structureGroup.add(core);
    flameMesh = core;

    orbitShards = new THREE.Group();
    orbitShards.position.y = 4.55;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.92, 4), mats.navGlow);
      shard.position.set(Math.cos(a) * 1.65, (i % 2) * 0.35, Math.sin(a) * 1.65);
      orbitShards.add(shard);
    }
    structureGroup.add(orbitShards);
  } else if (kind === 'merchant') {
    radius = 2.2;
    barY = 4.65;
    addCourtyardDecal(root, textures.courtyardDecalTex, 4.2);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 0.34, 8), mats.stone);
    platform.position.y = 0.17;
    platform.receiveShadow = true;
    structureGroup.add(platform);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.55, 7), mats.oak);
      post.position.set(Math.cos(a) * 1.65, 1.45, Math.sin(a) * 1.65);
      post.castShadow = true;
      structureGroup.add(post);
    }

    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.45, 4), mats.crimson);
    canopy.position.y = 3.22;
    canopy.rotation.y = Math.PI / 4;
    canopy.castShadow = true;
    structureGroup.add(canopy);

    const canopyTrim = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.02, 0.22, 4), mats.gold);
    canopyTrim.position.y = 2.52;
    canopyTrim.rotation.y = Math.PI / 4;
    structureGroup.add(canopyTrim);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 6), mats.gold);
    finial.position.y = 4.18;
    structureGroup.add(finial);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.78, 0.68), mats.timber);
    counter.position.set(0, 0.72, 1.05);
    counter.castShadow = true;
    structureGroup.add(counter);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.44, 0.46), mats.oak);
    chest.position.set(-0.55, 1.32, 1.05);
    structureGroup.add(chest);
    const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.69, 0.1, 0.5), mats.gold);
    chestTrim.position.set(-0.55, 1.5, 1.05);
    structureGroup.add(chestTrim);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.55), mats.timber);
    crate.position.set(1.25, 0.58, 0.75);
    crate.castShadow = true;
    structureGroup.add(crate);

    flameMesh = makeVolumetricFire(mats, 0.78);
    flameMesh.position.set(0.62, 1.32, 1.05);
    structureGroup.add(flameMesh);
  } else if (kind === 'fountain') {
    radius = 2.0;
    barY = 4.5;
    addCourtyardDecal(root, textures.courtyardDecalTex, 4.1);

    const outerBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.25, 0.56, 12), mats.stone);
    outerBasin.position.y = 0.28;
    outerBasin.receiveShadow = true;
    outerBasin.castShadow = true;
    structureGroup.add(outerBasin);

    const basinRim = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.2, 8, 18), mats.stone);
    basinRim.rotation.x = Math.PI / 2;
    basinRim.position.y = 0.62;
    basinRim.castShadow = true;
    structureGroup.add(basinRim);

    const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.12, 16), mats.runeCyan);
    waterPool.position.y = 0.56;
    structureGroup.add(waterPool);

    const centerSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.54, 1.75, 8), mats.stone);
    centerSpire.position.y = 1.15;
    centerSpire.castShadow = true;
    structureGroup.add(centerSpire);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.65, 0.34), mats.stone);
      pillar.position.set(Math.cos(a) * 1.78, 1.15, Math.sin(a) * 1.78);
      pillar.castShadow = true;
      structureGroup.add(pillar);

      const runeGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), mats.runeCyan);
      runeGem.position.set(Math.cos(a) * 1.78, 2.15, Math.sin(a) * 1.78);
      structureGroup.add(runeGem);
    }

    const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), mats.runeCyan);
    coreCrystal.position.y = 2.45;
    flameMesh = coreCrystal;
    structureGroup.add(coreCrystal);

    orbitShards = new THREE.Group();
    orbitShards.position.y = 2.5;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mats.runeCyan);
      mote.position.set(Math.cos(a) * 1.05, (i % 2) * 0.2, Math.sin(a) * 1.05);
      orbitShards.add(mote);
    }
    structureGroup.add(orbitShards);
  }

  // Timber construction scaffolding around site perimeter
  const scafR = radius * 0.92;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), mats.oak);
    pole.position.set(Math.cos(a) * scafR, 1.6, Math.sin(a) * scafR);
    scaffoldGroup.add(pole);

    const nextA = ((i + 1) / 4) * Math.PI * 2 + Math.PI / 4;
    const mx = (Math.cos(a) + Math.cos(nextA)) * scafR * 0.5;
    const mz = (Math.sin(a) + Math.sin(nextA)) * scafR * 0.5;
    const len = Math.hypot(Math.cos(nextA) - Math.cos(a), Math.sin(nextA) - Math.sin(a)) * scafR;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.12), mats.timber);
    rail.position.set(mx, 2.1, mz);
    rail.rotation.y = -Math.atan2(Math.sin(nextA) - Math.sin(a), Math.cos(nextA) - Math.cos(a));
    scaffoldGroup.add(rail);
  }

  addShadowDisc(root, textures, radius * 1.12);
  const hud = addSelectionAndHp(root, textures, radius, barY, isEnemy);
  return {
    root,
    structureGroup,
    scaffoldGroup,
    selectionRing: hud.selectionRing,
    hpBg: hud.hpBg,
    hpFill: hud.hpFill,
    flameMesh,
    orbitShards,
  };
}

export function buildResourceMesh(
  kind: ResourceKind,
  mats: MaterialPalette,
  textures: GameTextureSet,
): THREE.Group {
  const root = new THREE.Group();
  if (kind === 'gold') {
    addCourtyardDecal(root, textures.courtyardDecalTex, 2.8);
    const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), mats.stone);
    baseRock.position.y = 0.8;
    baseRock.scale.set(1.25, 0.85, 1.05);
    baseRock.castShadow = true;
    root.add(baseRock);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const seam = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mats.gold);
      seam.position.set(Math.cos(a) * 0.78, 0.55 + (i % 2) * 0.32, Math.sin(a) * 0.78);
      seam.castShadow = true;
      root.add(seam);
    }
    addShadowDisc(root, textures, 1.75);
  } else {
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x16291c,
      roughness: 0.94,
      roughnessMap: textures.barkRoughness,
      normalMap: textures.barkNormal,
      metalness: 0.02,
      envMapIntensity: 0.22,
    });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const dist = 0.98;
      const tx = Math.cos(a) * dist;
      const tz = Math.sin(a) * dist;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.25, 7), mats.bark);
      trunk.position.set(tx, 1.12, tz);
      trunk.castShadow = true;
      root.add(trunk);

      for (let tier = 0; tier < 3; tier++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0 - tier * 0.22, 1.35, 8), foliageMat);
        cone.position.set(tx, 2.0 + tier * 0.76, tz);
        cone.castShadow = true;
        root.add(cone);
      }
    }
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.35, 8), mats.timber);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.18 + (i === 2 ? 0.24 : 0), i === 2 ? 0 : i * 0.32 - 0.16);
      log.castShadow = true;
      root.add(log);
    }
    addShadowDisc(root, textures, 2.15);
  }
  return root;
}

export function buildSlavicTotemProp(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 0.45, 7), mats.stone);
  base.position.y = 0.22;
  base.receiveShadow = true;
  g.add(base);

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.9, 0.55), mats.timber);
  post.position.y = 1.75;
  post.castShadow = true;
  g.add(post);

  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 4), mats.oak);
  hat.position.y = 3.45;
  hat.rotation.y = Math.PI / 4;
  g.add(hat);

  const sunRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 6, 12), mats.gold);
  sunRing.position.set(0, 2.55, 0.3);
  g.add(sunRing);

  const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.28, 6), mats.darkIron);
  brazier.position.set(0.45, 2.15, 0);
  g.add(brazier);

  const flame = makeVolumetricFire(mats, 0.55);
  flame.position.set(0.45, 2.3, 0);
  g.add(flame);
  return g;
}

export function buildRunicArchProp(mats: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1.45, 1.45]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.2, 0.72), mats.stone);
    pillar.position.set(sx, 1.55, 0);
    pillar.rotation.z = sx > 0 ? 0.08 : -0.08;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    g.add(pillar);

    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.76), mats.runeCyan);
    rune.position.set(sx, 1.75, 0);
    g.add(rune);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.65, 0.92), mats.stone);
  lintel.position.set(0, 3.25, 0);
  lintel.castShadow = true;
  g.add(lintel);
  return g;
}

export function buildCampfireProp(mats: MaterialPalette): { group: THREE.Group; flame: THREE.Group } {
  const group = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mats.stone);
    rock.position.set(Math.cos(a) * 0.46, 0.1, Math.sin(a) * 0.46);
    group.add(rock);
  }
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.75, 6), mats.oak);
    log.position.set(0, 0.12, 0);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 3) * Math.PI;
    group.add(log);
  }
  const flame = makeVolumetricFire(mats, 0.95);
  flame.position.y = 0.16;
  group.add(flame);
  return { group, flame };
}

export function buildRelicMesh(relicId: RelicId, mats: MaterialPalette): THREE.Group {
  const root = new THREE.Group();
  const def = RELIC_DEFS[relicId];

  // Ground glow halo
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.68, 24),
    new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.04;
  root.add(halo);

  // Carved oak & iron reliquary chest
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.48), mats.oak);
  chest.position.y = 0.22;
  chest.castShadow = true;
  root.add(chest);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.52), mats.gold);
  trim.position.y = 0.42;
  root.add(trim);

  // Floating rotating rune gem / vial above chest
  const gemMat = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: def.color,
    emissiveIntensity: 1.85,
    roughness: 0.2,
    metalness: 0.25,
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), gemMat);
  gem.position.y = 0.92;
  gem.name = 'relic_gem';
  root.add(gem);

  return root;
}
