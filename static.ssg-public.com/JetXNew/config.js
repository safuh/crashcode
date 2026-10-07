(function () {
    const GET_NAME = 'jetxnew-storage-get';
    const SET_NAME = 'jetxnew-storage-set';
    const DATA_NAME = 'jetxnew-storage-data';
    const WAIT_MS = 500;

    const TRACKED_KEYS = [
        'has_seen_welcome_modal',
        'has_seen_betting_panel_choice_v2',
        'fourModeNewSeen',
        'collectOnboardingSeen',
        'autoCollectSpotlightSeen',
        'autoCollectSettingsSpotlightSeen',
        'betMode',
        'menuPreferences',
        'jetxnew-prevBets',
        'jetxnew-prevBetSum',
        'jetxnew-bet-0',
        'jetxnew-bet-1',
        'jetxnew-bet-2',
        'jetxnew-bet-3',
        'jetxnew-auto-collect',
        'prevBets',
        'prevBetSum',
        'bet-0',
        'bet-1',
        'bet-2',
        'bet-3',
    ];

    let applyingSnapshot = false;
    let pushTimer = 0;
    let storageUsable = false;
    let allowPush = true;
    let waitTimer = 0;

    const api = {
        ready: false,
        hydrated: false,
        received: false,
        _queue: [],
        _hydrateQueue: [],
        _receivedQueue: [],
        whenReady: function (cb) {
            if (typeof cb !== 'function') return;
            if (this.ready) {
                cb(this.hydrated);
                return;
            }
            this._queue.push(cb);
        },
        whenHydrated: function (cb) {
            if (typeof cb !== 'function') return;
            if (this.hydrated) {
                cb();
                return;
            }
            this._hydrateQueue.push(cb);
        },
        whenReceived: function (cb) {
            if (typeof cb !== 'function') return;
            if (this.received) {
                cb();
                return;
            }
            this._receivedQueue.push(cb);
        },
    };

    function markReceived() {
        api.received = true;
        const queue = api._receivedQueue.splice(0);
        for (let i = 0; i < queue.length; i++) {
            try { queue[i](); } catch (e) {}
        }
    }

    function markReady(hydrated) {
        if (hydrated) api.hydrated = true;
        if (api.ready) return;
        api.ready = true;
        const queue = api._queue.splice(0);
        for (let i = 0; i < queue.length; i++) {
            try { queue[i](api.hydrated); } catch (e) {}
        }
    }

    function markHydrated() {
        api.hydrated = true;
        const queue = api._hydrateQueue.splice(0);
        for (let i = 0; i < queue.length; i++) {
            try { queue[i](); } catch (e) {}
        }
        markReady(true);
    }

    function hasParent() {
        try {
            return !!(window.parent && window.parent !== window);
        } catch (e) {
            return false;
        }
    }

    function isTrackedKey(key) {
        if (!key) return false;
        if (TRACKED_KEYS.indexOf(key) !== -1) return true;
        return key.indexOf('jetxnew-chat-time-') === 0 || key.indexOf('chat-time-') === 0;
    }

    function nativeGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function nativeSet(key, value) {
        localStorage.setItem(key, value);
    }

    try {
        if (!localStorage) throw new Error('no storage');
        localStorage.getItem('buttons');
        storageUsable = true;
    } catch (e) {
        storageUsable = false;
    }

    function hasLocalGameStorage() {
        if (!storageUsable) return false;
        for (let i = 0; i < TRACKED_KEYS.length; i++) {
            if (nativeGet(TRACKED_KEYS[i]) != null) return true;
        }
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.indexOf('jetxnew-chat-time-') === 0 || key.indexOf('chat-time-') === 0)) {
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    function collectSnapshot() {
        const data = {};
        if (!storageUsable) return data;
        for (let i = 0; i < TRACKED_KEYS.length; i++) {
            const key = TRACKED_KEYS[i];
            const value = nativeGet(key);
            if (value != null) data[key] = value;
        }
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                if (key.indexOf('jetxnew-chat-time-') !== 0 && key.indexOf('chat-time-') !== 0) continue;
                const value = nativeGet(key);
                if (value != null) data[key] = value;
            }
        } catch (e) {}
        return data;
    }

    function applySnapshot(data) {
        if (!storageUsable || !data || typeof data !== 'object') return false;
        applyingSnapshot = true;
        let wrote = false;
        try {
            Object.keys(data).forEach((key) => {
                if (!isTrackedKey(key) || data[key] == null) return;
                nativeSet(key, String(data[key]));
                wrote = true;
            });
        } catch (e) {
            wrote = false;
        }
        applyingSnapshot = false;
        return wrote;
    }

    function pushSnapshot() {
        if (!allowPush || !hasParent() || applyingSnapshot) return;
        try {
            window.parent.postMessage({ name: SET_NAME, data: collectSnapshot() }, '*');
        } catch (e) {}
    }

    function schedulePush() {
        if (!allowPush || !hasParent() || applyingSnapshot) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(pushSnapshot, 50);
    }

    function requestSnapshot() {
        if (!hasParent()) return;
        try {
            window.parent.postMessage({ name: GET_NAME }, '*');
        } catch (e) {}
    }

    if (storageUsable) {
        const origSetItem = localStorage.setItem.bind(localStorage);
        const origRemoveItem = localStorage.removeItem.bind(localStorage);
        localStorage.setItem = function (key, value) {
            origSetItem(key, value);
            if (!applyingSnapshot && isTrackedKey(key)) schedulePush();
        };
        localStorage.removeItem = function (key) {
            origRemoveItem(key);
            if (!applyingSnapshot && isTrackedKey(key)) schedulePush();
        };
    }

    window.addEventListener('message', function (event) {
        const payload = event && event.data;
        if (!payload || payload.name !== DATA_NAME) return;
        clearTimeout(waitTimer);
        const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
        const wrote = applySnapshot(data);
        allowPush = true;
        markReceived();
        if (wrote) markHydrated();
        else markReady(false);
    });

    window.jetxNewLoaderStorage = api;

    if (hasLocalGameStorage()) {
        pushSnapshot();
        markReady(false);
        return;
    }

    if (!hasParent()) {
        markReady(false);
        return;
    }

    allowPush = false;
    requestSnapshot();
    window.addEventListener('load', function () {
        if (!api.received) requestSnapshot();
    });
    waitTimer = setTimeout(function () {
        allowPush = true;
        markReady(false);
    }, WAIT_MS);
})();

