import { createTimerBar, randInt, shuffle, wait } from '../utils.js';

export const memorizationGame = {
  id: 'memorization',
  title: 'Memorization',
  subtitle: 'Remember the highlighted tiles, then click them back',
  icon: 'fa-th',
  description: 'Practice tablet game. Memorize the pattern before it disappears.',
  settings: [
    { key: 'duration', label: 'Show time (seconds)', type: 'number', min: 5, max: 30, default: 5 },
    { key: 'tiles', label: 'Tiles to remember', type: 'number', min: 8, max: 15, default: 8 },
    { key: 'grid', label: 'Grid size', type: 'number', min: 4, max: 6, default: 6 },
  ],
  async start(panel, settings, onEnd) {
    const size = settings.grid;
    const total = size * size;
    const picks = shuffle([...Array(total).keys()]).slice(0, settings.tiles);
    let selected = new Set();
    let active = true;

    panel.innerHTML = `
      <div class="hud"><span>Remember the highlighted tiles</span><span id="mem-stage">Preview</span></div>
      <div class="mem-grid" id="mem-grid" style="grid-template-columns: repeat(${size}, 52px);"></div>
    `;

    const grid = panel.querySelector('#mem-grid');
    const stage = panel.querySelector('#mem-stage');
    const cells = [];

    for (let i = 0; i < total; i += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mem-cell';
      cell.disabled = true;
      if (picks.includes(i)) cell.classList.add('highlight');
      grid.appendChild(cell);
      cells.push(cell);
    }

    await wait(settings.duration * 1000);
    if (!active) return;
    cells.forEach((cell) => cell.classList.remove('highlight'));
    cells.forEach((cell) => { cell.disabled = false; });
    stage.textContent = 'Recall';

    const timer = createTimerBar(panel, settings.duration + 10);

    cells.forEach((cell, index) => {
      cell.addEventListener('click', () => {
        if (!active || cell.classList.contains('selected') || cell.classList.contains('wrong')) return;
        if (picks.includes(index)) {
          cell.classList.add('selected');
          selected.add(index);
          if (selected.size === picks.length) {
            active = false;
            timer.stop();
            onEnd(true, 'Pattern recalled');
          }
        } else {
          cell.classList.add('wrong');
          active = false;
          timer.stop();
          onEnd(false, 'Wrong tile selected');
        }
      });
    });

    timer.promise.then(() => {
      if (!active) return;
      active = false;
      onEnd(false, 'Recall timed out');
    });
  },
};
