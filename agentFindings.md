# Agent Security Findings

> Defensive code-review record. This document intentionally avoids weaponized exploit payloads, credential extraction, wager manipulation, or interaction with live gambling services. The browser-environment sections describe safe regression conditions rather than attack execution.

## 1. Critical — Arbitrary JavaScript execution through an untrusted `postMessage` sink

**Leak**

`static.ssg-public.com/JetXNew/ui.js` contains a `message` event handler that falls through to `eval(event.data)` when a message is not one of its recognized commands. The handler does not first establish a trusted sender origin or validate the message schema.

This creates a browser trust-boundary violation: data supplied through `window.postMessage()` reaches a JavaScript execution sink.

**Safe browser-environment verification**

A defensive regression test should dispatch a synthetic `MessageEvent` whose payload is an ordinary non-command string and assert that the handler does **not** invoke `eval`, mutate the DOM, invoke navigation, or call application actions.

Do not use a payload that performs credential access, wagering, account actions, persistence, or exfiltration.

**Relevant patch**

1. Remove `eval` completely.
2. Require `event.source === window.parent` (or the explicitly documented trusted source).
3. Require `event.origin` to equal a configured trusted origin.
4. Require `typeof event.data === "object"` and reject null/non-object messages.
5. Validate the message against a strict allowlist of command names and value types.
6. For legacy string commands, map exact strings to internal functions instead of interpreting them as JavaScript.

Example defensive structure:

```js
const TRUSTED_ORIGINS = new Set([
    "https://trusted.example"
]);

window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (!TRUSTED_ORIGINS.has(event.origin)) return;

    const message = event.data;
    if (!message || typeof message !== "object") return;

    switch (message.name) {
        case "update-game-balance":
            if (typeof message.value !== "number") return;
            // updateBalance(message.value);
            break;
        case "inactivity.check.popup.exit":
            leaveGame();
            break;
        default:
            return;
    }
});
```

The actual trusted origin must come from deployment configuration, not from the incoming message.

---

## 2. High — `ReturnUrl` can reach a JavaScript execution sink

**Leak**

`static.ssg-public.com/JetXNew/utils.js` obtains `ReturnUrl` from URL search parameters and `leaveGame()` contains a branch that recognizes `javascript:` and executes the decoded value with `eval()`.

The data flow is:

`location.search -> URLSearchParams -> ReturnUrl -> leaveGame() -> eval()`

This is an unsafe URL-to-code conversion.

**Safe browser-environment verification**

Add a unit/regression test with a synthetic ReturnUrl and assert that the exit routine rejects non-HTTP(S) schemes and never invokes a code-evaluation API.

The test should not execute the supplied value.

**Relevant patch**

- Delete the `javascript:` branch.
- Parse the destination with `new URL(value, location.origin)`.
- Permit only explicitly approved `http:`/`https:` destinations.
- Prefer a strict same-origin or configured-domain allowlist.
- Navigate only after validation with `location.assign()`.
- Never use `eval`, `Function()`, or `javascript:` URLs for navigation.

---

## 3. High — Sensitive state sent with wildcard `postMessage` target origins

**Leak**

Client code uses `window.parent.postMessage(..., "*")` / `window.top.postMessage(..., "*")` for integration events. Reviewed paths include messages carrying account/game state such as balance-related information and, in the integration flow, token/session-related values.

A wildcard target origin means the sender does not constrain which embedding origin may receive the message.

**Safe browser-environment verification**

In a browser regression test, replace the real parent with a controlled mock and assert that sensitive messages are sent only to an explicitly configured origin. Also assert that no sensitive token is present in messages that do not strictly require it.

**Relevant patch**

Use a configured target origin:

```js
window.parent.postMessage(message, TRUSTED_PARENT_ORIGIN);
```

For receiving handlers, validate both:

```js
event.source === window.parent
event.origin === TRUSTED_PARENT_ORIGIN
```

Do not transmit bearer credentials when a non-sensitive identifier or server-side session can perform the same function.

---

## 4. High — Session material exposed in a URL

**Leak**

`eu-server/JetXnew/Board.aspx` contains a form action with a `Token` query parameter. If that value represents a bearer/session credential, placing it in a URL expands its exposure through browser history, logs, analytics, screenshots, and Referer propagation.

**Safe browser-environment verification**

A regression check should verify that newly issued sessions do not place bearer credentials in query strings and that application logs redact legacy token parameters.

