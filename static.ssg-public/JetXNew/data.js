// Load Data START
let initialHelpPopupOpened = false;

function openInitialHelpPopupIfNeeded() {
    if (initialHelpPopupOpened) return;
    if (typeof window.JetXPopups === 'undefined' || !window.JetXPopups) return;

    if (shouldOpenHowToPlayOnLoad()) {
        initialHelpPopupOpened = true;
        if (typeof helpHtml === 'function') helpHtml();
        mixpanelHelpStatus('auto_first_login');
        window.JetXPopups.open('how-to-play');
        if (typeof promoPrizeIcon === 'function') promoPrizeIcon();
        return;
    }

    if (visualConfig.helpShowPaytableOnLoad) {
        initialHelpPopupOpened = true;
        if (typeof helpHtml === 'function') helpHtml();
        mixpanelHelpStatus('auto_jurisdiction');
        window.JetXPopups.open('rules');
        if (typeof window.openRulesSection === 'function') {
            window.openRulesSection('section-3', 'auto');
        }
    }
}

if (visualConfig.helpShowPaytableOnLoad) {
    openInitialHelpPopupIfNeeded();
}

function loadGameInfo(data, load = false) {
    board.autoBetOn = data.AutoBetOn;
    if (visualConfig.noAutoplay) board.autoBetOn = false;
    board.maxAutoCashOut = data.AutoCashOutMaxValue;
    board.minAutoCashOut = data.AutoCashOutMinValue;
    board.convertToPlayerCurrency = data.ConvertToPlayerCurrency;
    board.exchangeRate = data.ExchangeRate || 1;
    
    board.isPortalFilterOn = data.IsPortalFilterOn;
    board.maxBet = data.MaxBetAmount;
    board.maxWinAmount = data.MaxWinAmount || board.maxCashoutCoeff;
    board.minBet = data.MinBetAmount;
    board.minMultiplier = data.MinMultiplier;

    if (player && player.currency) {
        //setHtmlAll('.limits-currency', player.currency.currencyCode || '');
        setHtmlSelector('#limits-min-bet', formatAmount(board.minBet, player.currency, 'formated'));
        setHtmlSelector('#limits-max-bet', formatAmount(board.maxBet, player.currency, 'formated'));
        setHtmlSelector('#limits-max-win', formatAmount(board.maxWinAmount, player.currency, 'formated'));
        setHtmlSelector('#limits-max-multiplier', formatAmount(board.maxCashoutCoeff, player.currency, 'multiplier') + ' x');
    }
    board.showGameInfoOnStart = data.ShowGameInfoOnStart;
    board.showRtp = data.ShowRtp;
    board.twoBetOn = data.TwoBetOn;
    if(data.ClientAvatar) player.clientAvatar = data.ClientAvatar;

    // let helpHtml = $('.help-popup-content.rules .rules-item:eq(1)').html();
    // helpHtml = helpHtml.replace('1.01X', `${board.minAutoCashOut}X`);
    // helpHtml = helpHtml.replace('1.01x', `${board.minAutoCashOut}x`);
    // $('.help-popup-content.rules .rules-item:eq(1)').html(helpHtml);
    playerSetInfo();

    if (load) openInitialHelpPopupIfNeeded();
}

