/**
 * Generates demo.gif from the ASCII art SVG animation.
 * Each "frame" is a static SVG snapshot at a specific animation timestamp.
 * Uses @resvg/resvg-js (no browser needed) + gif-encoder-2.
 */
import { Resvg } from '@resvg/resvg-js';
import GifEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';
import fs from 'fs';

// ── Art data (same as gen-demo.mjs) ──────────────────────────────────────────

const artAgent = [
  "   \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551\u255a\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255d",
  "  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2554\u2588\u2588\u2557 \u2588\u2588\u2551   \u2588\u2588\u2551   ",
  "  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255d  \u2588\u2588\u2551\u255a\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551   ",
  "  \u2588\u2588\u2551  \u2588\u2588\u2551\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u255a\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2551   ",
  "  \u255a\u2550\u255d  \u255a\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u255d  \u255a\u2550\u2550\u2550\u255d   \u255a\u2550\u255d  "
];

const artSkills = [
  "  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2557\u2588\u2588\u2557     \u2588\u2588\u2557     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "  \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2551 \u2588\u2588\u2554\u255d\u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d",
  "  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2554\u255d \u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "  \u255a\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2551     \u255a\u2550\u2550\u2550\u2550\u2588\u2588\u2551",
  "  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551",
  "  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u255d  \u255a\u2550\u255d\u255a\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d"
];

// ── Character renderer (same as gen-demo.mjs) ─────────────────────────────────

const CW = 9, CH = 14, TH = 1.5, D = TH + 1.5;

function rect(x, y, w, h) {
  if (w <= 0 || h <= 0) return '';
  return `<rect x="${+x.toFixed(1)}" y="${+y.toFixed(1)}" width="${+w.toFixed(1)}" height="${+h.toFixed(1)}" shape-rendering="crispEdges"/>`;
}

function renderChar(ch, col, row, ox, oy) {
  const x = ox + col * CW, y = oy + row * CH;
  const cw = CW - 1, ch2 = CH - 1;
  const cx = x + cw / 2, cy = y + ch2 / 2;
  const cp = ch.codePointAt(0);
  if (cp === 0x20 || cp === 0xa0) return '';
  if (cp === 0x2588) return rect(x, y, cw, ch2);
  if (cp === 0x2550) return rect(x, cy - D/2 - TH, cw, TH) + rect(x, cy + D/2, cw, TH);
  if (cp === 0x2551) return rect(cx - D/2 - TH, y, TH, ch2) + rect(cx + D/2, y, TH, ch2);
  if (cp === 0x2554) return rect(cx-D/2-TH, cy-D/2-TH, x+cw-(cx-D/2-TH), TH) + rect(cx+D/2, cy+D/2, x+cw-(cx+D/2), TH) + rect(cx-D/2-TH, cy-D/2-TH, TH, y+ch2-(cy-D/2-TH)) + rect(cx+D/2, cy+D/2, TH, y+ch2-(cy+D/2));
  if (cp === 0x2557) return rect(x, cy-D/2-TH, cx+D/2+TH-x, TH) + rect(x, cy+D/2, cx-D/2-x, TH) + rect(cx-D/2-TH, cy-D/2-TH, TH, y+ch2-(cy-D/2-TH)) + rect(cx+D/2, cy+D/2, TH, y+ch2-(cy+D/2));
  if (cp === 0x255a) return rect(cx-D/2-TH, y, TH, cy+D/2+TH-y) + rect(cx+D/2, y, TH, cy-D/2-y) + rect(cx-D/2-TH, cy-D/2-TH, x+cw-(cx-D/2-TH), TH) + rect(cx+D/2, cy+D/2, x+cw-(cx+D/2), TH);
  if (cp === 0x255d) return rect(cx-D/2-TH, y, TH, cy+D/2+TH-y) + rect(cx+D/2, y, TH, cy-D/2-y) + rect(x, cy-D/2-TH, cx+D/2+TH-x, TH) + rect(x, cy+D/2, cx-D/2-x, TH);
  if (cp >= 0x2500 && cp <= 0x257f) return rect(x+1, y+ch2/2-TH, cw-2, TH*2);
  return rect(x, y, cw, ch2);
}

