const JETX_TARGET_FPS = 60;
const JETX_FRAME_MS = 1000 / JETX_TARGET_FPS;
window.JETX_TARGET_FPS = JETX_TARGET_FPS;
window.JETX_FRAME_MS = JETX_FRAME_MS;

class CanvasClass {
    canvas = null;
    defaultContainer = null;
    info = null;
    loader = null;
    ticker = null;
    loaderCompleted = null;
    width = 0;
    height = 0;
    padding = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    canvasScale = 1;
    vertical = false;
    engineStopped = false;
    _backgroundPaused = false;
    _spineFrozen = false;
    _fpsDriverId = null;
    _fpsRunning = false;
    _fpsLastPresent = 0;
    _fpsTickers = [];

    constructor(params, loader = null, loaderCompleted = null, ticker = null) {
        this.info = params;
        this.loader = loader;
        this.loaderCompleted = loaderCompleted;
        this.ticker = ticker;

        if (this.info.mobile) {
            this.info.canvas.width = this.info.canvas.mobile.width;
            this.info.canvas.height = this.info.canvas.mobile.height;
            this.info.canvas.vertical.allow = true;
        }

        this.createCanvas(this.info);
    }

    createCanvas = async () => {
        let div = this.info.canvas.div;
        let width = this.info.canvas.width.value;
        let height = this.info.canvas.height.value;
        this.width = width;
        this.height = height;
        //PIXI.settings.SORTABLE_CHILDREN = true;

        this.canvas = new PIXI.Application();

        const isMobileCanvas = this.info.mobile || window.matchMedia('(max-width: 47.9375rem)').matches;
        const pixelRatio = window.devicePixelRatio || 1;
        const canvasResolution = isMobileCanvas ? Math.min(pixelRatio, 2) : pixelRatio;
        PIXI.TextureStyle.defaultOptions.scaleMode = 'linear';
        PIXI.sound.disableAutoPause = true;
        this.bindAudioUnlockListeners();

        await this.canvas.init({
            resizeTo: div,
            antialias: !isMobileCanvas,
            resolution: canvasResolution,
            autoDensity: true,
            backgroundAlpha: 0,
            powerPreference: isMobileCanvas ? 'low-power' : 'default',
        });

        this.guardPixiResize();

        div.prepend(this.canvas.canvas);

        let ticker = this.ticker;

        this.canvas.ticker.add((delta) => {
            if (typeof ticker === 'function') ticker(delta);
        });
        this.installFixedFpsDriver();
        this.initContainers(this.info.containers);
        this.resourceLoader();
    }

    collectFpsTickers = () => {
        const order = [];
        try { if (PIXI.Ticker?.shared) order.push(PIXI.Ticker.shared); } catch (e) {}
        try { if (window.PixiAnimateTicker) order.push(window.PixiAnimateTicker); } catch (e) {}
        try { if (PIXI.Ticker?.system) order.push(PIXI.Ticker.system); } catch (e) {}
        try { if (this.canvas?.ticker) order.push(this.canvas.ticker); } catch (e) {}
        return [...new Set(order)];
    }

    stopRafTickers = () => {
        const tickers = this._fpsTickers.length ? this._fpsTickers : this.collectFpsTickers();
        for (let i = 0; i < tickers.length; i++) {
            const t = tickers[i];
            try { t.autoStart = false; } catch (e) {}
            try { t.stop(); } catch (e) {}
        }
    }

    // Vsync-aligned 60 fps cap. PIXI tickers stay stopped (no nested rAF).
    // Skipped vsyncs return before Spine update and before render.
    installFixedFpsDriver = () => {
        this._fpsTickers = this.collectFpsTickers();
        for (let i = 0; i < this._fpsTickers.length; i++) {
            const t = this._fpsTickers[i];
            try { t.autoStart = false; } catch (e) {}
            try { t.stop(); } catch (e) {}
            if (t && typeof t.start === 'function' && !t._jetxStartPatched) {
                t._jetxStartPatched = true;
                t.start = () => {};
            }
        }
        this.startFpsDriver();
    }

    _onFpsRaf = (now) => {
        if (!this._fpsRunning) return;
        if (now - this._fpsLastPresent >= JETX_FRAME_MS) {
            this._fpsLastPresent = now;
            this.driveFrame(now);
        }
        if (this._fpsRunning) {
            this._fpsDriverId = requestAnimationFrame(this._onFpsRaf);
        }
    }

    startFpsDriver = () => {
        if (this._fpsRunning || this._backgroundPaused) return;
        this.stopRafTickers();
        const now = performance.now();
        for (let i = 0; i < this._fpsTickers.length; i++) {
            try { this._fpsTickers[i].lastTime = now; } catch (e) {}
        }
        this._fpsLastPresent = 0;
        this._fpsRunning = true;
        this._fpsDriverId = requestAnimationFrame(this._onFpsRaf);
    }

    stopFpsDriver = () => {
        this._fpsRunning = false;
        if (this._fpsDriverId != null) {
            cancelAnimationFrame(this._fpsDriverId);
            this._fpsDriverId = null;
        }
        this._fpsLastPresent = 0;
        this.stopRafTickers();
    }

    driveFrame = (now = performance.now()) => {
        if (this._backgroundPaused || !this.canvas) return;
        if (this.engineStopped) {
            try { window.PixiAnimateTicker?.update(now); } catch (e) {}
            return;
        }
        const tickers = this._fpsTickers;
        for (let i = 0; i < tickers.length; i++) {
            try { tickers[i].update(now); } catch (e) {}
        }
    }

    syncSpineAutoUpdate = (node) => {
        if (!node || this.isDestroyed(node)) return;
        if (typeof node.autoUpdate !== 'boolean' || !(node.state || node.skeleton)) return;
        const allow = !this.engineStopped && !this._backgroundPaused && !this._spineFrozen;
        const next = allow && !!node.visible;
        if (node.autoUpdate !== next) node.autoUpdate = next;
    }

    bindSpineVisibility = (spineObj) => {
        if (!spineObj || spineObj._jetxVisBound) return;
        spineObj._jetxVisBound = true;
        const canvas = this;
        let proto = Object.getPrototypeOf(spineObj);
        let desc = null;
        while (proto) {
            const d = Object.getOwnPropertyDescriptor(proto, 'visible');
            if (d && d.get && d.set) {
                desc = d;
                break;
            }
            proto = Object.getPrototypeOf(proto);
        }
        if (desc) {
            Object.defineProperty(spineObj, 'visible', {
                configurable: true,
                enumerable: true,
                get() { return desc.get.call(this); },
                set(v) {
                    desc.set.call(this, v);
                    canvas.syncSpineAutoUpdate(this);
                }
            });
        }
        canvas.syncSpineAutoUpdate(spineObj);
    }

