import { createTimerBar, randInt } from '../utils.js';

function buildPath(size) {
  const path = [{ x: 0, y: randInt(0, size - 1) }];
  let x = 0;
  let y = path[0].y;
  while (x < size - 1) {
    const moves = [];
    if (x < size - 1) moves.push([1, 0]);
    if (y > 0) moves.push([0, -1]);
    if (y < size - 1) moves.push([0, 1]);
    const [dx, dy] = moves[randInt(0, moves.length - 1)];
    x += dx;
    y += dy;
    path.push({ x, y });
  }
  return path;
}

export const pathGame = {
  id: 'path',
  title: 'Path',
  subtitle: 'Follow the lit route without stepping off it',
  icon: 'fa-route',
  description: 'Hackerman tablet game. Move with arrow keys across the safe path.',
  settings: [
    { key: 'timeLimit', label: 'Time limit (seconds)', type: 'number', min: 30, max: 60, default: 30 },
    { key: 'lives', label: 'Lives', type: 'number', min: 3, max: 6, default: 3 },
    { key: 'gridSize', label: 'Grid size', type: 'number', min: 9, max: 15, default: 9 },
  ],
  start(panel, settings, onEnd) {
    const size = settings.gridSize;
    const path = buildPath(size);
    const pathSet = new Set(path.map((p) => `${p.x},${p.y}`));
    let index = 0;
    let lives = settings.lives;
    let active = true;

    panel.innerHTML = `
      <div class="hud">
        <span>Lives: <strong id="path-lives">${lives}</strong></span>
        <span>Progress: <strong id="path-progress">0</strong> / ${path.length - 1}</span>
      </div>
      <div class="grid-board" id="path-grid" style="grid-template-columns: repeat(${size}, 42px);"></div>
      <p style="text-align:center;color:#9aa7bd;margin-top:10px;">Use arrow keys to follow the green route.</p>
    `;

    const grid = panel.querySelector('#path-grid');
    const livesEl = panel.querySelector('#path-lives');
    const progressEl = panel.querySelector('#path-progress');
    const cells = [];

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const cell = document.createElement('div');
        cell.className = 'path-cell';
        if (pathSet.has(`${x},${y}`)) cell.classList.add('path');
        grid.appendChild(cell);
        cells.push(cell);
      }
    }

    const playerPos = path[index];
    const playerCell = cells[playerPos.y * size + playerPos.x];
    playerCell.classList.add('player');

    const timer = createTimerBar(panel, settings.timeLimit);

    const move = (dx, dy) => {
      if (!active) return;
      const next = { x: playerPos.x + dx, y: playerPos.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size) return;

      const nextKey = `${next.x},${next.y}`;
      const nextCell = cells[next.y * size + next.x];
      playerCell.classList.remove('player', 'bad');

      if (!pathSet.has(nextKey)) {
        lives -= 1;
        livesEl.textContent = String(lives);
        nextCell.classList.add('bad');
        playerCell.classList.add('player');
        if (lives <= 0) {
          active = false;
          timer.stop();
          onEnd(false, 'Ran out of lives');
        }
        return;
      }

      playerPos.x = next.x;
      playerPos.y = next.y;
      index = path.findIndex((p) => p.x === next.x && p.y === next.y);
      progressEl.textContent = String(index);
      nextCell.classList.add('player');

      if (index === path.length - 1) {
        active = false;
        timer.stop();
        onEnd(true, 'Path completed');
      }
    };

    const onKey = (event) => {
      const map = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const delta = map[event.key];
      if (!delta) return;
      event.preventDefault();
      move(delta[0], delta[1]);
    };

    window.addEventListener('keydown', onKey);
    timer.promise.then(() => {
      if (!active) return;
      active = false;
      window.removeEventListener('keydown', onKey);
      onEnd(false, 'Time expired');
    });

    return () => window.removeEventListener('keydown', onKey);
  },
};
