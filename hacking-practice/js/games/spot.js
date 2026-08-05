import { CHARSETS, createTimerBar, randomChar, shuffle } from '../utils.js';

export const spotGame = {
  id: 'spot',
  title: 'Spot',
  subtitle: 'Find the target symbol in the grid',
  icon: 'fa-crosshairs',
  description: 'Hackerman tablet game. Click every tile that matches the target.',
  settings: [
    { key: 'timeLimit', label: 'Time limit (seconds)', type: 'number', min: 5, max: 20, default: 8 },
    { key: 'charSet', label: 'Character set', type: 'select', options: Object.keys(CHARSETS), default: 'braille' },
    { key: 'gridSize', label: 'Grid size', type: 'number', min: 6, max: 10, default: 6 },
    { key: 'required', label: 'Matches required', type: 'number', min: 3, max: 8, default: 5 },
  ],
  start(panel, settings, onEnd) {
    const size = settings.gridSize;
    const total = size * size;
    const target = randomChar(settings.charSet);
    const targetIndexes = shuffle([...Array(total).keys()]).slice(0, settings.required);
    let found = 0;
    let active = true;

    panel.innerHTML = `
      <div class="spot-target">${target}</div>
      <div class="hud"><span>Found: <strong id="spot-found">0</strong> / ${settings.required}</span></div>
      <div class="grid-board" id="spot-grid" style="grid-template-columns: repeat(${size}, 56px);"></div>
    `;

    const grid = panel.querySelector('#spot-grid');
    const foundEl = panel.querySelector('#spot-found');
    const timer = createTimerBar(panel, settings.timeLimit);

    for (let i = 0; i < total; i += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'spot-cell';
      cell.textContent = targetIndexes.includes(i) ? target : randomChar(settings.charSet);
      cell.addEventListener('click', () => {
        if (!active || cell.disabled) return;
        cell.disabled = true;
        if (targetIndexes.includes(i)) {
          found += 1;
          foundEl.textContent = String(found);
          if (found >= settings.required) {
            active = false;
            timer.stop();
            onEnd(true, 'All targets found');
          }
        } else {
          active = false;
          timer.stop();
          onEnd(false, 'Wrong tile selected');
        }
      });
      grid.appendChild(cell);
    }

    timer.promise.then(() => {
      if (!active) return;
      active = false;
      onEnd(false, 'Time expired');
    });
  },
};