    setSpineFrozen = (frozen) => {
        this._spineFrozen = !!frozen;
        this.setSpineAutoUpdate(!this._spineFrozen);
    }

    setSpineAutoUpdate = (on) => {
        const walk = (node) => {
            if (!node) return;
            this.syncSpineAutoUpdate(node);
            const children = node.children;
            if (children) {
                for (let i = 0; i < children.length; i++) walk(children[i]);
            }
        };
        try { walk(this.canvas?.stage); } catch (e) {}
    }

    stopEngine = () => {
        if (this.engineStopped || !this.canvas) return;
        this.engineStopped = true;
        this.setSpineAutoUpdate(false);
        this.stopRafTickers();
        if (!this._backgroundPaused) this.startFpsDriver();
    }

    startEngine = (beforeStart) => {
        if (!this.engineStopped || !this.canvas) return;
        this.engineStopped = false;
        this.setSpineAutoUpdate(true);
        try { if (typeof beforeStart === 'function') beforeStart(); } catch (e) {}
        if (!this._backgroundPaused) this.startFpsDriver();
        try { this.canvas.render(); } catch (e) {}
    }

    pauseForBackground = () => {
        if (this._backgroundPaused) return;
        this._backgroundPaused = true;
        this.stopFpsDriver();
        this.setSpineAutoUpdate(false);
        this.stopRafTickers();
        void this.suspendAudioContext();
    }

    resumeFromBackground = () => {
        if (!this._backgroundPaused) return;
        this._backgroundPaused = false;
        if (this.engineStopped) {
            this.startFpsDriver();
            return;
        }
        this.setSpineAutoUpdate(true);
        this.startFpsDriver();
        try { this.canvas.render(); } catch (e) {}
    }

    // Pixi ResizePlugin.resize() also forces render(). Nested render crashes
    // the batcher (_source). Skip same-size, block re-entrant render, then
    // paint immediately so the cleared GL buffer is not shown for a frame.
    guardPixiResize = () => {
        const app = this.canvas;
        const renderer = app?.renderer;
        if (!app || !renderer) return;

        let rendering = false;
        const originalRender = renderer.render.bind(renderer);
        const host = this;
        renderer.render = (options) => {
            if (host.engineStopped || host._backgroundPaused) return;
            if (rendering) return;
            rendering = true;
            try {
                originalRender(options);
            } catch (e) {
                if (!(e instanceof TypeError && String(e.message || '').includes('_source'))) {
                    throw e;
                }
                try {
                    if (app.stage?.renderGroup) {
                        app.stage.renderGroup.structureDidChange = true;
                    }
                } catch (_) {}
            } finally {
                rendering = false;
            }
        };

        app.resize = () => {
            const target = app._resizeTo;
            if (!target || !renderer.resize) return;
            app._cancelResize?.();

            const w = target === globalThis.window ? globalThis.innerWidth : target.clientWidth;
            const h = target === globalThis.window ? globalThis.innerHeight : target.clientHeight;
            if (w < 2 || h < 2) return;

            const screen = renderer.screen;
            if (screen && Math.round(screen.width) === w && Math.round(screen.height) === h) return;

            renderer.resize(w, h);
            if (!rendering) {
                app.render();
            }
        };
    }

    canvasWidth = () => {
        return game.canvas.width.max;
    }

    canvasHeight = () => {
        if (this.info.canvas.vertical.allow) {
            return game.canvas.vertical.height.max;
        } else if (this.info.mobile) {
            return game.canvas.mobile.height.max;
        }
        return game.canvas.height.max;
    }

    scale = () => {

    }

    itemResponsive = (item, info, imageId = '', textId = '', mode = '') => {
        if (!item) return false;
        item.x = this.getParam('x', info) + (this.getParam('responsiveX', info) || 0) * this.padding.left;
        item.y = this.getParam('y', info) + (this.getParam('responsiveY', info) || 0) * this.padding.bottom;
        item.rotation = this.getParam('rotation', info) || 0;

        let scale = this.getParam('scale', info) || 1;
        this.scaleSet(item, scale);

        this.textureResponsive(item, imageId, mode);
        this.textResponsive(item, textId);
    }

    textureResponsive = (item, imageId, mode = '') => {
        if (imageId === '') return false;

        let texture = this.info.images['Default'].texture;
        let textureName = 'Default';

        if (this.vertical && this.info.images[`Vertical${imageId}`] !== undefined) {
            textureName = `Vertical${imageId}`;
        } else if (this.info.images[imageId] !== undefined) {
            textureName = `${imageId}`;
        }

        if (this.info.images[`${textureName}${mode}`] !== undefined) {
            textureName = `${textureName}${mode}`;
        }
        texture = this.info.images[textureName].texture;

        item.texture = texture;
    }

    textResponsive = (item, textId) => {
        if (textId === '') return false;
        if (this.info.texts[textId] === undefined) return false;

        let textInfo = this.info.texts[textId];

        let multiText = textInfo.text1 !== undefined;

        if (multiText) {
            let value = item.text;
            if (this.vertical && this.info.texts[`Vertical${textId}`] !== undefined) {
                textInfo = this.info.texts[`Vertical${textId}`];
            }
            let styles = {
                style: textInfo.style,
                text1: textInfo.text1,
                text2: textInfo.text2,
            };
            for (let styleName in styles) {
                for (let styleItem in styles[styleName]) {
                    item.textStyles[styleName === 'style' ? 'default' : styleName][styleItem] = styles[styleName][styleItem];
                }
            }

            item.text = `${value} `;
            item.text = `${value}`;

            if (item.valueString) {
                let valueString = item.valueString.split('|||');
                let defaultText = this.info.texts[`${textId}`].text;
                if (this.vertical && this.info.texts[`Vertical${textId}`] !== undefined) {
                    defaultText = this.info.texts[`Vertical${textId}`].text;
                }
                item.text = defaultText.format(valueString);
            }
        } else {
            if (this.vertical && this.info.texts[`Vertical${textId}`] !== undefined) {
                textInfo = this.info.texts[`Vertical${textId}`];
            }

            let style = textInfo.style;
            for (let styleItem in style) {
                item.style[styleItem] = style[styleItem];
            }
        }
    }

