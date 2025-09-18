// メインアプリケーション
let cameraManager;
let magicCircleManager;
let frogManager;
let eggManager;
let audioManager;
let performanceMonitor;
let threeDRenderer; // 3D描画システム

// 描画モード切り替え
let use3DMode = true; // 3Dモードを有効化

// p5.js グローバル変数（2Dフォールバック用）
let canvas;
let lastFrameTime = 0;
let deltaTime = 16;

// タッチ・マウス処理
let touchStartTime = 0;
let isLongPress = false;

// パフォーマンス管理
let frameSkipCounter = 0;
let qualityLevel = 'normal'; // 'normal', 'low', 'potato'

// 初期化
function setup() {
    // 3Dモード確認
    if (use3DMode) {
        // 3D描画システム初期化
        const container = document.getElementById('container');
        threeDRenderer = new ThreeDRenderer(container);
        
        // p5.jsキャンバスは作成しない（3Dレンダラーを使用）
        Utils.log('3D mode enabled');
    } else {
        // 2Dモード（従来通り）
        canvas = createCanvas(windowWidth, windowHeight);
        canvas.parent('container');
        
        // p5.js設定
        colorMode(RGB, 255);
        imageMode(CORNER);
        
        Utils.log('2D mode enabled');
    }
    
    // デバッグ設定
    if (DEBUG.ENABLED) {
        console.log('Debug mode enabled');
    }
    
    // システム初期化
    initializeManagers();
    
    Utils.log('AR召喚システム起動完了');
}

// システム管理クラス初期化
async function initializeManagers() {
    try {
        // パフォーマンスモニター
        performanceMonitor = Utils.createPerformanceMonitor();
        
        // 音響システム
        audioManager = new AudioManager();
        
        // カメラシステム
        cameraManager = new CameraManager();
        
        // 魔法陣システム
        magicCircleManager = new MagicCircleManager();
        
        // 召喚物システム
        frogManager = new FrogManager();
        eggManager = new EggManager();
        
        // グローバル参照設定（他のクラスから使用）
        window.frogManager = frogManager;
        window.eggManager = eggManager;
        window.audioManager = audioManager;
        
        // カメラ初期化は最初のユーザーアクション後に実行
        // スマホではユーザーアクションが必要
        
        // ローディング画面非表示
        hideLoadingScreen();
        
        // パフォーマンス監視開始
        startPerformanceMonitoring();
        
        GAME_STATE.initialized = true;
        
        // ユーザーアクション待ち表示
        showCameraInitPrompt();
        
    } catch (error) {
        Utils.error('System initialization failed:', error);
        showErrorMessage('システムの初期化に失敗しました');
    }
}

// カメラ初期化
async function initializeCamera() {
    if (GAME_STATE.cameraReady) return; // 既に初期化済み
    
    try {
        await cameraManager.initialize();
        Utils.log('Camera system ready');
        updateCameraStatus('📱 カメラ: 起動中');
        
        // 3Dレンダラーにカメラ背景を設定
        if (use3DMode && threeDRenderer) {
            threeDRenderer.setCameraBackground(cameraManager);
        }
        
    } catch (error) {
        Utils.warn('Camera initialization failed, using fallback');
        updateCameraStatus('📱 カメラ: 静的背景');
        // フォールバック背景は CameraManager で自動処理される
    }
}

// カメラ初期化プロンプト表示
function showCameraInitPrompt() {
    const guide = document.getElementById('camera-guide');
    if (guide) {
        guide.innerHTML = `
            <h3>📱 AR体験を開始</h3>
            <p>カメラを使用してAR魔法陣を体験できます</p>
            <button onclick="initializeCameraFromUser()" 
                    style="background: white; color: #C846FF; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px;">
                カメラを有効化
            </button>
            <button onclick="skipCameraInit()" 
                    style="background: rgba(255,255,255,0.3); color: white; border: 1px solid white; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px;">
                スキップ（静的背景）
            </button>
        `;
        guide.style.display = 'block';
    }
}

