function toApiRequestBody(dataObj) {
    const hasArray = Object.keys(dataObj).some((key) => Array.isArray(dataObj[key]));
    if (hasArray) {
        return {
            contentType: 'application/json; charset=UTF-8',
            body: JSON.stringify(dataObj)
        };
    }
    return {
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        body: new URLSearchParams(dataObj).toString()
    };
}

function apiRequest(method, url, dataObj, success, fail) {
    const options = { method, headers: {} };
    if (dataObj !== undefined && dataObj !== null) {
        const encoded = toApiRequestBody(dataObj);
        options.headers['Content-Type'] = encoded.contentType;
        options.body = encoded.body;
    }

    let status = 0;
    let rawText = '';
    fetch(url, options)
        .then((response) => {
            status = response.status;
            return response.text().then((text) => {
                rawText = text;
                let json = null;
                try {
                    json = text ? JSON.parse(text) : null;
                } catch (e) {
                    json = null;
                }
                if (response.ok) {
                    if (typeof success === 'function') success(json);
                } else if (typeof fail === 'function') {
                    fail({ status, responseText: rawText, responseJSON: json }, 'error', response.statusText);
                }
            });
        })
        .catch((error) => {
            if (typeof fail === 'function') {
                fail({ status: status || 0, responseText: rawText, responseJSON: null }, 'error', String(error));
            }
        });
}

function apiGet(url, success, fail) {
    apiRequest('GET', url, null, success, fail);
}

function apiPost(url, dataObj, success, fail) {
    apiRequest('POST', url, dataObj, success, fail);
}

function fadeIn(element, duration = 100) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.display = 'block';
    const start = performance.now();
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        element.style.opacity = String(progress);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function fadeOut(element, duration = 100) {
    if (!element) return;
    const start = performance.now();
    const initial = parseFloat(getComputedStyle(element).opacity) || 1;
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        element.style.opacity = String(initial * (1 - progress));
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.style.display = 'none';
        }
    };
    requestAnimationFrame(step);
}

function setChecked(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
}

function hasClassSelector(selector, className) {
    const el = document.querySelector(selector);
    return !!(el && el.classList.contains(className));
}

function setHtmlSelector(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
}

function qsaEach(selector, fn) {
    document.querySelectorAll(selector).forEach(fn);
}
function addClassAll(selector, ...classes) {
    qsaEach(selector, (el) => el.classList.add(...classes));
}
function removeClassAll(selector, ...classes) {
    qsaEach(selector, (el) => el.classList.remove(...classes));
}
function setHtmlAll(selector, html) {
    qsaEach(selector, (el) => { el.innerHTML = html; });
}
function setCssAll(selector, prop, value) {
    qsaEach(selector, (el) => { el.style[prop] = value; });
}

function isVisibleSelector(selector) {
    const el = document.querySelector(selector);
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

function jqData(el, key, value) {
    if (!el) return undefined;
    if (arguments.length >= 3) { // setter (in-memory, like jQuery's data cache)
        el._jqData = el._jqData || {};
        el._jqData[key] = value;
        return value;
    }
    if (el._jqData && Object.prototype.hasOwnProperty.call(el._jqData, key)) return el._jqData[key];
    const raw = el.dataset ? el.dataset[key] : undefined;
    if (raw === undefined) return undefined;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (raw === '') return raw;
    if (+raw + '' === raw) return +raw; // numeric strings -> number (jQuery behaviour)
    if (/^(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test(raw)) {
        try { return JSON.parse(raw); } catch (e) { return raw; }
    }
    return raw;
}

function delegate(eventName, selector, handler) {
    document.addEventListener(eventName, function (event) {
        const target = (event.target && event.target.nodeType === 1
            ? event.target
            : event.target && event.target.parentElement)?.closest(selector);
        if (target) handler.call(target, event);
    });
}

function triggerEvent(elOrId, name) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (el) el.dispatchEvent(new Event(name, { bubbles: true }));
}

function onReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            if (args[0] !== undefined && args[0].constructor === Array) {
                return typeof args[0][number] !== 'undefined'
                    ? args[0][number]
                    : match;
            } else {
                return typeof args[number] !== 'undefined'
                    ? args[number]
                    : match;
            }
        });
    };
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)")
    var results = null;
    try {
        results = regex.exec(location.search);
    } catch (e) {

    }
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function getParentParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = null;
    try {
        results = regex.exec(parent.location.search);
    } catch (e) {

    }
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function getReturnUrlFromSearch(search) {
    if (!search) return null;
    try {
        const params = new URLSearchParams(search);
        for (const [key, value] of params.entries()) {
            if (key.toLowerCase() === 'returnurl' && value) return value;
        }
    } catch (e) {}
    return null;
}

