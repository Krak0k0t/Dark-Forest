import { getMapLayout, getRiverDistance } from './biomes';
import {
  BUILDING_STATS,
  CHAPTER_DEFS,
  INITIAL_HERO2_ABILITIES,
  INITIAL_HERO_ABILITIES,
  PLAYABLE_HALF_SIZE,
  RELIC_DEFS,
  UNIT_STATS,
  UPGRADE_DEFS,
} from './constants';
import { createFogGrid, updateFogOfWar } from './fog';
import { DIFFICULTY_MODIFIERS } from './settings';
import {
  AbilityId,
  BuildingEntity,
  BuildingKind,
  ChapterId,
  DifficultyLevel,
  Faction,
  FormationKind,
  RelicId,
  ResourceKind,
  ResourceNode,
  UnitEntity,
  UnitKind,
  UpgradeId,
  WorldState,
} from './types';

export function getUpgradeCost(upgradeId: UpgradeId, currentLevel: number): { gold: number; wood: number } {
  const def = UPGRADE_DEFS[upgradeId];
  return {
    gold: def.goldBase + currentLevel * def.goldStep,
    wood: def.woodBase + currentLevel * def.woodStep,
  };
}

export function getBuildingUpgrades(kind: BuildingKind): UpgradeId[] {
  if (kind === 'detinets') return ['oak_shields'];
  if (kind === 'kazarma') return ['forged_blades', 'bodkin_arrows'];
  if (kind === 'kapishche') return ['rod_blessing'];
  return [];
}

export function getUnitEffectiveStats(
  world: WorldState,
  u: UnitEntity,
): {
  damage: number;
  armor: number;
  maxHp: number;
  maxMp: number;
  moveSpeed: number;
  attackCooldown: number;
} {
  const s = UNIT_STATS[u.kind];
  const diff = DIFFICULTY_MODIFIERS[world.difficulty];
  const inv = u.inventory ?? [];
  let perunCount = 0;
  let rodCount = 0;
  let svarogCount = 0;
  let velesCount = 0;
  for (const r of inv) {
    if (r === 'perun_amulet') perunCount += 1;
    else if (r === 'rod_ward') rodCount += 1;
    else if (r === 'svarog_ring') svarogCount += 1;
    else if (r === 'veles_cloak') velesCount += 1;
  }

  let upgradeDmg = 0;
  let upgradeArmor = 0;
  if (u.faction === 'player') {
    const forgedLvl = world.upgrades?.forged_blades ?? 0;
    const bodkinLvl = world.upgrades?.bodkin_arrows ?? 0;
    const oakLvl = world.upgrades?.oak_shields ?? 0;
    if (u.kind === 'voivode' || u.kind === 'ratnik' || u.kind === 'kholop' || u.kind === 'spirit_wolf') {
      upgradeDmg += forgedLvl * 4;
    } else if (u.kind === 'luchnik' || u.kind === 'volkhv' || u.kind === 'vedunya' || u.kind === 'strelomet') {
      upgradeDmg += bodkinLvl * 4;
    }
    upgradeArmor += oakLvl * 2;
  }

  const enemyScale = s.faction === 'nav' ? diff.enemyDmgMult : 1;
  const dmgMult =
    (u.buffTimer > 0 ? 1.35 : 1) * (s.isHero ? 1 + (u.level - 1) * 0.16 : 1) * enemyScale;
  const damage = Math.round((s.damage + upgradeDmg + perunCount * 12) * dmgMult);
  const armor = s.armor + upgradeArmor + rodCount * 3;
  const speedMult = (u.buffTimer > 0 ? 1.25 : 1) * (u.slowTimer > 0 ? 0.45 : 1);
  const moveSpeed = (s.moveSpeed + velesCount * 1.1) * speedMult;
  const attackCooldown = s.attackCooldown * Math.pow(0.82, svarogCount);

  return {
    damage,
    armor,
    maxHp: u.maxHp,
    maxMp: u.maxMp,
    moveSpeed,
    attackCooldown,
  };
}

function nextId(world: WorldState, prefix: string): string {
  world.nextEntitySeq += 1;
  return `${prefix}_${world.nextEntitySeq}`;
}

export function createUnit(
  world: WorldState,
  kind: UnitKind,
  x: number,
  z: number,
  order: UnitEntity['order'] = { type: 'idle' },
): UnitEntity {
  const s = UNIT_STATS[kind];
  const diff = DIFFICULTY_MODIFIERS[world.difficulty];
  const hpMult = s.faction === 'nav' ? diff.enemyHpMult : 1;
  const oakHpBonus = s.faction === 'player' ? (world.upgrades?.oak_shields ?? 0) * 30 : 0;
  const maxHp = Math.round(s.maxHp * hpMult) + oakHpBonus;
  return {
    id: nextId(world, kind),
    kind,
    faction: s.faction,
    x,
    y: 0,
    z,
    vx: 0,
    vz: 0,
    facing: s.faction === 'player' ? -Math.PI * 0.25 : Math.PI * 0.75,
    hp: maxHp,
    maxHp,
    mp: s.maxMp,
    maxMp: s.maxMp,
    level: 1,
    xp: 0,
    xpToNext: 120,
    attackTimer: 0,
    windupTimer: 0,
    windupTargetId: null,
    hitFlashTimer: 0,
    buffTimer: 0,
    slowTimer: 0,
    koTimer: 0,
    dead: false,
    inventory: s.isHero ? [] : undefined,
    jumpTime: 0,
    jumpDuration: 0.58,
    jumpStartX: x,
    jumpStartZ: z,
    jumpTargetX: x,
    jumpTargetZ: z,
    jumpCooldown: 0,
    landSquashTimer: 0,
    order,
    bossPhase: kind === 'leshy' ? 1 : undefined,
    bossSlamTimer: world.difficulty === 'nightmare' ? 5.8 : 7.5,
    bossTelegraphTimer: 0,
    bossTelegraphX: x,
    bossTelegraphZ: z,
    stridePhase: Math.random() * Math.PI * 2,
  };
}

export function createBuilding(
  world: WorldState,
  kind: BuildingKind,
  x: number,
  z: number,
): BuildingEntity {
  const s = BUILDING_STATS[kind];
  const diff = DIFFICULTY_MODIFIERS[world.difficulty];
  const maxHp = s.faction === 'nav' ? Math.round(s.maxHp * diff.enemyHpMult) : s.maxHp;
  return {
    id: nextId(world, kind),
    kind,
    faction: s.faction,
    x,
    z,
    hp: maxHp,
    maxHp,
    radius: s.radius,
    attackTimer: 0,
    hitFlashTimer: 0,
    dead: false,
    rallyX: x + 4.5,
    rallyZ: z - 4.5,
    queue: [],
  };
}

