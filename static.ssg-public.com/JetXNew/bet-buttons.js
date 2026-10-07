function isUnusedGiftSession() {
    const gift = player?.gift;
    return !!gift?.started
        && gift.startAmount > 0
        && gift.count === gift.startAmount
        && !player.disableCashGame;
}

function shouldSkipPersistingGiftPrevBets() {
    return isUnusedGiftSession()
        && !!document.querySelector('.app')?.classList.contains('is-gift-mode');
}

function setPrevBets() {
    if (!localStorageAllow) return false;
    const toSave = shouldSkipPersistingGiftPrevBets()
        ? player.prevBets.map((queued, index) => (index > 3 ? false : queued))
        : player.prevBets;
    localStorage.setItem(`jetxnew-prevBets`, toSave);
    localStorage.setItem(`jetxnew-prevBetSum`, player.prevBetSum);
}

function discardPersistedUnusedGiftPrevBets() {
    if (!player?.prevBets || !isUnusedGiftSession()) return;
    if (!player.prevBets[4] && !player.prevBets[5]) return;
    player.prevBets[4] = false;
    player.prevBets[5] = false;
    setPrevBets();
}

function getPrevBets() {
    if (!localStorageAllow) return false;
    let prevBets = localStorage.getItem(`jetxnew-prevBets`);
    let prevBetSum = localStorage.getItem(`jetxnew-prevBetSum`);
    let fromLegacy = false;
    if (!prevBets) {
        prevBets = localStorage.getItem(`prevBets`);
        if (!prevBetSum) prevBetSum = localStorage.getItem(`prevBetSum`);
        fromLegacy = !!prevBets;
    }
    if (prevBetSum) {
        player.prevBetSum = parseFloat(prevBetSum);
    }
    if (prevBets) {
        const parts = prevBets.split(',');
        const last = (!fromLegacy || parts.length > 4)
            ? Math.min(parts.length, player.prevBets.length) - 1
            : 1;
        for (let i = 0; i <= last; i++) {
            player.prevBets[i] = parts[i] === 'true';
        }
        if (fromLegacy) {
            setPrevBets();
            if (parts.length > 4) {
                localStorage.setItem(`prevBets`, [parts[0] === 'true', parts[1] === 'true', parts[4] === 'true', parts[5] === 'true']);
                if (parts[2] === 'true' || parts[3] === 'true') {
                    localStorage.setItem(`prevBetSum`, 0);
                }
                localStorage.removeItem(`bet-2`);
                localStorage.removeItem(`bet-3`);
            }
        }
    }
}

getPrevBets();

let autoBetTrigger = [true, true, true, true];
let betAllUiBatch = false;

function getBetAmount(button) {
    const betValue = document.getElementById(`bet-value-${button}`);
    if (autoBetTrigger[button]) {
        commitInput(betValue);
    }
    if (betValue) {
        betValue.disabled = true;
        betValue.disabled = false;
    }
    return (button === 4 || button === 5 ? board.minBet : parseInputAmount(betValue ? betValue.value : undefined))
}

function getCashout(button) {
    const cashOutValue = document.getElementById(`cash-out-value-${button}`);
    commitInput(cashOutValue);
    if (cashOutValue) {
        cashOutValue.disabled = true;
        cashOutValue.disabled = false;
    }
    let cashOut = null;
    const autoCashOut = document.getElementById(`auto-cash-out-${button}`);
    if (autoCashOut && autoCashOut.checked && cashOutValue && cashOutValue.value !== '') {
        cashOut = cashOutValue.value;
    }
    return cashOut;
}

function getButtonIndex(button) {
    // if (button === 2) {
    //     return 4;
    // } else if (button === 3) {
    //     return 5;
    // } else if (button === 4) {
    //     return 2;
    // } else if (button === 5) {
    //     return 3;
    // }
    return button;
}


function triggerBetButton(betButton) {
    if (betButton) betButton.dispatchEvent(new Event(clickEvent, { bubbles: true }));
}

window.addEventListener('load', function (e) {
    delegate(clickEvent, '.bet-button', function (e) {
        if (e.button > 0) return;
        // If the button is loading, don't trigger the event (double sound fix)
        if (this.classList.contains('btn-bet--loading')) return;
        let button = jqData(this, 'button');
        let buttonIndex = Number(this.getAttribute('data-button'));
        if (this.classList.contains('place-bet')) {
            if (this.classList.contains('disabled')) return false;
            this.setAttribute('data-attr', `place bet ${buttonIndex + 1}`);
            jetX.canvas.playSound(5, 'placeBet');
            let bet = getBetAmount(button);
            let cashOut = getCashout(button);
            PlaceBet(token, bet, cashOut, button);
        } else if (this.classList.contains('cancel-bet')) {
            this.setAttribute('data-attr', `cancel ${buttonIndex + 1}`);
            jetX.canvas.playSound(6, 'placeBet');
            player.prevBetSum -= getBetAmount(button);
            player.prevBets[button] = false;
            setPrevBets();
            clearOptimisticCancel(button);
            if (!betAllUiBatch) {
                playerButtons();
            }
        } else if (this.classList.contains('cash-out')) {
            this.setAttribute('data-attr', `collect ${buttonIndex + 1}`);
            jetX.canvas.playSound(6, 'collect');
            Cashout(token, button);
        } else if (this.classList.contains('disable')) {
            this.setAttribute('data-attr', `bet accepted ${buttonIndex + 1}`);
        }
    });

    delegate(clickEvent, '#bet-all-action', function (e) {
        if (e.button > 0) return;
        const mode = this.classList.contains('bet-all-action--collect') ? 'cash-out'
            : this.classList.contains('bet-all-action--cancel') ? 'cancel-bet'
                : 'place-bet';

        let positions = [];
        betAllUiBatch = mode === 'cancel-bet' || mode === 'place-bet';
        for (let i = 0; i < 4; i++) {
            const betButton = document.getElementById(`bet-${i}`);
            if(this.classList.contains('bet-all-action--collect')) {
                if(betButton && betButton.classList.contains('cash-out') && !betButton.classList.contains('btn-bet--loading')) {
                    positions.push(i)
                }
            } else if (betButton && betButton.classList.contains(mode) && !betButton.classList.contains('btn-bet--loading')) {
                if (mode === 'place-bet') positions.push(i);
                triggerBetButton(betButton);
            }
        }
        const wasBatch = betAllUiBatch;
        betAllUiBatch = false;
        if (wasBatch && mode === 'cancel-bet') {
            playerButtons();
        }

        if (mode === 'place-bet' && positions.length > 0) {
            mixpanelPlaceAllBets(positions);
        } else if (positions.length > 0) {
            CashoutMany(token, positions);
        }
    });

    function stepCollectValue(input, direction) {
        let step = 1;
        let val = parseFloat(input.value);
        if (!Number.isFinite(val)) val = parseFloat(board.minAutoCashOut) || 1.01;
        let m = 1;
        const decreasing = direction < 0;

        if (decreasing ? val <= 2 : val < 2) {
            step /= 10;
            m = 10;
        } else if (decreasing ? val <= 10 * step : val < 10 * step) {

        } else if (decreasing ? val <= 50 * step : val < 50 * step) {
            step *= 5;
            m = 5;
        } else if (decreasing ? val <= 100 * step : val < 100 * step) {
            step *= 10;
            m = 10;
        } else {
            step *= 100;
            m = 100;
        }

        val += decreasing ? -step : step;
        val = parseFloat(val.toFixed(2));
        val = Math.floor(val * m) / m;
        if (decreasing) val = Math.max(parseFloat(board.minAutoCashOut) || 1.01, val);

        input.value = formatCollectMultiplier(val);
        commitInput(input);
        inputChangeType(input, 'autocollect_stepper');
    }

    delegate(clickEvent, '.bet-chips button', function () {
        let button = jqData(this, 'button');
        if (hasClassSelector(`#button-${button}`, 'disabled')) return false;

        let sound = jqData(this, 'sound');
        let bet = parseFloat(jqData(this, 'bet'));
        let input = document.getElementById('bet-value-' + button);
        let val = parseInputAmount(input ? input.value : undefined);
        let last = parseFloat(jqData(input, 'last'));
        let maxBet = parseFloat(board.maxBet);
        let prevVal = val;
        let showMaxToast = false;
        jetX.canvas.playSound(4, 'button');

        if (bet === 0) {
            const canReachMaxBet = Number.isFinite(maxBet) && player.availableAmount >= maxBet;
            val = canReachMaxBet ? maxBet : player.availableAmount;
            showMaxToast = canReachMaxBet && prevVal >= maxBet && last === 0;
            jqData(input, 'last', 0);
            mixpanelBettingOption(button, 'All');
        } else {
            if (bet === last) {
                let p = parseInt((val * 1000000) / (bet * 1000000));
                if (val * 1000000 - p * (bet * 1000000) !== 0) {
                    last = -1;
                }
            }

            const uncapped = bet === last ? val + bet : bet;
            val = Math.min(uncapped, maxBet);
            showMaxToast = uncapped > maxBet || (prevVal >= maxBet && uncapped >= maxBet);
            jqData(input, 'last', bet);
            mixpanelBettingOption(button, Array.from(this.parentNode.children).indexOf(this) + 1);
        }

        if (input) input.value = formatAmount(val, player.currency, 'input');
        setInputValue(input ? input.id : undefined);
        inputChangeType(input, 'bet_list');
        setLastBet(button);

        if (showMaxToast) {
            buttonMessage(
                button,
                GetCaption('jetxnew.bet.max') + '&nbsp;' + formatAmount(board.maxBet, player.currency, 'formated'),
                1500,
                'max'
            );
        }
    });

    delegate(clickEvent, '.bet-input .minus', function () {
        if (this.classList.contains('disabled')) return false;

        const input = this.parentElement.querySelector('input');
        if (!input || input.classList.contains('disabled')) return false;
        jetX.canvas.playSound(4, 'betUpdate');

        let step = parseFloat(jqData(this, 'step'));
        let val = parseInputAmount(input.value);
        let minBet = parseFloat(jqData(input, 'minbet'));

        if (jurisdictionName === 'pt') {
            if (val <= step) {
                step = 1;
            }
        }

        if (val <= step) {
            step /= 10;
        } else if (val <= 10 * step) {

        } else if (val <= 100 * step) {
            step *= 10;
        } else {
            step *= 50;
        }

        val -= step;
        val = parseFloat(formatAmount(val, player.currency, 'number'));
        val = parseInt((val * 1000000) / (step * 1000000)) * step;

        input.value = formatAmount(Math.max(minBet, val), player.currency, 'input');
        setInputValue(input.id);
        inputChangeType(input, 'bet_stepper');
        if (input.id && input.id.indexOf('bet-value-') === 0) setLastBet(input.id.replace('bet-value-', ''));
    });

    delegate(clickEvent, '.collect-value .minus', function () {
        if (this.classList.contains('disabled')) return false;
        const input = this.parentElement.querySelector('input.collect-field');
        if (!input || input.disabled) return false;
        jetX.canvas.playSound(4, 'betUpdate');
        stepCollectValue(input, -1);
    });

    delegate(clickEvent, '.collect-value .plus', function () {
        if (this.classList.contains('disabled')) return false;
        const input = this.parentElement.querySelector('input.collect-field');
        if (!input || input.disabled) return false;
        jetX.canvas.playSound(7, 'betUpdate');
        stepCollectValue(input, 1);
    });

    delegate(clickEvent, '.bet-input .plus', function () {
        const input = this.parentElement.querySelector('input');
        if (!input || input.classList.contains('disabled')) return false;

        const button = jqData(this, 'button');
        const toastButton = getMaxBetToastKey(input, button);
        const maxBet = parseFloat(jqData(input, 'maxbet'));
        const currentVal = parseInputAmount(input.value);
        const atMaxBet = Number.isFinite(maxBet) && currentVal >= maxBet
            && toastButton !== undefined && toastButton !== null && toastButton !== '';

        if (this.classList.contains('disabled')) {
            if (atMaxBet) {
                jetX.canvas.playSound(7, 'betUpdate');
                buttonMessage(
                    toastButton,
                    GetCaption('jetxnew.bet.max') + '&nbsp;' + formatAmount(board.maxBet, player.currency, 'formated'),
                    1500,
                    'max'
                );
            }
            return false;
        }

        jetX.canvas.playSound(7, 'betUpdate');

        let step = parseFloat(jqData(this, 'step'));
        let val = currentVal;

        if (jurisdictionName === 'pt') {
            if (val < step) {
                step = 1;
            }
        }

        if (val < step) {
            step /= 10;
        } else if (val < 10 * step) {

        } else if (val < 100 * step) {
            step *= 10;
        } else {
            step *= 50;
        }

        val += step;
        val = parseFloat(formatAmount(val, player.currency, 'number'));
        val = parseInt((val * 1000000) / (step * 1000000)) * step;

        const capped = Number.isFinite(maxBet) && val > maxBet;
        input.value = formatAmount(Math.min(maxBet, val), player.currency, 'input');
        setInputValue(input.id);
        inputChangeType(input, 'bet_stepper');
        if (button !== undefined && button !== null && button !== '') setLastBet(button);

        if (capped && toastButton !== undefined && toastButton !== null && toastButton !== '') {
            buttonMessage(
                toastButton,
                GetCaption('jetxnew.bet.max') + '&nbsp;' + formatAmount(board.maxBet, player.currency, 'formated'),
                1500,
                'max'
            );
        }
    });

    document.querySelectorAll('.toggle input').forEach((el) => {
        el.addEventListener('change', (event) => {
            let id = event.target.id;
            if(id === 'menu-music' || id === 'menu-sounds') {

            } else {
                jetX.canvas.playSound(9, `checkbox${event.target.checked ? 'On' : 'Off'}`);
            }
        });
    });

    delegate(clickEvent, '.bet-input .auto input[type="checkbox"]', function () {
        let button = jqData(this, 'button');
        let id = this.id;
        if (button === 'all') {
            removeClassAll('.cash-game', 'simple');

            id = id.replace('all', 0);
            const target = document.getElementById(id);
            if (target) target.checked = true;
        } else {
            button = id.replace('auto-bet-', '');
            button = button.replace('auto-cash-out-', '');
        }
        checkboxCheck();
        if (id.indexOf('auto-bet') >= 0) {
            mixpanelFirstUsage('firstAutoplayTime');
        } else {
            mixpanelFirstUsage('firstAutocollectTime');
        }
        mixpanelCheckbox(button, id);
    });
});

let buttonStatus = {
    'placement': 'place-bet',
    'cancel-bet': 'cancel-bet',
    'cashout': 'cash-out',
    'disable': 'disable',
};

function getBetAllActionAmount(buttonIndex) {
    const betValue = document.getElementById(`bet-value-${buttonIndex}`);
    const fromInput = parseInputAmount(betValue ? betValue.value : undefined);
    if (Number.isFinite(fromInput)) return fromInput;
    const bet = player?.bets?.[buttonIndex];
    if (bet) {
        const amount = bet.BetAmount > 0 ? bet.BetAmount : bet.NextBetAmount;
        if (Number.isFinite(amount)) return amount;
    }
    return 0;
}

function updateBetAllActionTotals() {
    const placeEl = document.getElementById('bet-all-place-total');
    const cancelEl = document.getElementById('bet-all-cancel-total');
    const acceptedEl = document.getElementById('bet-all-accepted-total');
    if (!placeEl && !cancelEl && !acceptedEl) return;

    let placeSum = 0;
    let cancelSum = 0;
    let acceptedSum = 0;

    for (let i = 0; i < 4; i++) {
        const betButton = document.getElementById(`bet-${i}`);
        if (!betButton) continue;
        const amount = getBetAllActionAmount(i);
        if (betButton.classList.contains('place-bet')) placeSum += amount;
        else if (betButton.classList.contains('cancel-bet')) cancelSum += amount;
        else if (betButton.classList.contains('disable')) acceptedSum += amount;
    }

    if (placeEl) {
        const formatted = formatAmount(placeSum, player.currency, 'formated');
        if (placeEl.innerHTML !== formatted) placeEl.innerHTML = formatted;
    }
    if (cancelEl) {
        const formatted = formatAmount(cancelSum, player.currency, 'formated');
        if (cancelEl.innerHTML !== formatted) cancelEl.innerHTML = formatted;
    }
    if (acceptedEl) {
        const formatted = formatAmount(acceptedSum, player.currency, 'formated');
        if (acceptedEl.innerHTML !== formatted) acceptedEl.innerHTML = formatted;
    }
}

