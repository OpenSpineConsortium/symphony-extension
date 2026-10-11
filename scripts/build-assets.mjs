// Draws every image the package and the store need, with Playwright's Chromium, at the exact sizes:
//
//   public/icon/{16,32,48,128}.png            the package icons, from public/icon.svg (128 and 48) and from
//                                            the simpler small geometry below (32 and 16), transparent
//   store-assets/promo-440x280.png            the store's small promo tile, from store-assets/src/tile-440x280.html
//   store-assets/screenshot-1-1280x800.png    the store screenshot, from store-assets/src/screenshot-1-1280x800.html,
//                                            a mock github.com repository header drawn as a static page
//
// Run from anywhere:  node scripts/build-assets.mjs [--pw <playwright-core dir>] [--chromium <path to chrome>]
//
// --pw names an installed playwright-core package (or PLAYWRIGHT_DIR); without it a plain import('playwright-core')
// is tried. --chromium names the browser binary (or CHROMIUM_PATH); without it the script looks under
// /opt/pw-browsers for a chromium-*/chrome-linux/chrome and otherwise lets Playwright find its own. Nothing is
// downloaded: this script never runs "playwright install". playwright-core is not a dependency of the package;
// the images are committed, and CI does not draw them.
//
// The tile and the screenshot are written as 8-bit RGB with no alpha channel, which the Chrome Web Store asks
// for; Chromium writes RGBA, so the PNG is flattened here (it is opaque already; only the channel goes).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

// ---------------------------------------------------------------- the browser
async function loadPlaywright() {
  const dir = opt('--pw') ?? process.env.PLAYWRIGHT_DIR;
  if (dir) return import(pathToFileURL(path.join(dir, 'index.mjs')).href);
  return import('playwright-core');
}

function findChromium() {
  const named = opt('--chromium') ?? process.env.CHROMIUM_PATH;
  if (named) return named;
  const base = '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
  for (const d of dirs) {
    const bin = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(bin)) return bin;
  }
  return undefined;
}

// ---------------------------------------------------------------- the small icons
// At 16 and 32 px the master's eight dots and two-ring centre would blur into a smudge, so the small sizes
// use fewer, larger dots on a tile that fills the canvas, each edge on a whole pixel where it can be.
function smallIcon(size) {
  const dots = size <= 16 ? 6 : 8;
  const ring = size <= 16 ? 5.1 : 10.6;
  const dot = size <= 16 ? 1.65 : 2.5;
  const centre = size <= 16 ? 2.1 : 3.9;
  const c = size / 2;
  const circles = [];
  for (let i = 0; i < dots; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / dots;
    circles.push(`<circle cx="${(c + ring * Math.cos(a)).toFixed(2)}" cy="${(c + ring * Math.sin(a)).toFixed(2)}" r="${dot}"/>`);
  }
  const inner = size <= 16 ? '' : `<circle cx="${c}" cy="${c}" r="1.5" fill="#1F2328"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<rect x="0" y="0" width="${size}" height="${size}" rx="${size <= 16 ? 3.5 : 7}" fill="#1F2328"/>
<g fill="#D97757">${circles.join('')}</g>
<circle cx="${c}" cy="${c}" r="${centre}" fill="#FFF4EC"/>${inner}
</svg>`;
}

// ---------------------------------------------------------------- PNG: inspect and flatten
function chunks(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const out = [];
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    out.push({ type, data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

function info(file) {
  const ch = chunks(fs.readFileSync(file));
  const h = ch[0].data;
  return { w: h.readUInt32BE(0), h: h.readUInt32BE(4), depth: h[8], colorType: h[9], interlace: h[12], trns: ch.some((c) => c.type === 'tRNS') };
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}

/** Paeth, as the PNG specification writes it */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** 8-bit RGBA, not interlaced (what Chromium writes) to 8-bit RGB, composited on white in case a pixel is not opaque */
function flatten(file) {
  const ch = chunks(fs.readFileSync(file));
  const ih = ch[0].data;
  const w = ih.readUInt32BE(0);
  const h = ih.readUInt32BE(4);
  if (ih[8] !== 8 || ih[9] !== 6 || ih[12] !== 0) throw new Error(`${file}: expected 8-bit RGBA, not interlaced`);
  const raw = zlib.inflateSync(Buffer.concat(ch.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const bpp = 4;
  const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      px[y * stride + x] = v & 255;
    }
  }
  const out = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    out[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const s = y * stride + x * 4;
      const d = y * (w * 3 + 1) + 1 + x * 3;
      const alpha = px[s + 3] / 255;
      for (let k = 0; k < 3; k++) out[d + k] = Math.round(px[s + k] * alpha + 255 * (1 - alpha));
    }
  }
  const ihdr = Buffer.from(ih);
  ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(out, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, png);
}

function expectImage(file, w, h, colorType) {
  const i = info(file);
  if (i.w !== w || i.h !== h) throw new Error(`${file}: ${i.w}x${i.h}, expected ${w}x${h}`);
  if (i.depth !== 8 || i.colorType !== colorType || i.trns) throw new Error(`${file}: depth ${i.depth} colour type ${i.colorType} tRNS ${i.trns}`);
  console.log(`${path.relative(ROOT, file)}  ${w}x${h}  ${colorType === 6 ? 'RGBA' : 'RGB'}  ${fs.statSync(file).size} bytes`);
}

// ---------------------------------------------------------------- drawing
const { chromium } = await loadPlaywright();
const executablePath = findChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  async function rasterise(svg, size, file) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    expectImage(file, size, size, 6);
  }

  const master = fs.readFileSync(path.join(ROOT, 'public', 'icon.svg'), 'utf8');
  fs.mkdirSync(path.join(ROOT, 'public', 'icon'), { recursive: true });
  for (const size of [128, 48]) {
    await rasterise(master.replace(/width="128" height="128"/, `width="${size}" height="${size}"`), size, path.join(ROOT, 'public', 'icon', `${size}.png`));
  }
  for (const size of [32, 16]) {
    await rasterise(smallIcon(size), size, path.join(ROOT, 'public', 'icon', `${size}.png`));
  }

  async function render(source, w, h, file) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(pathToFileURL(path.join(ROOT, 'store-assets', 'src', source)).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
    // Chromium writes an opaque screenshot as RGB on some builds and as RGBA on others; only the latter needs flattening
    if (info(file).colorType === 6) flatten(file);
    expectImage(file, w, h, 2);
  }

  await render('tile-440x280.html', 440, 280, path.join(ROOT, 'store-assets', 'promo-440x280.png'));
  await render('screenshot-1-1280x800.html', 1280, 800, path.join(ROOT, 'store-assets', 'screenshot-1-1280x800.png'));
} finally {
  await browser.close();
}
