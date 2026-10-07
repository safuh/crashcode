const PixiAnimateTicker = new PIXI.Ticker;
PixiAnimateTicker.autoStart = false;
PixiAnimateTicker.stop();
window.PixiAnimateTicker = PixiAnimateTicker;

let PixiAnimate = function(sprite) {
    let getUUID = function(){
        let dt = new Date().getTime();
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = (dt + Math.random()*16)%16 | 0;
            dt = Math.floor(dt/16);
            return (c=='x' ? r :(r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    let _animate = sprite?._animate??false;

    let update = function(deltaTimeObject) {
        if (sprite.destroyed || sprite._destroyed) {
            if (typeof sprite.animateRemoveAll === 'function') {
                sprite.animateRemoveAll();
            }
            return;
        }
        deltaTime = deltaTimeObject.deltaTime / PIXI.Ticker.targetFPMS;
        for(let animateId in sprite._animates) {
            let animate = sprite._animates[animateId];
            if(animate.animate) {
                if(animate.options?.delay) {
                    if(animate.forward > 0) {
                        let forward = Math.min(animate.forward, animate.options.delay);
                        animate.forward -= forward;
                        animate.options.delay -= forward;
                    }

                    if(animate.options.delay > 0) {
                        animate.options.delay -= deltaTime * animate.timeScale;
                        continue ;
                    }
                }

                let eases = animate.eases;
                let leftover = 0;
                let onReverse = false;
                let onLoop = false;
                let onComplete = false;
                // console.log(animate.time, deltaTime, animate.timeScale);
                
                if(animate.time < animate.options.duration) animate.time += deltaTime * animate.timeScale;

                if(animate.forward > 0) {
                    animate.time = Math.min(animate.forward, animate.options.duration);
                    animate.forward -= animate.time;
                }

                if(animate.time >= animate.options.duration) {
                    leftover = animate.time - animate.options.duration;
                    animate.time = animate.options.duration;

                    if(animate.options.reverse) {
                        onReverse = true;
                        animate.time = leftover;
                        if(!animate.options.loop) animate.options.reverse = false;

                        for (let ease of eases) {
                            reverse(ease);
                        }
                    } else if(animate.options.loop) {
                        onLoop = true;
                        animate.time = leftover;

                        for (let ease of eases) {
                            loop(ease);
                        }
                    } else {
                        onComplete = true;
                        animate.animate = false;

                        for (let ease of eases) {
                            complete(ease);
                        }
                    }
                }

                for (let ease of eases) {
                    ease.update(ease);
                }

                if(onReverse && animate.onReverse) animate.onReverse(animate.options);
                if(onLoop && animate.onLoop) animate.onLoop(animate.options);

                if(onComplete) {
                    // onComplete may destroy the sprite; ticker/registry must still drop.
                    try {
                        if (animate.onComplete) animate.onComplete(animate.options);
                        if (animate.onUpdate) animate.onUpdate(animate.options);
                    } finally {
                        nextAnimation(animateId);
                    }
                } else if (animate.onUpdate) {
                    animate.onUpdate(animate.options);
                }
            }
        }
    };

    if(!_animate) {
        sprite._animate = true;
        sprite._animates = [];

        let parentDestroy = sprite.destroy;
        sprite.destroy = function() {
            if (sprite.destroyed || sprite._destroyed) return;
            try {
                sprite.animateRemoveAll();
            } catch (e) {}
            try {
                parentDestroy.call(this);
            } catch (e) {}
        };

        sprite.animate = function(eases, options) {
            let animateId = getUUID();
            let animateEases = setEases(animateId, eases);
            if(!animateEases) return '';
            sprite._animates[animateId] = {
                options: options,
                collectedTime: 0,
                time: 0,
                forward: 0,
                timeScale: 1,
                eases: animateEases,
                animate: true,
                onComplete: null,
                onReverse: null,
                onLoop: null,
                onUpdate: null,
                ticker: PixiAnimateTicker.add(update, animateId),

                nextAnimations: [],
            };

            return animateId;
        };

        sprite.addAnimate = function(animateId, eases, options) {
            sprite._animates[animateId].nextAnimations.push({
                eases: eases,
                options: options,
            });
        };

        sprite.animatePlay = function(animateId) {
            let animate = sprite._animates[animateId];
            animate.animate = true;
        };

        sprite.animatePause = function(animateId) {
            let animate = sprite._animates[animateId];
            animate.animate = false;
        };

        sprite.animateRemove = function(animateId) {
            removeTicker(animateId);
            releaseAnimate(animateId);
        };

        sprite.animateRemoveAll = function() {
            const ids = Object.keys(sprite._animates || {});
            for (let i = 0; i < ids.length; i++) {
                sprite.animateRemove(ids[i]);
            }
        };

        sprite.animateRemoveTicker = function() {
            const ids = Object.keys(sprite._animates || {});
            for (let i = 0; i < ids.length; i++) {
                removeTicker(ids[i]);
            }
        };
    }

    let nextAnimation = function(animateId) {
        let animate = sprite._animates && sprite._animates[animateId];
        if(animate === undefined || animate === null) {
            return false;
        }

        let nextAnimations = animate.nextAnimations;
        if(nextAnimations && nextAnimations.length > 0) {
            let chained = nextAnimations.shift();
            animate.options = chained.options;
            animate.collectedTime += animate.time;
            animate.time = 0;
            animate.eases = setEases(animateId, chained.eases);
            animate.animate = true;
            animate.nextAnimations = nextAnimations;
        } else {
            removeTicker(animateId);
            releaseAnimate(animateId);
        }
    };

    let releaseAnimate = function(animateId) {
        if (!sprite._animates || sprite._animates[animateId] == null) {
            return;
        }
        const finished = sprite._animates[animateId];
        finished.onComplete = null;
        finished.onUpdate = null;
        finished.onReverse = null;
        finished.onLoop = null;
        finished.eases = null;
        finished.options = null;
        finished.nextAnimations = null;
        finished.ticker = null;
        delete sprite._animates[animateId];
    };

    let removeTicker = function(animateId) {
        let animate = sprite._animates && sprite._animates[animateId];
        if(animate === undefined || animate === null) {
            return false;
        }

        if(animate.ticker !== undefined && animate.ticker !== null) {
            try {
                animate.ticker.remove(update, animateId);
            } catch (e) {}
            animate.ticker = null;
        }
    };

    let setEases = function(animateId, eases) {
        if(sprite.transform === null) {
            return false;
        }

        let list = [];
        for (let ease in eases) {
            let name = ease;
            let value = eases[ease];

            let start, to, delta, update;

            let defaultValue = false;
            let defaultStart = 0;
            if(typeof value === 'object') {
                defaultValue = true;
                defaultStart = value.start;
                value = value.to;
            }

            switch (name) {
                case 'scaleX':
                case 'skewX':
                    name = name.substr(0, name.length - 1);
                    start = defaultValue ? defaultStart : sprite[name].x;
                    to = value;
                    delta = value - start;
                    update = ease => updateCoord(ease, animateId, name, 'x');
                    break

                case 'scaleY':
                case 'skewY':
                    name = name.substr(0, name.length - 1);
                    start = defaultValue ? defaultStart : sprite[name].y;
                    to = value;
                    delta = value - start;
                    update = ease => updateCoord(ease, animateId, name, 'y');
                    break

                case 'tint':
                case 'blend':
                    const colors = Array.isArray(value) ? value : [sprite.tint, value];
                    start = defaultValue ? defaultStart : 0;
                    to = colors.length;
                    delta = to;
                    update = (name === 'tint') ? ease => updateTint(ease, animateId, colors) : ease => updateBlend(ease, animateId, colors);
                    break

                case 'shake':
                    start = {x: (defaultValue ? defaultStart.x : sprite.x), y: (defaultValue ? defaultStart.y : sprite.y)};
                    to = value;
                    update = ease => updateShake(ease, animateId);
                    break

                case 'position':
                    start = {x: (defaultValue ? defaultStart.x : sprite.x), y: (defaultValue ? defaultStart.y : sprite.y)};
                    to = {x: value.x, y: value.y};
                    delta = {x: to.x - start.x, y: to.y - start.y};
                    update = ease => updatePosition(ease, animateId);
                    break

                case 'skew':
                case 'scale':
                    start = defaultValue ? defaultStart : sprite[name].x;
                    to = value;
                    delta = value - start;
                    update = ease => updatePoint(ease, animateId, name);
                    break

                case 'face':
                    start = defaultValue ? defaultStart : sprite.rotation;
                    to = shortestAngle(start, Math.atan2(value.y - sprite.y, value.x - sprite.x));
                    delta = to - start;
                    update = ease => updateOne(ease, animateId, 'rotation');
                    break

                default:
                    start = defaultValue ? defaultStart : sprite[name];
                    to = value;
                    delta = value - start;
                    update = ease => updateOne(ease, animateId, name);
            }

            list.push({name, update, start, to, delta});
        }
        return list;
    }

    let updateOne = function(ease, animateId, name) {
        let animate = sprite._animates[animateId];
        // console.log(`updateOne: ${name} - ${animateId}`, animate);
        
        sprite[name] = PixiAnimateEase(animate.options.ease)(animate.time, ease.start, ease.delta, animate.options.duration, animate.options.easeCustom);
    }

    let updatePoint = function(ease, animateId, name) {
        let animate = sprite._animates[animateId];
        sprite[name].x = sprite[name].y = PixiAnimateEase(animate.options.ease)(animate.time, ease.start, ease.delta, animate.options.duration, animate.options.easeCustom);
    }

    let updatePosition = function(ease, animateId) {
        let animate = sprite._animates[animateId];
        sprite.x = PixiAnimateEase(animate.options.ease)(animate.time, ease.start.x, ease.delta.x, animate.options.duration, animate.options.easeCustom);
        sprite.y = PixiAnimateEase(animate.options.ease)(animate.time, ease.start.y, ease.delta.y, animate.options.duration, animate.options.easeCustom);
    }

    let updateCoord = function(ease, animateId, name, coord) {
        let animate = sprite._animates[animateId];
        sprite[name][coord] = PixiAnimateEase(animate.options.ease)(animate.time, ease.start, ease.delta, animate.options.duration, animate.options.easeCustom);
    }

    let updateTint = function(ease, animateId, colors) {
        let animate = sprite._animates[animateId];
        let index = Math.floor(PixiAnimateEase(animate.options.ease)(animate.time, ease.start, ease.delta, animate.options.duration, animate.options.easeCustom));
        if(index === colors.length) {
            index = colors.length - 1;
        }
        sprite.tint = colors[index];
    }

    let updateBlend = function(ease, animateId, colors) {
        let animate = sprite._animates[animateId];
        const calc = PixiAnimateEase(animate.options.ease)(animate.time, ease.start, ease.delta, animate.options.duration, animate.options.easeCustom);
        let index = Math.floor(calc);
        if(index === colors.length) {
            index = colors.length - 1;
        }
        let next = index + 1;
        if(next === colors.length) {
            next = animate.options.reverse ? index - 1 : animate.options.loop ? 0 : index;
        }
        const percent = calc - index;
        const color1 = colors[index];
        const color2 = colors[next];
        const r1 = color1 >> 16;
        const g1 = color1 >> 8 & 0x0000ff;
        const b1 = color1 & 0x0000ff;
        const r2 = color2 >> 16;
        const g2 = color2 >> 8 & 0x0000ff;
        const b2 = color2 & 0x0000ff;
        const percent1 = 1 - percent;
        const r = percent1 * r1 + percent * r2;
        const g = percent1 * g1 + percent * g2;
        const b = percent1 * b1 + percent * b2;
        sprite.tint = r << 16 | g << 8 | b;
    }

    let updateShake = function(ease, animateId) {
        let animate = sprite._animates[animateId];
        function random(n)
        {
            return Math.floor(Math.random() * n) - Math.floor(n / 2)
        }
        sprite.x = ease.start.x + random(ease.to);
        sprite.y = ease.start.y + random(ease.to);
    }

    let shortestAngle = function(start, finish) {
        let mod = function(a, n) {
            return (a % n + n) % n
        }

        const PI_2 = Math.PI * 2;
        let diff = Math.abs(start - finish) % PI_2;
        diff = diff > Math.PI ? (PI_2 - diff) : diff;

        const simple = finish - start;
        const sign = mod((simple + Math.PI), PI_2) - Math.PI > 0 ? 1 : -1;

        return diff * sign;
    }

    let complete = function(ease) {
        if(ease.name === 'shake') {
            sprite.x = ease.start.x;
            sprite.y = ease.start.y;
        }
    }

    let reverse = function(ease) {
        if(ease.name === 'position') {
            const swapX = ease.to.x;
            const swapY = ease.to.y;
            ease.to.x = ease.start.x;
            ease.to.y = ease.start.y;
            ease.start.x = swapX;
            ease.start.y = swapY;
            ease.delta.x = -ease.delta.x;
            ease.delta.y = -ease.delta.y;
        } else {
            const swap = ease.to;
            ease.to = ease.start;
            ease.start = swap;
            ease.delta = -ease.delta;
        }
    }

    let loop = function(ease) {
        switch (ease.name) {
            case 'skewX':
                sprite.skew.x = ease.start;
                break
            case 'skewY':
                sprite.skew.y = ease.start;
                break
            case 'skew':
                sprite.skew.x = ease.start;
                sprite.skew.y = ease.start;
                break
            case 'scaleX':
                sprite.scale.x = ease.start;
                break
            case 'scaleY':
                sprite.scale.y = ease.start;
                break
            case 'scale':
                sprite.scale.x = ease.start;
                sprite.scale.y = ease.start;
                break
            case 'position':
                sprite.x = ease.start.x;
                sprite.y = ease.start.y;
                break
            default:
                sprite[ease.name] = ease.start;
        }
    }
};

let PixiAnimateEase = function(name = 'linear') {
    let eases = {
        linear: function(t, b, c, d) {
            return c * t / d + b;
        },
        swing: function (t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },
        easeInQuad: function(t, b, c, d) {
            return c * (t /= d) * t + b;
        },
        easeOutQuad: function(t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },
        easeInOutQuad: function(t, b, c, d) {
            if((t /= d / 2) < 1) {
                return c / 2 * t * t + b;
            } else {
                return -c / 2 * ((--t) * (t - 2) - 1) + b;
            }
        },
        easeInCubic: function(t, b, c, d) {
            return c * (t /= d) * t * t + b;
        },
        easeOutCubic: function(t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        },
        easeInOutCubic: function(t, b, c, d) {
            if((t /= d / 2) < 1) {
                return c / 2 * t * t * t + b;
            } else {
                return c / 2 * ((t -= 2) * t * t + 2) + b;
            }
        },
        easeInQuart: function(t, b, c, d) {
            return c * (t /= d) * t * t * t + b;
        },
        easeOutQuart: function(t, b, c, d) {
            return -c * ((t = t / d - 1) * t * t * t - 1) + b;
        },
        easeInOutQuart: function(t, b, c, d) {
            if((t /= d / 2) < 1) {
                return c / 2 * t * t * t * t + b;
            } else {
                return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
            }
        },
        easeInQuint: function(t, b, c, d) {
            return c * (t /= d) * t * t * t * t + b;
        },
        easeOutQuint: function(t, b, c, d) {
            return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
        },
        easeInOutQuint: function(t, b, c, d) {
            if((t /= d / 2) < 1) {
                return c / 2 * t * t * t * t * t + b;
            } else {
                return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
            }
        },
        easeInSine: function(t, b, c, d) {
            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
        },
        easeOutSine: function(t, b, c, d) {
            return c * Math.sin(t / d * (Math.PI / 2)) + b;
        },
        easeInOutSine: function(t, b, c, d) {
            return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
        },
        easeInExpo: function(t, b, c, d) {
            if(t === 0) {
                return b;
            } else {
                return c * Math.pow(2, 10 * (t / d - 1)) + b;
            }
        },
        easeOutExpo: function(t, b, c, d) {
            if(t === d) {
                return b + c;
            } else {
                return c * (-Math.pow(2, -10 * t / d) + 1) + b;
            }
        },
        easeInOutExpo: function(t, b, c, d) {
            if((t /= d / 2) < 1) {
                return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
            } else {
                return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
            }
        },
        easeInCirc: function(t, b, c, d) {
            return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
        },
        easeOutCirc: function(t, b, c, d) {
            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
        },
        easeInOutCirc: function(t, b, c, d) {
            if((t /= d / 2) < 1) {
                return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
            } else {
                return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
            }
        },
        easeInElastic: function(t, b, c, d) {
            let a, p, s;
            s = 1.70158;
            p = 0;
            a = c;
            if(t === 0) ; else if((t /= d) === 1) ;
            if(!p) {
                p = d * .3;
            }
            if(a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else {
                s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        },
        easeOutElastic: function(t, b, c, d) {
            let a, p, s;
            s = 1.70158;
            p = 0;
            a = c;
            if(t === 0) ; else if((t /= d) === 1) ;
            if(!p) {
                p = d * .3;
            }
            if(a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else {
                s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
        },
        easeInOutElastic: function(t, b, c, d) {
            let a, p, s;
            s = 1.70158;
            p = 0;
            a = c;
            if(t === 0) ; else if((t /= d / 2) === 2) ;
            if(!p) {
                p = d * (.3 * 1.5);
            }
            if(a < Math.abs(c)) {
                a = c;
                s = p / 4;
            } else {
                s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            if(t < 1) {
                return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
            } else {
                return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
            }
        },
        easeInBack: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 1.70158;
            }
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        },
        easeOutBack: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 1.70158;
            }
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
        },
        easeInOutBack: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 1.70158;
            }
            if((t /= d / 2) < 1) {
                return c / 2 * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
            } else {
                return c / 2 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
            }
        },
        easeInBackCustomLight: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 0.5;
            }
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        },
        easeOutBackCustom: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 1.10158;
            }
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
        },
        easeOutBackCustomLight: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 0.5;
            }
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
        },
        easeInOutBackCustomLight: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 0.9;
            }
            if((t /= d / 2) < 1) {
                return c / 2 * (t * t * (((s *= 1.01) + 1) * t - s)) + b;
            } else {
                return c / 2 * ((t -= 2) * t * (((s *= 1.01) + 1) * t + s) + 2) + b;
            }
        },
        easeInOutBackCustom: function(t, b, c, d, s) {
            if(s === void 0) {
                s = 1.10158;
            }
            if((t /= d / 2) < 1) {
                return c / 2 * (t * t * (((s *= 1.01) + 1) * t - s)) + b;
            } else {
                return c / 2 * ((t -= 2) * t * (((s *= 1.01) + 1) * t + s) + 2) + b;
            }
        },
        easeInBounce: function(t, b, c, d) {
            let v;
            v = eases.easeOutBounce(d - t, 0, c, d);
            return c - v + b;
        },
        easeOutBounce: function(t, b, c, d) {
            /*
            t - time
            b - start
            c - delta
            d - duration
            */
            if((t /= d) < 1 / 2.75) {
                return c * (7.5625 * t * t) + b;
            } else if(t < 2 / 2.75) {
                return c * (7.5625 * (t -= 1.5 / 2.75) * t + .75) + b;
            } else if(t < 2.5 / 2.75) {
                return c * (7.5625 * (t -= 2.25 / 2.75) * t + .9375) + b;
            } else {
                return c * (7.5625 * (t -= 2.625 / 2.75) * t + .984375) + b;
            }
        },
        easeInOutBounce: function(t, b, c, d) {
            let v;
            if(t < d / 2) {
                v = eases.easeInBounce(t * 2, 0, c, d);
                return v * .5 + b;
            } else {
                v = eases.easeOutBounce(t * 2 - d, 0, c, d);
                return v * .5 + c * .5 + b;
            }
        }
    };

    return eases[name];
};