let urlHolder;
let gameSound = true;
let soundPopup = false;
let showBets = true;
let jurisdictionName = getParameterByName('JurisdictionName');
if(jurisdictionName !== undefined && jurisdictionName !== null && jurisdictionName !== '') jurisdictionName = jurisdictionName.toLowerCase();
document.body.classList.add(`jurisdiction-${jurisdictionName}`);

let globalParams = JSON.parse(document.getElementById('GlobalParameters').value);
let visualPreferences = $('#VisualPreferences').val() ? JSON.parse($('#VisualPreferences').val()) : null;

const VISUAL = Object.freeze({
    GIFT_ONE_BET: 'VISUAL-GIFT-ONE-BET',
    DISABLE_SOUND_POPUP: 'VISUAL-DISABLE-SOUND-POPUP',
    NO_AUTOPLAY: 'VISUAL-NO-AUTOPLAY',
    AUTO_COLLECT: 'VISUAL-AUTO-COLLECT',
    DISABLE_CHOSEN_BET_PANEL: 'VISUAL-DISABLE-CHOSEN-BET-PANEL',
    AUTOPLAY_SPIN_COUNTS: 'VISUAL-AUTOPLAY-SPIN-COUNTS',
    DISABLE_CHAT: 'VISUAL-DISABLE-CHAT',
    HELP_SHOW_PAYTABLE_ON_LOAD: 'VISUAL-HELP-SHOW-PAYTABLE-ON-LOAD',
    SHOW_HOW_TO_PLAY: 'VISUAL-SHOW-HOW-TO-PLAY',
    SHOW_AND_CALCULATE_NET_BALANCE: 'VISUAL-SHOW-AND-CALCULATE-NET-BALANCE',
    DISABLE_BET_ALL_AND_CASHOUT_ALL: 'VISUAL-DISABLE-BET-ALL-AND-CASHOUT-ALL',
    DEFAULT_BET_PANEL: 'VISUAL-DEFAULT-BET-PANEL',
});

