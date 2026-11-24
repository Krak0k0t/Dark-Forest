import test from 'node:test';
import assert from 'node:assert/strict';
import { getFogStateAt, getUnitSightRadius } from './fog';
import { deserializeWorld, serializeWorld } from './persistence';
import {
  applyDamageToBuilding,
  applyDamageToUnit,
  assignControlGroup,
  buyRelicFromMerchant,
  canPlaceBuilding,
  castHeroAbility,
  createInitialWorld,
  createUnit,
  getHero,
  getHero2,
  getSupplyCounts,
  getUnitEffectiveStats,
  issueMoveOrder,
  recallControlGroup,
  researchUpgrade,
  setBuildingRallyPoint,
  setWorldFormation,
  startBuildingConstruction,
  stepWorld,
  toggleAbilityAutocast,
  trainUnit,
  triggerHeroJump,
  useHeroRelic,
} from './rules';

test('initial world spawns hero, stronghold, monolith, resources, and supply counts', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world);
  assert.ok(hero, 'Hero Voivode should exist');
  assert.equal(hero.level, 1);

  const supply = getSupplyCounts(world);
  assert.ok(supply.cap >= 20);
  assert.ok(supply.used > 0 && supply.used < supply.cap);
});

test('worker harvests gold and deposits it into player treasury', () => {
  const world = createInitialWorld('playing');
  const startGold = world.gold;
  // Simulate 12 seconds so the gold worker completes a trip
  for (let i = 0; i < 240; i++) {
    stepWorld(world, 0.05);
  }
  assert.ok(world.gold > startGold, `Expected gold (${world.gold}) to exceed starting gold (${startGold})`);
});

test('training unit deducts cost, queues production, and spawns finished unit', () => {
  const world = createInitialWorld('playing');
  const kazarma = world.buildings.find((b) => b.kind === 'kazarma');
  assert.ok(kazarma);
  const beforeGold = world.gold;
  const beforeCount = world.units.filter((u) => u.kind === 'ratnik').length;

  const res = trainUnit(world, kazarma.id, 'ratnik');
  assert.equal(res.ok, true);
  assert.ok(world.gold < beforeGold);
  assert.equal(kazarma.queue.length, 1);

  // Advance enough simulation time for ratnik (5s) to finish
  for (let i = 0; i < 120; i++) {
    stepWorld(world, 0.05);
  }
  const afterCount = world.units.filter((u) => u.kind === 'ratnik').length;
  assert.equal(afterCount, beforeCount + 1);
});

test('hero Thunder Clap deals AoE damage, consumes mana, and sets cooldown', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  const enemy = createUnit(world, 'upyr', hero.x + 2, hero.z);
  world.units.push(enemy);
  const startHp = enemy.hp;
  const startMp = hero.mp;

  const castOk = castHeroAbility(world, 'thunder_clap');
  assert.equal(castOk, true);
  assert.ok(enemy.hp < startHp);
  assert.ok(enemy.slowTimer > 0);
  assert.ok(hero.mp < startMp);
  assert.ok(world.abilities[0].remainingCooldown > 0);
});

test('move order advances selected unit toward destination', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  const startX = hero.x;
  const startZ = hero.z;

  issueMoveOrder(world, [hero.id], startX + 5, startZ - 5);
  for (let i = 0; i < 20; i++) {
    stepWorld(world, 0.05);
  }
  assert.ok(hero.x > startX + 1.5);
  assert.ok(hero.z < startZ - 1.5);
});

test('likho ranged enemy kites away when melee unit gets too close', () => {
  const world = createInitialWorld('playing');
  world.units = world.units.filter((u) => u.faction === 'player');
  const likho = createUnit(world, 'likho', 0, 0);
  likho.attackTimer = 1.0; // on cooldown so it chooses to kite
  const ratnik = createUnit(world, 'ratnik', 2.0, 0);
  world.units.push(likho, ratnik);

  const startX = likho.x;
  stepWorld(world, 0.05);
  assert.ok(likho.x < startX, 'Likho should retreat away from close melee threat');
});

