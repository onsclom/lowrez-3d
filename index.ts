const WIDTH = 256;
const HEIGHT = 256;
const NEAR = 0.1;
const FOV = Math.PI / 2;
const FOCAL = 1 / Math.tan(FOV / 2);
const MOVE_SPEED = 3;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2 - 0.01;

type Vec3 = { x: number; y: number; z: number };
type Vec2 = { x: number; y: number };

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

const sphereBillboards: { center: Vec3; radius: number }[] = [
  { center: { x: 0, y: 0, z: 0 }, radius: 1 },
];

const camera = {
  position: { x: 0, y: 0, z: -5 },
  yaw: 0,
  pitch: 0,
};

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
document.body.style.margin = "0";
document.body.style.position = "fixed";
document.body.style.inset = "0";
document.body.style.display = "flex";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.background = "gray";
canvas.style.imageRendering = "pixelated";
canvas.width = WIDTH;
canvas.height = HEIGHT;

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

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("No canvas context");
const pixels = new ImageData(WIDTH, HEIGHT);
const pixels32 = new Uint32Array(pixels.data.buffer);

function worldToCamera(p: Vec3): Vec3 {
  let x = p.x - camera.position.x;
  let y = p.y - camera.position.y;
  let z = p.z - camera.position.z;

  const cy = Math.cos(-camera.yaw);
  const sy = Math.sin(-camera.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  return { x, y, z };
}

function clipEdgeNear(a: Vec3, b: Vec3): [Vec3, Vec3] | null {
  const aIn = a.z > NEAR;
  const bIn = b.z > NEAR;
  if (!aIn && !bIn) return null;
  if (aIn && bIn) return [a, b];
  const t = (NEAR - a.z) / (b.z - a.z);
  const intersect: Vec3 = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: NEAR,
  };
  return aIn ? [a, intersect] : [intersect, b];
}

function project(p: Vec3): Vec2 {
  return {
    x: (p.x * FOCAL) / p.z,
    y: (p.y * FOCAL) / p.z,
  };
}

function toScreen(p: Vec2): Vec2 {
  return {
    x: ((p.x + 1) * WIDTH) / 2,
    y: ((1 - p.y) * HEIGHT) / 2,
  };
}

function drawCircle(cx: number, cy: number, r: number) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(WIDTH - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(HEIGHT - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        pixels32[y * WIDTH + x] = 0xffffffff;
      }
    }
  }
}

function drawLine(start: Vec2, end: Vec2) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xStep = dx / steps;
  const yStep = dy / steps;
  let x = start.x;
  let y = start.y;
  for (let i = 0; i <= steps; i++) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
      pixels32[py * WIDTH + px] = 0xffffffff;
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
  if (keys.has("Space")) camera.position.y += MOVE_SPEED * dt;
  if (keys.has("ShiftLeft") || keys.has("ShiftRight")) {
    camera.position.y -= MOVE_SPEED * dt;
  }

  const scale = Math.min(innerWidth / WIDTH, innerHeight / HEIGHT);
  canvas.style.width = `${WIDTH * scale}px`;
  canvas.style.height = `${HEIGHT * scale}px`;

  // clear the pixels
  pixels32.fill(0xff000000);

  // draw the cube
  const cameraPoints = cubePoints.map(worldToCamera);
  for (const edge of cubeEdges) {
    const clipped = clipEdgeNear(
      cameraPoints[edge.start]!,
      cameraPoints[edge.end]!,
    );
    if (!clipped) continue;
    drawLine(toScreen(project(clipped[0])), toScreen(project(clipped[1])));
  }

  // draw sphere billboards
  for (const sphere of sphereBillboards) {
    const c = worldToCamera(sphere.center);
    if (c.z <= NEAR) continue;
    const screen = toScreen(project(c));
    const radius = ((sphere.radius * FOCAL) / c.z) * (WIDTH / 2);
    drawCircle(screen.x, screen.y, radius);
  }

  ctx.putImageData(pixels, 0, 0);

  requestAnimationFrame(tick);
})();
