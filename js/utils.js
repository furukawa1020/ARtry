// ユーティリティ関数集
class Utils {
    // 線形補間
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    // イージング関数
    static easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    static easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
    
    static easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    // ランダム範囲
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // ランダム整数
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // 角度をラジアンに変換
    static toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
    
    // ラジアンを角度に変換
    static toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
    
    // 距離計算
    static distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    // 角度計算
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    // 値を範囲内に制限
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // 値を別の範囲にマップ
    static map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
    
    // 色をHEXからRGBに変換
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // RGB色をHEXに変換
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    // アルファ付き色文字列生成
    static rgba(r, g, b, a) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    // 画面座標をワールド座標に変換
    static screenToWorld(screenX, screenY, canvasWidth, canvasHeight) {
        return {
            x: Utils.map(screenX, 0, canvasWidth, -canvasWidth / 2, canvasWidth / 2),
            y: Utils.map(screenY, 0, canvasHeight, -canvasHeight / 2, canvasHeight / 2)
        };
    }
    
    // デバイス情報取得
    static getDeviceInfo() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isChrome: /Chrome/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua)
        };
    }
    
    // パフォーマンス測定
    static createPerformanceMonitor() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fps = 0;
        
        return {
            update() {
                frameCount++;
                const currentTime = performance.now();
                
                if (currentTime - lastTime >= 1000) {
                    fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
                    frameCount = 0;
                    lastTime = currentTime;
                    GAME_STATE.currentFPS = fps;
                }
                
                return fps;
            },
            getFPS() {
                return fps;
            }
        };
    }
    
    // タッチ/マウス座標正規化
    static getNormalizedPointer(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height
        };
    }
    
    // DOM要素のフェードイン/アウト
    static fadeElement(element, direction, duration = 500) {
        return new Promise((resolve) => {
            const startOpacity = direction === 'in' ? 0 : 1;
            const endOpacity = direction === 'in' ? 1 : 0;
            
            element.style.opacity = startOpacity;
            element.style.transition = `opacity ${duration}ms ease`;
            
            setTimeout(() => {
                element.style.opacity = endOpacity;
                setTimeout(resolve, duration);
            }, 10);
        });
    }
    
    // ログ出力（デバッグモード時のみ）
    static log(...args) {
        if (DEBUG.ENABLED) {
            console.log('[AR召喚]', ...args);
        }
    }
    
    static warn(...args) {
        if (DEBUG.ENABLED) {
            console.warn('[AR召喚]', ...args);
        }
    }
    
    static error(...args) {
        console.error('[AR召喚]', ...args);
    }
}