const BET_PANELS = Object.freeze(['single', 'double', 'classic', 'four']);

function visualIsTrue(key) {
    if (!visualPreferences) return false;
    const v = visualPreferences[key];
    return v === true || String(v).toLowerCase() === 'true';
}

function visualIsFalse(key) {
    if (!visualPreferences || visualPreferences[key] == null) return false;
    const v = visualPreferences[key];
    return v === false || String(v).toLowerCase() === 'false';
}

function visualHas(key) {
    return !!(visualPreferences && visualPreferences[key] != null && visualPreferences[key] !== '');
}

function visualList(key) {
    if (!visualHas(key)) return [];
    return String(visualPreferences[key])
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
}

function visualString(key, fallback = null) {
    if (!visualHas(key)) return fallback;
    return String(visualPreferences[key]).trim().toLowerCase();
}

const visualConfig = Object.freeze({
    giftOneBet: visualIsTrue(VISUAL.GIFT_ONE_BET),
    disableSoundPopup: visualIsTrue(VISUAL.DISABLE_SOUND_POPUP),
    noAutoplay: visualIsTrue(VISUAL.NO_AUTOPLAY),
    autoCollect: visualHas(VISUAL.AUTO_COLLECT)
      ? visualIsTrue(VISUAL.AUTO_COLLECT)
      : true,
    disabledBetPanels: new Set(visualList(VISUAL.DISABLE_CHOSEN_BET_PANEL)),
    autoplaySpinCounts: visualList(VISUAL.AUTOPLAY_SPIN_COUNTS),
    disableChat: visualIsTrue(VISUAL.DISABLE_CHAT),
    helpShowPaytableOnLoad: visualIsTrue(VISUAL.HELP_SHOW_PAYTABLE_ON_LOAD),
    showHowToPlay: visualHas(VISUAL.SHOW_HOW_TO_PLAY)
      ? visualIsTrue(VISUAL.SHOW_HOW_TO_PLAY)
      : null,
    showNetBalance: visualIsTrue(VISUAL.SHOW_AND_CALCULATE_NET_BALANCE),
    disableBetAllAndCashoutAll: visualIsTrue(VISUAL.DISABLE_BET_ALL_AND_CASHOUT_ALL),
    defaultBetPanel: (() => {
      const v = visualString(VISUAL.DEFAULT_BET_PANEL);
      return BET_PANELS.includes(v) ? v : null;
    })(),
});

(function notifyVisualBodyClasses() {
    const raw = elValue('VisualBodyClasses') || '';
    if (raw) {
        window.parent.postMessage({ name: 'visual-body-classes', value: raw }, '*');
    }
})();

function resolveInitialBetMode(fallback = 'double') {
    const disabled = visualConfig.disabledBetPanels;
    let savedMode = null;
    try {
        savedMode = localStorage.getItem('betMode');
    } catch (e) {
        savedMode = null;
    }
    const candidates = [
        visualConfig.defaultBetPanel,
        savedMode,
        fallback,
        'double',
        'classic',
        'single',
        'four',
    ].filter(Boolean);

    for (const mode of candidates) {
        if (BET_PANELS.includes(mode) && !disabled.has(mode)) return mode;
    }
    return BET_PANELS.find((mode) => !disabled.has(mode)) || fallback;
}

function isBetPanelDisabled(mode) {
    return visualConfig.disabledBetPanels.has(mode);
}

function shouldOpenHowToPlayOnLoad() {
    // How to play stays in the menu; do not auto-open on game start.
    return false;
}

function setVisualHidden(selector, hidden) {
    document.querySelectorAll(selector).forEach((el) => {
        el.classList.toggle('is-visual-hidden', !!hidden);
        el.classList.remove('is-visual-hidden-space');
        if (hidden) el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
    });
}

function setVisualHiddenSpace(selector, hidden) {
    document.querySelectorAll(selector).forEach((el) => {
        el.classList.toggle('is-visual-hidden-space', !!hidden);
        el.classList.remove('is-visual-hidden');
        if (hidden) el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
    });
}

