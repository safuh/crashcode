const mobileViewportQuery = window.matchMedia('(max-width: 47.9375rem)');
const mobileLandscapeMediaQuery = window.matchMedia('(orientation: landscape) and (max-width: 63.9375rem) and (max-height: 30rem)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isAndroidDevice = /Android/i.test(navigator.userAgent);
const androidVirtualKeyboard = isAndroidDevice ? navigator.virtualKeyboard : null;
function syncAndroidVirtualKeyboardOverlay() {
    if (!androidVirtualKeyboard) return;
    try {
        androidVirtualKeyboard.overlaysContent = isDevicePortrait();
    } catch (e) {}
}
// CSS orientation follows the iframe viewport. Casino chrome + iOS keyboard can
// make a portrait iframe wider than it is tall, which would otherwise switch
// the game into the mobile-landscape layout. Device orientation does not.
function isDevicePortrait() {
    const type = window.screen?.orientation?.type;
    if (typeof type === 'string') {
        return type.startsWith('portrait');
    }
    if (typeof window.orientation === 'number') {
        return Math.abs(window.orientation) !== 90;
    }
    const screenWidth = window.screen?.width || 0;
    const screenHeight = window.screen?.height || 0;
    if (screenWidth && screenHeight) {
        return screenHeight >= screenWidth;
    }
    return window.innerHeight >= window.innerWidth;
}

function isMobileLandscapeViewport() {
    return mobileLandscapeMediaQuery.matches && !isDevicePortrait();
}

const mobileLandscapeListeners = [];
let lastMobileLandscapeMatch = isMobileLandscapeViewport();

function syncMobileLandscapeClass() {
    const next = isMobileLandscapeViewport();
    document.documentElement.classList.toggle('is-mobile-landscape', next);
    return next;
}

function notifyMobileLandscapeChange() {
    const next = syncMobileLandscapeClass();
    if (next === lastMobileLandscapeMatch) return next;
    lastMobileLandscapeMatch = next;
    const event = { matches: next };
    mobileLandscapeListeners.forEach((listener) => listener.call(mobileLandscapeQuery, event));
    return next;
}

const mobileLandscapeQuery = {
    get matches() {
        return isMobileLandscapeViewport();
    },
    get media() {
        return mobileLandscapeMediaQuery.media;
    },
    addEventListener(type, listener) {
        if (type === 'change' && typeof listener === 'function' && mobileLandscapeListeners.indexOf(listener) === -1) {
            mobileLandscapeListeners.push(listener);
        }
    },
    removeEventListener(type, listener) {
        const index = mobileLandscapeListeners.indexOf(listener);
        if (index !== -1) mobileLandscapeListeners.splice(index, 1);
    },
};

const isMobileLikeViewport = () => mobileViewportQuery.matches || mobileLandscapeQuery.matches;
const isAndroidKeyboardContext = () => isAndroidDevice
    && isDevicePortrait()
    && (isMobileLikeViewport() || window.matchMedia('(any-pointer: coarse)').matches);
const ANDROID_KEYBOARD_GAP_PX = 32;
const ANDROID_KEYBOARD_GUESS_MS = 250;
const ANDROID_KEYBOARD_POLL_MS = 200;
let stableViewportWidth = window.innerWidth;
let stableMobileVh = window.innerHeight;
let appliedKeyboardLift = 0;
let androidKeyboardPollTimer = 0;
let keyboardAttemptStartedAt = 0;
let keyboardAttemptPeakGap = 0;
let androidKeyboardWasLifted = false;

function isTypingInField() {
    const el = document.activeElement;
    if (!el || el === document.body || typeof el.matches !== 'function') return false;
    return el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"]');
}

function isFullscreenActive() {
    return Boolean(
        document.fullscreenElement
        || document.webkitFullscreenElement
        || document.getElementById('menu-fullscreen')?.checked
    );
}

function startKeyboardAttempt() {
    keyboardAttemptStartedAt = Date.now();
    keyboardAttemptPeakGap = 0;
}

function getVisibleViewportHeight() {
    const keyboardRect = androidVirtualKeyboard?.boundingRect;
    const hasPreciseKeyboardRect = keyboardRect?.height > 0 && keyboardRect.top > 0;
    const measuredHeight = hasPreciseKeyboardRect
        ? Math.min(keyboardRect.top, window.innerHeight)
        : (() => {
            const visualHeight = window.visualViewport?.height;
            return visualHeight > 0
                ? (isAndroidDevice ? Math.min(visualHeight, window.innerHeight) : visualHeight)
                : window.innerHeight;
        })();

    if (!isAndroidDevice || hasPreciseKeyboardRect) return measuredHeight;
    if (!isTypingInField() || !isDevicePortrait()) return measuredHeight;

    const gap = stableMobileVh - measuredHeight;
    keyboardAttemptPeakGap = Math.max(keyboardAttemptPeakGap, gap);

    const everSawRealGeometry = keyboardAttemptPeakGap > ANDROID_KEYBOARD_GAP_PX;
    const currentlyElevated = gap > ANDROID_KEYBOARD_GAP_PX;
    const keyboardLikelyOpen = everSawRealGeometry
        ? currentlyElevated
        : (isFullscreenActive() && Date.now() - keyboardAttemptStartedAt > ANDROID_KEYBOARD_GUESS_MS);

    if (keyboardLikelyOpen) {
        return Math.min(measuredHeight, Math.round(stableMobileVh * 0.58));
    }

    return measuredHeight;
}

function startAndroidKeyboardPoll(forceRestart = false) {
    if (!isAndroidKeyboardContext()) return;
    if (androidKeyboardPollTimer && !forceRestart) return;
    stopAndroidKeyboardPoll();
    androidKeyboardPollTimer = window.setInterval(syncKeyboardLift, ANDROID_KEYBOARD_POLL_MS);
}

function stopAndroidKeyboardPoll() {
    window.clearInterval(androidKeyboardPollTimer);
    androidKeyboardPollTimer = 0;
}

function syncKeyboardLift() {
    const isTyping = isTypingInField();
    const visible = getVisibleViewportHeight();
    let lift = 0;

    if (isAndroidKeyboardContext() && isTyping) {
        const activeRect = document.activeElement.getBoundingClientRect();
        const viewportLift = Math.max(0, Math.round(stableMobileVh - visible));
        const inputLift = Math.max(0, Math.round(activeRect.bottom + appliedKeyboardLift - visible + 12));
        lift = Math.max(0, Math.min(stableMobileVh - 24, Math.max(viewportLift, inputLift)));
        appliedKeyboardLift = lift;
    } else {
        const shouldLift = !isAndroidDevice && isDevicePortrait() && isMobileLikeViewport() && isTyping;
        lift = shouldLift ? Math.max(0, Math.round(stableMobileVh - visible)) : 0;
        appliedKeyboardLift = 0;
    }

    const isLifted = lift > 0;

    const sawRealGeometry = keyboardAttemptPeakGap > ANDROID_KEYBOARD_GAP_PX;
    if (isAndroidKeyboardContext() && androidKeyboardWasLifted && !isLifted && isTyping && sawRealGeometry) {
        document.activeElement.dispatchEvent(new Event('focusout', { bubbles: false }));
    }
    androidKeyboardWasLifted = isLifted;

    if (isAndroidDevice) {
        if (!isTyping || !isDevicePortrait()) {
            stopAndroidKeyboardPoll();
        } else if (isLifted) {
            startAndroidKeyboardPoll();
        } else if (sawRealGeometry) {
            stopAndroidKeyboardPoll();
        }
    }

    if (isLifted) {
        document.documentElement.style.setProperty('--keyboard-lift', lift + 'px');
        document.documentElement.classList.add('is-keyboard-lift');
        return;
    }

    document.documentElement.style.removeProperty('--keyboard-lift');
    document.documentElement.classList.remove('is-keyboard-lift');
}

function updateVh(force = false) {
    syncAndroidVirtualKeyboardOverlay();
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;

    if (isMobileLikeViewport() || isAndroidKeyboardContext()) {
        const widthChanged = Math.abs(nextWidth - stableViewportWidth) > 1;
        // Keep the pre-keyboard height while typing so the iframe shrink does
        // not rewrite --real-vh (and layout) on every iOS keyboard resize.
        if (force || !isTypingInField() || (!isAndroidDevice && widthChanged)) {
            stableMobileVh = nextHeight;
        }

        stableViewportWidth = nextWidth;
        document.documentElement.style.setProperty('--real-vh', stableMobileVh + 'px');
        syncKeyboardLift();
        return;
    }

    stableViewportWidth = nextWidth;
    stableMobileVh = nextHeight;
    document.documentElement.style.setProperty('--real-vh', nextHeight + 'px');
    syncKeyboardLift();
}

syncMobileLandscapeClass();
updateVh(true);
window.addEventListener('resize', () => {
    notifyMobileLandscapeChange();
    updateVh();
});
window.addEventListener('orientationchange', () => {
    notifyMobileLandscapeChange();
    updateVh(true);
});
window.screen?.orientation?.addEventListener?.('change', () => {
    notifyMobileLandscapeChange();
    updateVh(true);
});
window.addEventListener('focusin', () => {
    if (isAndroidKeyboardContext()) startKeyboardAttempt();
    updateVh();
    if (isAndroidKeyboardContext()) startAndroidKeyboardPoll(true);
});

document.addEventListener('pointerdown', (event) => {
    if (!isAndroidKeyboardContext()) return;
    if (event.target !== document.activeElement || !isTypingInField()) return;
    startKeyboardAttempt();
    startAndroidKeyboardPoll(true);
    syncKeyboardLift();
}, true);
window.addEventListener('focusout', () => {
    if (!isAndroidDevice) {
        window.setTimeout(() => updateVh(true), 50);
        return;
    }

    window.setTimeout(() => {
        if (isTypingInField()) {
            syncKeyboardLift();
            return;
        }

        stopAndroidKeyboardPoll();
        updateVh(true);
    }, 50);
});
window.visualViewport?.addEventListener('resize', () => {
    notifyMobileLandscapeChange();
    updateVh();
});
window.visualViewport?.addEventListener('scroll', syncKeyboardLift);
androidVirtualKeyboard?.addEventListener('geometrychange', syncKeyboardLift);
mobileViewportQuery.addEventListener('change', () => updateVh(true));
mobileLandscapeMediaQuery.addEventListener('change', () => {
    notifyMobileLandscapeChange();
    updateVh();
});



const getAmountNumber = (value) => {
    const amount = typeof parseInputAmount === 'function'
        ? parseInputAmount(value)
        : parseFloat(String(value).replace(/,/g, ''));

    return Number.isNaN(amount) ? 0 : amount;
};

function GetGameVersion() {
    return document.querySelector('#Version') ? document.querySelector('#Version').value : '';
}

function helpHtml() {
    let tabs = ``;
    let content = ``;
    for(let i = 0; i < 10; i++) {
        let titleCaption = `jetxnew.rules.title${i + 1}`;
        let textCaption = GetCaption(`jetxnew.rules.text${i + 1}`);
        textCaption = textCaption.replaceAll('<br>', '<br><br>').replaceAll('<br />', '<br><br>').replaceAll('<br/>', '<br><br>');

        if(GetCaption(titleCaption) !== titleCaption || i < 5) {

            tabs += `<button class="rules-tab${i === 0 ? ' rules-tab--active' : ''}" type="button" data-rules-target="section-${i}" aria-controls="rules-section-${i}" aria-current="${i === 0 ? 'true' : 'false'}">${GetCaption(titleCaption)}</button>`;
            content += `
                ${i === 0 ? '' : '<span class="rules-divider" aria-hidden="true"></span>'}
                <section class="rules-section" id="rules-section-${i}" data-rules-section="section-${i}" aria-labelledby="rules-title">
                  <h3 id="rules-${i}-title">${GetCaption(titleCaption)}</h3>
                  <p>${textCaption}</p>
                </section>
            `;
        }
    }

    const rulesTabsNav = document.querySelector('.rules-tabs');
    rulesTabsNav.innerHTML = tabs;
    document.querySelector('.rules-content').innerHTML = content;

    if(GetGameVersion() !== '' && document.querySelector('#game-version')) {
        document.querySelector('#game-version').innerHTML = GetCaption('jetxnew.game.version') + ' ' + GetGameVersion();
    }

    const rulesPopup = document.querySelector('#popup-rules');
    const rulesTabs = rulesPopup ? Array.from(rulesPopup.querySelectorAll('[data-rules-target]')) : [];
    const rulesSections = rulesPopup ? Array.from(rulesPopup.querySelectorAll('[data-rules-section]')) : [];
    const rulesContent = rulesPopup?.querySelector('[data-rules-content]');

    const setRulesActiveTab = (sectionName) => {
        rulesTabs.forEach((tab) => {
            const isActive = tab.dataset.rulesTarget === sectionName;
            tab.classList.toggle('rules-tab--active', isActive);
            tab.setAttribute('aria-current', String(isActive));

            if (isActive && rulesTabsNav) {
                const tabLeft = tab.offsetLeft;
                const tabRight = tabLeft + tab.offsetWidth;
                const viewLeft = rulesTabsNav.scrollLeft;
                const viewRight = viewLeft + rulesTabsNav.clientWidth;

                if (tabLeft < viewLeft) {
                    rulesTabsNav.scrollLeft = tabLeft;
                } else if (tabRight > viewRight) {
                    rulesTabsNav.scrollLeft = tabRight - rulesTabsNav.clientWidth;
                }
            }
        });
    };

    const scrollRulesToSection = (sectionName, behavior = 'smooth') => {
        const section = rulesSections.find((item) => item.dataset.rulesSection === sectionName);

        if (!section || !rulesContent) {
            return;
        }

        setRulesActiveTab(sectionName);
        const top = section.offsetTop - rulesContent.offsetTop;

        if (behavior === 'auto') {
            rulesContent.scrollTop = top;
            return;
        }

        rulesContent.scrollTo({ top, behavior });
    };

    if (rulesTabsNav && !rulesTabsNav.dataset.wheelScrollBound) {
        rulesTabsNav.dataset.wheelScrollBound = 'true';
        rulesTabsNav.addEventListener('wheel', (event) => {
            if (rulesTabsNav.scrollWidth <= rulesTabsNav.clientWidth) {
                return;
            }

            const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

            if (!delta) {
                return;
            }

            const maxScroll = rulesTabsNav.scrollWidth - rulesTabsNav.clientWidth;
            const nextScroll = Math.max(0, Math.min(maxScroll, rulesTabsNav.scrollLeft + delta));

            if (nextScroll === rulesTabsNav.scrollLeft) {
                return;
            }

            event.preventDefault();
            rulesTabsNav.scrollLeft = nextScroll;
        }, { passive: false });
    }

    document.addEventListener('click', (event) => {
        const rulesTabButton = event.target.closest('[data-rules-target]');

        if (rulesTabButton) {
            event.preventDefault();
            scrollRulesToSection(rulesTabButton.dataset.rulesTarget);
        }
    });

    setRulesActiveTab('section-0');
    //window.requestAnimationFrame(() => scrollRulesToSection('section-0', 'auto'));

    window.openRulesSection = (sectionName, behavior = 'auto') => {
        scrollRulesToSection(sectionName, behavior);
    };

    let amount = formatAmount(board.maxBet, player.currency, 'formated');
    let inputAmount = formatAmount(board.maxBet, player.currency, 'input');
    let coef = `10.00 x`;
    let betList = ['', '1', '2', '3'];
    $('#button-0 .bet-chips button').each(function (index) {
        betList[index] = formatAmount($(this).data('bet'), player.currency, 'chip');
    });

    let betHtml = `
     <div class="how-play-mini-card">
        <div class="how-play-mini-head">
          <span class="how-play-auto">
            <span class="toggle">
              <input type="checkbox" class="toggle-input" tabindex="-1">
              <span class="toggle-slider"></span>
            </span>
            <span class="auto-text">${GetCaption("jetxnew.auto.collect")}</span>
          </span>
          <span class="btn-autoplay">
            <svg class="icon" aria-hidden="true">
              <use href="#autoplay"></use>
            </svg>
          </span>
        </div>
        <div class="bet-input how-play-bet-input">
          <span class="bet-input-btn">
            <svg class="icon" aria-hidden="true">
              <use href="#minus-sign"></use>
            </svg>
          </span>
          <span class="bet-input-field">${inputAmount}</span>
          <span class="bet-input-btn">
            <svg class="icon" aria-hidden="true">
              <use href="#add-01"></use>
            </svg>
          </span>
        </div>
        <div class="bet-chips how-play-chips">
          <span class="chip text-fit"><span>${betList[0]}</span></span>
          <span class="chip text-fit"><span>${betList[1]}</span></span>
          <span class="chip text-fit"><span>${betList[2]}</span></span>
          <span class="chip text-fit"><span>${GetCaption("jetxnew.max")}</span></span>
        </div>
        <span class="btn-bet place-bet how-play-bet-button place-bet">
          <span class="place-bet-div">
            <span class="btn-bet__value">${amount}</span>
            <span class="btn-bet__label">${GetCaption("jetxnew.placebet")}</span>
          </span>
          <span class="cash-out-div">
            <span class="btn-bet__value cash-out1">${formatAmount(board.maxWinAmount, player.currency, 'formated')}</span>
            <span class="btn-bet__label">${GetCaption("jetxnew.cashout.action")}</span>
          </span>
        </span>
      </div>
    `;
    const howPlayPreview = howPlayPopup?.querySelector('.how-play-preview');
    if (!howPlayPreview) return;
    howPlayPreview.innerHTML = `
        <div class="how-play-mini" aria-hidden="true">${betHtml}<span class="bet-sep how-play-sep"></span>${betHtml}</div>
        <div class="how-play-multiplier">
            <div>
                ${board.maxCashoutCoeff}
                <svg xmlns="http://www.w3.org/2000/svg" width="39" height="38" viewBox="0 0 39 38" fill="none">
                    <path d="M22.8468 32.5657L18.3719 23.7493L6.94854 37.1943H0L15.8705 18.6247L8.92193 4.62863H15.5647L20.0396 13.6655L31.7965 0H38.4393L22.4855 18.487L29.4618 32.5657H22.8468Z" fill="white"/>
                </svg>
            </div>
        </div>
    `;
}

const menuToggle = document.querySelector('[data-menu-toggle]');
const menuPanel = document.querySelector('#menu-pop');
const app = document.querySelector('.app');
const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
const sidebar = document.querySelector('#side');
const playDiv = document.querySelector('.play');
const playFooter = document.querySelector('.play-footer');
const betDock = document.querySelector('.bet-dock');
const betModeButtons = document.querySelectorAll('[data-bet-mode]');
const betTabButtons = document.querySelectorAll('[data-bet-tab]');
const mobileQuery = mobileViewportQuery;
const compactBetButtons = document.querySelectorAll('.bet-panel [data-bet-panel] .btn-bet');

const multipliersPanel = document.querySelector('[data-multipliers-panel]');
const multipliersToggle = document.querySelector('[data-multipliers-toggle]');
const popups = document.querySelectorAll('[data-popup]');
const popupCloseTimers = new WeakMap();
const popupAnimationMs = 280;
const howPlayPopup = document.querySelector('#popup-how-to-play');
const howPlayNext = howPlayPopup?.querySelector('[data-how-play-next]');
const howPlayNextLabel = howPlayPopup?.querySelector('[data-how-play-next-label]');
const howPlayTitle = howPlayPopup?.querySelector('[data-how-play-title]');
const howPlayDescription = howPlayPopup?.querySelector('[data-how-play-description]');
const howPlayDotsGroup = howPlayPopup?.querySelector('[data-how-play-dots]');
const howPlayDots = howPlayPopup ? Array.from(howPlayPopup.querySelectorAll('.how-play-dot')) : [];

const isKeyboardInput = (element) => Boolean(element?.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"]'));
const isKeyboardInputActive = () => isKeyboardInput(document.activeElement);
const dismissMobileKeyboard = () => {
    const activeElement = document.activeElement;
    if (!isKeyboardInput(activeElement)) return;
    activeElement.blur();
};


const isKeyboardActivationKey = (event) =>
    event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';

const blockKeyboardControlActivation = (event) => {
    if (!isKeyboardActivationKey(event)) return;
    if (isKeyboardInput(event.target)) return;
    event.preventDefault();
};

document.addEventListener('keydown', blockKeyboardControlActivation, true);
document.addEventListener('keyup', blockKeyboardControlActivation, true);

document.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        const control = event.target?.closest?.('button, [role="button"], a[href], summary, label');
        if (control && document.activeElement === control) control.blur();
    }
}, true);

