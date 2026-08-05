import { CHARSETS, createTimerBar, mountPanel, randomChar, randInt, shuffle } from '../utils.js';

export const scrambleGame = {
  id: 'scramble',
  title: 'Scramble',
  subtitle: 'Find every matching symbol before time runs out',
  icon: 'fa-code',
  description: 'Used in boosting and other hacks. Match the target character across the scrambled board.',
  settings: [
    { key: 'timeLimit', label: 'Time limit (seconds)', type: 'number', min: 30, max: 60, default: 30 },
    { key: 'charSet', label: 'Character set', type: 'select', options: Object.keys(CHARSETS), default: 'alphanumeric' },
    { key: 'targets', label: 'Matches required', type: 'number', min: 4, max: 12, default: 6 },
  ],
  start(panel, settings, onEnd) {
    const target = randomChar(settings.charSet);
    const totalCells = 40;
    const cells = Array.from({ length: totalCells }, () => randomChar(settings.charSet));
    const targetIndexes = shuffle([...Array(totalCells).keys()]).slice(0, settings.targets);
    targetIndexes.forEach((idx) => {
      cells[idx] = target;
    });

    let found = 0;
    let active = true;

    panel.innerHTML = `
      <div class="splash"><div class="hacker"><i class="fa-solid fa-user-secret"></i></div></div>
      <div class="scramble-find">Find: <strong>${target}</strong></div>
      <div class="hud"><span>Found: <strong id="scramble-found">0</strong> / ${settings.targets}</span><span id="scramble-timer-text">${settings.timeLimit}s</span></div>
      <div class="scramble-grid" id="scramble-grid"></div>
    `;

    const grid = panel.querySelector('#scramble-grid');
    const foundEl = panel.querySelector('#scramble-found');
    const timer = createTimerBar(panel, settings.timeLimit);

    cells.forEach((char, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = char;
      btn.addEventListener('click', () => {
        if (!active || btn.disabled) return;
        btn.disabled = true;
        if (targetIndexes.includes(index)) {
          btn.classList.add('good');
          found += 1;
          foundEl.textContent = String(found);
          if (found >= settings.targets) {
            active = false;
            timer.stop();
            onEnd(true, 'All matches found');
          }
        } else {
          btn.classList.add('bad');
          active = false;
          timer.stop();
          onEnd(false, 'Wrong symbol selected');
        }
      });
      grid.appendChild(btn);
    });

    timer.promise.then(() => {
      if (!active) return;
      active = false;
      onEnd(false, 'Time expired');
    });
  },
};
