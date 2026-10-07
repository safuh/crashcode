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


---

# Review of Added Browser Instrumentation

The latest addition is an instrumentation harness rather than an application finding. It is useful for a sandbox audit because it observes existing client/server boundaries without changing the application logic, but it also introduces several important limitations and risks.

## 15. High — The instrumentation itself logs potentially sensitive game/session data

**Observed**

The added hooks serialize and print:

- SignalR `response` fields `f/v/n/s`;
- complete `gBoard` objects;
- selected `g` updates;
- complete `getBoardInfo` responses;
- AJAX request data;
- complete AJAX responses;
- AJAX error bodies.

**Risk**

This can turn the diagnostic console into a secondary disclosure surface. If a response contains credentials, player information, unreleased game state, or other sensitive values, the logger copies that information into persistent browser/devtools history and potentially into captured screenshots, telemetry, or shared debugging artifacts.

**Patch**

Make logging opt-in and field-allowlisted. Redact credentials and player identifiers by default. Prefer structural summaries over `JSON.stringify(data)` of entire objects.

For example, diagnostic output should record:

`event type + round phase + message size + approved field names + timestamp`

rather than an unrestricted copy of the payload.

Do not commit real session tokens or captured production responses to the repository.

---

## 16. Medium — The `__JETX_UNWRAP` guard contains a no-op and does not verify installation state

**Observed**

The unwrap function contains:

```
if (hubProxy.client.response === hubProxy.client.response) {}
```

This comparison is tautologically true and has no protective effect.

**Patch**

Track the exact installed wrapper references in a private state object and restore only when those references are still installed. This also prevents accidentally overwriting another diagnostic wrapper installed after this one.

---

## 17. Medium — Reconnect-based instrumentation can alter test behavior

**Observed**

The harness calls:

```
hub.stop().done(() => {
    hub.start().done(...)
});
```

after installing the handlers.

**Risk**

Stopping and restarting the SignalR connection changes connection lifecycle, timing, subscriptions, ordering, and potentially server-side session state. A result observed after this operation cannot automatically be treated as equivalent to an untouched browser session.

**Patch**

Prefer installing instrumentation before the connection starts in a dedicated sandbox fixture. If reconnecting is unavoidable, record the reconnect as a test event and exclude the affected interval from timing/oracle conclusions.

---

## 18. Medium — Wrapper installation is vulnerable to stale references

**Observed**

The code saves the current handler:

```
const origResponse = hubProxy.client.response;
```

and later restores it.

**Risk**

If another wrapper is installed before this harness, `origResponse` may already be a wrapper. If another component replaces the handler after installation, the unwrap operation can overwrite that later replacement.

**Patch**

Use a Symbol/private registry where available, store the exact installed function, and restore only when:

```
currentHandler === installedWrapper
```

Otherwise leave the newer handler untouched and report a restore conflict.

---

## 19. Medium — AJAX logging currently captures request payloads and response bodies indiscriminately

**Observed**

The `$.ajax` wrapper logs `cfg.data`, successful response data, and failure response text.

**Risk**

This is broader than required for a game-flow audit and can capture authentication material, account data, or unrelated application traffic.

**Patch**

Introduce an explicit URL/method allowlist for diagnostic logging. Redact fields matching credential/session patterns and impose a maximum payload size. Keep full bodies disabled by default.

---

## 20. Medium — The instrumentation does not establish whether a value is secret, public, or future state

Capturing a message proves that a value crossed a browser boundary; it does **not** establish that the value is exploitable or improperly disclosed.

The audit should classify each observed field against the round lifecycle:

```
server-authoritative state
        ↓
authorized client message
        ↓
client state transition
        ↓
rendering
        ↓
terminal disclosure
```

A finding should be promoted to an actual information-disclosure defect only when a field is demonstrably available before its documented disclosure point or to an unauthorized client.

**Patch**

Add a field-classification fixture containing:

- field name;
- source message;
- round phase;
- intended visibility;
- sensitivity;
- authorization requirement;
- first permitted disclosure event.

---

## 21. Medium — The `g` filter is player-specific but not a confidentiality boundary

**Observed**

The logger filters `g` messages using:

```
updateInfo.I.i === player.counterId
```

**Risk**

This is only a client-side diagnostic filter. It cannot establish that the server is correctly isolating player data. A malicious or modified browser must always be considered untrusted.

**Patch**

Enforce player/round authorization on the server. Treat client-side filtering only as a convenience for test output.

---

## 22. Low/Medium — Random diagnostic call IDs are unnecessary

The AJAX logger creates a call ID with `Math.random()`.

This is adequate for local correlation but has no security or uniqueness guarantee.

**Patch**

Use a monotonic counter for deterministic sandbox traces:

```
let ajaxSequence = 0;
const callId = ++ajaxSequence;
```

This makes traces reproducible and removes unnecessary dependence on client RNG.

---

# Recommended sandbox trace format

For each observed message, retain a structured record rather than raw payloads:

| Field | Purpose |
|---|---|
| timestamp | ordering/timing |
| transport | SignalR / AJAX |
| operation | logical operation |
| direction | client→server / server→client |
| round phase | pre-round / active / terminal / history |
| field names | schema discovery |
| field classification | public / private / secret / future |
| authorization context | expected recipient |
| disclosure event | when field may first appear |
| payload size | anomaly detection |
| redaction status | confirms sensitive data handling |

## Promotion rule

Do not classify a browser-observed value as a confirmed game-data leak merely because the instrumentation can see it.

Promote it to **confirmed disclosure** only if the sandbox demonstrates one of these defensive conditions:

1. secret/RNG material is present before its documented disclosure point;
2. a future terminal result is present before the terminal event;
3. another player's private state is delivered to the wrong client;
4. internal RTP/house-edge/probability configuration is exposed contrary to the intended public contract;
5. animation/timing state contains an unreleased result rather than merely rendering an already-authorized state;
6. a credential or session secret is unnecessarily copied into browser-accessible diagnostic state.

This keeps the instrumentation useful for finding real defects while avoiding false positives caused by simply observing normal client traffic.