    // Loader START
    staticIndex = 0;
    staticUrl = (url, common = false, counter = true, skin = '') => {
        let staticUrls = this.info.url.static.split(',');
        let staticCount = staticUrls.length;
        let staticContent = staticUrls[0];
        if (counter) {
            staticContent = staticUrls[this.staticIndex % staticCount];
            this.staticIndex++;
        }

        staticContent = staticContent.split('?')[0];
        staticContent = staticContent.replace('Sound/', '');

        if (staticContent !== '') {
            url = staticContent + url.replace('../../Content/', 'Content/');
        } else {
            url = 'http://localhost:3839/' + url.replace('../../Content/', 'Content/');
        }

        if (common) {
            url = url.replace(`/${this.info.name}/`, `/Common/`);
        }

        if (skin && skin !== '') {
            url = url.replace(`/${this.info.name}/`, `/${this.info.name}/Skin/${skin}/`);
        }

        if (this.info.mobile) {
            url = url.replace('../../Content/', '../../../Content/');
        }
        url = url.replace('/Content/Content/', '/Content/');
        return url;
    };

    resourceLoader = async () => {
        let imagesSprite = this.info.imagesSprite,
            images = this.info.images,
            sprites = this.info.sprites,
            spines = this.info.spines,
            sounds = this.info.sounds;

        function supportsWebP() {
            const canvas = document.createElement('canvas');
            if (!!(canvas.getContext && canvas.getContext('2d'))) {
                return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            }
            return false;
        }
        let webp = supportsWebP();
        mixpanelInfo.webp_supported = webp;
        mixpanelInfo.image_format = webp ? 'webp' : 'png';

        gameEvent.showLoader();

        let assets = [];
        for (let id in imagesSprite) {
            let url = this.staticUrl(this.info.url.image, false, false, imagesSprite[id].skin) + imagesSprite[id].url;
            if(webp && imagesSprite[id].webp) url = url.replace('.png', '.webp').replace('/ImagesNew/', '/ImagesNew/WebP/') ;
            assets.push({ alias: id, src:  url});
            this.loader.count += 1;
        }
        for (let id in images) {
            if (images[id].sprite !== undefined && this.ifIsSprite(images[id].sprite)) {

            } else {
                this.loader.count++;
                this.staticIndex++;
                let url = this.staticUrl(this.info.url.image, images[id].common, true, images[id].skin) + images[id].url;
                if(webp && images[id].webp) url = url.replace('.png', '.webp').replace('/ImagesNew/', '/ImagesNew/WebP/') ;
                assets.push({ alias: id, src: url });
            }
        }
        let lastSprite = '';
        for (let id in sprites) {
            this.loader.count += 1;

            if (lastSprite !== sprites[id].spriteName) {
                lastSprite = sprites[id].spriteName;
                this.staticIndex++;
            }
            let url = this.staticUrl(this.info.url.sprite, sprites[id].common, false, sprites[id].skin) + sprites[id].url;
            if(webp && sprites[id].webp) url = url.replace('.png', '.webp').replace('/ImagesNew/', '/ImagesNew/WebP/') ;
            assets.push({ alias: id, src:  url});
        }
        for (let id in spines) {
            this.loader.count += 2;
            this.staticIndex++;
            let url = this.staticUrl(this.info.url.spine, spines[id].common, true, spines[id].skin) + spines[id].url;
            if(webp && spines[id].webp) url = url.replace('.png', '.webp').replace('/ImagesNew/', '/ImagesNew/WebP/') ;
            assets.push({ alias: id, src:  url});
            if(spines[id].atlas === '') assets.push({ alias: `${id}Atlas`, src: url.replace('.json', '.atlas') });
        }

        for (let name in sounds) {
            sounds[name].sound = PIXI.sound.Sound.from({
                url: this.staticUrl(this.info.url.sound, sounds[name].common) + sounds[name].url,
                preload: sounds[name].preload
            });
        }

        this.loadAssetsWithProgress(assets);
    }

    loadAssetsWithProgress = async (assets) => {
        let imagesSprite = this.info.imagesSprite,
            images = this.info.images,
            sprites = this.info.sprites,
            spines = this.info.spines,
            sounds = this.info.sounds;
        let parent = this;
        let loaderCompleted = this.loaderCompleted;
        let loader = PIXI.Assets;

        let loadedCount = 0;
        const totalCount = assets.length;
        for (const asset of assets) {
            let textures, texture, textureName, i, frames, spriteName, soundName;
            let assetResource = await PIXI.Assets.load(asset);
            loadedCount++;
            parent.loader.progressBar(parseInt((loadedCount / totalCount) * 100));

            let key = asset.alias;
            if (key.indexOf('Spine-') >= 0) {
                if (key.indexOf('Atlas') >= 0) {
                    spines[key.replace('Atlas', '')].atlasText = assetResource;
                } else {
                    spines[key].jsonData = assetResource;
                }
            } else if (key.indexOf('SpriteImage-') >= 0) {
                textures = assetResource.textures;
                for (let textureKey in textures) {
                    texture = textures[textureKey];
                    textureName = textureKey.replaceAll('/', '');
                    if (images[textureName] !== undefined) {
                        images[textureName].texture = texture;
                    }
                }
            } else if (key.indexOf('Sprite-') >= 0) {
                spriteName = sprites[key].spriteName;
                if (sprites[spriteName] === undefined) {
                    sprites[spriteName] = { textures: [], scale: sprites[key].scale ?? 1, zIndex: sprites[key].zIndex ?? 0, x: sprites[key].x ?? 0, y: sprites[key].y ?? 0 };
                }
                textures = sprites[spriteName].textures;
                frames = assetResource._frameKeys;
                for (i = 0; i < frames.length; i++) {
                    texture = PIXI.Texture.from(frames[i]);
                    textures.push(texture)
                }
                textures.sort(function (a, b) {
                    let aSort = parseInt(a.label.replace(spriteName + '/', ''));
                    let bSort = parseInt(b.label.replace(spriteName + '/', ''));
                    return aSort - bSort
                });
                sprites[spriteName].textures = textures;
            } else if (key.indexOf('Sound-') >= 0) {
                soundName = key.replace('Sound-', '');
                sounds[soundName].sound = assetResource;
                sounds[soundName].loaded = true;
            } else {
                images[key].texture = assetResource;
            }
        }

        // for (let name in sounds) {
        //     if(!sounds[name].preload) {
        //         sounds[name].sound = PIXI.sound.Sound.from({
        //             url: this.staticUrl(this.info.url.sound, sounds[name].common) + sounds[name].url,
        //             preload: true
        //         });
        //         sounds[name].loaded = true;
        //     }
        // }

        gameEvent.hideLoader();
        gameEvent.gameReady();
        window.parent.postMessage({
            name: "loaded",
            infoOnStart: board.showGameInfoOnStart,
            soundPopup: typeof soundPopup !== 'undefined' && !!soundPopup
        }, "*");
        let isActiveBet = false;
        for (let buttonIndex = 0; buttonIndex < player.bets.length; buttonIndex++) {
            if (!$('#bet-' + buttonIndex).hasClass('place-bet')) {
                isActiveBet = true;
            }
        }
        if (!isActiveBet) window.parent.postMessage({name: "finish-jetx-game"}, "*");
        if (loaderCompleted !== null) loaderCompleted();
    }

