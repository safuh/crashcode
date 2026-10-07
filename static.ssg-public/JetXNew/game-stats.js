class PlayersView {
    static LIST_LIMIT = 50;
    static FEED_UI_BATCH_MS = 250;
    static PARA_PER_TICK = 5;
    static PARA_SPREAD_MS = 100;

    static config = {
        allow: true,

        playersDiv: document.querySelector('#players'),
        playersScroll: document.querySelector('#side-players'),

        playersCurrent: document.querySelector('#playersCurrent'),
        playersActive: document.querySelector('#playersActive'),
        playersCashOut: document.querySelector('#playersCashOut'),

        statsAvatars: document.querySelector('#info-stats-avatars'),
        statsCount: document.querySelector('#info-stats-count'),
        statsWin: document.querySelector('#info-stats-win'),

        top3Wins: document.querySelector('#top3Wins'),
        top3WinsToggle: document.querySelector('#top3-winner-toggle'),
        top3WinsMyWin: document.querySelector('#top3Wins-my-win'),
        top3WinsCashout: document.querySelector('#top3Wins-cashout'),
        top3WinsWins: document.querySelector('#top3Wins-wins'),
        top3WinsList: document.querySelector('#top3Wins-list'),
    }
    config = {};
    gameStats = null;

    list = {
        current: [],
        active: [],
        cashout: [],
    }

    stats = {
        count: 0,
        players: 0,
        cashout: 0,
        wins: 0,
        avatars: [],
        avatarPlayers: {},
        topWinners: {
            clear: false,
            list: [],
            cashout: 0,
            wins: 0,
            myWin: 0,
            players: [],
        },
    };

    top3Seq = [];
    _top3Playing = false;

    constructor(gameStats = null) {
        this.config = PlayersView.config;
        this.gameStats = gameStats;

        this.dom();
    }

    _scrollEl = null;
    _listOffset = 0;
    _currentHeight = 0;
    _visibleCount = 0;
    _layoutCached = false;
    _scrolling = false;
    _lastDrawKey = '';
    _drawRaf = 0;
    _scrollRaf = 0;
    _scrollIdle = 0;
    _currentDirty = false;
    _lastActiveSent = null;
    _lastCashSent = null;
    _lastActiveHeight = -1;
    _lastCashHeight = -1;
    _lastActivePad = -1;
    _lastCashPad = -1;
    _listGen = 0;
    _listEpoch = 0;
    _lastStatsCount = -1;
    _lastStatsWins = null;
    _lastAvatarLen = 0;
    _feedTimer = 0;
    _feedDirty = false;
    _pendingCount = 0;
    _pendingCountDirty = false;
    _pendingWinHtml = '';
    _pendingWinsDirty = false;
    _pendingAvatarsHtml = '';
    _pendingAvatarsDirty = false;
    _pendingBets = 0;
    _hasPendingBets = false;
    _paraBuf = [];
    _paraTimers = new Set();

    getPlayersScrollEl = () => {
        if (this._scrollEl) return this._scrollEl;

        const panel = this.config.playersScroll;
        if (panel) {
            const overflowY = getComputedStyle(panel).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
                return this._scrollEl = panel;
            }
        }
        return this._scrollEl = this.config.playersDiv;
    }

    isDesktopPlayersWindow = () => {
        return typeof isMobileLikeViewport !== 'function' || !isMobileLikeViewport();
    }

    getDesktopViewportHeight = () => {
        const panel = this.config.playersScroll;
        if (!panel || panel.hidden) return 0;

        let height = panel.clientHeight || 0;
        const tabs = panel.parentElement;
        if (tabs && tabs.clientHeight) {
            height = height ? Math.min(height, tabs.clientHeight) : tabs.clientHeight;
        }
        const side = tabs && tabs.parentElement;
        if (side && side.clientHeight) {
            height = height ? Math.min(height, side.clientHeight) : side.clientHeight;
        }
        if (height) height = Math.min(height, window.innerHeight);
        return height;
    }

    cachePlayersLayout = (force = false) => {
        if (this._layoutCached && !force) return;

        const desktop = this.isDesktopPlayersWindow();
        if (desktop) {
            const panel = this.config.playersScroll;
            if (panel && (panel.hidden || !panel.clientHeight)) {
                return;
            }
        }

        this._scrollEl = null;
        const scrollEl = this.getPlayersScrollEl();
        this._listOffset = 0;
        if (scrollEl && scrollEl === this.config.playersScroll && this.config.playersDiv) {
            this._listOffset = this.config.playersDiv.getBoundingClientRect().top
                - scrollEl.getBoundingClientRect().top
                + scrollEl.scrollTop;
        }

        if (!this.config.playersCurrent) {
            this.config.playersCurrent = document.querySelector('#playersCurrent');
        }
        this._currentHeight = this.config.playersCurrent ? this.config.playersCurrent.offsetHeight : 0;

        const rh = typeof getRowHeight === 'function' ? getRowHeight() : rowHeight;
        if (desktop && rh) {
            const viewport = this.getDesktopViewportHeight();
            if (viewport) {
                this._visibleCount = Math.max(1, Math.ceil(viewport / rh));
                this._layoutCached = true;
                return;
            }
        }

        this._visibleCount = typeof getRowCount === 'function' ? getRowCount() : rowCount;
        this._layoutCached = true;
    }

    windowSlice = (scrollTop, length, visibleCount, rh) => {
        if (!length || !rh) return [0, 0];
        let start = Math.floor(scrollTop / rh) - 2;
        if (start < 0) start = 0;
        if (start >= length) return [0, 0];
        let end = Math.min(start + visibleCount + 4, length);
        if (start >= end) return [0, 0];
        return [start, end];
    }

    refreshDesktopWindow = () => {
        this._scrollEl = null;
        this._layoutCached = false;
        this.cachePlayersLayout(true);
        this.draw('');
    }

    getPlayersListScrollTop = () => {
        const scrollEl = this.getPlayersScrollEl();
        if (!scrollEl) return 0;
        if (scrollEl === this.config.playersScroll && this.config.playersDiv) {
            return scrollEl.scrollTop - this._listOffset;
        }
        return scrollEl.scrollTop;
    }

    dom = () => {
        if (this._domBound) return;
        this._domBound = true;

        const onScroll = () => {
            if (!this._scrolling) {
                this._scrolling = true;
                this.cachePlayersLayout(true);
            }
            if (typeof suspendTextFit === 'function') suspendTextFit();
            if (!this._scrollRaf) {
                const epoch = this._listEpoch;
                this._scrollRaf = requestAnimationFrame(() => {
                    this._scrollRaf = 0;
                    if (epoch !== this._listEpoch) return;
                    this.draw('');
                });
            }
            clearTimeout(this._scrollIdle);
            const idleEpoch = this._listEpoch;
            this._scrollIdle = setTimeout(() => {
                this._scrollIdle = 0;
                this._scrolling = false;
                if (idleEpoch !== this._listEpoch) return;
                this._layoutCached = false;
                this.cachePlayersLayout(true);
                this.draw('');
                if (typeof resumeTextFit === 'function') {
                    resumeTextFit(this.config.playersDiv || this.config.playersScroll);
                }
            }, 150);
        };

        if (this.config.playersScroll) {
            this.config.playersScroll.addEventListener('scroll', onScroll, { passive: true });
        }
        if (this.config.playersDiv) {
            this.config.playersDiv.addEventListener('scroll', onScroll, { passive: true });
        }

        this.top3WinsToggleInit();
        window.addEventListener('resize', () => {
            this._scrollEl = null;
            this._layoutCached = false;
            this.top3WinsSyncViewport();
        });
        document.addEventListener('jetx:bet-mode-change', this.top3WinsSyncViewport);

        if (!this._feedTimer) {
            this._feedTimer = setInterval(() => this.flushFeedUi(), PlayersView.FEED_UI_BATCH_MS);
        }
    }

    load = (data, load = false) => {
        if(load && this.config.statsWin && !this.config.statsWin.getAttribute('data-loaded')) {
            this.config.statsWin.innerHTML = formatAmount(0, player.currency, 'formated');
            this.config.statsWin.setAttribute('data-loaded', 'true');
            if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(this.config.statsWin);
        }
    }



    finish = () => {
        if (this._drawRaf) {
            cancelAnimationFrame(this._drawRaf);
            this._drawRaf = 0;
        }
        if (this._scrollRaf) {
            cancelAnimationFrame(this._scrollRaf);
            this._scrollRaf = 0;
        }
        if (this._scrollIdle) {
            clearTimeout(this._scrollIdle);
            this._scrollIdle = 0;
        }
        this._scrolling = false;
        this.clearFeedParachutes();
        this.resetFeedUiPending();
        this.list.current = [];
        this.list.active = [];
        this.list.cashout = [];
        this._lastDrawKey = '';
        this._layoutCached = false;
        this._currentDirty = false;
        this._lastActiveSent = null;
        this._lastCashSent = null;
        this._lastActiveHeight = -1;
        this._lastCashHeight = -1;
        this._lastActivePad = -1;
        this._lastCashPad = -1;
        this._listGen++;
        this._listEpoch++;
    }

    clear() {
        if (window.jetXReact !== undefined) {
            const gen = this._listGen;
            window.jetXReact.setCurrent([], gen);
            window.jetXReact.setActive([], 0, 0, gen);
            window.jetXReact.setCashOut([], 0, 0, gen);
        }

        this.clearStats();
    }

    clearColumn(el) {
        if (!el) return;
        el.innerHTML = '';
        el.style.height = '0';
        el.style.paddingTop = '0';
    }





    bet = (spin) => {
        this.infoItem(spin, true);
    }

    undo = (spin) => {
        let playerId = `${spin.i}-${spin.x}`;
        let current = spin.i === player.counterId;
        return this.delete(current ? 'current' : 'active', playerId, current ? this.list.current : this.list.active);
    }

    cashout = (spin) => {
        spin = this.spinInfo(spin);
        let current = spin.i === player.counterId;

        let cashOutAnimate = this.infoItem(spin, true, true);

        if (cashOutAnimate) {
            if (showBets || current) {
                let currency = spin.r;
                let currencyCode = currency.split('_')[0];
                let fractionDigit = currency.split('_')[1];
                let cashout = spin.c;
                let betAmount = spin.b;
                let winAmount = spin.w;
                let displayCurrency = spin.currency;
                if (board.convertToPlayerCurrency) {
                    betAmount = parseFloat((betAmount * board.exchangeRate).toFixed(player.currency.fractionDigit));
                    winAmount = parseFloat((winAmount * board.exchangeRate).toFixed(player.currency.fractionDigit));

                    if (currencyCode !== player.currency.currencyCode) {
                        if (betAmount < board.minBet) {
                            betAmount = board.minBet;
                        } else if (betAmount > board.maxBet) {
                            betAmount = board.maxBet;
                        }
                        betAmount = betAmount.toFixed(player.currency.fractionDigit < 0 ? 0 : player.currency.fractionDigit);
                        winAmount = parseFloat(betAmount) * cashout;

                    }
                    displayCurrency = player.currency;
                }
                if (current && typeof checkAutoplay === 'function') {
                    checkAutoplay(spin.x, 'Cashout', winAmount);
                }
                this.queueCashOutFlyer(spin.c, winAmount, displayCurrency, current);
                setTimeout(() => {
                    if (typeof queueAutoplayPlaceBet === 'function') {
                        queueAutoplayPlaceBet(spin.x);
                    } else {
                        autoplayPlaceBet(spin.x);
                    }
                }, 100);
            }
        } else if (current && typeof checkAutoplay === 'function') {
            checkAutoplay(spin.x, 'Cashout', this.toPlayerAmount(spin.w, spin.b, spin.c, spin.r));
        }
    }

    toPlayerAmount = (winAmount, betAmount, cashout, currencyRaw) => {
        if (!board.convertToPlayerCurrency) return winAmount;
        const currencyCode = String(currencyRaw || '').split('_')[0];
        let amount = parseFloat((winAmount * board.exchangeRate).toFixed(player.currency.fractionDigit));
        if (currencyCode && currencyCode !== player.currency.currencyCode) {
            let bet = parseFloat((betAmount * board.exchangeRate).toFixed(player.currency.fractionDigit));
            if (bet < board.minBet) bet = board.minBet;
            else if (bet > board.maxBet) bet = board.maxBet;
            amount = bet * cashout;
        }
        return amount;
    }

    infoItem = (spin, small = false, cashouted = false, removed = false) => {
        let currency, currencyCode, fractionDigit, currencySymbol;

        let counterId, betPlace, current, displayName, clientAvatar, betAmount, cashout, winAmount, portalName;

        if(IsNetworkOptimized) {
            if(spin.a) {
                spin = this.spinInfo(spin);
            }
            if(spin.p === '') board.isPortalFilterOn = false;
        }

        currency = spin.r;
        currencyCode = currency.split('_')[0];
        fractionDigit = currency.split('_')[1];
        currencySymbol = getCurrencySymbol(currencyCode);

        counterId = spin.i;
        betPlace = spin.x;
        current = counterId === player.counterId;
        displayName = formatClientName(spin.d, current);
        clientAvatar = getAvatar(spin.d, current);
        betAmount = spin.b;
        cashout = spin.c;
        winAmount = spin.w;
        portalName = spin.p;

        if (board.isPortalFilterOn && player.portalName !== portalName) {
            return false;
        }

        let status = (winAmount > 0 ? ' win' : '');
        status += current ? ' current' : '';


        if (board.convertToPlayerCurrency) {
            betAmount = parseFloat((betAmount * board.exchangeRate).toFixed(player.currency.fractionDigit));
            winAmount = parseFloat((winAmount * board.exchangeRate).toFixed(player.currency.fractionDigit));

            if (currencyCode !== player.currency.currencyCode) {
                if (betAmount < board.minBet) {
                    betAmount = board.minBet;
                } else if (betAmount > board.maxBet) {
                    betAmount = board.maxBet;
                }
                betAmount = betAmount.toFixed(player.currency.fractionDigit < 0 ? 0 : player.currency.fractionDigit);
                winAmount = parseFloat(betAmount) * cashout;

            }
            currencyCode = player.currency.currencyCode;
            fractionDigit = player.currency.fractionDigit;
            currencySymbol = player.currency.currencySymbol;
        }

        winAmount = formatBalance(winAmount);

        let bet = betAmount;
        let betAmountFormated = formatAmount(betAmount, {currencyCode, fractionDigit}, 'formated');
        let cashoutFormated = cashout === 0 ? '-' : cashout.toFixed(2);
        let winAmountFormated = winAmount === 0 ? '-' : formatAmount(winAmount, {currencyCode, fractionDigit}, 'formated');

        let playerId = counterId + '-' + betPlace;

        bet = parseFloat(bet);
        let item = {
            playerId: playerId,
            counterId: counterId,
            bet: bet,

            status: status,
            displayName: displayName,
            clientAvatar: clientAvatar,
            betAmount: betAmount,
            cashoutFormated: cashoutFormated,
            winAmount: winAmount,
            currency: {currencyCode, fractionDigit, currencySymbol},
        };

        let replacedInPlace = false;
        if (cashouted) {
            const data = current ? this.list.current : this.list.active;
            for (let i = 0; i < data.length; i++) {
                if (data[i].playerId === playerId) {
                    if (data[i].winAmount > 0) {
                        data[i] = item;
                        return true;
                    }
                    data[i] = item;
                    replacedInPlace = true;
                    removed = true;
                    break;
                }
            }
            if (!replacedInPlace && !current) {
                removed = true;
            }
        }

        if (current && cashouted) {
            const cashoutAllRepeat = !!(jetX.cashoutAllPulseActive && jetX.cashoutAllPulseDone);
            if (!cashoutAllRepeat) {
                jetX.canvas.playSound(10, 'win');
            }

            // const isMaxWin = !!(player.bets && player.bets[betPlace] && player.bets[betPlace].IsMaxWin);
            const isMaxWin = board.maxWinAmount > 0 && winAmount >= board.maxWinAmount;

            jetX.pulseMultiplier({ cashout, isMaxWin });
            buttonMessage(betPlace, {winAmount: winAmountFormated, cashout: cashoutFormated, isMaxWin}, 3000, 'cashout');
        }

        if (!replacedInPlace) {
            if (current) {
                this.insert('current', item, this.list.current);
            } else if (!cashouted) {
                this.insert('active', item, this.list.active);
            }
        } else if (current) {
            this._currentDirty = true;
            this._listGen++;
        } else {
            this._listGen++;
        }

        if (!removed) {
            this.stats.count++;
        }
        if (winAmount > 0) {
            this.stats.cashout++;
        }
        this.stats.wins += winAmount;

        if (!removed && this.stats.avatars.length < 3 && !this.stats.avatarPlayers[counterId]) {
            this.stats.avatarPlayers[counterId] = true;
            this.stats.avatars.push(clientAvatar);
        }
        if (this.stats.avatars.length !== this._lastAvatarLen) {
            const avatars = this.stats.avatars;
            this._pendingAvatarsHtml =
                (avatars.length >= 1 ? `<div class="avatar avatar-${avatars[0]}"></div>` : ``) +
                (avatars.length >= 2 ? `<div class="avatar avatar-${avatars[1]}"></div>` : ``) +
                (avatars.length >= 3 ? `<div class="avatar avatar-${avatars[2]}"></div>` : ``)
            ;
            this._pendingAvatarsDirty = true;
        }
        const liveBetCount = Math.max(0, this.stats.count - this.stats.cashout);
        if (liveBetCount !== this._lastStatsCount) {
            this._pendingCount = liveBetCount;
            this._pendingCountDirty = true;
            this._pendingBets = liveBetCount;
            this._hasPendingBets = true;
        }
        if (this.stats.wins !== this._lastStatsWins) {
            this._pendingWinHtml = formatAmount(this.stats.wins, player.currency, 'formated');
            this._pendingWinsDirty = true;
        }

        if (!this.stats.topWinners.players[counterId]) {
            this.stats.topWinners.players[counterId] = 1;
            this.stats.topWinners.cashout++;
        }
        this.stats.topWinners.wins = this.stats.wins;
        if(current) this.stats.topWinners.myWin += winAmount;
        if(winAmount > 0) {
            let counterId = `counterId-${item.counterId}`;
            if(this.stats.topWinners.list[counterId]) {
                this.stats.topWinners.list[counterId].betAmount += item.betAmount;
                this.stats.topWinners.list[counterId].winAmount += item.winAmount;
            } else {
                this.stats.topWinners.list[counterId] = {...item};
            }
        }

        return true;
    }

    delete = (type, playerId, data) => {
        for (let i = 0; i < data.length; i++) {
            if (playerId === data[i].playerId) {
                data.splice(i, 1);
                if (type === 'current') this._currentDirty = true;
                this._listGen++;
                return true;
            }
        }
        return false;
        //this.draw(type);
    }

    sameSlice = (a, b) => {
        if (a === b) return true;
        if (!a || !b || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    scheduleDraw = () => {
        this._feedDirty = true;
    }

    resetFeedUiPending = () => {
        this._feedDirty = false;
        this._pendingCountDirty = false;
        this._pendingWinsDirty = false;
        this._pendingAvatarsDirty = false;
        this._hasPendingBets = false;
        this._pendingCount = 0;
        this._pendingWinHtml = '';
        this._pendingAvatarsHtml = '';
        this._pendingBets = 0;
    }

    clearFeedParachutes = () => {
        if (this._paraTimers && this._paraTimers.size) {
            this._paraTimers.forEach((id) => clearTimeout(id));
            this._paraTimers.clear();
        }
        this._paraBuf = [];
    }

    isRecordCashoutWin = (winAmount) => {
        const wins = jetX && jetX.lastCashoutWins;
        if (!wins || !wins.length) return true;
        let max = wins[0];
        for (let i = 1; i < wins.length; i++) {
            if (wins[i] > max) max = wins[i];
        }
        return winAmount >= max;
    }

    queueCashOutFlyer = (multiplier, win, currency, current) => {
        if (current || this.isRecordCashoutWin(win)) {
            jetX.cashOut(multiplier, win, currency, current);
            return;
        }
        this._paraBuf.push({
            args: [multiplier, win, currency, current],
            w: parseFloat(win) || 0,
        });
    }

    flushPendingStats = () => {
        if (this._pendingAvatarsDirty) {
            this._pendingAvatarsDirty = false;
            if (this.config.statsAvatars) {
                this.config.statsAvatars.innerHTML = this._pendingAvatarsHtml;
            }
            this._lastAvatarLen = this.stats.avatars.length;
        }
        if (this._pendingCountDirty) {
            this._pendingCountDirty = false;
            if (this.config.statsCount) {
                this.config.statsCount.textContent = this._pendingCount;
            }
            this._lastStatsCount = this._pendingCount;
        }
        if (this._hasPendingBets) {
            this._hasPendingBets = false;
            jetX.setBets(this._pendingBets);
        }
        if (this._pendingWinsDirty) {
            this._pendingWinsDirty = false;
            if (this.config.statsWin) {
                this.config.statsWin.innerHTML = this._pendingWinHtml;
                this.config.statsWin.setAttribute('data-loaded', 'true');
                if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(this.config.statsWin);
            }
            this._lastStatsWins = this.stats.wins;
        }
    }

    flushPendingParachutes = () => {
        if (!this._paraBuf.length) return;
        const buf = this._paraBuf;
        this._paraBuf = [];
        buf.sort((a, b) => b.w - a.w);
        const n = Math.min(PlayersView.PARA_PER_TICK, buf.length);
        const spread = PlayersView.PARA_SPREAD_MS;
        for (let i = 0; i < n; i++) {
            const args = buf[i].args;
            const delay = spread > 0 ? Math.random() * spread : 0;
            const id = setTimeout(() => {
                this._paraTimers.delete(id);
                try { jetX.cashOut.apply(jetX, args); } catch (e) {}
            }, delay);
            this._paraTimers.add(id);
        }
    }

    flushFeedUi = () => {
        if (this._feedDirty) {
            this._feedDirty = false;
            this.draw('current');
            this.draw('');
        }
        this.flushPendingStats();
        this.flushPendingParachutes();
    }

    draw = (type) => {
        if (type === 'current') {
            if (!this._currentDirty) return;
            this._currentDirty = false;
            this._layoutCached = false;
            if (showBets) window.jetXReact.setCurrent(this.list.current, this._listGen);
            return;
        }

        this.cachePlayersLayout();
        let currentHeight = this._currentHeight;
        let activeHeight = this.list.active.length * rowHeight;
        let cashOutHeight = this.list.cashout.length * rowHeight;
        let visibleCount = this._visibleCount || rowCount;

        let scrollTop = this.getPlayersListScrollTop() - currentHeight;
        let [activeStart, activeEnd] = this.windowSlice(scrollTop, this.list.active.length, visibleCount, rowHeight);
        let [cashOutStart, cashOutEnd] = this.windowSlice(scrollTop - activeHeight, this.list.cashout.length, visibleCount, rowHeight);

        const drawKey = `${activeStart}:${activeEnd}:${cashOutStart}:${cashOutEnd}:${activeHeight}:${cashOutHeight}:${this._listGen}`;
        if (this._lastDrawKey === drawKey) return;
        this._lastDrawKey = drawKey;

        let list = [];
        if (this.list.active.length > 0) {
            for (let i = activeStart; i < activeEnd; i++) {
                list.push(this.list.active[i]);
            }
        }

        let cashList = [];
        if (this.list.cashout.length > 0) {
            for (let i = cashOutStart; i < cashOutEnd; i++) {
                cashList.push(this.list.cashout[i]);
            }
        }

        if (jetX.game.loader) {
            if (this.list.cashout.length) this.list.cashout = [];
            cashList = [];
            cashOutHeight = 0;
            cashOutStart = 0;
        }

        const activePad = activeStart * rowHeight;
        const cashPad = cashOutStart * rowHeight;
        const sliceChanged = !this.sameSlice(list, this._lastActiveSent)
            || !this.sameSlice(cashList, this._lastCashSent);
        const heightChanged = activeHeight !== this._lastActiveHeight
            || cashOutHeight !== this._lastCashHeight
            || activePad !== this._lastActivePad
            || cashPad !== this._lastCashPad;

        if (!sliceChanged && !heightChanged) return;

        this._lastActiveHeight = activeHeight;
        this._lastCashHeight = cashOutHeight;
        this._lastActivePad = activePad;
        this._lastCashPad = cashPad;

        if (!showBets || !window.jetXReact) return;

        if (!sliceChanged) {
            if (typeof window.jetXReact.setColumnMetrics === 'function') {
                window.jetXReact.setColumnMetrics(activeHeight, activePad, cashOutHeight, cashPad, this._listGen);
            }
            return;
        }

        this._lastActiveSent = list;
        this._lastCashSent = cashList;

        const batch = (typeof ReactDOM !== 'undefined' && ReactDOM.unstable_batchedUpdates)
            || (fn => fn());
        const gen = this._listGen;
        batch(() => {
            window.jetXReact.setActive(list, activeHeight, activePad, gen);
            window.jetXReact.setCashOut(cashList, cashOutHeight, cashPad, gen);
        });
    }

    info = (playersInfo, load = true) => {
        this.clear();
        if (load) {
            for (let i = 0; i < playersInfo.length; i++) {
                this.infoItem(playersInfo[i]);
            }
        }

        this._feedDirty = true;
        this.flushFeedUi();
    }

    insert = (type, item, data, sort = true) => {
        if (type === 'active') {
            for (let i = 0; i < data.length; i++) {
                if (item.playerId === data[i].playerId) {
                    data.splice(i, 1);
                    break;
                }
            }
        }
        if (type === 'active' && data.length >= PlayersView.LIST_LIMIT && item.bet < data[data.length - 1].bet) {
            return;
        }

        let inserted = false;
        if (sort) {
            for (let i = 0; i < data.length; i++) {
                if (type === 'current') {
                    if (item.playerId === data[i].playerId) {
                        data.splice(i, 1);
                    }
                } else {
                    if (item.bet >= data[i].bet) {
                        inserted = true;
                        data.splice(i, 0, item);
                        break;
                    }
                }
            }
        }
        if (type === 'cashOut') {
            data.splice(0, 0, item);
        } else {
            if (!inserted) {
                data.push(item);
            }
        }
        if (type === 'active' && data.length > PlayersView.LIST_LIMIT) {
            data.length = PlayersView.LIST_LIMIT;
        }
        if (type === 'current') this._currentDirty = true;
        this._listGen++;
        //this.draw(type);
    }

    spinInfo = (spin) => {
        let counterId, betPlace, current, displayName, betAmount, cashout, winAmount, portalName, currency, currencyCode, fractionDigit;

        if(IsNetworkOptimized) {
            spin.a = spin.a.replace('__', 'ttttt_');
            let spinInfo = spin.a.split('_');
            counterId = spinInfo[5];
            betPlace = spinInfo[6];
            currencyCode = spinInfo[7];
            fractionDigit = parseInt(spinInfo[8]);
            currency = `${spinInfo[7]}_${spinInfo[8]}`;
            current = counterId === player.counterId;
            displayName = formatClientName(spinInfo[0].replace('ttttt', '_'), current);
            betAmount = parseFloat(spinInfo[1]);
            //OriginalBetAmount = spinInfo[2];
            cashout = parseFloat(spinInfo[3]);
            winAmount = parseFloat(spinInfo[4]);
            portalName = spinInfo[9] ? spinInfo[9] : '';
            spin = {
                currency: {currencyCode: currencyCode, fractionDigit: fractionDigit},
                r: currency,
                i: counterId,
                x: betPlace,
                d: spinInfo[0].replace('ttttt', '_'),
                b: betAmount,
                c: cashout,
                w: winAmount,
                p: portalName,
            }
        }
        return spin;
    }


    clearStats = () => {
        this.resetFeedUiPending();
        this.config.statsAvatars.innerHTML = '';
        this.config.statsCount.textContent = '0';
        this.config.statsWin.innerHTML = formatAmount(0, player.currency, 'formated');
        this.config.statsWin.setAttribute('data-loaded', 'true');
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(this.config.statsWin);
        jetX.setBets(0);

        this.stats.count = 0;
        this.stats.players = 0;
        this.stats.cashout = 0;
        this.stats.wins = 0;
        this.stats.avatars = [];
        this.stats.avatarPlayers = {};
        this._lastStatsCount = 0;
        this._lastStatsWins = 0;
        this._lastAvatarLen = 0;
    }



    resetTopWinners = () => {
        this.stats.topWinners = {
            clear: false,
            list: [],
            cashout: 0,
            wins: 0,
            myWin: 0,
            players: [],
        };
    }

    top3Wins = (show = true) => {
        let top3Wins = this.config.top3Wins;
        let myWinElement = this.config.top3WinsMyWin;
        let cashoutElement = this.config.top3WinsCashout;
        let winsElement = this.config.top3WinsWins;
        let listElement = this.config.top3WinsList;

        if (!top3Wins || !cashoutElement || !winsElement || !listElement) return false;

        if (!show) {
            this.resetTopWinners();
            if (this._top3Playing) return true;
            this.top3WinsHide();
            return true;
        }

        if (this._top3Playing) return true;

        if (!this.top3WinsIsEnabled()) {
            this.top3WinsHide();
            this.resetTopWinners();
            return false;
        }

        const topWinners = this.stats.topWinners || {};
        const winners = Object.values(topWinners.list || {})
            .filter((item) => item && item.winAmount > 0)
            .sort((a, b) => b.winAmount - a.winAmount)
            .slice(0, 3);

        if (winners.length === 0 || topWinners.cashout === 0) {
            return false;
        }

        this.clearTop3Seq();
        this._top3Playing = true;

        const myWin = topWinners.myWin;
        const cashout = topWinners.cashout;
        const wins = topWinners.wins;
        this.resetTopWinners();

        myWinElement.innerHTML = formatAmount(myWin, player.currency, 'formated');
        cashoutElement.innerHTML = cashout;
        winsElement.innerHTML = formatAmount(wins, player.currency, 'formated');
        top3Wins.classList.toggle('round-winners--no-my-win', !(myWin > 0));

        top3Wins.classList.remove('round-winners--closing');
        this.showTopWinners(winners);
        this.activatePhase('summary');

        const winAnimLeadMs = typeof WIN_ANIM_LEAD_MS === 'number' ? WIN_ANIM_LEAD_MS : 200;
        const winAnim = top3Wins.querySelector('.win-video');
        if (winAnim && typeof startWinAnim === 'function') {
            let base = '../Content/';
            if (staticContentUrl !== '') {
                base = staticContentUrl.replace('Sound/', '');
            }
            startWinAnim(winAnim, base + 'ImagesNew/win.webp');
        }

        this.top3Seq.push(setTimeout(() => this.top3WinsToggle(top3Wins, true), winAnimLeadMs));
        this.top3Seq.push(setTimeout(() => {
            this.activatePhase('top');
            if (typeof scheduleFitTextAll === 'function' && this.config.top3WinsList) {
                scheduleFitTextAll(this.config.top3WinsList);
            }
        }, 2000 + winAnimLeadMs));
        this.top3Seq.push(setTimeout(() => top3Wins.classList.add('round-winners--closing'), 4200 + winAnimLeadMs));
        this.top3Seq.push(setTimeout(() => this.top3WinsHide(), 4500 + winAnimLeadMs));

        return true;
    }

    clearTop3Seq = () => {
        if (this.top3Seq) this.top3Seq.forEach((id) => clearTimeout(id));
        this.top3Seq = [];
    }

    activatePhase = (name) => {
        if (!this.config.top3Wins) return;
        this.config.top3Wins.querySelectorAll('.rw-phase').forEach((phase) => {
            phase.classList.toggle('is-active', phase.dataset.rwPhase === name);
        });
    }

    winnerItemHtml = (rank, item, center) => {
        return `
            <span class="rw-winner${center ? ' rw-winner--center' : ''}" style="animation-delay: ${center ? 0 : 80}ms">
                <span class="rw-winner__icon${rank}"></span>
                <span class="rw-winner__copy">
                    <span class="rw-winner__user">${formatClientName(item.displayName)}</span>
                    <strong class="rw-winner__amount text-fit">${formatAmount(item.winAmount, item.currency, 'formated')}</strong>
                </span>
            </span>
        `;
    }

    showTopWinners = (winners) => {
        const listElement = this.config.top3WinsList;
        if (!listElement || !winners || winners.length === 0) return;

        const slots = [
            winners[1] ? {rank: 1, item: winners[1]} : null,
            winners[0] ? {rank: 0, item: winners[0], center: true} : null,
            winners[2] ? {rank: 2, item: winners[2]} : null,
        ];

        listElement.innerHTML = slots
            .map((slot) => slot ? this.winnerItemHtml(slot.rank, slot.item, slot.center) : '<span class="rw-winner rw-winner--empty"></span>')
            .join('');

        if (typeof scheduleFitTextAll === 'function') {
            scheduleFitTextAll(listElement);
            this.top3Seq.push(setTimeout(() => scheduleFitTextAll(listElement), 400));
        }
    }

    top3WinsToggle = (top3Wins, show) => {
        top3Wins.classList.toggle('is-visible', show);
        top3Wins.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    top3WinsHide = () => {
        this._top3Playing = false;
        this.clearTop3Seq();
        if (!this.config.top3Wins) return false;

        this.top3WinsToggle(this.config.top3Wins, false);
        this.config.top3Wins.classList.remove('round-winners--closing');
        this.config.top3Wins.querySelectorAll('.rw-phase').forEach((phase) => {
            phase.classList.remove('is-active', 'is-leaving');
        });
        return true;
    }

    top3WinsIsSuppressed = () => {
        const appEl = document.querySelector('.app');
        const vh = window.innerHeight || 0;
        return !!(appEl?.classList.contains('mode-4') && vh < 590);
    }

    top3WinsSyncViewport = () => {
        if (this.top3WinsIsSuppressed()) this.top3WinsHide();
    }

    top3WinsIsEnabled = () => {
        if (this.top3WinsIsSuppressed()) return false;
        return !this.config.top3WinsToggle || this.config.top3WinsToggle.checked;
    }

    top3WinsToggleInit = () => {
        if (!this.config.top3WinsToggle) return false;

        this.config.top3WinsToggle.addEventListener('change', () => {
            if (!this.config.top3WinsToggle.checked) {
                this.top3WinsHide();
            }
        });

        return true;
    }
}

const isSidePanelVisible = (panelId) => {
    if (document.querySelector('.app')?.classList.contains('is-side-closed')) return false;
    const panel = document.getElementById(panelId);
    return !!(panel && !panel.hidden);
};

class RoundsView {
    static config = {
        allow: true,
        header: document.querySelector('#headerLast100Spins'),
        div: document.querySelector('#last100Spins'),
        tabs: document.querySelector('#last100SpinsTabs'),
        roundSummary: document.querySelectorAll('.round-summary .round-summary__value'),
        activeTabClass: 'line-tab--active',

        spinClass: '#last100Spins .badge-multiplier',
        headerSpinClass: '#headerLast100Spins .badge-multiplier',
    }
    config = {};
    gameStats = null;
    category = "1";
    time = "1";
    data = [];
    _gridDirty = false;

    lastSpinInfoHash = '';
    lastHeaderSpinHash = '';

    constructor(gameStats = null) {
        this.config = RoundsView.config;
        this.gameStats = gameStats;

        this.dom();
    }

    createClickEvent = () => {
        return new Event(clickEvent, { bubbles: true });
    }

    spinInfo = (spin) => {
        if (spin.Info === '' || spin.SpinHash === '' || spin.SpinHash === 'loading') return false;
        const { date, time } = this.gameStats.formatDateTime(spin.SpinTime, true);

        let coefficient = spin.Coefficient;
        if (parseFloat(coefficient) > 0) {
            coefficient = `${parseFloat(spin.Coefficient).toFixed(2)}x`;
        }
        this.lastSpinInfoHash = spin.SpinHash;

        const historyMultiplier = document.getElementById('history-multiplier');
        if (historyMultiplier) {
            historyMultiplier.innerHTML = parseFloat(coefficient) > 0 ? `${parseFloat(spin.Coefficient).toFixed(2)}x` : coefficient;
            historyMultiplier.classList.remove('low', 'medium', 'high', 'max');
            historyMultiplier.classList.add(this.gameStats.spinColor(parseFloat(spin.Coefficient)));
            if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(historyMultiplier);
        }

        const historyDate = document.getElementById('history-date');
        if (historyDate) historyDate.innerHTML = `${date} ${time}`;

        const historyHash = document.getElementById('history-hash');
        if (historyHash) historyHash.textContent = spin.SpinHash;

        const historyResult = document.getElementById('history-result');
        if (historyResult) historyResult.textContent = spin.Info;

        this.setCopyButtonIcon(document.getElementById('history-hash-copy'), false);
        this.setCopyButtonIcon(document.getElementById('history-result-copy'), false);

        this.updateSpinNav(spin);

        openPopup('history', {
            standaloneHistory: true,
        });

        this.spinsInfoClose(false);
    }

    updateSpinNav = (spin) => {
        const data = this.data || [];
        const index = spin ? data.findIndex(v => v.SpinHash === spin.SpinHash) : -1;

        const prevButton = document.getElementById('history-prev');
        const nextButton = document.getElementById('history-next');

        if (prevButton) prevButton.classList.toggle('history-nav-button--hidden', index <= 0);
        if (nextButton) nextButton.classList.toggle('history-nav-button--hidden', index < 0 || index >= data.length - 1);
    }

    refreshSpinNavIfOpen = () => {
        const historyPopup = document.querySelector('[data-popup="history"]');
        if (!historyPopup || historyPopup.hidden || historyPopup.getAttribute('aria-hidden') === 'true') return;

        const hashEl = document.getElementById('history-hash');
        if (!hashEl || !hashEl.textContent) return;

        const spin = (this.data || []).find(v => v.SpinHash === hashEl.textContent);
        this.updateSpinNav(spin);
    }

    spinsInfoClose = (hidePromo = true) => {
        if(!hidePromo) this.lastSpinInfoHash = '';
        if (mobile && hidePromo) promoPrizeIcon(true);
    }

    copyTextFallback = (text) => {
        let textArea = document.createElement("textarea");
        textArea.value = text;

        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
        }
        document.body.removeChild(textArea);
    }

    setCopyButtonIcon = (button, done = false) => {
        if (!button) return;
        if (!done) clearTimeout(button._copyIconTimer);
        const use = button.querySelector('use');
        const svg = button.querySelector('svg.icon');
        if (use) {
            use.setAttribute('href', done ? '#popup-icon-copy-done' : '#popup-icon-copy');
        }
        if (svg) {
            svg.setAttribute('viewBox', done ? '0 0 20 20' : '0 0 24 24');
        }
    }

    markCopyButtonDone = (button) => {
        if (!button) return;
        this.setCopyButtonIcon(button, true);
        clearTimeout(button._copyIconTimer);
        button._copyIconTimer = setTimeout(() => this.setCopyButtonIcon(button, false), 2000);
    }

    dom = () => {
        if(!this.config.allow) return false;

        if (this.config.tabs) {
            this.config.tabs.addEventListener('click', (event) => {
                const button = event.target.closest('.line-tab');
                if (!button || !this.config.tabs.contains(button)) return;
                if (!this.gameStats.setActiveLineTab(this.config.tabs, button, this.config.activeTabClass)) return;

                this.draw();
                this.gameStats.pulsePanel(this.config.div);
            });
        }

        document.addEventListener(clickEvent, (e) => {
            const button = e.target.closest(`${this.config.spinClass}, ${this.config.headerSpinClass}`);
            if (button) {
                let hash = button.id.slice(2);
                let spin = this.data.find(v => v.SpinHash === hash);
                if (spin) {
                    this.spinInfo(spin);
                }
                return false;
            }

            const closeBtn = e.target.closest('#popup-history .game-modal__icon-button');
            if (closeBtn) {
                this.spinsInfoClose();
                return false;
            }

            const navPrev = e.target.closest('#history-prev');
            if (navPrev) {
                const hashEl = document.getElementById('history-hash');
                if (hashEl) {
                    const currentPill = document.getElementById(`r-${hashEl.textContent}`);
                    if (currentPill) {
                        const prevPill = currentPill.previousElementSibling;
                        if (prevPill) {
                            prevPill.dispatchEvent(this.createClickEvent());
                        }
                    }
                }
                return;
            }

            const navNext = e.target.closest('#history-next');
            if (navNext) {
                const hashEl = document.getElementById('history-hash');
                if (hashEl) {
                    const currentPill = document.getElementById(`r-${hashEl.textContent}`);
                    if (currentPill) {
                        const nextPill = currentPill.nextElementSibling;
                        if (nextPill) {
                            nextPill.dispatchEvent(this.createClickEvent());
                        }
                    }
                }
                return;
            }

            const hashCopy = e.target.closest('#history-hash-copy');
            if (hashCopy) {
                const hashEl = document.getElementById('history-hash');
                if (hashEl) {
                    this.copyTextFallback(hashEl.textContent);
                    this.markCopyButtonDone(hashCopy);
                }
                return false;
            }

            const resultCopy = e.target.closest('#history-result-copy');
            if (resultCopy) {
                const resultEl = document.getElementById('history-result');
                if (resultEl) {
                    this.copyTextFallback(resultEl.textContent);
                    this.markCopyButtonDone(resultCopy);
                }
                return false;
            }
        });
    }

    load = (data, load = false) => {
        if(!this.config.allow) return;

        this.data = (data.Last100Spins || []).reverse();

        this.draw();
    }

    draw = () => {
        const spins = this.data || [];

        if (this.config.header) {
            const newestHash = spins.length ? spins[0].SpinHash : '';
            const animateNewest = this.lastHeaderSpinHash !== '' && newestHash !== '' && newestHash !== this.lastHeaderSpinHash;
            this.lastHeaderSpinHash = newestHash;

            const headerCount = (typeof mobileLandscapeQuery !== 'undefined' && mobileLandscapeQuery.matches)
                ? 8
                : (isMobileLikeViewport() ? 15 : 25);
            this.config.header.innerHTML = spins.slice(0, headerCount).map((v, index) => {
                const color = this.gameStats.spinColor(v.Coefficient);
                const enter = animateNewest && index === 0 ? ' badge-multiplier--enter' : '';
                const long = color === 'max' ? '' : (v.Coefficient >= 100000 ? ' badge-multiplier--xl' : (v.Coefficient >= 1000 ? ' badge-multiplier--l' : ''));
                return `<button id="h-${v.SpinHash}" class="badge-multiplier badge-multiplier-md ${color}${enter}${long}" type="button"><span>${v.Coefficient.toFixed(2)}x</span></button>`;
            }).join('');

            if (spins.length >= headerCount) {
                this.config.header.innerHTML += `<button class="multipliers-view-all" type="button" data-multipliers-view-all>${GetCaption('jetxnew.view.all')}</button>`;
            }

            if (typeof updateMultipliersToggleVisibility === 'function') {
                updateMultipliersToggleVisibility();
            }
        }

        this.drawAll();

        if (this.lastSpinInfoHash !== '') {
            const activeEl = document.getElementById(`r-${this.lastSpinInfoHash}`)
                || document.getElementById(`h-${this.lastSpinInfoHash}`)
                || document.getElementById(this.lastSpinInfoHash);
            if (activeEl) {
                activeEl.dispatchEvent(this.createClickEvent());
            }
        }

        this.refreshSpinNavIfOpen();
    }

    drawAllIfDirty = () => {
        if (!this._gridDirty) return;
        this.drawAll();
    }

    drawAll = () => {
        if (!this.config.div) return;

        if (!isSidePanelVisible('side-rounds')) {
            this._gridDirty = true;
            return;
        }

        const activeTab = document.querySelector('#last100SpinsTabs .line-tab--active');
        const count = activeTab ? (parseInt(activeTab.dataset.count, 10) || 10) : 10;
        const data = (this.data || []);

        this.config.div.innerHTML = data.map((v, index) => {
            const color = this.gameStats.spinColor(v.Coefficient);
            const long = color === 'max' ? '' : (v.Coefficient >= 100000 ? ' badge-multiplier--xl' : (v.Coefficient >= 1000 ? ' badge-multiplier--l' : ''));
            const dimmed = index >= count ? ' badge-multiplier--dimmed' : '';
            return `<button id="r-${v.SpinHash}" class="badge-multiplier badge-multiplier-md text-fit ${color}${long}${dimmed}" type="button"><span>${v.Coefficient.toFixed(2)}x</span></button>`;
        }).join('');
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(this.config.div);
        this.drawStats((data || []).slice(0, count));
        this._gridDirty = false;
    }

    drawStats = (data) => {
        if (!this.config.roundSummary.length) return;

        let low = 0;
        let medium = 0;
        let high = 0;

        data.forEach((spin) => {
            if (spin.Coefficient < 2) {
                low++;
            } else if (spin.Coefficient < 10) {
                medium++;
            } else {
                high++;
            }
        });

        this.config.roundSummary[0].textContent = low.toString();
        this.config.roundSummary[1].textContent = medium.toString();
        this.config.roundSummary[2].textContent = high.toString();
    }
}

class TopView {
    static config = {
        allow: true,
        div: document.querySelector('#statistics'),
        head: document.querySelector('#statistics-head'),
        tabs: document.querySelector('#statistics-filter'),
        timeDropdown: document.querySelector('#side-top .filter-select'),
        activeTabClass: 'line-tab--active',
        panelAnimationMs: 240,
        panelActiveClass: 'tab-panel--active',
    }
    config = {};
    gameStats = null;
    category = "1";
    time = "1";
    data = {};
    maxCashoutCoeff = 100000000;
    rendered = false;
    _dirty = false;

    constructor(gameStats = null) {
        this.config = TopView.config;
        this.gameStats = gameStats;

        this.dom();
    }

    dom = () => {
        if(!this.config.allow) return;

        if (this.config.tabs) {
            this.config.tabs.addEventListener('click', (event) => {
                const button = event.target.closest('.line-tab');
                if (!button || !this.config.tabs.contains(button)) return;
                if (!this.gameStats.setActiveLineTab(this.config.tabs, button, this.config.activeTabClass)) return;

                this.category = this.config.tabs.dataset.cat = button.dataset.cat || this.config.tabs.dataset.cat || '1';
                this.draw();
                this.gameStats.pulsePanel(this.config.div, this.config.panelActiveClass, this.config.panelAnimationMs);
            });
        }

        if (this.config.timeDropdown && this.config.tabs) {
            const periodToggle = this.config.timeDropdown.querySelector('[data-top-period-toggle]');
            const periodLabel = this.config.timeDropdown.querySelector('[data-top-period-label]');
            const periodMenu = this.config.timeDropdown.querySelector('[data-top-period-menu]');
            const periodOptions = this.config.timeDropdown.querySelectorAll('[data-top-period-option]');

            if (periodToggle && periodLabel && periodMenu && periodOptions.length) {
                const setPeriodDropdown = (open) => {
                    periodMenu.hidden = !open;
                    periodToggle.setAttribute('aria-expanded', String(open));
                };

                periodToggle.addEventListener('click', () => {
                    setPeriodDropdown(periodMenu.hidden);
                });

                periodOptions.forEach((option) => {
                    option.addEventListener('click', () => {
                        periodLabel.textContent = option.textContent;
                        this.time = this.config.tabs.dataset.time = option.dataset.time || this.config.tabs.dataset.time || '1';
                        this.draw();
                        this.gameStats.pulsePanel(this.config.div, this.config.panelActiveClass, this.config.panelAnimationMs);
                        periodOptions.forEach((item) => {
                            const active = item === option;
                            item.classList.toggle('filter-option--active', active);
                            item.setAttribute('aria-selected', String(active));
                        });
                        setPeriodDropdown(false);
                        periodToggle.focus();
                    });
                });

                document.addEventListener('click', (event) => {
                    if (periodMenu.hidden || this.config.timeDropdown.contains(event.target)) {
                        return;
                    }

                    setPeriodDropdown(false);
                });

                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape' && !periodMenu.hidden) {
                        setPeriodDropdown(false);
                        periodToggle.focus();
                    }
                });
            }
        }
    }

    load = (data, load = false) => {
        if(!this.config.allow) return;

        this.maxCashoutCoeff = data.MaxCashoutCoeff || 100000000;

        this.data['topDailyBigWins'] = (data.TopDailyBigWins || []).reverse();
        this.data['topWeeklyBigWins'] = (data.TopWeeklyBigWins || []).reverse();
        this.data['topMonthlyBigWins'] = (data.TopMonthlyBigWins || []).reverse();

        this.data['topDailyHugeWins'] = (data.TopDailyHugeWins || []).reverse();
        this.data['topWeeklyHugeWins'] = (data.TopWeeklyHugeWins || []).reverse();
        this.data['topMonthlyHugeWins'] = (data.TopMonthlyHugeWins || []).reverse();

        this.data['topDailyCoeffs'] = (data.TopDailyCoeffs || []).reverse();
        this.data['topWeeklyCoeffs'] = (data.TopWeeklyCoeffs || []).reverse();
        this.data['topMonthlyCoeffs'] = (data.TopMonthlyCoeffs || []).reverse();

        if (!isSidePanelVisible('side-top')) {
            if (!this.rendered) this._dirty = true;
            return;
        }

        if (load || !this.rendered) {
            this.draw();
        }
    }

    drawIfDirty = () => {
        if (!this._dirty) return;
        if (!isSidePanelVisible('side-top')) return;
        this.draw();
    }

    head = (name) => {
        if (name === 'Coeffs') {
            return `
            <div class="bets-cell bets-head-cell">${GetCaption("jetxnew.time")}</div>
            <div class="bets-cell bets-head-cell">${GetCaption("jetxnew.multiplier")}</div>
        `;
        }

        return `
            <div class="bets-cell bets-head-cell bets-cell--user">${GetCaption("jetxnew.user")}</div>
            <div class="bets-cell bets-head-cell">${GetCaption("jetxnew.bet")}</div>
            <div class="bets-cell bets-head-cell">${GetCaption("jetxnew.coeficient")}</div>
            <div class="bets-cell bets-head-cell">${GetCaption("jetxnew.win")}</div>
        `;
    }

    winnerSpin = (spin) => {
        if (spin.CashoutCoefficient <= this.maxCashoutCoeff) return spin;

        const cashoutCoefficient = Math.min(spin.CashoutCoefficient, this.maxCashoutCoeff);
        return Object.assign({}, spin, {
            CashoutCoefficient: cashoutCoefficient,
            WonAmount: spin.BetAmount * cashoutCoefficient,
            Coefficient: Math.min(spin.Coefficient, this.maxCashoutCoeff),
        });
    }

    state = () => {
        return {
            time: this.time === '2' ? 'Weekly' : (this.time === '3' ? 'Monthly' : 'Daily'),
            name: this.category === '2' ? 'HugeWins' : (this.category === '3' ? 'Coeffs' : 'BigWins'),
        };
    }

    getData = (time, name) => {
        let data = (this.data[`top${time}${name}`] || []).slice();

        if (name === 'Coeffs') return data;

        data = data.map(this.winnerSpin);
        if (name === 'HugeWins') {
            data.sort((a, b) => b.CashoutCoefficient - a.CashoutCoefficient);
        } else if (name === 'BigWins') {
            data.sort((a, b) => b.WonAmount - a.WonAmount);
        }

        return data;
    }

    drawRow = (spin, name) => {
        if (name === 'Coeffs') {
            const { date, time } = this.gameStats.formatDateTime(spin.SpinDate);
            const coefficient = (Math.min(spin.WonAmount, this.maxCashoutCoeff)).toFixed(2);

            return `
            <div class="bets-row win">
              <div class="bets-cell">${date} ${time}</div>
              <div class="bets-cell">${coefficient}x</div>
            </div>`;
        }

        const currency = spin.Currency || {};
        const currencyCode = currency.CurrencyCode;
        const fractionDigit = currency.FractionDigit;
        const betAmount = formatAmount(spin.BetAmount, { currencyCode, fractionDigit }, 'formated');
        const wonAmount = formatAmount(spin.WonAmount, { currencyCode, fractionDigit }, 'formated');
        const cashoutCoefficient = (spin.CashoutCoefficient).toFixed(2);
        const current = isCurrentClientName(spin.ClientName);
        const clientName = formatClientName(spin.ClientName, current);
        const clientAvatar = getAvatar(spin.ClientName, current);

        return `
            <div class="bets-row win${current ? ' current' : ''}">
              <div class="bets-cell bets-cell--user"><div class="avatar avatar-${clientAvatar}"></div>${clientName}</div>
              <div class="bets-cell"><span class="bets-amount text-fit">${betAmount}</span></div>
              <div class="bets-cell">${cashoutCoefficient}x</div>
              <div class="bets-cell bets-cell--win"><span class="bets-win text-fit">${wonAmount}</span></div>
            </div>`;
    }

    draw = () => {
        if (!this.config.div || !this.config.head) return;
        if (!isSidePanelVisible('side-top')) {
            this._dirty = true;
            return;
        }

        const { time, name } = this.state();
        const spins = this.getData(time, name);

        this.config.head.innerHTML = this.head(name);
        this.config.div.innerHTML = spins.map(spin => this.drawRow(spin, name)).join('');
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(this.config.div);
        this.rendered = true;
        this._dirty = false;
    }
}

