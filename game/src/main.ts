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

type Effect = {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  rate: number;
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
  localStorage.setItem('tidebreakers-save', JSON.stringify({ health, hunger, thirst, level, xp, shells }));
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
  } catch {
    localStorage.removeItem('tidebreakers-save');
  }
}

const gameSave = { health, hunger, thirst, level, xp, shells };
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
}

function gather(): void {
  for (const berry of berries) {
    if (!berry.userData.active) continue;
    if (berry.position.distanceTo(player.position) > 4) continue;
    berry.userData.active = false;
    berry.userData.respawn = 14;
    berry.visible = false;
    hunger = Math.min(100, hunger + 23);
    thirst = Math.min(100, thirst + 5);
    showMessage('Wild fruit gathered  +23 hunger');
    return;
  }
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
  updateCamera();
  updateDayNight(dt);
  updateEffects(dt);
  updateHud();
  if (saveTimer > 10) { saveTimer = 0; saveGame(); }
  if (messageTimer > 0) { messageTimer -= dt; if (messageTimer <= 0) message.classList.remove('show'); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

showMessage('Survive the Eclipse Sea');
requestAnimationFrame(loop);