    ifIsSprite = (name) => {
        switch (name) {
            case 'autoPlaySprite':
                return autoPlaySprite;
            case 'betsSprite':
                return betsSprite;
            case 'bonusSprite':
                return bonusSprite;
            case 'boxSprite':
                return boxSprite;
            case 'buttonsSprite':
                return buttonsSprite;
            case 'buyBonusSprite':
                return buyBonusSprite;
            case 'buyRespinSprite':
                return buyRespinSprite;
            case 'doubleSprite':
                return doubleSprite;
            case 'freeSpinSprite':
                return freeSpinSprite;
            case 'giftSprite':
                return giftSprite;
            case 'jackpotSprite':
                return jackpotSprite;
            case 'missionSprite':
                return missionSprite;
            case 'quickPlaySprite':
                return quickPlaySprite;
            case 'riskGameSprite':
                return riskGameSprite;
            case 'startSprite':
                return startSprite;
            case 'winSprite':
                return winSprite;
            default:
                return name;
        }
    }
    // Loader END

    // containers START
    containerSettings = (params) => {
        let result = {};
        result.container = null;
        result.x = params.x || 0;
        result.y = params.y || 0;
        result.zIndex = params.zIndex || 1;
        result.parent = params.parent || null;
        result.visible = params.visible ?? true;
        result.default = params.default ?? false;

        return result;
    }

    createContainer = (params) => {
        let parent = this.getParam('parent', params) || this.canvas.stage;
        let container = new PIXI.Container();
        parent.addChild(container);
        this.setParam(container, params);
        this.sortChildren(parent);

        return container;
    }

    initContainers = (containers) => {
        for (let key in containers) {
            containers[key] = this.containerSettings(containers[key]);
            if (containers[key].parent !== null) {
                containers[key].parent = containers[containers[key].parent].container;
            }
            containers[key].container = this.createContainer(containers[key]);
            if (containers[key].default) this.defaultContainer = containers[key].container;
        }

        if (this.defaultContainer !== null) {
            this.sortChildren(this.defaultContainer);
            //this.defaultContainer.sortableChildren = true;
        }
    }
    // containers END

    // Common START
    getParam = (param, params) => {
        if (params !== undefined && params !== null) {
            if (this.info.mobile && params.mobile !== undefined) {
                if (this.vertical && params.mobile.vertical !== undefined && params.mobile.vertical[param] !== undefined) {
                    return params.mobile.vertical[param];
                } else if (params.mobile[param] !== undefined) {
                    return params.mobile[param];
                }
            }
            if (params[param] !== undefined) {
                return params[param];
            }
        }
        return null;
    }

    setParam = (element, params) => {
        let notSetParams = [
            'parent',
            'container',
            'hitArea',
            'reverse',
            'animationIndex',
            'animate',
            'loop',
            'align',
            'verticalAlign',
            'button',
            'animated',
            'allow',
            'notSort',
            'mobile',
            'text',
            'reverseX',
            'reverseY',
            'valueLeft',
            'responsiveX',
            'responsiveY',
        ];

        if (params !== undefined && params !== null) {
            for (let key in params) {
                if (notSetParams.indexOf(key) === -1) {
                    let paramValue = this.getParam(key, params);

                    if (key === 'scale') {
                        if (typeof paramValue === 'object') {
                            element.scale = paramValue;
                        } else {
                            element.scale.set(paramValue);
                        }
                    } else if (key === 'scaleX') {
                        element.scale.x = paramValue;
                    } else if (key === 'scaleY') {
                        element.scale.y = paramValue;
                    } else {
                        element[key] = paramValue;
                    }
                }
            }

            let align = this.getParam('align', params) || 'left';
            let verticalAlign = this.getParam('verticalAlign', params) || 'top';
            let anchor = {
                x: align === 'left' ? 0 : (align === 'center' ? 0.5 : 1),
                y: verticalAlign === 'top' ? 0 : (verticalAlign === 'center' ? 0.5 : 1)
            };
            if (element.anchor !== undefined) element.anchor.set(anchor.x, anchor.y);

            element.rotation = this.getParam('rotation', params) || 0;

            let animated = this.getParam('animated', params) || false;
            if (animated) PixiAnimate(element);
        }
    }

    scaleSet = (element, scale) => {
        element.scale = {
            x: scale,
            y: scale
        };
    }

    sortChildren = (parent = null) => {
        // if(parent === null) return false;
        // parent.children.sort(function(a,b) {
        //     a.zIndex = a.zIndex || 0;
        //     b.zIndex = b.zIndex || 0;
        //     return a.zIndex - b.zIndex;
        // });
    }

    addChild = (element, params) => {
        let container = params?.container;
        if (this.isDestroyed(container)) return;
        container.addChild(element);
        //let notSort = this.getParam('notSort', params) || false;
        //if(!notSort) this.sortChildren(container);
    }

    destroy = (element) => {
        if (element !== null) {
            element.destroy();
        }
    }

    getRandom = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    stringToPoly = (string) => {
        let s = (string + '').split(',');
        let points = [];
        for (let i = 0; i < s.length - 1; i += 2) {
            points.push({
                x: parseInt(s[i]),
                y: parseInt(s[i + 1])
            });
        }
        points.push({
            x: parseInt(s[0]),
            y: parseInt(s[1])
        });
        return points;
    }

