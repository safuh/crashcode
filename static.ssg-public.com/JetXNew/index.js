let game = {
    name: '',
    canvas: {
        div: document.querySelector('.app'),
        top: 0,
        width: {
            value: 2170,
            max: 2470, //2370
            direction: 'center',
            x: -150,
        },
        height: {
            value: 1154,
            max: 1154,
            direction: 'start',
        },
        mobile: {
            width: {
                value: 1010,
                max: 1270,
                direction: 'center',
                x: -130,
            },
            height: {
                value: 540,
                max: 540,
                direction: 'start',
            },
        },
        vertical: {
            allow: true,
            width: {
                value: 756,
                max: 756 + 80,
                direction: 'center',
            },
            height: {
                value: 1344,
                max: 1750,
                direction: 'start',
            },
            left: 225,
        }
    },

    mobile: mobile,

    url: {
        static: document.getElementById('StaticContentUrl')?.value ?? '',
        image: '',
        sprite: '',
        spine: '',
        sound: '',
    },

    containers: {
        layer: { zIndex: 1, parent: null, default: true },
        timeout: { zIndex: 0, parent: null },
        //footer: {zIndex: 10, parent: 'layer'},
    },

    imagesSprite: {},
    images: {},
    sprites: {},
    spines: {},
    sounds: {},
    texts: {},
};

game.name = `JetX`;
game.mobile = mobile;

game.url.image = `../../Content/ImagesNew/`;
game.url.sprite = `../../Content/ImagesNew/Sprites/`;
game.url.spine = `../../Content/ImagesNew/Spines/`;
game.url.sound = `../../Content/SoundNew/`;

let startSprite = false;
game.imagesSprite = {
    //'SpriteImage-Images-0': {spriteName: 'image', url: 'Sprites/Images-0.json'},
};

game.images = {
    ...game.images,
    Default: { url: 'Canvas/Default.png', texture: null, sprite: 'startSprite', webp: true },
    NoAnimationBackground: { url: 'Default.png', texture: null, webp: false },
};

game.spines = {
    ...game.spines,
    'Spine-Flyers': {scale: 1, zIndex: 1, x: 0, y: 0, imageCount: 1, url: 'Flyers/jetx_Parachute_08_Export.json', spineAnimations: [], atlas: '', webp: true},
    'Spine-Jet': {scale: 1, zIndex: 1, x: 0, y: 0, imageCount: 1, url: 'Jet/JetX_Master_v37.json', spineAnimations: [], atlas: '', webp: true},
    'Spine-JetBackground': {scale: 1, zIndex: 1, x: 0, y: 0, imageCount: 1, url: 'Jet/JetX_Enviroment.json', spineAnimations: [], atlas: 'Spine-JetAtlas', webp: true},
    'Spine-JetBackgroundFront': {scale: 1, zIndex: 1, x: 0, y: 0, imageCount: 1, url: 'Jet/JetX_Enviroment_Front.json', spineAnimations: [], atlas: 'Spine-JetAtlas', webp: true},
    'Spine-LoaderX': {scale: 1, zIndex: 1, x: 0, y: 0, imageCount: 1, url: 'Loader/x/getting bets.json', spineAnimations: [], atlas: '', webp: true},
    'Spine-LoaderRun': {scale: 1, zIndex: 1, x: 0, y: 0, imageCount: 1, url: 'Loader/run/sirbili.json', spineAnimations: [], atlas: '', webp: true},
};

game.sprites = {
    ...game.sprites,
};

game.texts = {
    ...game.texts,

    // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
    // Multiplier: {
    //     text: '', style: {
    //         fontFamily: 'Roboto',
    //         fontSize: 100,
    //         fill: 'rgba(255, 255, 255, 0.80)',
    //         align: 'center',
    //     }
    // },
    // FlewAway: {
    //     text: GetCaption('jetxnew.flew.away'), style: {
    //         fontFamily: 'Inter',
    //         fontSize: 40,
    //         fontWeight: '700',
    //         fill: '#ffffff',
    //         align: 'center',
    //     }
    // },
    // Loader: {
    //     text: '', style: {
    //         fontFamily: 'Inter',
    //         fontSize: 24,
    //         fontWeight: '700',
    //         fill: '#ffffff',
    //         align: 'center',
    //     }
    // },
    // LoaderText: {
    //     text: GetCaption('jetxnew.place.your.bets'), style: {
    //         fontFamily: 'Inter',
    //         fontSize: 32,
    //         fontWeight: '700',
    //         fill: '#ffffff',
    //         align: 'center',
    //     }
    // },

    CashoutWin: {
        text: '', style: {
            fontFamily: 'Inter',
            fontSize: 10,
            fontWeight: '700',
            fill: '#35A043',
            align: 'center',
        }
    },

};