No real token should be replayed.

**Relevant patch**

- Move session credentials to Secure, HttpOnly, appropriately SameSite cookies where architecture permits.
- Alternatively use a short-lived, one-time bootstrap nonce that is exchanged server-side for a session.
- Set an appropriate `Referrer-Policy`, preferably `no-referrer` on token/bootstrap pages.
- Redact token-bearing URLs from logs and telemetry.
- Rotate/revoke bootstrap credentials after exchange.
- Avoid third-party analytics on pages containing authentication material.

---

## 5. High — Potential DOM XSS from untrusted values inserted with `innerHTML`

**Leak**

Reviewed client code contains HTML interpolation using values that can originate from server/player/game state. A representative path is the use of `player.displayName` in an `innerHTML` assignment. Similar HTML construction occurs in game-stat rendering.

If those fields are not guaranteed to be encoded before reaching the browser, attacker-controlled text can become markup rather than text.

**Safe browser-environment verification**

Regression tests should provide strings containing HTML metacharacters and assert that they appear as literal text nodes rather than parsed elements. Do not use scripts, event handlers, or data-exfiltration payloads.

**Relevant patch**

Prefer DOM APIs:

```js
const title = document.querySelector("#popup-device-title");
title.textContent = String(player.displayName ?? "");
```

For generated tables, construct elements with `document.createElement()` and assign untrusted values with `textContent`. If HTML is genuinely required, use a narrowly configured, maintained sanitizer and an explicit allowlist.

Also replace inline handler strings such as `setAttribute("onclick", "...")` with `addEventListener()`.

---

## 6. Medium/High — Incoming `postMessage` commands lack integrity validation

**Leak**

Multiple message handlers act on message contents without consistently validating sender origin/source. Commands affecting fullscreen, lobby state, inactivity/reality controls, balance-related UI, and integration state should not be accepted from arbitrary windows.

Even without arbitrary code execution, this can permit unauthorized UI/state transitions.

**Safe browser-environment verification**

Regression tests should send structurally valid commands from an untrusted origin and assert that application state remains unchanged.

**Relevant patch**

Centralize message validation in one gateway:

```js
function isTrustedMessage(event) {
    return event.source === window.parent &&
        TRUSTED_PARENT_ORIGINS.has(event.origin);
}
```

Validate command names and payload schemas before dispatching any application action.

---

## 7. Medium — Client-persisted betting/autoplay state requires server-authoritative validation

**Leak**

Client-side storage is used for bet/autoplay/cashout-related UI state. Browser storage is controlled by the client and must therefore be treated as untrusted input.

**Safe browser-environment verification**

Regression tests should alter stored values to malformed, out-of-range, or unexpected types and assert that the UI rejects them and that the server remains authoritative.

Do not use the test to submit or execute real wagers.

**Relevant patch**

- Treat all localStorage/sessionStorage values as untrusted.
- Parse and validate against strict schemas and ranges.
- Namespace application keys.
- Never use client storage as an authorization mechanism.
- Keep wager limits, account balance, and transaction authorization server-side.
- Require explicit user interaction before enabling automated actions.

---

# Remediation priority

| Priority | Finding | Primary fix |
|---|---|---|
| P0 | `postMessage` -> `eval` | Remove `eval`; strict origin/schema validation |
| P1 | `ReturnUrl` -> `eval` | Remove JavaScript URLs and code execution |
| P1 | Wildcard `postMessage("*")` | Explicit target-origin allowlist |
| P1 | Token in URL | Cookie/bootstrap nonce; referrer/logging controls |
| P1 | Untrusted `innerHTML` | `textContent`/DOM APIs or strict sanitizer |
| P2 | Unvalidated message commands | Centralized message gateway |
| P2 | Client-persisted wager state | Server-authoritative validation |

## Defensive acceptance criteria

A remediation is considered complete when:

1. No application path evaluates message data as JavaScript.
2. No application path evaluates URL/query-string data as JavaScript.
3. Every cross-window message has an explicit trusted-origin policy.
4. Sensitive messages contain the minimum required data.
5. Authentication/session credentials are not bearer tokens in ordinary URLs.
6. Untrusted strings are rendered as text rather than HTML.
7. Client-persisted state cannot authorize or bypass server-side transaction rules.
8. Regression tests demonstrate rejection of malformed/untrusted inputs.
