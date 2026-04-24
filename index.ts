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

function project(point: { x: number; y: number; z: number }): {
  x: number;
  y: number;
} {
  return {
    x: point.x / point.z,
    y: point.y / point.z,
  };
}

function worldToScreen(point: { x: number; y: number; z: number }): {
  x: number;
  y: number;
} {
  const projected = project(point);
  return {
    x: ((projected.x + 1) * WIDTH) / 2,
    y: ((projected.y + 1) * HEIGHT) / 2,
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

(function tick() {
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
  for (const edge of cubeEdges) {
    const start = worldToScreen(cubePoints[edge.start]);
    const end = worldToScreen(cubePoints[edge.end]);
    drawLine(start, end);
  }

  ctx.putImageData(pixels, 0, 0);

  requestAnimationFrame(tick);
})();