export function createInitialWorld(
  phase: WorldState['phase'] = 'title',
  difficulty: DifficultyLevel = 'normal',
  chapter: ChapterId = 1,
): WorldState {
  const diff = DIFFICULTY_MODIFIERS[difficulty];
  const chDef = CHAPTER_DEFS[chapter];
  const world: WorldState = {
    phase,
    outcome: null,
    difficulty,
    chapter,
    formation: 'line',
    elapsed: 0,
    hitstopTimer: 0,
    trauma: 0,
    gold: diff.startingGold + chDef.startingGoldBonus,
    wood: diff.startingWood + chDef.startingWoodBonus,
    wave: 0,
    maxWaves: chDef.waves.length,
    waveTimer: Math.round(chDef.waves[0].delay * diff.waveDelayMult),
    bossSpawned: false,
    kills: 0,
    unitsLost: 0,
    commandMode: 'normal',
    pendingBuildKind: null,
    selectedUnitIds: [],
    selectedBuildingId: null,
    controlGroups: { 1: [], 2: [], 3: [] },
    abilities: INITIAL_HERO_ABILITIES.map((a) => ({ ...a, autocast: false })),
    hero2Abilities: INITIAL_HERO2_ABILITIES.map((a) => ({ ...a, autocast: false })),
    upgrades: {
      forged_blades: 0,
      oak_shields: 0,
      bodkin_arrows: 0,
      rod_blessing: 0,
    },
    relicDrops: [],
    fogGrid: createFogGrid(),
    units: [],
    buildings: [],
    resources: [],
    projectiles: [],
    events: [],
    nextEntitySeq: 0,
    announcementWave: null,
    announcementTimer: 0,
  };

  const layout = getMapLayout(chapter);

  // Player Stronghold Complex (chapter-specific clearing)
  const detinets = createBuilding(world, 'detinets', layout.detinets.x, layout.detinets.z);
  detinets.rallyX = layout.resources.goldHome.x + 2.5;
  detinets.rallyZ = layout.resources.goldHome.z;
  const kazarma = createBuilding(world, 'kazarma', layout.kazarma.x, layout.kazarma.z);
  kazarma.rallyX = layout.rallyDefault.x;
  kazarma.rallyZ = layout.rallyDefault.z;
  const kapishche = createBuilding(world, 'kapishche', layout.kapishche.x, layout.kapishche.z);
  kapishche.rallyX = layout.rallyDefault.x;
  kapishche.rallyZ = layout.rallyDefault.z;
  const vezha = createBuilding(world, 'vezha', layout.vezha.x, layout.vezha.z);
  world.buildings.push(detinets, kazarma, kapishche, vezha);

  // Enemy Cursed Monoliths (Chapter-specific)
  for (const mPos of layout.monoliths) {
    world.buildings.push(createBuilding(world, 'monolith', mPos.x, mPos.z));
  }

  // Neutral Map Landmarks (Veles Trading Tent & Ancestral Spring)
  world.buildings.push(
    createBuilding(world, 'merchant', layout.merchant.x, layout.merchant.z),
    createBuilding(world, 'fountain', layout.fountain.x, layout.fountain.z),
  );

  // Resource nodes
  const goldHome: ResourceNode = {
    id: 'res_gold_home',
    kind: 'gold',
    name: layout.resources.goldHome.name,
    x: layout.resources.goldHome.x,
    z: layout.resources.goldHome.z,
    remaining: layout.resources.goldHome.remaining,
    maxRemaining: layout.resources.goldHome.remaining,
    radius: 1.7,
  };
  const goldContest: ResourceNode = {
    id: 'res_gold_mid',
    kind: 'gold',
    name: layout.resources.goldMid.name,
    x: layout.resources.goldMid.x,
    z: layout.resources.goldMid.z,
    remaining: layout.resources.goldMid.remaining,
    maxRemaining: layout.resources.goldMid.remaining,
    radius: 1.7,
  };
  const woodHome: ResourceNode = {
    id: 'res_wood_home',
    kind: 'wood',
    name: layout.resources.woodHome.name,
    x: layout.resources.woodHome.x,
    z: layout.resources.woodHome.z,
    remaining: layout.resources.woodHome.remaining,
    maxRemaining: layout.resources.woodHome.remaining,
    radius: 2.0,
  };
  world.resources.push(goldHome, goldContest, woodHome);

  // Starting player force
  const hero = createUnit(world, 'voivode', layout.playerUnits.voivode.x, layout.playerUnits.voivode.z);
  hero.inventory = ['living_water'];
  world.units.push(hero);

  for (const rp of layout.playerUnits.ratniks) {
    world.units.push(createUnit(world, 'ratnik', rp.x, rp.z));
  }
  for (const lp of layout.playerUnits.luchniks) {
    world.units.push(createUnit(world, 'luchnik', lp.x, lp.z));
  }

  const k1 = createUnit(world, 'kholop', layout.playerUnits.goldWorker.x, layout.playerUnits.goldWorker.z, {
    type: 'gather',
    nodeId: goldHome.id,
    carrying: null,
    amount: 0,
    returning: false,
  });
  const k2 = createUnit(world, 'kholop', layout.playerUnits.woodWorker.x, layout.playerUnits.woodWorker.z, {
    type: 'gather',
    nodeId: woodHome.id,
    carrying: null,
    amount: 0,
    returning: false,
  });
  world.units.push(k1, k2);

  if (chDef.startWithVedunya && layout.playerUnits.vedunya) {
    const hero2 = createUnit(world, 'vedunya', layout.playerUnits.vedunya.x, layout.playerUnits.vedunya.z);
    hero2.inventory = ['living_water'];
    world.units.push(hero2);
  }
  world.selectedUnitIds = [hero.id];

  // Forward Nav outpost defenders so the battlefield already has tension on exploration
  for (const nav of layout.navOutpost) {
    world.units.push(createUnit(world, nav.kind, nav.x, nav.z));
  }

  // Guarded Creep Camps holding Slavic Relics
  const spawnCreep = (kind: UnitKind, x: number, z: number, dropRelicId?: RelicId) => {
    const u = createUnit(world, kind, x, z);
    u.isCreepGuard = true;
    u.guardX = x;
    u.guardZ = z;
    if (dropRelicId) u.dropRelicId = dropRelicId;
    world.units.push(u);
  };

  for (const cc of layout.creepCamps) {
    spawnCreep(cc.kind, cc.x, cc.z, cc.relic);
  }

  if (layout.initialBoss) {
    const boss = createUnit(world, 'leshy', layout.initialBoss.x, layout.initialBoss.z);
    boss.isCreepGuard = true;
    boss.guardX = layout.initialBoss.x;
    boss.guardZ = layout.initialBoss.z;
    world.units.push(boss);
    world.bossSpawned = true;
  }

  updateFogOfWar(world);
  return world;
}

export function getSupplyCounts(world: WorldState): { used: number; cap: number } {
  let used = 0;
  for (const u of world.units) {
    if (!u.dead && u.faction === 'player') {
      used += UNIT_STATS[u.kind].supplyCost;
    }
  }
  let cap = 0;
  for (const b of world.buildings) {
    if (!b.dead && b.faction === 'player' && !b.underConstruction) {
      cap += BUILDING_STATS[b.kind].supplyProvided;
    }
  }
  return { used, cap };
}

export function canPlaceBuilding(
  world: WorldState,
  kind: BuildingKind,
  x: number,
  z: number,
): { ok: boolean; reason?: string } {
  if (kind !== 'vezha' && kind !== 'kapishche' && kind !== 'kazarma') {
    return { ok: false, reason: 'Invalid building type' };
  }
  const bStats = BUILDING_STATS[kind];
  if (world.gold < bStats.goldCost || world.wood < bStats.woodCost) {
    return { ok: false, reason: 'Insufficient Gold or Timber' };
  }
  const margin = bStats.radius + 0.6;
  if (Math.abs(x) > PLAYABLE_HALF_SIZE - margin || Math.abs(z) > PLAYABLE_HALF_SIZE - margin) {
    return { ok: false, reason: 'Out of playable bounds' };
  }
  // Keep river channel clear for the current chapter's river curve
  const riverDist = getRiverDistance(world.chapter ?? 1, x, z);
  if (riverDist < 3.6 + bStats.radius * 0.45) {
    return { ok: false, reason: 'Cannot build in the river' };
  }
  for (const b of world.buildings) {
    if (b.dead) continue;
    if (Math.hypot(b.x - x, b.z - z) < b.radius + bStats.radius + 1.1) {
      return { ok: false, reason: 'Too close to another building' };
    }
  }
  for (const r of world.resources) {
    if (r.remaining <= 0) continue;
    if (Math.hypot(r.x - x, r.z - z) < r.radius + bStats.radius + 0.9) {
      return { ok: false, reason: 'Too close to resource node' };
    }
  }
  return { ok: true };
}

export function startBuildingConstruction(
  world: WorldState,
  workerIds: string[],
  kind: BuildingKind,
  x: number,
  z: number,
): { ok: boolean; buildingId?: string; reason?: string } {
  const check = canPlaceBuilding(world, kind, x, z);
  if (!check.ok) return { ok: false, reason: check.reason };

  const workers = world.units.filter(
    (u) => !u.dead && u.faction === 'player' && u.kind === 'kholop' && workerIds.includes(u.id),
  );
  if (workers.length === 0) {
    return { ok: false, reason: 'Select a worker to build' };
  }

  const bStats = BUILDING_STATS[kind];
  world.gold -= bStats.goldCost;
  world.wood -= bStats.woodCost;

  const bld = createBuilding(world, kind, x, z);
  bld.underConstruction = true;
  bld.buildProgress = 0.08;
  bld.hp = Math.max(45, Math.round(bStats.maxHp * 0.1));
  world.buildings.push(bld);

  for (const w of workers) {
    w.order = { type: 'build', buildingId: bld.id };
  }

  world.events.push({ type: 'build_start', x, z, faction: 'player' });
  updateFogOfWar(world);
  return { ok: true, buildingId: bld.id };
}

export function setBuildingRallyPoint(world: WorldState, buildingId: string, x: number, z: number): boolean {
  const b = world.buildings.find((item) => item.id === buildingId && !item.dead && item.faction === 'player');
  if (!b) return false;
  b.rallyX = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, x));
  b.rallyZ = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, z));
  world.events.push({ type: 'order_ack', x: b.rallyX, z: b.rallyZ, faction: 'player' });
  return true;
}

export function issueBuildOrder(world: WorldState, workerIds: string[], buildingId: string): void {
  const b = world.buildings.find((item) => item.id === buildingId && !item.dead && item.underConstruction);
  if (!b) return;
  for (const u of world.units) {
    if (!u.dead && u.faction === 'player' && u.kind === 'kholop' && workerIds.includes(u.id)) {
      u.order = { type: 'build', buildingId };
    }
  }
  world.events.push({ type: 'order_ack', x: b.x, z: b.z, faction: 'player' });
}

export function trainUnit(
  world: WorldState,
  buildingId: string,
  unitKind: UnitKind,
): { ok: boolean; reason?: string } {
  const b = world.buildings.find((item) => item.id === buildingId && !item.dead);
  if (!b || b.faction !== 'player' || b.underConstruction) {
    return { ok: false, reason: 'Здание недоступно' };
  }
  const bStats = BUILDING_STATS[b.kind];
  if (!bStats.trainableUnits.includes(unitKind)) {
    return { ok: false, reason: 'Нельзя обучить здесь' };
  }
  if (b.queue.length >= 5) {
    return { ok: false, reason: 'Очередь заполнена' };
  }

  if (unitKind === 'vedunya') {
    const existsOrQueued =
      world.units.some((u) => !u.dead && u.kind === 'vedunya') ||
      world.buildings.some((bld) => !bld.dead && bld.queue.some((q) => q.kind === 'vedunya'));
    if (existsOrQueued) {
      return { ok: false, reason: 'Ведунья уже призвана' };
    }
  }

  const uStats = UNIT_STATS[unitKind];
  const supply = getSupplyCounts(world);
  const queuedSupply = world.buildings
    .filter((bld) => !bld.dead && bld.faction === 'player')
    .reduce(
      (sum, bld) => sum + bld.queue.reduce((qSum, item) => qSum + UNIT_STATS[item.kind].supplyCost, 0),
      0,
    );
  if (supply.used + queuedSupply + uStats.supplyCost > supply.cap) {
    return { ok: false, reason: 'Недостаточно припасов дружины' };
  }
  if (world.gold < uStats.goldCost || world.wood < uStats.woodCost) {
    return { ok: false, reason: 'Недостаточно злата или леса' };
  }

  world.gold -= uStats.goldCost;
  world.wood -= uStats.woodCost;
  b.queue.push({ kind: unitKind, remaining: uStats.trainTime, total: uStats.trainTime });
  return { ok: true };
}