function applyVisualPreferences() {
    setVisualHidden('.btn-autoplay, [data-shared-autoplay], #popup-autoplay', visualConfig.noAutoplay);
    setVisualHiddenSpace(
        '.bet-head .auto-row, .bet-shared-head .auto-row, [data-ac-settings], #popup-auto-collect, .btn-bet__auto-collect, .btn-bet__auto-collect-fill',
        !visualConfig.autoCollect
    );
    setVisualHidden('[data-popup-open="chat"], #popup-chat', visualConfig.disableChat);
    setVisualHidden('#bet-all-action', visualConfig.disableBetAllAndCashoutAll);
    setVisualHidden('.bet-shared-foot', visualConfig.disableBetAllAndCashoutAll);
    document.querySelector('.app')?.classList.toggle('visual-no-bet-all', visualConfig.disableBetAllAndCashoutAll);
    setVisualHidden('.gift-bet-button[data-button="5"], #bet-5', visualConfig.giftOneBet);
    setVisualHidden('[data-popup-open="how-to-play"], #popup-how-to-play', visualConfig.showHowToPlay === false);

    visualConfig.disabledBetPanels.forEach((mode) => {
        const button = document.querySelector(`[data-bet-mode="${mode}"]`);
        if (!button) return;
        button.classList.add('mode-card--visual-disabled');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
    });

    if (visualConfig.disableSoundPopup) {
        gameSound = false;
        const menuMusic = document.getElementById('menu-music');
        const menuSounds = document.getElementById('menu-sounds');
        if (menuMusic) menuMusic.checked = false;
        if (menuSounds) menuSounds.checked = false;
    }

    if (visualConfig.showNetBalance && !document.getElementById('netBalance')) {
        const balanceBtn = document.getElementById('userBalance');
        if (balanceBtn && balanceBtn.parentElement) {
            const net = document.createElement('button');
            net.id = 'netBalance';
            net.type = 'button';
            net.className = 'btn btn-secondary btn-md';
            net.setAttribute('aria-label', GetCaption('jetxnew.net.balance'));
            net.innerHTML = `<span>${GetCaption('jetxnew.net.balance')}</span> 0.00`;
            balanceBtn.insertAdjacentElement('afterend', net);
        }
    }

    if (typeof applyAutoplaySpinCounts === 'function') {
        applyAutoplaySpinCounts();
    }
}

if (typeof mixpanelBetStart === 'undefined') {
    function mixpanelBetStart() {

    }

    function mixpanelBet() {

    }

    function mixpanelCollectStart() {

    }

    function mixpanelCollect() {

    }

    function mixpanelPlaceAllBets() {

    }

    function mixpanelCollectAll() {

    }

    function mixpanelPanelState() {

    }

    function mixpanelCheckbox() {

    }

    function mixpanelMobileSound() {

    }

    function mixpanelHelpStatus() {

    }

    function mixpanelHelpOpened() {

    }

    function mixpanelHelpClosed() {

    }

    function mixpanelNewRound() {

    }

    function mixpanelBoom() {

    }

    function mixpanelNewRoundFly() {

    }

    function mixpanelBettingOption() {

    }

    function mixpanelError() {

    }

    function mixpanelFirstUsage() {

    }

    function mixpanelVersionRedirect() {

    }
}

function formatGlobalParameters(captionValue, globalParamaters) {
    if (captionValue) {
        const regex = /\{([^\}]+)\}/g;
        return captionValue.replace(regex, function ($0) {
            const key = $0.substring(1, $0.length - 1);
            let val = globalParamaters[key];
            if (val === undefined) val = $0;
            if(val !== '' && val !== null && !isNaN(Number(val))) {
                val = Number(val);
                let isMultiplier = ['MAXAUTOCASHOUT', 'MINAUTOCASHOUT', 'MAXCASHOUTCOEFF'].indexOf(key) >= 0;
                val = formatAmount(val, player.currency, isMultiplier ? 'multiplier' : 'input');
            }

            return val;
        });
    }
    return captionValue;
}

let portalName = document.body.dataset.portalname;
let captionFreeBetText4 = GetCaption('jetxnew.freespin.text4');
let captionFreeBetUse = GetCaption('jetxnew.freespin.use');
let captionFreeBetText4Continue = GetCaption('jetxnew.freespin.text4.continue');
let captionFreeBetContinue = GetCaption('jetxnew.freespin.continue');

