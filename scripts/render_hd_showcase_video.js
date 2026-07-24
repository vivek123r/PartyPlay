import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const width = 960;
const height = 540;
const fps = 60;
const durationSec = 4;
const totalFrames = fps * durationSec;

const outputDir = path.join(process.cwd(), 'public', 'assets', 'videos');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'synthwave_arcade_showcase.mp4');

console.log(`🎬 Rendering HIGH-MOTION 60 FPS HD Video (${width}x${height}, ${totalFrames} frames)...`);

const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-pixel_format', 'rgb24',
  '-video_size', `${width}x${height}`,
  '-framerate', `${fps}`,
  '-i', '-',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '17',
  '-pix_fmt', 'yuv420p',
  outputPath
]);

ffmpeg.stderr.on('data', () => {});

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ High-Motion HD Video created successfully!`);
    console.log(`Location: ${outputPath}`);
    const stats = fs.statSync(outputPath);
    console.log(`File Size: ${Math.round(stats.size / 1024)} KB`);
  } else {
    console.error(`❌ ffmpeg exited with code ${code}`);
  }
});

const frameBuffer = Buffer.alloc(width * height * 3);

function fillRect(x1, y1, w, h, r, g, b) {
  const minX = Math.max(0, Math.floor(x1));
  const maxX = Math.min(width, Math.floor(x1 + w));
  const minY = Math.max(0, Math.floor(y1));
  const maxY = Math.min(height, Math.floor(y1 + h));

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const ptr = (y * width + x) * 3;
      frameBuffer[ptr] = r;
      frameBuffer[ptr + 1] = g;
      frameBuffer[ptr + 2] = b;
    }
  }
}

for (let frame = 0; frame < totalFrames; frame++) {
  const normT = frame / totalFrames; // 0.0 to 1.0
  const timeSec = frame / fps;
  const horizonY = Math.floor(height * 0.44);

  // --- 1. DYNAMIC HIGH-SPEED MOTION CALCULATIONS ---
  // Dramatic bike weaving: moves 350px left and right across 4 seconds
  const bikeX = width / 2 + Math.sin(timeSec * Math.PI * 1.5) * 320;
  const leanAngle = Math.cos(timeSec * Math.PI * 1.5) * 35; // -35 to +35 degrees
  const bikeY = height - 60;

  // Rapidly scrolling road (advances 400m/s in world space)
  const roadScroll = (timeSec * 18.0) % 1.0;

  // AI Car 1: Fast Sports Car overtaking in right lane
  const car1Progress = (timeSec * 0.85) % 1.0;
  const car1GroundT = car1Progress;
  const car1X = width / 2 + car1GroundT * 320;
  const car1Y = horizonY + car1GroundT * (height - horizonY);
  const car1W = Math.max(16, Math.floor(car1GroundT * 120));
  const car1H = Math.max(10, Math.floor(car1GroundT * 80));

  // AI Car 2: Semi Truck cruising in left lane
  const truckProgress = (timeSec * 0.45 + 0.3) % 1.0;
  const truckGroundT = truckProgress;
  const truckX = width / 2 - truckGroundT * 280;
  const truckY = horizonY + truckGroundT * (height - horizonY);
  const truckW = Math.max(22, Math.floor(truckGroundT * 150));
  const truckH = Math.max(18, Math.floor(truckGroundT * 110));

  // --- 2. DRAW BACKGROUND & HIGHWAY ---
  const sunCx = width / 2;
  const sunCy = horizonY - 20;
  const sunR = 60;

  for (let y = 0; y < height; y++) {
    const groundT = (y - horizonY) / (height - horizonY);

    for (let x = 0; x < width; x++) {
      let r = 15, g = 14, b = 23;

      if (y < horizonY) {
        // Sky Gradient
        const skyT = y / horizonY;
        r = Math.floor(15 + skyT * 120);
        g = Math.floor(10 + skyT * 15);
        b = Math.floor(35 + skyT * 90);

        // Rotating Sunbeams
        const dx = x - sunCx;
        const dy = y - sunCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + timeSec * 1.8; // Fast rotating rays

        if (dist > sunR && dist < 320) {
          const ray = Math.sin(angle * 10);
          if (ray > 0.5) {
            const rayA = (1 - dist / 320) * (ray - 0.5) * 2.0;
            r = Math.min(255, Math.floor(r + 220 * rayA));
            g = Math.min(255, Math.floor(g + 40 * rayA));
            b = Math.min(255, Math.floor(b + 140 * rayA));
          }
        }

        // Sun Disc
        if (dist <= sunR) {
          const scanlineY = Math.floor((y - (sunCy - sunR) + timeSec * 30) / 7) % 2 === 0;
          if (!scanlineY || y < sunCy - 10) {
            const sunGrad = (y - (sunCy - sunR)) / (sunR * 2);
            r = Math.floor(255 - sunGrad * 40);
            g = Math.floor(40 + (1 - sunGrad) * 190);
            b = Math.floor(120 * (1 - sunGrad));
          }
        }

      } else if (y >= horizonY && y < horizonY + 4) {
        // Glowing Neon Horizon Strip
        r = 0; g = 240; b = 255;
      } else {
        // 3D Road Perspective
        const roadW = 50 + groundT * groundT * 880;
        const leftEdge = width / 2 - roadW / 2;
        const rightEdge = width / 2 + roadW / 2;

        if (x >= leftEdge && x <= rightEdge) {
          // Asphalt Tarmac
          r = 32; g = 36; b = 48;

          // High-Speed Scrolling Rumble Strips
          const rumbleW = roadW * 0.12;
          const rumbleZ = (roadScroll + 1 / (groundT + 0.04)) % 1.0;
          const isRedRumble = Math.floor(rumbleZ * 12) % 2 === 0;

          if (x < leftEdge + rumbleW || x > rightEdge - rumbleW) {
            if (isRedRumble) { r = 255; g = 71; b = 87; }
            else { r = 255; g = 255; b = 255; }
          }

          // High-Speed Scrolling Center Lane Stripe
          const laneW = roadW * 0.035;
          if (x >= width / 2 - laneW && x <= width / 2 + laneW) {
            const laneZ = (roadScroll + 1 / (groundT + 0.04)) % 1.0;
            if (Math.floor(laneZ * 10) % 2 === 0) {
              r = 255; g = 255; b = 255;
            }
          }

        } else {
          // Grid Grass Field
          r = 16; g = 22; b = 34;
          const gridZ = (roadScroll + 1 / (groundT + 0.04)) % 1.0;
          if (gridZ < 0.08) {
            r = Math.floor(r + 120 * groundT);
            g = Math.floor(g + 80 * groundT);
            b = Math.floor(b + 240 * groundT);
          }
        }
      }

      const ptr = (y * width + x) * 3;
      frameBuffer[ptr] = r;
      frameBuffer[ptr + 1] = g;
      frameBuffer[ptr + 2] = b;
    }
  }

  // --- 3. DRAW MOVING AI VEHICLES ---
  // Car 1 (Sports Sedan)
  if (car1GroundT > 0.1) {
    fillRect(car1X - car1W / 2, car1Y - car1H, car1W, car1H * 0.65, 235, 77, 75);
    fillRect(car1X - car1W * 0.35, car1Y - car1H, car1W * 0.7, car1H * 0.38, 30, 39, 46);
    const tailW = Math.max(3, car1W * 0.25);
    fillRect(car1X - car1W * 0.45, car1Y - car1H * 0.5, tailW, car1H * 0.25, 255, 0, 85);
    fillRect(car1X + car1W * 0.45 - tailW, car1Y - car1H * 0.5, tailW, car1H * 0.25, 255, 0, 85);
  }

  // Car 2 (Semi Truck)
  if (truckGroundT > 0.1) {
    fillRect(truckX - truckW / 2, truckY - truckH, truckW, truckH, 30, 144, 255);
    fillRect(truckX - truckW / 2 + 3, truckY - truckH + 3, truckW - 6, truckH - 6, 53, 59, 72);
    fillRect(truckX - truckW * 0.4, truckY - truckH + 4, truckW * 0.8, Math.max(3, truckH * 0.12), 255, 0, 85);
  }

  // --- 4. DRAW HIGH-SPEED WEAVING SUPERBIKE & RIDER ---
  const leanPx = Math.floor(leanAngle * 0.5);

  // Spinning Tires & Hubs
  fillRect(bikeX - 11, bikeY - 16, 22, 16, 30, 39, 46);
  fillRect(bikeX - 7, bikeY - 14, 14, 12, 47, 53, 66);
  const hubAngle = timeSec * 35; // Fast wheel rotation
  const hubX = bikeX + Math.cos(hubAngle) * 5;
  const hubY = bikeY - 8 + Math.sin(hubAngle) * 5;
  fillRect(hubX - 2, hubY - 2, 4, 4, 244, 209, 96);

  // Bursting Explosive Nitro Flames & Trail
  for (let f = 0; f < 14; f++) {
    const fx = bikeX + (Math.random() - 0.5) * 22 + leanPx * 0.3;
    const fy = bikeY - 4 + Math.random() * 24;
    const colR = Math.random() > 0.5 ? 0 : 255;
    const colG = Math.random() > 0.5 ? 240 : 100;
    const colB = 255;
    fillRect(fx - 2, fy, 5, 5, colR, colG, colB);
  }

  // Dual Chrome Exhaust Pipes
  fillRect(bikeX - 16 + leanPx * 0.2, bikeY - 12, 6, 8, 220, 221, 225);
  fillRect(bikeX + 10 + leanPx * 0.2, bikeY - 12, 6, 8, 220, 221, 225);

  // Bike Body & Fairings
  fillRect(bikeX - 14 + leanPx * 0.5, bikeY - 28, 28, 14, 255, 0, 85);
  fillRect(bikeX - 9 + leanPx * 0.6, bikeY - 34, 18, 8, 255, 0, 85);
  fillRect(bikeX - 9 + leanPx * 0.5, bikeY - 18, 18, 5, 255, 71, 87);

  // Rider Suit & Helmet
  fillRect(bikeX - 12 + leanPx * 0.8, bikeY - 46, 24, 14, 45, 52, 54);
  fillRect(bikeX - 15 + leanPx * 0.8, bikeY - 46, 5, 6, 189, 195, 199);
  fillRect(bikeX + 10 + leanPx * 0.8, bikeY - 46, 5, 6, 189, 195, 199);
  fillRect(bikeX - 7 + leanPx, bikeY - 58, 14, 14, 255, 0, 85);
  fillRect(bikeX - 4 + leanPx, bikeY - 51, 8, 4, 15, 14, 23);

  // --- 5. ANIMATED DYNAMIC HUD ---
  const currentSpeed = Math.round(180 + Math.abs(Math.sin(timeSec * 2)) * 140); // 180 to 320 km/h
  fillRect(20, 16, 170, 32, 15, 14, 23);
  fillRect(20, 16, 170, 3, 0, 240, 255);

  fillRect(210, 16, 180, 16, 15, 14, 23);
  const nitroPct = (timeSec * 0.8) % 1.0;
  fillRect(210, 16, 180 * nitroPct, 16, 255, 0, 85);

  ffmpeg.stdin.write(frameBuffer);
}

ffmpeg.stdin.end();
