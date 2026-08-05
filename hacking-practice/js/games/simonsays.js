import { randInt, wait } from '../utils.js';

export const simonsaysGame = {
  id: 'simonsays',
  title: 'Simon Says',
  subtitle: 'Repeat the flashing keypad pattern',
  icon: 'fa-border-all',
  description: 'Used in Fleeca, Bobcat, mansion hacks and more. Watch, then repeat.',
  settings: [
    { key: 'patterns', label: 'Patterns', type: 'number', min: 1, max: 10, default: 4 },
    { key: 'grid', label: 'Grid size', type: 'number', min: 4, max: 6, default: 6 },
  ],
  async start(panel, settings, onEnd) {
    const size = settings.grid;
    const total = size * size;
    const sequence = Array.from({ length: settings.patterns }, () => randInt(0, total - 1));
    let step = 0;
    let input = 0;
    let active = true;

    panel.innerHTML = `
      <div class="hud"><span>Round: <strong id="simon-round">1</strong> / ${settings.patterns}</span><span id="simon-state">Watch</span></div>
      <div class="simon-board" id="simon-board" style="grid-template-columns: repeat(${size}, 72px);"></div>
    `;

    const board = panel.querySelector('#simon-board');
    const state = panel.querySelector('#simon-state');
    const roundEl = panel.querySelector('#simon-round');
    const cells = [];

    for (let i = 0; i < total; i += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'simon-cell';
      cell.disabled = true;
      board.appendChild(cell);
      cells.push(cell);
    }

    const flash = async (index) => {
      cells[index].classList.add('lit');
      await wait(450);
      cells[index].classList.remove('lit');
      await wait(180);
    };

    const playSequence = async (length) => {
      state.textContent = 'Watch';
      cells.forEach((cell) => { cell.disabled = true; });
      for (let i = 0; i < length; i += 1) {
        await flash(sequence[i]);
      }
      state.textContent = 'Your turn';
      cells.forEach((cell) => { cell.disabled = false; });
    };

    const nextRound = async () => {
      step += 1;
      input = 0;
      roundEl.textContent = String(step);
      await playSequence(step);
    };

    cells.forEach((cell, index) => {
      cell.addEventListener('click', async () => {
        if (!active || cell.disabled) return;
        await flash(index);
        if (sequence[input] !== index) {
          active = false;
          onEnd(false, 'Wrong button pressed');
          return;
        }
        input += 1;
        if (input < step) return;
        if (step >= settings.patterns) {
          active = false;
          onEnd(true, 'Pattern complete');
          return;
        }
        cells.forEach((c) => { c.disabled = true; });
        await wait(500);
        nextRound();
      });
    });

    await nextRound();
  },
};
