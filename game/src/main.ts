import * as THREE from 'three';
import './style.css';

type AbilityId = 'emberwake' | 'riftCurrent' | 'stonebloom';

type Ability = {
  label: string;
  key: string;
  color: number;
  cooldown: number;
  cost: number;
  range: number;
  damage: number;
};

type Enemy = {
  group: THREE.Group;
  hp: number;
  maxHp: number;
  alive: boolean;
  attackTimer: number;
  respawnTimer: number;
  spawn: THREE.Vector3;
};

type Boss = {
  group: THREE.Group;
  hp: number;
  maxHp: number;
  phase: number;
  alive: boolean;
  attackTimer: number;
  specialTimer: number;
  spawn: THREE.Vector3;
};

type Effect = {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  rate: number;
};

type Drop = {
  mesh: THREE.Mesh;
  item: string;
  amount: number;
  baseY: number;
  phase: number;
};

const ABILITIES: Record<AbilityId, Ability> = {
  emberwake: { label: 'Emberwake', key: 'Q', color: 0xff6a2d, cooldown: 2.5, cost: 15, range: 22, damage: 28 },
  riftCurrent: { label: 'Rift Current', key: 'E', color: 0x44c9ff, cooldown: 6, cost: 25, range: 9, damage: 20 },
  stonebloom: { label: 'Stonebloom', key: 'R', color: 0xb77aff, cooldown: 9, cost: 35, range: 11, damage: 42 },
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="hud">
    <div class="brand">Tidebreakers <span>Eclipse Sea / survival action RPG</span></div>
    <div class="help"><b>W A S D</b> move &nbsp; <b>SHIFT</b> dodge<br><b>Q E R</b> powers &nbsp; <b>CLICK</b> strike<br><b>F</b> gather from a glowing berry</div>
    <div class="center-message" id="message"></div>
    <div class="crosshair"></div>
    <div class="status">
      <div class="status-head"><div class="level" id="level">LEVEL 1</div><div class="currency" id="currency">0 SHELLS</div></div>
      <div class="bar-row"><span>Health</span><div class="bar"><i id="health-bar"></i></div><span class="bar-value" id="health-value">100</span></div>
      <div class="bar-row"><span>Hunger</span><div class="bar"><i id="hunger-bar"></i></div><span class="bar-value" id="hunger-value">100</span></div>
      <div class="bar-row"><span>Thirst</span><div class="bar"><i id="thirst-bar"></i></div><span class="bar-value" id="thirst-value">100</span></div>
      <div class="bar-row"><span>Stamina</span><div class="bar"><i id="stamina-bar"></i></div><span class="bar-value" id="stamina-value">100</span></div>
    </div>
    <div class="abilities">
      <div class="ability" id="ability-emberwake"><span class="ability-key">Q</span><span class="ability-name">Emberwake</span><span class="ability-cost">15 stamina</span></div>
      <div class="ability" id="ability-riftCurrent"><span class="ability-key">E</span><span class="ability-name">Rift Current</span><span class="ability-cost">25 stamina</span></div>
      <div class="ability" id="ability-stonebloom"><span class="ability-key">R</span><span class="ability-name">Stonebloom</span><span class="ability-cost">35 stamina</span></div>
    </div>
    <div class="boss-hud" id="boss-hud">
      <div class="boss-title"><span>THE ABYSSAL WARDEN</span><b id="boss-phase">PHASE 1</b></div>
      <div class="boss-bar"><i id="boss-bar-fill"></i></div>
      <div class="boss-value" id="boss-value">1000 / 1000</div>
    </div>
    <div class="inventory-panel" id="inventory-panel">
      <div class="inventory-title">PACK <span>press I to hide</span></div>
      <div class="inventory-grid">
        <div><b id="inv-wildFruit">0</b><span>Wild Fruit</span></div>
        <div><b id="inv-seaFiber">0</b><span>Sea Fiber</span></div>
        <div><b id="inv-emberShard">0</b><span>Ember Shard</span></div>
        <div><b id="inv-wardenCore">0</b><span>Warden Core</span></div>
      </div>
      <div class="craft-line">C · craft Tideguard Elixir <small>1 fruit + 3 fiber + 1 shard</small></div>
    </div>
  </div>
`;

const scene = new THREE.Scene();
const sky = new THREE.Color(0x9fcddd);
scene.background = sky;
scene.fog = new THREE.FogExp2(0x9fcddd, 0.0085);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 8, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.prepend(renderer.domElement);

const hemisphere = new THREE.HemisphereLight(0xbde8ff, 0x263b2e, 1.9);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xffe4bd, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
sun.shadow.bias = -0.0002;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

function heightAt(x: number, z: number): number {
  const broad = Math.sin(x * 0.045) * 1.6 + Math.cos(z * 0.055) * 1.1;
  const detail = Math.sin((x + z) * 0.11) * 0.34 + Math.cos((x - z) * 0.08) * 0.24;
  const coast = Math.max(0, (Math.abs(x) - 105) * 0.045) + Math.max(0, (Math.abs(z) - 105) * 0.045);
  return broad + detail - coast;
}

function makeTerrain(): void {
  const geometry = new THREE.PlaneGeometry(280, 280, 72, 72);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = -positions.getY(i);
    positions.setZ(i, heightAt(x, z));
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0x5f9261, roughness: 0.96, metalness: 0.02 });
  const terrain = new THREE.Mesh(geometry, material);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  world.add(terrain);

  const waterGeometry = new THREE.PlaneGeometry(650, 650);
  const water = new THREE.Mesh(waterGeometry, new THREE.MeshPhysicalMaterial({ color: 0x167d9e, roughness: 0.16, metalness: 0.08, transparent: true, opacity: 0.78 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.55;
  world.add(water);
}

function addRock(position: THREE.Vector3, scale: number): void {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 1), new THREE.MeshStandardMaterial({ color: 0x5d6264, roughness: 0.9 }));
  rock.position.copy(position);
  rock.position.y = heightAt(position.x, position.z) + scale * 0.45;
  rock.rotation.set(position.z * 0.1, position.x * 0.09, position.x * 0.03);
  rock.scale.y = 0.7;
  rock.castShadow = true;
  rock.receiveShadow = true;
  world.add(rock);
}

function addTree(position: THREE.Vector3, scale: number): void {
  const tree = new THREE.Group();
  tree.position.copy(position);
  tree.position.y = heightAt(position.x, position.z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.46 * scale, 3.6 * scale, 7), new THREE.MeshStandardMaterial({ color: 0x62452f, roughness: 0.93 }));
  trunk.position.y = 1.8 * scale;
  trunk.castShadow = true;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.2 * scale, 4.8 * scale, 8), new THREE.MeshStandardMaterial({ color: 0x315f48, roughness: 0.92 }));
  leaves.position.y = 5.0 * scale;
  leaves.castShadow = true;
  tree.add(trunk, leaves);
  world.add(tree);
}

makeTerrain();
for (let i = 0; i < 28; i += 1) {
  const x = Math.sin(i * 7.1) * 105;
  const z = Math.cos(i * 4.8) * 102;
  if (Math.abs(x) < 24 && Math.abs(z) < 24) continue;
  addTree(new THREE.Vector3(x, 0, z), 0.75 + (i % 3) * 0.12);
}
for (let i = 0; i < 22; i += 1) {
  const x = Math.cos(i * 5.3) * 96;
  const z = Math.sin(i * 3.4) * 92;
  addRock(new THREE.Vector3(x, 0, z), 0.8 + (i % 4) * 0.28);
}

function makePlayer(): THREE.Group {
  const actor = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc88462, roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x263e59, roughness: 0.6, metalness: 0.1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa8c3ca, roughness: 0.34, metalness: 0.68 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.25, 6, 12), cloth);
  torso.position.y = 1.62;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), skin);
  head.position.y = 3.05;
  head.castShadow = true;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.85), metal);
  shoulder.position.y = 2.22;
  shoulder.castShadow = true;
  const weapon = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.9, 4, 8), metal);
  weapon.position.set(0.95, 1.85, 0.12);
  weapon.rotation.z = -0.45;
  weapon.castShadow = true;
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.82, 4, 8), cloth);
  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.82, 4, 8), cloth);
  leftArm.position.set(-0.88, 1.72, 0);
  rightArm.position.set(0.88, 1.72, 0);
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), metal);
  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), metal);
  leftLeg.position.set(-0.35, 0.45, 0);
  rightLeg.position.set(0.35, 0.45, 0);
  for (const limb of [leftArm, rightArm, leftLeg, rightLeg]) limb.castShadow = true;
  actor.add(torso, head, shoulder, weapon, leftArm, rightArm, leftLeg, rightLeg);
  actor.userData.rig = { head, weapon, leftArm, rightArm, leftLeg, rightLeg };
  return actor;
}

const player = makePlayer();
player.position.set(0, heightAt(0, 28), 28);
world.add(player);

function makeEnemy(position: THREE.Vector3, index: number): Enemy {
  const group = new THREE.Group();
  group.name = `Marauder-${index}`;
  const skin = new THREE.MeshStandardMaterial({ color: 0x996752, roughness: 0.82 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x4b2930, roughness: 0.78 });
  const armor = new THREE.MeshStandardMaterial({ color: 0x574e4f, roughness: 0.48, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 1.25, 5, 10), cloth);
  body.position.y = 1.5;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.43, 16, 12), skin);
  head.position.y = 2.85;
  head.castShadow = true;
  const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), armor);
  pauldron.scale.set(1.5, 0.5, 1);
  pauldron.position.set(0.62, 2.05, 0);
  pauldron.castShadow = true;
  group.add(body, head, pauldron);
  group.position.set(position.x, heightAt(position.x, position.z), position.z);
  world.add(group);
  return { group, hp: 120, maxHp: 120, alive: true, attackTimer: 0, respawnTimer: 0, spawn: position.clone() };
}

const enemies: Enemy[] = [
  makeEnemy(new THREE.Vector3(-19, 0, -10), 1),
  makeEnemy(new THREE.Vector3(5, 0, -18), 2),
  makeEnemy(new THREE.Vector3(24, 0, -9), 3),
  makeEnemy(new THREE.Vector3(-28, 0, 14), 4),
  makeEnemy(new THREE.Vector3(28, 0, 17), 5),
];

function makeBoss(): Boss {
  const arenaPosition = new THREE.Vector3(0, heightAt(0, -58), -58);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(19, 21, 0.9, 48), new THREE.MeshStandardMaterial({ color: 0x303944, roughness: 0.72, metalness: 0.22 }));
  platform.position.copy(arenaPosition).add(new THREE.Vector3(0, -0.25, 0));
  platform.receiveShadow = true;
  platform.castShadow = true;
  world.add(platform);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(17.6, 0.28, 10, 64), new THREE.MeshBasicMaterial({ color: 0xd9535f, transparent: true, opacity: 0.82 }));
  ring.position.copy(arenaPosition).add(new THREE.Vector3(0, 0.38, 0));
  ring.rotation.x = Math.PI / 2;
  world.add(ring);
  for (const x of [-14, 14]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.82, 6, 8), new THREE.MeshStandardMaterial({ color: 0x4a515e, roughness: 0.86, metalness: 0.12 }));
    pillar.position.copy(arenaPosition).add(new THREE.Vector3(x, 3, 0));
    pillar.castShadow = true;
    world.add(pillar);
  }

  const group = new THREE.Group();
  group.name = 'Abyssal Warden';
  group.position.copy(arenaPosition);
  const skin = new THREE.MeshStandardMaterial({ color: 0x49384e, roughness: 0.66, metalness: 0.16 });
  const armor = new THREE.MeshStandardMaterial({ color: 0x1d2f42, roughness: 0.34, metalness: 0.7 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x65d7ff, emissive: 0x207da4, emissiveIntensity: 2.8, roughness: 0.25, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.28, 2.45, 8, 16), skin);
  body.position.y = 2.25;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.86, 20, 14), armor);
  head.position.y = 4.7;
  head.castShadow = true;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), glow);
  core.position.set(0, 2.5, -1.15);
  core.castShadow = true;
  const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.65, 8), glow);
  const rightHorn = leftHorn.clone();
  leftHorn.position.set(-0.62, 5.55, 0);
  rightHorn.position.set(0.62, 5.55, 0);
  leftHorn.rotation.z = -0.38;
  rightHorn.rotation.z = 0.38;
  const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), armor);
  const rightShoulder = leftShoulder.clone();
  leftShoulder.position.set(-1.35, 3.15, 0);
  rightShoulder.position.set(1.35, 3.15, 0);
  group.add(body, head, core, leftHorn, rightHorn, leftShoulder, rightShoulder);
  world.add(group);
  return { group, hp: 1000, maxHp: 1000, phase: 1, alive: true, attackTimer: 1.2, specialTimer: 4.5, spawn: arenaPosition };
}

const boss = makeBoss();
const drops: Drop[] = [];

const berries: THREE.Mesh[] = [];
for (let i = 0; i < 7; i += 1) {
  const x = Math.sin(i * 5.4) * 54;
  const z = Math.cos(i * 4.1) * 50;
  const berry = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe56f5b, emissive: 0x542016, emissiveIntensity: 0.75 }));
  berry.position.set(x, heightAt(x, z) + 0.4, z);
  berry.castShadow = true;
  berry.userData = { active: true, respawn: 0 };
  world.add(berry);
  berries.push(berry);
}

let health = 100;
let hunger = 100;
let thirst = 100;
let stamina = 100;
let level = 1;
let xp = 0;
let shells = 0;
const inventory: Record<string, number> = { wildFruit: 0, seaFiber: 0, emberShard: 0, wardenCore: 0 };
let survivalClock = 0;
let dayClock = 1.3;
const keys = new Set<string>();
const cooldowns: Record<AbilityId, number> = { emberwake: 0, riftCurrent: 0, stonebloom: 0 };
let walkClock = 0;
let dodgeTimer = 0;
let dodgeCooldown = 0;
let attackTimer = 0;
const dodgeVelocity = new THREE.Vector3();
const effects: Effect[] = [];
const message = document.querySelector<HTMLDivElement>('#message')!;
let messageTimer = 0;

function showMessage(text: string): void {
  message.textContent = text;
  message.classList.add('show');
  messageTimer = 2.2;
}

function saveGame(): void {
  localStorage.setItem('tidebreakers-save', JSON.stringify({ health, hunger, thirst, level, xp, shells, inventory }));
}

function loadGame(): void {
  const raw = localStorage.getItem('tidebreakers-save');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Partial<typeof gameSave>;
    health = typeof saved.health === 'number' ? saved.health : health;
    hunger = typeof saved.hunger === 'number' ? saved.hunger : hunger;
    thirst = typeof saved.thirst === 'number' ? saved.thirst : thirst;
    level = typeof saved.level === 'number' ? saved.level : level;
    xp = typeof saved.xp === 'number' ? saved.xp : xp;
    shells = typeof saved.shells === 'number' ? saved.shells : shells;
    if (saved.inventory && typeof saved.inventory === 'object') Object.assign(inventory, saved.inventory);
  } catch {
    localStorage.removeItem('tidebreakers-save');
  }
}

const gameSave = { health, hunger, thirst, level, xp, shells, inventory };
loadGame();

function gainXp(amount: number): void {
  xp += amount;
  const threshold = 100 + (level - 1) * 45;
  if (xp >= threshold) {
    xp -= threshold;
    level += 1;
    health = Math.min(100, health + 16);
    stamina = 100;
    showMessage(`LEVEL UP — you are now level ${level}`);
  }
}

function spawnDrop(item: string, amount: number, position: THREE.Vector3, color: number): void {
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.7, roughness: 0.28, metalness: 0.48 });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), material);
  mesh.position.set(position.x, heightAt(position.x, position.z) + 0.8, position.z);
  mesh.castShadow = true;
  world.add(mesh);
  drops.push({ mesh, item, amount, baseY: mesh.position.y, phase: position.x * 0.12 + position.z * 0.08 });
}

function collectDrop(drop: Drop): void {
  inventory[drop.item] = (inventory[drop.item] ?? 0) + drop.amount;
  world.remove(drop.mesh);
  const material = drop.mesh.material as THREE.MeshStandardMaterial;
  drop.mesh.geometry.dispose();
  material.dispose();
  const index = drops.indexOf(drop);
  if (index >= 0) drops.splice(index, 1);
  showMessage(`+${drop.amount} ${drop.item}`);
}

function damageEnemy(enemy: Enemy, amount: number, knockback: THREE.Vector3): void {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  enemy.group.position.add(knockback);
  enemy.group.position.y = heightAt(enemy.group.position.x, enemy.group.position.z);
  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.group.visible = false;
    enemy.respawnTimer = 7;
    xp += 35;
    shells += 18;
    spawnDrop('emberShard', 1, enemy.group.position, 0xff743e);
    spawnDrop('seaFiber', 1, enemy.group.position.clone().add(new THREE.Vector3(0.8, 0, 0.3)), 0x77d6a1);
    gainXp(0);
    showMessage('+35 XP  /  +18 SHELLS');
  }
}

function createPowerEffect(id: AbilityId, origin: THREE.Vector3, direction: THREE.Vector3): void {
  const ability = ABILITIES[id];
  const material = new THREE.MeshBasicMaterial({ color: ability.color, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false });
  let mesh: THREE.Mesh;
  let rate = 4;
  if (id === 'emberwake') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(6, 5, ability.range), material);
    mesh.position.copy(origin).add(direction.clone().multiplyScalar(ability.range * 0.5));
    mesh.rotation.y = Math.atan2(direction.x, direction.z);
    rate = 2.4;
  } else {
    mesh = new THREE.Mesh(new THREE.TorusGeometry(ability.range * 0.45, 0.24, 8, 44), material);
    mesh.position.copy(origin).add(new THREE.Vector3(0, 0.22, 0));
    mesh.rotation.x = Math.PI / 2;
    rate = 3.2;
  }
  world.add(mesh);
  effects.push({ mesh, life: 0.55, maxLife: 0.55, rate });
}

function createBossShockwave(origin: THREE.Vector3, radius: number, color: number): void {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.74, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.32, 0.3, 10, 56), material);
  mesh.position.copy(origin).add(new THREE.Vector3(0, 0.3, 0));
  mesh.rotation.x = Math.PI / 2;
  world.add(mesh);
  effects.push({ mesh, life: 0.9, maxLife: 0.9, rate: 3.8 });
}

function createSlashEffect(origin: THREE.Vector3, direction: THREE.Vector3): void {
  const material = new THREE.MeshBasicMaterial({ color: 0xd7f5ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 8, 32, Math.PI * 1.25), material);
  mesh.position.copy(origin).add(direction.clone().multiplyScalar(1.3));
  mesh.rotation.set(Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
  world.add(mesh);
  effects.push({ mesh, life: 0.24, maxLife: 0.24, rate: 1.8 });
}

function getMovementDirection(): THREE.Vector3 {
  const movement = new THREE.Vector3(
    (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0),
    0,
    (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0),
  );
  if (movement.lengthSq() === 0) return new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
  return movement.normalize();
}

function startDodge(): void {
  if (dodgeCooldown > 0 || stamina < 18 || dodgeTimer > 0) return;
  dodgeTimer = 0.28;
  dodgeCooldown = 0.85;
  stamina -= 18;
  dodgeVelocity.copy(getMovementDirection()).multiplyScalar(25);
  showMessage('DODGE');
}

function performBasicAttack(): void {
  if (attackTimer > 0 || dodgeTimer > 0) return;
  attackTimer = 0.42;
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.7, 0));
  createSlashEffect(origin, direction);
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const toEnemy = enemy.group.position.clone().sub(player.position);
    toEnemy.y = 0;
    if (toEnemy.length() <= 4.2 && direction.dot(toEnemy.normalize()) > 0.25) {
      damageEnemy(enemy, 18 + level * 2, direction.clone().multiplyScalar(1.25));
    }
  }
  if (boss.alive) {
    const toBoss = boss.group.position.clone().sub(player.position);
    toBoss.y = 0;
    if (toBoss.length() <= 5.2 && direction.dot(toBoss.normalize()) > 0.1) {
      damageBoss(22 + level * 2, direction.clone().multiplyScalar(0.3));
    }
  }
}

function damageBoss(amount: number, knockback: THREE.Vector3): void {
  if (!boss.alive) return;
  boss.hp = Math.max(0, boss.hp - amount);
  boss.group.position.add(knockback);
  boss.group.position.y = heightAt(boss.group.position.x, boss.group.position.z);
  if (boss.hp <= boss.maxHp * 0.5 && boss.phase === 1) {
    boss.phase = 2;
    boss.specialTimer = 1.2;
    showMessage('THE WARDEN ENTERS PHASE 2');
  }
  if (boss.hp <= 0) {
    boss.alive = false;
    boss.group.visible = false;
    xp += 450;
    shells += 250;
    spawnDrop('wardenCore', 1, boss.group.position, 0x65d7ff);
    spawnDrop('emberShard', 2, boss.group.position.clone().add(new THREE.Vector3(1.2, 0, 0)), 0xff743e);
    spawnDrop('seaFiber', 4, boss.group.position.clone().add(new THREE.Vector3(-1.2, 0, 0)), 0x77d6a1);
    gainXp(0);
    showMessage('WARDEN DEFEATED  /  LOOT DROPPED');
  }
}

function cast(id: AbilityId): void {
  const ability = ABILITIES[id];
  if (cooldowns[id] > 0) return;
  if (stamina < ability.cost) {
    showMessage('Not enough stamina');
    return;
  }
  cooldowns[id] = ability.cooldown;
  stamina -= ability.cost;
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  createPowerEffect(id, origin, direction);

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const toEnemy = enemy.group.position.clone().sub(player.position);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    if (distance > ability.range) continue;
    const knockback = distance > 0 ? toEnemy.normalize().multiplyScalar(id === 'stonebloom' ? 1.6 : 0.85) : new THREE.Vector3();
    if (id === 'emberwake' && distance > 5 && direction.dot(toEnemy.clone().normalize()) < 0.62) continue;
    damageEnemy(enemy, ability.damage, knockback);
  }
  if (boss.alive) {
    const toBoss = boss.group.position.clone().sub(player.position);
    toBoss.y = 0;
    const bossDistance = toBoss.length();
    if (bossDistance <= ability.range && (id !== 'emberwake' || bossDistance <= 5 || direction.dot(toBoss.clone().normalize()) >= 0.5)) {
      damageBoss(ability.damage * 0.8, bossDistance > 0 ? toBoss.normalize().multiplyScalar(0.35) : new THREE.Vector3());
    }
  }
}

function gather(): void {
  for (const drop of [...drops]) {
    if (drop.mesh.position.distanceTo(player.position) <= 4.5) {
      collectDrop(drop);
      return;
    }
  }
  for (const berry of berries) {
    if (!berry.userData.active) continue;
    if (berry.position.distanceTo(player.position) > 4) continue;
    berry.userData.active = false;
    berry.userData.respawn = 14;
    berry.visible = false;
    inventory.wildFruit += 1;
    hunger = Math.min(100, hunger + 23);
    thirst = Math.min(100, thirst + 5);
    showMessage('Wild fruit gathered  +23 hunger');
    return;
  }
}

function updateDrops(dt: number): void {
  for (const drop of drops) {
    drop.mesh.rotation.y += dt * 2.4;
    drop.mesh.rotation.x += dt * 0.7;
    drop.mesh.position.y = drop.baseY + Math.sin(survivalClock * 2.6 + drop.phase) * 0.16;
  }
}

function craftTideguard(): void {
  if (inventory.wildFruit < 1 || inventory.seaFiber < 3 || inventory.emberShard < 1) {
    showMessage('Need 1 fruit, 3 fiber and 1 shard');
    return;
  }
  inventory.wildFruit -= 1;
  inventory.seaFiber -= 3;
  inventory.emberShard -= 1;
  health = Math.min(100, health + 38);
  thirst = Math.min(100, thirst + 12);
  showMessage('TIDEGUARD ELIXIR USED  +38 HEALTH');
}

function updateSurvival(dt: number): void {
  hunger = Math.max(0, hunger - dt * 0.34);
  thirst = Math.max(0, thirst - dt * 0.52);
  stamina = Math.min(100, stamina + dt * (keys.size ? 8 : 15));
  if (hunger < 15 || thirst < 15) health = Math.max(0, health - dt * 1.1);
  if (health <= 0) {
    health = 100;
    hunger = 60;
    thirst = 60;
    player.position.set(0, heightAt(0, 28), 28);
    showMessage('You washed ashore again');
  }
  for (const berry of berries) {
    if (!berry.userData.active) {
      berry.userData.respawn -= dt;
      if (berry.userData.respawn <= 0) {
        berry.userData.active = true;
        berry.visible = true;
      }
    }
  }
}

function updateEnemies(dt: number): void {
  for (const enemy of enemies) {
    if (!enemy.alive) {
      enemy.respawnTimer -= dt;
      if (enemy.respawnTimer <= 0) {
        enemy.alive = true;
        enemy.hp = enemy.maxHp;
        enemy.group.visible = true;
        enemy.group.position.set(enemy.spawn.x, heightAt(enemy.spawn.x, enemy.spawn.z), enemy.spawn.z);
      }
      continue;
    }
    const toPlayer = player.position.clone().sub(enemy.group.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance < 26 && distance > 2.7) {
      toPlayer.normalize();
      enemy.group.position.add(toPlayer.multiplyScalar(dt * 2.1));
      enemy.group.position.y = heightAt(enemy.group.position.x, enemy.group.position.z);
      enemy.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }
    enemy.attackTimer -= dt;
    if (distance < 3.1 && enemy.attackTimer <= 0) {
      enemy.attackTimer = 1.35;
      health = Math.max(0, health - 8);
      showMessage('A Marauder struck you');
    }
  }
}

function updatePlayer(dt: number): void {
  dodgeCooldown = Math.max(0, dodgeCooldown - dt);
  attackTimer = Math.max(0, attackTimer - dt);
  if (dodgeTimer > 0) {
    dodgeTimer -= dt;
    player.position.add(dodgeVelocity.clone().multiplyScalar(dt));
    dodgeVelocity.multiplyScalar(0.86);
    player.position.y = heightAt(player.position.x, player.position.z);
    return;
  }

  const movement = getMovementDirection();
  const isMoving = keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d');
  if (isMoving) {
    const speed = stamina > 2 ? 7.2 : 2.4;
    player.position.add(movement.clone().multiplyScalar(speed * dt));
    player.rotation.y = Math.atan2(movement.x, movement.z);
    stamina = Math.max(0, stamina - dt * 3.2);
  }

  walkClock += dt * (isMoving ? 11 : 2.2);
  const rig = player.userData.rig as Record<string, THREE.Object3D>;
  const stride = isMoving ? Math.sin(walkClock) * 0.55 : Math.sin(walkClock) * 0.035;
  rig.leftArm.rotation.x = stride;
  rig.rightArm.rotation.x = -stride;
  rig.leftLeg.rotation.x = -stride;
  rig.rightLeg.rotation.x = stride;
  rig.head.position.y = 3.05 + (isMoving ? Math.abs(Math.sin(walkClock)) * 0.035 : 0);
  if (attackTimer > 0) {
    rig.weapon.rotation.x = -Math.sin((attackTimer / 0.42) * Math.PI) * 1.3;
  } else {
    rig.weapon.rotation.x = 0;
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -126, 126);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -126, 126);
  player.position.y = heightAt(player.position.x, player.position.z);
}

function updateBoss(dt: number): void {
  if (!boss.alive) return;
  const toPlayer = player.position.clone().sub(boss.group.position);
  toPlayer.y = 0;
  const distance = toPlayer.length();
  boss.attackTimer -= dt;
  boss.specialTimer -= dt;
  if (distance < 48 && distance > 6) {
    toPlayer.normalize();
    boss.group.position.add(toPlayer.multiplyScalar(dt * (boss.phase === 2 ? 3.2 : 2.25)));
    boss.group.position.y = heightAt(boss.group.position.x, boss.group.position.z);
    boss.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
  }
  if (distance <= 6.2 && boss.attackTimer <= 0) {
    boss.attackTimer = boss.phase === 2 ? 0.9 : 1.35;
    if (dodgeTimer <= 0) health = Math.max(0, health - (boss.phase === 2 ? 15 : 10));
    showMessage(boss.phase === 2 ? 'WARDEN CRUSH' : 'WARDEN STRIKE');
  }
  if (boss.specialTimer <= 0) {
    boss.specialTimer = boss.phase === 2 ? 4.4 : 7.2;
    const radius = boss.phase === 2 ? 15 : 11;
    createBossShockwave(boss.group.position, radius, boss.phase === 2 ? 0xff4b78 : 0x65d7ff);
    if (distance <= radius && dodgeTimer <= 0) {
      health = Math.max(0, health - (boss.phase === 2 ? 26 : 16));
      showMessage('THE SEA BREAKS BENEATH YOU');
    }
  }
}

function updateCamera(): void {
  const desired = player.position.clone().add(new THREE.Vector3(0, 7.4, 13.5));
  camera.position.lerp(desired, 0.09);
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
}

function updateDayNight(dt: number): void {
  dayClock = (dayClock + dt * 0.035) % (Math.PI * 2);
  const daylight = Math.max(0.12, Math.sin(dayClock) * 0.5 + 0.5);
  sun.position.set(Math.cos(dayClock) * 95, 22 + daylight * 90, Math.sin(dayClock) * 95);
  sun.intensity = 0.65 + daylight * 2.2;
  hemisphere.intensity = 0.65 + daylight * 1.15;
  sky.setHSL(0.55, 0.36, 0.26 + daylight * 0.28);
  (scene.fog as THREE.FogExp2).color.copy(sky);
}

function updateEffects(dt: number): void {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.life -= dt;
    effect.mesh.scale.addScalar(dt * effect.rate);
    const material = effect.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, effect.life / effect.maxLife) * 0.78;
    if (effect.life <= 0) {
      world.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      material.dispose();
      effects.splice(i, 1);
    }
  }
}

function updateHud(): void {
  const setBar = (id: string, value: number): void => {
    const bar = document.querySelector<HTMLElement>(`#${id}-bar`);
    const label = document.querySelector<HTMLElement>(`#${id}-value`);
    if (bar) bar.style.width = `${Math.round(value)}%`;
    if (label) label.textContent = String(Math.round(value));
  };
  document.querySelector<HTMLElement>('#level')!.textContent = `LEVEL ${level}  /  XP ${xp}`;
  document.querySelector<HTMLElement>('#currency')!.textContent = `${shells} SHELLS`;
  const bossHud = document.querySelector<HTMLElement>('#boss-hud')!;
  bossHud.classList.toggle('show', boss.alive && player.position.distanceTo(boss.group.position) < 60);
  document.querySelector<HTMLElement>('#boss-bar-fill')!.style.width = `${Math.round((boss.hp / boss.maxHp) * 100)}%`;
  document.querySelector<HTMLElement>('#boss-value')!.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
  document.querySelector<HTMLElement>('#boss-phase')!.textContent = `PHASE ${boss.phase}`;
  for (const item of ['wildFruit', 'seaFiber', 'emberShard', 'wardenCore']) {
    const element = document.querySelector<HTMLElement>(`#inv-${item}`);
    if (element) element.textContent = String(inventory[item] ?? 0);
  }
  setBar('health', health);
  setBar('hunger', hunger);
  setBar('thirst', thirst);
  setBar('stamina', stamina);
  for (const id of Object.keys(ABILITIES) as AbilityId[]) {
    const card = document.querySelector<HTMLElement>(`#ability-${id}`);
    if (!card) continue;
    card.classList.toggle('cooling', cooldowns[id] > 0);
    const ability = ABILITIES[id];
    const remaining = cooldowns[id] > 0 ? `  ${cooldowns[id].toFixed(1)}s` : '';
    card.querySelector<HTMLElement>('.ability-name')!.textContent = ability.label + remaining;
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === 'shift') startDodge();
  if (key === 'q') cast('emberwake');
  if (key === 'e') cast('riftCurrent');
  if (key === 'r') cast('stonebloom');
  if (key === 'f') gather();
  if (key === 'c') craftTideguard();
  if (key === 'i') document.querySelector<HTMLElement>('#inventory-panel')!.classList.toggle('hidden');
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('pointerdown', (event) => {
  if (event.button === 0) performBasicAttack();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();
let saveTimer = 0;
function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  survivalClock += dt;
  saveTimer += dt;
  for (const id of Object.keys(cooldowns) as AbilityId[]) cooldowns[id] = Math.max(0, cooldowns[id] - dt);
  updatePlayer(dt);
  updateSurvival(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateCamera();
  updateDayNight(dt);
  updateEffects(dt);
  updateDrops(dt);
  updateHud();
  if (saveTimer > 10) { saveTimer = 0; saveGame(); }
  if (messageTimer > 0) { messageTimer -= dt; if (messageTimer <= 0) message.classList.remove('show'); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

showMessage('Survive the Eclipse Sea');
requestAnimationFrame(loop);
