// Gifts START

let giftLoaded = false;
let giftTabClick = true;
let currentGiftPopupType = null;
let giftTimerInterval = null;

const GIFTS_USE_WARNING_MS = 2000;
const giftsUseWarning = document.querySelector('[data-gifts-use-warning]');
const giftsUseWarningText = giftsUseWarning?.querySelector('[data-gifts-use-warning-text]');
let giftsUseWarningTimer = null;
let giftsUseWarningHideToken = 0;

const giftDockCloseWarning = document.querySelector('[data-gift-dock-close-warning]');
const giftDockCloseWarningText = giftDockCloseWarning?.querySelector('[data-gift-dock-close-warning-text]');
let giftDockCloseWarningTimer = null;
let giftDockCloseWarningHideToken = 0;

function isAnyCashBetBlockingGiftsUse() {
    for (let i = 0; i < 4; i++) {
        if (typeof hasActiveBetOnPanel === 'function') {
            if (hasActiveBetOnPanel(i)) return true;
        } else {
            if (player?.prevBets?.[i]) return true;
            const btn = document.getElementById(`bet-${i}`);
            if (btn && (
                btn.classList.contains('cancel-bet')
                || btn.classList.contains('cash-out')
                || btn.classList.contains('disable')
                || btn.classList.contains('btn-bet--loading')
            )) {
                return true;
            }
        }

        const active = player?.bets?.[i]?.ActiveButton;
        if (active === 'cancel-bet' || active === 'cashout' || active === 'disable') {
            return true;
        }
    }
    return false;
}

function isGiftsUseLockedByAutoplay() {
    return (typeof isAnyAutoplayActive === 'function' && isAnyAutoplayActive())
        || isAnyCashBetBlockingGiftsUse();
}

function dismissGiftsUseWarning() {
    if (giftsUseWarningTimer) {
        clearTimeout(giftsUseWarningTimer);
        giftsUseWarningTimer = null;
    }
    if (!giftsUseWarning || giftsUseWarning.hidden) return;

    const hideToken = ++giftsUseWarningHideToken;
    giftsUseWarning.classList.add('mode-switch-warning--leaving');
    const finishHide = () => {
        if (hideToken !== giftsUseWarningHideToken) return;
        giftsUseWarning.hidden = true;
        giftsUseWarning.classList.remove('mode-switch-warning--leaving', 'is-visible');
    };
    giftsUseWarning.addEventListener('animationend', finishHide, { once: true });
    setTimeout(finishHide, 320);
}

function showGiftsUseAutoplayWarning() {
    if (!giftsUseWarning || !giftsUseWarningText) return;

    if (giftsUseWarningTimer) {
        clearTimeout(giftsUseWarningTimer);
        giftsUseWarningTimer = null;
    }
    giftsUseWarningHideToken += 1;

    giftsUseWarningText.textContent = GetCaption('jetxnew.freespin.use.autoplay.locked');
    giftsUseWarning.hidden = false;
    giftsUseWarning.classList.remove('mode-switch-warning--leaving');
    giftsUseWarning.classList.add('is-visible');

    giftsUseWarningTimer = setTimeout(() => {
        giftsUseWarningTimer = null;
        dismissGiftsUseWarning();
    }, GIFTS_USE_WARNING_MS);
}

function setGiftDockCloseWarningOverflow(active) {
    document.querySelector('.bet-dock')?.classList.toggle('has-gift-close-warning', active);
    document.querySelector('.bet-dock-wrap')?.classList.toggle('has-gift-close-warning', active);
}

