mixpanel.init("839654be52a49c06f7d31a2f1a33bd32", {
  debug: false,
  persistence: "localStorage",
  api_host: "https://api-eu.mixpanel.com",
  record_mask_all_text: false,
  record_mask_all_inputs: false,
   flags: {
    context: {
      custom_properties: {
        portal_id: "betpawacm"
      }
    }
  }
});

// === A/B START ===
// JetXNew UI. Keep game_name as JetX; compare by ui_version in Mixpanel.
var MIXPANEL_UI_VERSION = "new";
try {
  if (typeof mixpanel !== "undefined" && typeof mixpanel.register === "function") {
    mixpanel.register({
      ui_version: MIXPANEL_UI_VERSION,
      experiment: "jetx_new_ui"
    });
  }
} catch (e) {}
// === A/B END ===

let mixpanelInfo = {
  startTime: Date.now(),
  firstBetTime: 0,
  loaderTime: 0,
  loaderTimeCashed: 0,
  sessionRounds: [],
  helpType: 'manual_click',
  helpRound: 0,
  openedHelp: 0,
  helpOpenTime: 0,
  helpTime: 0,
  helpPageName: 'how_to_play',
  clientId: '',
  isFirstVisit: (function () {
    try { return !(localStorage && localStorage.getItem("visited")); } catch (e) { return true; }
  })(),
  bets: [],
  currentRound: 0,
  lastBetRound: 0,
  lastBetTime: 0,
  sessionEndSend: false,
  sessionStartTime: Date.now(),
  mobileSound: 'On',
  bet_loader_time: [],
  bet_loader_start_time: [0, 0, 0, 0, 0, 0],
  collect_time: [0, 0, 0, 0, 0, 0],
  roundLoader: [],
  roundLoaderTime: 0,
  boomLoader: [],
  boomLoaderTime: 0,
  firstAutoplayTime: 0,
  firstAutocollectTime: 0,
  firstChatTime: 0,
  firstBetInputTime: 0,
  firstBetListTime: 0,
  firstBetStepperTime: 0,
  betCount: 0,
  current_panel_state: '',
  prev_panel_state: '',
  device_model: 'unknown',
  webp_supported: false,
  image_format: '',
};

function getMixpanelDeviceModelSync() {
  try {
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    var androidMatch = ua.match(/Android[^;]*;\s*([^;)]+?)\s+Build\//i);
    if (androidMatch && androidMatch[1]) {
      var androidModel = String(androidMatch[1]).replace(/^wv$/i, '').trim();
      if (androidModel && !/^(Linux|Android|K|Mobile|wv)$/i.test(androidModel)) {
        return androidModel;
      }
    }
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      return 'iPad';
    }
  } catch (e) {}
  return 'unknown';
}

try {
  mixpanelInfo.device_model = getMixpanelDeviceModelSync();
} catch (e) {}

try {
  if (typeof navigator !== 'undefined' && navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    navigator.userAgentData.getHighEntropyValues(['model'])
      .then(function (hints) {
        try {
          if (hints && hints.model) mixpanelInfo.device_model = String(hints.model);
        } catch (e) {}
      })
      .catch(function () {});
  }
} catch (e) {}

function mixpanelIsChecked(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function mixpanelOnOff(checked) {
  return checked ? 'On' : 'Off';
}

function mixpanelMenuSettings() {
  let prefs = null;
  try {
    if (typeof localStorageAllow !== 'undefined' && localStorageAllow) {
      prefs = JSON.parse(localStorage.getItem('menuPreferences') || '{}');
    }
  } catch (e) {
    prefs = null;
  }

  function setting(id, fallbackOn) {
    const el = document.getElementById(id);
    if (el) return mixpanelOnOff(el.checked);
    if (prefs && typeof prefs[id] === 'boolean') return mixpanelOnOff(prefs[id]);
    return mixpanelOnOff(fallbackOn);
  }

  let fullscreen = 'Off';
  const fullscreenEl = document.getElementById('menu-fullscreen');
  if (fullscreenEl) {
    fullscreen = mixpanelOnOff(fullscreenEl.checked);
  } else {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        fullscreen = 'On';
      }
    } catch (e) {}
  }

  return {
    menu_sound: setting('menu-sounds', true),
    menu_music: setting('menu-music', true),
    menu_animation: setting('menu-animation', true),
    menu_top3: setting('top3-winner-toggle', true),
    menu_fullscreen: fullscreen,
  };
}