function playerButtons(load = false) {
    let activeBet = 0;
    let totalBet = 0;
    let win = 0;
    let buttons = [false, false, false, false, false, false];
    let disabled = false;
    if (player.bets !== undefined && player.bets !== null) {
        for (let i = 0; i < player.bets.length; i++) {
            let buttonIndex = i; //getButtonIndex(i);
            let button = document.getElementById(`bet-${buttonIndex}`);
            let buttonDiv = document.getElementById(`button-${buttonIndex}`);
            let autoCashOutCheckbox = document.getElementById(`auto-cash-out-${buttonIndex}`);
            let autoCashOutInput = document.getElementById(`cash-out-value-${buttonIndex}`);
            let bet = player.bets[i];
            
            let activeButton = bet.ActiveButton;
            activeButton = activeButton === '' ? 'placement' : activeButton;
            if (player.prevBets[i]) {
                activeButton = 'cancel-bet';
            }

            let betAmount = bet.BetAmount;
            let cashoutStep = bet.CashoutStep;
            let isActive = bet.IsActive;
            let nextBetAmount = bet.NextBetAmount;
            let wonAmount = bet.WonAmount;
            let autoCashout = activeButton === 'cancel-bet' ? bet.NextAutoCashout : bet.AutoCashout;
            let autoCashoutValue = activeButton === 'cancel-bet' ? bet.NextAutoCashoutValue : bet.AutoCashoutValue;

            totalBet += betAmount;
            win += wonAmount;

            if (load) {
                if (activeButton === 'cancel-bet' || activeButton === 'cashout' || activeButton === 'disable') {
                    let lastBet = getLastBet(i);
                    if (lastBet !== null) {
                        try {
                            const autoBetEl = document.getElementById(`auto-bet-${buttonIndex}`);
                            if (autoBetEl) autoBetEl.checked = lastBet.autoBet;
                            // TEMPORARY: last-bet restore is skipped when amount <= default. Revert later — always restore lastBet.amount.
                            tryRestoreLastBetAmount(document.getElementById(`bet-value-${buttonIndex}`), lastBet.amount);
                            if (autoCashOutCheckbox) autoCashOutCheckbox.checked = lastBet.autoCashOut || !!acRestoredCollect[buttonIndex];
                            const restoredCollect = acRestoredCollect[buttonIndex] || lastBet.cashOut;
                            if (restoredCollect !== '' && autoCashOutInput) autoCashOutInput.value = restoredCollect;
                        } catch (e) {}
                    }
                }
            }

            if (activeButton !== 'placement' && activeButton !== 'cancel-bet' && activeButton !== 'cashout' && activeButton !== 'disable') {
                // console.log('activeButton', activeButton);
            } else {
                let status = buttonStatus[activeButton];
                const waitingPlaceBet = button
                    && button.classList.contains('cancel-bet')
                    && button.classList.contains('btn-bet--loading')
                    && status === 'place-bet'
                    && typeof placeBetInFlight === 'number'
                    && placeBetInFlight > 0
                    && jetX.game.loader;
                if (waitingPlaceBet) {

                } else {
                    if (button) {
                        button.classList.remove('place-bet', 'cancel-bet', 'cash-out', 'disable', 'btn-bet--loading');
                        button.classList.add(status);
                    }
                    buttons[i] = status !== 'place-bet';
                    buttons[i] = true;

                    if (buttonDiv) {
                        buttonDiv.classList.remove('place-bet', 'cancel-bet', 'cash-out', 'disable');
                        buttonDiv.classList.add(status);
                        buttonDiv.classList.remove('disabled');
                    }
                    if (status === 'cancel-bet' || status === 'cash-out' || status === 'disable') {
                        if (buttonDiv) buttonDiv.classList.add('disabled');
                        disabled = true;

                        if (status !== 'cancel-bet' && autoCashOutCheckbox) autoCashOutCheckbox.checked = autoCashout;
                        checkboxCheck();
                        if (autoCashout) {
                            if (autoCashOutInput && parseFloat(autoCashOutInput.value) !== parseFloat(autoCashoutValue)) {
                                autoCashOutInput.value = (Math.floor(autoCashoutValue * 100) / 100).toFixed(2);
                                setInputValue(`cash-out-value-${buttonIndex}`);
                            }
                        }
                    }
                }
            }

            if (activeButton === 'cancel-bet' || activeButton === 'cashout') {
                activeBet += betAmount > 0 ? betAmount : nextBetAmount;
            }
        }
    }

    const buttonAll = document.getElementById('button-all');
    if (buttonAll) {
        buttonAll.classList.remove('disabled');
        if (disabled) buttonAll.classList.add('disabled');
    }

    const allAction = document.getElementById('bet-all-action');
    if (allAction) {
        if (visualConfig.disableBetAllAndCashoutAll) {
            allAction.hidden = true;
            allAction.disabled = true;
        } else {
            let hasCollect = false, hasPlace = false, hasCancel = false, hasDisable = false;
            for (let i = 0; i < 4; i++) {
                const betButton = document.getElementById(`bet-${i}`);
                if (!betButton) continue;
                if (betButton.classList.contains('cash-out')) hasCollect = true;
                else if (betButton.classList.contains('cancel-bet')) hasCancel = true;
                else if (betButton.classList.contains('place-bet')) hasPlace = true;
                else if (betButton.classList.contains('disable')) hasDisable = true;
            }

            const onlyDisable = hasDisable && !hasCollect && !hasPlace && !hasCancel;
            const mode = hasCollect ? 'collect' : (hasPlace ? 'place' : (hasCancel ? 'cancel' : (onlyDisable ? 'disable' : '')));
            allAction.classList.remove('bet-all-action--place', 'bet-all-action--collect', 'bet-all-action--cancel', 'bet-all-action--disable');
            if (mode) {
                allAction.classList.add(`bet-all-action--${mode}`);
                allAction.disabled = onlyDisable;
                allAction.hidden = false;
            } else {
                allAction.disabled = false;
                allAction.hidden = true;
            }
            updateBetAllActionTotals();
        }
    }

    player.activeBet = activeBet;
    player.totalBet = totalBet; // * board.exchangeRate;
    player.win = win; // * board.exchangeRate;

    if (typeof syncGiftBetButtonAvailability === 'function') {
        syncGiftBetButtonAvailability();
    }
    if (typeof updateGiftIconButton === 'function') {
        updateGiftIconButton();
    } else if (typeof syncGiftBetModeLocks === 'function') {
        syncGiftBetModeLocks();
    }
    if (typeof syncGiftsUseButtonLock === 'function') {
        syncGiftsUseButtonLock();
    }
    if (typeof syncSharedAutoCollectLock === 'function') {
        syncSharedAutoCollectLock();
    }
    if (typeof acUpdateCollectBadge === 'function') {
        for (let i = 0; i < 4; i++) acUpdateCollectBadge(i);
    }
    if (typeof syncOldJetXRedirectLock === 'function') {
        syncOldJetXRedirectLock();
    }
}

function setLastBet(button) {
    if (!localStorageAllow) return false;
    if (button < 4) {
        const autoCashOutEl = document.getElementById(`auto-cash-out-${button}`);
        let bet = {
            autoBet: false,
            amount: elValue(`bet-value-${button}`) ?? '',
            autoCashOut: !!(autoCashOutEl && autoCashOutEl.checked),
            cashOut: elValue(`cash-out-value-${button}`) ?? '',
        };
        localStorage.setItem(`jetxnew-bet-${button}`, JSON.stringify(bet));
        saveAutoCollectState();
    }
}

function getLastBet(position) {
    if (!localStorageAllow) return null;
    try {
        let lastBet = localStorage.getItem(`jetxnew-bet-${position}`);
        if (lastBet === null) {
            lastBet = localStorage.getItem(`bet-${position}`);
            if (lastBet !== null) {
                localStorage.setItem(`jetxnew-bet-${position}`, lastBet);
            }
        }
        if (lastBet === null) return null;
        const parsed = JSON.parse(lastBet);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed;
    } catch (e) {
        return null;
    }
}

function parseStoredBetAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : NaN;
    if (value === undefined || value === null) return NaN;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    if (!cleaned) return NaN;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 ? n : NaN;
}

function getDefaultBetAmount(inputEl) {
    if (!inputEl) return NaN;
    const fromStep = parseStoredBetAmount(typeof jqData === 'function' ? jqData(inputEl, 'step') : inputEl.getAttribute('data-step'));
    if (Number.isFinite(fromStep)) return fromStep;
    const minus = inputEl.parentElement && inputEl.parentElement.querySelector('.minus');
    const fromMinus = parseStoredBetAmount(minus && (typeof jqData === 'function' ? jqData(minus, 'step') : minus.getAttribute('data-step')));
    if (Number.isFinite(fromMinus)) return fromMinus;
    const fromValue = parseStoredBetAmount(inputEl.value);
    if (Number.isFinite(fromValue)) return fromValue;
    return parseStoredBetAmount(typeof jqData === 'function' ? jqData(inputEl, 'minbet') : inputEl.getAttribute('data-minbet'));
}

// TEMPORARY: do not restore last bet when it is <= the server default.
// Revert later: always write lastBet.amount onto the input (previous last-bet restore).
// Remove parseStoredBetAmount / getDefaultBetAmount / tryRestoreLastBetAmount with this comment.
function tryRestoreLastBetAmount(inputEl, savedAmount) {
    try {
        if (!inputEl || savedAmount === '' || savedAmount == null) return false;
        const saved = parseStoredBetAmount(savedAmount);
        const defaultBet = getDefaultBetAmount(inputEl);
        if (!Number.isFinite(saved) || !Number.isFinite(defaultBet) || saved <= defaultBet) return false;
        inputEl.value = savedAmount;
        if (inputEl.id && typeof setInputValue === 'function') setInputValue(inputEl.id);
        return true;
    } catch (e) {
        return false;
    }
}

function restoreLastBetInputs() {
    if (!localStorageAllow) return;
    if (jurisdictionName.toLocaleLowerCase() === 'nl') return;
    if (!document.body.classList.contains('is-assets-pending')) return;

    for (let button = 0; button < 4; button++) {
        const betButton = document.getElementById(`bet-${button}`);
        if (betButton && (betButton.classList.contains('cash-out') || betButton.classList.contains('cancel-bet'))) continue;

        try {
            const lastBet = getLastBet(button);
            const restoredCollect = acRestoredCollect[button];
            if (lastBet === null && !restoredCollect) continue;

            if (lastBet) {
                setChecked(`auto-bet-${button}`, lastBet.autoBet);
                // TEMPORARY: last-bet restore is skipped when amount <= default. Revert later — always restore lastBet.amount.
                tryRestoreLastBetAmount(document.getElementById(`bet-value-${button}`), lastBet.amount);
            }

            const cashOutValue = document.getElementById(`cash-out-value-${button}`);
            const cashOut = restoredCollect || (lastBet && lastBet.cashOut);
            if (cashOutValue && cashOut !== '' && cashOut != null) {
                cashOutValue.value = cashOut;
                setInputValue(`cash-out-value-${button}`);
            }

            setChecked(`auto-cash-out-${button}`, !!(lastBet && lastBet.autoCashOut) || !!restoredCollect);
            if (typeof acUpdateCollectBadge === 'function') acUpdateCollectBadge(button);
        } catch (e) {}
    }
    checkboxCheck();
}

function restoreLastCashOutValues() {
    if (!localStorageAllow) return;
    if (jurisdictionName.toLocaleLowerCase() === 'nl') return;

    for (let button = 0; button < 4; button++) {
        const betButton = document.getElementById(`bet-${button}`);
        if (betButton && !betButton.classList.contains('place-bet')) continue;

        const lastBet = getLastBet(button);
        const restoredCollect = acRestoredCollect[button];
        if (!restoredCollect && (lastBet === null || lastBet.cashOut === '' || lastBet.cashOut == null)) continue;

        const cashOutValue = document.getElementById(`cash-out-value-${button}`);
        if (!cashOutValue) continue;

        cashOutValue.value = restoredCollect || lastBet.cashOut;
        setInputValue(`cash-out-value-${button}`);
        if (typeof acUpdateCollectBadge === 'function') acUpdateCollectBadge(button);
    }
}

const AC_RESTORE_WINDOW_MS = 5 * 60 * 1000;
const AC_RESTORE_KEY = 'jetxnew-auto-collect';
// Collect values taken from the snapshot, kept so the later load handlers do not reset them.
let acRestoredCollect = ['', '', '', ''];

// Written while the page is being left, so the window is counted from the refresh and the
// stored value is whatever the player had last, no matter which control changed it.
function saveAutoCollectState() {
    if (!localStorageAllow) return;

    const slots = [];
    let anyOn = false;
    for (let i = 0; i < 4; i++) {
        const toggle = document.getElementById(`auto-cash-out-${i}`);
        const value = toggle && toggle.checked ? (elValue(`cash-out-value-${i}`) ?? '') : '';
        slots.push(value);
        if (value !== '') anyOn = true;
    }

    try {
        if (anyOn) localStorage.setItem(AC_RESTORE_KEY, JSON.stringify({ at: Date.now(), slots: slots }));
        else localStorage.removeItem(AC_RESTORE_KEY);
    } catch (e) {}
}

function readAutoCollectState() {
    if (!localStorageAllow) return null;

    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(AC_RESTORE_KEY));
    } catch (e) {
        return null;
    }
    if (!saved || !Array.isArray(saved.slots)) return null;

    const age = Date.now() - Number(saved.at);
    if (!Number.isFinite(age) || age < 0 || age >= AC_RESTORE_WINDOW_MS) {
        try { localStorage.removeItem(AC_RESTORE_KEY); } catch (e) {}
        return null;
    }
    return saved.slots;
}

// Applied while the markup is parsed, before board and player data arrive, so the toggle is never drawn off first.
function restoreAutoCollectState() {
    if (!visualConfig.autoCollect) return;
    if (jurisdictionName.toLocaleLowerCase() === 'nl') return;

    const slots = readAutoCollectState();
    if (!slots) return;

    let restored = false;
    for (let i = 0; i < 4; i++) {
        const value = slots[i];
        if (!value) continue;

        // setInputValue() needs the board limits, which are not loaded yet, and the stored value is already formatted.
        const collect = document.getElementById(`cash-out-value-${i}`);
        if (collect) collect.value = value;
        setChecked(`auto-cash-out-${i}`, true);
        acRestoredCollect[i] = value;
        restored = true;
    }

    if (!restored) return;
    checkboxCheck();
    for (let i = 0; i < 4; i++) acUpdateCollectBadge(i);
}

window.addEventListener('pagehide', saveAutoCollectState);
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveAutoCollectState();
});

window.addEventListener('load', function () {
    restoreLastBetInputs();
});




function checkAutoplay(button, action, value) {
    const config = autoplayConfigs[button];
    if (!config || !config.started) return false;

    value = parseInputAmount(value);
    if (isNaN(value)) value = 0;

    if (action === 'Cashout') {
        config.win += value;
        config.lastWin = value;
    }

    if (action === 'PlaceBet' && !isAutoplayInfinityCount(config.rounds)) {
        config.count--;
        if (config.count > 0) {
            setHtmlSelector(`#button-${button} .autoplay-badge`, config.count);
            if (typeof syncSharedAutoplayButton === 'function') {
                syncSharedAutoplayButton();
            }
        }
    }

    let stop = false;
    if (!isAutoplayInfinityCount(config.rounds) && config.count <= 0) {
        stop = true;
    }
    if (config.decCheck) {
        if (config.lose - config.win >= Number(config.decVal)) {
            stop = true;
        }
    }
    if (config.incCheck) {
        if (config.win - config.lose >= Number(config.incVal)) {
            stop = true;
        }
    }
    if (config.winCheck) {
        if (config.lastWin >= Number(config.winVal)) {
            stop = true;
        }
    }

    if (stop) {
        if (isSharedAutoplayMode()) {
            stopAllAutoplay();
        } else {
            autoplayConfigsClear(button);
        }
    }

    if (action === 'PlaceBet') {
        config.lose += value;
        config.lastBet = value;
    }

    return stop;
}

function isBettingWindowOpen() {
    return !!(typeof jetX !== 'undefined' && jetX.game && jetX.game.loader);
}

function resetBetButtonsForNewRound() {
    pendingWinBalanceMax = null;
    winToastScheduled = 0;
    winBalanceLastTarget = null;
    if (player.availableAmountList) player.availableAmountList.length = 0;

    for (let i = 0; i < 6; i++) {
        if (player.prevBets && player.prevBets[i]) continue;
        const button = document.getElementById(`bet-${i}`);
        if (
            !button ||
            (
                !button.classList.contains('cash-out') &&
                !button.classList.contains('disable') &&
                !button.classList.contains('btn-bet--loading')
            )
        ) {
            continue;
        }
        button.classList.remove('cancel-bet', 'cash-out', 'disable', 'btn-bet--loading', 'disabled');
        if (!button.classList.contains('place-bet')) button.classList.add('place-bet');
        const buttonDiv = document.getElementById(`button-${i}`);
        if (buttonDiv) {
            buttonDiv.classList.remove('cancel-bet', 'cash-out', 'disable', 'disabled');
            if (!buttonDiv.classList.contains('place-bet')) buttonDiv.classList.add('place-bet');
        }
    }
}