function dismissGiftDockCloseWarning() {
    if (giftDockCloseWarningTimer) {
        clearTimeout(giftDockCloseWarningTimer);
        giftDockCloseWarningTimer = null;
    }
    if (!giftDockCloseWarning || giftDockCloseWarning.hidden) {
        setGiftDockCloseWarningOverflow(false);
        return;
    }

    const hideToken = ++giftDockCloseWarningHideToken;
    giftDockCloseWarning.classList.add('mode-switch-warning--leaving');
    const finishHide = () => {
        if (hideToken !== giftDockCloseWarningHideToken) return;
        giftDockCloseWarning.hidden = true;
        giftDockCloseWarning.classList.remove('mode-switch-warning--leaving', 'is-visible');
        setGiftDockCloseWarningOverflow(false);
    };
    giftDockCloseWarning.addEventListener('animationend', finishHide, { once: true });
    setTimeout(finishHide, 320);
}

function showGiftDockCloseLockedWarning() {
    if (!giftDockCloseWarning || !giftDockCloseWarningText) return;

    if (giftDockCloseWarningTimer) {
        clearTimeout(giftDockCloseWarningTimer);
        giftDockCloseWarningTimer = null;
    }
    giftDockCloseWarningHideToken += 1;

    giftDockCloseWarningText.textContent = GetCaption('jetxnew.menu.bet.mode.locked.gift');
    setGiftDockCloseWarningOverflow(true);
    giftDockCloseWarning.hidden = false;
    giftDockCloseWarning.classList.remove('mode-switch-warning--leaving');
    giftDockCloseWarning.classList.add('is-visible');

    giftDockCloseWarningTimer = setTimeout(() => {
        giftDockCloseWarningTimer = null;
        dismissGiftDockCloseWarning();
    }, GIFTS_USE_WARNING_MS);
}

function syncGiftsUseButtonLock() {
    const useNowBtn = document.querySelector('[data-gifts-use-now]');
    if (!useNowBtn) return;

    const locked = isGiftsUseLockedByAutoplay();
    useNowBtn.classList.toggle('is-autoplay-locked', locked);
    useNowBtn.setAttribute('aria-disabled', String(locked));

    if (!locked) {
        dismissGiftsUseWarning();
    }
}

function stopGiftSpinExpirationTimer() {
    if (giftTimerInterval) {
        clearInterval(giftTimerInterval);
        giftTimerInterval = null;
    }
}

function parseServerDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        const numericDate = new Date(value);
        return isNaN(numericDate.getTime()) ? null : numericDate;
    }
    if (typeof value === 'string') {
        const aspNetMatch = value.match(/\/Date\((\d+)\)\//);
        if (aspNetMatch && aspNetMatch[1]) {
            const aspDate = new Date(parseInt(aspNetMatch[1], 10));
            return isNaN(aspDate.getTime()) ? null : aspDate;
        }
        const isoDate = new Date(value);
        return isNaN(isoDate.getTime()) ? null : isoDate;
    }
    return null;
}

function buildTimeLeftFromExpDate(expDate) {
    const parsedExpDate = parseServerDate(expDate);
    if (!parsedExpDate) return null;
    const totalSeconds = Math.max(0, Math.floor((parsedExpDate.getTime() - Date.now()) / 1000));
    return {
        Days: Math.floor(totalSeconds / (24 * 3600)),
        Hours: Math.floor((totalSeconds % (24 * 3600)) / 3600),
        Minutes: Math.floor((totalSeconds % 3600) / 60),
        Seconds: totalSeconds % 60
    };
}