const howPlaySteps = [
    {
        title: GetCaption("jetxnew.howplay.step1"),
        description: GetCaption("jetxnew.howplay.step1.description"),
        state: 'place-bet',
    },
    {
        title: GetCaption("jetxnew.howplay.step2"),
        description: GetCaption("jetxnew.howplay.step2.description"),
        state: 'multiplier',
    },
    {
        title: GetCaption("jetxnew.howplay.step3"),
        description: GetCaption("jetxnew.howplay.step3.description"),
        state: 'cash-out',
    },
];
let howPlayStep = 0;



const headerLast100Spins = document.querySelector('#headerLast100Spins');
const ROUND_WINNERS_COLLAPSED_MULTIPLIERS_REM = 1.25;

const updateRoundWinnersCompactTop = () => {
    if (!app) return;

    if ((!mobileQuery.matches && !mobileLandscapeQuery.matches) || !headerLast100Spins) {
        app.style.removeProperty('--round-winners-compact-top');
        return;
    }

    const rect = headerLast100Spins.getBoundingClientRect();
    const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const collapsedHeight = ROUND_WINNERS_COLLAPSED_MULTIPLIERS_REM * rootFs;
    const expanded = Boolean(multipliersPanel?.classList.contains('is-multipliers-expanded'));

    if (mobileLandscapeQuery.matches) {
        const stage = document.querySelector('.stage');
        const stageTop = stage?.getBoundingClientRect().top ?? 0;
        const anchor = rect.bottom - stageTop;
        app.style.setProperty('--round-winners-compact-top', `${Math.max(0, anchor)}px`);
        return;
    }

    const anchor = expanded ? rect.top + collapsedHeight : rect.bottom;
    app.style.setProperty('--round-winners-compact-top', `${Math.max(0, anchor)}px`);
};

const getMultipliersToggleReserve = (header) => {
    const raw = getComputedStyle(header).getPropertyValue('--multipliers-toggle-space').trim();
    if (!raw) return 0;
    if (raw.endsWith('rem')) {
        const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        return (parseFloat(raw) || 0) * rootFs;
    }
    return parseFloat(raw) || 0;
};

const isMultipliersOverflowing = () => {
    const header = headerLast100Spins;
    const first = header?.querySelector('.badge-multiplier');
    const last = header?.lastElementChild;
    if (!header || !first || !last) return false;

    if (last.offsetTop - first.offsetTop > 4) return true;

    const headerRect = header.getBoundingClientRect();
    let visibleRight = Math.min(headerRect.right, document.documentElement.clientWidth);
    if (multipliersToggle && !multipliersToggle.hidden) {
        visibleRight = Math.min(visibleRight, multipliersToggle.getBoundingClientRect().left);
    } else {
        visibleRight -= getMultipliersToggleReserve(header);
    }

    for (let i = 0; i < header.children.length; i++) {
        if (header.children[i].getBoundingClientRect().right > visibleRight + 0.5) {
            return true;
        }
    }
    return false;
};

const updateMultipliersToggleVisibility = () => {
    if (!multipliersToggle || !headerLast100Spins) return;

    const shouldShow = isMultipliersOverflowing();
    const isShown = !multipliersToggle.hidden;
    if (shouldShow !== isShown) {
        multipliersToggle.hidden = !shouldShow;
        headerLast100Spins.classList.toggle('is-multipliers-toggle-hidden', !shouldShow);
    }

    if (!shouldShow && multipliersPanel?.classList.contains('is-multipliers-expanded')) {
        setMultipliersExpanded(false);
    }
};

window.addEventListener('resize', updateMultipliersToggleVisibility);

const setMultipliersExpanded = (expanded) => {
    if (!multipliersPanel || !multipliersToggle) {
        return;
    }

    const collapsedHeight = multipliersPanel.offsetHeight;

    multipliersPanel.classList.toggle('is-multipliers-expanded', expanded);
    multipliersToggle.setAttribute('aria-expanded', String(expanded));
    multipliersToggle.setAttribute('aria-label', expanded ? 'Hide multipliers' : 'Show more multipliers');
    promoPrizeIcon(true);

    if (!app) {
        return;
    }

    if (!expanded) {
        app.style.setProperty('--topbar-multipliers-offset', '0px');
        updateRoundWinnersCompactTop();
        if (typeof syncAnimationOffLayout === 'function') {
            syncAnimationOffLayout();
        }
        return;
    }

    const maxHeight = getComputedStyle(multipliersPanel).maxHeight;
    const contentHeight = multipliersPanel.scrollHeight;
    const expandedHeight = maxHeight === 'none'
        ? contentHeight
        : Math.min(contentHeight, parseFloat(maxHeight) || contentHeight);

    app.style.setProperty('--topbar-multipliers-offset', `${Math.max(0, expandedHeight - collapsedHeight)}px`);
    updateRoundWinnersCompactTop();
    if (typeof syncAnimationOffLayout === 'function') {
        syncAnimationOffLayout();
    }
};

const giftPreferredBetMode = visualConfig.giftOneBet ? 'single' : 'classic';
const giftAllowedBetModes = visualConfig.giftOneBet
    ? new Set(['single'])
    : new Set(['classic', 'double']);
const betModePanelCounts = {
    single: 1,
    classic: 2,
    double: 2,
    four: 4,
};
let applyBetMode = null;
let betModeBeforeGift = null;

const getCurrentBetMode = () => {
    const activeButton = Array.from(betModeButtons).find((button) => button.classList.contains('mode-card--active'));
    return activeButton?.dataset.betMode || null;
};

const getBetModePanelCount = (mode) => betModePanelCounts[mode] ?? 2;

const hasActiveBetOnPanel = (index) => {
    if (typeof player !== 'undefined' && player?.prevBets?.[index]) return true;
    const betButton = document.getElementById(`bet-${index}`);
    if (!betButton) return false;
    return betButton.classList.contains('cancel-bet')
        || betButton.classList.contains('cash-out')
        || betButton.classList.contains('disable')
        || betButton.classList.contains('btn-bet--loading');
};

const hasActiveBetsInPanels = (panelCount) => {
    for (let i = 0; i < panelCount; i++) {
        if (hasActiveBetOnPanel(i)) return true;
    }
    return false;
};

const isFourBetAutoplayBlocking = () => {
    const onFour = getCurrentBetMode() === 'four' || !!app?.classList.contains('mode-4');
    if (!onFour) return false;
    return typeof isAnyAutoplayActive === 'function' && isAnyAutoplayActive();
};

const isBetModeSwitchLocked = (currentMode = getCurrentBetMode()) => {
    const currentCount = getBetModePanelCount(currentMode);
    return hasActiveBetsInPanels(currentCount) || isFourBetAutoplayBlocking();
};

const isBetModeDowngradeBlocked = (targetMode, currentMode = getCurrentBetMode()) => {
    if (!currentMode || !targetMode || currentMode === targetMode) return false;
    const currentCount = getBetModePanelCount(currentMode);
    const targetCount = getBetModePanelCount(targetMode);
    if (targetCount >= currentCount) return false;
    return isBetModeSwitchLocked(currentMode);
};

const BET_MODE_LOCKED_WARNING_MS = 2000;
const modeSwitchWarning = document.querySelector('[data-mode-switch-warning]');
const modeSwitchWarningText = modeSwitchWarning?.querySelector('[data-mode-switch-warning-text]');
let betModeLockedWarningTimer = null;
let betModeLockedWarningHideToken = 0;

