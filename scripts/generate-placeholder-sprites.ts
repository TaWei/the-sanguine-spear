import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const UNIT_CLASSES = ['lord', 'mercenary', 'mage', 'archer', 'cavalry', 'pegasus_knight', 'soldier', 'brigand'];
const FACTIONS = ['player', 'enemy', 'ally'];
const STATES = ['idle', 'move', 'attack', 'hit', 'death', 'dodge', 'crit'];
const WEAPONS = ['sword', 'axe', 'lance', 'bow', 'magic'];

const FACTION_COLORS: Record<string, string> = {
  player: '#3498db',
  enemy: '#e74c3c',
  ally: '#2ecc71',
};

const FRAME_W = 64;
const FRAME_H = 64;
const FRAMES_PER_ROW = 8;

function drawFrame(ctx: CanvasRenderingContext2D, state: string, frameIndex: number, color: string) {
  ctx.fillStyle = color;
  const cx = FRAME_W / 2;
  const cy = FRAME_H / 2;

  switch (state) {
    case 'idle':
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, cy + 2, 20, 22);
      break;
    case 'move': {
      const offset = frameIndex * 4;
      ctx.beginPath();
      ctx.arc(cx + (frameIndex % 2 === 0 ? offset : -offset), cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10 + (frameIndex % 2 === 0 ? offset : -offset), cy + 2, 20, 22);
      break;
    }
    case 'attack': {
      const armX = frameIndex < 3 ? cx - 12 + frameIndex * 8 : cx + 12;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, cy + 2, 20, 22);
      ctx.fillRect(armX, cy - 4, 18, 6);
      break;
    }
    case 'crit': {
      const cArmX = frameIndex < 4 ? cx - 14 + frameIndex * 7 : cx + 14;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, cy + 2, 20, 22);
      ctx.fillRect(cArmX, cy - 6, 22, 6);
      if (frameIndex > 5) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 16, cy - 16, 32, 32);
      }
      break;
    }
    case 'hit':
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, FRAME_W, FRAME_H);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + 4, cy - 4, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 6, cy + 6, 20, 22);
      break;
    case 'death': {
      const slump = frameIndex * 4;
      ctx.beginPath();
      ctx.arc(cx + slump, cy - 8 + slump, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10 + slump, cy + 2 + slump, 20, 22);
      ctx.globalAlpha = Math.max(0, 1 - frameIndex * 0.25);
      break;
    }
    case 'dodge': {
      const dodgeOffset = frameIndex === 0 ? -12 : 12;
      ctx.beginPath();
      ctx.arc(cx + dodgeOffset, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10 + dodgeOffset, cy + 2, 20, 22);
      break;
    }
    default:
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
  }
}

function generateSheet(key: string, states: string[], frameCounts: Record<string, number>, color: string) {
  const totalFrames = states.reduce((sum, s) => sum + frameCounts[s], 0);
  const cols = Math.min(FRAMES_PER_ROW, totalFrames);
  const rows = Math.ceil(totalFrames / cols);

  const canvas = createCanvas(cols * FRAME_W, rows * FRAME_H);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let frameIndex = 0;
  for (const state of states) {
    const count = frameCounts[state];
    for (let i = 0; i < count; i++) {
      const col = frameIndex % cols;
      const row = Math.floor(frameIndex / cols);
      ctx.save();
      ctx.translate(col * FRAME_W, row * FRAME_H);
      drawFrame(ctx, state, i, color);
      ctx.restore();
      frameIndex++;
    }
  }

  const outPath = path.join('public/assets/sprites', `${key}.png`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  return { key, frames: totalFrames, cols, rows };
}

function main() {
  const outDir = 'public/assets/sprites';
  fs.mkdirSync(outDir, { recursive: true });

  const atlas: Record<string, { frameWidth: number; frameHeight: number; states: { name: string; frames: number }[] }> = {};
  const frameCounts: Record<string, number> = {
    idle: 2, move: 4, attack: 6, hit: 2, death: 4, dodge: 2, crit: 8,
  };

  for (const cls of UNIT_CLASSES) {
    for (const faction of FACTIONS) {
      const color = FACTION_COLORS[faction];

      const baseKey = `${cls}-${faction}`;
      const baseStates = ['idle', 'move', 'hit', 'death', 'dodge'];
      const baseResult = generateSheet(baseKey, baseStates, frameCounts, color);
      atlas[baseKey] = {
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        states: baseStates.map((s) => ({ name: s, frames: frameCounts[s] })),
      };

      for (const weapon of WEAPONS) {
        const weaponKey = `${cls}-${faction}-${weapon}`;
        const weaponStates = ['attack', 'crit'];
        const weaponResult = generateSheet(weaponKey, weaponStates, frameCounts, color);
        atlas[weaponKey] = {
          frameWidth: FRAME_W,
          frameHeight: FRAME_H,
          states: weaponStates.map((s) => ({ name: s, frames: frameCounts[s] })),
        };
      }
    }
  }

  for (const faction of FACTIONS) {
    const color = FACTION_COLORS[faction];
    const key = `generic-${faction}`;
    const result = generateSheet(key, STATES, frameCounts, color);
    atlas[key] = {
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      states: STATES.map((s) => ({ name: s, frames: frameCounts[s] })),
    };
  }

  fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas, null, 2));
  console.log(`Generated ${Object.keys(atlas).length} sprite sheets in ${outDir}`);
}

main();
