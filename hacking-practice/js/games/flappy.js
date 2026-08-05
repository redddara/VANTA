import { randInt } from '../utils.js';

export const flappyGame = {
  id: 'flappy',
  title: 'Flappy Cube',
  subtitle: 'Clear pipes until you hit the target score',
  icon: 'fa-cube',
  description: 'Practice tablet game. Space / click to rise and pass through the gaps.',
  settings: [
    { key: 'targetScore', label: 'Target score', type: 'number', min: 10, max: 30, default: 10 },
  ],
  start(panel, settings, onEnd) {
    const width = 600;
    const height = 600;
    let score = 0;
    let active = true;
    let raf = 0;
    let velocity = 0;
    let playerY = height / 2;
    const pipes = [];

    panel.innerHTML = `
      <div class="hud"><span>Score: <strong id="flap-score">0</strong> / ${settings.targetScore}</span><span>Space / click to flap</span></div>
      <div class="flappy-board" id="flappy-board"></div>
    `;

    const board = panel.querySelector('#flappy-board');
    const scoreEl = panel.querySelector('#flap-score');

    const player = document.createElement('div');
    player.className = 'flappy-player';
    player.style.left = '90px';
    board.appendChild(player);

    const spawnPipe = () => {
      const gap = 150;
      const topHeight = randInt(80, height - gap - 120);
      const top = document.createElement('div');
      top.className = 'flappy-pipe';
      top.style.left = `${width}px`;
      top.style.top = '0';
      top.style.height = `${topHeight}px`;

      const bottom = document.createElement('div');
      bottom.className = 'flappy-pipe';
      bottom.style.left = `${width}px`;
      bottom.style.top = `${topHeight + gap}px`;
      bottom.style.height = `${height - topHeight - gap}px`;

      board.appendChild(top);
      board.appendChild(bottom);
      pipes.push({ x: width, topHeight, gap, top, bottom, scored: false });
    };

    const fail = (reason) => {
      active = false;
      cancelAnimationFrame(raf);
      onEnd(false, reason);
    };

    const win = () => {
      active = false;
      cancelAnimationFrame(raf);
      onEnd(true, 'Target score reached');
    };

    const flap = () => {
      if (!active) return;
      velocity = -7;
    };

    const onKey = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        flap();
      }
    };

    board.addEventListener('click', flap);
    window.addEventListener('keydown', onKey);

    let frame = 0;
    const tick = () => {
      if (!active) return;
      frame += 1;
      if (frame % 110 === 0) spawnPipe();

      velocity += 0.35;
      playerY = Math.min(height - 20, Math.max(20, playerY + velocity));
      player.style.top = `${playerY}px`;

      pipes.forEach((pipe, index) => {
        pipe.x -= 3;
        pipe.top.style.left = `${pipe.x}px`;
        pipe.bottom.style.left = `${pipe.x}px`;

        const playerBox = { x: 90, y: playerY, w: 28, h: 28 };
        const hitTop = playerBox.x + playerBox.w > pipe.x && playerBox.x < pipe.x + 70 && playerBox.y < pipe.topHeight;
        const hitBottom = playerBox.x + playerBox.w > pipe.x && playerBox.x < pipe.x + 70 && playerBox.y + playerBox.h > pipe.topHeight + pipe.gap;
        if (hitTop || hitBottom) fail('Crashed into a pipe');

        if (!pipe.scored && pipe.x + 70 < 90) {
          pipe.scored = true;
          score += 1;
          scoreEl.textContent = String(score);
          if (score >= settings.targetScore) win();
        }

        if (pipe.x < -80) {
          pipe.top.remove();
          pipe.bottom.remove();
          pipes.splice(index, 1);
        }
      });

      raf = requestAnimationFrame(tick);
    };

    spawnPipe();
    raf = requestAnimationFrame(tick);

    return () => {
      board.removeEventListener('click', flap);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  },
};