class ClientHistory {
    static config = {
        allow: true,
        div: document.querySelector('#last24ClientSpins'),
    }
    config = {};
    gameStats = null;
    data = [];
    _dirty = false;

    constructor(gameStats = null) {
        this.config = ClientHistory.config;
        this.gameStats = gameStats;
    }

    isVisible = () => {
        const popup = document.getElementById('popup-my-bets');
        if (typeof isPopupVisible === 'function') return isPopupVisible(popup);
        return Boolean(popup && !popup.hidden && popup.getAttribute('aria-hidden') !== 'true');
    }

    load = (data, load = false) => {
        if(!this.config.allow) return;

        this.data = (data.Last24ClientSpins || []).reverse();

        if (!this.isVisible()) {
            this._dirty = true;
            return;
        }

        this.draw();
    }

    drawIfDirty = () => {
        if (!this._dirty) return;
        if (!this.isVisible()) return;
        this.draw();
    }

    draw = () => {
        if (!this.config.div) return;

        const last24ClientSpins = this.data || [];

        this.config.div.innerHTML = last24ClientSpins.map(spin => {
            let currency = spin.Currency;
            let currencyCode = currency.CurrencyCode;
            let fractionDigit = currency.FractionDigit;

            let betAmount = spin.BetAmount;
            let wonAmount = spin.WonAmount;
            let spinTimeParsed = this.gameStats.timeParse(spin.SpinTimeParsed) || spin.SpinTimeParsed;
            let cashoutCoefficient = spin.CashoutCoefficient;
            let coefficient = (spin.Coefficient).toFixed(2);
            let status = (wonAmount > 0 ? ' win' : '');

            betAmount = formatAmount(betAmount, {currencyCode, fractionDigit}, 'formated');
            wonAmount = formatAmount(wonAmount, {currencyCode, fractionDigit}, 'formated');
            cashoutCoefficient = cashoutCoefficient === 0 ? '--' : `${cashoutCoefficient.toFixed(2)}x`;

            return `            
                <button class="my-bets-row${status}" type="button">
                    <span>${spinTimeParsed}</span>
                    <span class="text-fit">${betAmount}</span>
                    <span class="text-fit">${cashoutCoefficient}</span>
                    <span class="text-fit crash ${this.gameStats.spinColor(parseFloat(coefficient))}">${coefficient}x</span>
                    <span class="text-fit my-bets-win">${wonAmount}</span>
                </button>    
            `;
        }).join('');
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(this.config.div);
        this._dirty = false;
    }
}