export function researchUpgrade(
  world: WorldState,
  buildingId: string,
  upgradeId: UpgradeId,
): { ok: boolean; reason?: string } {
  const b = world.buildings.find((item) => item.id === buildingId && !item.dead);
  if (!b || b.faction !== 'player' || b.underConstruction) {
    return { ok: false, reason: 'Building unavailable' };
  }
  const def = UPGRADE_DEFS[upgradeId];
  if (def.building !== b.kind) {
    return { ok: false, reason: 'Wrong building' };
  }
  if (b.researchQueue) {
    return { ok: false, reason: 'Already researching' };
  }
  const alreadyResearching = world.buildings.some(
    (bld) => !bld.dead && bld.researchQueue?.id === upgradeId,
  );
  if (alreadyResearching) {
    return { ok: false, reason: 'Research already active' };
  }
  const curLvl = world.upgrades[upgradeId] ?? 0;
  if (curLvl >= def.maxLevel) {
    return { ok: false, reason: 'Max level reached' };
  }
  const cost = getUpgradeCost(upgradeId, curLvl);
  if (world.gold < cost.gold || world.wood < cost.wood) {
    return { ok: false, reason: 'Insufficient resources' };
  }

  world.gold -= cost.gold;
  world.wood -= cost.wood;
  b.researchQueue = { id: upgradeId, remaining: def.researchTime, total: def.researchTime };
  return { ok: true };
}

function equipRelicOnHero(hero: UnitEntity, relicId: RelicId): void {
  if (!hero.inventory) hero.inventory = [];
  hero.inventory.push(relicId);
  if (relicId === 'rod_ward') {
    hero.maxHp += 120;
    hero.hp = Math.min(hero.maxHp, hero.hp + 120);
  } else if (relicId === 'perun_amulet') {
    hero.maxMp += 50;
    hero.mp = Math.min(hero.maxMp, hero.mp + 50);
  }
}

export function pickupRelicForHero(world: WorldState, hero: UnitEntity, dropIndex: number): boolean {
  if (hero.dead || !UNIT_STATS[hero.kind].isHero) return false;
  const drop = world.relicDrops[dropIndex];
  if (!drop) return false;
  if (!hero.inventory) hero.inventory = [];
  if (hero.inventory.length >= 4) return false;

  equipRelicOnHero(hero, drop.relicId);
  world.relicDrops.splice(dropIndex, 1);
  world.events.push({ type: 'relic_pickup', x: drop.x, z: drop.z, label: drop.relicId });
  updateFogOfWar(world);
  return true;
}

export function buyRelicFromMerchant(
  world: WorldState,
  buildingId: string,
  relicId: RelicId,
): { ok: boolean; reason?: string } {
  if (world.phase !== 'playing') return { ok: false, reason: 'Not playing' };
  const merchant = world.buildings.find((b) => b.id === buildingId && !b.dead && b.kind === 'merchant');
  if (!merchant) return { ok: false, reason: 'Merchant not found' };

  const def = RELIC_DEFS[relicId];
  if (!def) return { ok: false, reason: 'Unknown relic' };
  if (world.gold < def.goldCost) {
    return { ok: false, reason: 'Insufficient Gold' };
  }

  const aliveHeroes = world.units.filter(
    (u) => !u.dead && UNIT_STATS[u.kind].isHero && (u.inventory?.length ?? 0) < 4,
  );
  if (aliveHeroes.length === 0) {
    return { ok: false, reason: 'No Hero with open relic slot' };
  }

  aliveHeroes.sort(
    (a, b) =>
      Math.hypot(a.x - merchant.x, a.z - merchant.z) -
      Math.hypot(b.x - merchant.x, b.z - merchant.z),
  );
  const hero = aliveHeroes[0];

  world.gold -= def.goldCost;
  equipRelicOnHero(hero, relicId);
  world.events.push({ type: 'relic_pickup', x: hero.x, z: hero.z, label: relicId });
  updateFogOfWar(world);
  return { ok: true };
}

export function useHeroRelic(world: WorldState, unitId: string, slotIndex: number): boolean {
  if (world.phase !== 'playing') return false;
  const hero = world.units.find((u) => u.id === unitId && !u.dead && UNIT_STATS[u.kind].isHero);
  if (!hero || !hero.inventory) return false;
  const relicId = hero.inventory[slotIndex];
  if (!relicId || !RELIC_DEFS[relicId].consumable) return false;

  if (relicId === 'living_water') {
    hero.hp = Math.min(hero.maxHp, hero.hp + 260);
    hero.mp = Math.min(hero.maxMp, hero.mp + 90);
  }
  hero.inventory.splice(slotIndex, 1);
  world.events.push({ type: 'relic_use', x: hero.x, z: hero.z, label: relicId });
  return true;
}

export function getHero(world: WorldState): UnitEntity | undefined {
  return world.units.find((u) => u.kind === 'voivode' && !u.dead);
}

export function getHero2(world: WorldState): UnitEntity | undefined {
  return world.units.find((u) => u.kind === 'vedunya' && !u.dead);
}

export function castHeroAbility(world: WorldState, abilityId: AbilityId): boolean {
  if (world.phase !== 'playing') return false;

  if (abilityId === 'frost_nova' || abilityId === 'summon_wolf' || abilityId === 'ancestral_mend') {
    const hero2 = getHero2(world);
    if (!hero2) return false;
    const ability = world.hero2Abilities.find((a) => a.id === abilityId);
    if (!ability || ability.remainingCooldown > 0 || hero2.mp < ability.manaCost) {
      return false;
    }

    hero2.mp -= ability.manaCost;
    ability.remainingCooldown = ability.cooldown;

    if (abilityId === 'frost_nova') {
      const radius = 7.4;
      const baseDmg = 65 + (hero2.level - 1) * 16;
      for (const enemy of world.units) {
        if (enemy.dead || enemy.faction === 'player') continue;
        if (Math.hypot(enemy.x - hero2.x, enemy.z - hero2.z) <= radius) {
          applyDamageToUnit(world, enemy, baseDmg, true);
          enemy.slowTimer = Math.max(enemy.slowTimer, 4.5);
        }
      }
      for (const b of world.buildings) {
        if (b.dead || b.faction === 'player') continue;
        if (Math.hypot(b.x - hero2.x, b.z - hero2.z) <= radius + b.radius) {
          applyDamageToBuilding(world, b, baseDmg * 0.5);
        }
      }
      world.trauma = Math.min(1, world.trauma + 0.3);
      world.events.push({ type: 'frost_nova', x: hero2.x, z: hero2.z, intensity: 1 });
    } else if (abilityId === 'summon_wolf') {
      for (const offsetAngle of [-0.7, 0.7]) {
        const a = hero2.facing + offsetAngle;
        const sx = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, hero2.x + Math.sin(a) * 2.2));
        const sz = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, hero2.z + Math.cos(a) * 2.2));
        const wolf = createUnit(world, 'spirit_wolf', sx, sz, { type: 'idle' });
        wolf.lifeTimer = 22;
        wolf.facing = hero2.facing;
        world.units.push(wolf);
      }
      world.events.push({ type: 'summon_wolf', x: hero2.x, z: hero2.z, intensity: 1 });
      updateFogOfWar(world);
    } else if (abilityId === 'ancestral_mend') {
      const healAmount = 135 + (hero2.level - 1) * 22;
      for (const ally of world.units) {
        if (ally.dead || ally.faction !== 'player') continue;
        if (Math.hypot(ally.x - hero2.x, ally.z - hero2.z) <= 7.5) {
          ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
          if (ally.maxMp > 0) {
            ally.mp = Math.min(ally.maxMp, ally.mp + 25);
          }
        }
      }
      world.events.push({ type: 'ancestral_mend', x: hero2.x, z: hero2.z, intensity: 1 });
    }
    return true;
  }

  const hero = getHero(world);
  if (!hero) return false;
  const ability = world.abilities.find((a) => a.id === abilityId);
  if (!ability || ability.remainingCooldown > 0 || hero.mp < ability.manaCost) {
    return false;
  }

  hero.mp -= ability.manaCost;
  ability.remainingCooldown = ability.cooldown;

  if (abilityId === 'thunder_clap') {
    const radius = 6.8;
    const baseDmg = 95 + (hero.level - 1) * 20;
    for (const enemy of world.units) {
      if (enemy.dead || enemy.faction === 'player') continue;
      if (Math.hypot(enemy.x - hero.x, enemy.z - hero.z) <= radius) {
        applyDamageToUnit(world, enemy, baseDmg, true);
        enemy.slowTimer = Math.max(enemy.slowTimer, 3.5);
      }
    }
    for (const b of world.buildings) {
      if (b.dead || b.faction === 'player') continue;
      if (Math.hypot(b.x - hero.x, b.z - hero.z) <= radius + b.radius) {
        applyDamageToBuilding(world, b, baseDmg * 0.65);
      }
    }
    world.hitstopTimer = Math.max(world.hitstopTimer, 0.055);
    world.trauma = Math.min(1, world.trauma + 0.55);
    world.events.push({ type: 'thunder_clap', x: hero.x, z: hero.z, intensity: 1 });
  } else if (abilityId === 'war_cry') {
    const radius = 10.5;
    for (const ally of world.units) {
      if (ally.dead || ally.faction !== 'player') continue;
      if (Math.hypot(ally.x - hero.x, ally.z - hero.z) <= radius) {
        ally.buffTimer = Math.max(ally.buffTimer, 8.5);
      }
    }
    world.trauma = Math.min(1, world.trauma + 0.22);
    world.events.push({ type: 'war_cry', x: hero.x, z: hero.z, intensity: 1 });
  } else if (abilityId === 'sunfire') {
    const healAmount = 165 + (hero.level - 1) * 25;
    const burnAmount = 55 + (hero.level - 1) * 12;
    for (const u of world.units) {
      if (u.dead) continue;
      const dist = Math.hypot(u.x - hero.x, u.z - hero.z);
      if (u.faction === 'player' && dist <= 5.5) {
        u.hp = Math.min(u.maxHp, u.hp + healAmount);
      } else if (u.faction === 'nav' && dist <= 5.5) {
        applyDamageToUnit(world, u, burnAmount, true);
      }
    }
    world.events.push({ type: 'sunfire', x: hero.x, z: hero.z, intensity: 1 });
  }

  return true;
}