    isPointInPoly = (poly, ptx, pty) => {
        let c = false;
        let i, j, l;
        for (c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
            ((poly[i].y <= pty && pty < poly[j].y) || (poly[j].y <= pty && pty < poly[i].y))
                && (ptx < (poly[j].x - poly[i].x) * (pty - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                && (c = !c);
        return c;
    }

    balanceToInt = (balance) => {
        let balanceString = balance + '';
        let pointIndex = -1;
        let balanceLength = balanceString.length;
        let newBalance = '';
        let afterPoint = 0;
        for (let i = 0; i < balanceLength; i++) {
            if (balanceString[i] === '.') {
                pointIndex = i;
            } else {
                if (pointIndex !== -1) {
                    afterPoint++;
                }
                if (afterPoint > 2) {

                } else {
                    newBalance += balanceString[i];
                }
            }
        }
        if (pointIndex === -1) {
            newBalance += '00';
        } else {
            if (balanceLength - pointIndex - 1 < 2) newBalance += '0';
        }
        balance = parseInt(newBalance);
        return balance;
    }

    formatNumber = (number, isButton = false) => {
        number = this.numberToFloat(number);
        if (game.formatNumber) {
            number = this.returnFormattedNumber(number);
        } else {
            number = number.toFixed(fixedIndex);
        }
        if (isButton) {
            if (number >= 10) number = parseFloat(number);
        }
        return number;
    }

    returnFormattedNumber(n) {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: fixedIndex,
            maximumFractionDigits: 10,
        }).format(parseFloat(parseFloat(n).toFixed(fixedIndex)))
    }

    numberToFloat = (number) => {
        // number = parseFloat(number) + '';
        // let point = number.indexOf('.');
        // if(point >= 0) {
        //     let length = number.length;
        //     number = number.slice(0, point) + number.slice(point + 1, point + 3);
        //     if(length - point - 1 === 1) number += '0';
        // } else {
        //     number += '00';
        // }
        // //number *= 100;
        // number = parseInt(number);
        // number = parseFloat(number / 100);
        number = parseFloat(number);
        number *= Math.pow(10, fixedIndex);
        number = Math.round(number);
        number = parseInt(number);
        number = parseFloat(number / Math.pow(10, fixedIndex));

        return number;
    }

    balance = (number) => {
        number = parseFloat(number);
        number += '';
        number = number.substring(0, number.indexOf('.') >= 0 ? number.indexOf('.') + fixedIndex + 1 : number.length);
        number = parseFloat(number);

        return number;
    }

    visible = (element, visible, animate = true, duration = 200, delay = 0) => {
        if (element === null) return false;
        if (element.visible === visible) return false;

        let visibleAnimation = element['visibleAnimation'];
        if (visibleAnimation === undefined) {
            element.visibleAnimation = visible;
        } else if (visibleAnimation === visible) {
            return false;
        } else {
            animate = false;
        }

        element.animateRemoveAll();
        if (!animate) {
            element.visible = visible;
            delete element.visibleAnimation;
        } else {
            let alpha = visible ? 1 : 0;
            element.visible = true;
            element.alpha = visible ? 0 : 1;

            let animateId = element.animate({ alpha: alpha }, { delay: delay, duration: duration, ease: 'swing' });
            element._animates[animateId].onComplete = function () {
                element.visible = visible;
                element.animateRemoveAll();
                delete element.visibleAnimation;
            };
        }
    }

    setTimeout = (fn, time, delay = 0) => {
        let element = this.image('Default', {
            container: game.containers.timeout.container,
            x: 0,
            y: 0,
            zIndex: 1,
            animated: true,
            notSort: true,
            visible: false,
            renderable: false,
            alpha: 0,
        });
        let animate = element.animate({ x: 300 }, { delay: delay, duration: time, ease: 'linear' });
        const canvas = this;
        element._animates[animate].onComplete = function () {
            const done = element;
            element = null;
            canvas.safeDestroy(done);
            fn();
        };
        return element;
    }

    clearTimeout = (element) => {
        return this.safeDestroy(element);
    }

    countdown = (fn, params) => {
        let start = params.start ?? 0;
        let end = params.end ?? 0;
        let time = params.time ?? 0;
        let delay = params.delay ?? 0;

        let element = this.image('Default', {
            container: game.containers.timeout.container,
            x: 0,
            y: 0,
            zIndex: 1,
            animated: true,
            notSort: true,
            visible: false,
            renderable: false,
            alpha: 0,
        });

        let animate = element.animate({ x: 100 }, { delay: delay, duration: time, ease: 'linear' });
        const canvas = this;
        element._animates[animate].onComplete = function () {
            const done = element;
            element = null;
            canvas.safeDestroy(done);
            fn(end, false);
        };
        element._animates[animate].onUpdate = function () {
            if (element !== null && !element.destroyed && !element._destroyed) {
                let value = start + ((end - start) * element.x) / 100;
                fn(value, true);
            }
        };
        return element;
    }

    clearCountdown = (element) => {
        return this.safeDestroy(element);
    }

    isDestroyed = (element) => {
        return !element || element.destroyed === true || element._destroyed === true;
    }

    releaseSpineGpuData = (element) => {
        if (!element || element.renderPipeId !== 'spine') return;
        const pipe = this.canvas?.renderer?.renderPipes?.spine;
        if (!pipe) return;
        try {
            if (typeof pipe.destroyRenderable === 'function') {
                pipe.destroyRenderable(element);
            }
        } catch (e) {}
        const gpu = pipe.gpuSpineData;
        const uid = element.uid;
        if (!gpu || uid == null) return;
        const data = gpu[uid];
        if (data && data.slotBatches) {
            for (const id in data.slotBatches) {
                const slot = data.slotBatches[id];
                if (!slot) continue;
                slot.renderable = null;
                slot.data = null;
                slot._batcher = null;
                slot._batch = null;
                slot.texture = null;
                slot.positions = null;
                slot.indices = null;
                slot.uvs = null;
                slot.transform = null;
            }
        }
        delete gpu[uid];
    }

    releaseSpineSlotTexts = (element) => {
        if (!element || typeof element.removeSlotObjects !== 'function') return;
        const texts = [];
        const collect = (node) => {
            if (!node || this.isDestroyed(node)) return;
            if (typeof PIXI !== 'undefined' && PIXI.Text && node instanceof PIXI.Text) {
                texts.push(node);
            }
            const children = node.children;
            if (children && children.length) {
                for (let i = 0; i < children.length; i++) collect(children[i]);
            }
        };
        const containers = [];
        const slots = element._slotsObject;
        if (slots) {
            for (const key in slots) {
                const obj = slots[key];
                if (obj && obj.container) {
                    collect(obj.container);
                    containers.push(obj.container);
                }
            }
        }
        try { element.removeSlotObjects(); } catch (e) {}
        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            if (this.isDestroyed(text)) continue;
            try {
                if (text.parent) text.parent.removeChild(text);
                // Unique canvas-text cache (cashout amounts). Never texture:true on Spine/atlas.
                text.destroy({ texture: true, textureSource: true });
            } catch (e) {}
        }
        for (let i = 0; i < containers.length; i++) {
            const slotContainer = containers[i];
            if (this.isDestroyed(slotContainer)) continue;
            try {
                if (slotContainer.parent) slotContainer.parent.removeChild(slotContainer);
                slotContainer.destroy({ children: true });
            } catch (e) {}
        }
    }