function getReturnUrl() {
    const fromWindow = getReturnUrlFromSearch(window.location.search);
    if (fromWindow) return fromWindow;
    try {
        const fromParent = getReturnUrlFromSearch(parent.location.search);
        if (fromParent) return fromParent;
    } catch (e) {}
    return null;
}

function parseInputAmount(value) {
    if (typeof value === 'number') return value;
    if (value === undefined || value === null) return NaN;

    value = String(value);
    value = value.replace(/[^\d.-]/g, '');
    value = value.replace(player.currency.currencySymbol, '');
    value = value.replace(' ', '');

    return parseFloat(value.replace(/,/g, ''));
}

function decodeHtml(str) {
    str = str.replaceAll("&quot;", "'");
    str = str.replaceAll("&amp;", "&");
    return str;
}

function elValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : undefined;
}

function readBoolFlag(id) {
    return elValue(id) === 'True';
}

function readFloatValue(id, fallback = -1) {
    const value = elValue(id);
    return value === undefined ? fallback : parseFloat(value);
}

function inputAmount(id) {
    return parseInputAmount(elValue(id));
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function commitInput(el) {
    if (!el || !el.id || typeof setInputValue !== 'function') return;
    setInputValue(el.id, el.value);

    // Preserve the cash-out badge update that the old synthetic `change` did,
    // without waking document-level delegated listeners.
    if (el.id.indexOf('cash-out-value-') === 0 && typeof acUpdateCollectBadge === 'function') {
        const i = parseInt(el.id.replace('cash-out-value-', ''), 10);
        if (!isNaN(i)) acUpdateCollectBadge(i);
    }
}

function popup_close() {

}

function leaveGame() {
    gameEvent.quit();

    const url = getReturnUrl() || (urlHolder && urlHolder.External && urlHolder.External.Url) || '';
    if (!url) return;

    if (url.indexOf('javascript:') >= 0) {
        eval(decodeURI(decodeHtml(url)));
        return;
    }

    const href = decodeHtml(url);
    try {
        window.top.location.href = href;
    } catch (e) {
        window.location.href = href;
    }
}

function formatClientName(name, current = false) {
    //name = current ? player.displayName : name;
    name = name.replace('****', '');
    return name.length > 2 ? name : name[0] + '•••' + name[1];
    //return name;
}

function isCurrentClientName(name) {
    if (!player || !player.displayName || !name) return false;

    let clientName = String(name).replace('****', '');
    if (clientName.length > 2) {
        clientName = `${clientName.slice(0, 1)}${clientName.slice(-1)}`;
    }

    return clientName === `${player.displayName.slice(0, 1)}${player.displayName.slice(-1)}`;
}

let clientsAvatar = [];
function getAvatar(clientName, current = false) {
    if (clientName.length > 2) {
        clientName = `${clientName.slice(0, 1)}${clientName.slice(-1)}`;
    }
    if (current || clientName === `${player.displayName.slice(0, 1)}${player.displayName.slice(-1)}`) {
        return player.clientAvatar;
    }
    if(clientsAvatar[clientName]) {
        return clientsAvatar[clientName];
    }
    clientsAvatar[clientName] = jetX.canvas.getRandom(0, 24);
    return clientsAvatar[clientName];
}

function currencyFormat(currency, format = false) {
    return format && currency === 'IRR' ? '' : currency;
}

function formatBalance(number) {
    number = parseFloat(number);
    number += '';
    const digits = (typeof player !== 'undefined' && player.currency && player.currency.currencyCode === 'VND')
        ? (typeof player.currency.fractionDigit === 'number' ? player.currency.fractionDigit : 0)
        : fixedIndex;
    number = number.substring(0, number.indexOf('.') >= 0 ? number.indexOf('.') + digits + 1 : number.length);
    number = parseFloat(number);

    return number;
}

const amountNumberFormatters = {};
function getAmountNumberFormatter(fractionDigit, type) {
    const minDigits = type === 'multiplier' ? 0 : fractionDigit;
    const grouping = type !== 'multiplier';
    const key = minDigits + '_' + fractionDigit + '_' + (grouping ? '1' : '0');
    return amountNumberFormatters[key] || (amountNumberFormatters[key] = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: fractionDigit,
        useGrouping: grouping,
    }));
}