function renderArt(lines, color, ox, oy) {
  let out = `<g fill="${color}">`;
  for (let row = 0; row < lines.length; row++) {
    for (let col = 0; col < [...lines[row]].length; col++)
      out += renderChar([...lines[row]][col], col, row, ox, oy);
  }
  return out + '</g>';
}

// ── SVG layout constants ───────────────────────────────────────────────────────

const SVG_W = 900;
const agentCols  = Math.max(...artAgent.map(l  => [...l].length));
const skillsCols = Math.max(...artSkills.map(l => [...l].length));
const agentOX    = Math.round((SVG_W - agentCols  * CW) / 2);
const skillsOX   = Math.round((SVG_W - skillsCols * CW) / 2);
const agentOY    = 90;
const skillsOY   = agentOY + artAgent.length * CH + 10;
const interY     = skillsOY + artSkills.length * CH + 22;
const SVG_H      = interY + 190;

const agentSvg  = renderArt(artAgent,  '#00d9ff', agentOX,  agentOY);
const skillsSvg = renderArt(artSkills, '#ff4da6', skillsOX, skillsOY);

// ── Animation stages ───────────────────────────────────────────────────────────
// Each stage defines which groups are visible. Matches the .d0-.d11 delays.

const STAGES = [
  // [visibleGroups, holdMs]
  // visibleGroups: bitmask d0..d11
  { show: 0b000000000001, hold: 500  }, // d0: prompt
  { show: 0b000000000011, hold: 500  }, // d1: separator top
  { show: 0b000000000111, hold: 600  }, // d2: AGENT logo
  { show: 0b000000001111, hold: 600  }, // d3: SKILLS logo + author
  { show: 0b000000011111, hold: 500  }, // d4: separator bottom
  { show: 0b000000111111, hold: 500  }, // d5: description
  { show: 0b000001111111, hold: 500  }, // d6: menu prompt
  { show: 0b000011111111, hold: 500  }, // d7: Nueva instalación
  { show: 0b000111111111, hold: 500  }, // d8: Instalar repo
  { show: 0b001111111111, hold: 500  }, // d9: Ver skills
  { show: 0b011111111111, hold: 500  }, // d10: Actualizar
  { show: 0b111111111111, hold: 3000 }, // d11: Salir (hold longer)
  { show: 0b000000000000, hold: 600  }, // blank pause before loop
];

// ── SVG element definitions (indexed by d0..d11) ──────────────────────────────

