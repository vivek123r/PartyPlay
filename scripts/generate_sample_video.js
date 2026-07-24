import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const width = 480;
const height = 270;
const fps = 60;
const durationSec = 4;
const totalFrames = fps * durationSec;

const outputDir = path.join(process.cwd(), 'public', 'assets', 'videos');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'synthwave_sample.mp4');

console.log(`Generating 60 FPS Synthwave Video Sample (${width}x${height}, ${totalFrames} frames)...`);

// Launch ffmpeg process reading raw RGB24 stream from stdin
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-pixel_format', 'rgb24',
  '-video_size', `${width}x${height}`,
  '-framerate', `${fps}`,
  '-i', '-',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  outputPath
]);

ffmpeg.stderr.on('data', (data) => {
  // Keep output clean
});

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log(`✅ Video generated successfully: ${outputPath}`);
    const stats = fs.statSync(outputPath);
    console.log(`File size: ${Math.round(stats.size / 1024)} KB`);
  } else {
    console.error(`❌ ffmpeg exited with code ${code}`);
  }
});

// Buffer for raw RGB24 frame data (width * height * 3 bytes)
const frameBuffer = Buffer.alloc(width * height * 3);

// Generate each frame programmatically
for (let frame = 0; frame < totalFrames; frame++) {
  const t = frame / totalFrames; // 0.0 to 1.0
  const animTime = frame / fps;

  let ptr = 0;
  const horizonY = Math.floor(height * 0.45);
  const sunCx = width / 2;
  const sunCy = horizonY - 10;
  const sunR = 30;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 15, g = 14, b = 23; // Dark synthwave background

      if (y < horizonY) {
        // --- SKY REGION ---
        // Sky gradient from deep blue-purple to magenta horizon
        const skyT = y / horizonY;
        r = Math.floor(15 + skyT * 80);
        g = Math.floor(14 + skyT * 10);
        b = Math.floor(35 + skyT * 60);

        // Synthwave Sun Disc
        const dx = x - sunCx;
        const dy = y - sunCy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= sunR * sunR) {
          // Scanlines across the sun
          const scanline = Math.floor((y - (sunCy - sunR)) / 4) % 2 === 0;
          if (!scanline || y < sunCy) {
            const sunT = (y - (sunCy - sunR)) / (sunR * 2);
            r = Math.floor(255 - sunT * 30);
            g = Math.floor(50 + (1 - sunT) * 180);
            b = Math.floor(100 * (1 - sunT));
          }
        }

        // Stars
        const starSeed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        if ((starSeed - Math.floor(starSeed)) > 0.992 && distSq > sunR * sunR + 100) {
          const starTwinkle = 0.5 + 0.5 * Math.sin(animTime * 10 + starSeed);
          r = Math.min(255, Math.floor(r + 200 * starTwinkle));
          g = Math.min(255, Math.floor(g + 220 * starTwinkle));
          b = Math.min(255, Math.floor(b + 255 * starTwinkle));
        }

      } else if (y === horizonY || y === horizonY + 1) {
        // --- NEON HORIZON GLOW ---
        r = 0; g = 240; b = 255;
      } else {
        // --- 3D MOVING GRID FLOOR ---
        const groundT = (y - horizonY) / (height - horizonY);
        
        // Dark metallic ground
        r = Math.floor(10 + groundT * 15);
        g = Math.floor(10 + groundT * 15);
        b = Math.floor(25 + groundT * 30);

        // Horizontal scrolling grid lines (moving toward camera)
        const gridSpeed = 2.0;
        const zPos = (animTime * gridSpeed + 1 / (groundT + 0.05)) % 1.0;
        if (zPos < 0.08) {
          const lineAlpha = groundT * groundT;
          r = Math.min(255, Math.floor(r + 255 * lineAlpha));
          g = Math.min(255, Math.floor(g + 0 * lineAlpha));
          b = Math.min(255, Math.floor(b + 150 * lineAlpha));
        }

        // Perspective vertical lines converging to horizon center
        const perspectiveX = (x - width / 2) / (groundT * 400);
        const lineFrac = Math.abs(perspectiveX % 1.0);
        if (lineFrac < 0.08 || lineFrac > 0.92) {
          const vAlpha = groundT * 0.8;
          r = Math.min(255, Math.floor(r + 0 * vAlpha));
          g = Math.min(255, Math.floor(g + 240 * vAlpha));
          b = Math.min(255, Math.floor(b + 255 * vAlpha));
        }
      }

      frameBuffer[ptr++] = r;
      frameBuffer[ptr++] = g;
      frameBuffer[ptr++] = b;
    }
  }

  ffmpeg.stdin.write(frameBuffer);
}

ffmpeg.stdin.end();