function loadData(data, load = false) {
    loadChat(data.ClientChatKey);
    board.boardVersion = data.BoardVersion;
    board.coefficient = data.Coefficient;
    board.currentSpinHash = data.CurrentSpinHash;
    board.isFinnished = data.IsFinnished;
    board.isGameStarted = data.IsGameStarted;
    board.isBoardDisabled = data.IsBoardDisabled;
    board.maxCashoutCoeff = data.MaxCashoutCoeff || board.maxCashoutCoeff;
    if(data.OnlinePlayers) board.onlinePlayers = data.OnlinePlayers;
    board.progressPercent = data.ProgressPercent;
    board.progressTime = data.ProgressTime;
    board.showFullNames = data.ShowFullNames;
    board.spinNumber = data.SpinNumber;
    board.showPlayerBets = data.ShowPlayerBets ?? true;

    if (visualConfig.showNetBalance && data.TotalNetProfit != null) {
        updateNetBalance(data.TotalNetProfit);
    }

    if(!IsNetworkOptimized) {
        loadGameInfo(data, load);
    }

    showBets = board.showPlayerBets;
    setChecked('hide-bets', !showBets);

    if(!playerCountWorker) elements.onlineUsers.innerHTML = board.onlinePlayers;

    player.key = data.PlayerKey;
    player.isObserver = data.IsObserver;

    loadPlayerData(data.PlayerInfo, load);
    gameStatus();

    gameStats.load(data, load);

    if (typeof jetX !== 'undefined' && jetX && typeof jetX.syncBettingGateFromBoard === 'function') {
        jetX.syncBettingGateFromBoard();
    }

    if (load && typeof initTextFit === 'function') initTextFit();

    jetX.setMaxMultiplier();

    setCssAll('.canvas canvas', 'pointerEvents', 'none');

    if (load) {
        revealBoard();

        if (!board.autoBetOn) {
            addClassAll('.bet-input.bets .auto .checkbox', 'disabled');
            document.querySelectorAll('.bet-input.bets .auto .checkbox input').forEach((el) => { el.disabled = true; });
            setVisualHidden('.btn-autoplay, [data-shared-autoplay], #popup-autoplay', true);
        }

        if (!board.twoBetOn) {
            addClassAll('.cash-game', 'one-bet');
        }

        if (board.showRtp) {
            setCssAll('.rtp', 'display', 'block');
        }

        let amount = formatAmount(board.maxBet, player.currency, 'number');
        let amountCurrency = player.currency.currencyCode;
        let coef = `10.00 x`;
        let betList = ['1', '2', '3', GetCaption("jetx.board.all")];

        document.querySelectorAll('.bet-list a').forEach((el, index) => {
            if (index < 3) {
                betList[index] = formatAmount(jqData(el, 'bet'), player.currency, 'number');
            }
        });

        if (typeof restoreLastCashOutValues === 'function') {
            restoreLastCashOutValues();
        }

        helpHtml();
        openInitialHelpPopupIfNeeded();

        document.querySelectorAll('input.inp').forEach((input) => {
            setInputValue(input.attributes['id'].value);
        });

        gameEvent.gameDataLoaded();
    }
}


let availableAmountOld = 0;

