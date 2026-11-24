import * as THREE from 'three';

export interface GameTextureSet {
  earthMap: THREE.Texture;
  earthNormal: THREE.CanvasTexture;
  earthRoughness: THREE.CanvasTexture;
  timberMap: THREE.Texture;
  timberNormal: THREE.CanvasTexture;
  timberRoughness: THREE.CanvasTexture;
  stoneMap: THREE.Texture;
  stoneNormal: THREE.CanvasTexture;
  stoneRoughness: THREE.CanvasTexture;
  metalNormal: THREE.CanvasTexture;
  metalRoughness: THREE.CanvasTexture;
  clothNormal: THREE.CanvasTexture;
  clothRoughness: THREE.CanvasTexture;
  barkNormal: THREE.CanvasTexture;
  barkRoughness: THREE.CanvasTexture;
  shieldMap: THREE.CanvasTexture;
  windowMap: THREE.CanvasTexture;
  courtyardDecalTex: THREE.CanvasTexture;
  cursedDecalTex: THREE.CanvasTexture;
  mistTex: THREE.CanvasTexture;
  contactShadowTex: THREE.CanvasTexture;
  selectionRingTex: THREE.CanvasTexture;
  dispose: () => void;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildHeightGrid(
  size: number,
  seed: number,
  mode: 'earth' | 'timber' | 'stone' | 'metal' | 'cloth' | 'bark',
): Float32Array {
  const rand = makeRng(seed);
  const grid = new Float32Array(size * size);

  const coarseSize = 16;
  const coarse = new Float32Array(coarseSize * coarseSize);
  for (let i = 0; i < coarse.length; i++) coarse[i] = rand();

  const sampleCoarse = (u: number, v: number) => {
    const fx = ((u * coarseSize) % coarseSize + coarseSize) % coarseSize;
    const fy = ((v * coarseSize) % coarseSize + coarseSize) % coarseSize;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = (x0 + 1) % coarseSize;
    const y1 = (y0 + 1) % coarseSize;
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = coarse[y0 * coarseSize + x0];
    const b = coarse[y0 * coarseSize + x1];
    const c = coarse[y1 * coarseSize + x0];
    const d = coarse[y1 * coarseSize + x1];
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const macro = sampleCoarse(u, v);
      const mid = sampleCoarse(u * 3.0, v * 3.0);
      const fine = rand();
      let h = 0.5;

      if (mode === 'timber') {
        const plankRow = Math.floor(v * 6);
        const plankSeam = Math.abs(((v * 6) % 1) - 0.5) > 0.45 ? -0.35 : 0;
        const grain = Math.sin(u * Math.PI * 10 + mid * 4.5 + plankRow * 1.7) * 0.2;
        const knots = Math.sin(v * Math.PI * 48 + Math.sin(u * Math.PI * 8) * 1.5) * 0.14;
        h = 0.52 + grain + knots + plankSeam + (fine - 0.5) * 0.12;
      } else if (mode === 'stone') {
        const cracks = Math.abs(Math.sin(u * Math.PI * 8 + macro * 3.2) * Math.cos(v * Math.PI * 8 + mid * 2.5));
        const pitted = cracks < 0.12 ? -0.35 : 0.12;
        h = 0.45 + macro * 0.3 + mid * 0.2 + pitted + (fine - 0.5) * 0.14;
      } else if (mode === 'metal') {
        const brush = Math.sin(u * Math.PI * 64 + fine * 0.8) * 0.08 + Math.sin(v * Math.PI * 4 + u * 6) * 0.05;
        const dings = macro * 0.22 + (mid > 0.72 ? -0.15 : 0.05);
        h = 0.5 + brush + dings + (fine - 0.5) * 0.09;
      } else if (mode === 'cloth') {
        const warp = Math.sin(u * Math.PI * 72) * 0.18;
        const weft = Math.sin(v * Math.PI * 72) * 0.18;
        h = 0.5 + warp + weft + (macro - 0.5) * 0.25 + (fine - 0.5) * 0.08;
      } else if (mode === 'bark') {
        const furrow = Math.sin(u * Math.PI * 24 + macro * 5.0) * 0.28;
        h = 0.5 + furrow + (mid - 0.5) * 0.35 + (fine - 0.5) * 0.16;
      } else {
        h = 0.42 * macro + 0.33 * mid + 0.25 * fine;
      }

      grid[y * size + x] = Math.max(0, Math.min(1, h));
    }
  }
  return grid;
}