function autoplayPlaceBet(i) {
    let bet = false
    let giftBet = hasClassSelector('#bet-4', 'cancel-bet') ||
        hasClassSelector('#bet-4', 'cash-out') ||
        hasClassSelector('#bet-5', 'cancel-bet') ||
        hasClassSelector('#bet-5', 'cash-out');

    if (autoplayConfigs[i]?.started) {
        checkAutoplay(i, 'AutoBet', 0);
    }

    if (!player.disableCashGame && !giftBet) {
        const autoBetEl = document.getElementById(`auto-bet-${i}`);
        if (autoBetEl && autoBetEl.checked) {
            bet = true;
            const betEl = document.getElementById(`bet-${i}`);
            if (betEl && betEl.classList.contains('place-bet') && isBettingWindowOpen()) {
                gameEvent.autoPlayStarted();
                autoBetTrigger[i] = false;
                triggerBetButton(betEl);
            }
        }
    }
    return bet ? 1 : 0;
}

let sharedAutoplayPlaceTimer = null;

function queueAutoplayPlaceBet(position) {
    if (!isBettingWindowOpen()) return;
    if (typeof isSharedAutoplayMode === 'function' && isSharedAutoplayMode()) {
        if (sharedAutoplayPlaceTimer) {
            clearTimeout(sharedAutoplayPlaceTimer);
        }
        sharedAutoplayPlaceTimer = setTimeout(() => {
            sharedAutoplayPlaceTimer = null;
            placeBetWaveSum = 0;
            placeBetWaveActive = true;
            for (let i = 0; i < 4; i++) {
                autoplayPlaceBet(i);
            }
            placeBetWaveActive = false;
        }, 80);
        return;
    }
    autoplayPlaceBet(position);
}

function setBetButtonLoading(position, loading) {
    const button = document.getElementById(`bet-${position}`);
    if (button) button.classList.toggle('btn-bet--loading', !!loading);
}

function clearOptimisticCancel(position) {
    const button = document.getElementById(`bet-${position}`);
    if (button) button.classList.remove('cancel-bet');
    const buttonDiv = document.getElementById(`button-${position}`);
    if (buttonDiv) buttonDiv.classList.remove('cancel-bet');
}

function BetType(amount, autocashout, position) {
    this.Amount = amount;
    this.Autocashout = autocashout;
    this.Position = getButtonIndex(position);
    const autoBet = document.getElementById(`auto-bet-${position}`);
    this.AutoPlay = !!(autoBet && autoBet.checked);
}

let placeBetWaveActive = false;
let placeBetWaveSum = 0;
let placeBetInFlight = 0;
let placeBetDeferredData = null;
let playerButtonsDebounceTimer = null;
const PLAYER_BUTTONS_DEBOUNCE_MS = 80;

/** Batch rapid playerButtons updates (autoplay / Bet All optimistic cancel). */
function queuePlayerButtons(load = false) {
    if (load) {
        if (playerButtonsDebounceTimer) {
            clearTimeout(playerButtonsDebounceTimer);
            playerButtonsDebounceTimer = null;
        }
        playerButtons(true);
        return;
    }
    if (playerButtonsDebounceTimer) {
        clearTimeout(playerButtonsDebounceTimer);
    }
    playerButtonsDebounceTimer = setTimeout(() => {
        playerButtonsDebounceTimer = null;
        playerButtons();
    }, PLAYER_BUTTONS_DEBOUNCE_MS);
}

function rememberPlaceBetData(data) {
    if (!data) return;
    const nextId = data.CounterId;
    const prevId = placeBetDeferredData && placeBetDeferredData.CounterId;
    if (
        !placeBetDeferredData ||
        nextId == null ||
        prevId == null ||
        nextId >= prevId
    ) {
        placeBetDeferredData = data;
    }
}

function finishPlaceBetRequest(fallbackPlayerButtons) {
    placeBetInFlight = Math.max(0, placeBetInFlight - 1);
    if (placeBetInFlight > 0) return;

    if (placeBetDeferredData) {
        const data = placeBetDeferredData;
        placeBetDeferredData = null;
        loadPlayerData(data);
        gameEvent.betAction();
    } else if (fallbackPlayerButtons) {
        playerButtons();
    }
}

function showInsufficientFunds(position, message) {
    const isGiftSlot = Number(position) >= 4;
    if (!isGiftSlot) {
        jetX.canvas.playSound(13, 'UIerror');
        buttonMessage(position, message || GetCaption("jetxnew.amount.error"), 1500, 'error');
    }

    if (
        typeof isSharedAutoplayMode === 'function' &&
        isSharedAutoplayMode()
    ) {
        stopAllAutoplay();
        if (typeof gameEvent !== 'undefined' && gameEvent.autoPlayStoped) {
            gameEvent.autoPlayStoped();
        }
    } else {
        setChecked(`auto-bet-${position}`, false);
        if (
            hasClassSelector(`#button-${position} .btn-autoplay`, 'btn-autoplay-active') ||
            autoplayConfigs[position]?.started
        ) {
            autoplayConfigsClear(position);
        }
    }

    if (player.prevBets && player.prevBets[position]) {
        const betValueEl = document.getElementById(`bet-value-${position}`);
        const amount = parseInputAmount(betValueEl ? betValueEl.value : undefined);
        player.prevBetSum -= (isNaN(amount) ? 0 : amount);
        if (player.prevBetSum < 0) player.prevBetSum = 0;
        player.prevBets[position] = false;
        setPrevBets();
    }

    clearOptimisticCancel(position);
    setBetButtonLoading(position, false);

    const button = document.getElementById(`bet-${position}`);
    const buttonDiv = document.getElementById(`button-${position}`);
    if (button && !button.classList.contains('cash-out') && !button.classList.contains('disable')) {
        button.classList.remove('cancel-bet', 'btn-bet--loading');
        if (!button.classList.contains('place-bet')) button.classList.add('place-bet');
    }
    if (buttonDiv && !buttonDiv.classList.contains('cash-out') && !buttonDiv.classList.contains('disable')) {
        buttonDiv.classList.remove('cancel-bet', 'disabled');
        if (!buttonDiv.classList.contains('place-bet')) buttonDiv.classList.add('place-bet');
    }
    playerButtons();

    checkboxCheck();
    if (typeof acUpdateCollectBadge === 'function') acUpdateCollectBadge(position);
    if (typeof syncSharedAutoCollectToggle === 'function') syncSharedAutoCollectToggle();
}

function PlaceBet(token, betAmount, autocashout, position) {
    betAmount = parseInputAmount(betAmount);
    if (isNaN(betAmount)) betAmount = 0;

    if (visualConfig.giftOneBet && position === 5) {
        return false;
    }

    if (position > 3 && !(player.gift && player.gift.count > 0)) {
        player.prevBets[position] = false;
        setPrevBets();
        playerButtons();
        return false;
    }

    // const reservedSum = placeBetWaveActive ? placeBetWaveSum : 0;
    // if (position < 4 && betAmount + reservedSum > player.availableAmount) {
    //     showInsufficientFunds(position);
    //     return false;
    // }

    if (!jetX.game.loader) {
        if (position > 3) {
            let placedCount = (player.prevBets[4] ? 1 : 0) + (player.prevBets[5] ? 1 : 0);
            if (player.gift.count > placedCount) {
                player.prevBets[position] = true;
                queuePlayerButtons();
            }
        } else {
            if (player.prevBetSum + betAmount <= player.availableAmount) {
                player.prevBetSum += position < 4 ? betAmount : 0;
                player.prevBets[position] = true;
                queuePlayerButtons();
            } else {
                showInsufficientFunds(position);
            }
        }
        setPrevBets();
        return false;
    }

    if (placeBetWaveActive && position < 4) {
        placeBetWaveSum += betAmount;
    }

    let prevBet = player.prevBets[position];

    player.prevBetSum = 0;
    player.prevBets[position] = false;
    setPrevBets();
    autoBetTrigger[position] = true;
    setBetButtonLoading(position, true);
    mixpanelBetStart(position);
    releaseWinBalanceFloor();
    placeBetInFlight++;
    if(IsJetXApiEnabled) {
        let betType = new BetType(betAmount, autocashout, position);
        let eventUrl = urlHolder.Actions.Bet + "/" + token;
        apiPost(eventUrl, betType, function (data) {
            if (data.ErrorMessage) {
                setBetButtonLoading(position, false);
                clearOptimisticCancel(position);
                OnRequestFail(data, position);
                finishPlaceBetRequest(true);
            } else {
                mixpanelBet(position, prevBet, betAmount);
                rememberPlaceBetData(data);
                setLastBet(position);
                checkAutoplay(position, 'PlaceBet', betAmount);
                finishPlaceBetRequest(false);
            }
        }, function (jqXHR, textStatus, errorThrown) {
            setBetButtonLoading(position, false);
            clearOptimisticCancel(position);
            OnRequestFail(jqXHR, position);
            finishPlaceBetRequest(true);
        });
    } else {
        const autoBet = document.getElementById(`auto-bet-${position}`);
        let betType = {
            Amount: betAmount,
            Autocashout: autocashout,
            Position: getButtonIndex(position),
            AutoPlay: !!(autoBet && autoBet.checked),
        };
        window.hub.invoke("PostBet", window.token, betType).then((data) => {
            if (data.ErrorMessage) {
                setBetButtonLoading(position, false);
                clearOptimisticCancel(position);
                OnRequestFail(data, position);
                finishPlaceBetRequest(true);
            } else {
                mixpanelBet(position, prevBet, betAmount);
                rememberPlaceBetData(data);
                setLastBet(position);
                checkAutoplay(position, 'PlaceBet', betAmount);
                finishPlaceBetRequest(false);
            }
        }).catch(() => {
            setBetButtonLoading(position, false);
            clearOptimisticCancel(position);
            finishPlaceBetRequest(true);
        });
    }
}

function Cashout(token, position) {
    mixpanelCollectStart(position);
    setBetButtonLoading(position, true);
    if(IsJetXApiEnabled) {
        let eventUrl = urlHolder.Actions.Cashout + "/" + token;
        let bet = {
            Position: getButtonIndex(position)
        };
        apiPost(eventUrl, bet, function (data) {
            setBetButtonLoading(position, false);
            if (data.ErrorMessage) {
                OnRequestFail(data, position);
            } else {
                loadPlayerData(data, false, 'cashout');
                gameEvent.betAction();
                mixpanelCollect(position);
            }
        }, function (jqXHR, textStatus, errorThrown) {
            OnRequestFail(jqXHR, textStatus, errorThrown, position);
        });
    } else {
        let bet = {
            Position: getButtonIndex(position)
        };
        window.hub.invoke("Cashout", window.token, bet).then((data) => {
            //setBetButtonLoading(position, false);
            if (data.ErrorMessage) {
                OnRequestFail(data, position);
            } else {
                loadPlayerData(data, false, 'cashout');
                gameEvent.betAction();
                mixpanelCollect(position);
            }
        });
    }
}

function CashoutMany(token, positions) {
    if (typeof jetX !== 'undefined' && jetX.beginCashoutAllPulse) {
        jetX.beginCashoutAllPulse();
    }
    for (let i = 0; i < positions.length; i++) {
        mixpanelCollectStart(positions[i]);
        setBetButtonLoading(positions[i], true);
    }
    if(IsJetXApiEnabled) {
        let eventUrl = urlHolder.Actions.CashoutMany + "/" + token;
        let bet = {
            Positions: positions.map(getButtonIndex)
        };
        apiPost(eventUrl, bet, function (data) {
            for (let i = 0; i < positions.length; i++) {
                setBetButtonLoading(positions[i], false);
            }
            if (data.ErrorMessage) {
                for (let i = 0; i < positions.length; i++) {
                    OnRequestFail(data, positions[i]);
                }
            } else {
                loadPlayerData(data, false, 'cashout');
                gameEvent.betAction();
                mixpanelCollectAll(positions);
                for (let i = 0; i < positions.length; i++) {
                    mixpanelCollect(positions[i]);
                }
            }
        }, function (jqXHR, textStatus, errorThrown) {
            for (let i = 0; i < positions.length; i++) {
                OnRequestFail(jqXHR, textStatus, errorThrown, positions[i]);
            }
        });
    } else {
        let bet = {
            Positions: positions.map(getButtonIndex)
        };
        window.hub.invoke("CashoutMany", window.token, bet).then((data) => {
            for (let i = 0; i < positions.length; i++) {
                setBetButtonLoading(positions[i], false);
            }
            if (data.ErrorMessage) {
                for (let i = 0; i < positions.length; i++) {
                    OnRequestFail(data, positions[i]);
                }
            } else {
                loadPlayerData(data, false, 'cashout');
                gameEvent.betAction();
                mixpanelCollectAll(positions);
                for (let i = 0; i < positions.length; i++) {
                    mixpanelCollect(positions[i]);
                }
            }
        });
    }
}



function showCashoutGlow(variant) {
    const root = document.querySelector('.app') || document.querySelector('.stage');
    if (!root) return;

    const isWarning = variant === 'warning';
    const isMaxWin = variant === 'maxWin';
    const modifier = isWarning ? 'cashout-glow--warning' : (isMaxWin ? 'cashout-glow--max-win' : '');
    const selector = modifier
        ? `.cashout-glow.${modifier}`
        : '.cashout-glow:not(.cashout-glow--warning):not(.cashout-glow--max-win)';

    root.querySelectorAll(`${selector}:not(.cashout-glow--leaving)`).forEach((prev) => {
        prev.style.opacity = getComputedStyle(prev).opacity;
        prev.classList.add('cashout-glow--leaving');
    });

    const glow = document.createElement('div');
    glow.className = modifier ? `cashout-glow ${modifier}` : 'cashout-glow';
    glow.setAttribute('aria-hidden', 'true');
    root.appendChild(glow);

    glow.addEventListener('animationend', (e) => {
        if (e.target !== glow) return;
        if (glow.classList.contains('cashout-glow--leaving')) {
            if (e.animationName === 'cashout-glow-leave') glow.remove();
            return;
        }
        glow.remove();
    });
}

const WIN_TOAST_DEPTH = [
    {ty: '0rem', scale: '1', opacity: '1'},
    {ty: '-1.2rem', scale: '0.88', opacity: '1'},
    {ty: '-2.2rem', scale: '0.78', opacity: '1'},
    {ty: '-3rem', scale: '0.7', opacity: '1'},
    {ty: '-3.5rem', scale: '0.65', opacity: '1'},
    {ty: '-4rem', scale: '0.6', opacity: '1'},
];

/** Start win.webp this many ms before the toast/frame becomes visible, so line phase matches enter. */
const WIN_ANIM_LEAD_MS = 200;
const WIN_TOAST_HOLD_MS = 700;

let winAnimBlobPromise = null;
function getWinAnimBlob(url) {
    if (!winAnimBlobPromise) {
        winAnimBlobPromise = fetch(url)
            .then((response) => (response.ok ? response.blob() : null))
            .catch(() => null);
    }
    return winAnimBlobPromise;
}

function startWinAnim(img, url) {
    if (!img) return;
    getWinAnimBlob(url).then((blob) => {
        if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            img.addEventListener('load', () => URL.revokeObjectURL(objectUrl), {once: true});
            img.src = objectUrl;
        } else {
            img.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
        }
    });
}

function restackWinToasts(stack) {
    if (!stack) return;
    const slots = Array.from(stack.querySelectorAll('.win-toast-slot'))
        .filter(slot => !slot.classList.contains('win-toast-slot--leaving'));

    slots.forEach((slot, index) => {
        const depth = WIN_TOAST_DEPTH[Math.min(index, WIN_TOAST_DEPTH.length - 1)];
        slot.style.setProperty('--rest-ty', depth.ty);
        slot.style.setProperty('--rest-scale', depth.scale);
        slot.style.setProperty('--rest-opacity', depth.opacity);
        slot.style.zIndex = String(40 - Math.min(index, WIN_TOAST_DEPTH.length - 1) * 10);
    });
}

function getSlotScale(slot) {
    try {
        const transform = getComputedStyle(slot).transform;
        if (!transform || transform === 'none') return 1;
        const matrix = new DOMMatrixReadOnly(transform);
        return matrix.a || 1;
    } catch (e) {
        return 1;
    }
}

/** Gift bet slots are 4–5; cash wins keep the fly-to-balance animation even if gifts are credited/started. */
function isGiftWinToast(button) {
    return Number(button) >= 4;
}

function removeWinToastSlot(toast) {
    const slot = toast ? toast.closest('.win-toast-slot') : null;
    const stack = slot ? slot.parentElement : null;
    revokeWinToastAnim(toast);
    if (slot) slot.remove();
    else if (toast) toast.remove();
    restackWinToasts(stack);
}

function revokeWinToastAnim(toast) {
    if (!toast) return;
    const img = toast.querySelector('.win-video');
    if (img && img.src && img.src.indexOf('blob:') === 0) {
        URL.revokeObjectURL(img.src);
        img.removeAttribute('src');
    }
}