// ユーザーアクションからカメラ初期化
async function initializeCameraFromUser() {
    const guide = document.getElementById('camera-guide');
    if (guide) guide.style.display = 'none';
    
    updateCameraStatus('📱 カメラ: 初期化中...');
    
    try {
        await initializeCamera();
        updateCameraStatus('📱 カメラ: 準備完了 ✅');
        
        // 3D背景更新を再試行
        if (use3DMode && threeDRenderer && cameraManager.isInitialized) {
            setTimeout(() => {
                threeDRenderer.setCameraBackground(cameraManager);
                Utils.log('3D camera background updated');
            }, 1000); // カメラが完全に起動するまで少し待つ
        }
        
    } catch (error) {
        Utils.error('Camera initialization from user action failed:', error);
        updateCameraStatus('📱 カメラ: 失敗 ❌');
        
        // エラーガイダンスを表示
        if (cameraManager) {
            cameraManager.showCameraGuide();
        }
    }
}

// カメラ初期化スキップ
function skipCameraInit() {
    const guide = document.getElementById('camera-guide');
    if (guide) guide.style.display = 'none';
    
    updateCameraStatus('📱 カメラ: 無効（静的背景）');
}

// ローディング画面非表示
function hideLoadingScreen() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        Utils.fadeElement(loadingElement, 'out', 500).then(() => {
            loadingElement.style.display = 'none';
        });
    }
}

// エラーメッセージ表示
function showErrorMessage(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.querySelector('.loading-text').textContent = message;
        loadingElement.querySelector('.loading-circle').style.display = 'none';
    }
}

// パフォーマンス監視開始
function startPerformanceMonitoring() {
    setInterval(() => {
        updatePerformanceUI();
        adjustQualityLevel();
    }, 1000);
}