function loadPlayerData(data, load = false, action = '') {
    if (
        !load &&
        typeof placeBetInFlight === 'number' &&
        placeBetInFlight > 0 &&
        typeof rememberPlaceBetData === 'function'
    ) {
        rememberPlaceBetData(data);
        if (action === 'hubCashout' && typeof queueWinBalance === 'function') {
            queueWinBalance(formatBalance(data.AvailableAmount));
        }
        return;
    }
    if (data.Currency === undefined || data.Currency === null) {
        player.currency.fractionDigit = 2;
        player.currency.currencyCode = 'GEL';
        player.currency.currencySymbol = getCurrencySymbol('GEL');
    } else {
        player.currency.fractionDigit = data.Currency.FractionDigit;
        player.currency.currencyCode = data.Currency.CurrencyCode;
        player.currency.currencySymbol = getCurrencySymbol(data.Currency.CurrencyCode);
    }
    player.availableAmount = formatBalance(data.AvailableAmount);
    if (availableAmountOld !== formatBalance(data.AvailableAmount)) {
        gameEvent.balance();
    }
    availableAmountOld = formatBalance(data.AvailableAmount);
    let bets = data.Bets;
    // let bet = {
    //     ActiveButton: "placement",
    //     AutoCashout: false,
    //     AutoCashoutValue: 0,
    //     BetAmount: 0,
    //     CashoutStep: 0,
    //     IsActive: false,
    //     NextAutoCashout: false,
    //     NextAutoCashoutValue: 0,
    //     NextBetAmount: 0,
    //     WonAmount: 0,
    // };
    // player.bets = [];
    // player.bets.push(bets[0]);
    // player.bets.push(bets[1]);
    // player.bets.push(bets[4]);
    // player.bets.push(bets[5]);
    // player.bets.push(bets[2]);
    // player.bets.push(bets[3]);
    player.bets = data.Bets;
    player.counterId = data.CounterId;

    player.displayName = data.DisplayName;
    if (data.ClientAvatar) player.clientAvatar = data.ClientAvatar;
    if (data.DisableCashGame !== undefined) player.disableCashGame = data.DisableCashGame;

    player.isDisabled = data.IsDisabled;
    player.jackpot.throwAmount = data.JackpotThrowAmount;
    player.jackpot.throwAmountPerPlayer = data.JackpotThrowAmountPerPlayer;
    player.jackpot.type = data.JacktopType;
    player.portalName = data.PortalName;

    if (player.disableCashGame) {
        const firstTab = document.querySelectorAll('.buttons .tabs a')[0];
        if (firstTab) firstTab.classList.add('disabled');

        for (let i = 0; i < 4; i++) {
            const autoBetEl = document.getElementById('auto-bet-' + i);
            if (autoBetEl && autoBetEl.checked) {
                autoBetEl.checked = false;
            }
        }
        checkboxCheck();
    } else {
        const firstTab = document.querySelectorAll('.buttons .tabs a')[0];
        if (firstTab) firstTab.classList.remove('disabled');
    }

    for (let buttonIndex = 0; buttonIndex < player.bets.length; buttonIndex++) {
        if (hasClassSelector('#bet-' + buttonIndex, 'disable')) {
            gameEvent.updateBet();
        }
    }

    if (load) {
        for (let i = 0; i < 4; i++) {
            const betValueEl = document.getElementById(`bet-value-${i}`);
            let v = betValueEl ? betValueEl.value : undefined;
            v = formatAmount(parseInputAmount(v), player.currency, 'number');
            if (betValueEl) {
                betValueEl.value = formatAmount(v, player.currency, 'input');
                commitInput(betValueEl);
                betValueEl.setAttribute('onKeyDown', '');
                betValueEl.classList.add(player.currency.currencyCode.toLocaleLowerCase());
            }
            player.totalBet = v;
        }

        document.querySelectorAll('.bet-chips:not(.how-play-chips) .chip').forEach((chip) => {
            if (jqData(chip, 'bet') != '0') {
                const text = jurisdictionName === 'pt'
                    ? String(parseInt(jqData(chip, 'bet'), 10))
                    : formatAmount(jqData(chip, 'bet'), player.currency, 'chip');
                const label = chip.querySelector('span');
                if (label) label.textContent = text;
                else chip.textContent = text;
            }
        });
        if (typeof scheduleFitTextAll === 'function') {
            scheduleFitTextAll(document.querySelector('.bet-panel'));
        }

        setHtmlAll('.input span.currency', currencyFormat(player.currency.currencyCode, true));
        gameEvent.updateBet();
    }

    if (player.jackpot.throwAmount !== undefined && player.jackpot.throwAmount !== null && player.jackpot.throwAmountPerPlayer !== undefined && player.jackpot.throwAmountPerPlayer !== null) {
        //DrawJackpot(player.jackpot.throwAmount, player.jackpot.throwAmountPerPlayer);
    }

    loadPlayerDataGift(data, load);
    playerButtons(load);
    revealBoard();
    playerSetInfo(action);

    gameStats.playersView.load(data, load);
}

function revealBoard() {
    if (!document.body.classList.contains('is-assets-pending')) return;
    document.body.classList.add('is-board-ready');
    document.body.classList.remove('is-assets-pending');
}

function playerSetInfo(action = '') {
    elements.userName.innerHTML = player.displayName;
    elements.userAvatar.className = elements.userAvatar.className.replace(/avatar-\d+/, `avatar-${player.clientAvatar}`);
    if(action === 'hubCashout') {
        queueWinBalance(player.availableAmount);
    } else if(action === 'cashout' || action === 'hubCashoutGift') {
        
    } else {
        if (typeof syncPendingWinBalance === 'function') {
            syncPendingWinBalance(player.availableAmount);
        }
        if (typeof hasPendingWinBalance !== 'function' || !hasPendingWinBalance()) {
            const floor = typeof pendingWinBalanceFloor === 'function' ? pendingWinBalanceFloor() : null;
            const amount = floor != null && floor > player.availableAmount ? floor : player.availableAmount;
            elements.userBalance.innerHTML = formatAmount(amount, player.currency, 'formated');
            syncUserBalanceCurrencyClass(player.currency);
        }
    }
    if(document.querySelector('.avatar-choice.active')) document.querySelector('.avatar-choice.active').classList.remove('active');

    document.querySelector(`.avatar-choice[data-avatar="${player.clientAvatar}"]`).classList.add('active');
    document.body.classList.add(`currency-${player.currency.currencyCode}`);
}