    safeDestroy = (element, options = { children: true }) => {
        if (!element) return null;
        // Always drop SpinePipe GPU batches, even if destroy() already ran.
        // Pixi v8 can set destroyed=true without emitting the event the pipe listens to.
        this.releaseSpineGpuData(element);
        if (this.isDestroyed(element)) return null;
        try {
            // Spine autoUpdate registers on PIXI.Ticker.shared. super.destroy() can throw
            // in v8 before ticker.remove runs, which keeps the whole skeleton alive.
            this.releaseSpineSlotTexts(element);
            if (element.autoUpdate) {
                element.autoUpdate = false;
            }
            if (typeof element.animateRemoveAll === 'function') {
                for (const animateId in element._animates) {
                    const anim = element._animates[animateId];
                    if (anim) {
                        anim.onUpdate = null;
                        anim.onComplete = null;
                        anim.onReverse = null;
                        anim.onLoop = null;
                        anim.animate = false;
                    }
                }
                element.animateRemoveAll();
            }
            if (element.parent) {
                element.parent.removeChild(element);
            }
            if (!this.isDestroyed(element)) {
                element.destroy(options);
            }
        } catch (e) {
            try {
                if (element && element.autoUpdate) element.autoUpdate = false;
            } catch (e2) {}
        }
        this.releaseSpineGpuData(element);
        return null;
    }
    // Common END

    // Text START
    defaultText = () => {
        return {
            text: '',
            x: -500,
            y: -500,
            zIndex: 1,
            style: {
                fontFamily: 'IntroBlackCaps',
                fontSize: 25,
                fill: '#ffffff',
                align: 'left'
            }
        };
    }

    textFill = (elementStyle, fill) => {
        if (Array.isArray(fill)) fill = fill[0];
        elementStyle.fill = fill;
    }

    text = (id, params) => {
        let texts = this.info.texts;
        let defaultInfo = this.defaultText();

        if (texts[id] === undefined) {
            texts[id] = defaultInfo;
        }

        let textStyle = texts[id].style;
        if (params.style !== undefined) {
            textStyle = params.style;
        }

        let style = new PIXI.TextStyle(textStyle);
        let text = new PIXI.Text({ text: texts[id].text, style });
        text.defaultText = texts[id].text;

        if (params.align === undefined && style.align !== undefined) {
            params.align = style.align;
        }

        if (params.rotation === undefined && style.rotation !== undefined) {
            params.rotation = style.rotation;
        }

        this.setParam(text, params);

        this.addChild(text, params);

        return text;
    }

    multiText = (value, id, params) => {
        let texts = this.info.texts;
        let defaultInfo = this.defaultText();

        if (texts[id] === undefined) {
            texts[id] = defaultInfo;
        }

        let textStyle = texts[id].style;

        let defaultStyle = { ...texts[id].style };
        let text1 = { ...texts[id].text1 };
        let text2 = { ...texts[id].text2 };

        let newStyle = {
            'default': defaultStyle
        };
        if (JSON.stringify(text1) !== JSON.stringify({})) newStyle = { ...newStyle, text1 };
        if (JSON.stringify(text2) !== JSON.stringify({})) newStyle = { ...newStyle, text2 };

        let textValue = texts[id].text.format(value);

        let text = new MultiStyleText(textValue, newStyle);
        text.defaultText = texts[id].text;

        if (params.align === undefined && textStyle.align !== undefined) {
            params.align = textStyle.align;
        }

        if (params.rotation === undefined && textStyle.rotation !== undefined) {
            params.rotation = textStyle.rotation;
        }

        this.setParam(text, params);

        this.addChild(text, params);

        return text;
    }

    getTextInfo = (id) => {
        let texts = this.info.texts;
        let info = texts[id] || null;
        if (info === null) return info;

        if (this.vertical && info.vertical !== undefined) {
            info = texts[id].vertical;
        }

        return { x: info.x, y: info.y, style: info.style, text: info.text };
    }

    setTextInfo = (text, id, full, status) => {
        let info = this.getTextInfo(id);
        if (info !== null) {
            text.x = info.x;
            text.y = info.y;
            text.style = info.style;

            if (status === 'disabled') {
                let disabled = text.style.disabled;
                if (disabled !== undefined) {
                    for (let key in disabled) {
                        text.style[key] = disabled[key];
                    }
                }
            }

            if (full) text.text = info.text;
        }
    }
    // Text END

    // Image START
    loadTexture = (texture) => {
        return texture;
    }

    checkTexture = (id) => {
        return this.info.images[id] !== undefined;
    }

    getTextureId = (id, add = '') => {
        return this.info.images[`${id}${add}`] !== undefined ? `${id}${add}` : `${id}`;
    }

    getVerticalTextureId = (id) => {
        return this.info.images[`Vertical${id}`] !== undefined ? `Vertical${id}` : `${id}`;
    }

    getTexture = (id) => {
        return this.info.images[id] !== undefined ? this.info.images[id].texture : this.info.images['Default'].texture;
    }

    defaultImage = () => {
        return {
            x: 0,
            y: 0,
            zIndex: 1,
            texture: 'Default',
            button: false,
            image: null
        };
    }

    image = (id, params) => {
        let images = this.info.images;
        let texture;
        if (images[id] === undefined) {
            texture = images['Default'].texture;
        } else {
            texture = images[id].texture;
        }
        //PIXI.utils.TextureCache[id]

        let image = new PIXI.Sprite(texture);
        this.setParam(image, params);
        this.addChild(image, params);

        let button = this.getParam('button', params);
        let hitArea = this.getParam('hitArea', params);
        let hitAreaPolygon = this.getParam('hitAreaPolygon', params);
        if (button) {
            image.eventMode = 'static';
            image.cursor = 'pointer';

            if (hitArea !== undefined) {
                image.hitArea = new PIXI.Rectangle(hitArea.x, hitArea.y, hitArea.w, hitArea.h);
            } else if (hitAreaPolygon !== undefined) {
                image.hitArea = new PIXI.Polygon(hitAreaPolygon);
                /*
                let poly = new PIXI.Graphics()
                    .beginFill(0x00ffcc)
                    .drawPolygon(hitAreaPolygon);
                poly.defaultX = imageInfo.x;
                poly.x = imageInfo.x;
                poly.y = imageInfo.y;
                poly.zIndex = imageInfo.zIndex + 1;
                this.info.container[params.container].container.addChild(poly);
                */
            }

            let parent = this;
            image.on('pointerover', function (mouseData) {
                parent.buttonsMouseOver(this, id, mouseData);
            });
            image.on('pointerout', function (mouseData) {
                parent.buttonsMouseOut(this, id, mouseData);
            });
            image.on('pointerdown', function (mouseData) {
                parent.buttonsPointerDown(this, id, mouseData);
            });
            image.on('pointerup', function (mouseData) {
                parent.buttonsPointerUp(this, id, mouseData);
            });
        }

        return image;
    }