const dismissBetModeLockedWarning = () => {
    if (betModeLockedWarningTimer) {
        clearTimeout(betModeLockedWarningTimer);
        betModeLockedWarningTimer = null;
    }
    if (!modeSwitchWarning || modeSwitchWarning.hidden) return;

    const hideToken = ++betModeLockedWarningHideToken;
    modeSwitchWarning.classList.add('mode-switch-warning--leaving');
    const finishHide = () => {
        if (hideToken !== betModeLockedWarningHideToken) return;
        modeSwitchWarning.hidden = true;
        modeSwitchWarning.classList.remove('mode-switch-warning--leaving', 'is-visible');
    };
    modeSwitchWarning.addEventListener('animationend', finishHide, { once: true });
    setTimeout(finishHide, 320);
};

const showBetModeLockedWarning = () => {
    if (!modeSwitchWarning || !modeSwitchWarningText) return;

    if (betModeLockedWarningTimer) {
        clearTimeout(betModeLockedWarningTimer);
        betModeLockedWarningTimer = null;
    }
    betModeLockedWarningHideToken += 1;

    const giftDockOpen = !!app?.classList.contains('is-gift-mode');
    modeSwitchWarningText.textContent = GetCaption(
        giftDockOpen ? 'jetxnew.menu.bet.mode.locked.gift' : 'jetxnew.menu.bet.mode.locked'
    );
    modeSwitchWarning.hidden = false;
    modeSwitchWarning.classList.remove('mode-switch-warning--leaving');
    modeSwitchWarning.classList.add('is-visible');

    betModeLockedWarningTimer = setTimeout(() => {
        betModeLockedWarningTimer = null;
        dismissBetModeLockedWarning();
    }, BET_MODE_LOCKED_WARNING_MS);
};

const isGiftSpinCommitted = () => {
    return !!player?.gift?.started
        && player.gift.startAmount > 0
        && player.gift.count !== player.gift.startAmount;
};

const hasActiveGiftBet = () => hasActiveBetOnPanel(4) || hasActiveBetOnPanel(5);

const isGiftCashExitLocked = () => isGiftSpinCommitted() || hasActiveGiftBet();

const syncGiftBetModeLocks = () => {
    if (!app || !betModeButtons.length) return;

    const giftDockOpen = app.classList.contains('is-gift-mode');
    const currentMode = getCurrentBetMode();
    const currentCount = getBetModePanelCount(currentMode);
    const hasActiveBets = isBetModeSwitchLocked(currentMode);
    let activeMode = null;

    betModeButtons.forEach((button) => {
        const mode = button.dataset.betMode;
        if (button.classList.contains('mode-card--active')) {
            activeMode = mode;
        }

        if (giftDockOpen) {
            const giftAllowed = giftAllowedBetModes.has(mode);
            const giftLocked = !giftAllowed;
            button.disabled = false;
            button.classList.toggle('mode-card--disabled', giftLocked);
            button.classList.toggle('mode-card--gift-locked', giftLocked);
            button.classList.remove('mode-card--bet-locked');
            button.setAttribute('aria-disabled', String(giftLocked));
            return;
        }

        const visualAllowed = !isBetPanelDisabled(mode);
        const downgradeBlocked = hasActiveBets
            && getBetModePanelCount(mode) < currentCount;
        const betLocked = visualAllowed && downgradeBlocked;
        const allowed = visualAllowed && !downgradeBlocked;
        button.disabled = !allowed && !betLocked;
        button.classList.toggle('mode-card--disabled', !allowed);
        button.classList.toggle('mode-card--bet-locked', betLocked);
        button.classList.remove('mode-card--gift-locked');
        button.setAttribute('aria-disabled', String(!allowed));
    });

    if (typeof applyBetMode !== 'function') return;

    const isModeSelectable = (mode) => {
        if (!mode) return false;
        if (giftDockOpen) return giftAllowedBetModes.has(mode);
        return !isBetPanelDisabled(mode);
    };

    const findAllowedFallback = (preferModes = []) => {
        for (const mode of preferModes) {
            if (!isModeSelectable(mode)) continue;
            const button = Array.from(betModeButtons).find((b) => b.dataset.betMode === mode);
            if (button) return button;
        }
        return Array.from(betModeButtons).find((button) => isModeSelectable(button.dataset.betMode)) || null;
    };

    if (giftDockOpen && activeMode && !giftAllowedBetModes.has(activeMode)) {
        if (betModeBeforeGift === null) {
            betModeBeforeGift = activeMode;
        }
        const fallback = findAllowedFallback([giftPreferredBetMode, 'classic', 'double', 'single']);

        if (fallback && fallback.dataset.betMode !== activeMode) {
            applyBetMode(fallback.dataset.betMode, fallback, false);
        }
        return;
    }

    if (!giftDockOpen && activeMode && isBetPanelDisabled(activeMode)) {
        const fallbackMode = resolveInitialBetMode(activeMode);
        const fallback = findAllowedFallback([fallbackMode, 'double', 'classic', 'single', 'four']);
        if (fallback && fallback.dataset.betMode !== activeMode) {
            applyBetMode(fallback.dataset.betMode, fallback, true);
        }
    }
};

const setGiftMode = (enabled) => {
    if (!enabled && typeof isGiftCashExitLocked === 'function' && isGiftCashExitLocked()) {
        return;
    }

    if (enabled) app.classList.add('has-gifts');
    if (!app || !app.classList.contains('has-gifts')) {
        return;
    }

    if (enabled && betModeBeforeGift === null) {
        betModeBeforeGift = getCurrentBetMode();
    }

    app.classList.toggle('is-gift-mode', enabled);

    betTabButtons.forEach((button) => {
        const active = button.dataset.betTab === (enabled ? 'gift' : 'cash');
        button.classList.toggle('segment--active', active);
        button.setAttribute('aria-selected', String(active));
    });

    syncGiftBetModeLocks();

    if (!enabled && betModeBeforeGift && typeof applyBetMode === 'function') {
        const restoreMode = betModeBeforeGift;
        betModeBeforeGift = null;
        const restoreButton = Array.from(betModeButtons).find((button) => button.dataset.betMode === restoreMode);
        if (restoreButton) {
            applyBetMode(restoreMode, restoreButton, true);
        }
    } else if (enabled && typeof applyBetMode === 'function') {
        const currentMode = getCurrentBetMode();
        const modeToApply = giftAllowedBetModes.has(currentMode)
            ? currentMode
            : giftPreferredBetMode;
        const modeButton = Array.from(betModeButtons).find(
            (button) => button.dataset.betMode === modeToApply
        );
        if (modeButton) {
            applyBetMode(modeToApply, modeButton, false);
        }
    }

    if (typeof updateGiftIconButton === 'function') updateGiftIconButton();
    document.dispatchEvent(new Event('jetx:gift-mode-change'));
};



const setHowPlayStep = (step) => {
    const nextStep = Math.min(Math.max(step, 0), howPlaySteps.length - 1);
    const stepContent = howPlaySteps[nextStep];
    const isFinal = nextStep === howPlaySteps.length - 1;
    howPlayStep = nextStep;

    if (howPlayTitle && stepContent) {
        howPlayTitle.innerHTML = stepContent.title;
    }

    if (howPlayDescription && stepContent) {
        howPlayDescription.textContent = stepContent.description;
    }

    if (howPlayPopup && stepContent && stepContent.state) {
        const previewEl = howPlayPopup.querySelector('.how-play-preview');
        previewEl?.classList.remove('multiplier');
        if(stepContent.state === 'multiplier') {
            previewEl?.classList.add('multiplier');
        } else {
            howPlayPopup.querySelectorAll('.how-play-bet-button').forEach((button) => {
                button.classList.remove('place-bet', 'cancel-bet', 'cash-out', 'disable');
                button.classList.add(stepContent.state);
            });
        }
        const preview = howPlayPopup.querySelector('.how-play-preview');
        if (preview) {
            preview.setAttribute('data-how-play-state', stepContent.state);
            if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(preview);
        }
    }

    if (howPlayNext) {
        howPlayNext.classList.toggle('btn-secondary', !isFinal);
        howPlayNext.classList.toggle('btn-primary', isFinal);
        howPlayNext.classList.toggle('how-play-next--final', isFinal);
    }

    if (howPlayNextLabel) {
        howPlayNextLabel.textContent = isFinal ? GetCaption("jetxnew.howplay.start.play") : GetCaption("jetxnew.howplay.next");
    }

    if (howPlayDotsGroup) {
        howPlayDotsGroup.setAttribute('aria-label', `Step ${nextStep + 1} of ${howPlaySteps.length}`);
    }

    howPlayDots.forEach((dot, index) => {
        const isActive = index === nextStep;
        dot.classList.toggle('how-play-dot--active', isActive);
        if (isActive) {
            dot.setAttribute('aria-current', 'step');
        } else {
            dot.removeAttribute('aria-current');
        }
    });
};

const howPlayBody = howPlayPopup?.querySelector('.game-modal__body--how-play');
if (howPlayBody) {
    let howPlaySwipeStartX = 0;
    let howPlaySwipeStartY = 0;
    let howPlaySwipeStartTime = 0;
    let howPlaySwipeTracking = false;
    const HOW_PLAY_SWIPE_MIN_X = 45;
    const HOW_PLAY_SWIPE_MAX_MS = 700;

    howPlayBody.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1 || event.target.closest('button, a, input, label')) {
            howPlaySwipeTracking = false;
            return;
        }
        const touch = event.touches[0];
        howPlaySwipeStartX = touch.clientX;
        howPlaySwipeStartY = touch.clientY;
        howPlaySwipeStartTime = Date.now();
        howPlaySwipeTracking = true;
    }, { passive: true });

    howPlayBody.addEventListener('touchend', (event) => {
        if (!howPlaySwipeTracking) return;
        howPlaySwipeTracking = false;
        if (Date.now() - howPlaySwipeStartTime > HOW_PLAY_SWIPE_MAX_MS) return;

        const touch = event.changedTouches[0];
        const dx = touch.clientX - howPlaySwipeStartX;
        const dy = touch.clientY - howPlaySwipeStartY;

        if (Math.abs(dx) < HOW_PLAY_SWIPE_MIN_X || Math.abs(dx) <= Math.abs(dy)) return;

        if (dx < 0) {
            setHowPlayStep(howPlayStep + 1);
        } else {
            setHowPlayStep(howPlayStep - 1);
        }
    }, { passive: true });
}







const releasePopupFocus = (popup) => {
    const activeElement = document.activeElement;

    if (!activeElement || !popup.contains(activeElement)) {
        return;
    }

    activeElement.blur();
};

const HELP_POPUPS = new Set(['how-to-play', 'rules', 'four-bet-info']);
const FOUR_BET_INFO_POPUP = 'four-bet-info';
const GIFT_POPUPS = new Set(['gifts', 'gifts-result']);
const SOUND_POPUP = 'sound';
const WELCOME_POPUP = 'welcome';

const isPopupVisible = (popup) => Boolean(popup && !popup.hidden && popup.getAttribute('aria-hidden') !== 'true');

const canStackPopups = (opening, existing) =>
    (HELP_POPUPS.has(opening) && GIFT_POPUPS.has(existing))
    || (GIFT_POPUPS.has(opening) && HELP_POPUPS.has(existing))
    || (opening === SOUND_POPUP && HELP_POPUPS.has(existing))
    || (HELP_POPUPS.has(opening) && existing === SOUND_POPUP)
    // Welcome covers the viewport and dismisses itself, so it neither hides
    // nor is hidden by whatever else opens during the first load.
    || opening === WELCOME_POPUP
    || existing === WELCOME_POPUP;

const syncModalOpenState = () => {
    const hasActivePopup = Array.from(popups).some(isPopupVisible);
    document.body.classList.toggle('modal-open', hasActivePopup);
    return hasActivePopup;
};

const hidePopup = (popup, instant = false) => {
    const closeTimer = popupCloseTimers.get(popup);
    const wasHelpVisible = HELP_POPUPS.has(popup.dataset.popup) && isPopupVisible(popup);

    if (popup.dataset.popup === FOUR_BET_INFO_POPUP && isPopupVisible(popup)) {
        markFourBetInfoPopupSeen();
    }

    if (closeTimer) {
        window.clearTimeout(closeTimer);
        popupCloseTimers.delete(popup);
    }

    releasePopupFocus(popup);
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');

    if (popup.hidden) {
        syncModalOpenState();
        return;
    }

    if (instant) {
        popup.hidden = true;
        syncModalOpenState();
        if (wasHelpVisible) mixpanelHelpClosed();
        return;
    }

    popupCloseTimers.set(popup, window.setTimeout(() => {
        popup.hidden = true;
        popupCloseTimers.delete(popup);
        syncModalOpenState();
    }, popupAnimationMs));

    if(popup.dataset.popup === 'how-to-play') {
        PostCustomEvent(token, 'jetx.no.info.on.start');
    }

    if (wasHelpVisible) mixpanelHelpClosed();

    promoPrizeIcon(true, 10);
    syncModalOpenState();
};

const showPopup = (popup) => {
    const closeTimer = popupCloseTimers.get(popup);

    if (closeTimer) {
        window.clearTimeout(closeTimer);
        popupCloseTimers.delete(popup);
    }

    popup.hidden = false;
    popup.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => {
        if (!popup.hidden && popup.getAttribute('aria-hidden') === 'false') {
            popup.classList.add('is-open');
            if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(popup);
        }
    });
};

const closePopups = () => {
    popups.forEach((popup) => hidePopup(popup));
    document.body.classList.remove('modal-open');
    promoPrizeIcon(true, 10);
};

const closePopup = (nameOrEl) => {
    const popup = typeof nameOrEl === 'string'
        ? document.querySelector(`[data-popup="${nameOrEl}"]`)
        : nameOrEl;
    if (!popup) return;
    hidePopup(popup);
    promoPrizeIcon(true, 10);
};