function updateNetBalance(totalNetProfit) {
    const el = document.getElementById('netBalance');
    if (!el || !player?.currency) return;
    const amount = formatAmount(totalNetProfit, player.currency, 'input');
    const label = GetCaption('jetxnew.net.balance');
    el.innerHTML = `<span>${label}</span> ${amount}`;
    el.setAttribute('aria-label', label);
}

function gameStatus() {
    if (board.isFinnished) {
        removeClassAll('.body', 'game-started');
    } else {
        addClassAll('.body', 'game-started');
    }
}
// Load Data END


function CreateLoadTimeGameInfo(token, load = false) {
    window.hub.invoke("CreateLoadTimeGameInfo", window.token).then((data) => {
        if(data.ErrorMessage) {
            OnRequestFail(data, null);
        } else {
            loadGameInfo(data, load);
        }
        GetBoard(token, true);
    });
}

function GetBoard(token, load = false) {
    if(IsJetXApiEnabled) {
        let eventUrl = urlHolder.Actions.GetBoard + "/" + token;
        apiGet(eventUrl, function (data) {
            if (data.ErrorMessage) {
                OnRequestFail(data, null);
            } else {
                loadData(data, load);
                if (load) {
                    boardLoaded = true;
                    if (!hubLoaded) hubGetList();
                }
            }
        }, function (jqXHR, textStatus, errorThrown) {
            OnRequestFail(jqXHR, textStatus, errorThrown);
        });
    } else {
        window.hub.invoke("GetBoardInfo", window.token).then((data) => {
            if (data.ErrorMessage) {
                OnRequestFail(data, null);
            } else {
                loadData(data, load);
                if (load) {
                    boardLoaded = true;
                    if (!hubLoaded) hubGetList();
                }
            }
        });
    }
}

function PlayerInfo(token, isAutoCashout = false, action = '') {
    if(IsJetXApiEnabled) {
        let eventUrl = urlHolder.Actions.Player + "/" + token;
        apiGet(eventUrl, function (data) {
            if (data.ErrorMessage) {
                OnRequestFail(data, null);
            } else {
                loadPlayerData(data, false, action);
                if (updateBalanceRepost) {
                    updateBalanceRepost = false;
                    PostCustomEvent(token, 'update.balance');
                }
            }
        }, function (jqXHR, textStatus, errorThrown) {
            OnRequestFail(jqXHR, textStatus, errorThrown, position);
        });
    } else {
        window.hub.invoke("GetPlayerInfo", window.token).then((data) => {
            if (data.ErrorMessage) {
                OnRequestFail(data, null);
            } else {
                loadPlayerData(data, false, action);
                if (updateBalanceRepost) {
                    updateBalanceRepost = false;
                    PostCustomEvent(token, 'update.balance');
                }
            }
        });
    }
}

function CustomEventInfo(eventCode, position) {
    this.EventCode = eventCode;
    this.SelectedPieces = position;
}

let updateBalanceRepost = false;