function formatAmount(number, currency, type = '') {
    if(currency === undefined) currency = player.currency;
    let fractionDigit = currency.fractionDigit;
    if(type === 'multiplier') {
        fractionDigit = 2;
    }

    number = parseInputAmount(number);
    number *= Math.pow(10, fractionDigit);
    if (type === 'cashOut') {
        number = parseInt(number);
    }
    number = currency.currencyCode === 'VND' ? Math.floor(number) : Math.round(number);
    number /= Math.pow(10, fractionDigit);

    const { symbol, position } = getCurrencyFormatInfo(currency.currencyCode);
    let currencySymbol = symbol;
    const currencySpanClass = hasCurrencySymbol(currency.currencyCode)
        ? ' class="currency"'
        : ' class="currency no-currency-symbol"';
    const isSymbolRight = position === 'right';
    let formattedNumber = getAmountNumberFormatter(fractionDigit, type).format(number);
    if(type === 'chip') {
        return formattedNumber.replace('.00', '');
    } else if(type === 'input') {
        return formattedNumber;
    } else if(type === 'input-currency') {
        return isSymbolRight
            ? `${formattedNumber} ${currencySymbol}`
            : `${currencySymbol} ${formattedNumber}`;
    } else if(type === 'formated') {
        // Both sides as spans so flex parents (e.g. #userBalance) align on iOS
        formattedNumber = `<span>${formattedNumber}</span>`;
        currencySymbol = `<span${currencySpanClass}>${currencySymbol}</span>`;
        return isSymbolRight
            ? `${formattedNumber} ${currencySymbol}`
            : `${currencySymbol} ${formattedNumber}`;
    } else if(type === 'cashout') {
        formattedNumber = formattedNumber.replace(/,/g, ',');
        currencySymbol = isSymbolRight ? ` ${currencySymbol}` : `${currencySymbol} `;
    } else if(type === 'multiplier') {
        return formattedNumber;
    } else {
        formattedNumber = formattedNumber.replace(/,/g, '');
        currencySymbol = isSymbolRight
            ? ` <span${currencySpanClass}>${currencySymbol}</span>`
            : `<span${currencySpanClass}>${currencySymbol}</span> `;
    }
    if(type === 'number') {
        return parseFloat(number);
    }

    return isSymbolRight
        ? `${formattedNumber}${currencySymbol}`
        : `${currencySymbol}${formattedNumber}`;
}

const currencyFormatInfoCache = {};