test('hero leap arcs in 3D, moves hero to target, slams enemies on landing, and enforces cooldown', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  const targetX = hero.x + 5;
  const targetZ = hero.z - 5;
  const enemy = createUnit(world, 'upyr', targetX + 1.8, targetZ);
  world.units.push(enemy);
  const enemyHpBefore = enemy.hp;

  const jumped = triggerHeroJump(world, targetX, targetZ);
  assert.equal(jumped, true);
  assert.equal(triggerHeroJump(world, targetX, targetZ), false, 'Cannot double jump mid-air');

  // Mid-air check
  for (let i = 0; i < 5; i++) {
    stepWorld(world, 0.05);
  }
  assert.ok(hero.y > 1.0, `Expected hero airborne height > 1.0, got ${hero.y}`);

  // Complete landing
  for (let i = 0; i < 12; i++) {
    stepWorld(world, 0.05);
  }
  assert.equal(hero.y, 0);
  assert.ok(Math.hypot(hero.x - targetX, hero.z - targetZ) < 1.5);
  assert.ok(enemy.hp < enemyHpBefore, 'Landing shockwave should damage nearby Nav enemies');
  assert.ok(hero.jumpCooldown > 0, 'Cooldown should activate after landing');
});

test('difficulty presets scale starting resources and enemy vitality', () => {
  const story = createInitialWorld('playing', 'story');
  const nightmare = createInitialWorld('playing', 'nightmare');

  assert.ok(story.gold > nightmare.gold);
  assert.ok(story.wood > nightmare.wood);

  const storyUpyr = story.units.find((u) => u.kind === 'upyr')!;
  const nightmareUpyr = nightmare.units.find((u) => u.kind === 'upyr')!;
  assert.ok(nightmareUpyr.maxHp > storyUpyr.maxHp);
});

test('destroying the Cursed Monolith triggers victory', () => {
  const world = createInitialWorld('playing');
  const monolith = world.buildings.find((b) => b.kind === 'monolith')!;
  applyDamageToBuilding(world, monolith, 5000);
  stepWorld(world, 0.05);
  assert.equal(world.phase, 'gameover');
  assert.equal(world.outcome, 'victory');
});

test('losing stronghold and hero triggers defeat', () => {
  const world = createInitialWorld('playing');
  const detinets = world.buildings.find((b) => b.kind === 'detinets')!;
  const hero = getHero(world)!;
  applyDamageToBuilding(world, detinets, 5000);
  applyDamageToUnit(world, hero, 5000, true);
  stepWorld(world, 0.05);
  assert.equal(world.phase, 'gameover');
  assert.equal(world.outcome, 'defeat');
});

test('fog of war hides unexplored monolith, reveals live sight, and fades explored area to shroud', () => {
  const world = createInitialWorld('playing');
  const monolith = world.buildings.find((b) => b.kind === 'monolith')!;
  assert.equal(getFogStateAt(world, monolith.x, monolith.z), 0, 'Nav Stone starts unexplored');
  assert.equal(getFogStateAt(world, -18, 17), 2, 'Detinets Keep starts in live sight');

  const scout = createUnit(world, 'ratnik', 4, -4);
  world.units.push(scout);
  stepWorld(world, 0.05);
  assert.equal(getFogStateAt(world, 4, -4), 2, 'Scout reveals current position');

  // Remove scout so (4, -4) drops out of all live sight discs
  world.units = world.units.filter((u) => u.id !== scout.id);
  stepWorld(world, 0.05);
  assert.equal(getFogStateAt(world, 4, -4), 1, 'Previously seen tile transitions to explored shroud');
});

test('worker building construction validates placement, deducts cost, and completes watchtower', () => {
  const world = createInitialWorld('playing');
  assert.equal(canPlaceBuilding(world, 'vezha', 5, 5).ok, false, 'Should reject building directly in river');
  assert.equal(canPlaceBuilding(world, 'vezha', -14, 7).ok, true, 'Clear sanctuary ground should be valid');

  const worker = world.units.find((u) => u.kind === 'kholop')!;
  const beforeGold = world.gold;
  const beforeWood = world.wood;

  const built = startBuildingConstruction(world, [worker.id], 'vezha', -14, 7);
  assert.equal(built.ok, true);
  assert.ok(built.buildingId);
  const building = world.buildings.find((b) => b.id === built.buildingId)!;
  assert.ok(building);
  assert.equal(building.underConstruction, true);
  assert.ok(world.gold < beforeGold && world.wood < beforeWood);

  // Simulate worker walking and building (6.5s build time + short walk)
  for (let i = 0; i < 240; i++) {
    stepWorld(world, 0.05);
  }
  assert.equal(building.underConstruction, false, 'Watchtower should finish constructing');
  assert.equal(building.hp, building.maxHp);
});