export function triggerHeroJump(world: WorldState, targetX?: number, targetZ?: number): boolean {
  const hero = getHero(world);
  if (!hero || world.phase !== 'playing') return false;
  if (hero.jumpCooldown > 0 || hero.jumpTime > 0) return false;

  const maxRange = 11.5;
  let tx = targetX ?? hero.x + Math.sin(hero.facing) * 6.5;
  let tz = targetZ ?? hero.z + Math.cos(hero.facing) * 6.5;

  const dx = tx - hero.x;
  const dz = tz - hero.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.8) {
    tx = hero.x + Math.sin(hero.facing) * 5.0;
    tz = hero.z + Math.cos(hero.facing) * 5.0;
  } else if (dist > maxRange) {
    tx = hero.x + (dx / dist) * maxRange;
    tz = hero.z + (dz / dist) * maxRange;
  }

  tx = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, tx));
  tz = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, tz));

  hero.jumpStartX = hero.x;
  hero.jumpStartZ = hero.z;
  hero.jumpTargetX = tx;
  hero.jumpTargetZ = tz;
  hero.jumpDuration = 0.56;
  hero.jumpTime = 0.001;
  hero.windupTimer = 0;
  hero.windupTargetId = null;
  hero.order = { type: 'idle' };
  hero.facing = Math.atan2(tx - hero.x, tz - hero.z);

  world.trauma = Math.min(1, world.trauma + 0.14);
  world.events.push({ type: 'hero_jump', x: hero.x, z: hero.z, faction: 'player' });
  return true;
}

export function setWorldFormation(world: WorldState, formation: FormationKind): void {
  world.formation = formation;
}

export function assignControlGroup(world: WorldState, slot: 1 | 2 | 3, unitIds: string[]): void {
  const aliveSet = new Set(world.units.filter((u) => !u.dead && u.faction === 'player').map((u) => u.id));
  const valid = unitIds.filter((id) => aliveSet.has(id));
  world.controlGroups[slot] = valid;
}

export function recallControlGroup(world: WorldState, slot: 1 | 2 | 3): string[] {
  const aliveSet = new Set(world.units.filter((u) => !u.dead && u.faction === 'player').map((u) => u.id));
  const cleaned = (world.controlGroups[slot] ?? []).filter((id) => aliveSet.has(id));
  world.controlGroups[slot] = cleaned;
  return cleaned;
}

export function toggleAbilityAutocast(world: WorldState, abilityId: AbilityId): boolean {
  const target =
    world.abilities.find((a) => a.id === abilityId) ??
    world.hero2Abilities.find((a) => a.id === abilityId);
  if (!target) return false;
  target.autocast = !target.autocast;
  return target.autocast;
}

function evaluateAbilityAutocast(world: WorldState): void {
  const hero1 = getHero(world);
  if (hero1) {
    for (const ab of world.abilities) {
      if (!ab.autocast || ab.remainingCooldown > 0 || hero1.mp < ab.manaCost) continue;
      if (ab.id === 'thunder_clap') {
        const nearbyEnemies = world.units.filter(
          (e) => !e.dead && e.faction === 'nav' && Math.hypot(e.x - hero1.x, e.z - hero1.z) <= 6.2,
        );
        if (nearbyEnemies.length >= 2 || nearbyEnemies.some((e) => UNIT_STATS[e.kind].isBoss)) {
          castHeroAbility(world, 'thunder_clap');
        }
      } else if (ab.id === 'war_cry') {
        const enemyClose = world.units.some(
          (e) => !e.dead && e.faction === 'nav' && Math.hypot(e.x - hero1.x, e.z - hero1.z) <= 9.0,
        );
        const unbuffedAllies = world.units.filter(
          (a) =>
            !a.dead &&
            a.faction === 'player' &&
            a.buffTimer <= 0.5 &&
            Math.hypot(a.x - hero1.x, a.z - hero1.z) <= 9.5,
        );
        if (enemyClose && unbuffedAllies.length >= 2) {
          castHeroAbility(world, 'war_cry');
        }
      } else if (ab.id === 'sunfire') {
        const injuredAlly = world.units.some(
          (a) =>
            !a.dead &&
            a.faction === 'player' &&
            a.hp <= a.maxHp * 0.72 &&
            Math.hypot(a.x - hero1.x, a.z - hero1.z) <= 5.5,
        );
        if (injuredAlly) {
          castHeroAbility(world, 'sunfire');
        }
      }
    }
  }

  const hero2 = getHero2(world);
  if (hero2) {
    for (const ab of world.hero2Abilities) {
      if (!ab.autocast || ab.remainingCooldown > 0 || hero2.mp < ab.manaCost) continue;
      if (ab.id === 'frost_nova') {
        const nearbyEnemies = world.units.filter(
          (e) => !e.dead && e.faction === 'nav' && Math.hypot(e.x - hero2.x, e.z - hero2.z) <= 6.8,
        );
        if (nearbyEnemies.length >= 2 || nearbyEnemies.some((e) => UNIT_STATS[e.kind].isBoss)) {
          castHeroAbility(world, 'frost_nova');
        }
      } else if (ab.id === 'summon_wolf') {
        const enemyClose = world.units.some(
          (e) => !e.dead && e.faction === 'nav' && Math.hypot(e.x - hero2.x, e.z - hero2.z) <= 10.5,
        );
        const activeWolves = world.units.filter((u) => !u.dead && u.kind === 'spirit_wolf').length;
        if (enemyClose && activeWolves === 0) {
          castHeroAbility(world, 'summon_wolf');
        }
      } else if (ab.id === 'ancestral_mend') {
        const injuredAlly = world.units.some(
          (a) =>
            !a.dead &&
            a.faction === 'player' &&
            a.hp <= a.maxHp * 0.72 &&
            Math.hypot(a.x - hero2.x, a.z - hero2.z) <= 7.0,
        );
        if (injuredAlly) {
          castHeroAbility(world, 'ancestral_mend');
        }
      }
    }
  }
}

export function issueMoveOrder(world: WorldState, unitIds: string[], targetX: number, targetZ: number, attackMove = false): void {
  const clampedX = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, targetX));
  const clampedZ = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, targetZ));
  const units = world.units.filter((u) => !u.dead && u.faction === 'player' && unitIds.includes(u.id));
  if (units.length === 0) return;

  const avgX = units.reduce((acc, u) => acc + u.x, 0) / units.length;
  const avgZ = units.reduce((acc, u) => acc + u.z, 0) / units.length;
  const dxVec = clampedX - avgX;
  const dzVec = clampedZ - avgZ;
  const moveLen = Math.hypot(dxVec, dzVec);
  const fx = moveLen > 0.2 ? dxVec / moveLen : Math.sin(units[0].facing);
  const fz = moveLen > 0.2 ? dzVec / moveLen : Math.cos(units[0].facing);
  // Right-hand lateral vector perpendicular to movement heading
  const rx = fz;
  const rz = -fx;

  // Sort melee/heroes ahead of ranged/support for cohesive line & wedge formations
  const ordered = [...units].sort((a, b) => {
    const ar = UNIT_STATS[a.kind].isRanged || a.kind === 'kholop' ? 1 : 0;
    const br = UNIT_STATS[b.kind].isRanged || b.kind === 'kholop' ? 1 : 0;
    return ar - br;
  });

  const formation = world.formation ?? 'line';
  const spacing = 1.65;

  ordered.forEach((u, idx) => {
    let localForward = 0;
    let localRight = 0;

    if (formation === 'line') {
      const frontCount = ordered.filter((x) => !UNIT_STATS[x.kind].isRanged && x.kind !== 'kholop').length;
      const isBackRow = (UNIT_STATS[u.kind].isRanged || u.kind === 'kholop') && frontCount > 0 && frontCount < ordered.length;
      const rowUnits = isBackRow ? ordered.length - frontCount : frontCount > 0 && frontCount < ordered.length ? frontCount : ordered.length;
      const rowIdx = isBackRow ? idx - frontCount : idx;
      localRight = (rowIdx - (rowUnits - 1) / 2) * spacing;
      localForward = frontCount > 0 && frontCount < ordered.length ? (isBackRow ? -1.05 : 0.95) : 0;
    } else if (formation === 'wedge') {
      if (idx === 0) {
        localForward = 1.25;
        localRight = 0;
      } else {
        const tier = Math.ceil(idx / 2);
        const side = idx % 2 === 1 ? -1 : 1;
        localForward = 1.25 - tier * 1.45;
        localRight = side * tier * 1.45;
      }
    } else {
      // 'box' defensive square formation
      const cols = Math.ceil(Math.sqrt(ordered.length));
      const rows = Math.ceil(ordered.length / cols);
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      localRight = (col - (cols - 1) / 2) * spacing;
      localForward = ((rows - 1) / 2 - row) * spacing;
    }

    const dx = Math.max(
      -PLAYABLE_HALF_SIZE,
      Math.min(PLAYABLE_HALF_SIZE, clampedX + rx * localRight + fx * localForward),
    );
    const dz = Math.max(
      -PLAYABLE_HALF_SIZE,
      Math.min(PLAYABLE_HALF_SIZE, clampedZ + rz * localRight + fz * localForward),
    );
    u.order = attackMove ? { type: 'attackMove', x: dx, z: dz } : { type: 'move', x: dx, z: dz };
  });

  world.events.push({ type: 'order_ack', x: clampedX, z: clampedZ, faction: 'player' });
}