// カメラステータス更新
function updateCameraStatus(status) {
    const statusElement = document.getElementById('camera-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
    
    // 失敗時に再試行ボタンを表示
    const retryBtn = document.getElementById('retry-camera-btn');
    if (retryBtn) {
        if (status.includes('失敗') || status.includes('❌')) {
            retryBtn.style.display = 'block';
        } else if (status.includes('準備完了') || status.includes('✅')) {
            retryBtn.style.display = 'none';
        }
    }
}

// メインループ
function draw() {
    // 3Dモードでは p5.js のdrawループは使用しない
    if (use3DMode) {
        // Three.js が独自のアニメーションループを持つ
        return;
    }
    
    // 2Dモードのみ以下を実行
    // パフォーマンス測定
    const currentTime = millis();
    deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    performanceMonitor.update();
    
    // フレームスキップ判定
    if (shouldSkipFrame()) {
        frameSkipCounter++;
        return;
    }
    
    frameSkipCounter = 0;
    
    // 背景描画
    drawBackground();
    
    // システム更新
    updateSystems(deltaTime);
    
    // システム描画
    drawSystems();
    
    // デバッグ情報
    if (DEBUG.ENABLED) {
        drawDebugInfo();
    }
}

// フレームスキップ判定
function shouldSkipFrame() {
    if (qualityLevel === 'potato' && frameCount % 2 === 0) {
        return true; // 2フレームに1回スキップ
    }
    
    if (qualityLevel === 'low' && frameCount % 3 === 0) {
        return true; // 3フレームに1回スキップ
    }
    
    return false;
}

// 背景描画
function drawBackground() {
    if (cameraManager && cameraManager.isInitialized) {
        cameraManager.drawToCanvas(window);
    } else {
        // フォールバック背景
        background(26, 0, 51); // ダークパープル
    }
}

// システム更新
function updateSystems(deltaTime) {
    // 魔法陣更新
    if (magicCircleManager) {
        magicCircleManager.update(deltaTime);
    }
    
    // 召喚物更新
    if (frogManager) {
        frogManager.update(deltaTime);
    }
    
    if (eggManager) {
        eggManager.update(deltaTime);
    }
}

// システム描画
function drawSystems() {
    // 魔法陣描画
    if (magicCircleManager) {
        magicCircleManager.draw(window);
    }
    
    // 召喚物描画
    if (frogManager) {
        frogManager.draw(window);
    }
    
    if (eggManager) {
        eggManager.draw(window);
    }
}

// タップ処理（新しいイベントシステム用）
function handleTap(x, y) {
    Utils.log(`Tap at (${x}, ${y})`);
    
    // UI効果音
    if (audioManager) {
        audioManager.playUISound();
    }
    
    // 3Dモードと2Dモードで分岐
    if (use3DMode && threeDRenderer) {
        handle3DTap(x, y);
    } else {
        handle2DTap(x, y);
    }
}

// 3Dモードのタップ処理
function handle3DTap(x, y) {
    // 卵タップチェック（3D版は省略、直接召喚へ）
    
    // 3D魔法陣生成
    const circleId = `circle_${Date.now()}_${Math.random()}`;
    threeDRenderer.createMagicCircle3D(x, y, circleId);
    
    // 魔法陣効果音
    if (audioManager) {
        audioManager.playMagicCircleSound();
    }
    
    // 3秒後に召喚
    setTimeout(() => {
        handle3DSummon(x, y);
    }, 3000);
}

// 2Dモードのタップ処理（従来）
function handle2DTap(x, y) {
    // 卵タップチェック
    if (eggManager && eggManager.handleTap(x, y)) {
        return; // 卵がタップされた場合は魔法陣を作らない
    }
    
    // 魔法陣生成
    if (magicCircleManager) {
        const circle = magicCircleManager.create(x, y, (centerX, centerY) => {
            handleSummon(centerX, centerY);
        });
        
        // 魔法陣効果音
        if (audioManager) {
            audioManager.playMagicCircleSound();
        }
    }
}

// 長押し処理
function handleLongPress(x, y) {
    Utils.log(`Long press at (${x}, ${y})`);
    
    if (use3DMode && threeDRenderer) {
        // 3D複数召喚
        for (let i = 0; i < 5; i++) {
            const offsetX = x + (Math.random() - 0.5) * 100;
            const offsetY = y + (Math.random() - 0.5) * 100;
            const frogId = `frog_${Date.now()}_${i}`;
            
            setTimeout(() => {
                threeDRenderer.createFrog3D(offsetX, offsetY, frogId);
            }, i * 200);
        }
    } else {
        // 2D複数召喚（従来）
        if (frogManager) {
            frogManager.spawnMultiple(x, y, 5);
        }
    }
    
    // カエル大合唱
    if (audioManager) {
        audioManager.playFrogChorus(5, 0.1);
    }
}

// 3D召喚処理
function handle3DSummon(x, y) {
    // ランダムで召喚物決定
    const summonType = Math.random() < 0.6 ? 'frog' : 'egg';
    const objectId = `${summonType}_${Date.now()}_${Math.random()}`;
    
    switch (summonType) {
        case 'frog':
            const count = Utils.randomInt(1, 3);
            for (let i = 0; i < count; i++) {
                const offsetX = x + (Math.random() - 0.5) * 40;
                const offsetY = y + (Math.random() - 0.5) * 40;
                const frogId = `${objectId}_${i}`;
                
                threeDRenderer.createFrog3D(offsetX, offsetY, frogId);
                
                // 効果音（少し遅延）
                if (audioManager) {
                    setTimeout(() => {
                        audioManager.playFrogSound();
                    }, i * 200);
                }
            }
            Utils.log(`Summoned ${count} 3D frogs`);
            break;
            
        case 'egg':
            threeDRenderer.createEgg3D(x, y, objectId);
            
            // 効果音
            if (audioManager) {
                audioManager.playEggHeartbeat();
            }
            
            Utils.log('Summoned 3D egg');
            break;
    }
}

// 召喚処理
function handleSummon(x, y) {
    // ランダムで召喚物決定
    const summonType = Math.random() < 0.6 ? 'frog' : 'egg';
    
    switch (summonType) {
        case 'frog':
            summonFrogs(x, y);
            break;
            
        case 'egg':
            summonEgg(x, y);
            break;
    }
}

// カエル召喚
function summonFrogs(x, y) {
    if (!frogManager) return;
    
    const count = Utils.randomInt(1, 3);
    
    for (let i = 0; i < count; i++) {
        const offsetX = x + Utils.random(-20, 20);
        const offsetY = y + Utils.random(-20, 20);
        
        frogManager.spawn(offsetX, offsetY);
        
        // 効果音（少し遅延）
        if (audioManager) {
            setTimeout(() => {
                audioManager.playFrogSound();
            }, i * 200);
        }
    }
    
    Utils.log(`Summoned ${count} frogs`);
}

// 卵召喚
function summonEgg(x, y) {
    if (!eggManager) return;
    
    eggManager.spawn(x, y);
    
    // 効果音
    if (audioManager) {
        audioManager.playEggHeartbeat();
    }
    
    Utils.log('Summoned egg');
}

// 画面サイズ変更処理
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // システムに画面サイズ変更を通知
    CONFIG.CAMERA.WIDTH = windowWidth;
    CONFIG.CAMERA.HEIGHT = windowHeight;
}