let pendingWinBalanceMax = null;
let winToastScheduled = 0;
let winBalanceLastTarget = null;

function insertWinBalance(value) {
    const list = player.availableAmountList;
    let i = 0;
    while (i < list.length && list[i] < value) i++;
    if (i < list.length && list[i] === value) return;
    list.splice(i, 0, value);
}

function queueWinBalance(amount) {
    const value = Number(amount);
    if (!isFinite(value)) return;
    if (pendingWinBalanceMax == null || value > pendingWinBalanceMax) pendingWinBalanceMax = value;
    if (!winToastScheduled && !document.querySelector('.win-toast')) {
        player.availableAmountList.length = 0;
        winBalanceLastTarget = null;
        applyBalanceAmount(pendingWinBalanceMax, true);
        return;
    }
    insertWinBalance(value);
}

function syncPendingWinBalance(amount) {
    if (!hasPendingWinBalance()) return;
    const value = Number(amount);
    if (!isFinite(value)) return;
    if (pendingWinBalanceMax != null && value <= pendingWinBalanceMax) return;
    pendingWinBalanceMax = value;
    insertWinBalance(value);
}

function takeWinBalanceForToast(toast) {
    toast._carriesBalance = false;
    const list = player.availableAmountList;
    const settled = pendingWinBalanceMax != null ? pendingWinBalanceMax : player.availableAmount;

    if (!winToastScheduled && !document.querySelector('.win-toast')) {
        list.length = 0;
        winBalanceLastTarget = null;
        return settled;
    }

    let floor = winBalanceLastTarget;
    if (floor == null) {
        const balanceEl = document.querySelector('#userBalance');
        floor = balanceEl ? parseInputAmount(balanceEl.textContent) : null;
    }
    while (list.length) {
        const next = list.shift();
        if (floor == null || next > floor) {
            winBalanceLastTarget = next;
            return next;
        }
    }
    winBalanceLastTarget = settled;
    return settled;
}

function abandonWinToastBalance(toast) {
    if (!toast._carriesBalance) return;
    toast._carriesBalance = false;
    if (winToastScheduled || document.querySelector('.win-toast')) return;
    player.availableAmountList.length = 0;
    winBalanceLastTarget = null;
    if (pendingWinBalanceMax != null) applyBalanceAmount(pendingWinBalanceMax, false);
}

function pendingWinBalanceFloor() {
    return pendingWinBalanceMax;
}

function releaseWinBalanceFloor() {
    if (hasPendingWinBalance()) return;
    pendingWinBalanceMax = null;
}

function hasPendingWinBalance() {
    if (winToastScheduled > 0) return true;
    if (player.availableAmountList && player.availableAmountList.length) return true;
    const toasts = document.querySelectorAll('.win-toast');
    for (let i = 0; i < toasts.length; i++) {
        if (toasts[i]._carriesBalance) return true;
    }
    return false;
}

function applyBalanceAmount(amount, animate = true, isMaxWin = false) {
    const balanceEl = document.querySelector('#userBalance');
    if (!balanceEl || amount == null || amount === undefined) return;
    if (animate) {
        pulseBalance(balanceEl, isMaxWin);
        animateBalance(balanceEl, amount);
    } else {
        balanceEl.innerHTML = formatAmount(amount, player.currency, 'formated');
        syncUserBalanceCurrencyClass(player.currency);
    }
}

function dismissWinToast(toast) {
    const slot = toast.closest('.win-toast-slot');
    const stack = slot ? slot.parentElement : null;

    if (!toast.isConnected) {
        removeWinToastSlot(toast);
        return;
    }

    if (slot) {
        slot.classList.add('win-toast-slot--leaving');
        restackWinToasts(stack);
    }

    toast.classList.add('win-toast--leaving');
    toast.addEventListener('animationend', () => {
        removeWinToastSlot(toast);
    }, {once: true});
}

function flyWinToastToBalance(toast) {
    const balanceEl = document.querySelector('#userBalance');
    const slot = toast.closest('.win-toast-slot');
    const stack = slot ? slot.parentElement : null;

    if (!balanceEl || !toast.isConnected) {
        revokeWinToastAnim(toast);
        if (slot) slot.remove(); else toast.remove();
        restackWinToasts(stack);
        abandonWinToastBalance(toast);
        return;
    }

    const scale = slot ? getSlotScale(slot) : 1;
    const toastRect = toast.getBoundingClientRect();
    const balanceRect = balanceEl.getBoundingClientRect();
    const dx = (balanceRect.left + balanceRect.width / 2) - (toastRect.left + toastRect.width / 2);
    const dy = (balanceRect.top + balanceRect.height / 2) - (toastRect.top + toastRect.height / 2);

    toast.style.setProperty('--fly-x', `${dx / scale}px`);
    toast.style.setProperty('--fly-y', `${dy / scale}px`);

    if (slot) {
        slot.classList.add('win-toast-slot--leaving');
        //slot.style.zIndex = '60';
        restackWinToasts(stack);
    }

    toast.classList.add('win-toast--fly');
    toast.addEventListener('animationend', () => {
        revokeWinToastAnim(toast);
        if (slot) slot.remove(); else toast.remove();
        restackWinToasts(stack);
        pulseBalance(balanceEl, toast.classList.contains('win-toast--max-win'));
        animateBalance(balanceEl, takeWinBalanceForToast(toast));
    }, {once: true});
}

function pulseBalance(balanceEl, isMaxWin) {
    balanceEl.classList.remove('balance-bump');
    balanceEl.classList.toggle('balance-win--max', !!isMaxWin);
    void balanceEl.offsetWidth;
    balanceEl.classList.add('balance-bump');
    balanceEl.addEventListener('animationend', () => balanceEl.classList.remove('balance-bump'), {once: true});
}

function animateBalance(balanceEl, toAmount, duration = 650) {
    let to = parseInputAmount(toAmount);
    if(to < 0) to = 0;
    if (!isFinite(to)) {
        balanceEl.innerHTML = formatAmount(toAmount, player.currency, 'formated');
        syncUserBalanceCurrencyClass(player.currency);
        return;
    }

    let from = parseInputAmount(balanceEl.textContent);
    if (from === null) from = to;
    if (balanceEl._balanceRaf) {
        cancelAnimationFrame(balanceEl._balanceRaf);
        balanceEl._balanceRaf = null;
    }
    clearTimeout(balanceEl._balanceColorTimer);
    const isMaxWin = balanceEl.classList.contains('balance-win--max');
    const setWinColor = () => {
        balanceEl.classList.add('balance-win');
        balanceEl.classList.toggle('balance-win--max', isMaxWin);
        balanceEl._balanceColorTimer = setTimeout(() => {
            balanceEl.classList.remove('balance-win', 'balance-win--max');
            balanceEl._balanceColorTimer = null;
        }, duration);
    };
    if (from === to) {
        balanceEl.innerHTML = formatAmount(to, player.currency, 'formated');
        syncUserBalanceCurrencyClass(player.currency);
        setWinColor();
        return;
    }
    const startTime = performance.now();
    const delta = to - from;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    setWinColor();
    syncUserBalanceCurrencyClass(player.currency);
    const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        let value = from + delta * easeOut(t);
        if (value < 0) value = 0;
        balanceEl.innerHTML = formatAmount(value, player.currency, 'formated');
        if (t < 1) {
            balanceEl._balanceRaf = requestAnimationFrame(step);
        } else {
            balanceEl._balanceRaf = null;
            balanceEl.innerHTML = formatAmount(to, player.currency, 'formated');
            syncUserBalanceCurrencyClass(player.currency);
        }
    };
    balanceEl._balanceRaf = requestAnimationFrame(step);
}

let winToastNextAt = 0;

const buttonErrorToasts = {};
let buttonErrorScrollBound = false;
let buttonErrorIgnorePointerUntil = 0;

function isAcBetInputId(id) {
    return typeof id === 'string' && id.indexOf('ac-bet-value-') === 0;
}

function getMaxBetToastKey(input, fallbackButton) {
    if (!input || !input.id) return fallbackButton;
    if (input.id === 'autoplay-bet' || isAcBetInputId(input.id)) return input.id;
    return fallbackButton;
}

function getButtonErrorAnchor(button, variant) {
    if (variant === 'max') {
        if (button === 'autoplay-bet' || isAcBetInputId(button)) {
            const input = document.getElementById(button);
            return input ? input.closest('.bet-input') : null;
        }
        const panel = document.getElementById(`button-${button}`);
        return panel ? panel.querySelector('.bet-input') : null;
    }

    let anchor = document.getElementById(`bet-${button}`);
    const compactActions = document.querySelector('[data-compact-bet-actions]');
    if (compactActions) {
        const style = getComputedStyle(compactActions);
        const compactVisible = style.display !== 'none'
            && style.visibility !== 'hidden'
            && parseFloat(style.opacity) > 0;
        if (compactVisible) {
            const compactButton = compactActions.querySelector(`.compact-bet-button[data-button="${button}"]`);
            if (compactButton) anchor = compactButton;
        }
    }
    return anchor;
}

function dismissButtonError(button) {
    const prev = buttonErrorToasts[button];
    if (!prev) return;
    clearTimeout(prev.timer);
    if (prev.raf) cancelAnimationFrame(prev.raf);
    prev.el.remove();
    delete buttonErrorToasts[button];
}

function dismissAllButtonErrors() {
    Object.keys(buttonErrorToasts).forEach((key) => dismissButtonError(key));
}

function dismissAllWinToasts() {
    const stack = document.querySelector('.win-toast-stack');
    if (stack) {
        const pending = stack.querySelectorAll('.win-toast');
        for (let i = 0; i < pending.length; i++) {
            pending[i]._carriesBalance = false;
            revokeWinToastAnim(pending[i]);
        }
        stack.replaceChildren();
    }
    if (player.availableAmountList && player.availableAmountList.length) {
        player.availableAmountList.length = 0;
    }
    const settled = pendingWinBalanceMax != null ? pendingWinBalanceMax : player.availableAmount;
    pendingWinBalanceMax = null;
    winBalanceLastTarget = null;
    applyBalanceAmount(settled, false);
    winToastNextAt = 0;
}

function isMenuOpen() {
    const menu = document.getElementById('menu-pop');
    return Boolean(menu && !menu.hidden);
}

function onButtonErrorUserScroll() {
    if (!Object.keys(buttonErrorToasts).length) return;
    dismissAllButtonErrors();
}

function onButtonErrorOutsidePointer() {
    if (!Object.keys(buttonErrorToasts).length) return;
    if (buttonErrorIgnorePointerUntil && Date.now() < buttonErrorIgnorePointerUntil) return;
    dismissAllButtonErrors();
}

function ensureButtonErrorScrollListener() {
    if (buttonErrorScrollBound) return;
    buttonErrorScrollBound = true;
    const page = document.querySelector('.page');
    const sidebar = document.querySelector('.side');
    window.addEventListener('scroll', onButtonErrorUserScroll, { passive: true });
    document.addEventListener('scroll', onButtonErrorUserScroll, { passive: true, capture: true });
    page?.addEventListener('scroll', onButtonErrorUserScroll, { passive: true });
    sidebar?.addEventListener('scroll', onButtonErrorUserScroll, { passive: true });
    document.addEventListener('pointerdown', onButtonErrorOutsidePointer, { passive: true });
}

function showButtonError(button, message, delay = 1500, variant) {
    if (isMenuOpen()) return;

    const anchor = getButtonErrorAnchor(button, variant);
    if (!anchor) return;

    dismissButtonError(button);

    const el = document.createElement('div');
    el.className = variant === 'max' ? 'btn-error-toast btn-error-toast--max' : 'btn-error-toast';
    el.setAttribute('role', 'alert');
    el.innerHTML = `<span>${message}</span>`;

    const modalHost = button === 'autoplay-bet'
        ? document.getElementById('popup-autoplay')
        : (isAcBetInputId(button) ? document.getElementById('popup-auto-collect') : null);
    const host = modalHost || document.querySelector('.app') || document.body;
    host.appendChild(el);
    if (modalHost) el.style.zIndex = '30';

    const rect = anchor.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top - 6}px`;
    el.style.width = `${rect.width}px`;

    const originTop = rect.top;
    const originLeft = rect.left;

    const timer = setTimeout(() => {
        el.classList.add('btn-error-toast--leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
        setTimeout(() => el.remove(), 400);
        const current = buttonErrorToasts[button];
        if (current && current.el === el) {
            if (current.raf) cancelAnimationFrame(current.raf);
            delete buttonErrorToasts[button];
        }
    }, delay || 1500);

    const entry = { el, timer, raf: 0 };
    buttonErrorToasts[button] = entry;

    const watchAnchor = () => {
        if (buttonErrorToasts[button] !== entry) return;
        if (!anchor.isConnected) {
            dismissButtonError(button);
            return;
        }
        const next = anchor.getBoundingClientRect();
        if (Math.abs(next.top - originTop) > 8 || Math.abs(next.left - originLeft) > 8) {
            dismissButtonError(button);
            return;
        }
        entry.raf = requestAnimationFrame(watchAnchor);
    };
    entry.raf = requestAnimationFrame(watchAnchor);

    buttonErrorIgnorePointerUntil = Date.now() + 400;
    ensureButtonErrorScrollListener();
}
// buttonMessage(1, { winAmount: '$ 10,000.00', cashout: '50.00', isMaxWin: true }, 3000, 'cashout');
function buttonMessage(button, message, delay, status) {
    if (status === 'error') {
        showButtonError(button, message, delay);
        return;
    }
    if (status === 'max') {
        showButtonError(button, message, delay, 'max');
        return;
    }
    if (status === 'cashout') {
        const isMaxWin = !!(message && message.isMaxWin);
        showCashoutGlow(isMaxWin ? 'maxWin' : undefined);

        const carriesBalance = !isGiftWinToast(button);
        if (carriesBalance) winToastScheduled++;

        const now = Date.now();
        const showAt = Math.max(now, winToastNextAt);
        winToastNextAt = showAt + 500;

        setTimeout(() => {
            if (carriesBalance) winToastScheduled = Math.max(0, winToastScheduled - 1);
            if (isMenuOpen()) {
                // Cashout already queued balance; toast skipped — apply without animation stack.
                if (carriesBalance) {
                    player.availableAmountList.length = 0;
                    winBalanceLastTarget = null;
                    const queued = pendingWinBalanceMax != null ? pendingWinBalanceMax : player.availableAmount;
                    applyBalanceAmount(queued, true, isMaxWin);
                }
                return;
            }

            const stack = document.querySelector('.win-toast-stack');
            const toast = document.createElement('div');
            const cashout = message && message.cashout ? String(message.cashout) : '';
            const cashoutValue = parseFloat(cashout);
            const isBigWin = !isMaxWin && Number.isFinite(cashoutValue) && cashoutValue >= 10;
            toast.className = isMaxWin
                ? 'win-toast win-toast--max-win'
                : (isBigWin ? 'win-toast win-toast--big' : 'win-toast');
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            if (isMaxWin) {
                jetX.canvas.playSound(14, 'UItoast');
            }
            const coefficient = cashout && cashout.indexOf('x') === -1 ? `${cashout}x` : cashout;
            const amount = message && message.winAmount ? message.winAmount : '';
            const maxWinCaption = GetCaption('jetxnew.max.win');
            const winLabel = isMaxWin
                ? maxWinCaption
                : (coefficient ? `${GetCaption('jetxnew.you.won.at')} ${coefficient}` : GetCaption('jetxnew.you.won'));
            let base = '../Content/';
            if (staticContentUrl !== '') {
                base = staticContentUrl.replace('Sound/', '');
            }
            const webpUrl = base + 'ImagesNew/win.webp';
            toast.innerHTML = `
                <img class="win-video" alt="" aria-hidden="true" decoding="async">
                <div class="win-copy">
                    <span class="win-label">${winLabel}</span>
                    <span class="win-amount">${amount}</span>
                </div>
            `;

            startWinAnim(toast.querySelector('.win-video'), webpUrl);

            toast._carriesBalance = carriesBalance;

            const slot = document.createElement('div');
            slot.className = 'win-toast-slot';
            slot.appendChild(toast);

            if (!stack) {
                abandonWinToastBalance(toast);
                return;
            }

            while (stack.children.length >= 4) {
                const removed = stack.lastElementChild;
                const removedToast = removed && removed.querySelector
                    ? removed.querySelector('.win-toast')
                    : null;
                if (removedToast) revokeWinToastAnim(removedToast);
                removed.remove();
                if (removedToast) abandonWinToastBalance(removedToast);
            }

            stack.prepend(slot);
            restackWinToasts(stack);

            // Hold matches visual appear (enter animation-delay = WIN_ANIM_LEAD_MS).
            setTimeout(() => {
                if (isGiftWinToast(button)) {
                    dismissWinToast(toast);
                } else {
                    flyWinToastToBalance(toast);
                }
            }, WIN_TOAST_HOLD_MS + WIN_ANIM_LEAD_MS);
        }, showAt - now);
    }
}






const getAutoplayMinBet = () => {
    if (board && board.minBet != null && Number(board.minBet) > 0) {
        return getAmountNumber(board.minBet);
    }
    return getAmountNumber(document.querySelector('#autoplay-decrease')?.dataset.minbet || 10);
};

const createAutoplayConfig = (overrides = {}) => {
    const minBet = getAutoplayMinBet();
    return {
        started: false,
        count: 1000000,
        bet: 0,
        rounds: String.fromCharCode(8734),
        decCheck: false,
        decVal: minBet,
        incCheck: false,
        incVal: minBet,
        winCheck: false,
        winVal: minBet,
        lose: 0,
        win: 0,
        lastWin: 0,
        lastBet: 0,
        ...overrides
    };
};

const applyAutoplayAdvancedMinBetDefaults = ({ onlyUnchecked = true } = {}) => {
    const minBet = getAutoplayMinBet();
    const fields = [
        { id: 'autoplay-decrease', checkSelector: '#autoplay-decrease-div input[type="checkbox"]' },
        { id: 'autoplay-increase', checkSelector: '#autoplay-increase-div input[type="checkbox"]' },
        { id: 'autoplay-win', checkSelector: '#autoplay-win-div input[type="checkbox"]' },
    ];

    fields.forEach(({ id, checkSelector }) => {
        const checkbox = document.querySelector(checkSelector);
        if (onlyUnchecked && checkbox?.checked) return;
        const input = document.querySelector(`#${id}`);
        if (!input) return;
        input.value = minBet;
        setInputValue(id);
    });
};