const openPopup = (name, options = {}) => {
    if (typeof hideCollectMobileModal === 'function') {
        hideCollectMobileModal(true);
    }

    if (name === 'how-to-play') {
        setHowPlayStep(0);
    }


    if (name === 'autoplay') {
        setAutoplayPopup();
    }

    popups.forEach((popup) => {
        const popupName = popup.dataset.popup;
        const active = popupName === name;

        if (active) {
            showPopup(popup);
        } else if (
            isPopupVisible(popup)
            && (
                canStackPopups(name, popupName)
                || (soundPopup && popupName === SOUND_POPUP)
            )
        ) {
            // Keep help above freespins (or freespins under help) without flicker.
        } else {
            hidePopup(popup, true);
        }
    });

    if (name === 'my-bets' && typeof gameStats !== 'undefined' && gameStats.clientHistory?.drawIfDirty) {
        gameStats.clientHistory.drawIfDirty();
    }

    if (HELP_POPUPS.has(name)) {
        mixpanelHelpOpened(name);
    }

    const hasActivePopup = syncModalOpenState();

    if (hasActivePopup && menuPanel && menuToggle) {
        menuPanel.hidden = true;
        menuPanel.setAttribute('aria-hidden', 'true');
        menuToggle.setAttribute('aria-expanded', 'false');
        const avatarToggle = menuPanel.querySelector('.avatar-toggle');
        const limitsToggle = menuPanel.querySelector('.limits-toggle');
        if (avatarToggle) avatarToggle.checked = false;
        if (limitsToggle) limitsToggle.checked = false;
    }

    window.parent.postMessage('jetXInfoOpen', '*');
    promoPrizeIcon();
};



window.JetXPopups = {
    open: openPopup,
    close: closePopups,
    closeOne: closePopup,
};

let suppressSnapUntil = 0;

function scrollToElement(element, offset = 0) {
    if (!element) return;

    const scroller = document.scrollingElement || document.documentElement;
    const elementRect = element.getBoundingClientRect();

    const currentScroll = window.scrollY || scroller.scrollTop || 0;
    const targetTop = currentScroll + elementRect.top - offset;
    const maxScroll = Math.max(0, scroller.scrollHeight - (window.innerHeight || scroller.clientHeight));
    suppressSnapUntil = Date.now() + 900;

    window.scrollTo({
        top: Math.min(Math.max(targetTop, 0), maxScroll),
        behavior: 'smooth'
    });
}

document.addEventListener('click', (event) => {
    const multipliersToggleButton = event.target.closest('[data-multipliers-toggle]');
    const multipliersViewAllButton = event.target.closest('[data-multipliers-view-all]');
    const betTabButton = event.target.closest('[data-bet-tab]');
    const giftsUseNowButton = event.target.closest('[data-gifts-use-now]');
    const openButton = event.target.closest('[data-popup-open]');
    const howPlayNextButton = event.target.closest('[data-how-play-next]');
    const howPlayDotButton = event.target.closest('[data-how-play-step]');
    const avatarChoice = event.target.closest('.avatar-choice');


    if (avatarChoice) {
        event.preventDefault();
        let item = event.target.closest('.avatar-choice');
        if(item.classList.contains('active')) return false;

        if(document.querySelector('.avatar-choice.active')) document.querySelector('.avatar-choice.active').classList.remove('active');
        item.classList.add('active');
        PostCustomEvent(token, 'jetx.change.client.avatar');
        //menuToggle.click();
        const avatarToggle = menuPanel ? menuPanel.querySelector('.avatar-toggle') : null;
        if (avatarToggle) avatarToggle.checked = false;
        return;
    }



    if (multipliersToggleButton) {
        event.preventDefault();
        setMultipliersExpanded(!multipliersPanel?.classList.contains('is-multipliers-expanded'));
        return;
    }

    if (multipliersViewAllButton) {
        event.preventDefault();
        setMultipliersExpanded(false);
        document.querySelector('.line-tab[data-count="100"]').click();
        if (app?.classList.contains('is-side-closed')) {
            sidebarToggle?.click();
        }
        document.querySelector('[data-side-tab="rounds"]')?.click();
        if (isMobileLikeViewport() && sidebar) {
            window.requestAnimationFrame(() => {
                //sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
                scrollToElement(sidebar, 0);
            });
        }
        return;
    }

    if (betTabButton) {
        event.preventDefault();
        if (
            betTabButton.dataset.betTab === 'cash'
            && typeof isGiftCashExitLocked === 'function'
            && isGiftCashExitLocked()
        ) {
            return;
        }
        setGiftMode(betTabButton.dataset.betTab === 'gift');
        return;
    }

    if (giftsUseNowButton) {
        event.preventDefault();
        giftButtonAccept();
        return;
    }

    if (openButton) {
        event.preventDefault();
        openPopup(openButton.dataset.popupOpen);
        return;
    }

    if (howPlayDotButton) {
        event.preventDefault();
        setHowPlayStep(Number(howPlayDotButton.dataset.howPlayStep));
        return;
    }

    if (howPlayNextButton) {
        event.preventDefault();

        if (howPlayStep >= howPlaySteps.length - 1) {
            closePopup(howPlayPopup || 'how-to-play');
        } else {
            setHowPlayStep(howPlayStep + 1);
        }

        return;
    }

    const fourBetInfoOption = event.target.closest('[data-four-bet-info-mode]');
    if (fourBetInfoOption) {
        event.preventDefault();
        const choice = fourBetInfoOption.dataset.fourBetInfoMode;
        const mode = choice === 'four' ? 'four' : 'classic';
        const modeButton = document.querySelector(`[data-bet-mode="${mode}"]`);
        if (
            modeButton
            && typeof applyBetMode === 'function'
            && !modeButton.disabled
            && !modeButton.classList.contains('mode-card--disabled')
            && !modeButton.classList.contains('mode-card--visual-disabled')
            && !isBetModeDowngradeBlocked(mode)
        ) {
            applyBetMode(mode, modeButton, true);
            if (mode === 'four' && typeof markFourModeNewSeen === 'function') {
                markFourModeNewSeen();
            }
        }
        closePopup(FOUR_BET_INFO_POPUP);
        window.setTimeout(() => {
            if (typeof showFourBetMenuSpotlight === 'function') showFourBetMenuSpotlight();
        }, popupAnimationMs);
        return;
    }

    const popupCloseButton = event.target.closest('[data-popup-close]');
    const popupBackdrop = event.target.classList.contains('game-modal')
        && !event.target.hasAttribute('data-popup-persistent')
        ? event.target
        : null;

    if (popupCloseButton || popupBackdrop) {
        //jetX.canvas.playSound(4, 'button');
        const targetPopup = popupCloseButton?.closest('[data-popup]') || popupBackdrop;
        if (targetPopup) {
            closePopup(targetPopup);
        } else {
            closePopups();
        }
    }
});



document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setMultipliersExpanded(false);
        hideCollectMobileModal();
        
        const persistentOpen = document.querySelector('[data-popup][data-popup-persistent]:not([hidden])');
        if (persistentOpen) return;

        const openHelp = Array.from(popups).find((popup) =>
            HELP_POPUPS.has(popup.dataset.popup) && isPopupVisible(popup));
        if (openHelp) {
            closePopup(openHelp);
            return;
        }

        closePopups();
    }
});

const menuPreferenceIds = ['menu-music', 'menu-sounds', 'menu-animation', 'top3-winner-toggle'];
const menuPreferencesKey = 'menuPreferences';
const fourModeNewKey = 'fourModeNewSeen';
const fourModeNewExitMs = 220;

function isDefaultBetPanelConfigured() {
    return typeof visualConfig !== 'undefined' && !!visualConfig.defaultBetPanel;
}

function hasSeenFourModeNew() {
    if (!localStorageAllow) return true;
    try {
        return localStorage.getItem(fourModeNewKey) === '1';
    } catch (e) {
        return true;
    }
}

function hideFourModeNewElement(el, animate) {
    if (!el || el.hidden || el.classList.contains('is-leaving')) return;

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.classList.remove('is-leaving');
        el.removeEventListener('animationend', onEnd);
    };

    const onEnd = (event) => {
        if (event.target !== el || event.animationName !== 'four-mode-new-exit') return;
        finish();
    };

    if (!animate || reducedMotionQuery.matches) {
        finish();
        return;
    }

    el.classList.add('is-leaving');
    el.addEventListener('animationend', onEnd);
    window.setTimeout(finish, fourModeNewExitMs + 50);
}

function syncFourModeNewIndicators(animate = false) {
    const show = localStorageAllow
        && !hasSeenFourModeNew()
        && typeof isBetPanelDisabled === 'function'
        && !isBetPanelDisabled('four');

    document.querySelectorAll('[data-four-mode-new]').forEach((el) => {
        const showThis = show && !(el.classList.contains('menu-new-dot') && isDefaultBetPanelConfigured());
        if (showThis) {
            el.classList.remove('is-leaving');
            el.hidden = false;
            el.setAttribute('aria-hidden', 'false');
            return;
        }
        hideFourModeNewElement(el, animate);
    });
}

function markFourModeNewSeen() {
    if (!hasSeenFourModeNew() && localStorageAllow) {
        try {
            localStorage.setItem(fourModeNewKey, '1');
        } catch (e) {
            /* ignore */
        }
    }
    syncFourModeNewIndicators(true);
}

function loadMenuPreferences() {
    if (!localStorageAllow) return;

    let prefs = null;
    try {
        prefs = JSON.parse(localStorage.getItem(menuPreferencesKey));
    } catch (e) {
        prefs = null;
    }
    if (!prefs || typeof prefs !== 'object') return;

    menuPreferenceIds.forEach((id) => {
        if (typeof prefs[id] !== 'boolean') return;
        const el = document.getElementById(id);
        if (el) el.checked = prefs[id];
    });
}

function saveMenuPreference(id, checked) {
    if (!localStorageAllow || !menuPreferenceIds.includes(id)) return;

    let prefs = {};
    try {
        prefs = JSON.parse(localStorage.getItem(menuPreferencesKey)) || {};
    } catch (e) {
        prefs = {};
    }
    prefs[id] = !!checked;
    localStorage.setItem(menuPreferencesKey, JSON.stringify(prefs));
}

function syncAnimationOffLayout() {
    const menuAnimation = document.getElementById('menu-animation');
    const appEl = document.querySelector('.app');
    const playFooter = document.querySelector('.play-footer');
    const stageEl = document.querySelector('.stage');
    const topbar = document.querySelector('.topbar');
    if (!menuAnimation || !appEl) return;

    const animationOff = !menuAnimation.checked;
    appEl.classList.toggle('is-animation-off', animationOff);

    const isLandscape = typeof mobileLandscapeQuery !== 'undefined' && mobileLandscapeQuery.matches;
    if (isLandscape && topbar) {
        appEl.style.setProperty('--x-pattern-top', `${topbar.offsetHeight}px`);
    } else {
        appEl.style.removeProperty('--x-pattern-top');
    }

    if (!playFooter) return;

    const betDockCompact = appEl.classList.contains('is-bet-parallax-compact')
        || appEl.classList.contains('is-bet-action-hitbox');
    const useDefaultOffsets = !animationOff || !stageEl || betDockCompact || isLandscape;

    if (useDefaultOffsets) {
        playFooter.style.removeProperty('--stage-hud-offset-y');
        playFooter.style.removeProperty('--play-bets-offset-y');
        return;
    }

    const stageRect = stageEl.getBoundingClientRect();
    const footerRect = playFooter.getBoundingClientRect();
    const visibleTop = Math.max(stageRect.top, 0);
    const span = Math.max(0, footerRect.top - visibleTop);
    if (span <= 0) return;

    const ratio = appEl.classList.contains('mode-4') ? 0.42 : 0.5;
    const centerY = span * ratio;
    playFooter.style.setProperty('--stage-hud-offset-y', `${-centerY}px`);
    playFooter.style.setProperty('--play-bets-offset-y', `${-centerY + 56}px`);
}

(function initMenuPreferences() {
    loadMenuPreferences();
    menuPreferenceIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            saveMenuPreference(id, el.checked);
            if (id === 'menu-animation') syncAnimationOffLayout();
        });
    });
    syncAnimationOffLayout();
})();

if (menuToggle && menuPanel) {
    const avatarToggle = menuPanel.querySelector('.avatar-toggle');
    const limitsToggle = menuPanel.querySelector('.limits-toggle');

    const setMenuOpen = (open) => {
        menuPanel.hidden = !open;
        menuPanel.setAttribute('aria-hidden', String(!open));
        menuToggle.setAttribute('aria-expanded', String(open));
        promoPrizeIcon(true);

        if (open) {
            if (typeof dismissAllButtonErrors === 'function') dismissAllButtonErrors();
            if (typeof dismissAllWinToasts === 'function') dismissAllWinToasts();
        }

        if (!open) {
            if (avatarToggle) avatarToggle.checked = false;
            if (limitsToggle) limitsToggle.checked = false;
        }
    };

    menuToggle.addEventListener('click', () => {
        setMenuOpen(menuPanel.hidden);
    });

    document.addEventListener('click', (event) => {
        if (!event.isTrusted) return;
        if (menuPanel.hidden || menuPanel.contains(event.target) || menuToggle.contains(event.target)) {
            return;
        }

        setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menuPanel.hidden) {
            setMenuOpen(false);
            menuToggle.focus();
        }
    });

    menuPanel.addEventListener('touchmove', (event) => {
        const scroller = event.target.closest('.menu-body, .avatar-panel, .limits-panel');
        if (!scroller || scroller.scrollHeight <= scroller.clientHeight) {
            event.preventDefault();
        }
    }, { passive: false });
}

if (app && sidebarToggle && sidebar) {
    const sidebarIcon = sidebarToggle.querySelector('use');

    const setSidebarCollapsed = (collapsed) => {
        app.classList.toggle('is-side-closed', collapsed);
        sidebar.setAttribute('aria-hidden', String(collapsed));
        sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
        sidebarToggle.setAttribute('aria-label', collapsed ? 'Show sidebar' : 'Hide sidebar');
        updateMultipliersToggleVisibility();
        if (!collapsed && typeof gameStats !== 'undefined' && gameStats.flushVisibleSidePanels) {
            gameStats.flushVisibleSidePanels();
        }
    };

    sidebarToggle.addEventListener('click', () => {
        setSidebarCollapsed(!app.classList.contains('is-side-closed'));
    });

    app.addEventListener('transitionend', (event) => {
        if (event.target !== app || event.propertyName !== 'grid-template-columns') return;
        updateMultipliersToggleVisibility();
    });
}

