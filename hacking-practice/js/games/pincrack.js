import { createTimerBar, randInt } from '../utils.js';

export const pincrackGame = {
  id: 'pincrack',
  title: 'Pin Crack',
  subtitle: 'Guess the 4-digit code before the timer ends',
  icon: 'fa-lock',
  description: 'Used in store, fast food, vehicle tuner and heist hacks.',
  settings: [
    { key: 'timeLimit', label: 'Duration (seconds)', type: 'number', min: 25, max: 35, default: 25 },
    { key: 'attempts', label: 'Max attempts', type: 'number', min: 4, max: 8, default: 6 },
  ],
  start(panel, settings, onEnd) {
    const code = Array.from({ length: 4 }, () => randInt(0, 9));
    let guess = [];
    let attempts = 0;
    let active = true;

    panel.innerHTML = `
      <div class="pin-shell">
        <div class="hud"><span>Attempts left: <strong id="pin-attempts">${settings.attempts}</strong></span><span>Enter 4 digits</span></div>
        <div class="pin-display" id="pin-display"></div>
        <div class="pin-keypad" id="pin-keypad"></div>
      </div>
    `;

    const display = panel.querySelector('#pin-display');
    const keypad = panel.querySelector('#pin-keypad');
    const attemptsEl = panel.querySelector('#pin-attempts');
    const slots = Array.from({ length: 4 }, () => {
      const slot = document.createElement('div');
      slot.className = 'pin-slot';
      slot.textContent = '•';
      display.appendChild(slot);
      return slot;
    });

    const renderGuess = () => {
      slots.forEach((slot, i) => {
        slot.textContent = guess[i] ?? '•';
        slot.className = 'pin-slot';
      });
    };

    const addDigit = (digit) => {
      if (!active || guess.length >= 4) return;
      guess.push(digit);
      renderGuess();
      if (guess.length < 4) return;

      attempts += 1;
      attemptsEl.textContent = String(settings.attempts - attempts);
      let correct = 0;
      guess.forEach((digitValue, index) => {
        if (digitValue === code[index]) {
          correct += 1;
          slots[index].classList.add('good');
        } else {
          slots[index].classList.add('bad');
        }
      });

      if (correct === 4) {
        active = false;
        timer.stop();
        onEnd(true, 'Pin cracked');
        return;
      }

      if (attempts >= settings.attempts) {
        active = false;
        timer.stop();
        onEnd(false, `Failed. Code was ${code.join('')}`);
        return;
      }

      setTimeout(() => {
        guess = [];
        renderGuess();
      }, 700);
    };

    for (let n = 1; n <= 9; n += 1) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'pin-key';
      key.textContent = String(n);
      key.addEventListener('click', () => addDigit(n));
      keypad.appendChild(key);
    }

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'pin-key action';
    clear.textContent = 'Clear';
    clear.addEventListener('click', () => {
      guess = [];
      renderGuess();
    });

    const zero = document.createElement('button');
    zero.type = 'button';
    zero.className = 'pin-key';
    zero.textContent = '0';
    zero.addEventListener('click', () => addDigit(0));

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'pin-key action';
    submit.textContent = 'Enter';
    submit.addEventListener('click', () => {
      if (guess.length !== 4) return;
      const attempt = [...guess];
      guess = [];
      attempts += 1;
      attemptsEl.textContent = String(settings.attempts - attempts);
      let correct = 0;
      attempt.forEach((digitValue, index) => {
        slots[index].textContent = digitValue;
        if (digitValue === code[index]) {
          correct += 1;
          slots[index].classList.add('good');
        } else {
          slots[index].classList.add('bad');
        }
      });
      if (correct === 4) {
        active = false;
        timer.stop();
        onEnd(true, 'Pin cracked');
        return;
      }
      if (attempts >= settings.attempts) {
        active = false;
        timer.stop();
        onEnd(false, `Failed. Code was ${code.join('')}`);
        return;
      }
      setTimeout(() => {
        guess = [];
        renderGuess();
      }, 700);
    });

    keypad.appendChild(clear);
    keypad.appendChild(zero);
    keypad.appendChild(submit);

    const timer = createTimerBar(panel, settings.timeLimit);
    timer.promise.then(() => {
      if (!active) return;
      active = false;
      onEnd(false, `Time expired. Code was ${code.join('')}`);
    });
  },
};
