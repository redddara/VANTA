import { flappyGame } from './games/flappy.js';
import { keystrokesGame } from './games/keystrokes.js';
import { mathtempoGame } from './games/mathtempo.js';
import { memorizationGame } from './games/memorization.js';
import { pathGame } from './games/path.js';
import { pincrackGame } from './games/pincrack.js';
import { scrambleGame } from './games/scramble.js';
import { simonsaysGame } from './games/simonsays.js';
import { spotGame } from './games/spot.js';
import { mountPanel, setStatus } from './utils.js';

const GAMES = [
  scrambleGame,
  keystrokesGame,
  memorizationGame,
  simonsaysGame,
  pincrackGame,
  pathGame,
  spotGame,
  mathtempoGame,
  flappyGame,
];

const menu = document.getElementById('menu');
const shell = document.getElementById('game-shell');
const gameGrid = document.getElementById('game-grid');
const backBtn = document.getElementById('back-btn');
const titleEl = document.getElementById('game-title');
const subtitleEl = document.getElementById('game-subtitle');
const statusEl = document.getElementById('game-status');
const settingsPanel = document.getElementById('settings-panel');
const stage = document.getElementById('game-stage');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');

let currentGame = null;
let cleanup = null;
let values = {};

function renderMenu() {
  gameGrid.innerHTML = GAMES.map((game) => `
    <button class="game-card" data-game="${game.id}" type="button">
      <div class="icon"><i class="fa-solid ${game.icon}"></i></div>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
    </button>
  `).join('');

  gameGrid.querySelectorAll('[data-game]').forEach((button) => {
    button.addEventListener('click', () => openGame(button.dataset.game));
  });
}

function openGame(id) {
  currentGame = GAMES.find((game) => game.id === id);
  if (!currentGame) return;

  values = Object.fromEntries(currentGame.settings.map((setting) => [setting.key, setting.default]));
  titleEl.textContent = currentGame.title;
  subtitleEl.textContent = currentGame.subtitle;
  setStatus(statusEl, 'Ready');
  renderSettings();
  stage.innerHTML = '<div class="splash"><div class="hacker"><i class="fa-solid fa-user-secret"></i></div><div>Configure settings, then start practice.</div></div>';
  menu.classList.add('hidden');
  shell.classList.remove('hidden');
  backBtn.classList.remove('hidden');
}

function renderSettings() {
  settingsPanel.innerHTML = currentGame.settings.map((setting) => {
    if (setting.type === 'select') {
      const options = setting.options.map((option) => `<option value="${option}">${option}</option>`).join('');
      return `
        <div class="field">
          <label for="${setting.key}">${setting.label}</label>
          <select id="${setting.key}">${options}</select>
        </div>
      `;
    }
    return `
      <div class="field">
        <label for="${setting.key}">${setting.label}</label>
        <input id="${setting.key}" type="number" min="${setting.min}" max="${setting.max}" value="${setting.default}">
      </div>
    `;
  }).join('');

  currentGame.settings.forEach((setting) => {
    const input = document.getElementById(setting.key);
    input.value = values[setting.key];
    input.addEventListener('input', () => {
      values[setting.key] = setting.type === 'select' ? input.value : Number(input.value);
    });
  });
}

function cleanupActive() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
}

function endRound(success, message) {
  cleanupActive();
  startBtn.disabled = false;
  resetBtn.disabled = false;
  setStatus(statusEl, message, success ? 'win' : 'fail');
}

function startRound() {
  cleanupActive();
  startBtn.disabled = true;
  resetBtn.disabled = true;
  setStatus(statusEl, 'Running…', 'live');
  const panel = mountPanel(stage);
  const result = currentGame.start(panel, values, endRound);
  if (typeof result === 'function') cleanup = result;
}

function resetRound() {
  cleanupActive();
  startBtn.disabled = false;
  resetBtn.disabled = false;
  setStatus(statusEl, 'Ready');
  stage.innerHTML = '<div class="splash"><div class="hacker"><i class="fa-solid fa-user-secret"></i></div><div>Configure settings, then start practice.</div></div>';
}

function goBack() {
  cleanupActive();
  currentGame = null;
  shell.classList.add('hidden');
  menu.classList.remove('hidden');
  backBtn.classList.add('hidden');
}

backBtn.addEventListener('click', goBack);
startBtn.addEventListener('click', startRound);
resetBtn.addEventListener('click', resetRound);
renderMenu();