if (app && sidebar && playFooter) {
    let landscapePadTop = -1;
    const betDockWrap = document.querySelector('.bet-dock-wrap');
    const landscapeBetLayer = betDockWrap || playFooter;

    const measureLandscapeBetHeight = () => {
        if (!betDock) {
            return landscapeBetLayer.offsetHeight;
        }

        return Math.max(0, Math.ceil(betDock.offsetHeight));
    };

    const updateLandscapeBetTransform = () => {
        if (!mobileLandscapeQuery.matches) {
            landscapeBetLayer.style.transform = '';
            playFooter.style.transform = '';
            return;
        }

        landscapeBetLayer.style.transform = `translateY(${-sidebar.scrollTop}px)`;
    };

    const syncLandscapeSideScroll = () => {
        if (!mobileLandscapeQuery.matches) {
            landscapeBetLayer.style.transform = '';
            playFooter.style.transform = '';
            sidebar.style.paddingTop = '';
            landscapePadTop = -1;
            return;
        }

        const footerHeight = measureLandscapeBetHeight();
        if (footerHeight !== landscapePadTop) {
            landscapePadTop = footerHeight;
            sidebar.style.paddingTop = `${footerHeight}px`;
        }

        updateLandscapeBetTransform();
    };

    const scrollLandscapeSideBy = (delta) => {
        if (!mobileLandscapeQuery.matches || !delta) {
            return false;
        }

        const maxScroll = sidebar.scrollHeight - sidebar.clientHeight;

        if (maxScroll <= 0) {
            return false;
        }

        const nextScroll = Math.max(0, Math.min(maxScroll, sidebar.scrollTop + delta));

        if (nextScroll === sidebar.scrollTop) {
            return false;
        }

        sidebar.scrollTop = nextScroll;
        updateLandscapeBetTransform();
        return true;
    };
    let playFooterTouchY = 0;

    const getLandscapeNestedScroller = (target) => {
        const el = target instanceof Element
            ? target.closest('.bets-body, .tab-panel--rounds')
            : null;
        if (!el || el === sidebar) return null;

        const overflowY = getComputedStyle(el).overflowY;
        if (overflowY !== 'auto' && overflowY !== 'scroll') return null;
        if (el.scrollHeight <= el.clientHeight + 1) return null;
        return el;
    };

    const nestedCanScroll = (el, delta) => {
        if (!el || !delta) return false;
        if (delta > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        return el.scrollTop > 0;
    };

    const onLandscapeTouchStart = (event) => {
        if (!mobileLandscapeQuery.matches || event.touches.length !== 1) {
            return;
        }

        playFooterTouchY = event.touches[0].clientY;
    };
    const onLandscapeTouchMove = (event) => {
        if (!mobileLandscapeQuery.matches || event.touches.length !== 1) {
            return;
        }

        const nextTouchY = event.touches[0].clientY;
        const delta = playFooterTouchY - nextTouchY;
        const nested = getLandscapeNestedScroller(event.target);

        // Android: let players/top/rounds list scroll natively when it still can.
        if (nestedCanScroll(nested, delta)) {
            playFooterTouchY = nextTouchY;
            return;
        }

        if (scrollLandscapeSideBy(delta)) {
            event.preventDefault();
            playFooterTouchY = nextTouchY;
        }
    };

    if (typeof ResizeObserver !== 'undefined' && betDock) {
        new ResizeObserver(syncLandscapeSideScroll).observe(betDock);
    }

    sidebar.addEventListener('scroll', updateLandscapeBetTransform, { passive: true });
    sidebar.addEventListener('touchstart', onLandscapeTouchStart, { passive: true });
    sidebar.addEventListener('touchmove', onLandscapeTouchMove, { passive: false });
    landscapeBetLayer.addEventListener('wheel', (event) => {
        if (scrollLandscapeSideBy(event.deltaY)) {
            event.preventDefault();
        }
    }, { passive: false });
    landscapeBetLayer.addEventListener('touchstart', onLandscapeTouchStart, { passive: true });
    landscapeBetLayer.addEventListener('touchmove', onLandscapeTouchMove, { passive: false });
    window.addEventListener('resize', () => {
        syncLandscapeSideScroll();
        updateRoundWinnersCompactTop();
    });
    document.addEventListener('jetx:bet-mode-change', syncLandscapeSideScroll);
    document.addEventListener('jetx:gift-mode-change', syncLandscapeSideScroll);
    mobileLandscapeQuery.addEventListener('change', () => {
        if (mobileLandscapeQuery.matches) {
            app.classList.remove('is-side-closed');
            sidebar.setAttribute('aria-hidden', 'false');
            sidebar.scrollTop = 0;
        }

        if (typeof gameStats !== 'undefined' && gameStats?.roundsView?.draw) {
            gameStats.roundsView.draw();
        }
        if (typeof gameStats !== 'undefined' && gameStats.flushVisibleSidePanels) {
            gameStats.flushVisibleSidePanels();
        }

        syncLandscapeSideScroll();
        updateRoundWinnersCompactTop();
        if (typeof syncAnimationOffLayout === 'function') {
            syncAnimationOffLayout();
        }
    });
    syncLandscapeSideScroll();
    updateRoundWinnersCompactTop();
}

if (app && betModeButtons.length) {
    let compactBetState = null;
    let compactBetActionsState = null;
    let compactBetFrame = 0;
    const compactBetScrollOffset = 120;
    const compactBetLayoutProgress = 0.45;
    const compactBetActions = setupCompactBetActions();
    const compactBetParallaxDefaults = {
        dockHeights: {
            single: 8.5,
            classic: 16.0625,
            double: 12.75,
            four: visualConfig.disableBetAllAndCashoutAll ? 17.75 : 21.75
        },
        dockCompactHeights: {
            single: 6,
            classic: 6,
            double: 6,
            four: 8.5
        },
        giftDockHeights: {
            single: 11,
            classic: 16.0625,
            double: 14.25
        },
        giftDockCompactHeight: 6,
        dockPaddingY: 0.75,
        compactActionsHeight: 4.5,
        compactActionsTravel: 2,
        layoutProgressExponent: 1.18,
        // Scroll progress (0→1) timing — tweak these to retune the compact transition
        panelFadeOutSpeed: 2.2,              // 1.4 → higher → bottom panel disappears sooner
        compactActionsFadeInStart: 0.45,     // 0.25 when descending compact-bet-actions start appearing
        compactActionsFadeInRange: 0.55,     // 0.75 scroll span from start → fully visible (1 - start)
        compactActionsInteractiveAt: 0.25,   // 0.25 when compact actions accept pointer events
        compactActionsCompleteAt: 1          // 1 when is-bet-parallax-compact locks in
    };
    const {
        panelFadeOutSpeed,
        compactActionsFadeInStart,
        compactActionsFadeInRange,
        compactActionsInteractiveAt: compactBetActionHitProgress,
        compactActionsCompleteAt: compactBetActionProgress
    } = compactBetParallaxDefaults;

    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const getCompactScrollMetrics = () => {
        const scroller = document.scrollingElement || document.documentElement;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const scrollTop = Math.max(window.scrollY || 0, scroller?.scrollTop || 0);
        const maxScroll = Math.max(0, (scroller?.scrollHeight || 0) - viewportHeight);

        return {scrollTop, maxScroll};
    };

    const getActiveBetMode = () => {
        if (app.classList.contains('mode-1')) return 'single';
        if (app.classList.contains('mode-classic')) return 'classic';
        if (app.classList.contains('mode-4')) return 'four';
        return 'double';
    };

    const setBetDockParallax = (progress) => {
        if (!mobileQuery.matches) {
            app.style.removeProperty('--bet-dock-collapse');
            app.style.removeProperty('--bet-layout-collapse');
            app.style.removeProperty('--bet-panel-opacity');
            app.style.removeProperty('--compact-actions-opacity');
            app.style.removeProperty('--compact-actions-y');
            return;
        }

        const activeMode = getActiveBetMode();
        const isGiftMode = app.classList.contains('is-gift-mode');
        const safeProgress = clamp(progress);
        const layoutProgress = Math.pow(safeProgress, compactBetParallaxDefaults.layoutProgressExponent);
        const panelOpacity = clamp(1 - safeProgress * panelFadeOutSpeed);
        const compactActionsOpacity = clamp(
            (safeProgress - compactActionsFadeInStart) / compactActionsFadeInRange
        );
        const giftDockMode = activeMode === 'classic' || activeMode === 'single'
            ? activeMode
            : 'double';
        const dockHeight = isGiftMode
            ? compactBetParallaxDefaults.giftDockHeights[giftDockMode]
            : compactBetParallaxDefaults.dockHeights[activeMode];
        const dockCompactHeight = isGiftMode
            ? compactBetParallaxDefaults.giftDockCompactHeight
            : compactBetParallaxDefaults.dockCompactHeights[activeMode];
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const compactScale = viewportHeight > 0 && viewportHeight <= 630
            ? Math.min(1, viewportHeight / 630)
            : 1;
        const dockCompactHeightScaled = dockCompactHeight * compactScale;
        const dockCollapse = Math.max(0, dockHeight - dockCompactHeightScaled) * layoutProgress;
        const layoutCollapseHeight = activeMode === 'four' || isGiftMode
            ? dockHeight - dockCompactHeightScaled
            : compactBetParallaxDefaults.dockHeights.classic
                - compactBetParallaxDefaults.dockCompactHeights.classic * compactScale;
        const layoutCollapse = Math.max(0, layoutCollapseHeight) * layoutProgress;
        const compactActionsY = -compactBetParallaxDefaults.compactActionsTravel * compactScale * (1 - compactActionsOpacity);

        app.style.setProperty('--bet-dock-collapse', `${dockCollapse.toFixed(4)}rem`);
        app.style.setProperty('--bet-layout-collapse', `${layoutCollapse.toFixed(4)}rem`);
        app.style.setProperty('--bet-panel-opacity', panelOpacity.toFixed(3));
        app.style.setProperty('--compact-actions-opacity', compactActionsOpacity.toFixed(3));
        app.style.setProperty('--compact-actions-y', `${compactActionsY.toFixed(4)}rem`);
    };

    const setCompactBetButtons = (compact, actionsInteractive = compact) => {
        const compactActionsActive = actionsInteractive;
        const compactActionsComplete = compact;

        if (compactBetState === compact && compactBetActionsState === compactActionsActive) return;

        compactBetState = compact;
        compactBetActionsState = compactActionsActive;
        compactBetActions?.setActive(compactActionsActive);
        app.classList.remove('is-bet-compact');
        app.classList.toggle('is-bet-action-hitbox', compactActionsActive);
        app.classList.toggle('is-bet-parallax-compact', compactActionsComplete);
        compactBetButtons.forEach((button) => button.classList.remove('is-compact-bet'));
        syncAnimationOffLayout();
        if (typeof gameStats !== 'undefined' && gameStats.playersView) {
            gameStats.playersView.refreshDesktopWindow();
        }
    };

    const updateCompactBetState = () => {
        compactBetFrame = 0;
        if (mobileQuery.matches && isKeyboardInputActive()) return;

        const scrollMetrics = getCompactScrollMetrics();
        const compactScrollTop = scrollMetrics.scrollTop;
        const betDockParallaxActive = mobileQuery.matches;
        const betDockProgress = betDockParallaxActive
            ? (reducedMotionQuery.matches
                ? Number(scrollMetrics.maxScroll > 0 && compactScrollTop >= scrollMetrics.maxScroll)
                : (scrollMetrics.maxScroll > 0 ? clamp(compactScrollTop / scrollMetrics.maxScroll) : 0))
            : 0;
        const compact = mobileQuery.matches && (betDockParallaxActive
            ? betDockProgress >= compactBetActionProgress
            : compactScrollTop > compactBetScrollOffset);
        const actionsInteractive = mobileQuery.matches && (betDockParallaxActive
            ? betDockProgress > compactBetActionHitProgress
            : compactScrollTop > compactBetScrollOffset);

        setBetDockParallax(betDockProgress);
        setCompactBetButtons(compact, actionsInteractive);
        updateRoundWinnersCompactTop();
    };

    const requestCompactBetState = () => {
        if (compactBetFrame) return;
        compactBetFrame = requestAnimationFrame(updateCompactBetState);
    };

    let betScrollIdleTimer = 0;
    const betScrollIdleDelay = 160;
    const clearBetScrolling = () => {
        betScrollIdleTimer = 0;
        app.classList.remove('is-bet-scrolling');
    };
    const markBetScrolling = () => {
        if (mobileQuery.matches) {
            app.classList.add('is-bet-scrolling');
        }
        if (betScrollIdleTimer) clearTimeout(betScrollIdleTimer);
        betScrollIdleTimer = window.setTimeout(clearBetScrolling, betScrollIdleDelay);
    };
    const onBetScroll = () => {
        markBetScrolling();
        requestCompactBetState();
    };

    let snapTimer = 0;
    let snapInProgress = false;
    let isTouching = false;
    const snapIdleDelay = 1;

    const maybeSnapScroll = () => {
        snapTimer = 0;
        if (Date.now() < suppressSnapUntil) return;
        if (isTouching || !mobileQuery.matches || isKeyboardInputActive()) return;
        const { scrollTop, maxScroll } = getCompactScrollMetrics();
        if (maxScroll < 24 || scrollTop <= 0 || scrollTop >= maxScroll) return;
        const target = scrollTop >= maxScroll / 2 ? maxScroll : 0;
        if (Math.abs(target - scrollTop) < 1) return;
        snapInProgress = true;
        window.scrollTo({ top: target, behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
        window.setTimeout(() => { snapInProgress = false; }, 450);
    };

    const scheduleSnapScroll = () => {
        if (snapInProgress || isTouching) return;
        if (snapTimer) clearTimeout(snapTimer);
        snapTimer = window.setTimeout(maybeSnapScroll, snapIdleDelay);
    };

    const onWindowScroll = () => {
        onBetScroll();
        scheduleSnapScroll();
    };

    window.addEventListener('touchstart', () => {
        isTouching = true;
        snapInProgress = false;
        if (snapTimer) { clearTimeout(snapTimer); snapTimer = 0; }
    }, { passive: true });

    const onTouchRelease = () => {
        isTouching = false;
        scheduleSnapScroll();
    };
    window.addEventListener('touchend', onTouchRelease, { passive: true });
    window.addEventListener('touchcancel', onTouchRelease, { passive: true });

    const pinCompactScroll = () => {
        if (!mobileQuery.matches) return;
        setBetDockParallax(1);
        const scroller = document.scrollingElement || document.documentElement;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const maxScroll = Math.max(0, (scroller?.scrollHeight || 0) - viewportHeight);
        if (maxScroll <= 0) return;
        scroller.scrollTop = maxScroll;
        suppressSnapUntil = Date.now() + 450;
    };

    const setBetMode = (mode, selectedButton, persist = true) => {
        if (typeof mixpanelPanelState === 'function') mixpanelPanelState(mode);

        const preserveCompact = mobileQuery.matches && compactBetState === true;

        app.classList.toggle('mode-1', mode === 'single');
        app.classList.toggle('mode-double', mode === 'double');
        app.classList.toggle('mode-classic', mode === 'classic');
        app.classList.toggle('mode-4', mode === 'four');

        if (preserveCompact) pinCompactScroll();
        updateCompactBetState();
        document.dispatchEvent(new Event('jetx:bet-mode-change'));

        betModeButtons.forEach((button) => {
            const isSelected = button === selectedButton;
            button.classList.toggle('mode-card--active', isSelected);
            button.setAttribute('aria-pressed', String(isSelected));
        });

        if(typeof jetX !== 'undefined') jetX.resize();

        if (typeof scheduleFitTextAll === 'function') {
            scheduleFitTextAll(document.querySelector('.bet-panel') || betDock);
        }
        const refitCollect = () => {
            if (typeof fitCollectAmount !== 'function') return;
            document.querySelectorAll('.collect-value-amount').forEach((el) => fitCollectAmount(el));
        };
        requestAnimationFrame(() => requestAnimationFrame(refitCollect));
        clearTimeout(setBetMode._collectFitTimer);
        setBetMode._collectFitTimer = setTimeout(refitCollect, 240);

        if (preserveCompact) {
            requestAnimationFrame(() => {
                pinCompactScroll();
                updateCompactBetState();
            });
        }

        if (persist && localStorageAllow) localStorage.setItem('betMode', mode);
        syncGiftBetModeLocks();
    };
    applyBetMode = setBetMode;

    const expandToDoubleBtn = document.querySelector('[data-expand-to-double]');
    expandToDoubleBtn?.addEventListener('click', () => {
        const targetMode = isMobileLikeViewport() ? 'double' : 'classic';
        const targetButton = Array.from(betModeButtons).find((button) => button.dataset.betMode === targetMode);
        if (!targetButton || targetButton.disabled || targetButton.classList.contains('mode-card--disabled')) return;
        const giftDockOpen = app.classList.contains('is-gift-mode');
        if (isBetPanelDisabled(targetMode) && !(giftDockOpen && giftAllowedBetModes.has(targetMode))) return;
        setBetMode(targetMode, targetButton, !giftDockOpen);
    });

    betModeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const mode = button.dataset.betMode;
            if (
                button.classList.contains('mode-card--bet-locked')
                || button.classList.contains('mode-card--gift-locked')
                || isBetModeDowngradeBlocked(mode)
            ) {
                showBetModeLockedWarning();
                return;
            }
            if (button.disabled || button.classList.contains('mode-card--disabled')) return;
            const giftDockOpen = app.classList.contains('is-gift-mode');
            if (isBetPanelDisabled(mode) && !(giftDockOpen && giftAllowedBetModes.has(mode))) return;

            setBetMode(mode, button, !giftDockOpen);
            if (mode === 'four') markFourModeNewSeen();
        });
    });

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    window.addEventListener('resize', requestCompactBetState);
    sidebar?.addEventListener('scroll', onBetScroll, { passive: true });
    mobileQuery.addEventListener('change', updateCompactBetState);
    reducedMotionQuery.addEventListener('change', updateCompactBetState);
    document.addEventListener('jetx:gift-mode-change', () => {
        compactBetActionsState = null;
        updateCompactBetState();
        if (typeof jetX !== 'undefined') jetX.resize();
    });
    document.addEventListener('focusout', (event) => {
        if (isKeyboardInput(event.target)) {
            window.setTimeout(requestCompactBetState, 250);
        }
    });
    updateCompactBetState();
    syncGiftBetModeLocks();

    //window.addEventListener('load', () => {
    const applyInitialBetMode = () => {
        const initialBetMode = resolveInitialBetMode(getCurrentBetMode() || 'double');
        const initialButton = Array.from(betModeButtons).find((button) => button.dataset.betMode === initialBetMode);
        if (
            initialButton
            && !isBetPanelDisabled(initialBetMode)
            && !initialButton.classList.contains('mode-card--active')
        ) {
            setBetMode(initialBetMode, initialButton, false);
        } else if (typeof mixpanelPanelState === 'function') {
            mixpanelPanelState(getCurrentBetMode() || initialBetMode);
        }
        syncGiftBetModeLocks();
        syncFourModeNewIndicators();
    };
    if (window.jetxNewLoaderStorage && !window.jetxNewLoaderStorage.ready) {
        window.jetxNewLoaderStorage.whenReady(applyInitialBetMode);
    } else {
        applyInitialBetMode();
    }
    if (window.jetxNewLoaderStorage) {
        window.jetxNewLoaderStorage.whenHydrated(applyInitialBetMode);
    }
    //});
}

