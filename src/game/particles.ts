import * as THREE from 'three';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  gravity: number;
  r: number;
  g: number;
  b: number;
}

const MAX_PARTICLES = 320;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class PooledParticleSystem {
  public readonly mesh: THREE.InstancedMesh;
  private readonly slots: ParticleSlot[] = [];
  private cursor = 0;

  constructor() {
    const geom = new THREE.OctahedronGeometry(0.14, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geom, mat, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.slots.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0,
        gravity: 0,
        r: 1,
        g: 1,
        b: 1,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
      this.mesh.setColorAt(i, _color.setRGB(1, 1, 1));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    speed = 4.2,
    scale = 1.0,
    gravity = 6.5,
    maxLife = 0.65,
  ): void {
    _color.setHex(hexColor);
    for (let i = 0; i < count; i++) {
      const slot = this.slots[this.cursor];
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;

      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.3 + Math.random() * 0.7) * speed;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.35;
      slot.y = y + Math.random() * 0.3;
      slot.z = z + (Math.random() - 0.5) * 0.35;
      slot.vx = Math.cos(angle) * horiz;
      slot.vy = (0.4 + Math.random() * 0.85) * speed;
      slot.vz = Math.sin(angle) * horiz;
      slot.life = maxLife * (0.65 + Math.random() * 0.5);
      slot.maxLife = slot.life;
      slot.scale = scale * (0.7 + Math.random() * 0.6);
      slot.gravity = gravity;
      slot.r = _color.r;
      slot.g = _color.g;
      slot.b = _color.b;
    }
  }

  public spawnMote(x: number, y: number, z: number, hexColor: number, scale = 0.75): void {
    _color.setHex(hexColor);
    const slot = this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = (Math.random() - 0.5) * 0.55;
    slot.vy = 0.9 + Math.random() * 1.1;
    slot.vz = (Math.random() - 0.5) * 0.55;
    slot.life = 1.1 + Math.random() * 0.6;
    slot.maxLife = slot.life;
    slot.scale = scale;
    slot.gravity = -0.35; // gently floats upward
    slot.r = _color.r;
    slot.g = _color.g;
    slot.b = _color.b;
  }

  public spawnWeatherMote(
    x: number,
    y: number,
    z: number,
    hexColor: number,
    vx: number,
    vy: number,
    vz: number,
    gravity = 0,
    scale = 0.7,
    life = 2.4,
  ): void {
    _color.setHex(hexColor);
    const slot = this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.life = life;
    slot.maxLife = life;
    slot.scale = scale;
    slot.gravity = gravity;
    slot.r = _color.r;
    slot.g = _color.g;
    slot.b = _color.b;
  }

  public update(dt: number): void {
    let anyColor = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      s.vy -= s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const t = s.life / s.maxLife;
      const curScale = Math.max(0.01, s.scale * t);

      _dummy.position.set(s.x, s.y, s.z);
      _dummy.rotation.set(s.life * 4, s.life * 3, 0);
      _dummy.scale.setScalar(curScale);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);

      _color.setRGB(s.r, s.g, s.b);
      this.mesh.setColorAt(i, _color);
      anyColor = true;
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (anyColor && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