test('Shrine of Rod summons unique Vedunya Lada who casts Moroz Chill and Spirit Wolves', () => {
  const world = createInitialWorld('playing');
  world.gold = 900;
  world.wood = 500;
  const kapishche = world.buildings.find((b) => b.kind === 'kapishche')!;
  assert.ok(kapishche);

  const train1 = trainUnit(world, kapishche.id, 'vedunya');
  assert.equal(train1.ok, true);
  assert.equal(trainUnit(world, kapishche.id, 'vedunya').ok, false, 'Cannot queue duplicate Vedunya');

  for (let i = 0; i < 190; i++) {
    stepWorld(world, 0.05);
  }
  const hero2 = getHero2(world);
  assert.ok(hero2, 'Vedunya Lada should spawn from Shrine of Rod');
  assert.equal(trainUnit(world, kapishche.id, 'vedunya').ok, false, 'Cannot summon second Vedunya while alive');

  // Test Moroz Chill (frost_nova)
  const enemy = createUnit(world, 'upyr', hero2.x + 2, hero2.z);
  world.units.push(enemy);
  const enemyHpBefore = enemy.hp;
  assert.equal(castHeroAbility(world, 'frost_nova'), true);
  assert.ok(enemy.hp < enemyHpBefore);
  assert.ok(enemy.slowTimer > 0);

  // Test Spirit Wolves summon and clean expiration
  assert.equal(castHeroAbility(world, 'summon_wolf'), true);
  const wolves = world.units.filter((u) => u.kind === 'spirit_wolf' && !u.dead);
  assert.equal(wolves.length, 2);

  const lostBefore = world.unitsLost;
  for (let i = 0; i < 460; i++) {
    stepWorld(world, 0.05);
  }
  assert.equal(
    world.units.filter((u) => u.kind === 'spirit_wolf' && !u.dead).length,
    0,
    'Spirit wolves should expire after 22s',
  );
  assert.ok(world.unitsLost >= lostBefore);
});

test('researching Forged Blades and Oak Shields upgrades damage, armor, and maxHP for existing and new units', () => {
  const world = createInitialWorld('playing');
  world.gold = 900;
  world.wood = 500;
  const hero = getHero(world)!;
  const kazarma = world.buildings.find((b) => b.kind === 'kazarma')!;
  const detinets = world.buildings.find((b) => b.kind === 'detinets')!;

  const baseHeroDmg = getUnitEffectiveStats(world, hero).damage;
  const baseHeroArmor = getUnitEffectiveStats(world, hero).armor;
  const baseHeroMaxHp = hero.maxHp;

  const r1 = researchUpgrade(world, kazarma.id, 'forged_blades');
  const r2 = researchUpgrade(world, detinets.id, 'oak_shields');
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(researchUpgrade(world, kazarma.id, 'bodkin_arrows').ok, false, 'Cannot research two techs simultaneously in same building');

  for (let i = 0; i < 170; i++) {
    stepWorld(world, 0.05);
  }
  assert.equal(world.upgrades.forged_blades, 1);
  assert.equal(world.upgrades.oak_shields, 1);
  assert.equal(getUnitEffectiveStats(world, hero).damage, baseHeroDmg + 4);
  assert.equal(getUnitEffectiveStats(world, hero).armor, baseHeroArmor + 2);
  assert.equal(hero.maxHp, baseHeroMaxHp + 30);

  const freshRatnik = createUnit(world, 'ratnik', -10, 12);
  assert.equal(freshRatnik.maxHp, 340, 'Newly trained Ratnik should inherit Oak Shields +30 HP');
});