function PostCustomEvent(token, eventCode, position = 0) {
    if(IsJetXApiEnabled && eventCode !== 'jetx.change.client.avatar') {
        let eventUrl = urlHolder.Actions.PostCustomEventUrl + "/" + token;
        let code = new CustomEventInfo(eventCode, position);
        if (eventCode === 'jetx.change.client.avatar') {
            code = new CustomEvent(eventCode, document.querySelector(`.avatar-choice.active`).dataset.avatar);
        }
        apiPost(eventUrl, code, function (data) {
            if (data.ErrorMessage) {
                OnRequestFail(data, position);
            } else {
                if (eventCode === 'jetx.gifts.start') {
                    loadPlayerData(data);
                }

                if (eventCode === 'jetx.change.client.avatar') {
                    player.clientAvatar = document.querySelector(`.avatar-choice.active`).dataset.avatar;
                    playerSetInfo();
                } else if (eventCode === 'update.balance') {
                    try {
                        player.availableAmount = formatBalance(data.AvailableAmount);
                        player.currency.fractionDigit = data.Currency.FractionDigit;
                        player.currency.currencyCode = data.Currency.CurrencyCode;
                        player.currency.currencySymbol = getCurrencySymbol(data.Currency.CurrencyCode);
                        player.displayName = data.DisplayName;
                        revealBoard();
                        playerSetInfo();
                    } catch (e) {

                    }
                } else if (eventCode === 'return.balance' || eventCode === 'jetx.gifts.remind.later' || eventCode === 'jetx.gifts.cancel' || eventCode === 'jetx.gifts.start' || eventCode === 'jetx.gifts.zero.win') {

                } else if (eventCode === 'jetx.toggle.bet.place') {

                } else if (eventCode === 'jetx.no.info.on.start') {

                } else if (eventCode === 'jetx.undo.bet') {
                    loadPlayerData(data);
                    gameEvent.betAction();
                } else if (eventCode === 'jetx.show.player.bets') {

                } else {
                    leaveGame();
                }
            }
        }, function (jqXHR, textStatus, errorThrown) {
            OnRequestFail(jqXHR, textStatus, errorThrown, null);
        });
    } else {
        let code = {
            EventCode: eventCode,
            SelectedPieces: position,
        };
        if (eventCode === 'jetx.show.player.bets') {
            code = {
                EventCode: eventCode,
                SelectedPieces: showBets,
            };
        } else if (eventCode === 'jetx.change.client.avatar') {
            code = {
                EventCode: eventCode,
                SelectedPieces: document.querySelector(`.avatar-choice.active`).dataset.avatar,
            };
        }

        window.hub.invoke('Post', window.token, code).then(function (data) {
            if (data.ErrorMessage) {
                OnRequestFail(data, position);
            } else {
                if (eventCode === 'jetx.gifts.start') {
                    loadPlayerData(data);
                }

                if (eventCode === 'jetx.change.client.avatar') {
                    player.clientAvatar = document.querySelector(`.avatar-choice.active`).dataset.avatar;
                    playerSetInfo();
                } else if (eventCode === 'update.balance') {
                    try {
                        player.availableAmount = formatBalance(data.AvailableAmount);
                        player.currency.fractionDigit = data.Currency.FractionDigit;
                        player.currency.currencyCode = data.Currency.CurrencyCode;
                        player.currency.currencySymbol = getCurrencySymbol(data.Currency.CurrencyCode);
                        player.displayName = data.DisplayName;
                        revealBoard();
                        playerSetInfo();
                    } catch (e) {

                    }
                } else if (eventCode === 'return.balance' || eventCode === 'jetx.gifts.remind.later' || eventCode === 'jetx.gifts.cancel' || eventCode === 'jetx.gifts.start' || eventCode === 'jetx.gifts.zero.win') {

                } else if (eventCode === 'jetx.toggle.bet.place') {

                } else if (eventCode === 'jetx.no.info.on.start') {

                } else if (eventCode === 'jetx.undo.bet') {
                    loadPlayerData(data);
                    gameEvent.betAction();
                    //if(!mobile) buttonMessage(position, GetCaption("jetx.board.bet.cancel"), 1500, 'error');
                } else if (eventCode === 'jetx.show.player.bets') {

                } else {
                    leaveGame();
                }
            }
        });
    }
}

let lastFail401 = 0;
let ExceptionMessage = '';