// ISO currency → primary locale (Intl uses this for symbol + left/right placement)
const currencyLocales = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', GEL: 'ka-GE',
    TRY: 'tr-TR', RUB: 'ru-RU', UAH: 'uk-UA', PLN: 'pl-PL',
    SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK', CHF: 'de-CH',
    CZK: 'cs-CZ', HUF: 'hu-HU', RON: 'ro-RO', BGN: 'bg-BG',
    AZN: 'az-AZ', AMD: 'hy-AM', KZT: 'kk-KZ', BYN: 'be-BY',
    MDL: 'ro-MD', UZS: 'uz-UZ', TJS: 'tg-TJ', TMT: 'tk-TM',
    AED: 'ar-AE', SAR: 'ar-SA', ILS: 'he-IL', JPY: 'ja-JP',
    CNY: 'zh-CN', INR: 'en-IN', BRL: 'pt-BR', MXN: 'es-MX',
    ARS: 'es-AR', CLP: 'es-CL', COP: 'es-CO', PEN: 'es-PE',
    VND: 'vi-VN', THB: 'th-TH', KRW: 'ko-KR', IDR: 'id-ID',
    MYR: 'ms-MY', PHP: 'en-PH', PKR: 'ur-PK', BDT: 'bn-BD',
    NGN: 'en-NG', ZAR: 'en-ZA', EGP: 'ar-EG', MAD: 'fr-MA',
    IRR: 'fa-IR', IQD: 'ar-IQ', LBP: 'ar-LB', JOD: 'ar-JO',
    OMR: 'ar-OM', QAR: 'ar-QA', BHD: 'ar-BH', KWD: 'ar-KW',
    HRK: 'hr-HR', RSD: 'sr-RS', BAM: 'bs-BA', MKD: 'mk-MK',
    ALL: 'sq-AL', ISK: 'is-IS', CAD: 'en-CA', AUD: 'en-AU',
    NZD: 'en-NZ', SGD: 'en-SG', HKD: 'zh-HK', TWD: 'zh-TW',
    FRF: 'fr-FR', DEM: 'de-DE', ESP: 'es-ES', ITL: 'it-IT',
};

// Used only when preferred locale is not supported in the browser
const currencySymbolPositions = {
    GEL: 'right',
};

function getPreferredCurrencyLocale(currencyCode) {
    if (currencyLocales[currencyCode]) return currencyLocales[currencyCode];
    const countryCode = currencyCode.slice(0, 2);
    return `${countryCode.toLowerCase()}-${countryCode}`;
}

function getSupportedCurrencyLocales(preferredLocale) {
    if (!preferredLocale || typeof Intl.NumberFormat.supportedLocalesOf !== 'function') {
        return [];
    }
    return Intl.NumberFormat.supportedLocalesOf([
        preferredLocale,
        preferredLocale.split('-')[0],
    ]);
}

function getCurrencyLocales(currencyCode) {
    const preferred = getPreferredCurrencyLocale(currencyCode);
    const supported = getSupportedCurrencyLocales(preferred);
    if (supported.length) return [...supported, 'en-US'];
    return ['en-US'];
}

function resolveCurrencySymbolPosition(currencyCode, preferredLocale, parts) {
    const supported = getSupportedCurrencyLocales(preferredLocale);
    if (supported.length) {
        const currencyIndex = parts.findIndex(part => part.type === 'currency');
        const numberIndex = parts.findIndex(part => part.type === 'integer' || part.type === 'fraction');
        return currencyIndex >= 0 && numberIndex >= 0 && currencyIndex > numberIndex
            ? 'right'
            : 'left';
    }
    return currencySymbolPositions[currencyCode] || 'left';
}