    buttonsMouseOver = (el, imageId, mouseData) => {

    }

    buttonsMouseOut = (el, imageId, mouseData) => {

    }

    buttonsPointerDown = (el, imageId, mouseData) => {

    }

    buttonsPointerUp = (el, imageId, mouseData) => {

    }

    buttonsAction = (id) => {
        if (['BetDisabled0', 'BetDisabled1', 'BetDisabled2', 'BetDisabled3'].indexOf(id) >= 0) return false;
        let buttons = this.info.buttons;
        let button = buttons[id];
        button.image.eventMode = 'static';
        button.image.cursor = 'pointer';

        this.buttonsHitArea(id);

        let parent = this;
        button.image.on('pointerover', function (mouseData) {
            parent.buttonsMouseOver(this, id, mouseData);
        });
        button.image.on('pointerout', function (mouseData) {
            parent.buttonsMouseOut(this, id, mouseData);
        });
        button.image.on('pointerdown', function (mouseData) {
            parent.buttonsPointerDown(this, id, mouseData);
        });
        button.image.on('pointerup', function (mouseData) {
            parent.buttonsPointerUp(this, id, mouseData);
        });
    }

    buttonsHitArea = (id) => {
        let buttons = this.info.buttons;
        let button = buttons[id];
        let hitAreaPolygon = button.hitAreaPolygon;
        if (this.vertical && button.vertical !== undefined && button.vertical.hitAreaPolygon !== undefined && button.vertical.hitAreaPolygon !== null) {
            hitAreaPolygon = button.vertical.hitAreaPolygon;
        }
        if (hitAreaPolygon !== null) {
            button.image.hitArea = new PIXI.Polygon(hitAreaPolygon);
        }
    }
    // Image END

    // Sprite START
    sprite = (id, params) => {
        let sprites = this.info.sprites;
        if (sprites[id] === undefined) return null;

        let textures = sprites[id].textures;
        if (params.reverse !== undefined && params.reverse) {
            textures = [...textures];
            textures.reverse();
        }
        let sprite = new PIXI.AnimatedSprite(textures);
        sprite.loop = false;

        if (params.animationSpeed === undefined) {
            params.animationSpeed = 0.4;
        }
        this.setParam(sprite, params);
        this.addChild(sprite, params);

        return sprite;
    }
    // Sprite END

    // Spine START
    spine = (id, params) => {
        if (this.info.spines[id] === undefined) return null;
        let atlas = this.info.spines[id].atlas !== '' ? this.info.spines[id].atlas : `${id}Atlas`;

        let data = this.info.spines[id].spineAnimations;
        let _spine = spine.Spine.from({skeleton: id, atlas: atlas});
        const parentDestroy = _spine.destroy;
        const canvas = this;
        _spine.destroy = function (options) {
            try {
                if (this.autoUpdate) this.autoUpdate = false;
            } catch (e) {}
            try {
                canvas.releaseSpineGpuData(this);
            } catch (e) {}
            try {
                return parentDestroy.call(this, options);
            } finally {
                try {
                    canvas.releaseSpineGpuData(this);
                } catch (e) {}
            }
        };

        this.bindSpineVisibility(_spine);
        this.setParam(_spine, params);
        this.addChild(_spine, params);

        // let skin = data.skins.length === 0 ? '' : data.skins[0].name;
        // if (skin !== '') _spine.skeleton.setSkinByName(skin);
        _spine.skeleton.setSlotsToSetupPose();

        let animate = params.animate ?? false;
        if (animate) {
            _spine.state.setAnimation(0, data.animations[params.animationIndex || 0].name, params.loop ?? true);
        }

        if (params.animationSpeed !== undefined) {
            _spine.state.timeScale = params.animationSpeed;
        }
        return _spine;
    }
    // Spine END

    // Graphics START
    graphics = (params) => {
        let color = this.getParam('color', params) || 0x000000;
        let alpha = this.getParam('alpha', params) || 1;
        let x = this.getParam('x', params) || 0;
        let y = this.getParam('y', params) || 0;
        let width = this.getParam('width', params) || 0;
        let height = this.getParam('height', params) || 0;
        let zIndex = this.getParam('zIndex', params) || 0;
        let radius = this.getParam('radius', params) || 0;
        let svg = this.getParam('svg', params) || null;
        let scale = this.getParam('scale', params) || 1;
        let stroke = this.getParam('stroke', params) || null;
        let circle = this.getParam('circle', params) || false;
        let startAngle = this.getParam('startAngle', params) ?? null;
        let endAngle = this.getParam('endAngle', params) ?? null;

        let graphics = new PIXI.Graphics();
        if (svg) {
            graphics.svg(svg);
        } else {
            if(circle) {
                if(startAngle != null && endAngle != null) {
                    graphics.arc(0, 0, radius, startAngle, endAngle);
                } else {
                    graphics.circle(0, 0, radius);
                }
            } else if (radius > 0) {
                graphics.roundRect(0, 0, width, height, radius);
            } else {
                graphics.rect(0, 0, width, height);
            }
            graphics.fill({ color: color, alpha: alpha });
        }
        if(stroke) {
            graphics.stroke(stroke);
        }
        graphics.x = x;
        graphics.y = y;
        graphics.zIndex = zIndex;
        graphics.scale.set(scale);

        let animated = this.getParam('animated', params) || false;
        if (animated) PixiAnimate(graphics);

        this.addChild(graphics, params);

        return graphics;
    }
    // Graphics END