function OnRequestFail(data, button) { //jqXHR, textStatus, errorThrown, button
    if (data === undefined) {
        return false;
    }

    if (data.ErrorMessage !== undefined && data.ErrorMessage !== null) {
        ExceptionMessage = data.ErrorMessage;
    }

    mixpanelError(button, ExceptionMessage);

    if (ExceptionMessage === 'error.jetx.not.enough.money') {
        showInsufficientFunds(button);
    } else if (ExceptionMessage == 'error.invalid.jetx.bet') {
        let input = document.getElementById("bet-value-" + button);
        let inputValue = input ? input.value : undefined;
        let inputMinBet = input ? input.dataset.minbet : undefined;

        if (parseInputAmount(inputValue) < parseInputAmount(inputMinBet)) {
            buttonMessage(button, GetCaption("jetxnew.bet.min") + ' ' + formatAmount(board.minBet, player.currency, 'formated'), 1500, 'error');
        } else {
            buttonMessage(button, GetCaption("jetxnew.bet.max") + ' ' + formatAmount(board.maxBet, player.currency, 'formated'), 1500, 'error');
        }
    } else if (ExceptionMessage === 'error.nextbet.already.placed') {
        //buttonMessage(button, GetCaption("jetx.board.next.bet"), 1500, 'error');
    } else if (ExceptionMessage === 'error.jetx.no.more.bet') {
        buttonMessage(button, GetCaption("jetxnew.board.next.bet.cancel"), 1500, 'error');
    } else if (ExceptionMessage === 'error.JetX.no.more.bet') {
        buttonMessage(button, GetCaption("jetxnew.board.next.bet.cancel"), 1500, 'error');
    } else if (ExceptionMessage === 'error.auto.cash.out.min') {
        buttonMessage(button, GetCaption("jetxnew.error.auto.cash.out.min") + ' ' + board.minAutoCashOut, 1500, 'error');
    } else if (ExceptionMessage === 'error.auto.cash.out.max') {
        buttonMessage(button, GetCaption("jetxnew.error.auto.cash.out.max") + ' ' + board.maxAutoCashOut, 1500, 'error');
    } else if (ExceptionMessage === 'error.bet.already.placed') {
        //buttonMessage(button, GetCaption("jetx.error.bet.already.placed"), 1500, 'error');
    } else if (ExceptionMessage === 'error.JetX.already.cashed.out') {
        buttonMessage(button, GetCaption("jetxnew.error.already.cashed.out"), 1500, 'error');
    } else if (ExceptionMessage === 'error.jetx.game.create.is.disabled') {
        document.querySelector('#popup-error-title').innerHTML = GetCaption('error.jetxnew.game.create.is.disabled');
        document.querySelector('#popup-error-button').innerHTML = GetCaption('jetxnew.exit');
        document.querySelector('#popup-error-button').setAttribute('onclick', 'leaveGame();');
        showErrorPopup()
    } else if (ExceptionMessage === 'operator.unreachable') {
        buttonMessage(button, GetCaption("jetxnew.operator.unreachable"), 1500, 'error');
    } else if (ExceptionMessage === 'error.invalid.jetx.token') {
        document.querySelector('#popup-device-title').innerHTML = GetCaption('error.invalid.jetxnew.token').format(player.displayName);
        document.querySelector('#popup-device .btn').setAttribute('onclick', 'leaveGame();');
        window.JetXPopups.open('device');
    } else if (ExceptionMessage === 'error.invalid.jetx.player') {
        document.querySelector('#popup-error-title').innerHTML = GetCaption('error.invalid.jetxnew.player');
        document.querySelector('#popup-error-button').innerHTML = GetCaption('jetxnew.new.game');
        document.querySelector('#popup-error-button').setAttribute('onclick', 'window.parent.postMessage({name: "reload-loader-iframe"}, "*");');
        showErrorPopup();
    } else {
        //buttonMessage(button, GetCaption("jetx.board.bet.error"), 1500, 'error');
    }


    return false;
}