const autoplayConfigs = {};
['0', '1', '2', '3'].forEach(slot => {
    autoplayConfigs[slot] = createAutoplayConfig();
});

const autoplayBadgeText = String.fromCharCode(8734);
const autoplayButtonAnimationMs = 280;
const autoplayButtonAnimationTimers = new WeakMap();
const autoplayButtons = document.querySelectorAll('[data-autoplay-toggle]');
const autoplayPopup = document.querySelector('#popup-autoplay');
const autoplayAdvancedToggle = autoplayPopup?.querySelector('[data-autoplay-advanced-toggle]');
const autoplayAdvancedFields = autoplayPopup?.querySelector('[data-autoplay-advanced-fields]');
const autoplayAdvancedRows = autoplayPopup ? Array.from(autoplayPopup.querySelectorAll('[data-autoplay-advanced-row]')) : [];
let autoplayCountButtons = autoplayPopup ? Array.from(autoplayPopup.querySelectorAll('[data-autoplay-count]')) : [];
const autoplayRoundInput = autoplayPopup?.querySelector('.autoplay-card--rounds .bet-input-field');
let activeAutoplayButton = null;

function parseAutoplayCountNumber(value) {
    return Number(String(value).replace(/[\s,_]/g, ''));
}

function isAutoplayInfinityCount(value) {
    return value === '∞'
        || value === autoplayBadgeText
        || value === '&infin;'
        || parseAutoplayCountNumber(value) === 1000000;
}

function getAutoplayCountMarkup(count) {
    if (isAutoplayInfinityCount(count)) {
        return `<span class="autobet-selector__value"><svg class="icon" aria-hidden="true"><use href="#infinity"></use></svg></span>`;
    }
    return `<span class="autobet-selector__value">${count}</span>`;
}

function getAutoplayCountValue(button) {
    const raw = button?.dataset.autoplayCount
        || button?.querySelector('.autobet-selector__value')?.textContent.trim()
        || '';
    return isAutoplayInfinityCount(raw) ? autoplayBadgeText : raw;
}

function getDefaultAutoplayCount() {
    if (!autoplayCountButtons.length) return autoplayBadgeText;

    const values = autoplayCountButtons.map(getAutoplayCountValue);
    const hasInfinity = values.some(isAutoplayInfinityCount);
    if (hasInfinity) return autoplayBadgeText;

    const numeric = values.map(Number).filter((n) => !isNaN(n));
    if (numeric.length) return String(Math.max(...numeric));

    return values[values.length - 1] || autoplayBadgeText;
}

function normalizeAutoplayCountButtons() {
    if (!autoplayPopup) return;
    autoplayCountButtons = Array.from(autoplayPopup.querySelectorAll('[data-autoplay-count]'));
    autoplayCountButtons.forEach((button) => {
        const raw = button.dataset.autoplayCount
            || button.querySelector('.autobet-selector__value')?.textContent.trim()
            || '';
        if (!isAutoplayInfinityCount(raw)) return;
        button.dataset.autoplayCount = autoplayBadgeText;
        if (!button.querySelector('use[href="#infinity"]')) {
            button.innerHTML = getAutoplayCountMarkup(autoplayBadgeText);
        }
    });
}

function applyAutoplaySpinCounts() {
    if (!autoplayPopup) return;
    const container = autoplayPopup.querySelector('.autoplay-round-options');
    if (!container) return;

    if (visualConfig.autoplaySpinCounts.length) {
        container.innerHTML = '';

        const counts = visualConfig.autoplaySpinCounts;
        const hasInfinity = counts.some(isAutoplayInfinityCount);
        const numericCounts = counts
            .filter((count) => !isAutoplayInfinityCount(count))
            .map(parseAutoplayCountNumber)
            .filter((n) => !isNaN(n));
        const defaultCount = hasInfinity
            ? autoplayBadgeText
            : (numericCounts.length ? String(Math.max(...numericCounts)) : null);

        counts.forEach((count) => {
            const isInfinity = isAutoplayInfinityCount(count);
            const value = isInfinity ? autoplayBadgeText : count;
            const button = document.createElement('button');
            button.className = 'autobet-selector';
            button.type = 'button';
            button.dataset.autoplayCount = value;
            if (defaultCount !== null && String(value) === defaultCount) {
                button.classList.add('autobet-selector--selected');
                button.setAttribute('aria-pressed', 'true');
            }
            button.innerHTML = getAutoplayCountMarkup(value);
            container.appendChild(button);
        });
    }

    normalizeAutoplayCountButtons();
}

applyAutoplaySpinCounts();

const isSharedAutoplayMode = () => Boolean(app && app.classList.contains('mode-4'));

const setAutoplaySharedPopup = (shared) => {
    if (!autoplayPopup) return;
    autoplayPopup.classList.toggle('is-autoplay-shared', shared);
    if (shared) {
        setAutoplayAdvancedOpen(false);
    }
};

const isAnyAutoplayActive = () => {
    return Object.values(autoplayConfigs).some((config) => !!config?.started);
};

const syncAutoplayLocks = () => {
    if (typeof syncGiftsUseButtonLock === 'function') syncGiftsUseButtonLock();
    if (typeof syncGiftBetModeLocks === 'function') syncGiftBetModeLocks();
};

const stopAllAutoplay = () => {
    for (let i = 0; i < 4; i++) {
        const button = document.getElementById(`auto-bet-button-${i}`);
        if (button) setAutoplayButtonActive(button, false, autoplayBadgeText, false);
        autoplayConfigsClear(i);
    }
    activeAutoplayButton = null;
    syncAutoplayLocks();
};

const renderAutoplayButton = (button, active, badgeText = autoplayBadgeText) => {
    if (!button) {
        return;
    }

    if (active) {
        button.innerHTML = `
        <svg class="icon" aria-hidden="true">
            <use href="#autoplay-off"></use>
        </svg>
        <span class="autoplay-badge">
        ${isAutoplayInfinityCount(badgeText) ? `<svg class="icon" aria-hidden="true"><use href="#infinity"></use></svg>` : badgeText}
        </span>
        <svg class="icon-arrow" aria-hidden="true">
            <use href="#arrow-down-01"></use>
        </svg>`;
        return;
    }

    button.innerHTML = `
    <svg class="icon" aria-hidden="true">
        <use href="#autoplay"></use>
    </svg>`;
};

const clearAutoplayButtonAnimation = (button) => {
    const timer = autoplayButtonAnimationTimers.get(button);

    if (timer) {
        window.clearTimeout(timer);
        autoplayButtonAnimationTimers.delete(button);
    }

    button.classList.remove('btn-autoplay-state-enter', 'btn-autoplay-state-exit');
};

const animateAutoplayButton = (button, className, onComplete) => {
    clearAutoplayButtonAnimation(button);
    void button.offsetWidth;
    button.classList.add(className);

    const timer = window.setTimeout(() => {
        button.classList.remove(className);
        autoplayButtonAnimationTimers.delete(button);
        onComplete?.();
    }, autoplayButtonAnimationMs);

    autoplayButtonAnimationTimers.set(button, timer);
};

const setAutoplayButtonActive = (button, active, badgeText = autoplayBadgeText, animate = true) => {
    if (!button) {
        return;
    }

    const wasActive = button.classList.contains('btn-autoplay-active') || Boolean(button.querySelector('.autoplay-badge'));
    const shouldAnimate = animate && wasActive !== active;
    let id = button.dataset.button;
    let autoplayConfig = autoplayConfigs[id];
    const autoBet = document.querySelector(`#auto-bet-${id}`);
    autoBet.checked = active;
    autoplayConfig.started = active;
    autoplayConfig.bet = getAmountNumber(document.querySelector(`#bet-value-${id}`).value);


    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Autoplay active' : 'Autoplay');

    if (shouldAnimate && !active && wasActive) {
        button.classList.remove('btn-autoplay-active');
        animateAutoplayButton(button, 'btn-autoplay-state-exit', () => {
            renderAutoplayButton(button, false);
            syncSharedAutoplayButton();
        });
        syncAutoplayLocks();
        return;
    }

    clearAutoplayButtonAnimation(button);
    button.classList.toggle('btn-autoplay-active', active);
    renderAutoplayButton(button, active, badgeText);

    if (shouldAnimate) {
        animateAutoplayButton(button, active ? 'btn-autoplay-state-enter' : 'btn-autoplay-state-exit');
    }

    syncSharedAutoplayButton();
    syncAutoplayLocks();
};

const syncAutoplayAdvancedRow = (row) => {
    const checkbox = row?.querySelector('[data-autoplay-advanced-checkbox]');
    const input = row?.querySelector('.autoplay-input');
    const enabled = Boolean(checkbox?.checked);

    if (!input) {
        return;
    }

    input.classList.toggle('disabled', !enabled);
    input.setAttribute('aria-disabled', String(!enabled));
    input.querySelectorAll('button, input').forEach((control) => {
        control.disabled = !enabled;
    });
};

const syncAutoplayAdvancedRows = () => {
    autoplayAdvancedRows.forEach(syncAutoplayAdvancedRow);
};

const getSelectedAutoplayCount = () => {
    const selected = autoplayPopup?.querySelector('[data-autoplay-count].autobet-selector--selected');
    return getAutoplayCountValue(selected) || getDefaultAutoplayCount();
};