// キーボード処理（デバッグ用）
function keyPressed() {
    if (!DEBUG.ENABLED) return;
    
    switch (key) {
        case 'f':
            // フレームレート表示切り替え
            DEBUG.SHOW_FPS = !DEBUG.SHOW_FPS;
            break;
            
        case 'c':
            // 全オブジェクトクリア
            if (use3DMode && threeDRenderer) {
                // 3Dオブジェクトクリア
                threeDRenderer.magicCircles.clear();
                threeDRenderer.frogs.clear();
                threeDRenderer.eggs.clear();
                threeDRenderer.scene.children = threeDRenderer.scene.children.filter(child => 
                    !['magicCircle', 'frog', 'egg'].includes(child.userData?.type)
                );
            } else {
                // 2Dオブジェクトクリア
                if (frogManager) frogManager.clear();
                if (eggManager) eggManager.clear();
                if (magicCircleManager) magicCircleManager.clear();
            }
            break;
            
        case 'm':
            // 音響切り替え
            if (audioManager) {
                audioManager.setEnabled(!audioManager.isEnabled);
            }
            break;
            
        case 'q':
            // 品質レベル切り替え
            switchQualityLevel();
            break;
            
        case '3':
            // 3D/2Dモード切り替え
            toggle3DMode();
            break;
    }
}

// 3D/2Dモード切り替え
function toggle3DMode() {
    use3DMode = !use3DMode;
    
    if (use3DMode) {
        // 3Dモードに切り替え
        if (canvas) {
            canvas.remove();
        }
        
        const container = document.getElementById('container');
        threeDRenderer = new ThreeDRenderer(container);
        
        Utils.log('Switched to 3D mode');
    } else {
        // 2Dモードに切り替え
        if (threeDRenderer) {
            threeDRenderer.destroy();
        }
        
        canvas = createCanvas(windowWidth, windowHeight);
        canvas.parent('container');
        
        Utils.log('Switched to 2D mode');
    }
}

// パフォーマンスUI更新
function updatePerformanceUI() {
    const fps = performanceMonitor.getFPS();
    
    if (DEBUG.SHOW_FPS) {
        const perfElement = document.getElementById('performance');
        if (perfElement) {
            perfElement.textContent = `⚡ FPS: ${fps}`;
            
            // FPSに応じて色変更
            if (fps < 20) {
                perfElement.style.color = '#ff6b6b';
            } else if (fps < 30) {
                perfElement.style.color = '#ffd93d';
            } else {
                perfElement.style.color = '#4ecdc4';
            }
        }
    }
}

// 品質レベル自動調整
function adjustQualityLevel() {
    const fps = performanceMonitor.getFPS();
    const deviceInfo = Utils.getDeviceInfo();
    
    if (CONFIG.PERFORMANCE.QUALITY_AUTO_ADJUST) {
        if (fps < CONFIG.PERFORMANCE.LOW_FPS_THRESHOLD) {
            if (qualityLevel === 'normal') {
                qualityLevel = 'low';
                Utils.log('Quality downgraded to LOW');
            } else if (qualityLevel === 'low') {
                qualityLevel = 'potato';
                Utils.log('Quality downgraded to POTATO');
            }
        } else if (fps > 35 && qualityLevel !== 'normal') {
            qualityLevel = 'normal';
            Utils.log('Quality upgraded to NORMAL');
        }
    }
    
    GAME_STATE.performance = qualityLevel;
}