class GameStats {
    buttons = [];
    panels = [];

    constructor() {
        this.playersView = new PlayersView(this);
        this.roundsView = new RoundsView(this);
        this.topView = new TopView(this);
        this.clientHistory = new ClientHistory(this);
        this.dom();
    }

    load = (data, load = false) => {
        this.playersView.load(data, load);
        this.roundsView.load(data, load);
        this.topView.load(data, load);
        this.clientHistory.load(data, load);
    }

    dom = () => {
        this.buttons = document.querySelectorAll('[data-side-tab]');
        this.panels = document.querySelectorAll('[data-side-panel]');
        if(this.buttons.length > 0 && this.panels.length > 0) {
            this.buttons.forEach((button) => {
                button.addEventListener('click', () => {
                    this.setTab(button.dataset.sideTab);
                });
            });

            // this.attachSwipe(this.buttons[0].closest('.segments'), () => this.buttons, 'segment--active');
            // this.attachSwipe(document.getElementById('side-rounds'), () => document.querySelectorAll('#last100SpinsTabs .line-tab'), 'line-tab--active');
            // this.attachSwipe(document.getElementById('side-top'), () => document.querySelectorAll('#statistics-filter .line-tab'), 'line-tab--active');
        }
    }

    setTab = (tab) => {
        if(this.buttons.length === 0 || this.panels.length === 0) return;

        this.buttons.forEach((button) => {
            const active = button.dataset.sideTab === tab;
            button.classList.toggle('segment--active', active);
            button.setAttribute('aria-selected', String(active));
        });

        this.panels.forEach((panel) => {
            const active = panel.dataset.sidePanel === tab;
            panel.hidden = !active;
            panel.classList.toggle('tab-panel--active', active);
        });
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll();
        if (tab === 'players' && this.playersView) {
            this.playersView.refreshDesktopWindow();
        }
        if (tab === 'rounds') this.roundsView.drawAllIfDirty();
        if (tab === 'top') this.topView.drawIfDirty();
    };