function mixpanelInputData(position, key) {
  const el = document.getElementById(`bet-value-${position}`);
  return typeof jqData === 'function' ? jqData(el, key) : undefined;
}

function mixpanelCashOutData(position, key) {
  const el = document.getElementById(`cash-out-value-${position}`);
  return typeof jqData === 'function' ? jqData(el, key) : undefined;
}

function mixpanelMobileSound(type) {
  mixpanelInfo.mobileSound = type ? 'On' : 'Off';
}

// function mobileSound(type) {
//   const music = document.getElementById('menu-music');
//   const sounds = document.getElementById('menu-sounds');
//   if (music) {
//     music.checked = !!type;
//     music.dispatchEvent(new Event('change', { bubbles: true }));
//   }
//   if (sounds) {
//     sounds.checked = !!type;
//     sounds.dispatchEvent(new Event('change', { bubbles: true }));
//   }
//   mixpanelMobileSound(type);
// }

function mixpanelHelpStatus(status) {
  mixpanelInfo.helpType = status;
}

function mixpanelHelpOpened(pageName) {
  mixpanelInfo.openedHelp++;
  mixpanelInfo.helpOpenTime = Date.now();
  mixpanelInfo.helpRound = mixpanelInfo.currentRound;
  if (pageName) {
    mixpanelInfo.helpPageName = pageName === 'rules' ? 'Rules' : 'how_to_play';
  }
}

function mixpanelHelpClosed() {
  if(mixpanelInfo.helpOpenTime === 0) return ;

  let data = {
    game_name: 'JetX',
    page_name: mixpanelInfo.helpPageName,
    trigger_type: mixpanelInfo.helpType,
    total_bets_this_session: mixpanelInfo.currentRound - mixpanelInfo.helpRound,
    time_spent: (Date.now() - mixpanelInfo.helpOpenTime) / 1000,
    portal: portalName,
  }
  mixpanelTrack('Help/Rules Opened', data);

  mixpanelInfo.helpType = 'manual_click';
  mixpanelInfo.helpTime += Date.now() - mixpanelInfo.helpOpenTime;
  mixpanelInfo.helpOpenTime = 0;
}

function mixpanelBoom() {
  mixpanelInfo.boomLoaderTime = Date.now();
  for(let i = 0; i < player.bets.length; i++) {
    let bet = player.bets[i];
    if(bet.CashoutStep > 0) {
      for(let j = 0; j < mixpanelInfo.bets.length; j++) {
        let mixpanelBet = mixpanelInfo.bets[j];
        if(mixpanelBet.bet_button - 1 === i) {
          mixpanelInfo.bets[j].crash = bet.CashoutStep;
        }
      }
    }
  }
}

function mixpanelNewRoundFly() {
  if(mixpanelInfo.roundLoaderTime === 0) return;
  let time = (Date.now() - mixpanelInfo.roundLoaderTime) / 1000;
  mixpanelInfo.roundLoader.push(time);
  mixpanelInfo.roundLoaderTime = 0;
}

function mixpanelNewRound() {
  mixpanelInfo.roundLoaderTime = Date.now();

  if(mixpanelInfo.boomLoaderTime !== 0) {
    let time = (Date.now() - mixpanelInfo.boomLoaderTime) / 1000;
    mixpanelInfo.boomLoader.push(time);
    mixpanelInfo.boomLoaderTime = 0;
  }

  let bets = false;
  if(mixpanelInfo.bets.length > 0) {
    mixpanelInfo.sessionRounds.push({
      bets: mixpanelInfo.bets
    });
    bets = true;
  }
  mixpanelInfo.bets = [];
  mixpanelInfo.currentRound++;

  if(bets) {
    for (let i = 0; i < player.bets.length; i++) {
      let betInput = document.getElementById(`bet-value-${i}`);
      let cashOutInput = document.getElementById(`cash-out-value-${i}`);
      if (!betInput || !cashOutInput || typeof jqData !== 'function') continue;

      let input = jqData(betInput, 'bet_input');
      let stepper = false;
      let list = false;
      if (!input) {
        stepper = jqData(betInput, 'bet_stepper');
      }
      if (!stepper) {
        list = jqData(betInput, 'bet_list');
      }
      jqData(betInput, 'bet_input', input);
      jqData(betInput, 'bet_stepper', stepper);
      jqData(betInput, 'bet_list', list);

      input = jqData(cashOutInput, 'autocollect_input');
      stepper = false;
      if (!input) {
        stepper = jqData(cashOutInput, 'autocollect_stepper');
      }
      jqData(cashOutInput, 'autocollect_input', input);
      jqData(cashOutInput, 'autocollect_stepper', stepper);
    }
  }
}

