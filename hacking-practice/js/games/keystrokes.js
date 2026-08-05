import { mountPanel, pick, randInt } from '../utils.js';

const DIFFICULTY = {
  easy: { speed: 1.2, spawn: 1100 },
  medium: { speed: 1.8, spawn: 900 },
  hard: { speed: 2.4, spawn: 700 },
  insane: { speed: 3.2, spawn: 520 },
};

const LANES = [90, 250, 410, 560];

export const keystrokesGame = {
  id: 'keystrokes',
  title: 'Keystrokes',
  subtitle: 'Press the key when it crosses the green zone',
  icon: 'fa-keyboard',
  description: 'Practice tablet / hackerman training game. Hit the highlighted lane at the right moment.',
  settings: [
    { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard', 'insane'], default: 'easy' },
    { key: 'keys', label: 'Keys to hit', type: 'number', min: 10, max: 30, default: 10 },
  ],
  start(panel, settings, onEnd) {
    const profile = DIFFICULTY[settings.difficulty] || DIFFICULTY.easy;
    let hits = 0;
    let misses = 0;
    let active = true;
    let current = null;
    let spawnTimer = null;
    let raf = 0;

    panel.innerHTML = `
      <div class="hud">
        <span>Hits: <strong id="key-hits">0</strong> / ${settings.keys}</span>
        <span>Misses: <strong id="key-misses">0</strong></span>
      </div>
      <div class="keystroke-board" id="keystroke-board">
        <div class="keystroke-zone"></div>
      </div>
      <p style="text-align:center;color:#9aa7bd;margin-top:10px;">Press the falling letter on your keyboard when it enters the green bar.</p>
    `;

    const board = panel.querySelector('#keystroke-board');
    const hitsEl = panel.querySelector('#key-hits');
    const missesEl = panel.querySelector('#key-misses');

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const spawnLetter = () => {
      if (!active) return;
      const lane = pick(LANES);
      const letter = pick(alphabet.split(''));
      const el = document.createElement('div');
      el.className = 'keystroke-letter';
      el.textContent = letter;
      el.style.left = `${lane}px`;
      el.dataset.letter = letter;
      board.appendChild(el);
      current = { el, letter, y: 0, lane };
    };

    const fail = (reason) => {
      active = false;
      cancelAnimationFrame(raf);
      clearInterval(spawnTimer);
      onEnd(false, reason);
    };

    const win = () => {
      active = false;
      cancelAnimationFrame(raf);
      clearInterval(spawnTimer);
      onEnd(true, 'Sequence complete');
    };

    const onKey = (event) => {
      if (!active || !current) return;
      const pressed = event.key.toUpperCase();
      if (!/^[A-Z]$/.test(pressed)) return;
      const zoneTop = 120;
      const zoneBottom = 184;
      const y = current.y;
      const inZone = y >= zoneTop && y <= zoneBottom;
      if (pressed === current.letter && inZone) {
        current.el.classList.add('target');
        current.el.remove();
        current = null;
        hits += 1;
        hitsEl.textContent = String(hits);
        if (hits >= settings.keys) win();
      } else if (pressed === current.letter) {
        current.el.classList.add('miss');
        misses += 1;
        missesEl.textContent = String(misses);
        current.el.remove();
        current = null;
        if (misses >= 3) fail('Too many mistimed presses');
      }
    };

    const tick = () => {
      if (!active) return;
      if (current) {
        current.y += profile.speed;
        current.el.style.bottom = `${current.y}px`;
        if (current.y > 430) {
          current.el.classList.add('miss');
          current.el.remove();
          current = null;
          misses += 1;
          missesEl.textContent = String(misses);
          if (misses >= 3) fail('Missed too many keys');
        }
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('keydown', onKey);
    spawnLetter();
    spawnTimer = setInterval(spawnLetter, profile.spawn);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      clearInterval(spawnTimer);
    };
  },
};