test('creep guards hold camp post, drop relics on death, and hero picks up & uses relics', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  assert.deepEqual(hero.inventory, ['living_water'], 'Voivode starts with Living Water in slot 0');

  const guard = world.units.find((u) => u.isCreepGuard && u.dropRelicId === 'perun_amulet')!;
  assert.ok(guard, 'NW Kurgan camp should have Perun Amulet guardian');
  const gx = guard.guardX!;
  const gz = guard.guardZ!;

  // Step 4s with no enemies near NW camp — creep guard must remain at camp post
  for (let i = 0; i < 80; i++) {
    stepWorld(world, 0.05);
  }
  assert.ok(Math.hypot(guard.x - gx, guard.z - gz) < 2.0, 'Creep guard should guard post rather than march');

  // Slay the guardian and verify relic drop
  applyDamageToUnit(world, guard, 5000, true);
  assert.equal(guard.dead, true);
  assert.ok(world.relicDrops.some((d) => d.relicId === 'perun_amulet'));

  // Move hero onto drop and step past the 0.055s kill hitstop for auto-pickup
  const drop = world.relicDrops.find((d) => d.relicId === 'perun_amulet')!;
  const dmgBefore = getUnitEffectiveStats(world, hero).damage;
  const mpBefore = hero.maxMp;
  hero.x = drop.x;
  hero.z = drop.z;
  for (let i = 0; i < 4; i++) {
    stepWorld(world, 0.05);
  }

  assert.ok(hero.inventory?.includes('perun_amulet'));
  assert.equal(world.relicDrops.some((d) => d.id === drop.id), false);
  assert.ok(getUnitEffectiveStats(world, hero).damage >= dmgBefore + 12);
  assert.equal(hero.maxMp, mpBefore + 50);

  // Also test Veles Cloak sight bonus and consuming Living Water
  const velesSightBefore = getUnitSightRadius(hero);
  hero.inventory!.push('veles_cloak');
  assert.equal(getUnitSightRadius(hero), velesSightBefore + 4);

  hero.hp = 200;
  hero.mp = 40;
  const used = useHeroRelic(world, hero.id, 0);
  assert.equal(used, true);
  assert.equal(hero.hp, 460);
  assert.equal(hero.mp, 130);
  assert.equal(hero.inventory!.includes('living_water'), false);
});

test('campaign chapters scale monolith objectives and starting heroes cleanly', () => {
  const ch2 = createInitialWorld('playing', 'normal', 2);
  const monoliths = ch2.buildings.filter((b) => b.kind === 'monolith');
  assert.equal(monoliths.length, 2, 'Chapter 2 should spawn 2 Nav Stones');
  assert.equal(ch2.maxWaves, 4);

  // Destroying 1 monolith must NOT trigger victory
  applyDamageToBuilding(ch2, monoliths[0], 5000);
  stepWorld(ch2, 0.05);
  assert.equal(ch2.phase, 'playing');

  // Destroying the second monolith triggers victory
  applyDamageToBuilding(ch2, monoliths[1], 5000);
  stepWorld(ch2, 0.05);
  assert.equal(ch2.phase, 'gameover');
  assert.equal(ch2.outcome, 'victory');

  const ch3 = createInitialWorld('playing', 'normal', 3);
  assert.ok(getHero(ch3) && getHero2(ch3), 'Chapter 3 starts with both Voivode and Vedunya');
});

test('squad formations produce distinct geometric target coordinates', () => {
  const world = createInitialWorld('playing');
  const combatIds = world.units
    .filter((u) => !u.dead && u.faction === 'player' && u.kind !== 'kholop')
    .map((u) => u.id);
  assert.ok(combatIds.length >= 4);

  const getTargets = (formation: 'line' | 'wedge' | 'box') => {
    setWorldFormation(world, formation);
    issueMoveOrder(world, combatIds, 4, -4);
    return combatIds
      .map((id) => {
        const ord = world.units.find((u) => u.id === id)!.order;
        return ord.type === 'move' ? `${ord.x.toFixed(2)},${ord.z.toFixed(2)}` : '';
      })
      .join('|');
  };

  const lineTargets = getTargets('line');
  const wedgeTargets = getTargets('wedge');
  const boxTargets = getTargets('box');
  assert.notEqual(lineTargets, wedgeTargets);
  assert.notEqual(wedgeTargets, boxTargets);
});