    // Draw Number START
    drawImageNumber = (number, params) => {
        let container = params.container || this.defaultContainer;
        let imageName = params.imageName || '';
        let width = params.width || 40;
        let dotWidth = params.dotWidth || 20;
        let scale = params.scale || 1;
        let zIndex = params.zIndex || 1;
        let align = params.align || 'center';
        let anchor = params.anchor || 0;

        let numbers = number.toString().split('');
        let x = params.x || 0;
        let y = params.y || 0;
        let images = [];
        for (let i = 0; i < numbers.length; i++) {
            let n = numbers[i];
            if (n === '.') n = 'Dot';
            else if (n === ',') n = 'Comma';
            else if (n === 'k') n = 'K';
            else if (n === 'm') n = 'M';
            let image = this.image(`${imageName}${n}`, {
                container: container,
                x: x,
                y: y,
                zIndex: zIndex,
                scale: scale,
            });
            if (anchor) image.anchor.set(0.5, 0.5);
            if (n === 'Dot' || n === 'Comma' || n === 'K' || n === 'M') {
                x += dotWidth;
            } else {
                x += width;
            }

            images.push(image);
        }
        if (align === 'center') {
            for (let i = 0; i < numbers.length; i++) {
                images[i].x -= x / 2;
            }
        }
        return images;
    }
    // Draw Number END

    // Sound START
    //sound = !document.getElementsByClassName('game-sound-bt')[0].classList.contains('active');
    //soundBackground = !document.getElementsByClassName('game-music-bt')[0].classList.contains('active');
    sound = !visualConfig.disableSoundPopup && !soundPopup;
    soundBackground = !visualConfig.disableSoundPopup && !soundPopup;
    sounds = Array(50).fill({item: null, volume: 0, instance: null});
    soundsDefaultVolume = {};
    playSound = (soundIndex, name, params) => {
        void this.resumeAudioContext();

        let item = null;
        let itemVolume = 0;
        if (soundIndex >= 0) {
            item = this.sounds[soundIndex].item;
            itemVolume = this.sounds[soundIndex].volume;
            this.stopSound(soundIndex);
        }
        let loop = false;
        if (params !== undefined && params !== null && params.loop !== undefined) {
            loop = params.loop;
        }
        if (game.sounds[name] === undefined) {
            //console.log(name);
            return false;
        }
        let volume = game.sounds[name].volume !== undefined ? game.sounds[name].volume : 0.5;
        if (this.soundsDefaultVolume[name] !== undefined) {
            volume = this.soundsDefaultVolume[name];
        }
        if (params !== undefined && params !== null && params.volume !== undefined) {
            volume = params.volume;
        }
        let start = 0;
        if (params !== undefined && params !== null && params.start !== undefined) {
            start = params.start;
        }

        item = game.sounds[name].sound;
        itemVolume = volume;

        if (!item || typeof item.play !== 'function') {
            return false;
        }

        let instance = null;
        try {
            instance = item.play({
                volume: volume,
                loop: loop,
                start: start,
                complete: () => {

                }
            });
        } catch (e) {
            return false;
        }

        if(!this.tabActive) {
            item.volume = 0;
        } else if (typeof soundPopup !== 'undefined' && soundPopup) {
            item.volume = 0;
        } else if (soundIndex <= 3 && !this.soundBackground) {
            item.volume = 0;
        } else if (soundIndex > 3 && !this.sound) {
            item.volume = 0;
        } else {
            item.volume = volume;
        }

        // if(soundIndex === 0 && document.getElementsByClassName('game-music-bt')[0].classList.contains('active')) {
        //     item.volume = 0;
        // }

        if (soundIndex >= 0) {
            this.sounds[soundIndex] = {item: item, volume: itemVolume, instance: instance};
        }

        return item;
    }

    stopSound = (soundIndex) => {
        if (this.sounds[soundIndex].item !== null) {
            try {
                this.sounds[soundIndex].item.stop();
                this.sounds[soundIndex] = {item: null, volume: 0, instance: null};
            } catch (e) {
                console.log(soundIndex, name);
                console.log(e);
            }
        }
    }

    stopSoundItem = (soundItem) => {
        if (soundItem !== null) {
            try {
                soundItem.stop();
                soundItem = null;
            } catch (e) {

            }
        }
    }

    tabActive = true;

    suspendAudioContext = async () => {
        try {
            const soundContext = PIXI.sound && PIXI.sound.context;
            if (!soundContext) return false;
            const audioContext = soundContext.audioContext;
            if (audioContext && audioContext.state === 'running' && typeof audioContext.suspend === 'function') {
                await audioContext.suspend();
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    resumeAudioContext = async () => {
        try {
            const soundContext = PIXI.sound && PIXI.sound.context;
            if (!soundContext) return false;

            const audioContext = soundContext.audioContext;
            if (audioContext) {
                const state = audioContext.state;
                if (state === 'suspended' || state === 'interrupted') {
                    try {
                        if (state === 'interrupted' && typeof audioContext.suspend === 'function') {
                            await audioContext.suspend();
                        }
                    } catch (e) { /* ignore */ }
                    await audioContext.resume();
                }
            }

            if (soundContext.paused) {
                soundContext.paused = false;
                if (typeof soundContext.refreshPaused === 'function') {
                    soundContext.refreshPaused();
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    bindAudioUnlockListeners = () => {
        if (this._audioUnlockBound) return;
        this._audioUnlockBound = true;

        const unlock = () => {
            void this.resumeAudioContext();
        };

        document.addEventListener('touchstart', unlock, true);
        document.addEventListener('touchend', unlock, true);
        document.addEventListener('mousedown', unlock, true);
        document.addEventListener('click', unlock, true);
        window.addEventListener('pageshow', unlock);
        window.addEventListener('focus', unlock);
    }

    tabStatusSound = (active) => {
        for (let soundIndex = 0; soundIndex < this.sounds.length; soundIndex++) {
            if (this.sounds[soundIndex].item !== null) {
                let volume = this.sounds[soundIndex].volume;
                if (!active || (typeof soundPopup !== 'undefined' && soundPopup)) {
                    volume = 0;
                } else {
                    if (soundIndex <= 3 && !this.soundBackground) {
                        volume = 0;
                    } else if (soundIndex > 3 && !this.sound) {
                        volume = 0;
                    }
                }

                this.sounds[soundIndex].item.volume = volume
            }
        }
    }

    soundFade = (soundIndex, fade = true, time = 1000) => {
        return this.countdown((value) => {
            let volume = value;
            if (soundIndex === 0 && document.getElementsByClassName('game-music-bt')[0].classList.contains('active')) {
                volume = 0;
            } else if (soundIndex > 0 && !this.sound) {
                volume = 0;
            }
            this.sounds[soundIndex].item.volume = volume;
        }, {
            start: (fade ? this.sounds[soundIndex].volume : 0),
            end: (fade ? 0 : this.sounds[soundIndex].volume),
            time: time,
        });
    }
    // Sound END
}