function getCurrencyFormatInfo(currencyCode) {
    if(!currencyCode || typeof currencyCode !== 'string') {
        return { symbol: '', position: 'left' };
    }

    const cacheKey = currencyCode.toUpperCase();
    if (currencyFormatInfoCache[cacheKey]) {
        return currencyFormatInfoCache[cacheKey];
    }

    if(currencyCode.toLowerCase() === 'dmo') {
        return currencyFormatInfoCache[cacheKey] = { symbol: '$', position: 'left' };
    }

    const cleanCode = currencyCode.toUpperCase();
    if(cleanCode.length !== 3) {
        return currencyFormatInfoCache[cacheKey] = { symbol: currencyCode, position: 'left' };
    }

    if(cleanCode === 'UZS') {
        return currencyFormatInfoCache[cacheKey] = { symbol: currencyCode, position: 'left' };
    }

    const preferredLocale = getPreferredCurrencyLocale(cleanCode);
    const locales = getCurrencyLocales(cleanCode);

    try {
        const formatter = new Intl.NumberFormat(locales, {
            style: 'currency',
            currency: cleanCode,
            currencyDisplay: 'narrowSymbol',
        });
        const parts = formatter.formatToParts(0);
        const currencyPart = parts.find(part => part.type === 'currency');
        const symbol = currencyPart && currencyPart.value;
        const position = resolveCurrencySymbolPosition(cleanCode, preferredLocale, parts);

        if (!symbol || symbol.toUpperCase() === cleanCode) {
            return currencyFormatInfoCache[cacheKey] = { symbol: currencyCode, position };
        }

        return currencyFormatInfoCache[cacheKey] = { symbol, position };
    } catch (error) {
        return currencyFormatInfoCache[cacheKey] = {
            symbol: currencyCode,
            position: currencySymbolPositions[cleanCode] || 'left',
        };
    }
}

function getCurrencySymbol(currencyCode) {
    return getCurrencyFormatInfo(currencyCode).symbol;
}

function getCurrencySymbolPosition(currencyCode) {
    return getCurrencyFormatInfo(currencyCode).position;
}

function hasCurrencySymbol(currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    if (!symbol) return false;
    return symbol.toUpperCase() !== String(currencyCode).toUpperCase();
}

function syncUserBalanceCurrencyClass(currency) {
    const el = (typeof elements !== 'undefined' && elements.userBalance)
        || document.querySelector('#userBalance');
    if (!el) return;

    const code = (currency || (typeof player !== 'undefined' && player.currency) || {}).currencyCode;
    el.classList.toggle('no-currency-symbol', !hasCurrencySymbol(code));
    el.classList.toggle('currency-symbol-right', getCurrencySymbolPosition(code) === 'right');
}

function getTextFitContentWidth(el) {
    const children = el.children;
    if (children.length === 1 && el.childNodes.length === 1) {
        return children[0].scrollWidth;
    }
    if (children.length > 1) {
        return el.scrollWidth;
    }
    return el.scrollWidth;
}

function getTextFitAvailableWidth(el, computed) {
    const padL = parseFloat(computed.paddingLeft) || 0;
    const padR = parseFloat(computed.paddingRight) || 0;
    return el.clientWidth - padL - padR;
}

const textFitState = new WeakMap();

function commitTextFitSize(el, px) {
    px = Math.round(px * 100) / 100;
    const next = px + 'px';
    if (el.style.fontSize === next) return;
    const current = parseFloat(el.style.fontSize);
    if (Number.isFinite(current) && Math.abs(current - px) < 0.05) return;
    el.style.fontSize = next;
}

function applyTextFitSize(el, maxSize, available, neededAtMax) {
    let size = maxSize * available / neededAtMax;
    if (!Number.isFinite(size) || size <= 0) return;
    size = Math.max(1, Math.min(maxSize, size));
    commitTextFitSize(el, size);
    const used = getTextFitContentWidth(el);
    if (used > available) {
        commitTextFitSize(el, Math.max(1, size * available / used));
    }
}