test('control groups bind, recall, and prune dead members automatically', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  const ratnik = world.units.find((u) => u.kind === 'ratnik')!;

  assignControlGroup(world, 1, [hero.id, ratnik.id]);
  assert.deepEqual(recallControlGroup(world, 1), [hero.id, ratnik.id]);

  applyDamageToUnit(world, ratnik, 5000, true);
  stepWorld(world, 0.05);
  assert.deepEqual(recallControlGroup(world, 1), [hero.id]);
});

test('ability autocast automatically casts Thunder Clap when multiple Nav enemies close in', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  const e1 = createUnit(world, 'upyr', hero.x + 1.8, hero.z);
  const e2 = createUnit(world, 'upyr', hero.x - 1.8, hero.z);
  world.units.push(e1, e2);

  const toggled = toggleAbilityAutocast(world, 'thunder_clap');
  assert.equal(toggled, true);
  const hpBefore = e1.hp;

  stepWorld(world, 0.05);
  assert.ok(e1.hp < hpBefore, 'Autocast should have fired Thunder Clap against nearby Nav pack');
  assert.ok(world.abilities[0].remainingCooldown > 0);
});

test('world save serialization round-trips chapter, formation, upgrades, relics, and control groups', () => {
  const world = createInitialWorld('playing', 'hard', 2);
  setWorldFormation(world, 'wedge');
  world.upgrades.forged_blades = 2;
  const hero = getHero(world)!;
  assignControlGroup(world, 2, [hero.id]);
  toggleAbilityAutocast(world, 'war_cry');

  const raw = serializeWorld(world);
  const restored = deserializeWorld(raw);
  assert.ok(restored);
  assert.equal(restored.summary.chapter, 2);
  assert.equal(restored.world.chapter, 2);
  assert.equal(restored.world.formation, 'wedge');
  assert.equal(restored.world.upgrades.forged_blades, 2);
  assert.deepEqual(restored.world.controlGroups[2], [hero.id]);
  assert.equal(restored.world.abilities.find((a) => a.id === 'war_cry')?.autocast, true);
});

test('Veles Trading Tent sells relics to alive Hero and rejects insufficient gold or full belt', () => {
  const world = createInitialWorld('playing');
  const hero = getHero(world)!;
  const merchant = world.buildings.find((b) => b.kind === 'merchant')!;
  assert.ok(merchant, 'Neutral merchant should spawn on map');

  // Indestructible check
  const mHpBefore = merchant.hp;
  applyDamageToBuilding(world, merchant, 9999);
  assert.equal(merchant.hp, mHpBefore);
  assert.equal(merchant.dead, false);

  world.gold = 400;
  const mpBefore = hero.maxMp;
  const dmgBefore = getUnitEffectiveStats(world, hero).damage;
  const bought = buyRelicFromMerchant(world, merchant.id, 'perun_amulet');
  assert.equal(bought.ok, true);
  assert.equal(world.gold, 210);
  assert.ok(hero.inventory?.includes('perun_amulet'));
  assert.equal(hero.maxMp, mpBefore + 50);
  assert.ok(getUnitEffectiveStats(world, hero).damage >= dmgBefore + 12);

  // Reject when gold insufficient
  world.gold = 50;
  assert.equal(buyRelicFromMerchant(world, merchant.id, 'svarog_ring').ok, false);

  // Fill remaining belt slots and verify 5th item is rejected
  world.gold = 999;
  assert.equal(buyRelicFromMerchant(world, merchant.id, 'svarog_ring').ok, true);
  assert.equal(buyRelicFromMerchant(world, merchant.id, 'veles_cloak').ok, true);
  assert.equal(hero.inventory!.length, 4);
  assert.equal(buyRelicFromMerchant(world, merchant.id, 'living_water').ok, false);
});

test('Ancestral Spring restores HP and MP to nearby allied units within aura radius', () => {
  const world = createInitialWorld('playing');
  world.units = world.units.filter((u) => u.faction === 'player');
  const spring = world.buildings.find((b) => b.kind === 'fountain')!;
  assert.ok(spring, 'Neutral Ancestral Spring should spawn on map');

  const hero = getHero(world)!;
  hero.x = spring.x + 2.0;
  hero.z = spring.z;
  hero.hp = 300;
  hero.mp = 40;

  // Step 2 seconds
  for (let i = 0; i < 40; i++) {
    stepWorld(world, 0.05);
  }
  assert.ok(hero.hp >= 325, `Expected hero HP >= 325 near spring, got ${hero.hp}`);
  assert.ok(hero.mp >= 55, `Expected hero MP >= 55 near spring, got ${hero.mp}`);
});

