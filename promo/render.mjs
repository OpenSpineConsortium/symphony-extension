// Renders index.html frame by frame in headless Chromium and encodes the
// result. The page draws any time on request, so the renderer only has to
// ask for each frame's time and save what it sees; no clock is involved.
//
//   node render.mjs                 full render: frames, mp4, webm, poster, store image
//   node render.mjs --stills DIR t1 t2 ...   only the frames at those times, into DIR
//
// Environment: CHROME_PATH overrides the Chromium binary, FFMPEG the encoder.

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, unlinkSync, copyFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, 'index.html')).href;
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WIDTH = 1920, HEIGHT = 1080, FPS = 30;
const STORE_TIME = 12.6; // every ball is mid-flight on every arrow, before the heat

function run(cmd, args) {
  console.log('> ' + cmd + ' ' + args.join(' '));
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function pad(n) { return String(n).padStart(5, '0'); }

async function openPage(browser, width, height, query) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(pageUrl + query, { waitUntil: 'load' });
  // Draw a frame that uses the fonts once, so the first saved frame is not
  // the one that pays for loading them.
  await page.evaluate(() => window.renderAt(21));
  return page;
}

// The sound: the page's timeline to timeline.json, sound.py to sfx.wav, and
// the wav muxed into the mp4 (AAC) and the webm (Opus) in place; the picture
// is copied, not re-encoded. Skipped, with a word, where python3 or numpy is
// missing (PYTHON names another interpreter).
async function soundInto(browser) {
  const python = process.env.PYTHON || 'python3';
  try {
    execFileSync(python, ['-c', 'import numpy'], { stdio: 'ignore' });
  } catch (e) {
    console.log('no ' + python + ' with numpy: the video stays silent');
    return;
  }
  const page = await openPage(browser, WIDTH, HEIGHT, '');
  const timeline = await page.evaluate(() => window.timeline());
  writeFileSync(join(here, 'timeline.json'), JSON.stringify(timeline, null, 1) + '\n');
  run(python, [join(here, 'sound.py'), join(here, 'timeline.json'), join(here, 'sfx.wav')]);
  for (const [name, codec] of [['symphony-promo.mp4', ['-c:a', 'aac', '-b:a', '192k']],
                               ['symphony-promo.webm', ['-c:a', 'libopus', '-b:a', '128k']]]) {
    const silent = join(here, name);
    if (!existsSync(silent)) continue;
    const withSound = join(here, 'with-sound-' + name);
    run(FFMPEG, ['-y', '-loglevel', 'error', '-i', silent, '-i', join(here, 'sfx.wav'),
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', ...codec, '-shortest', withSound]);
    copyFileSync(withSound, silent);
    unlinkSync(withSound);
    console.log(name + ': sound muxed in');
  }
}

async function shoot(page, t, path, width, height) {
  await page.evaluate((s) => window.renderAt(s), t);
  await page.screenshot({ path, clip: { x: 0, y: 0, width, height }, animations: 'disabled', caret: 'hide' });
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--font-render-hinting=none'],
});

try {
  const argv = process.argv.slice(2);
  if (argv[0] === '--sound') {
    // the sound alone: the timeline from the page, sound.py, then the mux
    // into the mp4 and the webm already rendered
    await soundInto(browser);
  } else if (argv[0] === '--timeline') {
    // the moments the sound is written against, as the page computes them
    const page = await openPage(browser, WIDTH, HEIGHT, '');
    const timeline = await page.evaluate(() => window.timeline());
    writeFileSync(argv[1], JSON.stringify(timeline, null, 1) + '\n');
    console.log(argv[1] + ': ' + timeline.launches.length + ' launches, ' + timeline.departures.length + ' pair departures');
  } else if (argv[0] === '--stills') {
    const dir = argv[1];
    mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, WIDTH, HEIGHT, '');
    for (const s of argv.slice(2)) {
      const t = parseFloat(s);
      const path = join(dir, 'still-' + s.replace('.', '_') + '.png');
      await shoot(page, t, path, WIDTH, HEIGHT);
      console.log(path);
    }
  } else {
    const framesDir = join(here, 'frames');
    mkdirSync(framesDir, { recursive: true });
    for (const f of readdirSync(framesDir)) if (f.endsWith('.png')) unlinkSync(join(framesDir, f));

    const page = await openPage(browser, WIDTH, HEIGHT, '');
    const duration = await page.evaluate(() => window.DURATION);
    const total = Math.round(duration * FPS);
    console.log('rendering ' + total + ' frames (' + duration + ' s at ' + FPS + ' fps)');
    const started = Date.now();
    for (let i = 0; i < total; i++) {
      await shoot(page, i / FPS, join(framesDir, 'frame-' + pad(i) + '.png'), WIDTH, HEIGHT);
      if (i % 100 === 0) console.log('frame ' + i + '/' + total + ' after ' + ((Date.now() - started) / 1000).toFixed(0) + ' s');
    }

    await soundInto(browser);

    // The store image shows the page at the store's own size: the composition
    // is fitted inside, moved down to sit in the middle, and the background
    // fills the rest, so no bars appear.
    const store = await openPage(browser, 1280, 800, '?w=1280&h=800&dy=115');
    await shoot(store, STORE_TIME, join(here, 'store-1280x800.png'), 1280, 800);

    const input = join(framesDir, 'frame-%05d.png');
    // The frames are RGB; the scaler is told to use the HD matrix when it
    // makes YUV, and the files are tagged to match, so players show the
    // colors the page drew.
    const color = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
    run(FFMPEG, ['-y', '-loglevel', 'error', '-stats', '-framerate', String(FPS), '-i', input,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level', '4.1',
      ...color, '-r', String(FPS), '-movflags', '+faststart', join(here, 'symphony-promo.mp4')]);
    run(FFMPEG, ['-y', '-loglevel', 'error', '-stats', '-framerate', String(FPS), '-i', input,
      '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '28', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
      ...color, '-r', String(FPS), join(here, 'symphony-promo.webm')]);

    copyFileSync(join(framesDir, 'frame-' + pad(total - 1) + '.png'), join(here, 'poster.png'));

    for (const name of ['symphony-promo.mp4', 'symphony-promo.webm', 'poster.png', 'store-1280x800.png']) {
      console.log(name + ': ' + statSync(join(here, name)).size + ' bytes');
    }
  }
} finally {
  await browser.close();
}