function mixpanelBetMode() {
  if (typeof getCurrentBetMode === 'function') {
    return getCurrentBetMode() || 'classic';
  }
  const appEl = document.querySelector('.app');
  if (!appEl) return 'classic';
  if (appEl.classList.contains('mode-1')) return 'single';
  if (appEl.classList.contains('mode-4')) return 'four';
  if (appEl.classList.contains('mode-classic')) return 'classic';
  return 'double';
}

function mixpanelPanelState(mode) {
  if (!mode) return;
  if (mixpanelInfo.current_panel_state === mode) return;
  const prev = mixpanelInfo.current_panel_state;
  mixpanelInfo.prev_panel_state = prev || mode;
  mixpanelInfo.current_panel_state = mode;
  if (!prev) return;

  mixpanelTrack('Bet Panel Switched', {
    game_name: 'JetX',
    current_panel_state: mixpanelInfo.current_panel_state,
    prev_panel_state: mixpanelInfo.prev_panel_state,
    portal: portalName,
  });
}

function mixpanelPanelStateProps() {
  const current = mixpanelInfo.current_panel_state || mixpanelBetMode();
  if (!mixpanelInfo.current_panel_state) {
    mixpanelInfo.current_panel_state = current;
    mixpanelInfo.prev_panel_state = current;
  }
  return {
    current_panel_state: mixpanelInfo.current_panel_state,
    prev_panel_state: mixpanelInfo.prev_panel_state || mixpanelInfo.current_panel_state,
  };
}

function mixpanelBetStart(position) {
  try {
    mixpanelInfo.bet_loader_start_time[position] = Date.now();
    if(mixpanelInfo.firstBetTime === 0) mixpanelInfo.firstBetTime = Date.now();
  } catch (e) {}
}

function mixpanelBet(position, prevBet, placedAmount) {
  try {
    let time = 0;
    if(mixpanelInfo.bet_loader_start_time[position] !== 0) {
      time = (Date.now() - mixpanelInfo.bet_loader_start_time[position]) / 1000;
      mixpanelInfo.bet_loader_start_time[position] = 0;
      mixpanelInfo.bet_loader_time.push(time);
    }

    let bet = player.bets[position] || {};
    let amount = bet.BetAmount > 0 ? bet.BetAmount : (placedAmount || bet.NextBetAmount || 0);
    if(amount > 0) {
      mixpanelInfo.betCount++;
      mixpanelInfo.bets.push({
        bet_amount: amount,
        bet_amount_EUR: amount / board.exchangeRate,
        crash: 0,
        autoplay: mixpanelIsChecked(`auto-bet-${position}`),
        bet_during_previous_round: prevBet,
        bet_during_betting_period: !prevBet,
        auto_collect: mixpanelIsChecked(`auto-cash-out-${position}`),
        bet_button: position + 1,
        ...mixpanelPanelStateProps(),
        timestamp: new Date().toISOString(),
        round: mixpanelInfo.currentRound,

        bet_default: mixpanelInputData(position, 'bet_default') ? 'Yes' : 'No',
        bet_input: mixpanelInputData(position, 'bet_input') ? 'Yes' : 'No',
        bet_stepper: mixpanelInputData(position, 'bet_stepper') ? 'Yes' : 'No',
        bet_list: mixpanelInputData(position, 'bet_list') ? 'Yes' : 'No',
        bet_x2: mixpanelInputData(position, 'bet_x2') || 0,
        autocollect_default: mixpanelCashOutData(position, 'autocollect_default') ? 'Yes' : 'No',
        autocollect_input: mixpanelCashOutData(position, 'autocollect_input') ? 'Yes' : 'No',
        autocollect_stepper: mixpanelCashOutData(position, 'autocollect_stepper') ? 'Yes' : 'No',
      });

      let data = {
        game_name: 'JetX',
        bet_amount: amount,
        bet_amount_EUR: amount / board.exchangeRate,
        currency: player.currency.currencyCode,
        bet_button: position + 1,
        ...mixpanelPanelStateProps(),
        ...mixpanelMenuSettings(),
        autoplay: mixpanelIsChecked(`auto-bet-${position}`),
        auto_collect: mixpanelIsChecked(`auto-cash-out-${position}`),
        bet_default: mixpanelInputData(position, 'bet_default') ? 'Yes' : 'No',
        bet_input: mixpanelInputData(position, 'bet_input') ? 'Yes' : 'No',
        bet_stepper: mixpanelInputData(position, 'bet_stepper') ? 'Yes' : 'No',
        bet_list: mixpanelInputData(position, 'bet_list') ? 'Yes' : 'No',
        bet_x2: mixpanelInputData(position, 'bet_x2') || 0,
        round: mixpanelInfo.currentRound,
        round_id: board.currentSpinHash,
        rounds_skipped: mixpanelInfo.currentRound - mixpanelInfo.lastBetRound - 1,
        ms_since_last_bet: (Date.now() - mixpanelInfo.lastBetTime) / 1000,
        balance: player.availableAmount,
        balance_EUR: player.availableAmount / board.exchangeRate,
        latency_s: time,
        count: mixpanelInfo.betCount,
        portal: portalName,
      }

      mixpanelInfo.lastBetRound = mixpanelInfo.currentRound;
      mixpanelInfo.lastBetTime = Date.now();
      
      mixpanelTrack('Bet Placed', data);
    }
  } catch (e) {}
}