function OnMessageRequestFail(jqXHR, textStatus, errorThrown, button) { //
    if (jqXHR.responseJSON !== undefined && jqXHR.responseJSON !== null) {
        ExceptionMessage = jqXHR.responseJSON.ExceptionMessage !== undefined ? jqXHR.responseJSON.ExceptionMessage : jqXHR.responseJSON.Message;
        let errorObj = {
            Message: jqXHR.responseJSON.Message,
            Status: jqXHR.status
        };
        gameEvent.errorMessage(errorObj);
    }

    if (jqXHR.status === 0 || jqXHR.status === 500) {
        if (jqXHR.status === 500) {
            //LogTimerError(LastEventId, 'status.code.error');
        }
        popup_close();
        ShowInternetLost();
        mixpanelError(button, `status.code.error: ${jqXHR.status}`);
        return false;
    } else if (jqXHR.status === 400) {
        mixpanelError(button, ExceptionMessage);

        // let position = $(this).attr('data-placement');
        if (ExceptionMessage === 'error.jetx.not.enough.money') {
            showInsufficientFunds(button, GetCaption("jetxnew.board.amount.error"));
        } else if (ExceptionMessage == 'error.invalid.jetx.bet') {
            let input = document.getElementById("bet-value-" + button);
            let inputValue = input ? input.value : undefined;
            let inputMinBet = input ? input.dataset.minbet : undefined;

            if (parseInputAmount(inputValue) < parseInputAmount(inputMinBet)) {
                buttonMessage(button, GetCaption("jetxnew.bet.min") + ' ' + formatAmount(board.minBet, player.currency, 'formated'), 1500, 'error');
            } else {
                buttonMessage(button, GetCaption("jetxnew.bet.max") + ' ' + formatAmount(board.maxBet, player.currency, 'formated'), 1500, 'error');
            }
        } else if (ExceptionMessage === 'error.nextbet.already.placed') {
            //buttonMessage(button, GetCaption("jetx.board.next.bet"), 1500, 'error');
        } else if (ExceptionMessage === 'error.jetx.no.more.bet') {
            buttonMessage(button, GetCaption("jetxnew.board.next.bet.cancel"), 1500, 'error');
            //buttonMessage(button, GetCaption("jetx.board.next.bet.cancel"), 1500, 'error');
        } else if (ExceptionMessage === 'error.JetX.no.more.bet') {
            buttonMessage(button, GetCaption("jetxnew.board.next.bet.cancel"), 1500, 'error');
            //buttonMessage(button, GetCaption("jetx.board.next.bet.cancel"), 1500, 'error');
        } else if (ExceptionMessage === 'error.auto.cash.out.min') {
            buttonMessage(button, GetCaption("jetxnew.error.auto.cash.out.min") + ' ' + board.minAutoCashOut, 1500, 'error');
        } else if (ExceptionMessage === 'error.auto.cash.out.max') {
            buttonMessage(button, GetCaption("jetxnew.error.auto.cash.out.max") + ' ' + board.maxAutoCashOut, 1500, 'error');
        } else if (ExceptionMessage === 'error.bet.already.placed') {
            //buttonMessage(button, GetCaption("jetx.error.bet.already.placed"), 1500, 'error');
        } else if (ExceptionMessage === 'error.JetX.already.cashed.out') {
            buttonMessage(button, GetCaption("jetxnew.error.already.cashed.out"), 1500, 'error');
        } else if (ExceptionMessage === 'error.jetx.game.create.is.disabled') {
            document.querySelector('#popup-error-title').innerHTML = GetCaption('error.jetxnew.game.create.is.disabled');
            document.querySelector('#popup-error-button').innerHTML = GetCaption('jetxnew.exit');
            document.querySelector('#popup-error-button').setAttribute('onclick', 'leaveGame();');
            showErrorPopup()
        } else if (ExceptionMessage === 'operator.unreachable') {
            buttonMessage(button, GetCaption("jetxnew.operator.unreachable"), 1500, 'error');
        } else if (ExceptionMessage === 'error.invalid.jetx.token') {
            document.querySelector('#popup-device-title').innerHTML = GetCaption('error.invalid.jetxnew.token').format(player.displayName);
            document.querySelector('#popup-device .btn').setAttribute('onclick', 'leaveGame();');
            window.JetXPopups.open('device');
        } else if (ExceptionMessage === 'error.invalid.jetx.player') {
            document.querySelector('#popup-error-title').innerHTML = GetCaption('error.invalid.jetxnew.player');
            document.querySelector('#popup-error-button').innerHTML = GetCaption('jetxnew.new.game');
            document.querySelector('#popup-error-button').setAttribute('onclick', 'window.parent.postMessage({name: "reload-loader-iframe"}, "*");');
            showErrorPopup();
        } else {
            //buttonMessage(button, GetCaption("jetx.board.bet.error"), 1500, 'error');
        }


        return false;
    } else if (jqXHR.status === 401) {
        lastFail401++;
        if (lastFail401 > 5) {
            leaveGame();
        } else {
            //CallBoardTimer();
        }
        return false;
    } else if (jqXHR.status === 410) {
        let connectionLost = document.getElementById('connection-lost-poup');
        if (connectionLost) connectionLost.style.visibility = 'hidden';

        responseText = JSON.parse(jqXHR.responseText);
        let Message = GetCaption('jetxnew.token.has.been.terminated'); //responseText.Message
        let MessageParameter = GetCaption(responseText.MessageParameter);

        document.querySelector('#popup-error-title').innerHTML = Message.format(MessageParameter);
        document.querySelector('#popup-error-button').innerHTML = GetCaption('jetxnew.exit');
        document.querySelector('#popup-error-button').setAttribute('onclick', 'leaveGame();');
        showErrorPopup()

        return false;
    } else {
        ShowInternetLost();
        return false;
    }
}

let internetPopupShow = 0;

function ShowInternetLost() {
    internetPopupShow++;
    if (internetPopupShow > 2) {
        jetX.showInternetLost();
    }
}

function HideInternetLost() {
    internetPopupShow = 0;
    jetX.hideInternetLost();
}


// Hub START
let hubLoaded = false;
let boardLoaded = false;