function fitText(el) {
    if (!el || textFitSuspended) return;

    const width = el.clientWidth;
    if (width <= 0) return;

    const content = el.textContent;
    const prev = textFitState.get(el);
    if (prev && prev.content === content && prev.width === width && prev.fontSize === el.style.fontSize) return;

    const computed = getComputedStyle(el);
    const available = getTextFitAvailableWidth(el, computed);
    if (available <= 0) return;

    const needed = getTextFitContentWidth(el);
    const inline = el.style.fontSize;

    if (needed <= available) {
        if (inline && prev && prev.width === width) {
            textFitState.set(el, { content, width, fontSize: el.style.fontSize });
            return;
        }
        if (!inline) {
            textFitState.set(el, { content, width, fontSize: '' });
            return;
        }
        el.style.fontSize = '';
        const neededMax = getTextFitContentWidth(el);
        if (neededMax <= available) {
            textFitState.set(el, { content, width, fontSize: '' });
            return;
        }
        const maxSize = parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isFinite(maxSize) || maxSize <= 0) {
            el.style.fontSize = inline;
            return;
        }
        applyTextFitSize(el, maxSize, available, neededMax);
        textFitState.set(el, { content, width, fontSize: el.style.fontSize });
        return;
    }

    el.style.fontSize = '';
    const maxSize = parseFloat(getComputedStyle(el).fontSize);
    const neededMax = getTextFitContentWidth(el);
    if (inline) el.style.fontSize = inline;

    if (!Number.isFinite(maxSize) || maxSize <= 0) return;

    if (neededMax <= available) {
        el.style.fontSize = '';
        textFitState.set(el, { content, width, fontSize: '' });
        return;
    }

    applyTextFitSize(el, maxSize, available, neededMax);
    textFitState.set(el, { content, width, fontSize: el.style.fontSize });
}

function formatCollectMultiplier(value) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n)) return '';
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    if (Object.is(rounded, -0)) return '0';
    return String(rounded);
}

let collectFitMeasureCtx = null;

function fitCollectAmount(el) {
    const wrap = el && el.classList && el.classList.contains('collect-value-amount')
        ? el
        : (el && el.closest ? el.closest('.collect-value-amount') : null);
    if (!wrap || !wrap.isConnected) return;

    const slot = wrap.closest('.collect-value') || wrap;
    if (getComputedStyle(wrap).display === 'none' || slot.clientWidth < 48) return;

    const wrapCs = getComputedStyle(wrap);
    const slotCs = getComputedStyle(slot);
    let used = (parseFloat(slotCs.paddingLeft) || 0) + (parseFloat(slotCs.paddingRight) || 0)
        + (parseFloat(wrapCs.paddingLeft) || 0) + (parseFloat(wrapCs.paddingRight) || 0);
    slot.querySelectorAll(':scope > .bet-input-btn').forEach((btn) => {
        const bcs = getComputedStyle(btn);
        used += btn.offsetWidth + (parseFloat(bcs.marginLeft) || 0) + (parseFloat(bcs.marginRight) || 0);
    });
    const available = Math.floor(slot.clientWidth - used);
    if (available <= 0) return;

    const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const token = wrapCs.getPropertyValue('--font-size-text-base').trim();
    let maxSize = token.endsWith('rem') ? parseFloat(token) * rootFs : parseFloat(token);
    if (!Number.isFinite(maxSize) || maxSize <= 0) maxSize = parseFloat(wrapCs.fontSize);
    if (!Number.isFinite(maxSize) || maxSize <= 0) return;

    if (!collectFitMeasureCtx) {
        collectFitMeasureCtx = document.createElement('canvas').getContext('2d');
        if (!collectFitMeasureCtx) return;
    }

    const field = wrap.querySelector('.collect-field');
    const suffix = wrap.querySelector('.collect-suffix');
    const font = `${wrapCs.fontStyle} ${wrapCs.fontWeight} ${maxSize}px ${wrapCs.fontFamily}`;
    collectFitMeasureCtx.font = font;
    const gap = parseFloat(wrapCs.columnGap || wrapCs.gap) || 0;
    const needed = collectFitMeasureCtx.measureText(field ? field.value : '').width
        + collectFitMeasureCtx.measureText(suffix ? (suffix.textContent || 'x') : 'x').width
        + gap
        + Math.max(4, maxSize * 0.3);

    const next = needed > available
        ? (Math.round(Math.max(1, Math.min(maxSize, maxSize * available / needed)) * 100) / 100) + 'px'
        : '';
    if (wrap.style.fontSize !== next) wrap.style.fontSize = next;
}