const setAutoplayAdvancedOpen = (open) => {
    if (!autoplayPopup || !autoplayAdvancedToggle || !autoplayAdvancedFields) {
        return;
    }

    autoplayPopup.classList.toggle('is-autoplay-advanced-open', open);
    autoplayAdvancedToggle.setAttribute('aria-expanded', String(open));
    autoplayAdvancedFields.setAttribute('aria-hidden', String(!open));

    if (open) {
        applyAutoplayAdvancedMinBetDefaults({ onlyUnchecked: true });
        syncAutoplayAdvancedRows();

        const cards = autoplayPopup.querySelector('.autoplay-settings__cards');
        if (cards) {
            setTimeout(() => {
                cards.scrollTo({ top: cards.scrollHeight, behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
            }, 280);
        }
    }
};

const autoplayButtonClick = (autoplayButton) => {
    // if (!autoplayButton.classList.contains('btn-autoplay-active')) {
    //     setAutoplayButtonActive(autoplayButton, true);
    // }
    activeAutoplayButton = autoplayButton;
    // let id = autoplayButton.dataset.button;
    // let betButton = document.querySelector(`#bet-${id}`);
    // if(betButton.classList.contains('place-bet')) {
    //     betButton.click();
    // }
    openPopup('autoplay');
}

const autoplayStopButtonClick = (autoplayStopButton) => {
    jetX.canvas.playSound(4, 'button');
    if (isSharedAutoplayMode()) {
        stopAllAutoplay();
        mixpanelCheckbox('all', 'auto-bet-all');
        closePopups();
        return;
    }
    if (activeAutoplayButton && document.contains(activeAutoplayButton)) {
        const id = activeAutoplayButton.dataset.button;
        setAutoplayButtonActive(activeAutoplayButton, false);
        autoplayConfigsClear(id);
        mixpanelCheckbox(id, `auto-bet-${id}`);
    } else {
        autoplayButtons.forEach((button) => {
            const id = button.dataset.button;
            setAutoplayButtonActive(button, false);
            if (id != null) mixpanelCheckbox(id, `auto-bet-${id}`);
        });
    }
    activeAutoplayButton = null;
    closePopups();
}

const autoplayStartButtonClick = (autoplayStartButton) => {
    jetX.canvas.playSound(4, 'button');
    const selectedCount = getSelectedAutoplayCount();

    if (isSharedAutoplayMode()) {
        for (let i = 0; i < 4; i++) {
            const button = document.getElementById(`auto-bet-button-${i}`);
            if (button) setAutoplayButtonActive(button, true, selectedCount);
            autoplayConfigsSet(i, { shared: true });
            const betButton = document.getElementById(`bet-${i}`);
            if (betButton && betButton.classList.contains('place-bet') && isBettingWindowOpen()) {
                triggerBetButton(betButton);
            }
        }
        mixpanelFirstUsage('firstAutoplayTime');
        mixpanelCheckbox('all', 'auto-bet-all');
        activeAutoplayButton = null;
        closePopups();
        return;
    }

    if (activeAutoplayButton && document.contains(activeAutoplayButton)) {
        setAutoplayButtonActive(activeAutoplayButton, true, selectedCount);
    } else {
        autoplayButtons.forEach((button) => {
            if (button.classList.contains('btn-autoplay-active')) {
                setAutoplayButtonActive(button, true, selectedCount);
            }
        });
    }
    let id = activeAutoplayButton.dataset.button;
    autoplayConfigsSet(id);
    mixpanelFirstUsage('firstAutoplayTime');
    mixpanelCheckbox(id, `auto-bet-${id}`);
    let betButton = document.querySelector(`#bet-${id}`);
    if (betButton && betButton.classList.contains('place-bet') && isBettingWindowOpen()) {
        triggerBetButton(betButton);
    }
    activeAutoplayButton = null;
    closePopups();
}

const autoplayCountButtonClick = (autoplayCountButton) => {
    jetX.canvas.playSound(4, 'button');
    autoplayCountButtons.forEach((button) => {
        const active = button === autoplayCountButton;
        button.classList.toggle('autobet-selector--selected', active);
        button.setAttribute('aria-pressed', String(active));
    });
    if (autoplayRoundInput && autoplayCountButton.dataset.autoplayRound) {
        autoplayRoundInput.value = autoplayCountButton.dataset.autoplayRound;
    }
}

const syncAutoplayCountSelection = (count) => {
    let target = count == null ? getDefaultAutoplayCount() : String(count);
    const hasMatch = autoplayCountButtons.some((button) => getAutoplayCountValue(button) === target);
    if (!hasMatch) target = getDefaultAutoplayCount();

    autoplayCountButtons.forEach((button) => {
        const active = getAutoplayCountValue(button) === target;
        button.classList.toggle('autobet-selector--selected', active);
        button.setAttribute('aria-pressed', String(active));
    });
};

const setAutoplayPopup = () => {
    const shared = isSharedAutoplayMode();
    setAutoplaySharedPopup(shared);

    if (shared) {
        let activeRounds = null;
        for (let i = 0; i < 4; i++) {
            if (autoplayConfigs[i]?.started) {
                activeRounds = autoplayConfigs[i].rounds;
                break;
            }
        }
        syncAutoplayCountSelection(activeRounds || getDefaultAutoplayCount());
        syncAutoplayCollect(false);
        return;
    }

    if(!activeAutoplayButton) return ;


    let id = activeAutoplayButton.dataset.button;
    let autoplayConfig = autoplayConfigs[id];

    let bet = getAmountNumber(document.querySelector(`#bet-value-${id}`).value);
    autoplayConfig.bet = bet;
    document.querySelector(`#autoplay-bet`).value = bet;

    const minBet = getAutoplayMinBet();
    if (!autoplayConfig.started) {
        if (!autoplayConfig.decCheck) autoplayConfig.decVal = minBet;
        if (!autoplayConfig.incCheck) autoplayConfig.incVal = minBet;
        if (!autoplayConfig.winCheck) autoplayConfig.winVal = minBet;
    }

    document.querySelector(`#autoplay-decrease-div input[type="checkbox"]`).checked = autoplayConfig.decCheck;
    document.querySelector(`#autoplay-decrease`).value = autoplayConfig.decCheck ? autoplayConfig.decVal : minBet;
    document.querySelector(`#autoplay-increase-div input[type="checkbox"]`).checked = autoplayConfig.incCheck;
    document.querySelector(`#autoplay-increase`).value = autoplayConfig.incCheck ? autoplayConfig.incVal : minBet;
    document.querySelector(`#autoplay-win-div input[type="checkbox"]`).checked = autoplayConfig.winCheck;
    document.querySelector(`#autoplay-win`).value = autoplayConfig.winCheck ? autoplayConfig.winVal : minBet;

    setAutoplayAdvancedOpen(!!(autoplayConfig.decCheck || autoplayConfig.incCheck || autoplayConfig.winCheck));

    const collectToggle = document.querySelector('#autoplay-collect-toggle');
    const collectValue = document.querySelector('#autoplay-collect');
    const slotCollect = document.querySelector(`#auto-cash-out-${id}`);
    const slotCollectValue = document.querySelector(`#cash-out-value-${id}`);
    const slotLocked = hasClassSelector(`#button-${id}`, 'disabled');
    if (collectToggle && collectValue) {
        collectToggle.checked = !!(slotCollect && slotCollect.checked);
        if (slotCollectValue) collectValue.value = slotCollectValue.value;
        syncAutoplayCollect(slotLocked);
    }

    syncAutoplayCountSelection(autoplayConfig.started ? autoplayConfig.rounds : getDefaultAutoplayCount());

    setInputValue('autoplay-bet');
    setInputValue('autoplay-decrease');
    setInputValue('autoplay-increase');
    setInputValue('autoplay-win');
    syncAutoplayAdvancedRows();
}

const autoplayConfigsClear = (id) => {
    autoplayConfigs[id] = createAutoplayConfig();
    const autoBet = document.querySelector(`#auto-bet-${id}`);
    if (autoBet) autoBet.checked = false;
    const autoBetButton = document.querySelector(`#auto-bet-button-${id}`);
    if (autoBetButton) {
        renderAutoplayButton(autoBetButton, false);
        autoBetButton.classList.remove('btn-autoplay-active');
    }
    syncSharedAutoplayButton();
    syncAutoplayLocks();
}

const autoplayConfigsSet = (id, options = {}) => {
    const shared = !!options.shared;
    let round = getSelectedAutoplayCount();
    const slotBetEl = document.querySelector(`#bet-value-${id}`);
    const betAmount = shared
        ? getAmountNumber(slotBetEl ? slotBetEl.value : 0)
        : getAmountNumber(document.querySelector(`#autoplay-bet`).value);
    const minBet = getAutoplayMinBet();

    autoplayConfigs[id] = createAutoplayConfig({
        started: true,
        count: isAutoplayInfinityCount(round) ? 1000000 : parseInt(round),
        bet: betAmount,
        rounds: isAutoplayInfinityCount(round) ? autoplayBadgeText : round,
        decCheck: shared ? false : document.querySelector(`#autoplay-decrease-div input[type="checkbox"]`).checked,
        decVal: shared ? minBet : getAmountNumber(document.querySelector(`#autoplay-decrease`).value),
        incCheck: shared ? false : document.querySelector(`#autoplay-increase-div input[type="checkbox"]`).checked,
        incVal: shared ? minBet : getAmountNumber(document.querySelector(`#autoplay-increase`).value),
        winCheck: shared ? false : document.querySelector(`#autoplay-win-div input[type="checkbox"]`).checked,
        winVal: shared ? minBet : getAmountNumber(document.querySelector(`#autoplay-win`).value),
    });
    document.querySelector(`#auto-bet-${id}`).checked = true;

    if (shared) {
        syncAutoplayLocks();
        return;
    }

    const slotBet = document.querySelector(`#bet-value-${id}`);
    const popupBet = document.querySelector(`#autoplay-bet`).value;
    if (slotBet && popupBet !== '' && slotBet.value !== popupBet) {
        slotBet.value = popupBet;
        setInputValue(`bet-value-${id}`, '', true);
    }

    const collectToggle = document.querySelector('#autoplay-collect-toggle');
    const collectValue = document.querySelector('#autoplay-collect');
    const slotCollect = document.querySelector(`#auto-cash-out-${id}`);
    const slotCollectValue = document.querySelector(`#cash-out-value-${id}`);
    const slotLocked = hasClassSelector(`#button-${id}`, 'disabled');
    if (!slotLocked) {
        if (collectToggle && slotCollect && slotCollect.checked !== collectToggle.checked) {
            slotCollect.checked = collectToggle.checked;
            triggerEvent(slotCollect, 'change');
        }
        if (collectValue && slotCollectValue && collectValue.value !== '' && slotCollectValue.value !== collectValue.value) {
            slotCollectValue.value = collectValue.value;
            triggerEvent(slotCollectValue, 'change');
            triggerEvent(slotCollectValue, 'focusout');
        }
    }

    syncAutoplayLocks();
}

const syncAutoplayCollect = (locked = false) => {
    const toggle = document.querySelector('#autoplay-collect-toggle');
    const input = document.querySelector('#autoplay-collect');
    const wrap = input ? input.closest('.collect-input') : null;
    const row = autoplayPopup?.querySelector('.autoplay-collect-row');
    const on = !!(toggle && toggle.checked);
    const isLocked = !!locked;

    if (autoplayPopup) autoplayPopup.classList.toggle('is-autoplay-collect-locked', isLocked);
    if (row) row.classList.toggle('is-locked', isLocked);
    if (toggle) toggle.disabled = isLocked;
    if (wrap) {
        wrap.classList.toggle('collect-input--inactive', !on);
        wrap.classList.toggle('disabled', isLocked && on);
    }
    if (input) input.disabled = !on || isLocked;
};

document.querySelector('#autoplay-collect-toggle')?.addEventListener('change', () => {
    const locked = autoplayPopup?.classList.contains('is-autoplay-collect-locked');
    syncAutoplayCollect(locked);
});

autoplayButtons.forEach((button) => {
    setAutoplayButtonActive(button, button.classList.contains('btn-autoplay-active') || Boolean(button.querySelector('.autoplay-badge')), autoplayBadgeText, false);
});
syncAutoplayAdvancedRows();
setAutoplayAdvancedOpen(false);

document.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-autoplay-advanced-checkbox]');

    if (!checkbox || !autoplayPopup?.contains(checkbox)) {
        return;
    }

    syncAutoplayAdvancedRow(checkbox.closest('[data-autoplay-advanced-row]'));
});

document.addEventListener('click', (event) => {
    const autoplayButton = event.target.closest('button[data-autoplay-toggle]');
    const autoplayAdvancedButton = event.target.closest('[data-autoplay-advanced-toggle]');
    const autoplayCountButton = event.target.closest('[data-autoplay-count]');
    const autoplayStopButton = event.target.closest('[data-autoplay-stop]');
    const autoplayStartButton = event.target.closest('[data-autoplay-start]');

    if (autoplayButton) {
        event.preventDefault();
        if (visualConfig.noAutoplay || !board.autoBetOn) return;
        jetX.canvas.playSound(4, 'button');
        autoplayButtonClick(autoplayButton);
        return;
    }

    if (autoplayStopButton && autoplayPopup?.contains(autoplayStopButton)) {
        event.preventDefault();
        autoplayStopButtonClick(autoplayStopButton);
        return;
    }

    if (autoplayStartButton && autoplayPopup?.contains(autoplayStartButton)) {
        event.preventDefault();
        autoplayStartButtonClick(autoplayStartButton);
        return;
    }

    if (autoplayAdvancedButton && autoplayPopup?.contains(autoplayAdvancedButton)) {
        event.preventDefault();
        //jetX.canvas.playSound(4, 'button');
        setAutoplayAdvancedOpen(!autoplayPopup.classList.contains('is-autoplay-advanced-open'));
        return;
    }

    if (autoplayCountButton && autoplayPopup?.contains(autoplayCountButton)) {
        event.preventDefault();
        autoplayCountButtonClick(autoplayCountButton);
        return;
    }
});




let activeCollectField = null;
let collectCustomValue = '';
let collectCloseTimer = 0;
let collectOpenedAt = 0;
let collectOnboardingPending = false;
const collectOnboardingKey = 'collectOnboardingSeen';
const collectMobileModal = document.querySelector('[data-collect-modal]');
const collectPresetsSheet = collectMobileModal?.querySelector('[data-collect-presets]');
const collectCustomSheet = collectMobileModal?.querySelector('[data-collect-custom-sheet]');
const collectCustomValueElement = collectMobileModal?.querySelector('[data-collect-custom-value]');
const collectAnimationMs = 260;

function hasSeenCollectOnboarding() {
    if (!localStorageAllow) return true;
    try {
        return localStorage.getItem(collectOnboardingKey) === '1';
    } catch (e) {
        return true;
    }
}

function markCollectOnboardingSeen() {
    if (!localStorageAllow) return;
    try {
        localStorage.setItem(collectOnboardingKey, '1');
    } catch (e) {}
}

function revealCollectValue(input) {
    return;
    // if (!input) return;
    // if (typeof reducedMotionQuery !== 'undefined' && reducedMotionQuery.matches) return;
    //
    // const target = input.closest('.collect-value') || input;
    // target.classList.remove('collect-value-bump');
    // void target.offsetWidth;
    // target.classList.add('collect-value-bump');
    // target.addEventListener('animationend', () => target.classList.remove('collect-value-bump'), {once: true});
}

const setCollectCustomPanel = (isCustom) => {
    if (!collectMobileModal || !collectPresetsSheet || !collectCustomSheet) {
        return;
    }

    collectMobileModal.classList.toggle('is-custom', isCustom);
    collectPresetsSheet.hidden = isCustom;
    collectCustomSheet.hidden = !isCustom;
};

const syncCollectCustomValue = () => {
    if (collectCustomValueElement) {
        collectCustomValueElement.textContent = collectCustomValue;
    }
};

const showCollectMobileModal = (field) => {
    return false;
    // if (!collectMobileModal || !isMobileLikeViewport()) {
    //     return false;
    // }
    //
    // if (collectCloseTimer) {
    //     window.clearTimeout(collectCloseTimer);
    //     collectCloseTimer = 0;
    // }
    //
    // activeCollectField = field;
    // collectCustomValue = '';
    // collectOpenedAt = Date.now();
    // syncCollectCustomValue();
    // setCollectCustomPanel(false);
    //
    // if (typeof dismissMobileKeyboard === 'function') {
    //     dismissMobileKeyboard();
    // } else if (document.activeElement === field) {
    //     field.blur();
    // }
    //
    // collectMobileModal.hidden = false;
    // collectMobileModal.setAttribute('aria-hidden', 'false');
    // document.body.classList.add('collect-modal-open');
    //
    // window.requestAnimationFrame(() => {
    //     if (!collectMobileModal.hidden && collectMobileModal.getAttribute('aria-hidden') === 'false') {
    //         collectMobileModal.classList.add('is-open');
    //     }
    // });
    //
    // if (typeof promoPrizeIcon === 'function') promoPrizeIcon();
    // return true;
};

const hideCollectMobileModal = (instant = false) => {
    if (!collectMobileModal) {
        return;
    }

    const field = activeCollectField;
    const pending = collectOnboardingPending;
    if (pending) {
        collectOnboardingPending = false;
        markCollectOnboardingSeen();
    }

    if (collectCloseTimer) {
        window.clearTimeout(collectCloseTimer);
        collectCloseTimer = 0;
    }

    collectMobileModal.classList.remove('is-open');
    collectMobileModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('collect-modal-open');
    activeCollectField = null;

    if (typeof promoPrizeIcon === 'function') promoPrizeIcon(true, 10);

    const afterClose = () => {
        collectMobileModal.hidden = true;
        collectCloseTimer = 0;
        if (field && !instant) revealCollectValue(field);
    };

    if (collectMobileModal.hidden) {
        afterClose();
        return;
    }

    if (instant) {
        afterClose();
        return;
    }

    collectCloseTimer = window.setTimeout(afterClose, collectAnimationMs);
};

const setCollectFieldValue = (value) => {
    if (!activeCollectField || !value) {
        return;
    }

    activeCollectField.value = parseFloat(value).toFixed(2);
    setInputValue(activeCollectField.id);
    activeCollectField.dispatchEvent(new Event('change', { bubbles: true }));
    hideCollectMobileModal();
};

const appendCollectCustomKey = (key) => {
    if (!key) {
        return;
    }

    if (key === '.' && collectCustomValue.includes('.')) {
        return;
    }

    if (collectCustomValue.length >= 6) {
        return;
    }

    collectCustomValue += key;
    syncCollectCustomValue();
    jetX.canvas.playSound(4, 'betUpdate');
};

document.addEventListener('click', (event) => {
    const collectCloseButton = event.target.closest('[data-collect-close]');
    const collectBackButton = event.target.closest('[data-collect-back]');
    const collectCustomButton = event.target.closest('[data-collect-custom]');
    const collectOptionButton = event.target.closest('[data-collect-option]');
    const collectKeyButton = event.target.closest('[data-collect-key]');
    const collectBackspaceButton = event.target.closest('[data-collect-backspace]');
    const collectSetButton = event.target.closest('[data-collect-set]');
    const collectClickLocked = collectMobileModal
        && collectMobileModal.contains(event.target)
        && Date.now() - collectOpenedAt < 180;

    if (collectClickLocked) {
        event.preventDefault();
        return;
    }

    if (event.target === collectMobileModal) {
        hideCollectMobileModal();
        return;
    }

    if (collectCloseButton && collectMobileModal?.contains(collectCloseButton)) {
        event.preventDefault();
        hideCollectMobileModal();
        return;
    }

    if (collectBackButton && collectMobileModal?.contains(collectBackButton)) {
        event.preventDefault();
        collectCustomValue = '';
        syncCollectCustomValue();
        setCollectCustomPanel(false);
        return;
    }

    if (collectCustomButton && collectMobileModal?.contains(collectCustomButton)) {
        event.preventDefault();
        collectCustomValue = '';
        syncCollectCustomValue();
        setCollectCustomPanel(true);
        return;
    }

    if (collectOptionButton && collectMobileModal?.contains(collectOptionButton)) {
        event.preventDefault();
        setCollectFieldValue(collectOptionButton.dataset.collectOption);
        return;
    }

    if (collectKeyButton && collectMobileModal?.contains(collectKeyButton)) {
        event.preventDefault();
        appendCollectCustomKey(collectKeyButton.dataset.collectKey);
        return;
    }

    if (collectBackspaceButton && collectMobileModal?.contains(collectBackspaceButton)) {
        event.preventDefault();
        if (collectCustomValue.length > 0) {
            collectCustomValue = collectCustomValue.slice(0, -1);
            syncCollectCustomValue();
            jetX.canvas.playSound(4, 'betUpdate');
        }
        return;
    }

    if (collectSetButton && collectMobileModal?.contains(collectSetButton)) {
        event.preventDefault();
        setCollectFieldValue(collectCustomValue);
        return;
    }
});

document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.collect-value .bet-input-btn')) {
        return;
    }

    const amountWrap = event.target.closest('.collect-value-amount');
    if (amountWrap && !event.target.closest('.collect-field')) {
        const field = amountWrap.querySelector('.collect-field');
        if (field && !field.disabled) {
            event.preventDefault();
            field.focus({ preventScroll: true });
            try {
                const len = field.value.length;
                field.setSelectionRange(len, len);
            } catch (e) { /* ignore */ }
        }
        return;
    }

    // Mobile collect modal disabled — allow native input focus/keyboard.
    // const collectContent = event.target.closest('.collect-content');
    // const collectField = collectContent
    //     ? collectContent.querySelector('.collect-field')
    //     : event.target.closest('.collect-field');
    //
    // if (!collectField || collectField.disabled || !isMobileLikeViewport()) {
    //     return;
    // }
    //
    // event.preventDefault();
    // if (typeof dismissMobileKeyboard === 'function') {
    //     dismissMobileKeyboard();
    // }
    // showCollectMobileModal(collectField);
});

document.addEventListener('focusin', (event) => {
    // Mobile collect modal disabled — do not steal focus from collect fields.
    // if (!event.target.matches('.collect-field') || !isMobileLikeViewport()) {
    //     return;
    // }
    //
    // if (typeof dismissMobileKeyboard === 'function') {
    //     dismissMobileKeyboard();
    // } else {
    //     event.target.blur();
    // }
    // showCollectMobileModal(event.target);
});

mobileQuery.addEventListener('change', (event) => {
    if (!isMobileLikeViewport()) {
        hideCollectMobileModal(true);
    }
});

mobileLandscapeQuery.addEventListener('change', () => {
    if (!isMobileLikeViewport()) {
        hideCollectMobileModal(true);
    }
});

