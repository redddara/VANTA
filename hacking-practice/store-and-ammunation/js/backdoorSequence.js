// Backdoor Sequence — laundering drop-off hack, from glitch-minigames

(function () {
    let sequenceActive = false;
    let currentStage = 0;
    let pressedKeys = [];
    let stageKeys = [];
    let sequenceTimeLimit = 0;
    let sequenceTimerInterval;
    let sequenceConfig = {
        totalStages: 3,
        keysPerStage: 4,
        timeLimit: 10,
        keyPool: ['W', 'A', 'S', 'D', 'Q', 'E'],
        keyHintText: 'W, A, S, D only'
    };

    const keyCodeMap = {
        87: 'W', 65: 'A', 83: 'S', 68: 'D',
        81: 'Q', 69: 'E', 82: 'R', 70: 'F',
        71: 'G', 72: 'H', 74: 'J', 75: 'K',
        76: 'L', 90: 'Z', 88: 'X', 67: 'C',
        86: 'V', 66: 'B', 78: 'N', 77: 'M'
    };

    function playSequenceSound(id) {
        if (typeof window.playSoundSafe === 'function') {
            window.playSoundSafe(id);
        }
    }

    function renderSequenceProgress(totalStages) {
        const progress = $('.sequence-progress');
        progress.empty();

        for (let i = 1; i <= totalStages; i++) {
            const attempt = $('<div>')
                .addClass('sequence-attempt')
                .attr('data-attempt', String(i));

            attempt.append($('<div>').addClass('attempt-indicator'));
            attempt.append(
                $('<div>')
                    .addClass('attempt-label')
                    .text('SEQ-' + String(i).padStart(2, '0'))
            );

            progress.append(attempt);
        }
    }

    function startSequenceGame(config) {
        if (typeof $ === 'undefined') {
            return;
        }

        if ($('#sequence-container').length === 0) {
            return;
        }

        if (config) {
            sequenceConfig = {
                totalStages: config.totalStages || 3,
                keysPerStage: config.keysPerStage || 4,
                timeLimit: config.timeLimit || 10,
                keyPool: config.keyPool || ['W', 'A', 'S', 'D', 'Q', 'E'],
                keyHintText: config.keyHintText || 'W, A, S, D only'
            };
        }

        sequenceActive = true;
        currentStage = 0;
        pressedKeys = [];

        renderSequenceProgress(sequenceConfig.totalStages);

        $('.attempt-indicator').removeClass('active success failure');
        $('.sequence-attempt[data-attempt="1"] .attempt-indicator').addClass('active');

        $('#seq-message').text('Input the sequence to break the encryption');
        $('#seq-total').text(sequenceConfig.totalStages);
        $('.sequence-help .key-hint').text(sequenceConfig.keyHintText);

        const container = $('#sequence-container');
        container.removeClass('active').addClass('active');
        container.css('display', 'flex');
        container.show();

        generateNewSequence();
    }

    function generateNewSequence() {
        stageKeys = [];
        for (let i = 0; i < sequenceConfig.keysPerStage; i++) {
            const randomKey = sequenceConfig.keyPool[Math.floor(Math.random() * sequenceConfig.keyPool.length)];
            stageKeys.push(randomKey);
        }

        pressedKeys = [];
        updateSequenceDisplay();
        startSequenceTimer();
    }

    function updateSequenceDisplay() {
        const previousContainer = $('.previous-keys');
        const currentContainer = $('.current-key');
        const nextContainer = $('.next-keys');

        previousContainer.empty();
        currentContainer.empty();
        nextContainer.empty();

        const currentIndex = pressedKeys.length;

        for (let i = 0; i < currentIndex && i < stageKeys.length; i++) {
            const key = stageKeys[i];
            const pressedKey = pressedKeys[i];
            const isCorrect = key === pressedKey;
            const keyBox = $('<div>')
                .addClass('key-box')
                .addClass(isCorrect ? 'correct' : 'wrong')
                .text(key);
            previousContainer.append(keyBox);
        }

        if (currentIndex < stageKeys.length) {
            const currentKey = stageKeys[currentIndex];
            const keyBox = $('<div>')
                .addClass('key-box current')
                .text(currentKey);
            currentContainer.append(keyBox);
        }

        for (let i = currentIndex + 1; i < stageKeys.length; i++) {
            const key = stageKeys[i];
            const keyBox = $('<div>')
                .addClass('key-box next')
                .text(key);
            nextContainer.append(keyBox);
        }

        $('#seq-counter').text(currentStage + 1);
        $('#seq-total').text(sequenceConfig.totalStages);

        updateSequenceProgress();
    }

    function updateSequenceProgress() {
        $('.attempt-indicator').removeClass('active success failure');

        for (let i = 0; i < sequenceConfig.totalStages; i++) {
            const indicator = $('.sequence-attempt[data-attempt="' + (i + 1) + '"] .attempt-indicator');
            if (i < currentStage) {
                indicator.addClass('success');
            } else if (i === currentStage) {
                indicator.addClass('active');
            }
        }
    }

    function handleSequenceKeyPress(key) {
        if (!sequenceActive) return;

        const expectedKey = stageKeys[pressedKeys.length];

        if (key === expectedKey) {
            playSequenceSound('sound-click');
            pressedKeys.push(key);
            updateSequenceDisplay();

            if (pressedKeys.length === stageKeys.length) {
                stopSequenceTimer();
                currentStage++;

                if (currentStage >= sequenceConfig.totalStages) {
                    onSequenceSuccess();
                } else {
                    $('#seq-message').text('Stage Complete! Next sequence starting...');
                    setTimeout(function () {
                        $('#seq-message').text('Input the sequence to break the encryption');
                        generateNewSequence();
                    }, 1000);
                }
            }
        } else {
            onSequenceFailure('Wrong key! Sequence failed.');
        }
    }

    function startSequenceTimer() {
        sequenceTimeLimit = sequenceConfig.timeLimit;
        updateSequenceTimerDisplay();
        $('.seq-timer-progress').css('width', '100%');
        clearInterval(sequenceTimerInterval);

        sequenceTimerInterval = setInterval(function () {
            sequenceTimeLimit -= 0.1;
            sequenceTimeLimit = Math.max(0, parseFloat(sequenceTimeLimit.toFixed(1)));

            updateSequenceTimerDisplay();

            const percentage = (sequenceTimeLimit / sequenceConfig.timeLimit) * 100;
            $('.seq-timer-progress').css('width', percentage + '%');

            if (sequenceTimeLimit <= 0) {
                clearInterval(sequenceTimerInterval);
                onSequenceFailure('Time expired!');
            }
        }, 100);
    }

    function updateSequenceTimerDisplay() {
        $('#seq-timer-count').text(sequenceTimeLimit.toFixed(1));
    }

    function stopSequenceTimer() {
        clearInterval(sequenceTimerInterval);
    }

    function finishSequenceGame(success, message) {
        sequenceActive = false;
        stopSequenceTimer();
        $('#seq-message').text(message);
        playSequenceSound(success ? 'sound-success' : 'sound-failure');

        if (!success) {
            $('.sequence-attempt[data-attempt="' + (currentStage + 1) + '"] .attempt-indicator').addClass('failure');
        } else {
            updateSequenceProgress();
        }

        setTimeout(function () {
            const container = $('#sequence-container');
            container.removeClass('active').hide();

            if (window.invokeNative) {
                fetch('https://glitch-minigames/sequenceResult', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8'
                    },
                    body: JSON.stringify({ success: success })
                });
            }
        }, 1500);
    }

    function onSequenceSuccess() {
        finishSequenceGame(true, 'SEQUENCE COMPLETE! Backdoor opened.');
    }

    function onSequenceFailure(reason) {
        finishSequenceGame(false, reason || 'SEQUENCE FAILED!');
    }

    function stopSequenceGame() {
        sequenceActive = false;
        stopSequenceTimer();
        $('.previous-keys, .current-key, .next-keys').empty();
        $('#sequence-container').removeClass('active').hide();
    }

    window.backdoorSequenceFunctions = {
        start: startSequenceGame,
        stop: stopSequenceGame,
        handleKeyPress: handleSequenceKeyPress,
        isActive: function () { return sequenceActive; },
        keyCodeMap: keyCodeMap
    };
})();
