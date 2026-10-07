elements.onlineUsers = document.querySelector('#online-users');
elements.infoStatsPlayers = document.querySelector('#info-stats-players');
elements.msIcon = document.querySelector('#ms-icon');
elements.ms = document.querySelector('#ms');
elements.time = document.querySelector('#time');
let workerTime = elValue('workerTime') ?? 200;
let workerCode = `
    self.onmessage = function (event) {
        if (event.data === 'start') {
            setInterval(function () {
                self.postMessage('completed');
            }, ${workerTime});
        }
    };
`;
let blob = new Blob([workerCode], { type: 'application/javascript' });
let workerUrl = URL.createObjectURL(blob);
let worker = new Worker(workerUrl);
URL.revokeObjectURL(workerUrl);
let playerCountWorker = true;
let pingInFlight = false;
worker.onmessage = function (event) {
    const hubConnected = window.$ && $.connection && $.connection.hub
        && $.connection.hub.state === $.signalR.connectionState.connected;

    if (hubConnected) {
        if (!pingInFlight) {
            const startTime = performance.now();
            try {
                pingInFlight = true;
                window.hub.server.timerPing(window.token).then((data) => {
                    const endTime = performance.now();
                    const ping = Math.round(endTime - startTime);
                    if (data !== undefined) {
                        if (data.ErrorMessage) {
                            OnRequestFail(data, null);
                        }
                        playerCountWorker = true;
                        let count = IsNetworkOptimized ? data.o : data.OnlinePlayers;
                        if (count === undefined || count === null) {
                            count = 0;
                        }
                        setOnlineUsers(count);
                        elements.ms.textContent = `${ping}MS`; // •
                        if(ping >= 300) {
                            document.querySelector('#ms-icon').style.color = '#ff0000';
                            document.querySelector('#ms-icon').innerHTML = '<use href="#wifi-error-02"></use>';
                        } else {
                            document.querySelector('#ms-icon').style.color = 'var(--Text-Icons-Tertiary)';
                            document.querySelector('#ms-icon').innerHTML = '<use href="#wifi-02"></use>'
                        }

                        const now = new Date();
                        elements.time.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                    } else {
                        playerCountWorker = false;
                    }
                }).catch(() => {
                    // keep previous ping UI; avoid unresolved pile-up
                }).then(() => {
                    pingInFlight = false;
                });
            } catch (e) {
                pingInFlight = false;
                showTimeoutPopup();
            }
        }
    } else {
        showTimeoutPopup();
        return;
    }

    const timeoutPopup = document.querySelector('[data-popup="timeout"]');
    if (timeoutPopup && !timeoutPopup.hidden) return;

    let hasBet = false;
    if (player.bets !== undefined && player.bets !== null) {
        for (let i = 0; i < player.bets.length; i++) {
            let bet = player.bets[i];
            let activeButton = bet.ActiveButton;

            let button = document.getElementById(`bet-${i}`);
            if (button && (button.classList.contains('cancel-bet') || button.classList.contains('cash-out') || button.classList.contains('disable'))) {
                hasBet = true;
            }
        }
    }
    if (showRealityCheckPopup && !hasBet) window.parent.postMessage({ key: "draw.reality.check.popup" }, "*");
    inactivityCheckSend(hasBet);
};

function timerPing() {
    worker.postMessage('start');
}

function setOnlineUsers(count) {
    elements.onlineUsers.textContent = `${count}`;
    elements.infoStatsPlayers.textContent = `${count}`;
}