// 品質レベル手動切り替え
function switchQualityLevel() {
    const levels = ['normal', 'low', 'potato'];
    const currentIndex = levels.indexOf(qualityLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    
    qualityLevel = levels[nextIndex];
    GAME_STATE.performance = qualityLevel;
    
    Utils.log(`Quality level switched to: ${qualityLevel.toUpperCase()}`);
}

// デバッグ情報描画
function drawDebugInfo() {
    if (!DEBUG.SHOW_OBJECT_COUNT && !DEBUG.SHOW_TOUCH_POINTS) return;
    
    push();
    
    // デバッグテキスト設定
    fill(255, 255, 0);
    textSize(12);
    textAlign(LEFT);
    
    let yOffset = 100;
    
    if (DEBUG.SHOW_OBJECT_COUNT) {
        const frogCount = frogManager ? frogManager.getActiveCount() : 0;
        const eggCount = eggManager ? eggManager.getActiveCount() : 0;
        const circleCount = magicCircleManager ? magicCircleManager.getActiveCount() : 0;
        
        text(`Frogs: ${frogCount}`, 10, yOffset);
        text(`Eggs: ${eggCount}`, 10, yOffset + 15);
        text(`Circles: ${circleCount}`, 10, yOffset + 30);
        text(`Quality: ${qualityLevel}`, 10, yOffset + 45);
        text(`Frame skips: ${frameSkipCounter}`, 10, yOffset + 60);
    }
    
    if (DEBUG.SHOW_TOUCH_POINTS) {
        // 最後のタッチポイント表示
        fill(255, 0, 0, 150);
        noStroke();
        ellipse(mouseX, mouseY, 20, 20);
    }
    
    pop();
}

// アプリケーション終了処理
function beforeUnload() {
    // リソース解放
    if (cameraManager) {
        cameraManager.stop();
    }
    
    if (audioManager) {
        audioManager.destroy();
    }
    
    Utils.log('Application cleanup completed');
}

// イベントリスナー設定
window.addEventListener('beforeunload', beforeUnload);

// マウス・タッチイベント設定
function setupEventListeners() {
    const container = document.getElementById('container');
    if (!container) return;
    
    // タッチイベント（スマホ対応）
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // マウスイベント（PC対応）
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    
    // タッチ座標を正規化
    function getNormalizedCoordinates(event) {
        const rect = container.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.touches) {
            // タッチイベント
            clientX = event.touches[0]?.clientX || event.changedTouches[0]?.clientX;
            clientY = event.touches[0]?.clientY || event.changedTouches[0]?.clientY;
        } else {
            // マウスイベント
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    function handleTouchStart(event) {
        event.preventDefault();
        touchStartTime = Date.now();
        isLongPress = false;
        
        const coords = getNormalizedCoordinates(event);
        
        // 長押し判定用タイマー
        setTimeout(() => {
            if (touchStartTime > 0) {
                isLongPress = true;
                handleLongPress(coords.x, coords.y);
            }
        }, 800);
    }
    
    function handleTouchEnd(event) {
        event.preventDefault();
        const touchDuration = Date.now() - touchStartTime;
        touchStartTime = 0;
        
        if (!isLongPress && touchDuration < 800) {
            const coords = getNormalizedCoordinates(event);
            handleTap(coords.x, coords.y);
        }
    }
    
    function handleMouseDown(event) {
        touchStartTime = Date.now();
        isLongPress = false;
        
        const coords = getNormalizedCoordinates(event);
        
        // 長押し判定用タイマー
        setTimeout(() => {
            if (touchStartTime > 0) {
                isLongPress = true;
                handleLongPress(coords.x, coords.y);
            }
        }, 800);
    }
    
    function handleMouseUp(event) {
        const touchDuration = Date.now() - touchStartTime;
        touchStartTime = 0;
        
        if (!isLongPress && touchDuration < 800) {
            const coords = getNormalizedCoordinates(event);
            handleTap(coords.x, coords.y);
        }
    }
}

// システム初期化後にイベントリスナー設定
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// サービスワーカー登録（オフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                Utils.log('ServiceWorker registered');
            })
            .catch(error => {
                Utils.log('ServiceWorker registration failed');
            });
    });
}

// PWA対応
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    Utils.log('PWA install prompt available');
});

// エクスポート（他のファイルから使用可能）
window.handleTap = handleTap;
window.handleSummon = handleSummon;