test('Strelomet Ballista trains from Barracks and deals 2.2x siege bolt damage to Nav Stone', () => {
  const world = createInitialWorld('playing');
  world.gold = 600;
  world.wood = 400;
  const kazarma = world.buildings.find((b) => b.kind === 'kazarma')!;
  const beforeBallista = world.units.filter((u) => u.kind === 'strelomet').length;
  assert.equal(trainUnit(world, kazarma.id, 'strelomet').ok, true);

  for (let i = 0; i < 180; i++) {
    stepWorld(world, 0.05);
  }
  const ballista = world.units.find((u) => u.kind === 'strelomet' && !u.dead);
  assert.ok(ballista, 'Strelomet should finish training from Gridnitsa Barracks');
  assert.equal(world.units.filter((u) => u.kind === 'strelomet').length, beforeBallista + 1);

  const monolith = world.buildings.find((b) => b.kind === 'monolith')!;
  const monoHpBefore = monolith.hp;
  ballista.x = monolith.x - 10;
  ballista.z = monolith.z;
  ballista.attackTimer = 0;
  ballista.order = { type: 'attack', targetId: monolith.id };

  // Step enough time for windup + bolt flight (10u at 28u/s ~ 0.36s + 0.38s windup)
  for (let i = 0; i < 25; i++) {
    stepWorld(world, 0.05);
  }
  const dmgDealt = monoHpBefore - monolith.hp;
  assert.ok(dmgDealt >= 100, `Expected 2.2x siege bolt damage (>= 100), got ${dmgDealt}`);
});

test('all campaign chapters grant at least 65s preparation time before Wave 1 on Normal', () => {
  for (const ch of [1, 2, 3, 4] as const) {
    const world = createInitialWorld('playing', 'normal', ch);
    assert.ok(world.waveTimer >= 65, `Chapter ${ch} waveTimer (${world.waveTimer}s) should be >= 65s`);
  }
});

test('Chapter 2 (Frostfen) and Chapter 3 (Blight) enforce biome river geometry and placements', () => {
  const ch2 = createInitialWorld('playing', 'normal', 2);
  // Ch.2 river lies along z + 0.25*x = 0 -> (8, -2) is dead center in the frozen river
  assert.equal(canPlaceBuilding(ch2, 'vezha', 8, -2).ok, false, 'Ch.2 frozen river should block placement');
  assert.equal(canPlaceBuilding(ch2, 'vezha', -12, 10).ok, true, 'Ch.2 clear Frostfen ground should allow placement');

  const ch3 = createInitialWorld('playing', 'normal', 3);
  // Ch.3 moat lies along x + 0.35*z = 0 -> (-3.5, 10) is dead center in the moat
  assert.equal(canPlaceBuilding(ch3, 'vezha', -3.5, 10).ok, false, 'Ch.3 ashen moat should block placement');
  assert.equal(canPlaceBuilding(ch3, 'vezha', -24, 21).ok, true, 'Ch.3 clear stronghold terrace should allow placement');
});

test('setBuildingRallyPoint updates rally coordinates, trained kholop auto-gathers, and Volkhv auto-mends injured allies', () => {
  const world = createInitialWorld('playing');
  world.units = world.units.filter((u) => u.faction === 'player');
  world.gold = 600;
  world.wood = 400;

  const detinets = world.buildings.find((b) => b.kind === 'detinets')!;
  assert.equal(setBuildingRallyPoint(world, detinets.id, -19, 19), true);
  assert.equal(detinets.rallyX, -19);
  assert.equal(detinets.rallyZ, 19);

  // Train a worker from Detinets and verify auto-gather order upon completion
  assert.equal(trainUnit(world, detinets.id, 'kholop').ok, true);
  for (let i = 0; i < 120; i++) {
    stepWorld(world, 0.05);
  }
  const spawnedWorker = world.units[world.units.length - 1];
  assert.equal(spawnedWorker.kind, 'kholop');
  assert.equal(spawnedWorker.order.type, 'gather', 'Newly trained Kholop should auto-gather nearby resource');

  // Verify Volkhv passive heal when nearby ally drops below 72% HP
  const volkhv = createUnit(world, 'volkhv', -10, 14);
  const injured = createUnit(world, 'ratnik', -8, 14);
  injured.hp = 120;
  world.units.push(volkhv, injured);

  for (let i = 0; i < 12; i++) {
    stepWorld(world, 0.05);
  }
  assert.ok(injured.hp > 120, `Volkhv should auto-mend injured Ratnik (got HP ${injured.hp})`);
});