export function issueAttackOrder(world: WorldState, unitIds: string[], targetId: string): void {
  const units = world.units.filter((u) => !u.dead && u.faction === 'player' && unitIds.includes(u.id));
  if (units.length === 0) return;
  for (const u of units) {
    u.order = { type: 'attack', targetId };
  }
  const tUnit = world.units.find((u) => u.id === targetId);
  const tBld = world.buildings.find((b) => b.id === targetId);
  const tx = tUnit?.x ?? tBld?.x ?? 0;
  const tz = tUnit?.z ?? tBld?.z ?? 0;
  world.events.push({ type: 'order_ack', x: tx, z: tz, faction: 'nav' });
}

export function issueGatherOrder(world: WorldState, unitIds: string[], nodeId: string): void {
  const node = world.resources.find((r) => r.id === nodeId);
  if (!node) return;
  for (const u of world.units) {
    if (!u.dead && u.faction === 'player' && u.kind === 'kholop' && unitIds.includes(u.id)) {
      u.order = { type: 'gather', nodeId, carrying: null, amount: 0, returning: false };
    }
  }
  world.events.push({ type: 'order_ack', x: node.x, z: node.z, faction: 'player' });
}

export function stopSelectedUnits(world: WorldState): void {
  for (const u of world.units) {
    if (!u.dead && u.faction === 'player' && world.selectedUnitIds.includes(u.id)) {
      u.order = { type: 'idle' };
      u.windupTimer = 0;
      u.windupTargetId = null;
    }
  }
}

function grantHeroXp(world: WorldState, amount: number): void {
  if (amount <= 0) return;
  const heroes = world.units.filter((u) => !u.dead && UNIT_STATS[u.kind].isHero);
  for (const hero of heroes) {
    hero.xp += amount;
    while (hero.xp >= hero.xpToNext && hero.level < 5) {
      hero.xp -= hero.xpToNext;
      hero.level += 1;
      hero.xpToNext = Math.round(hero.xpToNext * 1.45);
      hero.maxHp += 95;
      hero.hp = Math.min(hero.maxHp, hero.hp + 130);
      hero.maxMp += 35;
      hero.mp = Math.min(hero.maxMp, hero.mp + 60);
      world.events.push({
        type: 'level_up',
        x: hero.x,
        z: hero.z,
        label: `Lv. ${hero.level}!`,
      });
    }
  }
}

export function applyDamageToUnit(
  world: WorldState,
  target: UnitEntity,
  rawDamage: number,
  heavy = false,
): void {
  if (target.dead) return;
  const stats = UNIT_STATS[target.kind];
  const eff = getUnitEffectiveStats(world, target);
  const mitigation = 100 / (100 + eff.armor * 7);
  const dmg = Math.max(2, Math.round(rawDamage * mitigation));
  target.hp -= dmg;
  target.hitFlashTimer = 0.08;

  if (target.hp <= 0) {
    target.hp = 0;
    target.dead = true;
    target.koTimer = 0.42;
    target.windupTimer = 0;
    target.bossTelegraphTimer = 0;
    if (target.faction === 'nav') {
      world.kills += 1;
      world.gold += stats.goldReward;
      grantHeroXp(world, stats.xpReward);
      if (target.dropRelicId) {
        world.relicDrops.push({
          id: nextId(world, 'relic'),
          relicId: target.dropRelicId,
          x: target.x,
          z: target.z,
        });
      }
    } else {
      world.unitsLost += 1;
    }
    world.hitstopTimer = Math.max(world.hitstopTimer, heavy || stats.isBoss ? 0.055 : 0.03);
    world.trauma = Math.min(1, world.trauma + (stats.isBoss ? 0.5 : 0.16));
    world.events.push({ type: 'kill', x: target.x, z: target.z, faction: target.faction });
  } else {
    if (heavy) {
      world.hitstopTimer = Math.max(world.hitstopTimer, 0.035);
      world.trauma = Math.min(1, world.trauma + 0.12);
    }
    world.events.push({
      type: heavy ? 'heavy_hit' : 'hit',
      x: target.x,
      z: target.z,
      faction: target.faction,
    });

    if (stats.isBoss) {
      const hpRatio = target.hp / Math.max(1, target.maxHp);
      if (hpRatio <= 0.65 && (target.bossPhase ?? 1) < 2) {
        target.bossPhase = 2;
        target.buffTimer = Math.max(target.buffTimer, 9);
        for (const offsetAng of [-1.1, 1.1]) {
          const sx = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, target.x + Math.cos(target.facing + offsetAng) * 2.4));
          const sz = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, target.z + Math.sin(target.facing + offsetAng) * 2.4));
          world.units.push(createUnit(world, 'upyr', sx, sz, { type: 'attackMove', x: target.x, z: target.z }));
        }
        world.trauma = Math.min(1, world.trauma + 0.45);
        world.events.push({ type: 'boss_phase', x: target.x, z: target.z, intensity: 2, label: 'PHASE_2' });
      }
      if (hpRatio <= 0.3 && (target.bossPhase ?? 1) < 3) {
        target.bossPhase = 3;
        target.buffTimer = Math.max(target.buffTimer, 14);
        target.hp = Math.min(target.maxHp, target.hp + 120);
        for (const [idx, kind] of (['morovik', 'likho'] as const).entries()) {
          const ang = target.facing + (idx === 0 ? 1.45 : -1.45);
          const sx = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, target.x + Math.cos(ang) * 2.7));
          const sz = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, target.z + Math.sin(ang) * 2.7));
          world.units.push(createUnit(world, kind, sx, sz, { type: 'attackMove', x: target.x, z: target.z }));
        }
        world.trauma = Math.min(1, world.trauma + 0.65);
        world.events.push({ type: 'boss_phase', x: target.x, z: target.z, intensity: 3, label: 'PHASE_3' });
      }
    }
  }
}

export function applyDamageToBuilding(world: WorldState, b: BuildingEntity, rawDamage: number): void {
  if (b.dead || b.faction === 'neutral') return;
  b.hp -= Math.max(2, Math.round(rawDamage));
  b.hitFlashTimer = 0.07;
  if (b.hp <= 0) {
    b.hp = 0;
    b.dead = true;
    world.trauma = Math.min(1, world.trauma + 0.65);
    world.hitstopTimer = Math.max(world.hitstopTimer, 0.07);
    world.events.push({ type: 'kill', x: b.x, z: b.z, faction: b.faction, intensity: 1.5 });
  }
}

function findTargetForUnit(
  world: WorldState,
  u: UnitEntity,
  sightRadius: number,
): { kind: 'unit'; entity: UnitEntity } | { kind: 'building'; entity: BuildingEntity } | null {
  const enemyFaction: Faction = u.faction === 'player' ? 'nav' : 'player';
  let bestUnit: UnitEntity | null = null;
  let bestScore = Infinity;

  for (const other of world.units) {
    if (other.dead || other.faction !== enemyFaction) continue;
    const d = Math.hypot(other.x - u.x, other.z - u.z);
    if (d > sightRadius) continue;
    // Swarmer 'upyr' prioritizes ranged/support units when within sight
    let score = d;
    if (u.kind === 'upyr' && (other.kind === 'luchnik' || other.kind === 'volkhv' || other.kind === 'kholop')) {
      score -= 3.2;
    }
    if (score < bestScore) {
      bestScore = score;
      bestUnit = other;
    }
  }
  if (bestUnit) return { kind: 'unit', entity: bestUnit };

  let bestBld: BuildingEntity | null = null;
  let bestBldDist = sightRadius + 4;
  for (const b of world.buildings) {
    if (b.dead || b.faction !== enemyFaction) continue;
    const d = Math.hypot(b.x - u.x, b.z - u.z) - b.radius;
    if (d < bestBldDist) {
      bestBldDist = d;
      bestBld = b;
    }
  }
  if (bestBld) return { kind: 'building', entity: bestBld };
  return null;
}

function moveTowards(u: UnitEntity, tx: number, tz: number, speed: number, dt: number): boolean {
  const dx = tx - u.x;
  const dz = tz - u.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.18) {
    u.vx = 0;
    u.vz = 0;
    return true;
  }
  const nx = dx / dist;
  const nz = dz / dist;
  const step = Math.min(dist, speed * dt);
  u.x += nx * step;
  u.z += nz * step;
  u.vx = nx * speed;
  u.vz = nz * speed;
  u.facing = Math.atan2(nx, nz);
  u.stridePhase += step * 2.4;
  return dist <= speed * dt + 0.18;
}