game.sounds = {
    ...game.sounds,
    boom: { url: 'boom.mp3', sound: null, volume: 0.25, preload: false, loaded: false },
    button: { url: 'button.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    betUpdate: { url: 'betUpdate.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    collect: { url: 'collect.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    checkboxOff: { url: 'checkboxOff.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    checkboxOn: { url: 'checkboxOn.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    countdown: { url: 'countdown.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    loop1: { url: 'loop1.mp3', sound: null, volume: 1, preload: false, loaded: false },
    loop2: { url: 'loop2.mp3', sound: null, volume: 1, preload: false, loaded: false },
    loop3: { url: 'loop3.mp3', sound: null, volume: 1, preload: false, loaded: false },
    loop4: { url: 'loop4.mp3', sound: null, volume: 1, preload: false, loaded: false },
    multiplier2X: { url: 'multiplier2X.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    multiplier5X: { url: 'multiplier5X.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    multiplier10X: { url: 'multiplier10X.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    multiplier50X: { url: 'multiplier50X.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    multiplier100X: { url: 'multiplier100X.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    placeBet: { url: 'placeBet.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    planeTakeoff: { url: 'planeTakeoff.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    UIerror: { url: 'UIerror.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    UItoast: { url: 'UItoast.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    win: { url: 'win.mp3', sound: null, volume: 0.5, preload: false, loaded: false },
    
    sx_flight_flyby_atmosphere: { url: 'Canvas/sx_flight_flyby_atmosphere.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    sx_flight_flyby_cloud: { url: 'Canvas/sx_flight_flyby_cloud.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    sx_flight_flyby_meteorite: { url: 'Canvas/sx_flight_flyby_meteorite.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    sx_flight_flyby_planet: { url: 'Canvas/sx_flight_flyby_Planet.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    sx_flight_flyby_satellite: { url: 'Canvas/sx_flight_flyby_satellite.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
    sx_flight_wheel_retracting: { url: 'Canvas/sx_flight_wheel_retracting.mp3', sound: null, volume: 0.15, preload: false, loaded: false },
};

const BACKGROUND_SOUND_VOLUME = {
    default: 0.25,
    loop1: 0.25,
    loop2: 0.3,
    loop3: 0.35,
    loop4: 0.4,
};

const flybyEventSounds = {
    sx_Flight_flyby_atmosphere: { sound: 'sx_flight_flyby_atmosphere', index: 17 },
    sx_Flight_flyby_cloud_1: { sound: 'sx_flight_flyby_cloud', index: 18 },
    sx_Flight_flyby_cloud_2: { sound: 'sx_flight_flyby_cloud', index: 18 },
    sx_Flight_flyby_meteorite_1: { sound: 'sx_flight_flyby_meteorite', index: 19 },
    sx_Flight_flyby_meteorite_2: { sound: 'sx_flight_flyby_meteorite', index: 19 },
    sx_Flight_flyby_meteorite_3: { sound: 'sx_flight_flyby_meteorite', index: 19 },
    sx_Flight_flyby_meteorite_4: { sound: 'sx_flight_flyby_meteorite', index: 19 },
    sx_Flight_flyby_planet: { sound: 'sx_flight_flyby_planet', index: 20 },
    sx_Flight_flyby_satellite: { sound: 'sx_flight_flyby_satellite', index: 21 },
    sx_Flight_flyby_wheel_retracting: { sound: 'sx_flight_wheel_retracting', index: 22 },
};
const flybySoundIndexes = [...new Set(Object.values(flybyEventSounds).map((s) => s.index))];

class GameClass {
    config = null;
    canvas = null;
    loaded = false;
    assetsReadyMarked = false;
    pendingVisual = null;
    flightTicking = false;
    scrollResizeFrame = null;
    stageResizeFrame = null;
    stageResizeObserver = null;
    deferredCanvasResize = false;
    betScrollApp = null;
    tabActive = true;

    constructor() {
        this.canvas = new CanvasClass(game, this.loaderProgress, this.loaderCompleted, this.ticker);
        document.body.classList.add('is-assets-pending');
    }

    loaderProgress = {
        count: 0,
        loaded: 0,
        width: 0,
        progressBar: () => {
            this.loader.loaded++;
            let width = parseInt((this.loader.loaded / this.loader.count) * 100);
            let prevWidth = this.loader.width;
            this.loader.width = Math.max(width, prevWidth);
            if (this.loader.width > prevWidth) {
                // if(document.getElementsByClassName('loader-background')[0])
                //     document.getElementsByClassName('loader-background')[0].style.width = `${this.loader.width}%`;
                //
                // if(document.getElementsByClassName('loader-icon')[0])
                //     document.getElementsByClassName('loader-icon')[0].style.transform = `scale(${0.1 + (this.loader.width / 100) * 0.9})`;
                //
                // document.getElementsByClassName('loader-text')[0].innerHTML = `${this.loader.width}%`;
            }
        }
    }

    loaderCompleted = () => {
        this.init();
    }

    // Keep X Pattern until the first canvas visual paints (avoids blank gap).
    // Board skeleton stays until is-board-ready (real balance / betting).
    markAssetsReady = () => {
        if (!this.loaded || this.assetsReadyMarked) return;
        this.assetsReadyMarked = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.add('is-assets-ready');
            });
        });
    }

    init = () => {
        this.backgroundSound();
        this.gameInit();

        const resizeObserver = new ResizeObserver(() => this.requestCanvasResize());
        resizeObserver.observe(this.canvas.info.canvas.div);

        this.bindScrollResize();
        this.bindStageResize();
        this.applyPendingVisual();
    }

    syncBettingGateFromBoard = () => {
        if (board.progressPercent > 0) {
            this.game.started = false;
            this.game.boom = false;
            this.flightTicking = false;
            if (!this.loaded) {
                this.pendingVisual = { kind: 'bets' };
                this.startLoader();
            }
        } else if (!board.isFinnished) {
            if (!this.flightTicking) return;
            if (!this.loaded) {
                this.pendingVisual = {
                    kind: 'fly',
                    value: graphicValue,
                    step: typeof graphicStep !== 'undefined' ? graphicStep : 0,
                };
                this.hideLoader(false);
                this.showHtmlCoefficient(this.pendingVisual.value);
                this.setBetsHitVisible(true);
            }
        } else {
            this.flightTicking = false;
        }
    }

    applyPendingVisual = () => {
        if (!this.loaded || !this.pendingVisual) return;

        const pending = this.pendingVisual;
        this.pendingVisual = null;

        if (pending.kind === 'bets') {
            this.startLoader();
            return;
        }
        
        if (pending.kind === 'ready') {
            this.hideLoader(true);
            this.black.visible = true;
            this.markAssetsReady();
            return;
        }

        if (pending.kind === 'fly') {
            if (!this.flightTicking) return;
            if (pending.value != null && pending.value > graphicValue) graphicValue = pending.value;
            if (pending.step != null && pending.step > (graphicStep || 0)) graphicStep = pending.step;
            this.fly();
            if (graphicValue > 1) this.coefficient(graphicValue);
            return;
        }

        if (pending.kind === 'boom') {
            this.boom(pending.value, { visualsOnly: true });
        }
    }

    bindScrollResize = () => {
        window.addEventListener('scroll', this.handleScrollResize, { passive: true });
        document.addEventListener('scroll', this.handleScrollResize, { passive: true, capture: true });
    }

    handleScrollResize = () => {
        if (this.scrollResizeFrame !== null) return;

        this.scrollResizeFrame = requestAnimationFrame(() => {
            this.scrollResizeFrame = null;
            this.resize();
            setTimeout(() => {
                this.resize();
            }, 100);
        });
    }

    bindStageResize = () => {
        const stage = document.querySelector('.stage');
        if (!stage) return;
        this.stageResizeObserver = new ResizeObserver(() => this.requestCanvasResize());
        this.stageResizeObserver.observe(stage);
    }

    isBetScrolling = () => {
        if (!this.betScrollApp) this.betScrollApp = document.querySelector('.app');
        return this.betScrollApp?.classList.contains('is-bet-scrolling') === true;
    }

    requestCanvasResize = () => {
        if (this.stageResizeFrame !== null) return;
        this.stageResizeFrame = requestAnimationFrame(() => {
            this.stageResizeFrame = null;

            if (this.isBetScrolling()) {
                this.resize();
                this.scheduleCanvasResizeAfterScroll();
                return;
            }

            this.safeCanvasResize();
        });
    }

    scheduleCanvasResizeAfterScroll = () => {
        if (this.deferredCanvasResize) return;
        this.deferredCanvasResize = true;
        const tick = () => {
            if (this.isBetScrolling()) {
                requestAnimationFrame(tick);
                return;
            }
            this.deferredCanvasResize = false;
            this.safeCanvasResize();
        };
        requestAnimationFrame(tick);
    }

    safeCanvasResize = () => {
        try {
            this.canvas?.canvas?.resize?.();
        } catch (e) {}

        try {
            this.resize();
        } catch (e) {}
    }

    info = {
        balance: 0,
        balanceFinal: 0,
        totalBet: 0,

        event: {
            id: '',
            code: '',
            isSpecial: false,
            customTime: 0,
            sourcePlayerId: '',
            parameter: null,
            time: '',
            options: [],
        },

        common: {
            gameState: 0,
            boardVersion: 0,
            dealNumber: '',
            gameId: '',
            gameNumber: 0,
            isGameFinished: false,
            isGameStarted: true,
            isObserver: false,
            options: [],
            playerKey: ''
        },
    };

    data = null;
    dataBoard = null;
    dataLoad = (data, selectedOption) => {
        if (data !== undefined && data !== null) {

        } else {
            return false;
        }

        let Board = (data.Board !== null && data.Board !== undefined ? data.Board : data.PlayerEvent.Board);

        this.data = data;

        this.info.event.id = data.Events[0]?.EventId;
        this.info.event.eventTypeCode = data.Events[0]?.EventType.Code;
        this.dataBoard = data.Board;

        this.gameLoad(Board, this.info.event.eventTypeCode, selectedOption);
        window.parent.postMessage({ name: "spin-number", spinNumber: this.info.common.dealNumber }, "*");
    }

    jetY = 50;
    noAnimationBgFit = 'cover';
    resizeInfo = {
        screenWidth: 0,
        screenHeight: 0,
        playHeight: 0,
        betHeight: 0,
        sideWidth: 0,
        mobile: true,
    };
    getShortStageFitScale = () => {
        if (typeof mobileLandscapeQuery !== 'undefined' && mobileLandscapeQuery.matches) return 1;
        if (typeof mobileViewportQuery !== 'undefined' && !mobileViewportQuery.matches) return 1;
        const vh = window.innerHeight || 0;
        const hStart = 630;
        const isFour = document.querySelector('.app')?.classList.contains('mode-4');
        const hEnd = isFour ? 500 : 450;
        const minScale = isFour ? 0.4 : 0.5;
        if (vh <= 0 || vh > hStart) return 1;
        const t = (vh - hEnd) / (hStart - hEnd);
        return Math.max(minScale, Math.min(1, minScale + (1 - minScale) * t));
    };
    syncJetSceneLayout = () => {
        if (!this.jet) return;

        this.resizeInfo.mobile = isMobileLikeViewport();
        const mobile = this.resizeInfo.mobile;
        const scale = mobile ? 0.4 : 0.6;
        const y = 73;
        const desktopX = mobile ? 0 : 150;
        const desktopY = mobile ? 0 : 250;

        this.jet.scale.set(scale);
        this.background0.scale.set(scale);
        this.background1.scale.set(scale);
        this.jet.y = 73 + this.jetY - y;
        this.background0.y = 73 + this.jetY - y;
        this.background1.y = 73 + this.jetY - y;

        if (this.loader?.popup) {
            this.loader.popup.scale.set(scale);
            this.loader.popup.x = -98 - desktopX;
            this.loader.popup.y = -420 - desktopY - y + this.jetY;
        }
        this.layoutLoaderRun(scale);
    }

    resize = () => {
        this.canvas.scale();

        this.resizeInfo.screenWidth = this.canvas.canvas.screen.width;
        this.resizeInfo.screenHeight = this.canvas.canvas.screen.height;
        this.resizeInfo.playHeight = playDiv.offsetHeight;
        this.resizeInfo.betHeight = playFooter.offsetHeight;
        this.resizeInfo.sideWidth = this.resizeInfo.screenWidth < 768 ? 0 : sidebar.offsetWidth;

        this.syncJetSceneLayout();

        if (!this.container) return;

        const fitScale = this.getShortStageFitScale();
        this.container.scale.set(fitScale);
        const appEl = document.querySelector('.app');
        if (appEl) {
            if (fitScale < 1) appEl.style.setProperty('--stage-fit-scale', fitScale.toFixed(4));
            else appEl.style.removeProperty('--stage-fit-scale');
        }

        this.container.x = this.resizeInfo.screenWidth / 2 - this.resizeInfo.sideWidth / 2;
        this.container.y = this.resizeInfo.playHeight - this.resizeInfo.betHeight;

        if (typeof mobileLandscapeQuery !== 'undefined' && mobileLandscapeQuery.matches) {
            const appEl = this.canvas?.info?.canvas?.div;
            const stageEl = document.querySelector('.stage');
            if (appEl && stageEl) {
                const appRect = appEl.getBoundingClientRect();
                const stageRect = stageEl.getBoundingClientRect();
                const stageLeft = stageRect.left - appRect.left;
                const stageTop = stageRect.top - appRect.top;
                const stageW = stageRect.width;
                const stageH = stageRect.height;
                if (stageW > 0 && stageH > 0) {
                    this.container.x = stageLeft + stageW / 2;
                    this.container.y = stageTop + stageH - 50;
                    this.resizeInfo.playHeight = stageH;
                    this.resizeInfo.betHeight = 0;
                    this.resizeInfo.sideWidth = 0;
                }
            }
        }

        // UNUSED CANVAS STAGE HUD — this.updateMultiplierPosition();
        this.layoutNoAnimationBackground();

        if (typeof syncAnimationOffLayout === 'function') {
            syncAnimationOffLayout();
        }

        const el = document.querySelector('.topbar');
        const rect = el.getBoundingClientRect();
        const offset = {
            top: rect.bottom - 10,
            left: rect.left + window.scrollX + 10
        };

        window.parent.postMessage({
                name: "jetx-main-width",
                jetxScale: 0.45,
                jetxPosition: offset
            },
            "*");
    }

    layoutNoAnimationBackground = () => {
        return
        const sprite = this.noAnimation;
        if (!sprite?.texture?.width || !this.container) return;

        const sw = this.resizeInfo.screenWidth || this.canvas?.canvas?.screen?.width;
        const sh = this.resizeInfo.screenHeight || this.canvas?.canvas?.screen?.height;
        if (!sw || !sh) return;

        const fit = this.noAnimationBgFit === 'cover' ? 'cover' : 'contain';
        const tw = sprite.texture.width;
        const th = sprite.texture.height;

        let centerX = sw / 2;
        let centerY = sh / 2;
        let stageW = sw;
        let stageH = sh;

        const appEl = this.canvas?.info?.canvas?.div;
        const stageEl = document.querySelector('.stage');
        if (appEl && stageEl) {
            const appRect = appEl.getBoundingClientRect();
            const stageRect = stageEl.getBoundingClientRect();
            if (stageRect.width > 0 && stageRect.height > 0) {
                centerX = (stageRect.left - appRect.left) + stageRect.width / 2;
                centerY = (stageRect.top - appRect.top) + stageRect.height / 2;
                stageW = stageRect.width;
                stageH = stageRect.height;
            }
        }

        const pivotX = this.container.pivot?.x || 0;
        const pivotY = this.container.pivot?.y || 0;

        sprite.anchor.set(0.5, 0.5);
        sprite.x = centerX - this.container.x + pivotX + 50;
        sprite.y = centerY - this.container.y + pivotY - 50;

        let scale;
        if (fit === 'cover') {
            const needW = 2 * Math.max(centerX, sw - centerX);
            const needH = 2 * Math.max(centerY, sh - centerY);
            scale = Math.max(needW / tw, needH / th);
        } else {
            scale = Math.max(stageW / tw, stageH / th);
        }
        sprite.scale.set(scale);
    }

    // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
    // updateMultiplierPosition = (value = 0) => {
    //     if (!this.multiplier || !this.multiplierX) return;
    //     if (!this.canvas || !this.canvas.canvas || !this.canvas.canvas.screen) return;
    //     if(value > 100000) {
    //         this.multiplier.style.fontSize = 50;
    //         this.multiplier.y = 77 + 27;
    //     } else if(value > 10000) {
    //         this.multiplier.style.fontSize = 60;
    //         this.multiplier.y = 77 + 18;
    //     } else {
    //         this.multiplier.style.fontSize = 80;
    //         this.multiplier.y = 77;
    //     }
    //     const gap = 10;
    //     const xWidth = 39;
    //     this.multiplier.x = 200 - (gap + xWidth) / 2;
    //     this.multiplierX.x = this.multiplier.x + this.multiplier.width / 2 + gap;
    //     if (this.multiplierShadow) {
    //         this.multiplierShadow.style.fontSize = this.multiplier.style.fontSize;
    //         this.multiplierShadow.position.copyFrom(this.multiplier.position);
    //         this.multiplierShadow.text = this.multiplier.text;
    //     }
    //     if (this.multiplierXShadow) {
    //         this.multiplierXShadow.position.set(this.multiplierX.x, this.multiplierX.y);
    //     }
    // }


    backgroundSound = (type = '') => {
        //this.canvas.playSound(1, 'FlyLoop', {loop: true, volume: 1});
    }

    gameInit = () => {
        let width = 400;
        let height = 400;
        this.container = this.canvas.createContainer({
            parent: this.canvas.defaultContainer,
            x: 0,
            y: 0,
            zIndex: 1,
        });
        this.container.pivot.set(
            width / 2,
            height / 2
        );
        this.black = this.canvas.graphics({
            container: this.container,
            color: 0x000000,
            alpha: 1,
            x: -1000,
            y: -1000,
            width: 10000,
            height: 10000,
            zIndex: 1,
        });
        this.black.visible = false;
        this.fakeBackground = this.canvas.graphics({
            container: this.container,
            color: 0xffffff,
            alpha: 0.00001,
            x: 0,
            y: 0,
            width: width,
            height: height,
            zIndex: 10,
        });
        const gradient = new PIXI.FillGradient(0, 0, 0, 1);
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.5954, 'rgba(0,0,0,0.7)');
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        const graphics = new PIXI.Graphics();
        graphics.rect(0, 0, 5000, 249).fill(gradient).rect(0, 249, 5000, 500).fill('rgba(0,0,0,1)');
        graphics.x = -1000;
        graphics.y = 49;
        graphics.zIndex = 19;
        this.container.addChild(graphics);

        this.jet = this.canvas.spine('Spine-Jet', {
            container: this.container,
            x: 200,
            y: 73 + this.jetY,
            zIndex: 5,
            scale: 0.4,
            visible: false,
        });
        this.jetContainer = new PIXI.Container();
        this.jet.addSlotObject('Jet_EmptySlot', this.jetContainer);
        this.jetContainer2 = new PIXI.Container();
        this.jet.addSlotObject('Jetx_Position_NoRotation', this.jetContainer2);
        this.jetFly = this.canvas.spine('Spine-Jet', {
            container: this.jetContainer,
            x: 0,
            y: 0,
            zIndex: 102,
            scale: 4,
            visible: false,
        });
        this.jetFly.state.addListener({
            complete: (track, event) => {
                this.jetFly.visible = false;
            }
        });


        this.background0 = this.canvas.spine('Spine-JetBackground', {
            container: this.container,
            x: 200,
            y: 73 + this.jetY,
            zIndex: 1,
            scale: 0.4,
            visible: false,
        });
        this.background0.state.addListener({
            event: (entry, event) => {
                if (!this.flybySoundsActive) return;
                const flyby = flybyEventSounds[event.data.name];
                if (flyby) this.canvas.playSound(flyby.index, flyby.sound);
            }
        });

        this.background1 = this.canvas.spine('Spine-JetBackgroundFront', {
            container: this.container,
            x: 200,
            y: 73 + this.jetY,
            zIndex: 7,
            scale: 0.4,
            visible: false,
        });

        this.betsHit = document.querySelector('[data-bets-open-players]');
        this.betsHit?.addEventListener('click', () => this.openSidePlayers());

        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.flewAway = this.canvas.text('FlewAway', {
        //     container: this.container,
        //     align: 'center',
        //     x: 200,
        //     y: 30,
        //     zIndex: 24,
        //     visible: false,
        // });

        this.noAnimationFill = this.canvas.graphics({
            container: this.container,
            color: 0x000000,
            alpha: 1,
            x: -1000,
            y: -1000,
            width: 10000,
            height: 10000,
            zIndex: 15,
        });
        this.noAnimationFill.visible = false;

        this.noAnimation = this.canvas.image('NoAnimationBackground', {
            container: this.container,
            align: 'center',
            verticalAlign: 'center',
            x: 0,
            y: 0,
            zIndex: 16,
        });
        this.noAnimation.visible = false;
        this.layoutNoAnimationBackground();

        let menuAnimation = document.querySelector('#menu-animation');
        if (menuAnimation) {
            const applyMenuAnimation = () => {
                this.noAnimationFill.visible = false;
                this.noAnimation.visible = false;
                this.applyAnimationEngine();
                if (typeof syncAnimationOffLayout === 'function') {
                    syncAnimationOffLayout();
                }
            };
            menuAnimation.addEventListener('change', applyMenuAnimation);
            applyMenuAnimation();
        }

        let menuMusic = document.querySelector('#menu-music');
        if (menuMusic) {
            const applyMenuMusic = () => {
                this.canvas.soundBackground = menuMusic.checked && !soundPopup;
                this.canvas.tabStatusSound(this.canvas.soundBackground);
            };
            menuMusic.addEventListener('change', applyMenuMusic);
            applyMenuMusic();
        }

        let menuSounds = document.querySelector('#menu-sounds');
        if (menuSounds) {
            const applyMenuSounds = () => {
                this.canvas.sound = menuSounds.checked && !soundPopup;
                mixpanelMobileSound(menuSounds.checked);
            };
            menuSounds.addEventListener('change', applyMenuSounds);
            applyMenuSounds();
        }

        /*
        this.testBG = this.canvas.graphics({
            container: this.container,
            color: 0x000000,
            alpha: 1,
            x: -1000,
            y: -1000,
            width: 10000,
            height: 10000,
            zIndex: 50,
        });

        this.testJet = this.canvas.spine('Spine-Jet', {
            container: this.container,
            x: 200,
            y: 73,
            zIndex: 102,
            scale: 0.4,
        });

        this.testJetContainer = new PIXI.Container();
        this.testJet.addSlotObject('Jet_EmptySlot', this.testJetContainer);

        this.testBackground0 = this.canvas.spine('Spine-JetBackground', {
            container: this.container,
            x: 200,
            y: 73,
            zIndex: 100,
            scale: 0.4,
        });

        // const gradTexture = this.createGradTexture();
        // let newTexture = new PIXI.Sprite(gradTexture);
        // newTexture.width = 48;
        // newTexture.height = 2000;
        // const slot = this.testBackground0.skeleton.findSlot('ca');
        // const attachment = slot.getAttachment();
        // attachment.region.texture  = newTexture;
        // attachment.width = newTexture.width;
        // attachment.height = newTexture.height;
        // attachment.updateRegion();
        // slot.setAttachment(attachment);

        this.testBackground1 = this.canvas.spine('Spine-JetBackgroundFront', {
            container: this.container,
            x: 200,
            y: 73,
            zIndex: 103,
            scale: 0.4,
        });
        // this.testJet.state.setAnimation(0, 'Jet_Intro_Loop', true);
        // this.testBackground0.state.setAnimation(0, 'Enviroment_Back_Intro_Loop', true);
        this.testJet.state.setAnimation(0, 'Jet_Start', false);
        this.testJet.state.addAnimation(0, 'Jet_Loop_End', true, 0);
        this.testBackground0.state.setAnimation(0, 'Enviroment_Back_Start', false);
        this.testBackground0.state.addAnimation(0, 'Enviroment_Back_End_Loop', true, 0);
        this.testBackground1.state.setAnimation(0, 'Enviroment_Front_Start', false);
        this.testBackground1.state.addAnimation(0, 'Enviroment_Front_End_Loop', true, 0);
        */

        // UNUSED CANVAS STAGE HUD — this.drawCoefficient();
        this.drawLoader();

        this.loaded = true;
        // is-assets-ready is set in markAssetsReady() after first visual starts.
        // is-assets-pending (board skeleton) is removed in loadData when real balance is set.
    }

    setBets = (count) => {
        if (!this.betsHit) this.betsHit = document.querySelector('[data-bets-open-players]');
        if (!this.betsHit) return;
        const countEl = this.betsHit.querySelector('[data-bets-count]');
        if (countEl) countEl.textContent = String(Math.max(0, count));
    }

    openSidePlayers = () => {
        if (app?.classList.contains('is-side-closed')) {
            sidebarToggle?.click();
        }
        document.querySelector('[data-side-tab="players"]')?.click();
        if (isMobileLikeViewport() && sidebar) {
            window.requestAnimationFrame(() => {
                scrollToElement(sidebar, 0);
            });
        }
    }

    setBetsHitVisible = (visible) => {
        if (!this.betsHit) this.betsHit = document.querySelector('[data-bets-open-players]');
        if (!this.betsHit) return;
        this.betsHit.hidden = !visible;
        if (visible) {
            try {
                const stats = gameStats?.playersView?.stats;
                if (stats) {
                    this.setBets(Math.max(0, (stats.count || 0) - (stats.cashout || 0)));
                }
            } catch (e) {}
        }
    }

    createGradTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grd = ctx.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0, '#00FF00');
        // grd.addColorStop((9416 - 5610 - 1500) / 9416, '#0000ff');//0d1019
        // grd.addColorStop((9416 - 1500) / 9416, '#00ff00'); //617cb8
        grd.addColorStop(1, '#ff0000'); //e99a8f
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 1, 256);
        return PIXI.Texture.from(canvas);
    }



    drawConnectionLost = () => {

    }
    flightPaused = false;
    _savedFlightTimeScales = null;

    pauseFlightAnimation = () => {
        if (!this.loaded || this.flightPaused) return;
        this.flightPaused = true;
        this._savedFlightTimeScales = {
            jet: this.jet?.state?.timeScale ?? 1,
            jetFly: this.jetFly?.state?.timeScale ?? 1,
            bg0: this.background0?.state?.timeScale ?? 1,
            bg1: this.background1?.state?.timeScale ?? 1,
        };
        if (this.jet?.state) this.jet.state.timeScale = 0;
        if (this.jetFly?.state) this.jetFly.state.timeScale = 0;
        if (this.background0?.state) this.background0.state.timeScale = 0;
        if (this.background1?.state) this.background1.state.timeScale = 0;
        try { this.canvas.setSpineFrozen(true); } catch (e) {}
        this.cashOutClear();
    }

    resumeFlightAnimation = () => {
        if (!this.loaded || !this.flightPaused) return;
        this.flightPaused = false;
        const s = this._savedFlightTimeScales || { jet: 1, jetFly: 1, bg0: 1, bg1: 1 };
        this._savedFlightTimeScales = null;
        if (this.jet?.state) this.jet.state.timeScale = s.jet;
        if (this.jetFly?.state) this.jetFly.state.timeScale = s.jetFly;
        if (this.background0?.state) this.background0.state.timeScale = s.bg0;
        if (this.background1?.state) this.background1.state.timeScale = s.bg1;
        try { this.canvas.setSpineFrozen(false); } catch (e) {}
    }

    showInternetLost = () => {
        this.pauseFlightAnimation();
        if (window.JetXPopups) window.JetXPopups.open('connection');
    }
    hideInternetLost = () => {
        const timeoutPopup = document.querySelector('[data-popup="timeout"]');
        if (!timeoutPopup || timeoutPopup.hidden) {
            this.resumeFlightAnimation();
        }
        const popup = document.querySelector('[data-popup="connection"]');
        if (popup && !popup.hidden && window.JetXPopups) window.JetXPopups.close();
    }



    loader = {loader: null, countdown: null};
    htmlHud = null;
    htmlCountdownRaf = null;
    htmlCountdownStart = 0;

    bindHtmlHud = () => {
        if (this.htmlHud) return this.htmlHud;
        const root = document.querySelector('[data-stage-hud]');
        if (!root) return null;
        this.htmlHud = {
            root,
            loader: root.querySelector('[data-stage-loader]'),
            coeff: root.querySelector('[data-stage-coeff]'),
            counter: root.querySelector('[data-stage-counter]'),
            ring: root.querySelector('.stage-hud__ring'),
            ringFg: root.querySelector('[data-stage-ring]'),
            loaderText: root.querySelector('[data-stage-loader-text]'),
            multiplier: root.querySelector('[data-stage-multiplier]'),
            multiplierRow: root.querySelector('.stage-hud__multiplier-row'),
            flew: root.querySelector('[data-stage-flew]'),
            x: root.querySelector('[data-stage-x]'),
            ringLen: 2 * Math.PI * 24,
        };
        return this.htmlHud;
    }

    /**
     * UNUSED CANVAS STAGE HUD — HTML stage-hud is the live UI.
     * Was a temp flip to restore canvas loader/multiplier/Flew Away; no longer needed.
     */
    // canvasStageHudEnabled = false;

    showHtmlHudRoot = () => {
        const hud = this.bindHtmlHud();
        if (!hud) return;
        if (hud.root.hidden && typeof syncAnimationOffLayout === 'function') {
            syncAnimationOffLayout();
        }
        hud.root.hidden = false;
        this.setBetsHitVisible(true);
    }

    hideHtmlHud = () => {
        const hud = this.bindHtmlHud();
        if (!hud) return;
        hud.root.hidden = true;
        if (hud.loader) hud.loader.hidden = true;
        if (hud.coeff) hud.coeff.hidden = true;
        if (hud.flew) hud.flew.hidden = true;
        this.clearHtmlCountdown();
    }

    showHtmlLoader = () => {
        const hud = this.bindHtmlHud();
        if (!hud) return;
        this.showHtmlHudRoot();
        if (hud.coeff) hud.coeff.hidden = true;
        if (hud.flew) hud.flew.hidden = true;
        if (hud.loader) hud.loader.hidden = false;
        this.updateHtmlLoader(1);
    }

    hideHtmlLoader = () => {
        const hud = this.bindHtmlHud();
        if (!hud?.loader) return;
        hud.loader.hidden = true;
        this.clearHtmlCountdown();
        if (hud.coeff?.hidden !== false) {
            hud.root.hidden = true;
        }
    }

    updateHtmlLoader = (value) => {
        const hud = this.bindHtmlHud();
        if (!hud) return;
        const clamped = Math.max(0, Math.min(1, value));
        const count = Math.round(clamped * 5);
        const zeroAt = 0.1;
        const ringProgress = Math.max(0, Math.min(1, (clamped - zeroAt) / (1 - zeroAt)));
        if (hud.counter) hud.counter.textContent = String(count);
        if (hud.ringFg) {
            hud.ringFg.style.strokeDasharray = String(hud.ringLen);
            hud.ringFg.style.strokeDashoffset = String(hud.ringLen * (1 - ringProgress));
        }
        const warning = clamped <= 0.5;
        hud.ring?.classList.toggle('is-warning', warning);
    }

    showHtmlCoefficient = (coef = 1) => {
        const hud = this.bindHtmlHud();
        if (!hud) return;
        this.showHtmlHudRoot();
        if (hud.loader) hud.loader.hidden = true;
        if (hud.coeff) {
            hud.coeff.hidden = false;
            hud.coeff.classList.remove('is-boom', 'is-win', 'is-big-win', 'is-max-win', 'is-pulsing');
        }
        if (hud.flew) hud.flew.hidden = true;
        this.updateHtmlCoefficient(coef);
        this.setHtmlCoefficientColor('#FFFFFF');
    }

    hideHtmlCoefficient = () => {
        const hud = this.bindHtmlHud();
        if (!hud?.coeff) return;
        hud.coeff.hidden = true;
        if (hud.flew) hud.flew.hidden = true;
        if (hud.loader?.hidden !== false) {
            hud.root.hidden = true;
        }
    }

    updateHtmlCoefficient = (value) => {
        const hud = this.bindHtmlHud();
        if (!hud?.multiplier) return;
        const v = Number(value) || 0;
        hud.multiplier.textContent = v.toFixed(2);
        if (hud.multiplierRow) {
            const shouldScaleForMobile = typeof isMobileLikeViewport === 'function'
                && isMobileLikeViewport();
            if (shouldScaleForMobile && v > 100000) hud.multiplierRow.style.fontSize = '3.125rem';
            else if (shouldScaleForMobile && v > 10000) hud.multiplierRow.style.fontSize = '3.75rem';
            else hud.multiplierRow.style.fontSize = '';
        }
    }

    setHtmlCoefficientColor = (color) => {
        const hud = this.bindHtmlHud();
        if (!hud?.coeff) return;
        const row = hud.multiplierRow || hud.coeff.querySelector('.stage-hud__multiplier-row');
        if (row) row.style.color = color;
    }

    showHtmlFlewAway = (coef) => {
        if (this.isMaxMultiplierVisible()) return;
        const hud = this.bindHtmlHud();
        if (!hud) return;
        const raw = Number(coef);
        const display = Number.isFinite(raw) && raw > 0
            ? raw
            : (Number(this.lastBoomValue) > 0 ? this.lastBoomValue : (Number(graphicValue) || 1));
        this.showHtmlCoefficient(display);
        if (hud.flew) hud.flew.hidden = false;
        hud.coeff?.classList.add('is-boom');
        hud.coeff?.classList.remove('is-win', 'is-big-win', 'is-max-win');
        this.setHtmlCoefficientColor('#FF3E5B');
    }

    clearHtmlCountdown = () => {
        if (this.htmlCountdownRaf !== null) {
            cancelAnimationFrame(this.htmlCountdownRaf);
            this.htmlCountdownRaf = null;
        }
        this.htmlCountdownStart = 0;
    }

    startHtmlCountdown = (fn, { start = 1, end = 0, time = 5500 } = {}) => {
        this.clearHtmlCountdown();
        this.htmlCountdownStart = performance.now();
        const tick = (now) => {
            const progress = Math.min(1, (now - this.htmlCountdownStart) / time);
            const value = start + (end - start) * progress;
            if (progress < 1) {
                fn(value, true);
                this.htmlCountdownRaf = requestAnimationFrame(tick);
            } else {
                this.htmlCountdownRaf = null;
                fn(end, false);
            }
        };
        this.htmlCountdownRaf = requestAnimationFrame(tick);
    }

    drawLoader = () => {
        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.loader.loader = this.canvas.createContainer({
        //     parent: this.container,
        //     x: 200,
        //     y: 89,
        //     zIndex: 20,
        //     visible: false,
        // });
        // this.loader.background = this.canvas.graphics({
        //     container: this.loader.loader,
        //     color: 0x000000,
        //     alpha: 0.15,
        //     x: 0,
        //     y: 0,
        //     circle: true,
        //     radius: 24,
        //     stroke: { width: 2, color: 0xffffff, alpha: 0.1 },
        //     zIndex: 1,
        // });
        // this.loader.counter = this.canvas.text('Loader', {
        //     container: this.loader.loader,
        //     align: 'center',
        //     verticalAlign: 'center',
        //     x: 0,
        //     y: 0,
        //     zIndex: 3,
        // });
        // this.loader.counter.text = '5';
        // this.loader.text = this.canvas.text('LoaderText', {
        //     container: this.container,
        //     align: 'center',
        //     x: 200,
        //     y: 115,
        //     zIndex: 24,
        //     visible: false,
        // });

        // Keep: loader scene spines (not HUD text)
        this.loader.run = null;
        try {
            this.loader.run = this.canvas.spine('Spine-LoaderRun', {
                container: this.container,
                x: 200,
                y: 73 + this.jetY,
                zIndex: 2,
                scale: 0.3,
                visible: false,
            });
        } catch (e) {
            console.error('Spine-LoaderRun failed', e);
        }

        this.loader.popup = this.canvas.spine('Spine-LoaderX', {
            container: this.container,
            x: -110,
            y: -420 + this.jetY,
            zIndex: 9,
            scale: 0.4,
            visible: false,
        });
        this.loader.popup.state.addListener({
            complete: (track) => {
                if (track?.animation?.name === 'x gasvla') {
                    this.loader.popup.visible = false;
                }
            }
        });
        this.layoutLoaderRun(isMobileLikeViewport() ? 0.4 : 0.6);
    }

    layoutLoaderRun = (scale) => {
        if (!this.loader?.run || !this.jet) return;
        const runScale = scale - 0.1;
        // visX/visY = actual runner cluster in sirbili.json; yDown: pixiY = -spineY.
        const visX = 194.2;
        const visY = -39.3;
        const desktopScale = 0.6;
        const offsetScale = scale / desktopScale;
        this.loader.run.scale.set(runScale);
        this.loader.run.x = this.jet.x - visX * runScale - 125 * offsetScale;
        this.loader.run.y = this.jet.y + visY * runScale - 5 * offsetScale;
    }

    firstLoad = true;
    loaderAnimationTimeout = null;
    clearLoaderAnimationTimeout = () => {
        if (this.loaderAnimationTimeout !== null) {
            clearTimeout(this.loaderAnimationTimeout);
            this.loaderAnimationTimeout = null;
        }
    }

    onLoaderCountdownTick = (value, running = true) => {
        // UNUSED CANVAS STAGE HUD — ring stroke/counter used only when canvas HUD was on
        // const warning = value <= 0.5;
        // const color = warning ? 0xFF3E5B : 0xffffff;
        // const textColor = warning ? '#FF3E5B' : '#ffffff';
        // const stroke = warning
        //     ? { width: 2, color: color, alpha: 1, cap: 'round' }
        //     : { width: 2, color: 0xffffff, alpha: 1 };
        // const zeroAt = 0.1;
        // const ringValue = Math.max(0, Math.min(1, (value - zeroAt) / (1 - zeroAt)));

        this.updateHtmlLoader(value);

        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // if (this.loaded && this.loader?.loader) {
        //     const startAngle = ringValue >= 0.99 ? null : -Math.PI / 2;
        //     const endAngle = ringValue >= 0.99 ? null : startAngle + Math.PI * 2 * ringValue;
        //     if (this.loader.track && !this.canvas.isDestroyed(this.loader.track)) {
        //         this.canvas.safeDestroy(this.loader.track);
        //     }
        //     this.loader.track = this.canvas.graphics({
        //         container: this.loader.loader,
        //         color: 0x000000,
        //         alpha: 0.00001,
        //         x: 0,
        //         y: 0,
        //         circle: true,
        //         startAngle: startAngle,
        //         endAngle: endAngle,
        //         radius: 24,
        //         stroke: stroke,
        //         zIndex: 2,
        //     });
        //     if (this.loader.counter) {
        //         this.loader.counter.text = Math.round(value * 5);
        //         this.loader.counter.style.fill = textColor;
        //     }
        // }

        if (value <= 0.5 && !this.loader.warningGlowShown) {
            this.loader.warningGlowShown = true;
            if (typeof showCashoutGlow === 'function') {
                showCashoutGlow('warning');
            }
        }

        if (!running && !this.game.started) {
            if (!this.loaded && this.pendingVisual?.kind === 'bets') {
                this.pendingVisual = { kind: 'ready' };
            }
            this.hideLoader(true);
        }
    }

    startLoader = () => {
        if (!this.game.started) this.game.loader = true;
        this.clearLoaderAnimationTimeout();
        this.hideCoefficient();
        this.showHtmlLoader();
        this.setBetsHitVisible(true);
        this.loader.warningGlowShown = false;

        const countdownRunning = this.htmlCountdownRaf !== null || !!this.loader.countdown;

        if (!this.loaded) {
            if (!countdownRunning) {
                this.startHtmlCountdown((value, running) => {
                    this.onLoaderCountdownTick(value, running !== false);
                }, {
                    start: 1,
                    end: 0,
                    time: 5500,
                });
            }
            gameStats.playersView.top3Wins(true);
            return;
        }

        this.stopFlybySounds();
        this.jetTrack = null;
        this.background0Track = null;
        this.background1Track = null;

        this.syncJetSceneLayout();
        if (this.jetFly) this.jetFly.visible = false;
        this.loader.popup.visible = true;
        this.loader.popup.state.timeScale = 1;
        this.loader.popup.state.setAnimation(0, 'x shemosvla', false);

        this.startLoaderAnimation();
        this.firstLoad = false;
        this.black.visible = true;
        if (!countdownRunning) {
            this.canvas.playSound(16, 'countdown');
        }
        this.markAssetsReady();

        if (!countdownRunning) {
            this.clearHtmlCountdown();
            if (this.loader.countdown) {
                this.loader.countdown = this.canvas.clearCountdown(this.loader.countdown);
            }
            this.loader.countdown = this.canvas.countdown((value, running) => {
                this.onLoaderCountdownTick(value, running !== false);
            }, {
                start: 1,
                end: 0,
                time: 5500,
            });
        }

        gameStats.playersView.top3Wins(true);
    }

    startLoaderAnimation = (showRunner = true) => {
        if (this.game.started || !this.loaded) return;

        this.syncJetSceneLayout();
        if (this.jetFly) this.jetFly.visible = false;
        this.jetSlots(true);
        if (showRunner && this.loader.run) {
            this.loader.run.visible = true;
            this.loader.run.state.timeScale = 1;
            this.loader.run.state.setAnimation(0, 'animation', false);
            this.loader.popup.state.timeScale = 1;
        }

        const introPlaying = this.jet.state.getCurrent(0)?.animation?.name === 'Jet_Intro_Loop';
        const playIntro = showRunner || !introPlaying;
        if (playIntro) {
            this.jet.state.clearTracks();
            this.jet.skeleton.setToSetupPose();
            this.background0.state.clearTracks();
            this.background0.skeleton.setToSetupPose();
            this.background1.state.clearTracks();
            this.background1.skeleton.setToSetupPose();

            this.jet.state.setAnimation(0, 'Jet_Intro_Loop', true);
            this.background0.state.setAnimation(0, 'Enviroment_Back_Intro_Loop', true);
        }

        const timeScale = this.flightPaused ? 0 : 1;
        this.jet.state.timeScale = timeScale;
        this.background0.state.timeScale = timeScale;
        this.background1.state.timeScale = timeScale;
        this.applySpinePose(this.jet);
        this.applySpinePose(this.background0);
        this.applySpinePose(this.background1);

        this.jet.visible = true;
        this.background0.visible = true;
        this.background1.visible = false;
    }

    applySpinePose = (obj) => {
        if (!obj?.state || !obj?.skeleton) return;
        obj.state.apply(obj.skeleton);
        obj.skeleton.updateWorldTransform(spine.Physics.update);
    }

    applyAnimationEngine = () => {
        if (!this.canvas?.canvas) return;
        const menu = document.getElementById('menu-animation');
        const enabled = !menu || menu.checked;
        if (!enabled) {
            this.canvas.stopEngine();
            return;
        }
        this.canvas.startEngine(() => {
            this.jetPosition();
            this.applySpinePose(this.jet);
            this.applySpinePose(this.background0);
            this.applySpinePose(this.background1);
            this.applySpinePose(this.jetFly);
        });
    }

    hideLoader = (countdown = false) => {
        if (countdown && !this.game.started) {
            this.game.loader = false;
        }
        this.hideHtmlLoader();
        this.clearHtmlCountdown();
        this.clearLoaderAnimationTimeout();
        this.loader.warningGlowShown = false;

        const warningGlow = document.querySelector('.cashout-glow--warning');
        if (warningGlow) warningGlow.remove();

        if (countdown) {
            this.showHtmlCoefficient(1);
            this.coefficient(1);
        }

        if (!this.loaded) {
            gameStats.playersView.top3Wins(false);
            return;
        }

        this.loader.warningGlowShown = false;

        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.loader.loader.visible = false;
        // this.loader.text.visible = false;
        // this.loader.counter.text = '5';
        // this.loader.counter.style.fill = '#ffffff';
        if (this.loader.run) this.loader.run.visible = false;

        if (this.loader.countdown) {
            this.loader.countdown = this.canvas.clearCountdown(this.loader.countdown);
        }

        // First load uses HTML countdown, so loader.countdown is null — still dismiss X.
        const popup = this.loader.popup;
        const popupAnim = popup?.state?.getCurrent(0)?.animation?.name;
        if (popup?.visible && popupAnim !== 'x gasvla') {
            popup.state.setAnimation(0, 'x gasvla', false);
            popup.state.timeScale = 1;
        }

        if (countdown && !this.game.started) {
            this.startLoaderAnimation(false);
        }

        gameStats.playersView.top3Wins(false);
    }



    maxMultiplierEl = null;

    getMaxMultiplierEl = () => {
        if (this.maxMultiplierEl) return this.maxMultiplierEl;
        this.maxMultiplierEl = document.querySelector('[data-max-multiplier-popup]');
        return this.maxMultiplierEl;
    }

    formatMaxMultiplierValue = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '0';
        if (Number.isInteger(n)) {
            return n.toLocaleString('en-US');
        }
        return n.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    drawMaxMultiplier = () => {
        this.setMaxMultiplier();
    }

    setMaxMultiplier = () => {
        const el = this.getMaxMultiplierEl();
        if (!el) return;
        const valueEl = el.querySelector('[data-max-multiplier-value]');
        if (!valueEl) return;
        const maxValue = (typeof board !== 'undefined' && board.maxCashoutCoeff != null)
            ? board.maxCashoutCoeff
            : 0;
        valueEl.textContent = this.formatMaxMultiplierValue(maxValue);
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(el);
    }

    showMaxMultiplier = () => {
        const el = this.getMaxMultiplierEl();
        if (!el) return;
        this.setMaxMultiplier();
        if (!el.hidden) return;
        el.hidden = false;
        this.startMaxMultiplierWinAnim(el);
        this.hideHtmlCoefficient();
        if (typeof scheduleFitTextAll === 'function') scheduleFitTextAll(el);
    }

    hideMaxMultiplier = () => {
        const el = this.getMaxMultiplierEl();
        if (!el) return;
        this.stopMaxMultiplierWinAnim(el);
        el.hidden = true;
    }

    isMaxMultiplierVisible = () => {
        const el = this.getMaxMultiplierEl();
        return Boolean(el && !el.hidden);
    }

    getMaxMultiplierWinVideoUrl = () => {
        let base = '../Content/';
        if (typeof staticContentUrl === 'string' && staticContentUrl !== '') {
            base = staticContentUrl.replace('Sound/', '');
        }
        return base + 'ImagesNew/win.webp';
    }

    startMaxMultiplierWinAnim = (el) => {
        const img = (el || this.getMaxMultiplierEl())?.querySelector('[data-max-multiplier-win-video]');
        if (!img || typeof startWinAnim !== 'function') return;
        startWinAnim(img, this.getMaxMultiplierWinVideoUrl());
    }

    stopMaxMultiplierWinAnim = (el) => {
        const img = (el || this.getMaxMultiplierEl())?.querySelector('[data-max-multiplier-win-video]');
        if (!img) return;
        if (img.src && img.src.indexOf('blob:') === 0) {
            URL.revokeObjectURL(img.src);
        }
        img.removeAttribute('src');
    }

    graphic = {};
    // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
    // drawCoefficient = () => {
    //     const multiplierResolution = this.canvas?.canvas?.renderer?.resolution || 2;
    //     PIXI.BitmapFont.install({
    //         name: 'MultiplierBMP',
    //         style: { fontFamily: 'Roboto', fontSize: 80, fill: '#ffffff' },
    //         chars: '0123456789.,',
    //         resolution: multiplierResolution,
    //     });
    //     const cx = 200 - 12;
    //     const cy = 117;
    //     this.multiplierPulse = new PIXI.Container();
    //     this.multiplierPulse.zIndex = 20;
    //     this.multiplierPulse.sortableChildren = true;
    //     this.multiplierPulse.pivot.set(cx, cy);
    //     this.multiplierPulse.position.set(cx, cy);
    //     this.container.addChild(this.multiplierPulse);
    //     this.multiplier = new PIXI.BitmapText({
    //         text: '1.00',
    //         style: { fontFamily: 'MultiplierBMP', fontSize: 80 },
    //     });
    //     this.multiplier.anchor.set(0.5, 0);
    //     this.multiplier.position.set(cx, 77);
    //     this.multiplier.zIndex = 20;
    //     this.multiplier.visible = false;
    //     this.multiplierPulse.addChild(this.multiplier);
    //     this.multiplierShadow = new PIXI.BitmapText({
    //         text: '1.00',
    //         style: { fontFamily: 'MultiplierBMP', fontSize: 80 },
    //     });
    //     this.multiplierShadow.anchor.set(0.5, 0);
    //     this.multiplierShadow.position.set(cx, 77);
    //     this.multiplierShadow.zIndex = 19;
    //     this.multiplierShadow.visible = false;
    //     this.multiplierShadow.filters = [new PIXI.BlurFilter({ strength: 10, quality: 3 })];
    //     this.multiplierPulse.addChild(this.multiplierShadow);
    //     let svg = `
    //     <svg xmlns="http://www.w3.org/2000/svg" width="39" height="38" viewBox="0 0 39 38" fill="none">
    //         <path d="M22.8468 32.5657L18.3719 23.7493L6.94854 37.1943H0L15.8705 18.6247L8.92193 4.62863H15.5647L20.0396 13.6655L31.7965 0H38.4393L22.4855 18.487L29.4618 32.5657H22.8468Z" fill="white"/>
    //     </svg>`;
    //     this.multiplierX = this.canvas.graphics({
    //         container: this.multiplierPulse,
    //         x: 0,
    //         y: 115,
    //         scale: 1,
    //         zIndex: 20,
    //         svg: svg,
    //     });
    //     this.multiplierX.visible = false;
    //     this.multiplierXShadow = this.canvas.graphics({
    //         container: this.multiplierPulse,
    //         x: 0,
    //         y: 115,
    //         scale: 1,
    //         zIndex: 19,
    //         svg: svg,
    //     });
    //     this.multiplierXShadow.visible = false;
    //     this.multiplierXShadow.filters = [new PIXI.BlurFilter({ strength: 10, quality: 3 })];
    //     this.updateMultiplierPosition();
    // }

    jetTrack = null;
    background0Track = null;
    background1Track = null;
    showCoefficient = (coef, animate = true) => {
        this.showHtmlCoefficient(coef ?? graphicValue ?? 1);

        if (!this.loaded) return;

        this.jetSlots(true);
        this.jet.visible = true;
        this.background0.visible = true;
        this.background1.visible = true;
        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.multiplier.visible = true;
        // this.multiplierX.visible = true;
        // this.multiplierShadow.visible = false;
        // this.multiplierXShadow.visible = false;
        this.setBetsHitVisible(true);

        this.jet.state.clearTracks();
        this.jet.skeleton.setToSetupPose();
        this.background0.state.clearTracks();
        this.background0.skeleton.setToSetupPose();
        this.background1.state.clearTracks();
        this.background1.skeleton.setToSetupPose();

        this.jetTrack = this.jet.state.setAnimation(0, 'Jet_Start', false);
        this.jet.state.addAnimation(0, 'Jet_Loop_End', true, 0);
        this.jet.state.timeScale = (animate && !this.flightPaused) ? 1 : 0;
        this.background0Track = this.background0.state.setAnimation(0, 'Enviroment_Back_Start', false);
        this.background0.state.addAnimation(0, 'Enviroment_Back_End_Loop', true, 0);
        this.background0.state.timeScale = (animate && !this.flightPaused) ? 1 : 0;
        this.background1Track = this.background1.state.setAnimation(0, 'Enviroment_Front_Start', false);
        this.background1.state.addAnimation(0, 'Enviroment_Front_End_Loop', true, 0);
        this.background1.state.timeScale = (animate && !this.flightPaused) ? 1 : 0;

        if (animate && (!graphicStep || graphicStep === 0)) {
            this.canvas.playSound(12, 'planeTakeoff');
        }

        if(animate) this.jetPosition();
        this.applySpinePose(this.jet);
        this.applySpinePose(this.background0);
        this.applySpinePose(this.background1);

        this.black.visible = true;

        this.canvas.stopSound(16);
        this.markAssetsReady();
    }

    jetPosition = () => {
        if (!this.loaded) return;

        if(this.jetTrack) {
            let time = (graphicStep * 150) / 1000;
            this.jetTrack.trackTime = time;
            this.background0Track.trackTime = time;
            this.background1Track.trackTime = time;
        }
    }

    clearMultiplierPulse = () => {
        // UNUSED CANVAS STAGE HUD
        // if (this.multiplierPulseAnim) {
        //     this.canvas.clearCountdown(this.multiplierPulseAnim);
        //     this.multiplierPulseAnim = null;
        // }
        // if (this.multiplierPulse) this.multiplierPulse.scale.set(1);
        if (this.htmlMultiplierPulseTimer) {
            clearTimeout(this.htmlMultiplierPulseTimer);
            this.htmlMultiplierPulseTimer = null;
        }
        const hud = this.bindHtmlHud();
        hud?.coeff?.classList.remove('is-pulsing');
        this.endCashoutAllPulse();
        this.resetMultiplierPulseStyle();
    }

    beginCashoutAllPulse = () => {
        this.cashoutAllPulseActive = true;
        this.cashoutAllPulseDone = false;
        if (this.cashoutAllPulseTimer) clearTimeout(this.cashoutAllPulseTimer);
        this.cashoutAllPulseTimer = setTimeout(() => this.endCashoutAllPulse(), 2500);
    }

    endCashoutAllPulse = () => {
        this.cashoutAllPulseActive = false;
        this.cashoutAllPulseDone = false;
        if (this.cashoutAllPulseTimer) {
            clearTimeout(this.cashoutAllPulseTimer);
            this.cashoutAllPulseTimer = null;
        }
    }

    hideCoefficient = () => {
        this.hideHtmlCoefficient();

        if (!this.loaded) return;

        this.clearMultiplierPulse();

        this.jet.visible = false;
        this.background0.visible = false;
        this.background1.visible = false;
        this.setBetsHitVisible(false);

        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.multiplier.visible = false;
        // this.multiplierX.visible = false;
        // this.flewAway.visible = false;
    }

    multiplierAnim = null;
    // UNUSED CANVAS STAGE HUD
    // multiplierPulseAnim = null;
    htmlMultiplierPulseTimer = null;
    cashoutAllPulseActive = false;
    cashoutAllPulseDone = false;
    cashoutAllPulseTimer = null;

    getMultiplierPulseStyle = ({ cashout = 0, isMaxWin = false } = {}) => {
        const cashoutValue = parseFloat(cashout);
        const isBigWin = !isMaxWin && Number.isFinite(cashoutValue) && cashoutValue >= 10;

        if (isMaxWin) {
            return { color: '#FFE229', shadow: '#FFE323', shadowAlpha: 0.8 };
        }
        if (isBigWin) {
            return { color: '#32DE65', shadow: '#69FF96', shadowAlpha: 0.6 };
        }
        return { color: '#28D266', shadow: null, shadowAlpha: 0 };
    }

    setMultiplierPulseColor = (color) => {
        // UNUSED CANVAS STAGE HUD
        // if (this.multiplier) this.multiplier.style.fill = color;
        // if (this.multiplierX) this.multiplierX.tint = color;
        this.setHtmlCoefficientColor(color);
    }

    setMultiplierPulseShadow = (shadowColor, alpha) => {
        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // if (!this.multiplierShadow) return;
        // if (!shadowColor) {
        //     this.multiplierShadow.visible = false;
        //     if (this.multiplierXShadow) this.multiplierXShadow.visible = false;
        //     return;
        // }
        // this.multiplierShadow.text = this.multiplier.text;
        // this.multiplierShadow.style.fontSize = this.multiplier.style.fontSize;
        // this.multiplierShadow.position.copyFrom(this.multiplier.position);
        // this.multiplierShadow.style.fill = shadowColor;
        // this.multiplierShadow.alpha = alpha;
        // this.multiplierShadow.visible = true;
        // if (this.multiplierXShadow && this.multiplierX) {
        //     this.multiplierXShadow.position.set(this.multiplierX.x, this.multiplierX.y);
        //     this.multiplierXShadow.tint = shadowColor;
        //     this.multiplierXShadow.alpha = alpha;
        //     this.multiplierXShadow.visible = true;
        // }
    }

    resetMultiplierPulseStyle = (boom = false) => {
        const color = boom ? '#FF3E5B' : '#FFFFFF';
        this.setMultiplierPulseColor(color);
        this.setMultiplierPulseShadow(null);
        const hud = this.bindHtmlHud();
        if (hud?.coeff) {
            hud.coeff.classList.remove('is-win', 'is-big-win', 'is-max-win', 'is-pulsing');
            hud.coeff.classList.toggle('is-boom', !!boom);
        }
    }

    pulseHtmlMultiplier = () => {
        const hud = this.bindHtmlHud();
        if (this.htmlMultiplierPulseTimer) {
            clearTimeout(this.htmlMultiplierPulseTimer);
            this.htmlMultiplierPulseTimer = null;
        }

        if (!hud?.coeff) {
            this.htmlMultiplierPulseTimer = setTimeout(() => {
                this.htmlMultiplierPulseTimer = null;
                this.resetMultiplierPulseStyle();
            }, 300);
            return;
        }

        hud.coeff.classList.remove('is-pulsing');
        void hud.coeff.offsetWidth;
        hud.coeff.classList.add('is-pulsing');

        this.htmlMultiplierPulseTimer = setTimeout(() => {
            this.htmlMultiplierPulseTimer = null;
            this.resetMultiplierPulseStyle();
        }, 300);
    }

    pulseMultiplier = (options = {}) => {
        if (this.cashoutAllPulseActive && this.cashoutAllPulseDone) return;

        const style = this.getMultiplierPulseStyle(options);
        this.setMultiplierPulseColor(style.color);

        const hud = this.bindHtmlHud();
        if (hud?.coeff) {
            hud.coeff.classList.remove('is-boom', 'is-win', 'is-big-win', 'is-max-win', 'is-pulsing');
            if (options.isMaxWin) hud.coeff.classList.add('is-max-win');
            else if (parseFloat(options.cashout) >= 10) hud.coeff.classList.add('is-big-win');
            else hud.coeff.classList.add('is-win');
        }

        if (this.cashoutAllPulseActive) {
            this.cashoutAllPulseDone = true;
        }

        this.pulseHtmlMultiplier();

        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.setMultiplierPulseShadow(style.shadow, style.shadowAlpha);
        // if (!this.cashoutAllPulseActive && this.multiplierPulseAnim) return;
        // if (this.multiplierPulseAnim) {
        //     this.canvas.clearCountdown(this.multiplierPulseAnim);
        //     this.multiplierPulseAnim = null;
        // }
        // const peak = 1.14;
        // const duration = 300;
        // this.multiplierPulse.scale.set(1);
        // this.multiplierPulseAnim = this.canvas.countdown((t, running) => {
        //     let scale = 1;
        //     if (t <= 0.3) scale = 1 + (peak - 1) * (t / 0.3);
        //     else scale = peak + (1 - peak) * ((t - 0.3) / 0.7);
        //     if (!running) scale = 1;
        //     this.multiplierPulse.scale.set(scale);
        //     if (!running) {
        //         this.multiplierPulseAnim = null;
        //         this.resetMultiplierPulseStyle();
        //     }
        // }, { start: 0, end: 1, time: duration });
    }

    // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
    // setMultiplierValue = (v) => {
    //     if (!this.multiplier) return;
    //     this.multiplier.text = v.toFixed(2);
    //     this.updateMultiplierPosition(v);
    // }
    setMultiplierValue = (v) => {}

    updateCashoutDom = (value) => {
        if (player.bets === undefined || player.bets === null) return;

        let collectAllTotal = 0;
        let hasCollect = false;
        for (let i = 0; i < player.bets.length; i++) {
            let bet = player.bets[i];
            let betAmount = bet.BetAmount;

            let rawAmount = formatBalance(value * betAmount);
            if (i >= 4 && player.gift.debt > 0) {
                rawAmount = formatBalance((value - 1) * player.gift.debt);
            }
            let amount = formatAmount(rawAmount, player.currency, 'formated');
            const amountElements = this.cashOutAmountElements[i]
                || (this.cashOutAmountElements[i] = document.querySelectorAll(`#button-${i} .cash-out1, #bet-${i} .cash-out1`));
            amountElements.forEach((amountElement) => {
                if (amountElement.innerHTML !== amount) {
                    amountElement.innerHTML = amount;
                }
            });

            const betButton = document.getElementById(`bet-${i}`);
            if (betButton && betButton.classList.contains('cash-out')) {
                collectAllTotal += rawAmount;
                hasCollect = true;
            }
        }

        const collectAllElement = document.getElementById('bet-all-total');
        if (collectAllElement && hasCollect) {
            const totalFormated = formatAmount(collectAllTotal, player.currency, 'formated');
            if (collectAllElement.innerHTML !== totalFormated) {
                collectAllElement.innerHTML = totalFormated;
            }
        }
    }

    _coeffDomAt = 0;

    coefficient = (value, nextValue = 1, isFinished = false) => {
        const now = performance.now();
        const minMs = window.JETX_FRAME_MS || (1000 / 60);
        if (isFinished || now - this._coeffDomAt >= minMs) {
            this._coeffDomAt = now;
            this.updateCashoutDom(value);
            this.updateHtmlCoefficient(value);
        }

        if (!this.loaded) return;

        this.setMultiplierValue(value);
        this.flySoundVolume(value);
        this.playMultiplierSounds(value);
    }

    coefficientColor = (boom = true) => {
        // UNUSED CANVAS STAGE HUD
        // if (this.multiplierPulseAnim) {
        //     this.canvas.clearCountdown(this.multiplierPulseAnim);
        //     this.multiplierPulseAnim = null;
        //     if (this.multiplierPulse) this.multiplierPulse.scale.set(1);
        // }
        if (this.htmlMultiplierPulseTimer) {
            clearTimeout(this.htmlMultiplierPulseTimer);
            this.htmlMultiplierPulseTimer = null;
        }
        this.endCashoutAllPulse();
        this.resetMultiplierPulseStyle(boom);
    }

    jetCountdown = null;
    jetSlots = (visible = true, boomValue) => {
        if (!this.loaded) {
            if (!visible) this.showHtmlFlewAway(boomValue);
            return;
        }
        let slots = this.jet.skeleton.slots;
        
        for(let slot of slots) {
            slot.color.a = visible ? 1 : 0;
        }

        if(this.jetCountdown) {
            this.canvas.clearCountdown(this.jetCountdown);
            this.jetCountdown = null;
        }

        // UNUSED CANVAS STAGE HUD (HTML stage-hud is live) — safe to delete later
        // this.flewAway.visible = !visible;

        if (!visible) {
            this.showHtmlFlewAway(boomValue);
            const reflection = this.jet.skeleton.findSlot('jet anarekl');
            if (reflection) reflection.setAttachment(null);
            const shadow = this.jet.skeleton.findSlot('jet chrdil');
            if (shadow) shadow.setAttachment(null);

            this.jetCountdown = this.canvas.countdown((value) => {
                if (this.flightPaused) return;
                this.background0.state.timeScale = value;
                this.background1.state.timeScale = value;
            }, {
                start: 1,
                end: 0,
                time: 1500,
            });
        }

        this.coefficientColor(!visible);
    }

    jetBoom = (value) => {
        if (!this.loaded) return;
        this.jetSlots(false, value);
        this.jetFly.visible = true;
        this.jetFly.state.setAnimation(0, 'Jet_FlyAway-Lose', false);
    }

    FLYER_LIMIT_MOBILE = 50;
    flyers = [];
    lastCashoutWins = [];
    cashOutAmountElements = [];

    liveFlyerCount = () => {
        let count = 0;
        const items = this.flyers || [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item && item._isFlyer && !this.canvas.isDestroyed(item)) count++;
        }
        return count;
    };

    destroyFlyerGroup = (flyer) => {
        if (!flyer) return;
        const extras = flyer._flyerExtras;
        flyer._flyerExtras = null;
        this.canvas.safeDestroy(flyer, { children: true });
        const list = this.flyers;
        if (list) {
            const fi = list.indexOf(flyer);
            if (fi !== -1) list.splice(fi, 1);
        }
        if (!extras) return;
        for (let i = 0; i < extras.length; i++) {
            const extra = extras[i];
            this.canvas.safeDestroy(extra, { children: true });
            if (list) {
                const ei = list.indexOf(extra);
                if (ei !== -1) list.splice(ei, 1);
            }
        }
    };

    removeOldestFlyer = () => {
        const items = this.flyers || [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || !item._isFlyer || this.canvas.isDestroyed(item)) continue;
            this.destroyFlyerGroup(item);
            return;
        }
    };

    cashOut = (multiplier, win, currency, current) => {
        if (!this.loaded || this.flightPaused || document.hidden || this.canvas.isDestroyed(this.jetContainer2)) return;

        let parachute = Number(multiplier) < 5;
        const winAmount = parseFloat(win) || 0;
        let name = '';
        name += (parachute ? 'Parachute_0' : 'Astronaut_0');
        name += this.canvas.getRandom(1, 2) + '_';

        const mobileLimit = typeof isMobileLikeViewport === 'function'
            ? isMobileLikeViewport()
            : !!this.game.mobile;
        if (mobileLimit && this.liveFlyerCount() >= this.FLYER_LIMIT_MOBILE) {
            const prevMax = this.lastCashoutWins.length ? Math.max(...this.lastCashoutWins) : 0;
            const wouldBeBig = this.lastCashoutWins.length === 0 || winAmount >= prevMax;
            if (!current && !wouldBeBig) return;
            this.removeOldestFlyer();
        }

        this.lastCashoutWins.push(winAmount);
        if (this.lastCashoutWins.length > 10) {
            this.lastCashoutWins.shift();
        }
        let big = winAmount >= Math.max(...this.lastCashoutWins);
        name += (current ? 'Player' : (big ? 'Top' : 'Default'));

        let x = this.canvas.getRandom(-250, 450);
        let y = this.canvas.getRandom(-50, 50);
        const parachuteScale = (current || big) ? 1.78125 : 1.5;
        let flyer = this.canvas.spine('Spine-Flyers' , {
            container: this.jetContainer2,
            x: x,
            y: y,
            zIndex: 102,
            scale: parachute ? parachuteScale : 2.5,
        });
        if (!flyer) return;

        flyer._isFlyer = true;
        const extras = [];

        flyer.state.setAnimation(0, name, false);
        if(parachute) flyer.state.timeScale = 1.3;

        if(current || big) {
            let px = -42;
            let py = -55;
            let time = 300;
            let container = new PIXI.Container();
            flyer.addSlotObject(parachute ? 'Para_EmptySlot' : 'Astro_EmptySlot', container);
            let container2 = new PIXI.Container();
            container.addChild(container2);
            container2.visible = false;
            if (parachute) {
                container2.scale.set(6.25, 6.25);
                py = -90;
                time = 300;
            } else {
                container2.scale.set(-5, -5);
            }
            let cashoutWin = this.canvas.text('CashoutWin', {
                container: container2,
                align: 'center',
                x: 2,
                y: py + 2,
                zIndex: 11,
            });
            cashoutWin.text = formatAmount(win, currency, 'cashout');

            let image = this.canvas.graphics({
                container: container2,
                color: 0xffffff,
                alpha: 1,
                x: px,
                y: py,
                width: cashoutWin.width + 20,
                height: 16,
                radius: 16,
                //stroke: { width: 1, color: '#ffffff', alpha: 1 },
                zIndex: 10,
            });
            image.x = 2 - (cashoutWin.width + 20) / 2;

            extras.push(this.canvas.setTimeout(() => {
                if (!this.canvas.isDestroyed(container2)) {
                    container2.visible = true;
                }
            }, time));
        }

        let speedX = this.canvas.getRandom(50, 100) / 15;
        let speedY = this.canvas.getRandom(50, 100) / 48;
        let countdown0 = this.canvas.countdown((value) => {
            if (this.canvas.isDestroyed(flyer)) return;
            flyer.x = x - value * speedX;
            if(parachute) flyer.y = y + value * speedY;
        }, {
            start: 0,
            end: 1000,
            time: 5000,
            delay: 0,
        });

        let countdown1 = this.canvas.countdown((value, running) => {
            if (this.canvas.isDestroyed(flyer)) return;
            flyer.alpha = value;
            if (!running) this.destroyFlyerGroup(flyer);
        }, {
            start: 1,
            end: 0,
            time: 500,
            delay: 4500,
        });

        extras.push(countdown0, countdown1);
        flyer._flyerExtras = extras;
        this.flyers.push(flyer);
        for (let i = 0; i < extras.length; i++) {
            this.flyers.push(extras[i]);
        }
    }
    cashOutClear = () => {
        // PIXI flyer dump. Call from newGame / fly() start / pauseFlightAnimation only.
        // Not from boom() or finishGame() — boom is still on screen.
        // Do not sweep timeout.container here: loader.countdown gates hideLoader popup.
        this.lastCashoutWins = [];
        try {
            if (typeof gameStats !== 'undefined' && gameStats.playersView) {
                gameStats.playersView.clearFeedParachutes();
            }
        } catch (e) {}
        const items = this.flyers || [];
        this.flyers = [];
        for (const item of items) {
            this.canvas.safeDestroy(item, { children: true });
        }
        const flyersHost = this.jetContainer2;
        if (flyersHost && !this.canvas.isDestroyed(flyersHost) && flyersHost.children && flyersHost.children.length) {
            const leftover = flyersHost.children.slice();
            for (let i = 0; i < leftover.length; i++) {
                this.canvas.safeDestroy(leftover[i], { children: true });
            }
        }
    }



    boom = (value, options = {}) => {
        const visualsOnly = options.visualsOnly === true;
        const boomValue = Number(value);
        if (Number.isFinite(boomValue) && boomValue > 0) {
            this.lastBoomValue = boomValue;
        }

        if (!visualsOnly) {
            response.start = true;
            this.game.started = false;
            this.game.boom = true;
            this.flightTicking = false;
            this.finish = true;
            if (typeof placeBetInFlight === 'number') placeBetInFlight = 0;
        }

        if (!this.loaded) {
            this.pendingVisual = { kind: 'boom', value: this.lastBoomValue ?? value };
            this.showHtmlFlewAway(this.lastBoomValue ?? value);
            if (!visualsOnly) {
                this.finishGame();
                window.parent.postMessage({ name: "finish-jetx-game" }, "*");
                gameEvent.roundEnded();
            }
            return;
        }

        this.pendingVisual = null;
        this.pauseSounds();
        this.stopFlybySounds();
        this.canvas.stopSound(12);
        this.canvas.playSound(15, 'boom');
        this.jetBoom(this.lastBoomValue ?? value);
        if (this.jet.visible) this.markAssetsReady();

        if (!visualsOnly) {
            this.finishGame();
            window.parent.postMessage({ name: "finish-jetx-game" }, "*");
            gameEvent.roundEnded();
        }
    }

    game = {
        started: false,
        boom: false,
        loader: false,
    };
    finish = false;
    fly = () => {
        if (!this.loaded) {
            if (!this.game.started || this.game.loader) {
                this.game.loader = false;
                this.game.boom = false;
                this.game.started = true;
                this.flightTicking = true;
                board.isFinnished = false;
                gameStatus();
                this.hideLoader(false);
                this.showHtmlCoefficient(graphicValue);
            }
            this.pendingVisual = { kind: 'fly', value: graphicValue, step: graphicStep };
            return;
        }

        if (!this.game.started || this.game.loader) {
            this.game.started = true;
            this.game.boom = false;
            this.game.loader = false;
            this.flightTicking = true;
            this.pendingVisual = null;
            board.isFinnished = false;
            gameStatus();
            mixpanelNewRoundFly();
            this.resetMultiplierSounds(graphicValue);

            if (this.canvas.sounds[0].item === null) {
                this.flySound(graphicStep);
            }

            this.cashOutClear();
            this.hideLoader(true);
            this.flybySoundsActive = true;
            this.showCoefficient(graphicValue);

            gameEvent.roundStarted();
            return;
        }

        if (this.flightTicking && !this.jetTrack) {
            this.pendingVisual = null;
            this.resetMultiplierSounds(graphicValue);
            if (this.canvas.sounds[0].item === null) {
                this.flySound(graphicStep);
            }
            this.hideLoader(false);
            this.flybySoundsActive = true;
            this.showCoefficient(graphicValue);
            mixpanelNewRoundFly();
            gameEvent.roundStarted();
        }
    }
    finishGame = () => {
        // Do not dump PIXI/stats here. Boom is still playing; top3 overlay
        // reads previous topWinners from startLoader after gBoard -> newGame.
        setTimeout(() => {
            GetBoard(token);
        }, 300);
    }
    newGame = () => {
        // Round-scoped dump belongs HERE, before startLoader.
        // Trigger: hub gBoard. Not boom/finishGame, not gBoard after this call.
        this.game.loader = true;
        this.game.started = false;
        this.game.boom = false;
        this.flightTicking = false;
        this.finish = false;
        gameStats.playersView.finish();
        gameStats.playersView.clear();
        this.cashOutClear();
        this.hideMaxMultiplier();

        if (!this.loaded) {
            this.pendingVisual = { kind: 'bets' };
        } else {
            this.pendingVisual = null;
        }

        this.startLoader();
        gameEvent.roundStart();
    }

    backgroundVolume = BACKGROUND_SOUND_VOLUME.default;
    flySound = (position = 0) => {
        this.pauseSounds();
        
        // this.canvas.playSound(0, `loop1`, {loop: true, volume: this.backgroundVolume});
        // this.canvas.playSound(1, `loop2`, {loop: true, volume: this.backgroundVolume});
        // this.canvas.playSound(2, `loop3`, {loop: true, volume: this.backgroundVolume});
        // this.canvas.playSound(3, `loop4`, {loop: true, volume: this.backgroundVolume});

        this.canvas.playSound(0, `loop1`, {loop: true, volume: BACKGROUND_SOUND_VOLUME.loop1});
        this.canvas.playSound(1, `loop2`, {loop: true, volume: BACKGROUND_SOUND_VOLUME.loop2});
        this.canvas.playSound(2, `loop3`, {loop: true, volume: BACKGROUND_SOUND_VOLUME.loop3});
        this.canvas.playSound(3, `loop4`, {loop: true, volume: BACKGROUND_SOUND_VOLUME.loop4});

        this.canvas.sounds[1].item.volume = 0;
        this.canvas.sounds[2].item.volume = 0;
        this.canvas.sounds[3].item.volume = 0;

        this.canvas.sounds[1].volume = 0;
        this.canvas.sounds[2].volume = 0;
        this.canvas.sounds[3].volume = 0;
    }

    pauseSounds = () => {
        this.canvas.stopSound(0);
        this.canvas.stopSound(1);
        this.canvas.stopSound(2);
        this.canvas.stopSound(3);
    }

    flybySoundsActive = false;
    stopFlybySounds = () => {
        this.flybySoundsActive = false;
        for (const index of flybySoundIndexes) {
            this.canvas.stopSound(index);
        }
    }

    flySoundVolume = (value) => {
        let flySound1 = false;
        let flySound2 = false;
        let flySound3 = false;
        if(value >= 25) { // 25
            flySound1 = true;
            flySound2 = true;
            flySound3 = true;
        } else if(value >= 10) { // 10
            flySound1 = true;
            flySound2 = true;
        } else if(value >= 2) { // 2
            flySound1 = true;
        }

        if(flySound1 && this.canvas.sounds[1].item && this.canvas.sounds[1].item.volume === 0) {
            if(this.canvas.soundBackground && this.canvas.tabActive) this.canvas.sounds[1].item.volume = this.backgroundVolume;
            this.canvas.sounds[0].volume = 0;
            this.canvas.sounds[1].volume = BACKGROUND_SOUND_VOLUME.loop2;
        }
        if(flySound2 && this.canvas.sounds[2].item && this.canvas.sounds[2].item.volume === 0) {
            if(this.canvas.soundBackground && this.canvas.tabActive) this.canvas.sounds[2].item.volume = this.backgroundVolume;
            this.canvas.sounds[1].volume = 0;
            this.canvas.sounds[2].volume = BACKGROUND_SOUND_VOLUME.loop3;
        }
        if(flySound3 && this.canvas.sounds[3].item && this.canvas.sounds[3].item.volume === 0) {
            if(this.canvas.soundBackground && this.canvas.tabActive) this.canvas.sounds[3].item.volume = this.backgroundVolume;
            this.canvas.sounds[2].volume = 0;
            this.canvas.sounds[3].volume = BACKGROUND_SOUND_VOLUME.loop4;
        }
    }
    
    multiplierSoundThresholds = [
        { value: 2, sound: 'multiplier2X' },
        { value: 5, sound: 'multiplier5X' },
        { value: 10, sound: 'multiplier10X' },
        { value: 50, sound: 'multiplier50X' },
        { value: 100, sound: 'multiplier100X' },
    ];
    playedMultiplierSounds = new Set();

    resetMultiplierSounds = (currentValue = 1) => {
        this.playedMultiplierSounds.clear();
        for (const threshold of this.multiplierSoundThresholds) {
            if (currentValue >= threshold.value) {
                this.playedMultiplierSounds.add(threshold.value);
            }
        }
    }

    playMultiplierSounds = (value) => {
        if (!this.game.started) return;
        for (const threshold of this.multiplierSoundThresholds) {
            if (value >= threshold.value && !this.playedMultiplierSounds.has(threshold.value)) {
                this.playedMultiplierSounds.add(threshold.value);
                this.canvas.playSound(11, threshold.sound);
            }
        }
    }

    promotionIcon = () => {

    }
}

(function () {
    let hidden = "hidden";

    if (hidden in document)
        document.addEventListener("visibilitychange", onchange);
    else if ((hidden = "mozHidden") in document)
        document.addEventListener("mozvisibilitychange", onchange);
    else if ((hidden = "webkitHidden") in document)
        document.addEventListener("webkitvisibilitychange", onchange);
    else if ((hidden = "msHidden") in document)
        document.addEventListener("msvisibilitychange", onchange);
    else if ("onfocusin" in document)
        document.onfocusin = document.onfocusout = onchange;
    else
        window.onpageshow = window.onpagehide
            = window.onfocus = window.onblur = onchange;

    function onchange(evt) {
        let v = "visible", h = "hidden",
            evtMap = {
                focus: v, focusin: v, pageshow: v, blur: h, focusout: h, pagehide: h
            };

        evt = evt || window.event;

        const state = evt.type in evtMap ? evtMap[evt.type] : (document[hidden] ? h : v);
        jetX.canvas.tabActive = state === v;

        if (jetX.canvas.tabActive) {
            const timeoutPopup = document.querySelector('[data-popup="timeout"]');
            if (timeoutPopup && !timeoutPopup.hidden) {
                jetX.pauseFlightAnimation();
                try { jetX.canvas.resumeFromBackground(); } catch (e) {}
                return;
            }

            try { jetX.canvas.resumeFromBackground(); } catch (e) {}
            void jetX.canvas.resumeAudioContext().then(() => {
                if (jetX.game.started) {
                    const loopSound = jetX.canvas.sounds[0] && jetX.canvas.sounds[0].item;
                    const isAppleTouch = /iPhone|iPad|iPod/i.test(navigator.userAgent)
                        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                    if (isAppleTouch || !loopSound || !loopSound.isPlaying) {
                        jetX.flySound();
                        jetX.flySoundVolume(graphicValue);
                    }
                }
                jetX.canvas.tabStatusSound(true);
            });
            jetX.jetPosition();
        } else {
            jetX.game.started = false;
            jetX.canvas.tabStatusSound(false);
            try { jetX.canvas.pauseForBackground(); } catch (e) {}
        }
    }
})();


let jetX = new GameClass();
window.jetX = jetX;

let gameEvent = new GameEvents();
gameEvent.receiveMessage();
gameEvent.onAppFrameReady();