function mixpanelPlaceAllBets(positions) {
  if (!positions || positions.length === 0) return;

  let bet_amount = 0;
  let autoplay = false;
  let auto_collect = false;
  let bet_default = 'No';
  let bet_input = 'No';
  let bet_stepper = 'No';
  let bet_list = 'No';
  let bet_x2 = 0;
  let bet_buttons = [];

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    const betValue = document.getElementById(`bet-value-${position}`);
    const amount = typeof parseInputAmount === 'function'
      ? parseInputAmount(betValue ? betValue.value : undefined)
      : parseFloat(betValue && betValue.value);
    bet_amount += amount > 0 ? amount : 0;
    bet_buttons.push(position + 1);
    if (mixpanelIsChecked(`auto-bet-${position}`)) autoplay = true;
    if (mixpanelIsChecked(`auto-cash-out-${position}`)) auto_collect = true;
    if (mixpanelInputData(position, 'bet_default')) bet_default = 'Yes';
    if (mixpanelInputData(position, 'bet_input')) bet_input = 'Yes';
    if (mixpanelInputData(position, 'bet_stepper')) bet_stepper = 'Yes';
    if (mixpanelInputData(position, 'bet_list')) bet_list = 'Yes';
    bet_x2 += mixpanelInputData(position, 'bet_x2') || 0;
  }

  let data = {
    game_name: 'JetX',
    bet_amount: bet_amount,
    bet_amount_EUR: bet_amount / board.exchangeRate,
    currency: player.currency.currencyCode,
    bet_button: bet_buttons,
    autoplay: autoplay,
    auto_collect: auto_collect,
    bet_default: bet_default,
    bet_input: bet_input,
    bet_stepper: bet_stepper,
    bet_list: bet_list,
    bet_x2: bet_x2,
    round: mixpanelInfo.currentRound,
    round_id: board.currentSpinHash,
    rounds_skipped: mixpanelInfo.currentRound - mixpanelInfo.lastBetRound - 1,
    ms_since_last_bet: (Date.now() - mixpanelInfo.lastBetTime) / 1000,
    balance: player.availableAmount,
    balance_EUR: player.availableAmount / board.exchangeRate,
    count: positions.length,
    ...mixpanelPanelStateProps(),
    portal: portalName,
  };

  mixpanelTrack('Place all bets', data);
}

function mixpanelCollectStart(position) {
  mixpanelInfo.collect_time[position] = Date.now();
}

function mixpanelCollect(position) {
  let time = 0;
  if(mixpanelInfo.collect_time[position] !== 0) {
    time = (Date.now() - mixpanelInfo.collect_time[position]) / 1000;
    mixpanelInfo.collect_time[position] = 0;
  }

  let bet = player.bets[position];
  if(bet.BetAmount > 0) {
    let data = {
      game_name: 'JetX',
      bet_button: position + 1,
      multiplier_achieved: player.bets[position].CashoutStep,
      win_amount: player.bets[position].WonAmount,
      win_amount_EUR: player.bets[position].WonAmount / board.exchangeRate,
      auto_collect: mixpanelIsChecked(`auto-cash-out-${position}`),
      round_id: board.currentSpinHash,
      latency_s: time,
      portal: portalName,
    }
    mixpanelTrack('Collect', data);
  }
}