function fitTextAll(root) {
    let nodes;
    if (!root) {
        nodes = document.querySelectorAll('.text-fit');
    } else if (root.classList && root.classList.contains('text-fit')) {
        nodes = [root];
    } else if (root.querySelectorAll) {
        nodes = root.querySelectorAll('.text-fit');
    } else {
        return;
    }

    nodes.forEach(fitText);
}

let fitTextRaf = 0;
let fitTextPending = null; // null | 'all' | Set<root>
let textFitSuspended = false;

function suspendTextFit() {
    textFitSuspended = true;
    if (fitTextRaf) {
        cancelAnimationFrame(fitTextRaf);
        fitTextRaf = 0;
    }
}

function isTextFitSuspended() {
    return textFitSuspended;
}

function resumeTextFit(root) {
    textFitSuspended = false;
    if (root) {
        scheduleFitTextAll(root);
        return;
    }
    if (fitTextPending === 'all') {
        scheduleFitTextAll();
    } else if (fitTextPending) {
        const roots = fitTextPending;
        fitTextPending = null;
        roots.forEach((r) => scheduleFitTextAll(r));
    }
}

function scheduleFitTextAll(root) {
    if (fitTextPending === 'all') {
        // already fitting everything
    } else if (!root) {
        fitTextPending = 'all';
    } else {
        if (!fitTextPending) fitTextPending = new Set();
        if (fitTextPending !== 'all') fitTextPending.add(root);
    }

    if (textFitSuspended || fitTextRaf) return;

    fitTextRaf = requestAnimationFrame(() => {
        fitTextRaf = 0;
        const pending = fitTextPending;
        fitTextPending = null;
        if (textFitSuspended) {
            fitTextPending = pending;
            return;
        }
        if (pending === 'all') {
            fitTextAll();
        } else if (pending) {
            pending.forEach((r) => fitTextAll(r));
        }
    });
}

let textFitInitialized = false;
let betChipsResizeObserver = null;
let collectAmountResizeObserver = null;

function observeBetChipsForTextFit() {
    if (typeof ResizeObserver !== 'function') return;

    if (!betChipsResizeObserver) {
        let lastW = new WeakMap();
        betChipsResizeObserver = new ResizeObserver((entries) => {
            if (textFitSuspended) return;
            for (const entry of entries) {
                const el = entry.target;
                const w = Math.round(el.clientWidth);
                if (w <= 0 || lastW.get(el) === w) continue;
                lastW.set(el, w);
                scheduleFitTextAll(el);
            }
        });
    }

    document.querySelectorAll('.bet-chips').forEach((row) => {
        betChipsResizeObserver.observe(row);
    });
}

function observeCollectAmountForTextFit() {
    if (typeof ResizeObserver !== 'function') return;

    if (!collectAmountResizeObserver) {
        let lastW = new WeakMap();
        const timers = new WeakMap();
        collectAmountResizeObserver = new ResizeObserver((entries) => {
            if (textFitSuspended) return;
            for (const entry of entries) {
                const el = entry.target;
                const w = Math.round(el.clientWidth);
                if (w <= 0 || lastW.get(el) === w) continue;
                lastW.set(el, w);
                const prev = timers.get(el);
                if (prev) clearTimeout(prev);
                timers.set(el, setTimeout(() => {
                    timers.delete(el);
                    fitCollectAmount(el);
                }, 120));
            }
        });
    }

    document.querySelectorAll('.collect-value-amount').forEach((el) => {
        collectAmountResizeObserver.observe(el);
    });
}

function initTextFit() {
    scheduleFitTextAll();
    observeBetChipsForTextFit();
    observeCollectAmountForTextFit();
    if (textFitInitialized) return;
    textFitInitialized = true;
    window.addEventListener('resize', () => {
        clearTimeout(initTextFit.resizeTimer);
        initTextFit.resizeTimer = setTimeout(() => {
            if (textFitSuspended) return;
            scheduleFitTextAll();
            document.querySelectorAll('.collect-value-amount').forEach((el) => fitCollectAmount(el));
        }, 200);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => scheduleFitTextAll());
}