function setupCompactBetActions() {
    if (!betDock || betDock.querySelector('[data-compact-bet-actions]')) return null;

    const sourceButtons = [0, 1, 2, 3, 4, 5]
        .map((buttonId) => document.getElementById(`bet-${buttonId}`))
        .filter(Boolean);

    if (sourceButtons.length < 4) return null;

    const actions = document.createElement('div');
    actions.className = 'compact-bet-actions';
    actions.dataset.compactBetActions = '';
    actions.inert = true;
    actions.setAttribute('aria-hidden', 'true');

    const compactEntries = sourceButtons.map((sourceButton) => {
        const buttonIndex = Number(sourceButton.dataset.button);
        const isGiftButton = buttonIndex >= 4;
        const compactButton = document.createElement('button');
        compactButton.type = 'button';
        compactButton.tabIndex = -1;
        if (isGiftButton) {
            compactButton.classList.add('compact-bet-button--gift');
            compactButton.dataset.compactGift = '';
        }
        compactButton.addEventListener(clickEvent, (event) => {
            if (event.button > 0) return;
            event.stopPropagation();

            if (compactButton.disabled || sourceButton.disabled || sourceButton.classList.contains('disabled')) return;
            if (typeof triggerBetButton === 'function') {
                triggerBetButton(sourceButton);
            } else {
                sourceButton.dispatchEvent(new Event(clickEvent, { bubbles: true }));
            }
        });

        const syncCompactButton = () => {
            const classes = Array.from(sourceButton.classList)
                .filter((className) => className !== 'bet-button' && className !== 'is-compact-bet');
            const mirrorAttributes = ['data-button', 'data-attr', 'aria-disabled', 'aria-label', 'aria-pressed', 'title'];

            compactButton.className = `${classes.join(' ')} compact-bet-button${isGiftButton ? ' compact-bet-button--gift' : ''}`;
            compactButton.disabled = sourceButton.disabled || sourceButton.classList.contains('disabled');

            mirrorAttributes.forEach((attribute) => {
                const value = sourceButton.getAttribute(attribute);
                if (value === null) {
                    compactButton.removeAttribute(attribute);
                    return;
                }

                compactButton.setAttribute(attribute, value);
            });

            compactButton.replaceChildren(...Array.from(sourceButton.children, (child) => {
                const clone = child.cloneNode(true);
                clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
                return clone;
            }));
        };

        let syncFrame = 0;
        const requestSync = () => {
            if (syncFrame) return;
            syncFrame = requestAnimationFrame(() => {
                syncFrame = 0;
                syncCompactButton();
            });
        };

        const observer = new MutationObserver(requestSync);

        syncCompactButton();
        observer.observe(sourceButton, {
            attributes: true,
            attributeFilter: ['class', 'disabled', 'aria-disabled', 'aria-label', 'aria-pressed', 'data-attr', 'data-button', 'title'],
            childList: true,
            characterData: true,
            subtree: true
        });
        actions.append(compactButton);

        return {
            compactButton,
            disconnect() {
                observer.disconnect();
                if (syncFrame) {
                    cancelAnimationFrame(syncFrame);
                    syncFrame = 0;
                }
            },
            sync: syncCompactButton
        };
    });

    betDock.append(actions);

    const setActive = (active) => {
        actions.inert = !active;
        actions.setAttribute('aria-hidden', String(!active));

        compactEntries.forEach((entry) => {
            entry.compactButton.tabIndex = active ? 0 : -1;
            entry.sync();
        });
    };

    return {setActive};
}

if (betTabButtons.length) {
    setGiftMode(app?.classList.contains('is-gift-mode'));
}













document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

/* <Lobby */
document.addEventListener(clickEvent, function (e) {
    const lobbyIcon = e.target.closest('.lobby-icon');
    if (!lobbyIcon) return;
    e.stopPropagation();
    const lobbyOptions = {
        balance: Number(player.availableAmount).toFixed(2),
        userName: player.displayName,
        mobileDevice: mobile
    };

    window.parent.postMessage({
        name: 'open-lobby',
        data: lobbyOptions
    }, '*');
});

window.addEventListener('message', function (event) {
    if (!event.data) return;
    if (event.data.name === 'lobby-ready') {
        const lobbyIcon = document.querySelector('.lobby-icon');
        if (lobbyIcon) {
            lobbyIcon.classList.add('is-visible');
        }
    } else if (event.data.name === 'lobby-error') {
        const lobbyIcon = document.querySelector('.lobby-icon');
        if (lobbyIcon) {
            lobbyIcon.classList.remove('is-visible');
        }
    } else if (event.data.name === 'lobby-is-open') {
        const input = document.querySelector('.sound-menu-a.sound-all .sound-checkbox input');
        const span = document.querySelector('.sound-menu-a.sound-all .sound-checkbox span');
        if (input && span && input.checked) {
            span.dispatchEvent(new Event(clickEvent, { bubbles: true }));
        }
    } else if (event.data.name === 'lobby-is-closed') {
        const input = document.querySelector('.sound-menu-a.sound-all .sound-checkbox input');
        const span = document.querySelector('.sound-menu-a.sound-all .sound-checkbox span');
        if (input && span && !input.checked) {
            span.dispatchEvent(new Event(clickEvent, { bubbles: true }));
        }
    }
});
/* Lobby /> */


function checkboxCheck() {
    let checked = false;
    for (let i = 0; i < 4; i++) {
        const ab = document.getElementById(`auto-bet-${i}`);
        if (ab && ab.checked) checked = true;
        const aco = document.getElementById(`auto-cash-out-${i}`);
        if (aco && aco.checked) checked = true;
    }
    if (!checked) {
        addClassAll('.cash-game', 'simple');
        setChecked('auto-bet-all', false);
        setChecked('auto-cash-out-all', false);
    } else {
        removeClassAll('.cash-game', 'simple');
    }

    for (let i = 0; i < 4; i++) {
        const aco = document.getElementById(`auto-cash-out-${i}`);
        if (aco && aco.checked) {
            removeClassAll(`#button-${i} .bet-input.cash-out .input`, 'disabled');
        } else {
            addClassAll(`#button-${i} .bet-input.cash-out .input`, 'disabled');
        }
    }
}