function mixpanelCollectAll(positions) {
  if (!positions || positions.length === 0) return;

  let win_amount = 0;
  let auto_collect = false;
  let bet_buttons = [];
  let multiplier_achieved = 0;
  let time = 0;

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    const bet = player.bets[position];
    if (!bet) continue;
    win_amount += bet.WonAmount || 0;
    bet_buttons.push(position + 1);
    if (mixpanelIsChecked(`auto-cash-out-${position}`)) auto_collect = true;
    if ((bet.CashoutStep || 0) > multiplier_achieved) multiplier_achieved = bet.CashoutStep;
    if (mixpanelInfo.collect_time[position] !== 0) {
      time = (Date.now() - mixpanelInfo.collect_time[position]) / 1000;
    }
  }

  if (bet_buttons.length === 0) return;

  let data = {
    game_name: 'JetX',
    bet_button: bet_buttons,
    multiplier_achieved: multiplier_achieved,
    win_amount: win_amount,
    win_amount_EUR: win_amount / board.exchangeRate,
    auto_collect: auto_collect,
    round_id: board.currentSpinHash,
    latency_s: time,
    count: bet_buttons.length,
    portal: portalName,
  };
  mixpanelTrack('Collect all', data);
}

function mixpanelFirstUsage(type) {
  if (mixpanelInfo[type] === 0) {
    mixpanelInfo[type] = Date.now();
  }
}

function mixpanelCheckbox(position, id) {
  const isAutoBet = id.indexOf('auto-bet') >= 0;
  const isShared = position === 'all';
  const enabled = isShared
    ? [0, 1, 2, 3].some((i) => mixpanelIsChecked(isAutoBet ? `auto-bet-${i}` : `auto-cash-out-${i}`))
    : mixpanelIsChecked(isAutoBet ? `auto-bet-${position}` : `auto-cash-out-${position}`);

  let list = [];
  if (isShared) {
    list.push(0);
  } else {
    list.push(parseInt(position));
  }

  for (let i = 0; i < list.length; i++) {
    let data = {
      game_name: 'JetX',
      ...mixpanelPanelStateProps(),
      autoplay: enabled ? 'Enabled' : 'Disabled',
      balance: player.availableAmount,
      balance_EUR: player.availableAmount / board.exchangeRate,
      portal: portalName,
    };
    if (!isShared) data.bet_button = list[i] + 1;
    mixpanelTrack(isAutoBet ? 'Autoplay Toggled' : 'Autocollect Set', data);
  }
}

function mixpanelBettingOption(position, name) {
  let data = {
    game_name: 'JetX',
    location: position + 1,
    button_name: name,
    round_id: board.currentSpinHash,
    portal: portalName,
  }
  mixpanelTrack('Betting_option_click', data);
}

function mixpanelError(position, message) {
  let data = {
    game_name: 'JetX',
    location: position + 1,
    message: message,
    round_id: board.currentSpinHash,
    portal: portalName,
  }
  mixpanelTrack('Error', data);
}

function mixpanelVersionRedirect(source, toVersion) {
  mixpanelTrack('Version Redirect Click', {
    game_name: 'JetX',
    portal: portalName,
    source: source,
    to_version: toVersion,
  });
}