function spawnWave(world: WorldState, waveIndex: number): void {
  const chWaves = CHAPTER_DEFS[world.chapter ?? 1].waves;
  const def = chWaves[waveIndex];
  if (!def) return;
  const layout = getMapLayout(world.chapter ?? 1);
  const diff = DIFFICULTY_MODIFIERS[world.difficulty];
  const monoliths = world.buildings.filter((b) => b.kind === 'monolith' && !b.dead);
  const monolith = monoliths[waveIndex % Math.max(1, monoliths.length)];
  const originX = monolith ? monolith.x - 3.5 : layout.monoliths[0].x - 3.5;
  const originZ = monolith ? monolith.z + 3.5 : layout.monoliths[0].z + 3.5;
  const keep = world.buildings.find((b) => b.kind === 'detinets' && !b.dead);
  const targetX = keep ? keep.x : layout.detinets.x;
  const targetZ = keep ? keep.z : layout.detinets.z;

  let offset = 0;
  for (const entry of def.squad) {
    const extra = entry.kind === 'upyr' || entry.kind === 'morovik' ? diff.extraWaveEnemies : 0;
    const totalCount = entry.count + extra;
    for (let i = 0; i < totalCount; i++) {
      const angle = (offset * 0.72) % (Math.PI * 2);
      const r = 1.6 + Math.floor(offset / 5) * 1.6;
      const sx = originX + Math.cos(angle) * r;
      const sz = originZ + Math.sin(angle) * r;
      const unit = createUnit(world, entry.kind, sx, sz, {
        type: 'attackMove',
        x: targetX,
        z: targetZ,
      });
      if (world.chapter === 3 && entry.kind === 'leshy') {
        unit.maxHp = Math.round(unit.maxHp * 1.3);
        unit.hp = unit.maxHp;
      }
      world.units.push(unit);
      if (entry.kind === 'leshy') {
        world.bossSpawned = true;
      }
      offset += 1;
    }
  }

  world.announcementWave = waveIndex;
  world.announcementTimer = 5.5;
  world.events.push({ type: 'wave_start', x: originX, z: originZ, label: def.label });
}