function updateAutoCollectProgress(currentCoeff) {
    for (let i = 0; i < 4; i++) {
        const slot = document.getElementById(`button-${i}`);
        if (!slot) continue;

        const collectFill = slot.querySelector('.collect-fill');
        const collectFill2 = slot.querySelector('.btn-bet__auto-collect-fill');
        if (!collectFill) continue;

        const isOngoing = slot.classList.contains('cash-out');
        const checkbox = document.getElementById(`auto-cash-out-${i}`);
        const autoCollectEnabled = checkbox && checkbox.checked;

        if (isOngoing && autoCollectEnabled) {
            const input = document.getElementById(`cash-out-value-${i}`);
            if (input) {
                const targetCoeff = parseFloat(input.value);
                if (!isNaN(targetCoeff) && targetCoeff > 1.0) {
                    let pct = 0;
                    if (currentCoeff >= targetCoeff) {
                        pct = 100;
                    } else if (currentCoeff > 1.0) {
                        pct = ((currentCoeff - 1) / (targetCoeff - 1)) * 100;
                        pct = Math.max(0, Math.min(100, pct));
                    }

                    if(pct === 0 || pct === 100) collectFill.style.transition = 'none';
                    collectFill.style.width = `${pct}%`;
                    if(pct === 0 || pct === 100) setTimeout(() => {collectFill.style.transition = 'width 0.2s ease';}, 100);

                    if(pct === 0 || pct === 100) collectFill2.style.transition = 'none';
                    collectFill2.style.width = `${pct}%`;
                    if(pct === 0 || pct === 100) setTimeout(() => {collectFill2.style.transition = 'width 0.2s ease';}, 100);
                } else if (collectFill.style.width !== '0%' || collectFill2.style.width !== '0%') {
                    collectFill.style.transition = 'none';
                    collectFill.style.width = '0%';
                    setTimeout(() => {collectFill.style.transition = 'width 0.2s ease';}, 100);
                    collectFill2.style.transition = 'none';
                    collectFill2.style.width = '0%';
                    setTimeout(() => {collectFill2.style.transition = 'width 0.2s ease';}, 100);
                }
            }
        } else if (collectFill.style.width !== '0%' || collectFill2.style.width !== '0%') {
            collectFill.style.transition = 'none';
            collectFill.style.width = '0%';
            setTimeout(() => {collectFill.style.transition = 'width 0.2s ease';}, 100);
            collectFill2.style.transition = 'none';
            collectFill2.style.width = '0%';
            setTimeout(() => {collectFill2.style.transition = 'width 0.2s ease';}, 100);
        }
    }
}








const autoCollectPopup = document.querySelector('#popup-auto-collect');
const AC_RISK_PRESETS = { default: 1.5, medium: 3, high: 10 };
let acSuppressOpen = false;

function isAutoCollectSlotFrozen(position) {
    const button = document.getElementById(`bet-${position}`);
    if (!button) return false;
    return button.classList.contains('cash-out')
        || button.classList.contains('disable')
        || button.classList.contains('btn-bet--loading');
}

function acSetRisk(risk) {
    if (!autoCollectPopup) return;
    autoCollectPopup.querySelectorAll('[data-ac-risk]').forEach((btn) => {
        const active = btn.dataset.acRisk === risk;
        btn.classList.toggle('ac-risk--active', active);
        btn.setAttribute('aria-pressed', String(active));
    });

    const preset = AC_RISK_PRESETS[risk];
    if (preset === undefined) return;

    for (let i = 0; i < 4; i++) {
        if (isAutoCollectSlotFrozen(i)) continue;
        const collect = document.getElementById(`ac-collect-value-${i}`);
        if (collect) collect.value = preset.toFixed(2);
    }
}

function acFitCollectAmount(i) {
    const acCollect = document.getElementById(`ac-collect-value-${i}`);
    if (acCollect && typeof fitCollectAmount === 'function') fitCollectAmount(acCollect);
}

function acSyncRow(i) {
    const row = autoCollectPopup?.querySelector(`.ac-bet[data-ac-bet-row="${i}"]`);
    const toggle = document.getElementById(`ac-bet-toggle-${i}`);
    const acCollect = document.getElementById(`ac-collect-value-${i}`);
    const collectInput = acCollect ? acCollect.closest('.collect-input') : null;
    const on = !!(toggle && toggle.checked);
    const locked = !!(row && row.classList.contains('is-locked'));
    if (row) row.classList.toggle('ac-bet--on', on);
    if (collectInput) {
        collectInput.classList.toggle('collect-input--inactive', !on);
        collectInput.classList.toggle('disabled', locked && on);
    }
    if (acCollect) acCollect.disabled = !on || locked;
}

function syncAutoCollectPopupLocks() {
    if (!autoCollectPopup) return;

    let allLocked = true;
    for (let i = 0; i < 4; i++) {
        const locked = isAutoCollectSlotFrozen(i);
        if (!locked) allLocked = false;
        const row = autoCollectPopup.querySelector(`.ac-bet[data-ac-bet-row="${i}"]`);
        const acToggle = document.getElementById(`ac-bet-toggle-${i}`);

        if (row) row.classList.toggle('is-locked', locked);
        if (acToggle) acToggle.disabled = locked;
        acSyncRow(i);
    }

    const riskTabs = autoCollectPopup.querySelector('.ac-risk-tabs');
    if (riskTabs) {
        riskTabs.classList.toggle('is-locked', allLocked);
        riskTabs.querySelectorAll('[data-ac-risk]').forEach((btn) => {
            btn.disabled = allLocked;
            btn.setAttribute('aria-disabled', String(allLocked));
        });
    }
}

function openAutoCollectPopup(options) {
    if (!autoCollectPopup || !visualConfig.autoCollect) return;
    cancelAutoCollectSettingsSpotlight();
    hideAutoCollectSpotlight();
    const preserveSelection = !!(options && options.preserveSelection);

    if (typeof dismissMobileKeyboard === 'function') {
        dismissMobileKeyboard();
    }

    for (let i = 0; i < 4; i++) {
        const slotToggle = document.getElementById(`auto-cash-out-${i}`);
        const slotCollect = document.getElementById(`cash-out-value-${i}`);
        const acToggle = document.getElementById(`ac-bet-toggle-${i}`);
        const acCollect = document.getElementById(`ac-collect-value-${i}`);
        const locked = isAutoCollectSlotFrozen(i);
        const keepSettings = locked
            || preserveSelection
            || hasClassSelector(`#bet-${i}`, 'cancel-bet');

        if (acToggle) {
            acToggle.checked = keepSettings
                ? !!(slotToggle && slotToggle.checked)
                : false;
        }
        if (acCollect && slotCollect && slotCollect.value !== '') acCollect.value = slotCollect.value;
        if (acCollect) setInputValue(`ac-collect-value-${i}`);
        acSyncRow(i);
    }

    syncAutoCollectPopupLocks();
    acSetRisk('custom');
    openPopup('auto-collect');
    requestAnimationFrame(() => {
        for (let i = 0; i < 4; i++) acFitCollectAmount(i);
    });
}

function trackAutocollectSet(i) {
    mixpanelFirstUsage('firstAutocollectTime');
    mixpanelCheckbox(i, `auto-cash-out-${i}`);
}

function acApplyStart() {
    acSuppressOpen = true;
    for (let i = 0; i < 4; i++) {
        if (isAutoCollectSlotFrozen(i)) continue;

        const acToggle = document.getElementById(`ac-bet-toggle-${i}`);
        const enabled = !!(acToggle && acToggle.checked);
        const slotToggle = document.getElementById(`auto-cash-out-${i}`);
        const slotCollect = document.getElementById(`cash-out-value-${i}`);
        const acCollect = document.getElementById(`ac-collect-value-${i}`);
        const wasEnabled = !!(slotToggle && slotToggle.checked);

        if (enabled) {
            if (slotCollect && acCollect && acCollect.value !== '') {
                slotCollect.value = acCollect.value;
                triggerEvent(slotCollect, 'change');
                triggerEvent(slotCollect, 'focusout');
            }
        }

        if (slotToggle && slotToggle.checked !== enabled) {
            slotToggle.checked = enabled;
            triggerEvent(slotToggle, 'change');
        }

        if (enabled || wasEnabled) trackAutocollectSet(i);
    }

    for (let i = 0; i < 4; i++) {
        if (!isAutoCollectSlotFrozen(i)) setLastBet(i);
    }

    checkboxCheck();
    closePopups();
    acSuppressOpen = false;
    syncSharedAutoCollectToggle();
    queueAutoCollectSettingsSpotlight();
}

function acUpdateCollectBadge(i) {
    const button = document.getElementById(`bet-${i}`);
    const labels = button
        ? button.querySelectorAll('.btn-bet__auto-collect')
        : document.querySelectorAll(`#auto-collect-label-${i}`);
    if (!labels.length) return;
    const toggle = document.getElementById(`auto-cash-out-${i}`);
    const input = document.getElementById(`cash-out-value-${i}`);
    const value = input ? parseFloat(input.value) : NaN;
    const on = !!(toggle && toggle.checked) && !isNaN(value);
    const text = on ? `${GetCaption('jetxnew.collect.at')}: ${value.toFixed(2)}x` : '';
    labels.forEach((label) => {
        label.hidden = !on;
        if (on) label.textContent = text;
    });
    if (button) button.classList.toggle('has-auto-collect', on);
    syncSharedAutoCollectToggle();
}

function syncSharedAutoCollectToggle() {
    const shared = document.querySelector('[data-shared-auto-collect]');
    const head = document.querySelector('[data-bet-shared-header]');
    if (!shared) return;
    let anyOn = false;
    for (let i = 0; i < 4; i++) {
        const toggle = document.getElementById(`auto-cash-out-${i}`);
        if (toggle && toggle.checked) {
            anyOn = true;
            break;
        }
    }
    shared.checked = anyOn;
    if (head) head.classList.toggle('is-ac-active', anyOn);
    syncSharedAutoCollectLock();
}

function syncSharedAutoCollectLock() {
    const head = document.querySelector('[data-bet-shared-header]');
    if (!head) return;

    let locked = false;
    for (let i = 0; i < 4; i++) {
        if (isAutoCollectSlotFrozen(i)) {
            locked = true;
            break;
        }
    }

    head.classList.toggle('is-ac-locked', locked);
    const shared = head.querySelector('[data-shared-auto-collect]');
    if (shared) shared.disabled = locked;
    
    syncAutoCollectPopupLocks();
}

function syncSharedAutoplayButton() {
    const shared = document.querySelector('[data-shared-autoplay]');
    if (!shared) return;

    let source = null;
    for (let i = 0; i < 4; i++) {
        const button = document.getElementById(`auto-bet-button-${i}`);
        if (button && (button.classList.contains('btn-autoplay-active') || button.querySelector('.autoplay-badge'))) {
            source = button;
            break;
        }
    }

    const active = Boolean(source);
    shared.setAttribute('aria-pressed', String(active));
    shared.setAttribute('aria-label', active ? 'Autoplay active' : 'Autoplay');
    shared.classList.toggle('btn-autoplay-active', active);
    if (active) {
        shared.innerHTML = source.innerHTML;
    } else {
        renderAutoplayButton(shared, false);
    }
}

