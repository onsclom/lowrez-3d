const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const WIDTH = 256;
const HEIGHT = 256;

document.body.style.margin = "0";
document.body.style.position = "fixed";
document.body.style.inset = "0";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.background = "gray";
canvas.style.imageRendering = "pixelated";

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("No canvas context");
canvas.width = WIDTH;
canvas.height = HEIGHT;

const pixels = new ImageData(WIDTH, HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const i = (y * WIDTH + x) * 4;
    const c = (x + y) & 1 ? 0 : 255;
    pixels.data[i] = c;
    pixels.data[i + 1] = c;
    pixels.data[i + 2] = c;
    pixels.data[i + 3] = 255;
  }
}

const cubePoints = [
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: -1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
];

const cubeEdges = [
  { start: 0, end: 1 },
  { start: 1, end: 2 },
  { start: 2, end: 3 },
  { start: 3, end: 0 },
  { start: 4, end: 5 },
  { start: 5, end: 6 },
  { start: 6, end: 7 },
  { start: 7, end: 4 },
  { start: 0, end: 4 },
  { start: 1, end: 5 },
  { start: 2, end: 6 },
  { start: 3, end: 7 },
];

const NEAR = 0.1;

const camera = {
  position: { x: 0, y: 0, z: -5 },
  yaw: 0,
  pitch: 0,
};

const MOVE_SPEED = 3;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

const keys = new Set<string>();
window.addEventListener("keydown", (e) => keys.add(e.code));
window.addEventListener("keyup", (e) => keys.delete(e.code));

canvas.addEventListener("click", () => canvas.requestPointerLock());
window.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== canvas) return;
  camera.yaw += e.movementX * MOUSE_SENSITIVITY;
  camera.pitch -= e.movementY * MOUSE_SENSITIVITY;
  if (camera.pitch > PITCH_LIMIT) camera.pitch = PITCH_LIMIT;
  if (camera.pitch < -PITCH_LIMIT) camera.pitch = -PITCH_LIMIT;
});

type Vec3 = { x: number; y: number; z: number };
type Vec2 = { x: number; y: number };

function worldToCamera(p: Vec3): Vec3 {
  let x = p.x - camera.position.x;
  let y = p.y - camera.position.y;
  let z = p.z - camera.position.z;

  const cy = Math.cos(-camera.yaw);
  const sy = Math.sin(-camera.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = Math.cos(-camera.pitch);
  const sp = Math.sin(-camera.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  return { x, y, z };
}

function project(p: Vec3): Vec2 {
  return {
    x: p.x / p.z,
    y: p.y / p.z,
  };
}

function toScreen(p: Vec2): Vec2 {
  return {
    x: ((p.x + 1) * WIDTH) / 2,
    y: ((p.y + 1) * HEIGHT) / 2,
  };
}

function drawLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xStep = dx / steps;
  const yStep = dy / steps;
  let x = start.x;
  let y = start.y;
  for (let i = 0; i <= steps; i++) {
    const pixelX = Math.round(x);
    const pixelY = Math.round(y);
    if (pixelX >= 0 && pixelX < WIDTH && pixelY >= 0 && pixelY < HEIGHT) {
      const i = (pixelY * WIDTH + pixelX) * 4;
      pixels.data[i] = 255;
      pixels.data[i + 1] = 255;
      pixels.data[i + 2] = 255;
      pixels.data[i + 3] = 255;
    }
    x += xStep;
    y += yStep;
  }
}

let lastTime = performance.now();

(function tick() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const sinY = Math.sin(camera.yaw);
  const cosY = Math.cos(camera.yaw);
  let fx = 0;
  let fz = 0;
  if (keys.has("KeyW")) {
    fx += sinY;
    fz += cosY;
  }
  if (keys.has("KeyS")) {
    fx -= sinY;
    fz -= cosY;
  }
  if (keys.has("KeyD")) {
    fx += cosY;
    fz -= sinY;
  }
  if (keys.has("KeyA")) {
    fx -= cosY;
    fz += sinY;
  }
  const len = Math.hypot(fx, fz);
  if (len > 0) {
    camera.position.x += (fx / len) * MOVE_SPEED * dt;
    camera.position.z += (fz / len) * MOVE_SPEED * dt;
  }
  if (keys.has("Space")) camera.position.y -= MOVE_SPEED * dt;
  if (keys.has("ShiftLeft") || keys.has("ShiftRight")) {
    camera.position.y += MOVE_SPEED * dt;
  }

  const scale = Math.min(innerWidth / WIDTH, innerHeight / HEIGHT);
  canvas.style.width = `${WIDTH * scale}px`;
  canvas.style.height = `${HEIGHT * scale}px`;

  // clear the pixels
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      pixels.data[i] = 0;
      pixels.data[i + 1] = 0;
      pixels.data[i + 2] = 0;
      pixels.data[i + 3] = 255;
    }
  }

  // draw the cube
  const cameraPoints = cubePoints.map(worldToCamera);
  for (const edge of cubeEdges) {
    const a = cameraPoints[edge.start]!;
    const b = cameraPoints[edge.end]!;
    if (a.z <= NEAR || b.z <= NEAR) continue;
    drawLine(toScreen(project(a)), toScreen(project(b)));
  }

  ctx.putImageData(pixels, 0, 0);

  requestAnimationFrame(tick);
})();