function mixpanelSessionEnd() {
  if(mixpanelInfo.sessionEndSend) return;
  mixpanelInfo.sessionEndSend = true;
  let autoplay = 0;
  let bet_x2 = 0;
  let bet_during_previous_round = 0;
  let bet_during_betting_period = 0;
  let bet_button_1 = 0;
  let bet_button_2 = 0;
  let bet_button_3 = 0;
  let bet_button_4 = 0;
  let bet_default = 'No';
  let bet_input = 'No';
  let bet_stepper = 'No';
  let bet_list = 'No';
  let autocollect_default = 'No';
  let autocollect_input = 'No';
  let autocollect_stepper = 'No';

  if(mixpanelInfo.bets.length > 0) {
    mixpanelInfo.sessionRounds.push({
      bets: mixpanelInfo.bets
    });
  }
  mixpanelInfo.bets = [];
  mixpanelInfo.currentRound++;

  for(let sessionRounds of mixpanelInfo.sessionRounds) {
    for (let mixpanelBet of sessionRounds.bets) {
      if (mixpanelBet.autoplay) autoplay++;
      if (mixpanelBet.bet_x2) bet_x2++;
      if (mixpanelBet.bet_during_previous_round) bet_during_previous_round++;
      if (mixpanelBet.bet_during_betting_period) bet_during_betting_period++;
      if (mixpanelBet.bet_button === 1) bet_button_1++;
      if (mixpanelBet.bet_button === 2) bet_button_2++;
      if (mixpanelBet.bet_button === 3) bet_button_3++;
      if (mixpanelBet.bet_button === 4) bet_button_4++;
      if (mixpanelBet.bet_default === 'Yes') bet_default = 'Yes';
      if (mixpanelBet.bet_input === 'Yes') bet_input = 'Yes';
      if (mixpanelBet.bet_stepper === 'Yes') bet_stepper = 'Yes';
      if (mixpanelBet.bet_list === 'Yes') bet_list = 'Yes';
      if (mixpanelBet.autocollect_default === 'Yes') autocollect_default = 'Yes';
      if (mixpanelBet.autocollect_input === 'Yes') autocollect_input = 'Yes';
      if (mixpanelBet.autocollect_stepper === 'Yes') autocollect_stepper = 'Yes';
    }
  }

  let firstBetTime = (mixpanelInfo.firstBetTime === 0) ? 0 : (mixpanelInfo.firstBetTime - mixpanelInfo.startTime) / 1000;
  let timeToFirstUsage = function (firstTime) {
    return firstTime === 0 ? 0 : (firstTime - mixpanelInfo.startTime) / 1000;
  };

  let data = {
    game_name: 'JetX',
    portal: portalName,
    language: localeCode,
    currency: player.currency.currencyCode,
    duration_seconds: Math.floor((Date.now() - mixpanelInfo.sessionStartTime) / 1000),
    end_balance: player.availableAmount,
    end_balance_EUR: player.availableAmount / board.exchangeRate,
    loader_time: mixpanelInfo.loaderTime,
    loader_time_cashed: mixpanelInfo.loaderTimeCashed,
    bet_loader_time: calculateAverage(mixpanelInfo.bet_loader_time),
    roundLoader: calculateAverage(mixpanelInfo.roundLoader),
    boomLoader: calculateAverage(mixpanelInfo.boomLoader),
    openedHelp: mixpanelInfo.openedHelp,
    helpTime: parseInt(mixpanelInfo.helpTime / 1000),
    mobileSound: mixpanelInfo.mobileSound,
    autoplay: autoplay,
    bet_x2: bet_x2,
    bet_during_previous_round: bet_during_previous_round,
    bet_during_betting_period: bet_during_betting_period,
    bet_button_1: bet_button_1,
    bet_button_2: bet_button_2,
    bet_button_3: bet_button_3,
    bet_button_4: bet_button_4,
    bet_default: bet_default,
    bet_input: bet_input,
    bet_stepper: bet_stepper,
    bet_list: bet_list,
    autocollect_default: autocollect_default,
    autocollect_input: autocollect_input,
    autocollect_stepper: autocollect_stepper,
    timestamp: new Date().toISOString(),
    time_to_first_bet: firstBetTime,
    time_to_first_autoplay: timeToFirstUsage(mixpanelInfo.firstAutoplayTime),
    time_to_first_autocollect: timeToFirstUsage(mixpanelInfo.firstAutocollectTime),
    time_to_first_chat: timeToFirstUsage(mixpanelInfo.firstChatTime),
    time_to_first_bet_input: timeToFirstUsage(mixpanelInfo.firstBetInputTime),
    time_to_first_bet_list: timeToFirstUsage(mixpanelInfo.firstBetListTime),
    time_to_first_bet_stepper: timeToFirstUsage(mixpanelInfo.firstBetStepperTime),

    jurisdiction: jurisdictionName,
    portal: portalName,
    webp_supported: !!mixpanelInfo.webp_supported,
    image_format: mixpanelInfo.image_format || 'unknown',
  }
  mixpanelTrack("Session End", data);
}