function buildSvgElements(visibleMask) {
  const vis = (bit) => (visibleMask >> bit) & 1 ? '' : ' opacity="0"';

  return `
  <!-- Prompt -->
  <g${vis(0)}>
    <text x="20" y="68" font-size="14" fill="#00d9ff" font-weight="bold" font-family="'Courier New',monospace">$</text>
    <text x="36" y="68" font-size="14" fill="#cbd5e1" font-family="'Courier New',monospace">npx @favelasquez/agentskills</text>
  </g>

  <!-- Separator top -->
  <g${vis(1)}>
    <rect x="20" y="80" width="${SVG_W - 40}" height="1" fill="#1e3a52"/>
  </g>

  <!-- AGENT -->
  <g${vis(2)}>${agentSvg}</g>

  <!-- SKILLS + author -->
  <g${vis(3)}>
    ${skillsSvg}
    <text x="${SVG_W/2}" y="${skillsOY + artSkills.length * CH + 15}" text-anchor="middle" font-size="11" fill="#2d4a63" font-family="'Courier New',monospace">by https://github.com/favelasquez</text>
  </g>

  <!-- Separator bottom -->
  <g${vis(4)}>
    <rect x="20" y="${interY}" width="${SVG_W - 40}" height="1" fill="#1e3a52"/>
  </g>

  <!-- Description -->
  <g${vis(5)}>
    <text x="20" y="${interY+28}" font-size="13" fill="#e2e8f0" font-weight="bold" font-family="'Courier New',monospace">Detect your stack and install AI agent skills</text>
    <text x="20" y="${interY+46}" font-size="11" fill="#2d4a63" font-family="'Courier New',monospace">By https://github.com/favelasquez</text>
  </g>

  <!-- Menu prompt -->
  <g${vis(6)}>
    <text x="20" y="${interY+72}" font-size="13" fill="#48bb78" font-family="'Courier New',monospace">?</text>
    <text x="34" y="${interY+72}" font-size="13" fill="#e2e8f0" font-family="'Courier New',monospace">&#xBF;Qu&#xE9; quer&#xE9;s hacer? ...</text>
  </g>

  <!-- Nueva instalación (selected) -->
  <g${vis(7)}>
    <text x="20" y="${interY+93}" font-size="12" fill="#2d9cdb" font-family="'Courier New',monospace">&gt;</text>
    <text x="32" y="${interY+93}" font-size="12" fill="#2d9cdb" font-family="'Courier New',monospace">Nueva instalaci&#xF3;n</text>
    <text x="170" y="${interY+93}" font-size="12" fill="#3d5a70" font-family="'Courier New',monospace">  detectar stack e instalar skills para tus agentes</text>
  </g>

  <!-- Instalar repo -->
  <g${vis(8)}>
    <text x="32" y="${interY+111}" font-size="12" fill="#8899aa" font-family="'Courier New',monospace">Instalar desde repo personalizado</text>
    <text x="265" y="${interY+111}" font-size="12" fill="#3d5a70" font-family="'Courier New',monospace">  instalar skills desde tu org o comunidad</text>
  </g>

  <!-- Ver skills -->
  <g${vis(9)}>
    <text x="32" y="${interY+129}" font-size="12" fill="#8899aa" font-family="'Courier New',monospace">Ver skills instaladas</text>
    <text x="195" y="${interY+129}" font-size="12" fill="#3d5a70" font-family="'Courier New',monospace">  listar skills con versi&#xF3;n instalada y actualizaciones</text>
  </g>

  <!-- Actualizar -->
  <g${vis(10)}>
    <text x="32" y="${interY+147}" font-size="12" fill="#8899aa" font-family="'Courier New',monospace">Actualizar skills</text>
    <text x="152" y="${interY+147}" font-size="12" fill="#3d5a70" font-family="'Courier New',monospace">  actualizar todas las skills a su &#xFA;ltima versi&#xF3;n</text>
  </g>

  <!-- Salir -->
  <g${vis(11)}>
    <text x="32" y="${interY+165}" font-size="12" fill="#3d5a70" font-family="'Courier New',monospace">Salir</text>
  </g>`;
}

function buildFullSvg(visibleMask) {
  return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${SVG_W}" height="${SVG_H}" rx="10" fill="#0d1b2a"/>
  <!-- Header -->
  <rect width="${SVG_W}" height="40" rx="10" fill="#111e2e"/>
  <rect y="30" width="${SVG_W}" height="10" fill="#111e2e"/>
  <circle cx="20" cy="20" r="6" fill="#ff5f57"/>
  <circle cx="42" cy="20" r="6" fill="#febc2e"/>
  <circle cx="64" cy="20" r="6" fill="#28c840"/>
  <text x="${SVG_W/2}" y="25" text-anchor="middle" fill="#3d5066" font-size="12" font-family="'Courier New',monospace">bash &#x2014; npx @favelasquez/agentskills</text>
  ${buildSvgElements(visibleMask)}
</svg>`;
}

// ── Render frames ─────────────────────────────────────────────────────────────

console.log(`Building ${STAGES.length} frames (${SVG_W}×${SVG_H})…`);

const frames = [];
for (const stage of STAGES) {
  const svgStr = buildFullSvg(stage.show);
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: SVG_W },
    font: { loadSystemFonts: false }
  });
  const rendered = resvg.render();
  const pngBuf   = rendered.asPng();
  const png      = PNG.sync.read(pngBuf);
  frames.push({ pixels: png.data, width: png.width, height: png.height, hold: stage.hold });
  process.stdout.write('.');
}
console.log(' done');

// ── Encode GIF ────────────────────────────────────────────────────────────────

const { width, height } = frames[0];
const encoder = new GifEncoder(width, height, 'neuquant', true);
encoder.setRepeat(0);   // loop forever
encoder.setQuality(10);

encoder.start();
for (const frame of frames) {
  encoder.setDelay(frame.hold);
  encoder.addFrame(new Uint8ClampedArray(frame.pixels));
}
encoder.finish();

const gifBuf = Buffer.from(encoder.out.data);
fs.writeFileSync('demo.gif', gifBuf);
console.log(`\nWrote demo.gif — ${(gifBuf.length / 1024).toFixed(1)} KB`);
