import * as THREE from 'three';

const cameraState = {
  pointerId: null as number | null,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0.38,
  radius: 15.4,
  initialized: false,
};

const TOUCH_SENSITIVITY_X = 0.0065;
const TOUCH_SENSITIVITY_Y = 0.0048;
const MIN_PITCH = -0.05;
const MAX_PITCH = 1.05;

function isCameraSurface(target: EventTarget | null): boolean {
  return target instanceof HTMLCanvasElement;
}

function applyTouchStyle(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas');
  if (canvas) canvas.style.touchAction = 'none';
}

window.addEventListener('pointerdown', (event) => {
  if (!isCameraSurface(event.target)) return;
  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
  if (cameraState.pointerId !== null) return;
  cameraState.pointerId = event.pointerId;
  cameraState.lastX = event.clientX;
  cameraState.lastY = event.clientY;
});

window.addEventListener('pointermove', (event) => {
  if (event.pointerId !== cameraState.pointerId) return;
  const dx = event.clientX - cameraState.lastX;
  const dy = event.clientY - cameraState.lastY;
  cameraState.lastX = event.clientX;
  cameraState.lastY = event.clientY;
  cameraState.yaw -= dx * TOUCH_SENSITIVITY_X;
  cameraState.pitch = THREE.MathUtils.clamp(
    cameraState.pitch - dy * TOUCH_SENSITIVITY_Y,
    MIN_PITCH,
    MAX_PITCH,
  );
  event.preventDefault();
});

function releasePointer(event: PointerEvent): void {
  if (event.pointerId === cameraState.pointerId) cameraState.pointerId = null;
}
window.addEventListener('pointerup', releasePointer);
window.addEventListener('pointercancel', releasePointer);
window.addEventListener('blur', () => { cameraState.pointerId = null; });

const originalLookAt = THREE.Object3D.prototype.lookAt;
THREE.Object3D.prototype.lookAt = function patchedLookAt(
  x: number | THREE.Vector3,
  y?: number,
  z?: number,
): void {
  if (this instanceof THREE.PerspectiveCamera) {
    const target = x instanceof THREE.Vector3
      ? x
      : new THREE.Vector3(x, y ?? 0, z ?? 0);

    if (!cameraState.initialized) {
      const offset = this.position.clone().sub(target);
      const radius = offset.length();
      if (radius > 0.001) {
        cameraState.radius = radius;
        cameraState.yaw = Math.atan2(offset.x, offset.z);
        cameraState.pitch = Math.asin(THREE.MathUtils.clamp(offset.y / radius, -1, 1));
      }
      cameraState.initialized = true;
    }

    const horizontal = Math.cos(cameraState.pitch) * cameraState.radius;
    const desired = new THREE.Vector3(
      target.x + Math.sin(cameraState.yaw) * horizontal,
      target.y + Math.sin(cameraState.pitch) * cameraState.radius,
      target.z + Math.cos(cameraState.yaw) * horizontal,
    );
    this.position.lerp(desired, 0.16);
    originalLookAt.call(this, target.x, target.y, target.z);
    return;
  }

  originalLookAt.call(this, x instanceof THREE.Vector3 ? x.x : x, y ?? 0, z ?? 0);
};

const observer = new MutationObserver(applyTouchStyle);
observer.observe(document.documentElement, { childList: true, subtree: true });
applyTouchStyle();