function mixpanelTrack(event, data) {
  try {
    // === A/B START ===
    var payload = Object.assign({}, data || {}, {
      ui_version: MIXPANEL_UI_VERSION,
      experiment: "jetx_new_ui"
    });
    // === A/B END ===
    try {
      if (event === 'Bet Placed' || event === 'Game Loaded' || event === 'Session End') {
        payload.device_model = (mixpanelInfo && mixpanelInfo.device_model) ? mixpanelInfo.device_model : 'unknown';
      }
    } catch (e) {}
    mixpanel.track(event, payload);
  } catch (e) {
    try { mixpanel.track(event, data); } catch (e2) {}
  }
}

function calculateAverage(array) {
  if(array.length === 0) return 0;
  return array.reduce((a, b) => a + b, 0) / array.length;
}

function getMixpanelReplaySampleRate() {
  var fallback = 0.0001;
  try {
    var prefs = (typeof visualPreferences !== 'undefined' && visualPreferences) ? visualPreferences : null;
    if (!prefs) {
      var el = document.getElementById('VisualPreferences');
      if (el && el.value) prefs = JSON.parse(el.value);
    }
    if (!prefs) return fallback;
    var raw = prefs['MIXPANEL-SESSION-REPLAY-SAMPLE-RATE'];
    if (raw == null || raw === '') return fallback;
    var rate = parseFloat(raw);
    if (isNaN(rate) || rate < 0) return fallback;
    return Math.min(rate, 1);
  } catch (e) {
    return fallback;
  }
}

function identifyUser(user) {
  try {
    if (!user) return;
    if (typeof mixpanel === "undefined" || !mixpanel.identify) return;
    const existingId =
        (typeof mixpanel.get_distinctId === "function" && mixpanel.get_distinctId()) ||
        (typeof mixpanel.get_distinct_id === "function" && mixpanel.get_distinct_id()) ||
        null;
    if (existingId && String(existingId) !== String(user)) {
      mixpanel.alias(String(user));
    }
    mixpanel.identify(String(user));
    mixpanel.people.set({
      userId: String(user),
      portal: portalName,
      // === A/B START ===
      ui_version: MIXPANEL_UI_VERSION,
      experiment: "jetx_new_ui"
      // === A/B END ===
    });
  } catch (e) {
    console.alert("identifyUser Error:", e);
  }
}

window.addEventListener("message", function(event) {
  if (event.data?.name === "calculate-loader-time") {
    if(mixpanelInfo.isFirstVisit) mixpanelInfo.loaderTime = event.data.loaderTime;
    else mixpanelInfo.loaderTimeCashed = event.data.loaderTime;
  }
  if (event.data?.name === "clientId") {
    mixpanelInfo.clientId = event.data.data;
  }
});

window.addEventListener("load", function () {
  const checkPlayer = setInterval(() => {
    if (boardLoaded) {
      if (mixpanelInfo.isFirstVisit) {
        try { localStorage.setItem("visited", "true"); } catch (e) {}
      }
      identifyUser(mixpanelInfo.clientId)
      
      var REPLAY_SAMPLE_RATE = getMixpanelReplaySampleRate();
      console.log('REPLAY_SAMPLE_RATE', REPLAY_SAMPLE_RATE);
      if (Math.random() < REPLAY_SAMPLE_RATE) {
        try { mixpanel.start_session_recording(); } catch (e) { }
      }
      clearInterval(checkPlayer);
      let data = {
        game_name: 'JetX',
        portal: portalName,
        language: localeCode,
        timestamp: new Date().toISOString(),
        balance: player.availableAmount,
        balance_EUR: player.availableAmount / board.exchangeRate,
        jurisdiction: jurisdictionName,
        active_multiplier: graphicValue,
        entry_state: graphicValue > 1 ? 'ongoing_round' : 'betting_phase',
        portal: portalName,
      };
      mixpanelTrack("Game Loaded", data);
    }
    // mixpanel.flags.get_variant("time_to_first_bet_reduction")
    //   .then(function(result) {
    //     const variantValue = (result && typeof result === 'object') ? result.value : result;
    //     if (variantValue === "treatment" && mobile) mobileSound(true);
    //   })
    //   .catch(function() {
    //     console.log('catch time_to_first_bet_reduction');
    // });
  }, 500);
});

window.addEventListener('beforeunload', function (event) {
  mixpanelSessionEnd();
});

if(bowser.mobile) {
  window.addEventListener('visibilitychange', function (event) {
    if (document.visibilityState === 'hidden') {
      mixpanelSessionEnd();
    }
  });

  window.addEventListener('pagehide', function (event) {
    if (document.visibilityState === 'hidden') {
      mixpanelSessionEnd();
    }
  });
}
