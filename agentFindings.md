(function () {
    "use strict";

    // Guard against double-install.
    if (window.__JETX_LOGGER_INSTALLED) {
        console.warn("[JetX] logger already installed. Run window.__JETX_UNWRAP() first.");
        return;
    }
    window.__JETX_LOGGER_INSTALLED = true;

    const hub = window.$.connection.hub;
    const hubProxy = window.hub;

    // ---- client handlers ----
    const origResponse = hubProxy.client.response;
    let tickN = 0;
    hubProxy.client.response = function (info) {
        if (info.f ) {
            console.log("[response]", JSON.stringify({ f: info.f, v: info.v, n: info.n, s: info.s }));
        }
        return origResponse.apply(this, arguments);
    };

    const origGBoard = hubProxy.client.gBoard;
    hubProxy.client.gBoard = function (gameInfo) {
        console.log("[gBoard]", JSON.stringify(gameInfo, null, 2));
        return origGBoard.apply(this, arguments);
    };

    const origG = hubProxy.client.g;
    hubProxy.client.g = function (updateInfo) {
        if (updateInfo && updateInfo.I && updateInfo.I.i === (typeof player !== "undefined" ? player.counterId : null)) {
            console.log("[g]", JSON.stringify(updateInfo, null, 2));
        }
        return origG.apply(this, arguments);
    };

    // ---- server proxy ----
    const origGetBoardInfo = hubProxy.server.getBoardInfo;
    hubProxy.server.getBoardInfo = function () {
        const p = origGetBoardInfo.apply(this, arguments);
        p.then(
            (data) => console.log("[getBoardInfo.resolve]", JSON.stringify(data, null, 2)),
            (err) => console.log("[getBoardInfo.reject]", err)
        );
        return p;
    };

    // ---- unwrap ----
    window.__JETX_UNWRAP = function () {
        if (hubProxy.client.response === hubProxy.client.response) {} // no-op guard
        hubProxy.client.response = origResponse;
        hubProxy.client.gBoard  = origGBoard;
        hubProxy.client.g       = origG;
        hubProxy.server.getBoardInfo = origGetBoardInfo;
        window.__JETX_LOGGER_INSTALLED = false;
        console.log("[JetX] logger unwrapped. Reconnect to re-subscribe the originals.");
    };

    // ---- reconnect to re-subscribe ----
    hub.stop().done(() => {
        hub.start().done(() => {
            console.log("[reconnect] new handlers active");
            console.log("Run window.__JETX_UNWRAP() to restore originals (then reconnect).");
        });
    });
})();

(function () {
    "use strict";

    if (window.__origAjax) {
        console.warn("[ajax] already wrapped. Run window.__restoreAjax() to unwrap.");
        return;
    }

    const $ = window.jQuery;
    if (!$ || !$.ajax) {
        console.warn("[ajax] jQuery not found.");
        return;
    }

    window.__origAjax = $.ajax;

    $.ajax = function () {
        // Normalize the two $.ajax signatures: (url, options) and (options).
        const cfg = typeof arguments[0] === "string"
            ? Object.assign({ url: arguments[0] }, arguments[1] || {})
            : (arguments[0] || {});

        const method = (cfg.method || cfg.type || "GET").toUpperCase();
        const url = cfg.url || "(no url)";
        const callId = (Math.random() * 1e9) | 0;
        const t0 = performance.now();

        console.log(`[ajax.call #${callId}] ${method} ${url}`, cfg.data || "");

        const jqXHR = window.__origAjax.apply(this, arguments);

        jqXHR.done((data) => {
            const ms = (performance.now() - t0).toFixed(1);
            console.log(`[ajax.resolve #${callId}] ${method} ${url} (${ms}ms)`, data);
        });

        jqXHR.fail((xhr, status, err) => {
            const ms = (performance.now() - t0).toFixed(1);
            console.log(`[ajax.reject #${callId}] ${method} ${url} (${ms}ms) status=${xhr.status} err=${err}`, xhr.responseText || "");
        });

        jqXHR.always(() => {
            // Optional: log completion regardless of outcome.
        });

        return jqXHR;
    };

    window.__restoreAjax = function () {
        if (!window.__origAjax) {
            console.warn("[ajax] nothing to restore.");
            return;
        }
        $.ajax = window.__origAjax;
        window.__origAjax = null;
        console.log("[ajax] restored.");
    };

    console.log("[ajax] wrapped. Run window.__restoreAjax() to unwrap.");
})();