function createPbrMapsFromHeight(
  size: number,
  seed: number,
  mode: 'earth' | 'timber' | 'stone' | 'metal' | 'cloth' | 'bark',
  strength: number,
  roughMin: number,
  roughMax: number,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
): { normal: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const height = buildHeightGrid(size, seed, mode);

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(size, size);
  const nData = nImg.data;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(size, size);
  const rData = rImg.data;

  const sampleH = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return height[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const nx = -dX;
      const ny = -dY;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      nData[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      nData[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      nData[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      nData[idx + 3] = 255;

      const hVal = height[y * size + x];
      const roughVal = Math.round((roughMax - hVal * (roughMax - roughMin)) * 255);
      rData[idx] = roughVal;
      rData[idx + 1] = roughVal;
      rData[idx + 2] = roughVal;
      rData[idx + 3] = 255;
    }
  }

  nCtx.putImageData(nImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const normal = new THREE.CanvasTexture(nCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(repeatX, repeatY);
  normal.anisotropy = maxAniso;

  const roughness = new THREE.CanvasTexture(rCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(repeatX, repeatY);
  roughness.anisotropy = maxAniso;

  return { normal, roughness };
}

function createSlavicShieldTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.fillStyle = '#5a1814';
  ctx.fillRect(0, 0, size, size);

  // Subtle plank lines & battle wear
  ctx.strokeStyle = 'rgba(20, 10, 8, 0.45)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    const x = (i / 6) * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Golden Slavic solar ring & eight-ray Perun star
  ctx.strokeStyle = '#d49e3f';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(c, c, 86, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 7;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 28, c + Math.sin(a) * 28);
    ctx.lineTo(c + Math.cos(a) * 80, c + Math.sin(a) * 80);
    ctx.stroke();
  }

  // Scratches
  const rand = makeRng(88);
  ctx.strokeStyle = 'rgba(215, 200, 175, 0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const x1 = rand() * size;
    const y1 = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (rand() - 0.5) * 45, y1 + (rand() - 0.5) * 45);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createWindowMap(maxAniso: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size * 0.5, size * 0.55, 6, size * 0.5, size * 0.55, size * 0.56);
  grad.addColorStop(0, '#fff2b2');
  grad.addColorStop(0.45, '#ff9830');
  grad.addColorStop(0.85, '#c24614');
  grad.addColorStop(1, '#3b180a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#1c1410';
  ctx.lineWidth = 10;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.moveTo(0, size * 0.52);
  ctx.lineTo(size, size * 0.52);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createCourtyardDecalTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;
  const rand = makeRng(31415);

  ctx.clearRect(0, 0, size, size);
  const baseGrad = ctx.createRadialGradient(c, c, 24, c, c, c - 8);
  baseGrad.addColorStop(0, 'rgba(26, 20, 15, 0.86)');
  baseGrad.addColorStop(0.65, 'rgba(34, 27, 20, 0.58)');
  baseGrad.addColorStop(1, 'rgba(25, 20, 15, 0)');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(c, c, c - 6, 0, Math.PI * 2);
  ctx.fill();

  // Scattered radial flagstones & worn mud
  for (let i = 0; i < 42; i++) {
    const a = rand() * Math.PI * 2;
    const dist = 26 + rand() * 82;
    const sx = c + Math.cos(a) * dist;
    const sy = c + Math.sin(a) * dist;
    const w = 10 + rand() * 14;
    const h = 8 + rand() * 12;
    const alpha = Math.max(0.15, (1 - dist / 118) * 0.72);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a + rand() * 0.6);
    ctx.fillStyle = `rgba(${78 + Math.round(rand() * 24)}, ${72 + Math.round(rand() * 20)}, ${64 + Math.round(rand() * 16)}, ${alpha})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = `rgba(12, 10, 8, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createCursedDecalTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(c, c, 24, c, c, c - 4);
  grad.addColorStop(0, 'rgba(6, 14, 10, 0.96)');
  grad.addColorStop(0.6, 'rgba(10, 20, 14, 0.78)');
  grad.addColorStop(1, 'rgba(8, 16, 12, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.fill();

  // Jagged cracked emerald veins radiating outward into cursed earth
  ctx.save();
  ctx.shadowColor = 'rgba(24, 196, 92, 0.65)';
  ctx.shadowBlur = 9;
  ctx.strokeStyle = 'rgba(32, 184, 92, 0.52)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.15;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 34, c + Math.sin(a) * 34);
    ctx.lineTo(c + Math.cos(a + 0.12) * 66, c + Math.sin(a + 0.12) * 66);
    ctx.lineTo(c + Math.cos(a - 0.08) * 96, c + Math.sin(a - 0.08) * 96);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a + 0.12) * 66, c + Math.sin(a + 0.12) * 66);
    ctx.lineTo(c + Math.cos(a + 0.34) * 86, c + Math.sin(a + 0.34) * 86);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(28, 168, 84, 0.38)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([14, 8]);
  ctx.beginPath();
  ctx.arc(c, c, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createMistTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeRng(777);

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 20; i++) {
    const x = size * (0.24 + rand() * 0.52);
    const y = size * (0.24 + rand() * 0.52);
    const r = size * (0.15 + rand() * 0.25);
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(175, 200, 215, 0.2)');
    grad.addColorStop(0.55, 'rgba(130, 160, 180, 0.08)');
    grad.addColorStop(1, 'rgba(100, 130, 150, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.84)');
  grad.addColorStop(0.52, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSelectionRingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 43, c + Math.sin(a) * 43);
    ctx.lineTo(c + Math.cos(a) * 58, c + Math.sin(a) * 58);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadGameTextures(renderer: THREE.WebGLRenderer): GameTextureSet {
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const configureColor = (url: string, repeatX: number, repeatY: number): THREE.Texture => {
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAniso;
    return tex;
  };

  const earthMap = configureColor('/src/assets/images/tex_slavic_earth_1795393097826.jpg', 18, 18);
  const earthPbr = createPbrMapsFromHeight(256, 101, 'earth', 2.6, 0.74, 0.98, 18, 18, maxAniso);

  const timberMap = configureColor('/src/assets/images/tex_dark_timber_1795393098578.jpg', 2, 2);
  const timberPbr = createPbrMapsFromHeight(256, 202, 'timber', 3.2, 0.66, 0.95, 2, 2, maxAniso);

  const stoneMap = configureColor('/src/assets/images/tex_mossy_stone_1795393098707.jpg', 2, 2);
  const stonePbr = createPbrMapsFromHeight(256, 303, 'stone', 3.5, 0.62, 0.96, 2, 2, maxAniso);

  const metalPbr = createPbrMapsFromHeight(256, 404, 'metal', 2.4, 0.18, 0.54, 2, 2, maxAniso);
  const clothPbr = createPbrMapsFromHeight(256, 505, 'cloth', 2.4, 0.8, 0.98, 3, 3, maxAniso);
  const barkPbr = createPbrMapsFromHeight(256, 606, 'bark', 3.4, 0.78, 0.98, 2, 2, maxAniso);

  const shieldMap = createSlavicShieldTexture(maxAniso);
  const windowMap = createWindowMap(maxAniso);
  const courtyardDecalTex = createCourtyardDecalTexture(maxAniso);
  const cursedDecalTex = createCursedDecalTexture(maxAniso);
  const mistTex = createMistTexture();
  const contactShadowTex = createContactShadowTexture();
  const selectionRingTex = createSelectionRingTexture();

  return {
    earthMap,
    earthNormal: earthPbr.normal,
    earthRoughness: earthPbr.roughness,
    timberMap,
    timberNormal: timberPbr.normal,
    timberRoughness: timberPbr.roughness,
    stoneMap,
    stoneNormal: stonePbr.normal,
    stoneRoughness: stonePbr.roughness,
    metalNormal: metalPbr.normal,
    metalRoughness: metalPbr.roughness,
    clothNormal: clothPbr.normal,
    clothRoughness: clothPbr.roughness,
    barkNormal: barkPbr.normal,
    barkRoughness: barkPbr.roughness,
    shieldMap,
    windowMap,
    courtyardDecalTex,
    cursedDecalTex,
    mistTex,
    contactShadowTex,
    selectionRingTex,
    dispose: () => {
      earthMap.dispose();
      earthPbr.normal.dispose();
      earthPbr.roughness.dispose();
      timberMap.dispose();
      timberPbr.normal.dispose();
      timberPbr.roughness.dispose();
      stoneMap.dispose();
      stonePbr.normal.dispose();
      stonePbr.roughness.dispose();
      metalPbr.normal.dispose();
      metalPbr.roughness.dispose();
      clothPbr.normal.dispose();
      clothPbr.roughness.dispose();
      barkPbr.normal.dispose();
      barkPbr.roughness.dispose();
      shieldMap.dispose();
      windowMap.dispose();
      courtyardDecalTex.dispose();
      cursedDecalTex.dispose();
      mistTex.dispose();
      contactShadowTex.dispose();
      selectionRingTex.dispose();
    },
  };
}