function hubGetList() {
    if(IsJetXApiEnabled) {
        if(IsNetworkOptimized) {
            CreateLoadTimeGameInfo(token, true);
        } else {
            GetBoard(token, true);
        }
    } else {
        if(IsNetworkOptimized) {
            CreateLoadTimeGameInfo(token, true);
        } else {
            GetBoard(token, true);
        }
        PostCustomEvent(token, 'update.balance');
    }

    if (!hubLoaded && boardLoaded) {
        hubLoaded = true;
        window.hub.server.getList().then(x => gameStats.playersView.info(x));
        window.parent.postMessage({name: 'start-game', startGame: Date.now()}, '*');
    }
}

window.hub.client.gBoard = (gameInfo) => {
    //jetX.finish = true;
    mixpanelNewRound();
    jetX.newGame();
    resetBetButtonsForNewRound();

    placeBetWaveSum = 0;
    placeBetWaveActive = true;

    let activeAutoplayButtons = 0;
    for (let i = 0; i < 4; i++) {
        activeAutoplayButtons += autoplayPlaceBet(i);
    }
    if (activeAutoplayButtons === 0) {
        gameEvent.autoPlayStoped();
    }

    for (let i = (!player.disableCashGame ? 0 : 4); i < player.prevBets.length; i++) {
        if (player.prevBets[i]) {
            let bet = (i === 4 || i === 5 ? board.minBet : inputAmount(`bet-value-${i}`));
            let cashOut = null;
            if (i < 4) {
                const autoCashOutEl = document.getElementById(`auto-cash-out-${i}`);
                const cashOutValueEl = document.getElementById(`cash-out-value-${i}`);
                if (autoCashOutEl && autoCashOutEl.checked && cashOutValueEl && cashOutValueEl.value !== '') {
                    cashOut = cashOutValueEl.value;
                }
            }
            PlaceBet(token, bet, cashOut, i);
        }
    }

    placeBetWaveActive = false;

    if (typeof placeBetInFlight !== 'number' || placeBetInFlight === 0) {
        PlayerInfo(token);
    }

    jetX.tabLastGraphicValue = 1;
    graphicValue = 1;

    gameStats.playersView.list.cashout = [];
    window.jetXReact.setCashOut([], 0, 0, gameStats.playersView._listGen);
};

let response = {
    start: true
};
let graphicValue = 1;
let graphicStep = 0;
window.hub.client.response = (info) => {
    //info = JSON.parse(info);
    if (response.start) {
        response.start = false;
        PlayerInfo(token);
    }


    let isFinished = info.f;
    let value = info.v;
    let nextValue = info.n;
    graphicValue = value;
    let step = info.s;
    graphicStep = step;
    jetX.coefficient(value, nextValue, isFinished);
    updateAutoCollectProgress(graphicValue);

    if (value >= board.maxCashoutCoeff) {
        jetX.showMaxMultiplier();
    }

    if (isFinished) {
        jetX.tabLastGraphicValue = 1;
        graphicValue = 1;
        mixpanelBoom();
        jetX.boom(value);
        updateBalanceBoom = true;
        updateAutoCollectProgress(1);
    } else {
        jetX.fly();
    }
};

window.hub.client.g = (updateInfo) => {
    let counterId = updateInfo.I.i;
    let betPlace = updateInfo.I.x;
    if(IsNetworkOptimized) {
        let spinInfo = gameStats.playersView.spinInfo(updateInfo.I);
        counterId = spinInfo.i;
        betPlace = spinInfo.x;
    }
    if(updateInfo.M === 'c') { //command cashout
        gameStats.playersView.cashout(updateInfo.I);
    } else if (updateInfo.M === 'u') { //undo
        gameStats.playersView.undo(updateInfo.I);
    } else if (updateInfo.M === 'b') { //bet
        gameStats.playersView.bet(updateInfo.I); //info
    }
    if(counterId === player.counterId) {
        const deferPlayerInfo = updateInfo.M === 'b'
            && typeof placeBetInFlight === 'number'
            && placeBetInFlight > 0;
        if (!deferPlayerInfo) {
            let action = '';
            if (updateInfo.M === 'c') {
                // Gift slots 4–5: skip balance fly queue; cash wins keep normal animation
                action = Number(betPlace) >= 4 ? 'hubCashoutGift' : 'hubCashout';
            }
            PlayerInfo(token, false, action);
        }
    }
    gameStats.playersView.scheduleDraw();
    if (counterId === player.counterId) {
        gameStats.playersView.flushFeedUi();
    }
};
// Hub END