function setInputValue(inputId, defaultValue = '', force = false) {
    if(inputId === undefined) return ;
    const el = document.getElementById(inputId);
    if (!el) return;
    let buttonId = el.id;
    let betButtonId = ``;
    let isBetInput = false;
    let withCurrency = el.classList.contains('with-currency');
    if (buttonId.indexOf('bet-value-') >= 0) {
        buttonId = buttonId.replace('bet-value-', '');
        betButtonId = `#bet-button-${buttonId}`;
        isBetInput = true;
        if (!force && hasClassSelector(`#button-${buttonId}`, 'disabled')) return false;
    }

    let value = el.value;
    if (value === '' && defaultValue !== '') {
        value = defaultValue;
        el.value = defaultValue;
    } else {
        let minBet = 0;
        let maxBet = 0;
        let fixedDigit = 2;
        let maxValue = 1000000000;
        let minMultiplier = 0;
        if (jqData(el, 'maxbet') !== undefined) {
            minBet = parseFloat(jqData(el, 'minbet'));
            maxBet = parseFloat(jqData(el, 'maxbet'));
            fixedDigit = player.currency.fractionDigit;
            if (jurisdictionName === 'pt') fixedDigit = 0;
            minMultiplier = board.minMultiplier;

            if(inputId === 'autoplay-decrease') {
                maxBet = maxValue = 1000000000000000;
            } else if(inputId === 'autoplay-increase') {
                maxBet = maxValue = 1000000000000000;
            } else if(inputId === 'autoplay-win') {
                maxBet = board.maxWinAmount;
                maxValue = board.maxWinAmount;
            }
        } else {
            minBet = parseFloat(board.minAutoCashOut);
            maxBet = parseFloat(board.maxAutoCashOut);
        }
        value = parseInputAmount(value);
        let realValue = value;
        if (jurisdictionName === 'pt' && jqData(el, 'maxbet') !== undefined) value = Math.floor(value);
        value = parseFloat(value.toFixed(fixedDigit));
        const isAutoplayBet = inputId === 'autoplay-bet';
        const isAcBetInput = typeof inputId === 'string' && inputId.indexOf('ac-bet-value-') === 0;
        const exceededMaxBet = (isBetInput || isAutoplayBet || isAcBetInput) && Number.isFinite(maxBet) && realValue > maxBet;
        value = Math.min(Math.max(value, minBet), maxBet, maxValue);
        if (isNaN(value)) value = minBet;
        if (minMultiplier > 0) {
            if (value - Math.floor(value / minMultiplier) * minMultiplier != 0) {
                //value = Math.floor(value / minMultiplier) * minMultiplier;
                value = Math.floor(Math.round(value * Math.pow(10, player.currency.fractionDigit)) / Math.round(minMultiplier * Math.pow(10, player.currency.fractionDigit))) * minMultiplier;
            }
        }
        el.value = withCurrency
            ? formatAmount(value, player.currency, 'input-currency')
            : (isBetInput ? formatAmount(value, player.currency, 'input') : (el.classList.contains('collect-field') ? formatCollectMultiplier(value) : value.toFixed(fixedDigit)));
        // if(withCurrency) {
        //     el.value = formatAmount(value, player.currency, 'input-currency');
        // }

        const stepParent = el.closest('.collect-value, .bet-input') || el.parentNode;
        let minus = stepParent.querySelector('.minus');
        let plus = stepParent.querySelector('.plus');
        if(minus) {
            if(realValue <= minBet) minus.classList.add('disabled');
            else minus.classList.remove('disabled');
        }
        if(plus) {
            if(realValue >= maxBet) plus.classList.add('disabled');
            else plus.classList.remove('disabled');
        }

        if (exceededMaxBet && boardLoaded && board.maxBet > 0) {
            buttonMessage(
                isAcBetInput || isAutoplayBet ? inputId : buttonId,
                GetCaption('jetxnew.bet.max') + '&nbsp;' + formatAmount(board.maxBet, player.currency, 'formated'),
                1500,
                'max'
            );
        }
    }
    if (el.classList.contains('collect-field') && typeof fitCollectAmount === 'function') {
        fitCollectAmount(el);
    }
    el.dispatchEvent(new Event('input', { bubbles: false }));

    if (betButtonId !== ``) {
        setHtmlSelector(betButtonId, `${formatAmount(value, player.currency, 'formated')}`);
        setHtmlSelector(`#bet-status-bet-${buttonId}`, `${formatAmount(value, player.currency, 'formated')}`);
        if (typeof updateBetAllActionTotals === 'function') updateBetAllActionTotals();
    }
}

function inputChangeType(input, type) {
    const el = input instanceof Element ? input : (input && input.length ? input[0] : input);
    if (!el) return;
    if(type === 'bet_input') {
        jqData(el, 'bet_default', false);
        jqData(el, 'bet_input', true);
        mixpanelFirstUsage('firstBetInputTime');
    } else if(type === 'bet_stepper') {
        jqData(el, 'bet_default', false);
        jqData(el, 'bet_stepper', true);
        mixpanelFirstUsage('firstBetStepperTime');
    } else if(type === 'bet_list') {
        jqData(el, 'bet_default', false);
        jqData(el, 'bet_list', true);
        mixpanelFirstUsage('firstBetListTime');
    } else if(type === 'bet_x2') {
        jqData(el, 'bet_default', false);
        jqData(el, 'bet_x2', jqData(el, 'bet_x2') + 1);
    } else if(type === 'autocollect_input') {
        jqData(el, 'autocollect_default', false);
        jqData(el, 'autocollect_input', true);
    } else if(type === 'autocollect_stepper') {
        jqData(el, 'autocollect_default', false);
        jqData(el, 'autocollect_stepper', true);
    }
}

document.addEventListener('keydown', function (e) {
    if (e.which === 122) {
        e.preventDefault();
        return false;
    }
});

window.addEventListener("wheel", function (e) {
    parent.postMessage({'action': 'scroll', 'deltaY': e.deltaY}, "*");
});

onReady(function () {
    let defaultText = '';

    document.querySelectorAll('input.inp').forEach((input) => {
        input.addEventListener('focus', function () {
            defaultText = this.value;
            this.value = '';
        });
        input.addEventListener('change', function () {
            defaultText = this.value;
        });
        input.addEventListener('focusout', function () {
            setInputValue(this.id, defaultText);
        });
    });

    document.querySelectorAll('input.inp').forEach((input) => {
        if (jqData(input, 'maxbet') !== undefined) {
            let maxBet = parseFloat(jqData(input, 'maxbet'));
            if (maxBet > 999999 && input.parentElement) input.parentElement.classList.add('big');
        }

        input.setAttribute('enterkeyhint', 'done');
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('focusout', { bubbles: true }));

        let id = input.id;
        if(id.includes('bet-value')) {
            jqData(input, 'bet_default', true);
            jqData(input, 'bet_input', false);
            jqData(input, 'bet_stepper', false);
            jqData(input, 'bet_list', false);
            jqData(input, 'bet_x2', 0);
        } else {
            jqData(input, 'autocollect_default', true);
            jqData(input, 'autocollect_input', false);
            jqData(input, 'autocollect_stepper', false);
        }
    });
});

delegate('keypress', 'input.inp', function (e) {
    const keyCode = e.keyCode || e.which;
    const keyValue = String.fromCharCode(keyCode);
    const isValidInput = /^[\d.,]$/.test(keyValue);
    if (!isValidInput) {
        e.preventDefault();
    }

    let inputValue = e.target.value + keyValue;
    if (e.target.value === '0' && (e.which !== 46 && e.which !== 44)) {
        inputValue = e.target.value + '.' + keyValue;
        e.target.value = inputValue;
        e.preventDefault();
    }
    const isValidFloat = /^(?!0\d)\d*(\.\d+)?$/.test(inputValue);
    if (e.which !== 46 && e.which !== 44 && !isValidFloat) {
        e.preventDefault();
    }

    let id = this.id;
    inputChangeType(this, id.includes('bet-value') ? 'bet_input' : 'autocollect_input');
});

delegate('beforeinput', 'input.inp', function (event) {
    if (event.data && /[^\d.,]/.test(event.data)) {
        event.preventDefault();
    }
});

delegate('input', 'input.inp', function (event) {
    if (event && event.isTrusted === false) return;
    const value = this.value;
    if (!/[^\d.]/.test(value)) return;
    const pos = this.selectionStart;
    const cleaned = value.replace(/[^\d.,]/g, '');
    const removed = value.length - cleaned.length;
    this.value = cleaned.replace(/,/g, '.');
    try {
        const caret = Math.max(0, (pos || 0) - removed);
        this.setSelectionRange(caret, caret);
    } catch (err) {}
});

delegate('paste', 'input.inp', function (event) {
    if (event.clipboardData.getData('Text').match(/[^\d]/)) {
        event.preventDefault();
    }
});

delegate('keydown', 'input.inp', function (e) {
    const enterKey = e.keyCode || e.which;
    if (enterKey === 13) {
        e.preventDefault();
        e.target.blur();
        return;
    }
    if (e.target.id === 'cash-out-value-0' || e.target.id === 'cash-out-value-1') {
        const keyCode = e.keyCode || e.which;
        let inputValue = e.target.value + '';

        if (inputValue.length >= 6 && keyCode !== 8 && keyCode !== 46 && keyCode !== 37 && keyCode !== 39) {
            e.preventDefault();
        }
    }
});



window.addEventListener("message", function (event) {
    if (event.data === 'update.balance' || event.data.name === 'update-game-balance') {
        PostCustomEvent(token, 'update.balance');
    } else if (event.data === 'mobile-desktop') {
        document.body.classList.add('mobile-desktop');
        mobileDesktop = true;
    } else if (event.data.name === 'promotion-icon-show') {
        jetX.promotionIconVisible = true;
        jetX.promotionIconShow();
    } else if (event.data.name === 'promotion-leaderboard-icon-show') {
        qsaEach('.promotion-dailyleaderboard-button', (el) => fadeIn(el, 0));
    } else if (event.data.name === 'promotion-wheel-icon-show') {
        qsaEach('.promotion-wheel-button', (el) => fadeIn(el, 0));
    } else if (event.data.name === 'fullscreen-bt') {
        if (Date.now() < fullscreenBtIgnoreUntil) return;
        setFullscreenToggle(event.data.active);
    } else if (event.data.name === 'jurisdiction-name') {
        let jurisdiction = event.data.value;
        if(jurisdiction !== undefined && jurisdiction !== null && jurisdiction !== '') jurisdiction.toLowerCase();
        if (jurisdiction) document.body.classList.add(jurisdiction);
    } else if (event.data.name === 'chat') {
        // if(event.data.value === 'no') {
        //     document.body.classList.add('chat-no');
        // }
    } else if (event.data.key === 'reality.check.popup.is.ready') {
        showRealityCheckPopup = true;
    } else if (event.data.key === 'reset.reality.check.popup') {
        showRealityCheckPopup = false;
    } else if (event.data.key === 'reality.check.popup.open.game.history') {
        //document.querySelector('.MyScores').dispatchEvent(new Event(clickEvent, { bubbles: true }));
    } else if (event.data.key === 'reality.check.popup.exit.from.game') {
        leaveGame();
    } else if (event.data.key === 'inactivity.check.popup.show') {
        inactivityCheck = true;
        if (event.data.message) {
            const text = document.getElementById('popup-inactivity-text');
            if (text) text.textContent = event.data.message;
        }
        openPopup('inactivity');
    } else if (event.data.key === 'inactivity.check.popup.hide') {
        inactivityCheck = false;
        const inactivityPopup = document.getElementById('popup-inactivity');
        if (inactivityPopup && !inactivityPopup.hidden) closePopups();
    } else if (event.data.key === 'inactivity.check.popup.exit') {
        leaveGame();
    } else {
        try {
            eval(event.data);
        } catch (e) {

        }
    }
});

delegate(clickEvent, '#balance', function () {
    window.top.postMessage('openCashier', '*');
});

let fullscreenBtIgnoreUntil = 0;

function canFullscreen() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}

// Portals without a viewport meta tag lay the game out at ~980px on phones, so width alone
// cannot tell a real desktop from a phone. Pointer/UA decides, width is only a safety net.
function isRealDesktop() {
    if (typeof mobile !== 'undefined' && mobile) return false;
    if (typeof bowser !== 'undefined' && (bowser.mobile || bowser.tablet)) return false;
    if (window.matchMedia('(any-pointer: coarse)').matches) return false;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
    return window.innerWidth > 1024;
}

function setFullscreenToggle(active) {
    const el = document.getElementById('menu-fullscreen');
    if (el) el.checked = !!active;
}

function requestDocumentFullscreen(on) {
    try {
        if (on) {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (!req) return;
            const result = req.call(el);
            if (result && typeof result.catch === 'function') result.catch(function () {});
        } else {
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (!exit) return;
            const result = exit.call(document);
            if (result && typeof result.catch === 'function') result.catch(function () {});
        }
    } catch (e) {}
}

function requestFullscreenToggle(on) {
    if (!canFullscreen()) return;
    fullscreenBtIgnoreUntil = Date.now() + 500;
    let posted = false;
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ name: on ? 'fullscreen-on' : 'fullscreen-off' }, '*');
            posted = true;
        }
    } catch (e) {}
    if (!posted) requestDocumentFullscreen(on);
}

(function initReturnBackButton() {
    const buttons = document.querySelectorAll('[data-menu-exit]');
    if (!buttons.length) return;

    if (!getReturnUrl()) {
        buttons.forEach((button) => button.remove());
        return;
    }

    buttons.forEach((button) => {
        button.hidden = false;
        button.classList.add('is-visible');
    });
})();

delegate(clickEvent, '[data-menu-exit]', function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof token !== 'undefined' && token !== '') {
        PostCustomEvent(token, 'leave.game');
    } else {
        leaveGame();
    }
});

(function initFullscreenControls() {
    const menuFullscreen = document.getElementById('menu-fullscreen');
    const menuItem = menuFullscreen && (menuFullscreen.closest('.menu-item') || menuFullscreen.closest('label'));

    if (!canFullscreen()) {
        if (menuItem) menuItem.remove();
        return;
    }

    if (menuFullscreen) {
        menuFullscreen.addEventListener('change', function () {
            requestFullscreenToggle(this.checked);
        });
    }
})();

function shouldAutoEnableMobileSound() {
    return portalName === 'betlive' || (typeof portalName === 'string' && portalName.indexOf('adjarabet') >= 0);
}

function applyCanvasSound(enabled) {
    if (typeof jetX === 'undefined' || !jetX || !jetX.canvas) return;
    jetX.canvas.sound = !!enabled;
    jetX.canvas.soundBackground = !!enabled;
    if (typeof jetX.canvas.tabStatusSound === 'function') {
        jetX.canvas.tabStatusSound(jetX.canvas.tabActive && !!enabled);
    }
}