test('Chapter 4 (Heart of Likholesye) spawns fen river rules, twin monoliths, Vedunya, and Guardian Boss Leshy', () => {
  const ch4 = createInitialWorld('playing', 'normal', 4);
  const monoliths = ch4.buildings.filter((b) => b.kind === 'monolith');
  assert.equal(monoliths.length, 2, 'Chapter 4 should spawn twin Nav Stones');
  assert.ok(getHero(ch4) && getHero2(ch4), 'Chapter 4 should start with both Voivode and Vedunya');

  // Ch.4 fen river lies along z - 0.55*x = 0 -> (10, 5.5) is dead center in the river
  assert.equal(canPlaceBuilding(ch4, 'vezha', 10, 5.5).ok, false, 'Ch.4 fen river should block building placement');
  assert.equal(canPlaceBuilding(ch4, 'vezha', -5, -20).ok, true, 'Ch.4 clear sanctuary ground should allow building placement');

  const boss = ch4.units.find((u) => u.kind === 'leshy' && !u.dead);
  assert.ok(boss, 'Chapter 4 should spawn Guardian Boss Leshy');
  assert.equal(boss.bossPhase, 1);
  assert.equal(ch4.bossSpawned, true);
});

test('Boss Leshy transitions through Phase 2 (<=65% HP) and Phase 3 (<=30% HP) with spawns and events', () => {
  const world = createInitialWorld('playing', 'normal', 4);
  const boss = world.units.find((u) => u.kind === 'leshy' && !u.dead)!;
  assert.ok(boss);
  world.events = [];
  const upyrBefore = world.units.filter((u) => u.kind === 'upyr' && !u.dead).length;

  // Leshy maxHp=1550, armor=6 (mitigation 100/142 ~ 0.7042). Raw 900 -> ~634 dmg => ~59.1% HP (<= 65%)
  applyDamageToUnit(world, boss, 900, true);
  assert.equal(boss.bossPhase, 2, 'Boss Leshy should enter Phase 2 at <= 65% HP');
  assert.ok(boss.buffTimer >= 9, 'Phase 2 should buff Boss Leshy');
  assert.equal(
    world.units.filter((u) => u.kind === 'upyr' && !u.dead).length,
    upyrBefore + 2,
    'Phase 2 should summon 2 flanking Upyrs',
  );
  const p2Event = world.events.find((e) => e.type === 'boss_phase' && e.intensity === 2);
  assert.ok(p2Event, 'Phase 2 should emit boss_phase intensity 2 event');

  // Drop HP further below 30% (<= 465): raw 750 -> ~528 dmg => ~388 HP <= 465, then +120 heal -> ~508 HP
  world.events = [];
  const morovikBefore = world.units.filter((u) => u.kind === 'morovik' && !u.dead).length;
  const likhoBefore = world.units.filter((u) => u.kind === 'likho' && !u.dead).length;
  applyDamageToUnit(world, boss, 750, true);
  assert.equal(boss.bossPhase, 3, 'Boss Leshy should enter Phase 3 at <= 30% HP');
  assert.ok(boss.buffTimer >= 14, 'Phase 3 should enrage Boss Leshy');
  assert.equal(
    world.units.filter((u) => u.kind === 'morovik' && !u.dead).length,
    morovikBefore + 1,
    'Phase 3 should summon a Morovik guard',
  );
  assert.equal(
    world.units.filter((u) => u.kind === 'likho' && !u.dead).length,
    likhoBefore + 1,
    'Phase 3 should summon a Likho ranged shade',
  );
  const p3Event = world.events.find((e) => e.type === 'boss_phase' && e.intensity === 3);
  assert.ok(p3Event, 'Phase 3 should emit boss_phase intensity 3 event');
});