if(portalName === 'betlive') {
    setHtmlAll('.caption-freebet', GetCaption(`${portalName}.jetxnew.freespin`));
    setHtmlAll('.caption-freebet-use', GetCaption(`${portalName}.jetxnew.freespin.use`));
    setHtmlAll('.caption-freebet-yes', GetCaption(`${portalName}.jetxnew.freespin.yes`));
    setHtmlAll('.caption-freebet-no', GetCaption(`${portalName}.jetxnew.freespin.no`));
    setHtmlAll('.caption-freebet-congratulations', GetCaption(`${portalName}.jetxnew.freespin.congratulations`));
    setHtmlAll('.caption-freebet-exit', GetCaption(`${portalName}.jetxnew.freespin.exit`));
    setHtmlAll('.caption-freebet-cancel', GetCaption(`${portalName}.jetxnew.freespin.cancel`));

    setHtmlAll('.caption-freebet-text1', GetCaption(`${portalName}.jetxnew.freespin.text1`));
    setHtmlAll('.caption-freebet-text2', GetCaption(`${portalName}.jetxnew.freespin.text2`));
    setHtmlAll('.caption-freebet-text3', GetCaption(`${portalName}.jetxnew.freespin.text3`));
    setHtmlAll('.caption-freebet-text4', GetCaption(`${portalName}.jetxnew.freespin.text4`));
    setHtmlAll('.caption-freebet-text5', GetCaption(`${portalName}.jetxnew.freespin.text5`));
    setHtmlAll('.caption-freebet-text10', GetCaption(`${portalName}.jetxnew.freespin.text10`));

    setHtmlAll('.caption-spin-amount', GetCaption(`${portalName}.jetx.board.gift.spin.amount`)); //
    setHtmlAll('.caption-spin-win', GetCaption(`${portalName}.jetx.board.gift.spin.win`));
    setHtmlAll('.caption-spin-count', GetCaption(`${portalName}.jetx.board.gift.spin.count`));
    setHtmlAll('.caption-spin-used', GetCaption(`${portalName}.jetx.board.gift.spin.used`)); //
    setHtmlAll('.caption-spin-left', GetCaption(`${portalName}.jetx.board.gift.spin.left`));

    captionFreeBetText4 = GetCaption(`${portalName}.jetxnew.freespin.text4`);
    captionFreeBetUse = GetCaption(`${portalName}.jetxnew.freespin.use`);
    captionFreeBetText4Continue = GetCaption(`${portalName}.jetxnew.freespin.text4.continue`);
    captionFreeBetContinue = GetCaption(`${portalName}.jetxnew.freespin.continue`);
}

let IsNetworkOptimized = readBoolFlag('IsNetworkOptimized');
let IsJetXNewChatEnabled = readBoolFlag('IsJetXNewChatEnabled') && !visualConfig.disableChat;
let IsJetXApiEnabled = readBoolFlag('IsJetXApiEnabled');

applyVisualPreferences();

let InactivityTime = readFloatValue('InactivityTime');

let InactivityKickTime = readFloatValue('InactivityKickTime');

let inactivity = {
    isActive: InactivityTime !== -1,
    time: InactivityTime * 60 * 1000,
    exitTime: InactivityKickTime * 60 * 1000,
};

let showRealityCheckPopup = false;
let inactivityCheck = false;

let ios = bowser.ios;