    flushVisibleSidePanels = () => {
        if (isSidePanelVisible('side-rounds')) this.roundsView.drawAllIfDirty();
        if (isSidePanelVisible('side-top')) this.topView.drawIfDirty();
    };

    attachSwipe(area, getButtons, activeClass) {
        if (!area) return;

        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let tracking = false;
        const SWIPE_MIN_X = 45;
        const SWIPE_MAX_MS = 700;

        area.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) {
                tracking = false;
                return;
            }
            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            tracking = true;
        }, { passive: true });

        area.addEventListener('touchend', (event) => {
            if (!tracking) return;
            tracking = false;
            if (!mobileQuery.matches) return;
            if (Date.now() - startTime > SWIPE_MAX_MS) return;

            const touch = event.changedTouches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) <= Math.abs(dy)) return;

            const buttons = Array.from(getButtons()).filter(Boolean);
            if (buttons.length < 2) return;

            let index = buttons.findIndex((button) => button.classList.contains(activeClass));
            if (index < 0) index = 0;

            const nextIndex = dx < 0
                ? Math.min(index + 1, buttons.length - 1)
                : Math.max(index - 1, 0);

            if (nextIndex !== index) buttons[nextIndex].click();
        }, { passive: true });
    }

    spinColor = (coefficient) => {
        const maxCoeff = (typeof board !== 'undefined' && board.maxCashoutCoeff) || this.topView?.maxCashoutCoeff || 100000000;
        if (coefficient >= maxCoeff) return 'max';
        return coefficient < 2 ? 'low' : coefficient < 10 ? 'medium' : 'high';
    }

    timeParse = (time) => {
        time = time.split(':');
        time = `${time[0]}:${time[1]}`;
        return changeTime(time, 'time');
    }

    setActiveLineTab = (group, button, activeTabClass) => {
        if (!group || !button || button.classList.contains(activeTabClass)) return false;

        group.querySelectorAll('.line-tab').forEach((item) => {
            const active = item === button;
            item.classList.toggle(activeTabClass, active);
            item.setAttribute('aria-selected', String(active));
        });

        return true;
    }

    pulsePanel = (panel, activeClass, animationMs) => {
        if (!panel) return;

        panel.classList.add(activeClass);
        setTimeout(() => {
            panel.classList.remove(activeClass);
        }, animationMs);
    }

    formatDateTime = (value, fallbackToRaw = false) => {
        if (!value) {
            return { date: '', time: '' };
        }

        const dateTime = new Date(value);
        if (isNaN(dateTime.getTime())) {
            return { date: fallbackToRaw ? value : '', time: '' };
        }

        return {
            date: `${String(dateTime.getDate()).padStart(2, '0')}.${String(dateTime.getMonth() + 1).padStart(2, '0')}.${dateTime.getFullYear()}`,
            time: `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}:${String(dateTime.getSeconds()).padStart(2, '0')}`,
        };
    }
}

const gameStats = new GameStats();

// Debug: console → debugTop3Wins()
window.debugTop3Wins = (opts = {}) => {
    const pv = gameStats.playersView;
    const currency = (typeof player !== 'undefined' && player.currency) ? player.currency : { currencyCode: 'GEL', fractionDigit: 2 };

    if (pv.config.top3WinsToggle) {
        pv.config.top3WinsToggle.checked = true;
    }

    pv.stats.topWinners = {
        clear: false,
        list: {
            'counterId-1': { displayName: opts.p1 || 'Winner One', winAmount: opts.w1 ?? 25.5, currency, betAmount: 10, counterId: 1 },
            'counterId-2': { displayName: opts.p2 || 'Winner Two', winAmount: opts.w2 ?? 10.25, currency, betAmount: 5, counterId: 2 },
            'counterId-3': { displayName: opts.p3 || 'Winner Three', winAmount: opts.w3 ?? 75, currency, betAmount: 2, counterId: 3 },
        },
        cashout: opts.cashout ?? 18,
        wins: opts.wins ?? 445.75,
        myWin: opts.myWin ?? 42.5,
        players: {},
    };

    return pv.top3Wins(true);
};