export function stepWorld(world: WorldState, rawDt: number): void {
  world.events.length = 0;
  if (world.phase !== 'playing') return;

  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  world.trauma = Math.max(0, world.trauma - dt * 1.6);

  if (world.announcementTimer > 0) {
    world.announcementTimer = Math.max(0, world.announcementTimer - dt);
    if (world.announcementTimer === 0) world.announcementWave = null;
  }

  // Hit-flash and KO timers continue ticking even during hitstop
  for (const u of world.units) {
    if (u.hitFlashTimer > 0) u.hitFlashTimer = Math.max(0, u.hitFlashTimer - dt);
    if (u.dead && u.koTimer > 0) u.koTimer = Math.max(0, u.koTimer - dt);
  }
  for (const b of world.buildings) {
    if (b.hitFlashTimer > 0) b.hitFlashTimer = Math.max(0, b.hitFlashTimer - dt);
  }

  // Evaluate Victory & Defeat conditions immediately on lethal blows
  const checkStronghold = world.buildings.find((b) => b.kind === 'detinets');
  const checkMonoliths = world.buildings.filter((b) => b.kind === 'monolith');
  const checkHeroAlive = world.units.some((u) => UNIT_STATS[u.kind].isHero && !u.dead);
  if (checkMonoliths.length > 0 && checkMonoliths.every((m) => m.dead)) {
    world.phase = 'gameover';
    world.outcome = 'victory';
    return;
  }
  if (checkStronghold && checkStronghold.dead && !checkHeroAlive) {
    world.phase = 'gameover';
    world.outcome = 'defeat';
    return;
  }

  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return;
  }

  world.elapsed += dt;

  // Cooldowns & Hero Mana Regen
  for (const ab of world.abilities) {
    if (ab.remainingCooldown > 0) {
      ab.remainingCooldown = Math.max(0, ab.remainingCooldown - dt);
    }
  }
  for (const ab of world.hero2Abilities) {
    if (ab.remainingCooldown > 0) {
      ab.remainingCooldown = Math.max(0, ab.remainingCooldown - dt);
    }
  }
  const diff = DIFFICULTY_MODIFIERS[world.difficulty];
  const kapishcheAlive = world.buildings.some(
    (b) => b.kind === 'kapishche' && !b.dead && !b.underConstruction,
  );
  const rodLvl = world.upgrades?.rod_blessing ?? 0;
  for (const u of world.units) {
    if (u.dead) continue;
    if (u.lifeTimer !== undefined) {
      u.lifeTimer -= dt;
      if (u.lifeTimer <= 0) {
        u.dead = true;
        u.koTimer = 0.28;
        u.hp = 0;
        continue;
      }
    }
    if (u.maxMp > 0) {
      const bonusRegen = kapishcheAlive && u.faction === 'player' ? 1.4 + rodLvl * 0.8 : 0;
      const svarogRegen = (u.inventory?.filter((r) => r === 'svarog_ring').length ?? 0) * 1.5;
      u.mp = Math.min(u.maxMp, u.mp + (2.6 + bonusRegen + svarogRegen) * dt);
    }
    if (u.buffTimer > 0) u.buffTimer = Math.max(0, u.buffTimer - dt);
    if (u.slowTimer > 0) u.slowTimer = Math.max(0, u.slowTimer - dt);
    if (u.attackTimer > 0) u.attackTimer = Math.max(0, u.attackTimer - dt);
    if (u.jumpCooldown > 0) u.jumpCooldown = Math.max(0, u.jumpCooldown - dt);
    if (u.landSquashTimer > 0) u.landSquashTimer = Math.max(0, u.landSquashTimer - dt);

    // Pagan Shrine healing aura
    if (kapishcheAlive && u.faction === 'player') {
      const shrine = world.buildings.find(
        (b) => b.kind === 'kapishche' && !b.dead && !b.underConstruction,
      );
      const auraRadius = 12.5 + rodLvl * 1.5;
      if (shrine && Math.hypot(u.x - shrine.x, u.z - shrine.z) <= auraRadius) {
        const healRate = 3.2 + rodLvl * 1.5;
        u.hp = Math.min(u.maxHp, u.hp + healRate * diff.shrineHealMult * dt);
      }
    }

    // Neutral Ancestral Spring healing & mana aura
    if (u.faction === 'player') {
      const spring = world.buildings.find(
        (b) => b.kind === 'fountain' && !b.dead && Math.hypot(u.x - b.x, u.z - b.z) <= 6.8,
      );
      if (spring) {
        u.hp = Math.min(u.maxHp, u.hp + 14 * dt);
        if (u.maxMp > 0) {
          u.mp = Math.min(u.maxMp, u.mp + 6 * dt);
        }
      }
    }
  }

  evaluateAbilityAutocast(world);

  // Wave spawner (if any Monolith is still standing)
  const chWaves = CHAPTER_DEFS[world.chapter ?? 1].waves;
  const monolithAlive = world.buildings.some((b) => b.kind === 'monolith' && !b.dead);
  if (monolithAlive && world.wave < world.maxWaves) {
    world.waveTimer -= dt;
    if (world.waveTimer <= 0) {
      spawnWave(world, world.wave);
      world.wave += 1;
      if (world.wave < world.maxWaves && chWaves[world.wave]) {
        world.waveTimer = Math.round(chWaves[world.wave].delay * diff.waveDelayMult);
      } else {
        world.waveTimer = 0;
      }
    }
  }

  // Building production queues, research queues & defensive tower fire
  for (const b of world.buildings) {
    if (b.dead || b.underConstruction) continue;
    const bStats = BUILDING_STATS[b.kind];

    if (b.queue.length > 0) {
      b.queue[0].remaining -= dt;
      if (b.queue[0].remaining <= 0) {
        const finished = b.queue.shift()!;
        let initialOrder: UnitEntity['order'] = {
          type: 'attackMove',
          x: b.rallyX,
          z: b.rallyZ,
        };
        if (finished.kind === 'kholop') {
          const activeNodes = world.resources.filter((r) => r.remaining > 0);
          activeNodes.sort(
            (r1, r2) =>
              Math.hypot(r1.x - b.rallyX, r1.z - b.rallyZ) -
              Math.hypot(r2.x - b.rallyX, r2.z - b.rallyZ),
          );
          const nearNode = activeNodes[0];
          const rallyDistFromKeep = Math.hypot(b.rallyX - b.x, b.rallyZ - b.z);
          if (
            nearNode &&
            (Math.hypot(nearNode.x - b.rallyX, nearNode.z - b.rallyZ) <= 7.5 || rallyDistFromKeep <= 8.5)
          ) {
            initialOrder = {
              type: 'gather',
              nodeId: nearNode.id,
              carrying: null,
              amount: 0,
              returning: false,
            };
          } else {
            initialOrder = { type: 'move', x: b.rallyX, z: b.rallyZ };
          }
        }
        const spawned = createUnit(world, finished.kind, b.x + 2.6, b.z - 2.6, initialOrder);
        world.units.push(spawned);
        world.events.push({
          type: 'train_complete',
          x: spawned.x,
          z: spawned.z,
          label: UNIT_STATS[finished.kind].name,
        });
      }
    }

    if (b.researchQueue) {
      b.researchQueue.remaining -= dt;
      if (b.researchQueue.remaining <= 0) {
        const finishedId = b.researchQueue.id;
        b.researchQueue = null;
        world.upgrades[finishedId] = Math.min(
          UPGRADE_DEFS[finishedId].maxLevel,
          (world.upgrades[finishedId] ?? 0) + 1,
        );
        if (finishedId === 'oak_shields') {
          for (const pu of world.units) {
            if (!pu.dead && pu.faction === 'player') {
              pu.maxHp += 30;
              pu.hp = Math.min(pu.maxHp, pu.hp + 30);
            }
          }
        }
        world.events.push({
          type: 'upgrade_complete',
          x: b.x,
          z: b.z,
          faction: 'player',
          label: finishedId,
        });
      }
    }

    if (bStats.attackDamage > 0) {
      if (b.attackTimer > 0) {
        b.attackTimer = Math.max(0, b.attackTimer - dt);
      } else {
        const targetFaction: Faction = b.faction === 'player' ? 'nav' : 'player';
        const target = world.units.find(
          (u) => !u.dead && u.faction === targetFaction && Math.hypot(u.x - b.x, u.z - b.z) <= bStats.attackRange,
        );
        if (target) {
          b.attackTimer = bStats.attackCooldown;
          const towerDmg =
            bStats.attackDamage + (b.faction === 'player' ? (world.upgrades?.bodkin_arrows ?? 0) * 4 : 0);
          world.projectiles.push({
            id: nextId(world, 'proj'),
            faction: b.faction,
            style: b.faction === 'player' ? 'tower' : 'bogfire',
            x: b.x,
            y: 4.1,
            z: b.z,
            startX: b.x,
            startZ: b.z,
            targetId: target.id,
            targetX: target.x,
            targetZ: target.z,
            progress: 0,
            speed: 22,
            damage: towerDmg,
            arcHeight: 1.4,
          });
          world.events.push({
            type: b.faction === 'player' ? 'arrow_shot' : 'magic_shot',
            x: b.x,
            z: b.z,
          });
        }
      }
    }
  }

  const cachedDropoff = world.buildings.find((b) => b.kind === 'detinets' && !b.dead);

  // Unit simulation: jump arc, gathering, movement, 3+ distinct enemy behaviors, combat windup
  for (const u of world.units) {
    if (u.dead) continue;
    const stats = UNIT_STATS[u.kind];
    const effStats = getUnitEffectiveStats(world, u);
    const moveSpeed = effStats.moveSpeed;
    const dmg = effStats.damage;

    // Active 3D Hero Leap arc
    if (u.jumpTime > 0) {
      u.jumpTime += dt;
      const t = Math.min(1, u.jumpTime / u.jumpDuration);
      u.x = u.jumpStartX + (u.jumpTargetX - u.jumpStartX) * t;
      u.z = u.jumpStartZ + (u.jumpTargetZ - u.jumpStartZ) * t;
      u.y = 4 * 3.1 * t * (1 - t);
      u.vx = (u.jumpTargetX - u.jumpStartX) / u.jumpDuration;
      u.vz = (u.jumpTargetZ - u.jumpStartZ) / u.jumpDuration;
      if (t >= 1) {
        u.jumpTime = 0;
        u.y = 0;
        u.vx = 0;
        u.vz = 0;
        u.jumpCooldown = 2.6;
        u.landSquashTimer = 0.24;
        const slamDmg = 38 + (u.level - 1) * 10;
        for (const enemy of world.units) {
          if (enemy.dead || enemy.faction !== 'nav') continue;
          if (Math.hypot(enemy.x - u.x, enemy.z - u.z) <= 3.6) {
            applyDamageToUnit(world, enemy, slamDmg, false);
            enemy.slowTimer = Math.max(enemy.slowTimer, 1.5);
          }
        }
        world.trauma = Math.min(1, world.trauma + 0.32);
        world.events.push({ type: 'hero_land', x: u.x, z: u.z, faction: 'player' });
      }
      continue;
    }

    // Boss Leshy periodic AoE telegraph & phase-scaled slam
    if (stats.isBoss) {
      const bPhase = u.bossPhase ?? 1;
      if (u.bossTelegraphTimer > 0) {
        u.bossTelegraphTimer -= dt;
        u.vx = 0;
        u.vz = 0;
        if (u.bossTelegraphTimer <= 0) {
          u.bossTelegraphTimer = 0;
          const slamRadius = bPhase === 3 ? 7.0 : 6.2;
          const slamDmg = bPhase === 3 ? 86 : bPhase === 2 ? 72 : 58;
          for (const ally of world.units) {
            if (ally.dead || ally.faction !== 'player') continue;
            if (Math.hypot(ally.x - u.bossTelegraphX, ally.z - u.bossTelegraphZ) <= slamRadius) {
              applyDamageToUnit(world, ally, slamDmg, true);
            }
          }
          world.trauma = Math.min(1, world.trauma + (bPhase === 3 ? 0.65 : 0.5));
          world.events.push({
            type: 'boss_slam',
            x: u.bossTelegraphX,
            z: u.bossTelegraphZ,
            intensity: bPhase,
          });
        }
        continue;
      }
      u.bossSlamTimer -= dt;
      if (u.bossSlamTimer <= 0) {
        const nearbyPlayer = world.units.find(
          (p) => !p.dead && p.faction === 'player' && Math.hypot(p.x - u.x, p.z - u.z) <= 5.8,
        );
        if (nearbyPlayer) {
          u.bossSlamTimer = bPhase === 3 ? 5.2 : bPhase === 2 ? 6.4 : 8.5;
          u.bossTelegraphTimer = bPhase === 3 ? 0.58 : 0.72;
          u.bossTelegraphX = u.x;
          u.bossTelegraphZ = u.z;
          world.events.push({ type: 'boss_telegraph', x: u.x, z: u.z, intensity: bPhase });
          continue;
        }
      }
    }

    // Active attack windup completion
    if (u.windupTimer > 0) {
      u.windupTimer -= dt;
      u.vx = 0;
      u.vz = 0;
      if (u.windupTimer <= 0 && u.windupTargetId) {
        const targetUnit = world.units.find((t) => t.id === u.windupTargetId && !t.dead);
        const targetBld = world.buildings.find((b) => b.id === u.windupTargetId && !b.dead);
        if (targetUnit || targetBld) {
          if (stats.isRanged) {
            const tx = targetUnit?.x ?? targetBld!.x;
            const tz = targetUnit?.z ?? targetBld!.z;
            const style =
              u.kind === 'strelomet'
                ? 'bolt'
                : u.kind === 'luchnik'
                  ? 'arrow'
                  : u.kind === 'volkhv'
                    ? 'spirit'
                    : u.kind === 'vedunya'
                      ? 'frost'
                      : 'bogfire';
            world.projectiles.push({
              id: nextId(world, 'proj'),
              faction: u.faction,
              style,
              x: u.x,
              y: u.kind === 'strelomet' ? 1.1 : 1.35,
              z: u.z,
              startX: u.x,
              startZ: u.z,
              targetId: u.windupTargetId,
              targetX: tx,
              targetZ: tz,
              progress: 0,
              speed: u.kind === 'strelomet' ? 28 : u.kind === 'luchnik' ? 24 : 19,
              damage: dmg,
              arcHeight: u.kind === 'strelomet' ? 0.85 : u.kind === 'luchnik' ? 1.5 : 0.65,
              buildingMult: u.kind === 'strelomet' ? 2.2 : 1,
            });
            world.events.push({
              type: style === 'arrow' || style === 'bolt' ? 'arrow_shot' : 'magic_shot',
              x: u.x,
              z: u.z,
            });
          } else if (targetUnit) {
            applyDamageToUnit(world, targetUnit, dmg, Boolean(stats.isHero || stats.isBoss));
          } else if (targetBld) {
            applyDamageToBuilding(world, targetBld, dmg);
          }
        }
        u.windupTargetId = null;
      }
      continue;
    }

    // Worker building construction state machine
    if (u.order.type === 'build') {
      const targetBldId = u.order.buildingId;
      const bld = world.buildings.find((item) => item.id === targetBldId && !item.dead);
      if (!bld || !bld.underConstruction) {
        u.order = { type: 'idle' };
        continue;
      }
      const dist = Math.hypot(bld.x - u.x, bld.z - u.z);
      if (dist <= bld.radius + 1.1) {
        u.vx = 0;
        u.vz = 0;
        u.facing = Math.atan2(bld.x - u.x, bld.z - u.z);
        const bStats = BUILDING_STATS[bld.kind];
        const buildDuration = Math.max(1, bStats.buildTime);
        const prevProg = bld.buildProgress ?? 0.08;
        const deltaProg = dt / buildDuration;
        const nextProg = Math.min(1, prevProg + deltaProg);
        bld.buildProgress = nextProg;
        bld.hp = Math.min(bld.maxHp, bld.hp + bld.maxHp * 0.9 * deltaProg);
        if (u.attackTimer <= 0) {
          u.attackTimer = 0.72;
          u.windupTimer = 0.14;
          u.windupTargetId = null;
        }
        if (nextProg >= 1) {
          bld.underConstruction = false;
          bld.buildProgress = 1;
          bld.hp = Math.min(bld.maxHp, Math.max(bld.hp, bld.maxHp));
          u.order = { type: 'idle' };
          world.events.push({ type: 'build_complete', x: bld.x, z: bld.z, faction: 'player' });
        }
      } else {
        moveTowards(u, bld.x, bld.z, moveSpeed, dt);
      }
      continue;
    }

    // Worker gathering state machine
    if (u.order.type === 'gather') {
      const targetNodeId = u.order.nodeId;
      const dropoff = cachedDropoff;
      const node = world.resources.find((r) => r.id === targetNodeId && r.remaining > 0);
      if (!dropoff || !node) {
        u.order = { type: 'idle' };
        continue;
      }

      if (u.order.returning) {
        const dist = Math.hypot(dropoff.x - u.x, dropoff.z - u.z);
        if (dist <= dropoff.radius + 1.1) {
          if (u.order.carrying === 'gold') world.gold += u.order.amount;
          if (u.order.carrying === 'wood') world.wood += u.order.amount;
          world.events.push({
            type: 'deposit',
            x: dropoff.x,
            z: dropoff.z,
            label: `+${u.order.amount}`,
          });
          u.order.carrying = null;
          u.order.amount = 0;
          u.order.returning = false;
        } else {
          moveTowards(u, dropoff.x, dropoff.z, moveSpeed, dt);
        }
      } else {
        const dist = Math.hypot(node.x - u.x, node.z - u.z);
        if (dist <= node.radius + 0.9) {
          u.vx = 0;
          u.vz = 0;
          u.facing = Math.atan2(node.x - u.x, node.z - u.z);
          if (u.attackTimer <= 0) {
            u.attackTimer = 1.65;
            const take = Math.min(node.remaining, node.kind === 'gold' ? 14 : 12);
            node.remaining -= take;
            u.order.carrying = node.kind;
            u.order.amount = take;
            u.order.returning = true;
          }
        } else {
          moveTowards(u, node.x, node.z, moveSpeed, dt);
        }
      }
      continue;
    }

    // Explicit move order ignores enemies until arrival
    if (u.order.type === 'move') {
      const arrived = moveTowards(u, u.order.x, u.order.z, moveSpeed, dt);
      if (arrived) u.order = { type: 'idle' };
      continue;
    }

    // Creep Guard leash back to post if pulled too far
    if (u.isCreepGuard && u.guardX !== undefined && u.guardZ !== undefined) {
      const homeDist = Math.hypot(u.x - u.guardX, u.z - u.guardZ);
      if (homeDist > 13.5) {
        moveTowards(u, u.guardX, u.guardZ, moveSpeed, dt);
        continue;
      }
    }

    // Resolve target (explicit attack target or nearby threat)
    let target:
      | { kind: 'unit'; entity: UnitEntity }
      | { kind: 'building'; entity: BuildingEntity }
      | null = null;

    if (u.order.type === 'attack') {
      const attackTargetId = u.order.targetId;
      const tu = world.units.find((t) => t.id === attackTargetId && !t.dead);
      const tb = world.buildings.find((b) => b.id === attackTargetId && !b.dead);
      if (tu) target = { kind: 'unit', entity: tu };
      else if (tb) target = { kind: 'building', entity: tb };
      else u.order = { type: 'idle' };
    }

    // Forest Volkhv passive auto-mend for nearby injured allies
    if (
      u.kind === 'volkhv' &&
      u.attackTimer <= 0 &&
      u.mp >= 18 &&
      u.order.type !== 'attack'
    ) {
      const injured = world.units
        .filter(
          (ally) =>
            !ally.dead &&
            ally.faction === 'player' &&
            ally.id !== u.id &&
            ally.hp < ally.maxHp * 0.72 &&
            Math.hypot(ally.x - u.x, ally.z - u.z) <= 8.5,
        )
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (injured) {
        u.mp -= 18;
        u.attackTimer = 1.85;
        u.facing = Math.atan2(injured.x - u.x, injured.z - u.z);
        injured.hp = Math.min(injured.maxHp, injured.hp + 26 + (world.upgrades?.rod_blessing ?? 0) * 6);
        world.events.push({ type: 'ancestral_mend', x: injured.x, z: injured.z, intensity: 0.45 });
        continue;
      }
    }

    if (!target) {
      const sight = u.isCreepGuard ? 9.5 : u.faction === 'nav' ? 14.5 : u.kind === 'kholop' ? 0 : 12.5;
      if (sight > 0) target = findTargetForUnit(world, u, sight);
    }

    if (target) {
      const tx = target.entity.x;
      const tz = target.entity.z;
      const targetRad = target.kind === 'building' ? target.entity.radius : UNIT_STATS[target.entity.kind].radius;
      const dist = Math.hypot(tx - u.x, tz - u.z);
      const effectiveRange = stats.attackRange + targetRad;

      // Enemy Archetype #2: Likho (Kiter) retreats away from close melee threats
      if (
        u.kind === 'likho' &&
        target.kind === 'unit' &&
        dist < 4.5 &&
        u.attackTimer > 0.2
      ) {
        const awayX = u.x + ((u.x - tx) / Math.max(0.1, dist)) * 4;
        const awayZ = u.z + ((u.z - tz) / Math.max(0.1, dist)) * 4;
        moveTowards(
          u,
          Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, awayX)),
          Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, awayZ)),
          moveSpeed,
          dt,
        );
        continue;
      }

      if (dist <= effectiveRange) {
        u.vx = 0;
        u.vz = 0;
        u.facing = Math.atan2(tx - u.x, tz - u.z);
        if (u.attackTimer <= 0) {
          u.attackTimer = effStats.attackCooldown;
          u.windupTimer = stats.windupDuration;
          u.windupTargetId = target.entity.id;
        }
      } else {
        moveTowards(u, tx, tz, moveSpeed, dt);
      }
    } else if (u.order.type === 'attackMove') {
      const arrived = moveTowards(u, u.order.x, u.order.z, moveSpeed, dt);
      if (arrived) u.order = { type: 'idle' };
    } else if (u.isCreepGuard && u.guardX !== undefined && u.guardZ !== undefined) {
      const homeDist = Math.hypot(u.x - u.guardX, u.z - u.guardZ);
      if (homeDist > 1.2) {
        moveTowards(u, u.guardX, u.guardZ, moveSpeed * 0.85, dt);
      } else {
        u.vx = 0;
        u.vz = 0;
      }
    } else {
      u.vx = 0;
      u.vz = 0;
    }
  }

  // Hero auto-pickup for nearby Relic drops
  for (let i = world.relicDrops.length - 1; i >= 0; i--) {
    const drop = world.relicDrops[i];
    const hero = world.units.find(
      (u) =>
        !u.dead &&
        UNIT_STATS[u.kind].isHero &&
        (u.inventory?.length ?? 0) < 4 &&
        Math.hypot(u.x - drop.x, u.z - drop.z) <= 2.3,
    );
    if (hero) {
      pickupRelicForHero(world, hero, i);
    }
  }

  // Soft unit separation with fast Manhattan pre-filter
  for (let i = 0; i < world.units.length; i++) {
    const a = world.units[i];
    if (a.dead) continue;
    const ra = UNIT_STATS[a.kind].radius;
    for (let j = i + 1; j < world.units.length; j++) {
      const b = world.units[j];
      if (b.dead) continue;
      const rb = UNIT_STATS[b.kind].radius;
      const minDist = ra + rb + 0.12;
      const dx = b.x - a.x;
      if (Math.abs(dx) >= minDist) continue;
      const dz = b.z - a.z;
      if (Math.abs(dz) >= minDist) continue;
      const dSq = dx * dx + dz * dz;
      if (dSq > 0.000001 && dSq < minDist * minDist) {
        const d = Math.sqrt(dSq);
        const push = (minDist - d) * 0.45;
        const nx = dx / d;
        const nz = dz / d;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }
    a.x = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, a.x));
    a.z = Math.max(-PLAYABLE_HALF_SIZE, Math.min(PLAYABLE_HALF_SIZE, a.z));
  }

  // Advance projectiles
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const p = world.projectiles[i];
    const targetUnit = world.units.find((u) => u.id === p.targetId && !u.dead);
    const targetBld = world.buildings.find((b) => b.id === p.targetId && !b.dead);
    if (targetUnit) {
      p.targetX = targetUnit.x;
      p.targetZ = targetUnit.z;
    } else if (targetBld) {
      p.targetX = targetBld.x;
      p.targetZ = targetBld.z;
    }

    const totalDist = Math.max(0.5, Math.hypot(p.targetX - p.startX, p.targetZ - p.startZ));
    p.progress += (p.speed * dt) / totalDist;
    const t = Math.min(1, p.progress);
    p.x = p.startX + (p.targetX - p.startX) * t;
    p.z = p.startZ + (p.targetZ - p.startZ) * t;
    p.y = 1.35 * (1 - t) + 1.0 * t + Math.sin(t * Math.PI) * p.arcHeight;

    if (p.progress >= 1) {
      if (targetUnit) {
        applyDamageToUnit(world, targetUnit, p.damage, false);
      } else if (targetBld) {
        applyDamageToBuilding(world, targetBld, p.damage * (p.buildingMult ?? 1));
      }
      world.projectiles.splice(i, 1);
    }
  }

  // Clean up finished KO units, dead selections, and dead control group members
  world.units = world.units.filter((u) => !u.dead || u.koTimer > 0);
  const aliveIds = new Set(world.units.filter((u) => !u.dead).map((u) => u.id));
  world.selectedUnitIds = world.selectedUnitIds.filter((id) => aliveIds.has(id));
  if (world.controlGroups) {
    world.controlGroups[1] = world.controlGroups[1].filter((id) => aliveIds.has(id));
    world.controlGroups[2] = world.controlGroups[2].filter((id) => aliveIds.has(id));
    world.controlGroups[3] = world.controlGroups[3].filter((id) => aliveIds.has(id));
  }

  updateFogOfWar(world);

  // Evaluate Victory & Defeat conditions
  const stronghold = world.buildings.find((b) => b.kind === 'detinets');
  const monoliths = world.buildings.filter((b) => b.kind === 'monolith');
  const heroAlive = world.units.some((u) => UNIT_STATS[u.kind].isHero && !u.dead);

  if (monoliths.length > 0 && monoliths.every((m) => m.dead)) {
    world.phase = 'gameover';
    world.outcome = 'victory';
    return;
  }

  if (stronghold && stronghold.dead && !heroAlive) {
    world.phase = 'gameover';
    world.outcome = 'defeat';
  }
}
