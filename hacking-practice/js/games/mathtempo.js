import { randInt } from '../utils.js';

function makeProblem() {
  const a = randInt(1, 12);
  const b = randInt(1, 12);
  const ops = ['+', '-', '*'];
  const op = ops[randInt(0, ops.length - 1)];
  let answer = 0;
  if (op === '+') answer = a + b;
  if (op === '-') answer = a - b;
  if (op === '*') answer = a * b;
  return { text: `${a} ${op} ${b}`, answer };
}

export const mathtempoGame = {
  id: 'mathtempo',
  title: 'Math Tempo',
  subtitle: 'Answer when the problem hits the red zone',
  icon: 'fa-calculator',
  description: 'Used in laser hacks and practice tablets. Type the answer in the target band.',
  settings: [
    { key: 'targetHeight', label: 'Target zone height', type: 'number', min: 40, max: 45, default: 40 },
    { key: 'targetScore', label: 'Target score', type: 'number', min: 10, max: 20, default: 10 },
    { key: 'speed', label: 'Speed', type: 'number', min: 3, max: 5, default: 3 },
    { key: 'maxMisses', label: 'Max misses', type: 'number', min: 2, max: 5, default: 3 },
  ],
  start(panel, settings, onEnd) {
    const boardHeight = 600;
    const zoneHeight = settings.targetHeight * 4;
    const zoneTop = 220;
    let score = 0;
    let misses = 0;
    let active = true;
    let current = null;
    let spawnTimer = null;
    let raf = 0;

    panel.innerHTML = `
      <div class="hud">
        <span>Score: <strong id="mt-score">0</strong> / ${settings.targetScore}</span>
        <span>Misses: <strong id="mt-misses">0</strong> / ${settings.maxMisses}</span>
      </div>
      <div class="mathtempo-board" id="mathtempo-board">
        <div class="mathtempo-target-area" style="top:${zoneTop}px;height:${zoneHeight}px;"></div>
        <input class="mathtempo-input" id="mt-input" type="number" placeholder="?" />
      </div>
      <p style="text-align:center;color:#9aa7bd;margin-top:10px;">Type the answer and press Enter when the equation is inside the red zone.</p>
    `;

    const board = panel.querySelector('#mathtempo-board');
    const input = panel.querySelector('#mt-input');
    const scoreEl = panel.querySelector('#mt-score');
    const missesEl = panel.querySelector('#mt-misses');

    const spawn = () => {
      if (!active) return;
      const problem = makeProblem();
      const el = document.createElement('div');
      el.className = 'mathtempo-problem';
      el.textContent = problem.text;
      el.style.bottom = '0px';
      board.appendChild(el);
      current = { el, answer: problem.answer, y: 0 };
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
      onEnd(true, 'Target score reached');
    };

    const submit = () => {
      if (!active || !current) return;
      const value = Number(input.value);
      if (Number.isNaN(value)) return;
      const inZone = current.y >= zoneTop && current.y <= zoneTop + zoneHeight;
      if (inZone && value === current.answer) {
        score += 1;
        scoreEl.textContent = String(score);
        current.el.remove();
        current = null;
        input.value = '';
        if (score >= settings.targetScore) win();
      } else {
        misses += 1;
        missesEl.textContent = String(misses);
        current.el.style.color = '#ff9a3e';
        if (misses >= settings.maxMisses) fail('Too many misses');
      }
    };

    const onKey = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    };

    const tick = () => {
      if (!active) return;
      if (current) {
        current.y += settings.speed;
        current.el.style.bottom = `${current.y}px`;
        if (current.y > boardHeight) {
          current.el.remove();
          current = null;
          misses += 1;
          missesEl.textContent = String(misses);
          if (misses >= settings.maxMisses) fail('Too many missed problems');
        }
      }
      raf = requestAnimationFrame(tick);
    };

    input.addEventListener('keydown', onKey);
    spawn();
    spawnTimer = setInterval(spawn, 1300 - settings.speed * 120);
    raf = requestAnimationFrame(tick);
    input.focus();

    return () => {
      input.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      clearInterval(spawnTimer);
    };
  },
};
