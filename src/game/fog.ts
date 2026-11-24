import { MAP_HALF_SIZE, UNIT_STATS } from './constants';
import { BuildingEntity, UnitEntity, WorldState } from './types';

export const FOG_GRID_SIZE = 48;
export const MINIMAP_FOG_SIZE = 24;

export function createFogGrid(): number[] {
  return new Array<number>(FOG_GRID_SIZE * FOG_GRID_SIZE).fill(0);
}

export function worldToFogCell(x: number, z: number): { gx: number; gz: number } {
  const span = MAP_HALF_SIZE * 2;
  const nx = Math.max(0, Math.min(0.9999, (x + MAP_HALF_SIZE) / span));
  const nz = Math.max(0, Math.min(0.9999, (z + MAP_HALF_SIZE) / span));
  return {
    gx: Math.floor(nx * FOG_GRID_SIZE),
    gz: Math.floor(nz * FOG_GRID_SIZE),
  };
}

export function getUnitSightRadius(u: UnitEntity): number {
  const cloakBonus = u.inventory?.includes('veles_cloak') ? 4.0 : 0;
  if (UNIT_STATS[u.kind].isHero) return 12.5 + cloakBonus;
  if (u.kind === 'kholop') return 8.5 + cloakBonus;
  if (u.kind === 'spirit_wolf') return 11.5 + cloakBonus;
  return 11.0 + cloakBonus;
}

export function getBuildingSightRadius(b: BuildingEntity): number {
  if (b.underConstruction) return 7.0;
  if (b.kind === 'vezha') return 15.5;
  if (b.kind === 'detinets') return 14.5;
  return 11.0;
}

function revealDisc(grid: number[], wx: number, wz: number, radius: number): void {
  const span = MAP_HALF_SIZE * 2;
  const cellSize = span / FOG_GRID_SIZE;
  const { gx: cx, gz: cz } = worldToFogCell(wx, wz);
  const cellRad = Math.ceil(radius / cellSize) + 1;
  const r2 = radius * radius;

  const minX = Math.max(0, cx - cellRad);
  const maxX = Math.min(FOG_GRID_SIZE - 1, cx + cellRad);
  const minZ = Math.max(0, cz - cellRad);
  const maxZ = Math.min(FOG_GRID_SIZE - 1, cz + cellRad);

  for (let gz = minZ; gz <= maxZ; gz++) {
    const cellWz = ((gz + 0.5) / FOG_GRID_SIZE) * span - MAP_HALF_SIZE;
    const dz = cellWz - wz;
    for (let gx = minX; gx <= maxX; gx++) {
      const cellWx = ((gx + 0.5) / FOG_GRID_SIZE) * span - MAP_HALF_SIZE;
      const dx = cellWx - wx;
      if (dx * dx + dz * dz <= r2) {
        grid[gz * FOG_GRID_SIZE + gx] = 2;
      }
    }
  }
}

function revealShroudDisc(grid: number[], wx: number, wz: number, radius: number): void {
  const span = MAP_HALF_SIZE * 2;
  const cellSize = span / FOG_GRID_SIZE;
  const { gx: cx, gz: cz } = worldToFogCell(wx, wz);
  const cellRad = Math.ceil(radius / cellSize) + 1;
  const r2 = radius * radius;

  const minX = Math.max(0, cx - cellRad);
  const maxX = Math.min(FOG_GRID_SIZE - 1, cx + cellRad);
  const minZ = Math.max(0, cz - cellRad);
  const maxZ = Math.min(FOG_GRID_SIZE - 1, cz + cellRad);

  for (let gz = minZ; gz <= maxZ; gz++) {
    const cellWz = ((gz + 0.5) / FOG_GRID_SIZE) * span - MAP_HALF_SIZE;
    const dz = cellWz - wz;
    for (let gx = minX; gx <= maxX; gx++) {
      const cellWx = ((gx + 0.5) / FOG_GRID_SIZE) * span - MAP_HALF_SIZE;
      const dx = cellWx - wx;
      const idx = gz * FOG_GRID_SIZE + gx;
      if (dx * dx + dz * dz <= r2 && grid[idx] === 0) {
        grid[idx] = 1;
      }
    }
  }
}

export function updateFogOfWar(world: WorldState): void {
  const grid = world.fogGrid;
  if (grid.length !== FOG_GRID_SIZE * FOG_GRID_SIZE) {
    world.fogGrid = createFogGrid();
  }

  for (let i = 0; i < world.fogGrid.length; i++) {
    if (world.fogGrid[i] === 2) {
      world.fogGrid[i] = 1;
    }
  }

  for (const u of world.units) {
    if (u.dead || u.faction !== 'player') continue;
    revealDisc(world.fogGrid, u.x, u.z, getUnitSightRadius(u));
  }

  for (const b of world.buildings) {
    if (b.dead) continue;
    if (b.faction === 'player') {
      revealDisc(world.fogGrid, b.x, b.z, getBuildingSightRadius(b));
    } else if (b.faction === 'neutral') {
      revealShroudDisc(world.fogGrid, b.x, b.z, 4.4);
    }
  }
}

export function getFogStateAt(world: WorldState, x: number, z: number): 0 | 1 | 2 {
  const { gx, gz } = worldToFogCell(x, z);
  const val = world.fogGrid[gz * FOG_GRID_SIZE + gx] ?? 0;
  return (val === 2 ? 2 : val === 1 ? 1 : 0) as 0 | 1 | 2;
}

export function downsampleFogForMinimap(fogGrid: number[]): number[] {
  const out = new Array<number>(MINIMAP_FOG_SIZE * MINIMAP_FOG_SIZE).fill(0);
  const step = FOG_GRID_SIZE / MINIMAP_FOG_SIZE;
  for (let mz = 0; mz < MINIMAP_FOG_SIZE; mz++) {
    for (let mx = 0; mx < MINIMAP_FOG_SIZE; mx++) {
      let best = 0;
      for (let dz = 0; dz < step; dz++) {
        for (let dx = 0; dx < step; dx++) {
          const val = fogGrid[(mz * step + dz) * FOG_GRID_SIZE + (mx * step + dx)] ?? 0;
          if (val > best) best = val;
        }
      }
      out[mz * MINIMAP_FOG_SIZE + mx] = best;
    }
  }
  return out;
}
