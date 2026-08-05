export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const CHARSETS = {
  numeric: '0123456789',
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  greek: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ',
  braille: '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵',
  runes: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ',
};

export function randomChar(setName) {
  const chars = CHARSETS[setName] || CHARSETS.alphanumeric;
  return pick(chars.split(''));
}

export function randomString(setName, length) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += randomChar(setName);
  return out;
}

export function createTimerBar(container, seconds) {
  const wrap = document.createElement('div');
  wrap.className = 'timer-bar';
  const bar = document.createElement('span');
  wrap.appendChild(bar);
  container.appendChild(wrap);

  const start = performance.now();
  const duration = seconds * 1000;
  let frame = 0;

  const tick = () => {
    const elapsed = performance.now() - start;
    const left = Math.max(0, 1 - elapsed / duration);
    bar.style.width = `${left * 100}%`;
    if (elapsed < duration) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    stop() {
      cancelAnimationFrame(frame);
    },
    promise: new Promise((resolve) => {
      setTimeout(resolve, duration);
    }),
  };
}

export function mountPanel(stage) {
  stage.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'panel';
  stage.appendChild(panel);
  return panel;
}

export function setStatus(el, text, type = '') {
  el.textContent = text;
  el.className = `status-pill${type ? ` ${type}` : ''}`;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