function getCurrentTimeFormat(timeLeftObj, callback) {
    let totalSeconds =
        (parseInt(timeLeftObj.Days, 10) || 0) * 24 * 60 * 60 +
        (parseInt(timeLeftObj.Hours, 10) || 0) * 60 * 60 +
        (parseInt(timeLeftObj.Minutes, 10) || 0) * 60 +
        (parseInt(timeLeftObj.Seconds, 10) || 0);

    function formatTime(secs) {
        const days = Math.floor(secs / (24 * 3600));
        const hours = Math.floor((secs % (24 * 3600)) / 3600);
        const minutes = Math.floor((secs % 3600) / 60);
        const seconds = secs % 60;
        const expEl = document.querySelector('.freespins-popup-exp');

        if (days < 1) {
            if (expEl) expEl.classList.remove('with-days');
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (expEl) expEl.classList.add('with-days');
        const daysString = days < 10 ? `0${days}` : `${days}`;
        return `${daysString} ${GetCaption('jetxnew.freespin.days')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    stopGiftSpinExpirationTimer();

    function tick() {
        if (totalSeconds <= 0) {
            stopGiftSpinExpirationTimer();
            if (callback) callback('0', true);
            return;
        }
        if (callback) callback(formatTime(totalSeconds), false);
        totalSeconds--;
    }

    tick();
    giftTimerInterval = setInterval(tick, 1000);

    return {
        stop: stopGiftSpinExpirationTimer
    };
}

function renderGiftSpinExpiration() {
    const timeLeft = buildTimeLeftFromExpDate(player.gift.expDate) || player.gift.timeLeft;
    const expEl = document.querySelector('.freespins-popup-exp');
    const timerEl = document.querySelector('.gift-spin-exp');
    const hasTimeLeft = timeLeft && typeof timeLeft === 'object';

    if (!hasTimeLeft) {
        stopGiftSpinExpirationTimer();
        if (expEl) expEl.classList.add('is-hidden');
        if (timerEl) timerEl.innerHTML = '';
        return;
    }

    if (expEl) expEl.classList.remove('is-hidden');
    getCurrentTimeFormat(timeLeft, function (timeString) {
        if (timerEl) timerEl.innerHTML = timeString;
    });
}

function showGiftPopup(type) {
    currentGiftPopupType = type;

    if (type === 'new') {
        const count = player.gift.count;
        const amountText = formatAmount(player.gift.amount, player.currency, 'formated');
        const isContinue = player.gift.count !== player.gift.startAmount;

        const titleEl = document.querySelector('#popup-gifts-title');
        const descEl = document.querySelector('#popup-gifts .gifts-popup__description');
        const useNowBtn = document.querySelector('[data-gifts-use-now]');
        const laterBtn = document.querySelector('#popup-gifts .gifts-popup__button--later');

        if (titleEl) {
            titleEl.innerHTML = isContinue ? captionFreeBetText4Continue : GetCaption('jetxnew.freespin.congrulations');
        }

        if (descEl) {
            const rawReceived = GetCaption('jetxnew.freespin.recieved') || '';
            const endText = GetCaption('jetxnew.freespin.recieved.end') || '';
            let descHtml;
            if (isContinue) {
                descHtml = `<strong>${count}x - ${amountText}</strong>`;
            } else if (/{\d+}/.test(rawReceived)) {
                descHtml = rawReceived.format(count, amountText);
            } else {
                descHtml = `${rawReceived}<br><strong>${count}x - ${amountText}</strong>`;
            }
            if (endText) {
                descHtml += `<br>${endText}`;
            }
            descEl.innerHTML = descHtml;
        }

        if (useNowBtn) {
            useNowBtn.innerHTML = isContinue ? captionFreeBetContinue : captionFreeBetUse;
        }

        if (laterBtn) {
            laterBtn.style.display = isContinue ? 'none' : '';
        }

        renderGiftSpinExpiration();
        syncGiftsUseButtonLock();
        if (window.JetXPopups) window.JetXPopups.open('gifts');
    } else if (type === 'win') {
        stopGiftSpinExpirationTimer();
        const winAmount = formatAmount(player.gift.totalWin, player.currency, 'formated');
        const popupEl = document.querySelector('#popup-gifts-result .gifts-popup--result');
        const amountEl = document.querySelector('#popup-gifts-result .gifts-popup__amount');
        const descEl = document.querySelector('#popup-gifts-result .gifts-popup__description');
        const titleEl = document.querySelector('#popup-gifts-result-title');
        const eyebrowEl = document.querySelector('#popup-gifts-result .gifts-popup__eyebrow');
        const iconUseEl = document.querySelector('#popup-gifts-result .gifts-popup__icon use');
        const zeroWin = parseFloat(player.gift.totalWin) === 0;

        if (popupEl) {
            popupEl.classList.toggle('gifts-popup--zero-win', zeroWin);
        }

        if (iconUseEl) {
            iconUseEl.setAttribute('href', zeroWin ? '#free-flight' : '#popup-icon-gift');
        }

        if (titleEl) {
            titleEl.style.display = '';
            titleEl.innerHTML = zeroWin
                ? GetCaption('jetxnew.freespin.unfortunately')
                : GetCaption('jetxnew.freespin.congrulations');
        }

        // Zero win: free-flight icon + unfortunately caption + close only.
        if (eyebrowEl) eyebrowEl.style.display = zeroWin ? 'none' : '';
        if (amountEl) {
            amountEl.style.display = zeroWin ? 'none' : '';
            if (!zeroWin) amountEl.innerHTML = winAmount;
        }
        if (descEl) {
            if (zeroWin) {
                descEl.style.display = 'none';
            } else {
                descEl.style.display = '';
                const rawCount = GetCaption('jetxnew.freespin.count') || '';
                const endText = GetCaption('jetxnew.freespin.count.end') || '';
                const startAmount = player.gift.startAmount;
                let descHtml;
                if (/{\d+}/.test(rawCount)) {
                    descHtml = rawCount.format(startAmount);
                } else {
                    descHtml = `${rawCount} <strong>${startAmount}</strong>`;
                }
                if (endText) {
                    descHtml += ` ${endText}`;
                }
                descEl.innerHTML = descHtml;
            }
        }

        if (window.JetXPopups) window.JetXPopups.open('gifts-result');
    }
}

function setGiftInfo() {
    const winText = formatAmount(player.gift.totalWin, player.currency, 'formated');
    const progressText = `${player.gift.count}<span class="gift-summary__total">/${player.gift.startAmount}</span>`;
    const amountText = formatAmount(player.gift.amount, player.currency, 'formated');

    const summaryItems = document.querySelectorAll('.gift-summary__item');
    const summaryValues = document.querySelectorAll('.gift-summary__item strong');
    if (summaryValues[0]) summaryValues[0].innerHTML = winText;
    if (summaryValues[1]) summaryValues[1].innerHTML = progressText;
    if (summaryItems[0]) {
        summaryItems[0].classList.toggle('is-win', parseFloat(player.gift.totalWin) > 0);
    }

    setHtmlAll('#GiftSpinAmount', amountText);
    setHtmlAll('#GiftSpinWin', winText);
    setHtmlAll('#GiftSpinCount', player.gift.startAmount);
    setHtmlAll('#GiftSpinUsed', player.gift.startAmount - player.gift.count);
    setHtmlAll('#GiftSpinLeft', player.gift.count);

    setHtmlAll('#bet-button-4', amountText);
    setHtmlAll('#bet-button-5', amountText);

    updateGiftIconButton();
}

function updateGiftIconButton() {
    const btn = document.querySelector('[data-gifts-open]');
    const badge = btn?.querySelector('[data-gifts-count]');
    const pendingOrActive = player.gift.startAmount > 0 && (
        player.gift.started ||
        (!player.gift.started && parseFloat(player.gift.totalWin) === 0)
    );

    if (btn) {
        btn.classList.toggle('is-visible', pendingOrActive);
    }

    if (badge) {
        const count = player.gift.count || 0;
        badge.textContent = count >= 100 ? '99+' : String(count);
        badge.hidden = !pendingOrActive;
    }

    const exitLocked = typeof isGiftCashExitLocked === 'function'
        ? isGiftCashExitLocked()
        : (typeof isGiftSpinCommitted === 'function'
            ? isGiftSpinCommitted()
            : (player.gift.started && player.gift.startAmount > 0 && player.gift.count !== player.gift.startAmount));
    const locked = !!player.disableCashGame || exitLocked;

    const closeBtn = document.querySelector('[data-gift-mode-close]');
    if (closeBtn) {
        closeBtn.hidden = false;
        closeBtn.disabled = false;
        closeBtn.setAttribute('aria-disabled', String(locked));
        closeBtn.classList.toggle('is-disabled', locked);
    }
    if (!locked) {
        dismissGiftDockCloseWarning();
    }

    document.querySelectorAll('[data-bet-tab="cash"]').forEach((cashTab) => {
        cashTab.disabled = locked;
        cashTab.setAttribute('aria-disabled', String(locked));
        cashTab.classList.toggle('is-disabled', locked);
    });

    if (typeof syncGiftBetModeLocks === 'function') syncGiftBetModeLocks();
}

function showGiftTab(load = false) {
    const appEl = document.querySelector('.app');
    if (appEl) appEl.classList.add('has-gifts');
    if (typeof syncGiftBetModeLocks === 'function') syncGiftBetModeLocks();

    if (!giftLoaded) {
        giftLoaded = true;
        if (giftTabClick && !load) {
            setGiftMode(true);
        }
        giftTabClick = true;
    }
}

function hideGiftTab() {
    const appEl = document.querySelector('.app');
    if (!appEl || !appEl.classList.contains('has-gifts')) return;

    setGiftMode(false);
    appEl.classList.remove('has-gifts', 'is-gift-mode');
    if (typeof syncGiftBetModeLocks === 'function') syncGiftBetModeLocks();
    document.dispatchEvent(new Event('jetx:gift-mode-change'));
}

function giftButtonAccept() {
    if (isGiftsUseLockedByAutoplay()) {
        syncGiftsUseButtonLock();
        showGiftsUseAutoplayWarning();
        return;
    }

    currentGiftPopupType = null;
    giftLoaded = false;
    stopGiftSpinExpirationTimer();
    dismissGiftsUseWarning();
    if (window.JetXPopups) window.JetXPopups.close();
    PostCustomEvent(token, 'jetx.gifts.start');
    const appEl = document.querySelector('.app');
    if (appEl) appEl.classList.add('has-gifts');
    setGiftMode(true);
    promoPrizeIcon(true, 100);
    updateGiftIconButton();
}

function giftButtonRemindMe() {
    currentGiftPopupType = null;
    stopGiftSpinExpirationTimer();
    dismissGiftsUseWarning();
    if (window.JetXPopups) window.JetXPopups.close();
    PostCustomEvent(token, 'jetx.gifts.remind.later');
    giftTabClick = false;
    if (typeof setGiftMode === 'function') setGiftMode(false);
    updateGiftIconButton();
}

function giftButtonExit() {
    currentGiftPopupType = null;
    stopGiftSpinExpirationTimer();
    if (window.JetXPopups) window.JetXPopups.close();
    PostCustomEvent(token, 'jetx.gifts.zero.win');
    promoPrizeIcon(true, 100);
    updateGiftIconButton();
}

function giftPopupClose() {
    if (currentGiftPopupType === 'new') {
        if (player.gift.count !== player.gift.startAmount) {
            giftButtonAccept();
        } else {
            giftButtonRemindMe();
        }
    } else if (currentGiftPopupType === 'win') {
        giftButtonExit();
    }
}

function loadPlayerDataGift(data, load = false) {
    const prevGiftStarted = player.gift.started;
    const giftJustEnded = prevGiftStarted && !data.GiftsStarted;

    if (giftJustEnded) {
        if (data.GiftSpinTotalWin != null) {
            player.gift.totalWin = data.GiftSpinTotalWin;
        }
        showGiftPopup('win');
    }

    player.gift.amount = data.GiftSpinAmount;
    player.gift.count = data.GiftSpinCount;
    player.gift.totalCreditWin = data.GiftSpinTotalCreditWin;
    player.gift.totalWin = data.GiftSpinTotalWin;
    if (player.gift.totalWin === null) player.gift.totalWin = 0;
    player.gift.startAmount = data.GiftSpinsStartAmount;
    player.gift.started = data.GiftsStarted;
    player.gift.debt = data.GiftDebtAmount;
    player.gift.expDate = data.GiftSpinExpDate || null;
    player.gift.startDate = data.GiftSpinStartDate || null;
    player.gift.timeLeft = data.GiftSpinTimeLeft || null;

    if (load && typeof discardPersistedUnusedGiftPrevBets === 'function') {
        discardPersistedUnusedGiftPrevBets();
    }

    if (player.gift.started) {
        setGiftInfo();
    } else {
        updateGiftIconButton();
    }

    if (player.gift.startAmount > 0 && player.gift.started) {
        const unused = !player.disableCashGame && player.gift.count === player.gift.startAmount;
        showGiftTab(unused);
    } else if (!player.gift.started) {
        hideGiftTab();
    }

    if (!giftJustEnded && player.gift.startAmount > 0 && !player.gift.started && player.gift.totalWin === 0) {
        giftLoaded = false;
        showGiftPopup('new');
    }

    syncGiftBetButtonAvailability();
    updateGiftIconButton();
}

function syncGiftBetButtonAvailability() {
    const canPlaceMore = (player?.gift?.count ?? 0) > 0;

    for (const i of [4, 5]) {
        const btn = document.getElementById(`bet-${i}`);
        if (!btn) continue;

        if (visualConfig.giftOneBet && i === 5) {
            btn.classList.add('disabled', 'visual-gift-hidden');
            btn.disabled = true;
            btn.hidden = true;
            btn.setAttribute('aria-disabled', 'true');
            continue;
        }

        const lockPlace = btn.classList.contains('place-bet') && !canPlaceMore;
        btn.hidden = false;
        btn.classList.toggle('disabled', lockPlace);
        btn.disabled = lockPlace;
        btn.setAttribute('aria-disabled', String(lockPlace));
    }
}

// Gifts END

document.addEventListener(clickEvent, function (event) {
    if (event.target.closest('.gift-dock-close-wrap') || event.target.closest('[data-gift-mode-close]')) {
        event.preventDefault();
        event.stopPropagation();

        const exitLocked = typeof isGiftCashExitLocked === 'function'
            ? isGiftCashExitLocked()
            : (typeof isGiftSpinCommitted === 'function'
                ? isGiftSpinCommitted()
                : (player.gift.started && player.gift.startAmount > 0 && player.gift.count !== player.gift.startAmount));
        const locked = !!player.disableCashGame || exitLocked;
        if (locked) {
            showGiftDockCloseLockedWarning();
            return;
        }
        setGiftMode(false);
        return;
    }

    if (event.target.closest('[data-gifts-open]')) {
        event.preventDefault();
        if (player.gift.startAmount > 0) {
            showGiftPopup('new');
        }
        return;
    }
});

window.addEventListener('load', function () {
    document.addEventListener(clickEvent, function (event) {
        if (event.target.closest('#popup-gifts .gifts-popup__close')) {
            event.preventDefault();
            document.querySelector('#popup-gifts .gifts-popup__button--later')?.click();
            return;
        }

        if (event.target.closest('#popup-gifts .gifts-popup__button--later') ||
            (event.target.closest('#popup-gifts [data-popup-close]') && currentGiftPopupType === 'new')) {
            giftButtonRemindMe();
            return;
        }

        if (event.target.closest('#popup-gifts-result [data-popup-close]') ||
            (event.target === document.querySelector('#popup-gifts-result') && currentGiftPopupType === 'win')) {
            currentGiftPopupType = null;
            PostCustomEvent(token, 'jetx.gifts.zero.win');
            promoPrizeIcon(true, 100);
            updateGiftIconButton();
            return;
        }

        if (event.target === document.querySelector('#popup-gifts') && currentGiftPopupType === 'new') {
            giftPopupClose();
        }
    });
});
