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


---

# Game-State / Information-Disclosure Audit

> Scope: defensive review of the game-data boundary. The objective is to ensure that the browser receives only information it is authorized to know at that point in the round. This section deliberately does not document procedures for extracting a hidden result, predicting a future round, or gaining a wagering advantage.

## 8. High — SignalR exposes a broad game-control and game-data surface

**Observed flow**

The generated SignalR hub proxy at `eu-server/signalr/hubs` exposes these server methods:

- `CreateLoadTimeGameInfo`
- `GetBoardInfo`
- `GetList`
- `GetPlayerInfo`
- `Post`
- `PostBet`
- `Cashout`
- `CashoutMany`
- `TimerPing`

The page bootstraps the connection and supplies a connection query string containing a token and a game group. This makes the SignalR boundary the primary contract to audit for confidentiality and authorization.

**Leak / risk**

A game-data endpoint can become an information-disclosure boundary if its response contains values that are not yet public, including:

- server seed or seed-derived material before the intended disclosure point;
- client seed / nonce state that materially reduces uncertainty about a future result;
- a precomputed crash/result value before the round is terminal;
- internal RNG state or deterministic inputs;
- RTP/house-edge configuration that is not intended for the client;
- future-round metadata;
- privileged player/account state not required by the current UI.

The hub method names alone do not prove that any of these values are leaked. The server-side implementations must be inspected and their response schemas classified.

**Safe verification**

For every hub method, record:

1. authentication state required;
2. authorization decision;
3. request parameters;
4. response schema;
5. whether each field is public, player-private, operator-private, or future-round/secret;
6. the earliest timestamp at which each field is legitimately disclosed.

Automated contract tests should fail if secret/future-round fields appear in a response before their disclosure phase.

**Relevant patch**

- Define explicit DTOs for each hub method rather than returning internal/domain objects.
- Maintain an allowlist of fields permitted on the browser boundary.
- Keep RNG seeds, nonces, internal RNG state, and unrevealed result material server-side.
- Authorize every player-specific method against the authenticated session.
- Reject requests whose token/session does not map to the requested player.
- Add response-schema regression tests for every hub method.

---

## 9. High — Round result, hash, and history UI create a result-disclosure boundary

**Observed flow**

`Board.aspx` contains a game-history modal with fields for:

- multiplier;
- win amount;
- hash;
- result.

The page therefore has a deliberate client-side path for displaying result-verification/history information.

**Leak / risk**

The security boundary is not merely whether a result is displayed. The important invariant is:

> A value representing the current or future terminal result must not reach browser state before the product's intended disclosure point.

A result can leak through DOM state, JavaScript objects, serialized bootstrap data, SignalR messages, hidden elements, history payloads, analytics events, or debugging output even when the visible UI does not display it.

**Safe verification**

Use a synthetic test round in a non-production environment and classify all fields delivered before, during, and after the terminal event. Assert that:

- pre-terminal messages contain only state required for rendering the current phase;
- terminal-result fields first appear at the documented disclosure event;
- historical records contain only completed rounds;
- the DOM does not contain hidden future-result fields;
- global JavaScript objects do not retain unreleased result material.

Do not use the test to predict or act on live results.

**Relevant patch**

- Separate `RoundState` from `RoundResult` DTOs.
- Emit `RoundResult` only after the authoritative server transition to terminal state.
- Remove future-result fields from bootstrap payloads.
- Avoid placing secret/result material in hidden DOM nodes.
- Clear terminal-result state when a new round begins.

---

## 10. High — Client-visible configuration contains operational game limits

**Observed flow**

`Board.aspx` embeds a `GlobalParameters` JSON object in a hidden input. It currently contains values such as currency, minimum/maximum bet, maximum win, and automatic-cashout limits.

**Leak / risk**

These values are not necessarily secrets, but exposing internal limits creates an information-disclosure surface and can cause the browser to become the apparent authority for transaction constraints.

More importantly, any future addition of RTP, probability, RNG, payout-table, or house-edge parameters to the same client configuration would disclose operator-side game configuration unnecessarily.

**Safe verification**

Maintain a schema test that classifies every client-visible configuration key. A new sensitive key should fail CI unless explicitly approved.

**Relevant patch**

- Keep client configuration limited to presentation and non-sensitive constraints.
- Enforce all monetary and game rules server-side.
- Do not ship RNG configuration, probability tables, internal payout logic, or operator-only parameters to the browser.
- Use separate server-only configuration objects rather than serializing a broad global configuration object.

---

## 11. High — Animation/rendering must not become an oracle for an unreleased result

**Observed flow**

`Board.aspx` loads a client-side rendering stack including PixiJS and game-specific canvas/rendering code. The page also exposes timing-related values such as `currentTime`, `workerTime`, and network-optimization state.

**Leak / risk**

A rendering client can accidentally encode information that is supposed to remain undisclosed. Examples of defensive concerns include:

- an animation path selected from a terminal result before the terminal event;
- a deterministic animation duration derived directly from an unreleased result;
- preloaded assets or DOM state that distinguish the future outcome;
- client timers that expose the terminal timestamp earlier than the authoritative event;
- interpolation/extrapolation that reconstructs a hidden terminal value.

The presence of animation code does not itself demonstrate a leak; the state-to-animation mapping must be audited.

**Safe verification**

Instrument a sandbox build and record, by round phase:

`server event -> client message -> state transition -> animation parameters -> rendered frame`

Assert that animation parameters available before the terminal event are sufficient only to render the authorized public state and cannot encode the unreleased terminal result.

**Relevant patch**

- Drive animation from authoritative public state, not hidden result data.
- Do not calculate or transmit future terminal values solely for rendering.
- Keep the terminal transition server-authoritative.
- Use server timestamps/sequence numbers for reconciliation rather than exposing hidden outcome timing.
- Treat all client timing as advisory.

---

## 12. High — SignalR authentication/query-string material should be treated as credential-bearing

**Observed flow**

`Board.aspx` initializes the SignalR connection with a query-string object containing a token and group, and also assigns a token to a global browser variable.

**Leak / risk**

Credential-bearing values in connection URLs and global JavaScript state can be exposed to browser history, network tooling, logs, diagnostics, extensions, screenshots, or unrelated scripts. A token should not be assumed safe merely because the connection is HTTPS.

**Safe verification**

In a non-production environment, verify that:

- credentials are not persisted in ordinary URLs longer than necessary;
- server logs redact token query parameters;
- tokens are scoped, short-lived, and revocable;
- the browser global namespace contains no bearer credential unless strictly required;
- reconnect flows do not unnecessarily reuse long-lived credentials.

Never use a real player/session token in tests.

**Relevant patch**

- Prefer authenticated cookies or a short-lived connection bootstrap credential.
- If a query-string token is unavoidable, make it short-lived, scoped, non-reusable, and redacted from logs.
- Do not duplicate the credential into `window` unless required.
- Rotate/revoke connection credentials at session termination.
- Bind the token to the intended user/session and authorization context server-side.

---

## 13. Medium/High — Client-side history and verification data must be treated as untrusted display data

**Leak / risk**

History/result/hash values cross the server-to-browser boundary and are displayed by the client. If the renderer treats these fields as executable markup or trusted structured data, a malformed server-side value or compromised upstream source could cross into the DOM unsafely.

This overlaps with the DOM-XSS finding above but is specifically relevant to game-history/result rendering.

**Safe verification**

Use benign metacharacter test strings in a sandbox fixture and assert that history fields remain text nodes. Validate numeric result fields as numbers and hashes against their expected encoding/length before display.

**Relevant patch**

- Render hash/result/player fields using `textContent` or equivalent safe DOM construction.
- Validate numeric result fields before formatting.
- Validate hashes as data, not HTML.
- Reject unexpected fields from server responses rather than silently rendering them.

---

## 14. Medium — Debug/source-map/global-state disclosure should be part of the game-data audit

**Leak / risk**

Client-side JavaScript, source maps, debug globals, console logging, and hidden DOM state can disclose internal game state even when production API responses are correctly scoped.

The audit should specifically check for:

- source maps shipped to production;
- development/debug flags;
- console logging of round state;
- globally reachable objects containing game state;
- hidden DOM attributes containing future/result values;
- serialized bootstrap objects;
- exception messages containing server-side details.

**Safe verification**

Build a production artifact and enumerate:

1. `window` properties added by the application;
2. script and source-map URLs;
3. console output during a complete synthetic round;
4. hidden inputs/data attributes containing game state;
5. serialized JSON embedded in HTML.

Flag any secret, future-round, or internal-only field.

**Relevant patch**

- Disable debug logging in production.
- Do not ship source maps containing sensitive implementation details unless the deployment model explicitly permits them.
- Keep authoritative game state in scoped application modules rather than `window`.
- Remove hidden diagnostic fields from production markup.
- Redact sensitive values from error telemetry.

---

# Game-data acceptance criteria

The game-data boundary is considered hardened when all of the following are true:

1. No browser-visible object contains unreleased seed, nonce, RNG state, or future terminal-result material.
2. SignalR responses use explicit public DTOs and contain only fields authorized for the current round phase.
3. Player-specific SignalR methods enforce server-side authentication and authorization.
4. The terminal result first reaches the client at the documented disclosure event.
5. History contains only completed-round data.
6. Animation parameters cannot be used as an oracle for a future result.
7. RTP, house-edge, probability tables, and internal payout/RNG configuration remain server-side unless deliberately public.
8. Client configuration is not treated as the authority for bets, cashout, limits, or settlement.
9. Connection credentials are short-lived/scoped and are not unnecessarily exposed through URLs or global variables.
10. Production builds contain no unintended debug/source-map/global-state disclosure.
11. Regression tests cover pre-terminal, terminal, reconnect, history, and malformed-message states.
12. Any externally hosted game JavaScript is version-pinned or mirrored for auditability; otherwise the repository audit must explicitly record the external dependency as an unverified trust boundary.

## Recommended audit matrix

| Surface | What to classify | Required invariant |
|---|---|---|
| SignalR request | token/session/group | authenticated + authorized |
| SignalR response | fields by round phase | no future/secret data |
| Bootstrap HTML | hidden inputs/global JSON | no secret/future result |
| DOM | visible + hidden state | no unreleased result |
| Animation | frame/timing parameters | no result oracle |
| History | hash/result/multiplier | completed rounds only |
| Client config | limits/game parameters | presentation only; server authoritative |
| Browser globals | game/session objects | minimum necessary state |
| Source maps/debug | implementation/state | no sensitive production disclosure |
| Logs/telemetry | tokens/results | redacted/minimized |