if (autoCollectPopup) {
    for (let i = 0; i < 4; i++) {
        const slotToggle = document.getElementById(`auto-cash-out-${i}`);
        if (!slotToggle) continue;
        slotToggle.addEventListener('change', (event) => {
            if (acSuppressOpen || !event.isTrusted) return;
            if (event.target.checked && app && app.classList.contains('mode-4')) {
                event.target.checked = false;
                checkboxCheck();
                openAutoCollectPopup();
                event._acOpenPopupOnly = true;
            }
            syncSharedAutoCollectToggle();
        });
    }

    document.querySelector('[data-ac-settings]')?.addEventListener('click', () => {
        if (!app || !app.classList.contains('mode-4')) return;
        openAutoCollectPopup({ preserveSelection: true });
    });

    const sharedAutoCollect = document.querySelector('[data-shared-auto-collect]');
    sharedAutoCollect?.addEventListener('change', (event) => {
        if (acSuppressOpen || !event.isTrusted) return;
        if (!app || !app.classList.contains('mode-4')) {
            syncSharedAutoCollectToggle();
            return;
        }

        if (event.target.checked) {
            event.target.checked = false;
            openAutoCollectPopup();
            syncSharedAutoCollectToggle();
            return;
        }

        acSuppressOpen = true;
        for (let i = 0; i < 4; i++) {
            const slotToggle = document.getElementById(`auto-cash-out-${i}`);
            if (slotToggle && slotToggle.checked) {
                slotToggle.checked = false;
                triggerEvent(slotToggle, 'change');
                trackAutocollectSet(i);
            }
        }
        acSuppressOpen = false;
        checkboxCheck();
        for (let i = 0; i < 4; i++) acUpdateCollectBadge(i);
        syncSharedAutoCollectToggle();
    });

    autoCollectPopup.addEventListener('click', (event) => {
        const inactiveCollect = event.target.closest('.ac-collect-input.collect-input--inactive');
        if (inactiveCollect) {
            const row = inactiveCollect.closest('.ac-bet');
            const toggle = row && !row.classList.contains('is-locked')
                ? row.querySelector('[data-ac-bet]')
                : null;
            if (toggle && !toggle.disabled && !toggle.checked) {
                toggle.checked = true;
                toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const risk = event.target.closest('[data-ac-risk]');
        if (risk) {
            if (risk.disabled || risk.closest('.ac-risk-tabs.is-locked')) return;
            acSetRisk(risk.dataset.acRisk);
            return;
        }

        if (event.target.closest('[data-ac-start]')) { acApplyStart(); }
    });

    autoCollectPopup.addEventListener('change', (event) => {
        const toggle = event.target.closest('[data-ac-bet]');
        if (!toggle) return;
        const i = parseInt(toggle.dataset.acBet, 10);
        acSyncRow(i);
        if (toggle.checked) requestAnimationFrame(() => acFitCollectAmount(i));
    });

    autoCollectPopup.querySelectorAll('.collect-field').forEach((input) => {
        input.addEventListener('input', () => acSetRisk('custom'));
    });
}

document.querySelector('[data-shared-autoplay]')?.addEventListener('click', () => {
    if (!app || !app.classList.contains('mode-4')) return;
    if (visualConfig.noAutoplay || !board.autoBetOn) return;
    const firstAutoplay = document.getElementById('auto-bet-button-0');
    if (firstAutoplay) autoplayButtonClick(firstAutoplay);
});

document.addEventListener('jetx:bet-mode-change', () => {
    if (isSharedAutoplayMode()) {
        stopAllAutoplay();
        if (autoplayPopup && !autoplayPopup.hidden) {
            closePopups();
        }
    }
    setAutoplaySharedPopup(false);
});

const acSpotlightRoot = document.querySelector('[data-ac-spotlight]');
const acSpotlightHighlight = acSpotlightRoot?.querySelector('[data-ac-spotlight-highlight]');
const acSpotlightTip = acSpotlightRoot?.querySelector('[data-ac-spotlight-tip]');
const acSpotlightText = acSpotlightRoot?.querySelector('[data-ac-spotlight-text]');
const acSpotlightKey = 'autoCollectSpotlightSeen';
const acSpotlightSettingsKey = 'autoCollectSettingsSpotlightSeen';
const AC_SPOTLIGHT_CAPTION_KEY = 'jetxnew.auto.collect.spotlight';
const AC_SETTINGS_SPOTLIGHT_CAPTION_KEY = 'jetxnew.auto.collect.settings.spotlight';
const AC_MENU_SPOTLIGHT_CAPTION_KEY = 'jetxnew.fourbet.menu.spotlight';
const AC_SETTINGS_SPOTLIGHT_DELAY_MS = typeof popupAnimationMs === 'number' ? popupAnimationMs : 280;
const AC_HINT_SHAPE_PATH = 'M40.2861 50.999C39.8858 51.5086 39.1142 51.5086 38.7139 50.999L36.4023 48.0572C34.8856 46.127 32.5667 45 30.1119 45H23C10.8497 45 1 35.1503 1 23C1 10.8497 10.8497 1 23 1H222C234.15 1 244 10.8497 244 23C244 35.1503 234.15 45 222 45H48.8881C46.4333 45 44.1144 46.127 42.5977 48.0572L40.2861 50.999Z';
const AC_MENU_HINT_SHAPE_PATH = 'M50.2861 50.999C49.8858 51.5086 49.1142 51.5086 48.7139 50.999L46.4023 48.0572C44.8856 46.127 42.5667 45 40.1119 45H23C10.8497 45 1 35.1503 1 23C1 10.8497 10.8497 1 23 1H222C234.15 1 244 10.8497 244 23C244 35.1503 234.15 45 222 45H58.8881C56.4333 45 54.1144 46.127 52.5977 48.0572L50.2861 50.999Z';
const AC_MENU_HINT_SHAPE_PATH_FLIP = 'M30.2861 50.999C29.8858 51.5086 29.1142 51.5086 28.7139 50.999L26.4023 48.0572C24.8856 46.127 22.5667 45 20.1119 45H23C10.8497 45 1 35.1503 1 23C1 10.8497 10.8497 1 23 1H222C234.15 1 244 10.8497 244 23C244 35.1503 234.15 45 222 45H38.8881C36.4333 45 34.1144 46.127 32.5977 48.0572L30.2861 50.999Z';
let acSpotlightTarget = null;
let acSpotlightKind = 'collect';
let acSpotlightHideToken = 0;
let acSpotlightObserver = null;
let acSettingsSpotlightTimer = 0;

function getAutoCollectSpotlightKind(target) {
    if (target?.closest?.('[data-menu-toggle]')) return 'menu';
    return target?.closest?.('[data-ac-settings]') ? 'settings' : 'collect';
}

function getAutoCollectSpotlightStorageKey(kind = acSpotlightKind) {
    if (kind === 'menu') return null;
    return kind === 'settings' ? acSpotlightSettingsKey : acSpotlightKey;
}

function hasSeenAutoCollectSpotlight(kind = acSpotlightKind) {
    if (kind === 'menu') return false;
    if (!localStorageAllow) return true;
    try {
        return localStorage.getItem(getAutoCollectSpotlightStorageKey(kind)) === '1';
    } catch (e) {
        return true;
    }
}

function markAutoCollectSpotlightSeen(kind = acSpotlightKind) {
    const storageKey = getAutoCollectSpotlightStorageKey(kind);
    if (!storageKey || !localStorageAllow) return;
    try {
        localStorage.setItem(storageKey, '1');
    } catch (e) {}
}

function cancelAutoCollectSettingsSpotlight() {
    if (!acSettingsSpotlightTimer) return;
    clearTimeout(acSettingsSpotlightTimer);
    acSettingsSpotlightTimer = 0;
}

function queueAutoCollectSettingsSpotlight() {
    cancelAutoCollectSettingsSpotlight();
    if (!app || !app.classList.contains('mode-4')) return;
    if (hasSeenAutoCollectSpotlight('settings')) return;

    const settingsBtn = document.querySelector('[data-ac-settings]');
    const head = document.querySelector('[data-bet-shared-header]');
    if (!settingsBtn || !head || !head.classList.contains('is-ac-active')) return;

    acSettingsSpotlightTimer = window.setTimeout(() => {
        acSettingsSpotlightTimer = 0;
        if (!app || !app.classList.contains('mode-4')) return;
        if (!head.classList.contains('is-ac-active')) return;
        showAutoCollectSpotlight(settingsBtn);
    }, AC_SETTINGS_SPOTLIGHT_DELAY_MS);
}

function syncAutoCollectSpotlightCaption() {
    if (!acSpotlightText) return;
    const key = acSpotlightKind === 'settings'
        ? AC_SETTINGS_SPOTLIGHT_CAPTION_KEY
        : acSpotlightKind === 'menu'
            ? AC_MENU_SPOTLIGHT_CAPTION_KEY
            : AC_SPOTLIGHT_CAPTION_KEY;
    const dataAttr = acSpotlightKind === 'settings'
        ? 'data-caption-settings'
        : acSpotlightKind === 'menu'
            ? 'data-caption-menu'
            : 'data-caption-collect';
    const fromLocale = typeof GetCaption === 'function' ? GetCaption(key) : '';
    const fromDom = acSpotlightText.getAttribute(dataAttr) || '';
    const caption = (fromLocale && fromLocale !== key) ? fromLocale : (fromDom || fromLocale || key);
    acSpotlightText.textContent = caption;
}

function shouldFlipAutoCollectHint(el) {
    if (el?.closest?.('[data-ac-settings]') || el?.closest?.('[data-menu-toggle]')) {
        const rect = el.getBoundingClientRect();
        return rect.left + rect.width / 2 > window.innerWidth / 2;
    }
    return !!(app
        && !app.classList.contains('mode-1')
        && !app.classList.contains('mode-classic')
        && !app.classList.contains('mode-4')
        && el?.closest('[data-bet-panel="1"]'));
}

function layoutAutoCollectSpotlightHint() {
    if (!acSpotlightRoot || !acSpotlightHighlight || !acSpotlightTip || acSpotlightTip.hidden) return;

    acSpotlightTip.style.left = '';
    acSpotlightTip.style.right = '';
    acSpotlightTip.style.maxWidth = '';

    const margin = 8;
    const viewport = window.visualViewport;
    const viewLeft = viewport ? viewport.offsetLeft : 0;
    const viewWidth = viewport ? viewport.width : document.documentElement.clientWidth;
    const viewRight = viewLeft + viewWidth;

    if (acSpotlightKind === 'menu') {
        acSpotlightTip.style.maxWidth = `${Math.max(0, viewWidth - margin * 2)}px`;
    }

    const hintWidth = acSpotlightTip.offsetWidth;
    if (!hintWidth) return;
    const highlightRect = acSpotlightHighlight.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(acSpotlightRoot).getPropertyValue('--ac-spot-pad')) || 4;
    const flip = acSpotlightHighlight.classList.contains('is-tail-end');

    let left = flip
        ? highlightRect.width - pad - hintWidth
        : pad;

    if (acSpotlightKind === 'settings') left -= 20;

    const maxLeft = viewRight - margin - hintWidth - highlightRect.left;
    if (left > maxLeft) left = maxLeft;

    const minLeft = viewLeft + margin - highlightRect.left;
    if (hintWidth + margin * 2 <= viewWidth && left < minLeft) left = minLeft;

    acSpotlightTip.style.left = `${left}px`;
    acSpotlightTip.style.right = 'auto';
}

function syncAcHintShapePath() {
    const path = acSpotlightHighlight?.querySelector('.mode-switch-warning__shape path');
    if (!path) return;

    let d = AC_HINT_SHAPE_PATH;
    if (acSpotlightKind === 'menu') {
        d = acSpotlightHighlight.classList.contains('is-tail-end')
            ? AC_MENU_HINT_SHAPE_PATH_FLIP
            : AC_MENU_HINT_SHAPE_PATH;
    }
    path.setAttribute('d', d);
}

function layoutAutoCollectSpotlight() {
    if (!acSpotlightRoot || !acSpotlightTarget || acSpotlightRoot.hidden) return;

    const rect = acSpotlightTarget.getBoundingClientRect();
    acSpotlightRoot.style.setProperty('--ac-spot-top', `${rect.top}px`);
    acSpotlightRoot.style.setProperty('--ac-spot-left', `${rect.left}px`);
    acSpotlightRoot.style.setProperty('--ac-spot-width', `${rect.width}px`);
    acSpotlightRoot.style.setProperty('--ac-spot-height', `${rect.height}px`);
    acSpotlightHighlight?.classList.toggle('is-tail-end', shouldFlipAutoCollectHint(acSpotlightTarget));
    syncAcHintShapePath();
    layoutAutoCollectSpotlightHint();
}

function isBetPanelScrollEvent(event) {
    const target = event.target;
    if (target === document || target === document.documentElement || target === document.body) {
        return true;
    }
    if (!(target instanceof Element)) return false;
    if (target.classList.contains('page')) return true;
    return !!(target.closest('.bet-panel') || target.closest('.bet-dock'));
}

function onAutoCollectSpotlightScroll(event) {
    if (!isAutoCollectSpotlightVisible()) return;
    if (!isBetPanelScrollEvent(event)) return;
    dismissAutoCollectSpotlight();
}

function unbindAutoCollectSpotlightLayout() {
    window.removeEventListener('resize', layoutAutoCollectSpotlight);
    window.removeEventListener('scroll', onAutoCollectSpotlightScroll, true);
    window.visualViewport?.removeEventListener('resize', layoutAutoCollectSpotlight);
    window.visualViewport?.removeEventListener('scroll', layoutAutoCollectSpotlight);
    if (acSpotlightObserver) {
        acSpotlightObserver.disconnect();
        acSpotlightObserver = null;
    }
}

function bindAutoCollectSpotlightLayout() {
    unbindAutoCollectSpotlightLayout();
    window.addEventListener('resize', layoutAutoCollectSpotlight);
    window.addEventListener('scroll', onAutoCollectSpotlightScroll, true);
    window.visualViewport?.addEventListener('resize', layoutAutoCollectSpotlight);
    window.visualViewport?.addEventListener('scroll', layoutAutoCollectSpotlight);
    if (typeof ResizeObserver === 'function' && acSpotlightTarget) {
        acSpotlightObserver = new ResizeObserver(layoutAutoCollectSpotlight);
        acSpotlightObserver.observe(acSpotlightTarget);
    }
}

function clearAutoCollectSpotlightTarget() {
    if (acSpotlightTarget) {
        acSpotlightTarget.classList.remove('is-ac-spotlight-target');
        acSpotlightTarget = null;
    }
    acSpotlightKind = 'collect';
    acSpotlightRoot?.classList.remove('is-ac-settings-spot', 'is-ac-menu-spot');
    acSpotlightHighlight?.classList.remove('is-tail-end');
    syncAcHintShapePath();
    if (acSpotlightTip) {
        acSpotlightTip.style.left = '';
        acSpotlightTip.style.right = '';
        acSpotlightTip.style.maxWidth = '';
    }
}

function hideAutoCollectSpotlight() {
    unbindAutoCollectSpotlightDismiss();

    if (!acSpotlightRoot || acSpotlightRoot.hidden) {
        clearAutoCollectSpotlightTarget();
        return;
    }

    const hideToken = ++acSpotlightHideToken;
    acSpotlightTip?.classList.add('mode-switch-warning--leaving');
    acSpotlightRoot.classList.remove('is-visible');
    unbindAutoCollectSpotlightLayout();

    const finishHide = () => {
        if (hideToken !== acSpotlightHideToken) return;
        acSpotlightRoot.hidden = true;
        acSpotlightRoot.classList.remove('is-visible');
        if (acSpotlightTip) {
            acSpotlightTip.hidden = true;
            acSpotlightTip.classList.remove('mode-switch-warning--leaving', 'is-visible');
        }
        clearAutoCollectSpotlightTarget();
        document.removeEventListener('keydown', onAutoCollectSpotlightKey);
    };

    acSpotlightRoot.addEventListener('transitionend', finishHide, { once: true });
    setTimeout(finishHide, 280);
}

function onAutoCollectSpotlightKey(event) {
    if (event.key === 'Escape') {
        markAutoCollectSpotlightSeen();
        hideAutoCollectSpotlight();
    }
}

function showAutoCollectSpotlight(target, kindOverride) {
    if (!acSpotlightRoot || !target) return;
    const kind = kindOverride || getAutoCollectSpotlightKind(target);
    if (kind !== 'menu' && hasSeenAutoCollectSpotlight(kind)) return;

    acSpotlightHideToken += 1;
    if (acSpotlightTarget && acSpotlightTarget !== target) {
        acSpotlightTarget.classList.remove('is-ac-spotlight-target');
    }

    acSpotlightKind = kind;
    acSpotlightTarget = target;
    acSpotlightTarget.classList.add('is-ac-spotlight-target');
    acSpotlightRoot.classList.toggle('is-ac-settings-spot', kind === 'settings');
    acSpotlightRoot.classList.toggle('is-ac-menu-spot', kind === 'menu');
    syncAutoCollectSpotlightCaption();

    acSpotlightRoot.hidden = false;
    if (acSpotlightTip) {
        acSpotlightTip.hidden = false;
        acSpotlightTip.classList.remove('mode-switch-warning--leaving');
        acSpotlightTip.classList.add('is-visible');
    }

    layoutAutoCollectSpotlight();
    bindAutoCollectSpotlightLayout();
    bindAutoCollectSpotlightDismiss();
    document.addEventListener('keydown', onAutoCollectSpotlightKey);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            layoutAutoCollectSpotlight();
            acSpotlightRoot.classList.add('is-visible');
        });
    });
}

function isAutoCollectSpotlightVisible() {
    return !!(acSpotlightRoot && !acSpotlightRoot.hidden);
}

function showFourBetMenuSpotlight() {
    const menuBtn = document.querySelector('[data-menu-toggle]');
    if (!menuBtn) return;
    showAutoCollectSpotlight(menuBtn, 'menu');
}

function dismissAutoCollectSpotlight() {
    markAutoCollectSpotlightSeen();
    hideAutoCollectSpotlight();
}

function isPointOverAutoCollectTarget(clientX, clientY) {
    if (!acSpotlightTarget) return false;
    const rect = acSpotlightTarget.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right
        && clientY >= rect.top && clientY <= rect.bottom;
}

function elementUnderAutoCollectSpotlight(clientX, clientY) {
    if (!acSpotlightRoot) return null;
    const prev = acSpotlightRoot.style.pointerEvents;
    acSpotlightRoot.style.pointerEvents = 'none';
    const under = document.elementFromPoint(clientX, clientY);
    acSpotlightRoot.style.pointerEvents = prev;
    return under;
}

function activateAutoCollectControlAtPoint(clientX, clientY) {
    const under = elementUnderAutoCollectSpotlight(clientX, clientY);
    if (!under) return;

    const settingsBtn = under.closest('[data-ac-settings]');
    if (settingsBtn) {
        settingsBtn.click();
        return;
    }

    const stepBtn = under.closest('.collect-value .plus, .collect-value .minus');
    if (stepBtn && !stepBtn.classList.contains('disabled') && !stepBtn.disabled) {
        stepBtn.click();
        return;
    }

    const field = under.closest('.collect-field')
        || under.closest('.collect-value-amount')?.querySelector('.collect-field');
    if (field && !field.disabled) {
        field.focus({ preventScroll: true });
    }
}

function onAutoCollectSpotlightInteract(event) {
    if (!isAutoCollectSpotlightVisible()) return;
    if (event.target.closest('[data-ac-spotlight-close]')) {
        dismissAutoCollectSpotlight();
        return;
    }
    if (acSpotlightTarget && acSpotlightTarget.contains(event.target)) {
        dismissAutoCollectSpotlight();
        return;
    }
    if (event.target.closest('[data-ac-spotlight-dismiss]')) {
        if (isPointOverAutoCollectTarget(event.clientX, event.clientY)) {
            activateAutoCollectControlAtPoint(event.clientX, event.clientY);
        }
        dismissAutoCollectSpotlight();
    }
}

function bindAutoCollectSpotlightDismiss() {
    unbindAutoCollectSpotlightDismiss();
    document.addEventListener('click', onAutoCollectSpotlightInteract, true);
}

function unbindAutoCollectSpotlightDismiss() {
    document.removeEventListener('click', onAutoCollectSpotlightInteract, true);
}

document.addEventListener('jetx:bet-mode-change', () => {
    cancelAutoCollectSettingsSpotlight();
    hideAutoCollectSpotlight();
});

for (let i = 0; i < 4; i++) {
    document.getElementById(`auto-cash-out-${i}`)?.addEventListener('change', (event) => {
        if (!event._acOpenPopupOnly && !acSuppressOpen) {
            trackAutocollectSet(i);
        }
        if (event.isTrusted) setLastBet(i);
        acUpdateCollectBadge(i);
        const field = document.getElementById(`cash-out-value-${i}`);
        if (event.target.checked && field && typeof fitCollectAmount === 'function') {
            requestAnimationFrame(() => fitCollectAmount(field));
        }
        const collectInput = document.querySelector(`#button-${i} .bet-tools > .collect-input`);
        if (event.target.checked && event.isTrusted && !(app && app.classList.contains('mode-4'))) {
            showAutoCollectSpotlight(collectInput);
        } else if (collectInput && collectInput === acSpotlightTarget) {
            hideAutoCollectSpotlight();
        }
        // Mobile collect modal disabled.
        // if (!event.isTrusted || !event.target.checked) return;
        // if (hasSeenCollectOnboarding()) return;
        // if (!isMobileLikeViewport()) return;
        // if (app && app.classList.contains('mode-4')) return;
        // if (!field) return;
        // collectOnboardingPending = true;
        // if (!showCollectMobileModal(field)) {
        //     collectOnboardingPending = false;
        // }
    });
    document.getElementById(`bet-value-${i}`)?.addEventListener('change', (event) => {
        if (event.isTrusted) setLastBet(i);
    });
    document.getElementById(`cash-out-value-${i}`)?.addEventListener('change', (event) => {
        if (event.isTrusted) setLastBet(i);
        acUpdateCollectBadge(i);
    });
    document.getElementById(`cash-out-value-${i}`)?.addEventListener('input', (event) => {
        if (!event.isTrusted || typeof fitCollectAmount !== 'function') return;
        fitCollectAmount(event.target);
    });
    acUpdateCollectBadge(i);
}
syncSharedAutoplayButton();
restoreAutoCollectState();
if (window.jetxNewLoaderStorage) {
    window.jetxNewLoaderStorage.whenReady(function (hydrated) {
        if (!hydrated) return;
        getPrevBets();
        restoreAutoCollectState();
        restoreLastBetInputs();
    });
    window.jetxNewLoaderStorage.whenHydrated(function () {
        getPrevBets();
        restoreAutoCollectState();
        restoreLastBetInputs();
    });
}