let timeDifference = (() => {
    let difference = 0;
    try {
        let currentTime = document.querySelector('#currentTime').value;
        if (ios) currentTime = currentTime.replace(' ', 'T');
        difference = Date.now() - (new Date(currentTime)).getTime();
        difference = Math.round(parseInt(difference / 1000) / 360) / 10;
        difference *= 3600;
    } catch (e) {

    }

    return difference;
})();
let changeTime = (time, format = 'full') => {
    if (format === 'full') {
        let date = new Date(time);
        date.setSeconds(date.getSeconds() + timeDifference);
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, '0');
        let day = String(date.getDate()).padStart(2, '0');
        let hours = String(date.getHours()).padStart(2, '0');
        let minutes = String(date.getMinutes()).padStart(2, '0');
        let seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    } else if (format === 'time') {
        let now = new Date();
        let year = now.getFullYear();
        let month = String(now.getMonth() + 1).padStart(2, '0');
        let day = String(now.getDate()).padStart(2, '0');
        let date = `${year}-${month}-${day} ${time}:00`;
        if (ios) date = date.replace(' ', 'T');
        date = new Date(date);
        date.setSeconds(date.getSeconds() + timeDifference);
        let hours = String(date.getHours()).padStart(2, '0');
        let minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } else if (format === 'timeFull') {
        let now = new Date();
        let year = now.getFullYear();
        let month = String(now.getMonth() + 1).padStart(2, '0');
        let day = String(now.getDate()).padStart(2, '0');
        let date = `${year}-${month}-${day} ${time}`;
        if (ios) date = date.replace(' ', 'T');
        date = new Date(date);
        date.setSeconds(date.getSeconds() + timeDifference);
        let hours = String(date.getHours()).padStart(2, '0');
        let minutes = String(date.getMinutes()).padStart(2, '0');
        let seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    return time;
}


let staticContentUrl = elValue('StaticContentUrl') ?? "";
if (staticContentUrl.indexOf("?")) {
    staticContentUrl = staticContentUrl.split("?");
    staticContentUrl = staticContentUrl[0];
}


// co
let userCurrencyCode = 'GEL';
let userFractionDigit = 2;
let fixedIndex = 2;

function getRowHeight() {
    const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return Math.round(2 * rootFs);
}

function getRowCount() {
    const panel = document.getElementById('side-players');
    let el = document.getElementById('players');
    if (panel) {
        const overflowY = getComputedStyle(panel).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
            el = panel;
        }
    }
    const height = el ? el.clientHeight : 0;
    const rh = getRowHeight();
    if (!height || !rh) return 10;
    return Math.max(1, Math.ceil(height / rh));
}

let mobile = !!(document.getElementById('game') && document.getElementById('game').classList.contains('mobile'));
let clickEvent = 'click'; //ios ? 'touchstart' : 'click';
let giftClickEvent = 'click'; //mobile ? 'touchstart' : 'click';
let mobileDesktop = false;
let vertical = false;

let rowHeight = getRowHeight();
let rowCount = getRowCount();

let elements = {
    userBalance: document.querySelector('#userBalance'),
    userName: document.querySelector('#userName'),
    userAvatar: document.querySelector('#userAvatar'),
};

let wakeLock = null;
let wakeLockEnabled = false;
let wakeLockRetryArmed = false;

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return false;
    if (wakeLock !== null) return true;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            wakeLock = null;
            armWakeLockRetry();
        });
        return true;
    } catch (e) {
        armWakeLockRetry();
        return false;
    }
}

function armWakeLockRetry() {
    if (wakeLockRetryArmed || !wakeLockEnabled) return;
    wakeLockRetryArmed = true;

    const retry = () => {
        wakeLockRetryArmed = false;
        document.removeEventListener('click', retry);
        document.removeEventListener('touchend', retry);
        if (wakeLockEnabled && document.visibilityState === 'visible') {
            void requestWakeLock();
        }
    };

    document.addEventListener('click', retry);
    document.addEventListener('touchend', retry);
}

function mobileNoSleep() {
    wakeLockEnabled = true;
    void requestWakeLock();
}

document.addEventListener('visibilitychange', () => {
    if (wakeLockEnabled && document.visibilityState === 'visible') {
        void requestWakeLock();
    }
});

mobileNoSleep();

let sessionStorageAllow = false;
try {
    let buttons = sessionStorage.getItem('buttons');
    sessionStorageAllow = true;
} catch (e) {

}

let localStorageAllow = false;
try {
    let buttons = localStorage.getItem('buttons');
    localStorageAllow = true;
} catch (e) {

}

let scrollOnFooterClick = true;

document.oncontextmenu = document.body.oncontextmenu = function () {
    return false;
};