function mobileSound(type) {
    soundPopup = false;
    const enabled = !!type;
    const music = document.getElementById('menu-music');
    const sounds = document.getElementById('menu-sounds');
    if (music) {
        music.checked = enabled;
        music.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (sounds) {
        sounds.checked = enabled;
        sounds.dispatchEvent(new Event('change', { bubbles: true }));
    }
    applyCanvasSound(enabled);
    closePopup(SOUND_POPUP);
    if (typeof mobileNoSleep === 'function') mobileNoSleep();
    if (typeof promoPrizeIcon === 'function') promoPrizeIcon(true, 100);
    if (typeof mixpanelMobileSound === 'function') mixpanelMobileSound(enabled);
}
function initSoundPopup() {
    if (visualConfig.disableSoundPopup) {
        soundPopup = false;
        return;
    }
    if (isRealDesktop()) {
        soundPopup = false;
        return;
    }
    if (shouldAutoEnableMobileSound()) {
        mobileSound(true);
        return;
    }
    if (!canFullscreen()) {
        soundPopup = false;
        return;
    }
    soundPopup = true;
    applyCanvasSound(false);
    openPopup(SOUND_POPUP);
}

if (typeof onReady === 'function') {
    onReady(initSoundPopup);
} else {
    initSoundPopup();
}

function enterFullscreenOnSoundChoice() {
    if (isRealDesktop()) return;
    requestFullscreenToggle(true);
    setFullscreenToggle(true);
}

delegate(clickEvent, '[data-sound-yes]', function () {
    mobileSound(true);
    enterFullscreenOnSoundChoice();
});

delegate(clickEvent, '[data-sound-no]', function () {
    mobileSound(false);
    enterFullscreenOnSoundChoice();
});

delegate(clickEvent, '.round-history', function () {
    window.parent.postMessage({name: 'draw.round.history'}, "*");
});

delegate(clickEvent, '[data-inactivity-exit]', function () {
    leaveGame();
});

delegate(clickEvent, '[data-inactivity-continue]', function () {
    inactivityCheck = false;
    closePopups();
    window.parent.postMessage({ key: 'inactivity.check.popup.continue' }, '*');
});

/* <Version Switch */

const OLD_JETX_REDIRECT_WARNING_MS = 2000;
const versionSwitch = document.querySelector('[data-version-switch]');
const versionSwitchToggle = versionSwitch?.querySelector('[data-version-switch-toggle]');
const versionSwitchMenu = versionSwitch?.querySelector('[data-version-switch-menu]');
const oldJetXRedirectButton = document.querySelector('[data-old-jetx-redirect]');
const oldJetXRedirectWarning = document.querySelector('[data-old-jetx-redirect-warning]');
const oldJetXRedirectWarningText = oldJetXRedirectWarning?.querySelector('[data-old-jetx-redirect-warning-text]');
let oldJetXRedirectWarningTimer = null;
let oldJetXRedirectWarningHideToken = 0;

function isVersionRedirectLocked() {
    const len = (typeof player !== 'undefined' && player?.prevBets?.length) ? player.prevBets.length : 6;
    for (let i = 0; i < len; i++) {
        if (typeof hasActiveBetOnPanel === 'function') {
            if (hasActiveBetOnPanel(i)) return true;
        } else {
            if (typeof player !== 'undefined' && player?.prevBets?.[i]) return true;
            const betButton = document.getElementById(`bet-${i}`);
            if (!betButton) continue;
            if (
                betButton.classList.contains('cancel-bet')
                || betButton.classList.contains('cash-out')
                || betButton.classList.contains('disable')
                || betButton.classList.contains('btn-bet--loading')
            ) return true;
        }
    }
    return false;
}

function setVersionSwitchOpen(open) {
    if (!versionSwitch || !versionSwitchToggle || !versionSwitchMenu) return;
    versionSwitch.classList.toggle('is-open', open);
    versionSwitchToggle.setAttribute('aria-expanded', String(open));
    versionSwitchMenu.hidden = !open;
    if (typeof promoPrizeIcon === 'function') promoPrizeIcon(!open);
}

function closeVersionSwitch() {
    setVersionSwitchOpen(false);
}

function dismissOldJetXRedirectWarning() {
    if (oldJetXRedirectWarningTimer) {
        clearTimeout(oldJetXRedirectWarningTimer);
        oldJetXRedirectWarningTimer = null;
    }
    if (!oldJetXRedirectWarning || oldJetXRedirectWarning.hidden) return;

    const hideToken = ++oldJetXRedirectWarningHideToken;
    oldJetXRedirectWarning.classList.add('mode-switch-warning--leaving');
    const finishHide = () => {
        if (hideToken !== oldJetXRedirectWarningHideToken) return;
        oldJetXRedirectWarning.hidden = true;
        oldJetXRedirectWarning.classList.remove('mode-switch-warning--leaving', 'is-visible');
    };
    oldJetXRedirectWarning.addEventListener('animationend', finishHide, { once: true });
    setTimeout(finishHide, 320);
}

function showOldJetXRedirectLockedWarning() {
    if (!oldJetXRedirectWarning || !oldJetXRedirectWarningText) return;

    if (oldJetXRedirectWarningTimer) {
        clearTimeout(oldJetXRedirectWarningTimer);
        oldJetXRedirectWarningTimer = null;
    }
    oldJetXRedirectWarningHideToken += 1;

    oldJetXRedirectWarningText.textContent = typeof GetCaption === 'function'
        ? GetCaption('jetxnew.menu.old.jetx.locked')
        : oldJetXRedirectWarningText.textContent;
    oldJetXRedirectWarning.hidden = false;
    oldJetXRedirectWarning.classList.remove('mode-switch-warning--leaving');
    oldJetXRedirectWarning.classList.add('is-visible');

    oldJetXRedirectWarningTimer = setTimeout(() => {
        oldJetXRedirectWarningTimer = null;
        dismissOldJetXRedirectWarning();
    }, OLD_JETX_REDIRECT_WARNING_MS);
}

function syncOldJetXRedirectLock() {
    if (!oldJetXRedirectButton) return;

    const locked = isVersionRedirectLocked();
    oldJetXRedirectButton.classList.toggle('is-redirect-locked', locked);
    oldJetXRedirectButton.setAttribute('aria-disabled', String(locked));
    if (!locked) dismissOldJetXRedirectWarning();
}

function enableOldJetXRedirect() {
    document.body.classList.add('show-old-jetx-redirect');
    syncOldJetXRedirectLock();
    if (typeof scheduleFitTextAll === 'function' && versionSwitch) {
        scheduleFitTextAll(versionSwitch);
    }
}

(function initOldJetXRedirect() {
    if (!versionSwitch || !oldJetXRedirectButton) return;

    window.addEventListener('message', function (event) {
        if (event.data && event.data.name === 'show-version-redirect' && event.data.show) {
            enableOldJetXRedirect();
        }
    });
    window.parent.postMessage({ name: 'hide-loader-hood' }, '*');
    window.parent.postMessage({ name: 'request-show-redirect' }, '*');

    delegate(clickEvent, '[data-version-switch-toggle]', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setVersionSwitchOpen(!versionSwitch.classList.contains('is-open'));
    });

    delegate(clickEvent, '[data-version-switch-option="new"]', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeVersionSwitch();
    });

    delegate(clickEvent, '[data-old-jetx-redirect]', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeVersionSwitch();
        if (oldJetXRedirectButton.classList.contains('is-redirect-locked') || isVersionRedirectLocked()) {
            showOldJetXRedirectLockedWarning();
            return;
        }
        if (typeof mixpanelVersionRedirect === 'function') mixpanelVersionRedirect('header', 'legacy');
        window.parent.postMessage({ name: 'manual-version-redirect', value: 'jetxold' }, '*');
    });

    document.addEventListener(clickEvent, function (event) {
        if (!versionSwitch.classList.contains('is-open')) return;
        if (versionSwitch.contains(event.target)) return;
        closeVersionSwitch();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeVersionSwitch();
    });

    if (typeof mobileLandscapeQuery !== 'undefined') {
        mobileLandscapeQuery.addEventListener('change', function (event) {
            if (event.matches) closeVersionSwitch();
        });
    }

    syncOldJetXRedirectLock();
})();

/* Version Switch /> */

function inactivityCheckSend(hasBet) {
    window.parent.postMessage({ key: "inactivity.check.popup", hasBet: hasBet, inactivity: inactivity, showPopup: false }, "*");
}

function showErrorPopup() {
    openPopup('error');
}

// delegate(clickEvent, '[data-error-retry]', function () {
//     window.location.reload();
// });

function showTimeoutPopup() {
    const popup = document.querySelector('[data-popup="timeout"]');
    if (popup && isPopupVisible(popup)) return;

    if (typeof jetX !== 'undefined' && jetX && typeof jetX.pauseFlightAnimation === 'function') {
        jetX.pauseFlightAnimation();
    }
    openPopup('timeout');
}

delegate(clickEvent, '[data-timeout-new-game]', function () {
    //window.location.reload();
    window.parent.postMessage({name: "reload-loader-iframe"}, "*");
});




$(document).on(clickEvent, '.promotion-dailyleaderboard-button', function () {
    window.parent.postMessage({name: "promotion-dailyleaderboard-show"}, "*");
});
$(document).on(clickEvent, '.promotion-wheel-button', function () {
    window.parent.postMessage({name: "promotion-wheel-show"}, "*");
});

window.parent.postMessage({name: "jetx-logo-width", left: 0}, "*");


// Welcome Popup START
const welcomeSeenKey = 'has_seen_welcome_modal';
const welcomeCountdownSeconds = 5;
// TEMP (testing): shows the popup on every load. Set back to false before release.
const welcomeIgnoreStorage = false;

const welcomePopup = document.querySelector(`[data-popup="${WELCOME_POPUP}"]`);
const welcomeSecondsEl = welcomePopup?.querySelector('[data-welcome-seconds]');

let welcomeCountdownInterval = null;
let welcomeSecondsLeft = welcomeCountdownSeconds;
let welcomePopupOpen = false;
let welcomeShownThisSession = false;

if (welcomePopup) {
    welcomePopup.hidden = true;
    welcomePopup.classList.remove('is-open');
    welcomePopup.setAttribute('aria-hidden', 'true');
}

function hasSeenWelcomePopup() {
    if (welcomeIgnoreStorage) return false;
    if (!localStorageAllow) return true;
    try {
        return localStorage.getItem(welcomeSeenKey) === '1';
    } catch (e) {
        return true;
    }
}

function markWelcomePopupSeen() {
    if (welcomeIgnoreStorage) return;
    if (!localStorageAllow) return;
    try {
        localStorage.setItem(welcomeSeenKey, '1');
    } catch (e) {}
}

function applyWelcomeCaptions() {
    welcomePopup.querySelectorAll('[data-welcome-caption]').forEach((el) => {
        const key = el.dataset.welcomeCaption;
        const caption = typeof GetCaption === 'function' ? GetCaption(key) : '';
        el.textContent = caption && caption !== key ? caption : (el.dataset.welcomeFallback || '');
    });
}

function renderWelcomeCountdown() {
    if (welcomeSecondsEl) welcomeSecondsEl.textContent = `${welcomeSecondsLeft}s`;
}

function stopWelcomeCountdown() {
    if (welcomeCountdownInterval) {
        clearInterval(welcomeCountdownInterval);
        welcomeCountdownInterval = null;
    }
}

function startWelcomeCountdown() {
    stopWelcomeCountdown();
    welcomeSecondsLeft = welcomeCountdownSeconds;
    renderWelcomeCountdown();

    welcomeCountdownInterval = setInterval(() => {
        welcomeSecondsLeft -= 1;
        renderWelcomeCountdown();
        if (welcomeSecondsLeft <= 0) dismissWelcomePopup();
    }, 1000);
}

// Shared by the close button, the "Start Playing" button and the expired countdown.
function dismissWelcomePopup() {
    if (!welcomePopupOpen) return;
    welcomePopupOpen = false;
    stopWelcomeCountdown();
    markWelcomePopupSeen();
    closePopup(WELCOME_POPUP);
}

function isWaitingForLoaderStorage() {
    const storage = window.jetxNewLoaderStorage;
    try {
        return !!(storage && !storage.received && window.parent && window.parent !== window);
    } catch (e) {
        return false;
    }
}

function showWelcomePopupIfNeeded() {
    if (welcomePopupOpen || !welcomePopup || isWaitingForLoaderStorage()) return;
    if (hasSeenWelcomePopup()) return;

    welcomePopupOpen = true;
    welcomeShownThisSession = true;
    applyWelcomeCaptions();
    openPopup(WELCOME_POPUP);
    startWelcomeCountdown();
}

if (welcomePopup) {
    delegate(clickEvent, '[data-welcome-close]', dismissWelcomePopup);
    delegate(clickEvent, '[data-welcome-start]', dismissWelcomePopup);
    window.addEventListener('pagehide', stopWelcomeCountdown);
}
// Welcome Popup END

// Four-bet info popup: shown once, until the player dismisses it.
const fourBetInfoSeenKey = 'has_seen_betting_panel_choice_v2';
const fourBetInfoPopup = document.querySelector(`[data-popup="${FOUR_BET_INFO_POPUP}"]`);
if (fourBetInfoPopup) {
    fourBetInfoPopup.hidden = true;
    fourBetInfoPopup.classList.remove('is-open');
    fourBetInfoPopup.setAttribute('aria-hidden', 'true');
}

function hasSeenFourBetInfoPopup() {
    if (!localStorageAllow) return true;
    try {
        return localStorage.getItem(fourBetInfoSeenKey) === '1';
    } catch (e) {
        return true;
    }
}

function markFourBetInfoPopupSeen() {
    if (!localStorageAllow) return;
    try {
        localStorage.setItem(fourBetInfoSeenKey, '1');
    } catch (e) {}
}

function showFourBetInfoPopupIfNeeded() {
    if (!fourBetInfoPopup || isWaitingForLoaderStorage() || hasSeenFourBetInfoPopup()) return;
    if (isDefaultBetPanelConfigured()) return;
    if (welcomeShownThisSession) return;
    openPopup(FOUR_BET_INFO_POPUP);
}

function startStorageDependentUi() {
    const storage = window.jetxNewLoaderStorage;
    const waitingForLoader = isWaitingForLoaderStorage();

    if (typeof loadMenuPreferences === 'function' && storage?.hydrated) {
        loadMenuPreferences();
    }

    if (hasSeenWelcomePopup()) {
        if (welcomePopupOpen) {
            welcomePopupOpen = false;
            welcomeShownThisSession = false;
            stopWelcomeCountdown();
            closePopup(WELCOME_POPUP);
        }
    } else if (waitingForLoader) {
        return;
    } else if (welcomePopup) {
        showWelcomePopupIfNeeded();
    }

    if (hasSeenFourBetInfoPopup()) {
        closePopup(FOUR_BET_INFO_POPUP);
    } else if (waitingForLoader) {
        return;
    } else if (!welcomePopupOpen) {
        showFourBetInfoPopupIfNeeded();
    }
}

if (window.jetxNewLoaderStorage) {
    window.jetxNewLoaderStorage.whenReady(startStorageDependentUi);
    window.jetxNewLoaderStorage.whenHydrated(startStorageDependentUi);
    window.jetxNewLoaderStorage.whenReceived(startStorageDependentUi);
} else {
    startStorageDependentUi();
}



