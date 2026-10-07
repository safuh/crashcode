function GameEvents() {
    this.onAppFrameReady = function () {
        this.sendMessage('onAppFrameReady');
    };

    this.quit = function () {
        this.sendMessage('quit');
    };

    this.gameReady = function () {
        this.sendMessage('gameReady');
    };

    this.cashier = function () {
        this.sendMessage('cashier');
    };

    this.gameDataLoaded = function () {
        this.sendMessage('gameDataLoaded');
    };

    this.roundStart = function () {
        this.sendMessage('roundStart');
    };

    this.roundStarted = function () {
        this.sendMessage('roundStarted');
    };

    this.autoPlayStarted = function () {
        this.sendMessage('autoPlayStarted');
    };

    this.autoPlayStoped = function () {
        this.sendMessage('autoPlayStoped');
    };

    this.balance = function () {
        this.sendMessage('balance');
    };

    this.ticketReceived = function () {
        this.sendMessage('ticketReceived');
    };

    this.roundEnded = function () {
        this.sendMessage('roundEnded');
    };

    this.showLoader = function () {
        this.sendMessage('showLoader');
    };

    this.hideLoader = function () {
        this.sendMessage('hideLoader');
    };

    this.betAction = function () {
        this.sendMessage('betAction');
    };

    this.updateBet = function () {
        this.sendMessage('updateBet');
    };

    this.errorMessage = function (errorObject) {
        this.sendMessage('errorMessage', errorObject);
    };

    this.sendMessage = function (type, errorObj) {
        let messageObject = {
            name: 'integration',
            sender: 'JetX',
            lang: localeCode,
            type: type,
            errorObject: errorObj
        };
        messageObject.data = {
            playerTokenId: player.key,
            clientToken: player.counterId,
            currencyCode: player.currency.currencyCode,
            balance: player.availableAmount,
            winAmount: player.win,
            totalBet: player.totalBet,
            activeBet: player.activeBet,
        };

        window.parent.postMessage(messageObject, '*');
    };

    this.receiveMessage = function () {
        window.addEventListener('message', EventHandler, false);

        function EventHandler(eventData) {
            if (eventData.data !== undefined && eventData.data.name === "sound-toggle") {
                const soundToggle = document.querySelector('.sound-menu-a.sound-all .sound-checkbox span');
                if (soundToggle) soundToggle.click();
            }

            const clickIfChecked = (id) => {
                const el = document.getElementById(id);
                if (el && el.checked) el.click();
            };

            switch (eventData.data.type) {
                case "integrationStopAutobet":
                    clickIfChecked('auto-bet-0');
                    clickIfChecked('auto-bet-1');
                    clickIfChecked('auto-bet-2');
                    clickIfChecked('auto-bet-3');
                    break;
                case "integrationDisableSpin":
                    for (let i = 0; i < player.bets.length; i++) {
                        const betEl = document.getElementById('bet-' + i);
                        if (betEl) betEl.classList.add('disabled');
                    }
                    break;
                case "integrationEnableSpin":
                    for (let i = 0; i < player.bets.length; i++) {
                        const betEl = document.getElementById('bet-' + i);
                        if (betEl) betEl.classList.remove('disabled');
                    }
                    break;
                case "integrationRefreshBalance":
                    updateBalanceRepost = true;
                    PostCustomEvent(token, 'update.balance');
                    break;
                case "integrationFailedCommunication":
                    //enableSpin();
                    break;
                case "integrationConnectionEstablished":
                    //enableSpin();
                    break;
                case "integrationResizeGame":
                    //enableSpin();
                    break;
                case "integrationRemoveExitButton":
                    document.querySelectorAll('[data-menu-exit], .button.exit').forEach((exitButton) => {
                        if (exitButton.parentElement && exitButton.parentElement.classList.contains('right')) {
                            exitButton.parentElement.remove();
                        } else {
                            exitButton.remove();
                        }
                    });
                    break;
            }
        }
    };

}
