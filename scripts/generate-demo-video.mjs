import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, '.demo');
const FRAMES_DIR = path.join(OUT_DIR, 'frames');
const OUT_VIDEO = path.join(OUT_DIR, 'pacman-demo.mp4');
const FPS = 12;
const DURATION_SEC = 10;
const TOTAL_FRAMES = FPS * DURATION_SEC;
const BASE_URL = process.env.DEMO_URL ?? 'http://127.0.0.1:4173';
const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/chromium';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready: ${url}`);
}

async function main() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(FRAMES_DIR, { recursive: true });

  const dev = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  try {
    await waitForServer(BASE_URL);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_PATH,
      args: ['--no-sandbox', '--disable-gpu'],
      defaultViewport: { width: 1280, height: 720 },
    });

    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

      // trigger intro/menu sequence then start game
      await page.mouse.click(640, 360);
      await sleep(3300);
      await page.keyboard.press('Enter');
      await sleep(500);

      const frameDelay = Math.round(1000 / FPS);
      for (let i = 0; i < TOTAL_FRAMES; i += 1) {
        const frame = path.join(FRAMES_DIR, `frame-${String(i).padStart(4, '0')}.png`);
        await page.screenshot({ path: frame });

        // Keep gameplay moving a bit so demo feels alive
        if (i % 8 === 0) await page.keyboard.press('ArrowRight');
        if (i % 18 === 0) await page.keyboard.press('ArrowDown');
        if (i % 26 === 0) await page.keyboard.press('ArrowLeft');

        await sleep(frameDelay);
      }
    } finally {
      await browser.close();
    }

    await run('ffmpeg', [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(FRAMES_DIR, 'frame-%04d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      OUT_VIDEO,
    ]);

    console.log(`Demo video created: ${OUT_VIDEO}`);
  } finally {
    dev.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