function InitializeUrls(baseUrl, connrollerName, externalUrl) {
    urlHolder =
        {
            Chat:
                {
                    MessagesUrl: baseUrl + "/api/" + connrollerName + "/GetChatMessages",
                    SendMessageUrl: baseUrl + "/api/" + connrollerName + "/PutChatMessage"
                },
            Actions:
                {
                    Bet: baseUrl + "/api/" + connrollerName + "/Bet",
                    FastBet: baseUrl + "/api/" + connrollerName + "/FastBet",
                    PostCustomEventUrl: baseUrl + "/api/" + connrollerName + "/CustomEvent",
                    PlayerHistoryUrl: baseUrl + "/api/" + connrollerName + "/GetPlayerHistory",
                    GetBoard: baseUrl + "/api/" + connrollerName + "/Board",
                    Ping: baseUrl + "/api/" + connrollerName + "/Ping",
                    Cashout: baseUrl + "/api/" + connrollerName + "/Cashout",
                    CashoutMany: baseUrl + "/api/" + connrollerName + "/CashoutMany",
                    Player: baseUrl + "/api/" + connrollerName + "/Player"
                },
            Board:
                {
                    Url: baseUrl + "/api/" + connrollerName + "/Board"
                },
            External:
                {
                    Url: externalUrl
                },
            History:
                {
                    Url: baseUrl + "/api/" + connrollerName + "/History"
                }
        };
}
InitializeUrls(baseUrl, controllerName, externalUrl);

if (getParentParameterByName('historyUrl') !== '') {
    document.body.classList.add('show-history-button');
    const rh = document.getElementById('redirect-to-history');
    if (rh) {
        rh.setAttribute('href', getParentParameterByName('historyUrl'));
        rh.setAttribute('target', '_blank');
    }
} else if (getParameterByName('historyUrl') !== '') {
    document.body.classList.add('show-history-button');
    const rh = document.getElementById('redirect-to-history');
    if (rh) {
        rh.setAttribute('href', getParameterByName('historyUrl'));
        rh.setAttribute('target', '_blank');
    }
}

let cashierUrl = '';
if (getParentParameterByName('cashierUrl') !== '') {
    cashierUrl = getParentParameterByName('cashierUrl');
} else if (getParameterByName('cashierUrl') !== '') {
    cashierUrl = getParameterByName('cashierUrl');
}
if (cashierUrl !== '') {
    const balanceBtn = document.getElementById('BtnShowBalance');
    if (balanceBtn) {
        balanceBtn.setAttribute('href', cashierUrl);
        balanceBtn.style.pointerEvents = 'auto';
        if (cashierUrl.indexOf('javascript:') === -1) {
            balanceBtn.setAttribute('target', '_blank');
        }
    }
}

let board = {
    boardVersion: 0,
    coefficient: 0,
    autoBetOn: !visualConfig.noAutoplay,
    twoBetOn: true,
    showRtp: false,
    minAutoCashOut: 1.01,
    maxAutoCashOut: 1000,
    isBoardDisabled: false,
    isFinnished: false,
    isGameStarted: false,
    minBet: 0,
    maxBet: 0,
    maxWinAmount: 0,
    maxCashoutCoeff: 100000000,
    minMultiplier: 0,
    onlinePlayers: 0,
    progressPercent: 0,
    progressTime: 0,
    showFullNames: false,
    spinNumber: 0,
    isPortalFilterOn: false,
    showGameInfoOnStart: false,
    exchangeRate: 1,
    convertToPlayerCurrency: false,
    stopUrl: '',
    currentSpinHash: '',
    showPlayerBets: false,
};

let player = {
    key: '',
    counterId: '',
    isObserver: false,
    availableAmount: 0,
    availableAmountList: [],
    bets: [],
    prevBets: [false, false, false, false, false, false],
    prevBetSum: 0,
    win: 0,
    totalBet: 0,
    activeBet: 0,
    currency: {currencyCode: '', fractionDigit: 2, currencySymbol: '',},
    displayName: "Pkhako",
    clientAvatar: 0,
    disableCashGame: false,
    gift: {
        amount: 0,
        count: 0,
        totalCreditWin: 0,
        totalWin: 0,
        startAmount: 0,
        started: false,
        debt: false,
        expDate: null,
        startDate: null,
        timeLeft: null,
    },
    isDisabled: false,
    jackpot: {
        throwAmount: null,
        throwAmountPerPlayer: null,
        type: null,
    },
    portalName: '',
};