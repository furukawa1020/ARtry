// カメラ管理クラス
class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.isInitialized = false;
        this.isSupported = false;
        this.constraints = {
            video: {
                width: { ideal: CONFIG.CAMERA.WIDTH },
                height: { ideal: CONFIG.CAMERA.HEIGHT },
                frameRate: { ideal: CONFIG.CAMERA.FRAME_RATE },
                facingMode: { ideal: "environment" } // 背面カメラを優先
            },
            audio: false
        };
        
        this.checkSupport();
    }
    
    // ブラウザサポート確認
    checkSupport() {
        this.isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        if (!this.isSupported) {
            Utils.error('getUserMedia is not supported in this browser');
            return false;
        }
        
        Utils.log('Camera support detected');
        return true;
    }
    
    // カメラ初期化
    async initialize() {
        if (!this.isSupported) {
            Utils.error('Camera not supported by browser');
            throw new Error('Camera not supported');
        }
        
        try {
            Utils.log('Requesting camera access...');
            Utils.log(`Protocol: ${location.protocol}, Hostname: ${location.hostname}`);
            
            // HTTPS確認（より詳細）
            const isSecureContext = window.isSecureContext;
            const isHTTPS = location.protocol === 'https:';
            const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            
            Utils.log(`Secure context: ${isSecureContext}, HTTPS: ${isHTTPS}, Localhost: ${isLocalhost}`);
            
            if (!isSecureContext && !isLocalhost) {
                Utils.error('Camera requires secure context (HTTPS)');
                throw new Error('HTTPS required for camera access');
            }
            
            // デバイス一覧を取得
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            Utils.log(`Found ${videoDevices.length} video devices:`, videoDevices);
            
            if (videoDevices.length === 0) {
                throw new Error('No camera devices found');
            }
            
            // カメラストリーム取得（段階的フォールバック）
            let streamObtained = false;
            let lastError = null;
            
            // 1. 背面カメラを試す
            try {
                Utils.log('Attempting to access environment camera...');
                this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
                streamObtained = true;
                Utils.log('Environment camera access successful');
            } catch (error) {
                lastError = error;
                Utils.warn('Environment camera failed:', error.name, error.message);
                
                // 2. フロントカメラを試す
                try {
                    Utils.log('Attempting to access user camera...');
                    const fallbackConstraints = {
                        video: {
                            width: { ideal: CONFIG.CAMERA.WIDTH },
                            height: { ideal: CONFIG.CAMERA.HEIGHT },
                            frameRate: { ideal: CONFIG.CAMERA.FRAME_RATE },
                            facingMode: { ideal: "user" }
                        },
                        audio: false
                    };
                    this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                    streamObtained = true;
                    Utils.log('User camera access successful');
                } catch (error2) {
                    lastError = error2;
                    Utils.warn('User camera failed:', error2.name, error2.message);
                    
                    // 3. 基本的な制約で試す
                    try {
                        Utils.log('Attempting basic camera access...');
                        const basicConstraints = { video: true, audio: false };
                        this.stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
                        streamObtained = true;
                        Utils.log('Basic camera access successful');
                    } catch (error3) {
                        lastError = error3;
                        Utils.error('All camera access attempts failed:', error3.name, error3.message);
                        throw error3;
                    }
                }
            }
            
            if (!streamObtained) {
                throw lastError || new Error('Camera access failed');
            }
            
            // video要素作成
            this.video = document.createElement('video');
            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', ''); // iOS対応
            this.video.setAttribute('autoplay', '');
            this.video.setAttribute('muted', '');
            
            // ビデオ読み込み完了を待つ
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    Utils.log(`Camera initialized: ${this.video.videoWidth}x${this.video.videoHeight}`);
                    resolve();
                };
                
                this.video.onerror = (err) => {
                    Utils.error('Video element error:', err);
                    reject(err);
                };
                
                // タイムアウト設定
                setTimeout(() => {
                    reject(new Error('Camera initialization timeout'));
                }, 10000);
            });
            
            this.isInitialized = true;
            GAME_STATE.cameraReady = true;
            
            this.updateUI();
            return true;
            
        } catch (error) {
            Utils.error('Camera initialization failed:', error);
            this.handleCameraError(error);
            throw error;
        }
    }
    
    // カメラエラー処理
    handleCameraError(error) {
        let errorMessage = 'カメラエラー';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'カメラアクセスが拒否されました。ブラウザの設定でカメラを許可してください。';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'カメラが見つかりません。デバイスにカメラが接続されているか確認してください。';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'カメラが使用中です。他のアプリを閉じてから再試行してください。';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'カメラ設定エラー。デバイスがサポートしていない解像度です。';
        } else if (error.message === 'HTTPS required for camera access') {
            errorMessage = 'カメラにはHTTPS接続が必要です。';
        }
        
        this.updateUI(errorMessage);
        
        // ユーザーガイダンス表示
        this.showCameraGuide();
        
        // フォールバック: 静的背景を使用
        this.createFallbackBackground();
    }
    
    // フォールバック背景作成
    createFallbackBackground() {
        Utils.log('Creating fallback background');
        
        // グラデーション背景のcanvas作成
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = CONFIG.CAMERA.WIDTH;
        fallbackCanvas.height = CONFIG.CAMERA.HEIGHT;
        
        const ctx = fallbackCanvas.getContext('2d');
        
        // ダークパープルグラデーション
        const gradient = ctx.createLinearGradient(0, 0, 0, fallbackCanvas.height);
        gradient.addColorStop(0, '#1a0033');
        gradient.addColorStop(0.5, '#4a0080');
        gradient.addColorStop(1, '#2d0050');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        
        // 星空効果追加
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * fallbackCanvas.width;
            const y = Math.random() * fallbackCanvas.height;
            const size = Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // video要素として設定
        this.video = fallbackCanvas;
        this.isInitialized = true;
        GAME_STATE.cameraReady = true;
        
        this.updateUI('📱 カメラ: フォールバック');
    }
    
    // UI更新
    updateUI(message = null) {
        const statusElement = document.getElementById('camera-status');
        if (statusElement) {
            if (message) {
                statusElement.textContent = message;
                statusElement.style.color = message.includes('エラー') ? '#ff6b6b' : '#fff';
            } else if (this.isInitialized) {
                statusElement.textContent = '📱 カメラ: 準備完了';
                statusElement.style.color = '#4ecdc4';
            }
        }
    }
    
    // カメラ映像を p5.js キャンバスに描画
    drawToCanvas(p5Instance) {
        if (!this.isInitialized || !this.video) return;
        
        // video要素またはcanvas要素を描画
        if (this.video.tagName === 'VIDEO') {
            // 実際のビデオストリーム
            p5Instance.image(this.video, 0, 0, p5Instance.width, p5Instance.height);
        } else {
            // フォールバック canvas
            p5Instance.image(this.video, 0, 0, p5Instance.width, p5Instance.height);
        }
    }
    
    // カメラフレームを Three.js テクスチャとして取得
    getThreeTexture() {
        if (!this.isInitialized || !this.video) return null;
        
        const texture = new THREE.VideoTexture(this.video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBFormat;
        return texture;
    }
    
    // 解像度取得
    getResolution() {
        if (!this.video) return { width: 640, height: 480 };
        
        return {
            width: this.video.videoWidth || this.video.width || 640,
            height: this.video.videoHeight || this.video.height || 480
        };
    }
    
    // カメラ切り替え（前面/背面）
    async switchCamera() {
        if (!this.isInitialized) return;
        
        try {
            // 現在の向きを確認
            const currentFacing = this.constraints.video.facingMode.ideal;
            const newFacing = currentFacing === "environment" ? "user" : "environment";
            
            Utils.log(`Switching camera from ${currentFacing} to ${newFacing}`);
            
            // 現在のストリーム停止
            this.stop();
            
            // 新しい設定で再初期化
            this.constraints.video.facingMode.ideal = newFacing;
            await this.initialize();
            
        } catch (error) {
            Utils.error('Camera switch failed:', error);
            // 元の設定に戻す
            this.constraints.video.facingMode.ideal = 
                this.constraints.video.facingMode.ideal === "environment" ? "user" : "environment";
        }
    }
    
    // リソース解放
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                Utils.log('Camera track stopped');
            });
            this.stream = null;
        }
        
        if (this.video && this.video.tagName === 'VIDEO') {
            this.video.srcObject = null;
        }
        
        this.isInitialized = false;
        GAME_STATE.cameraReady = false;
    }
    
    // パフォーマンス情報取得
    getPerformanceInfo() {
        if (!this.video || this.video.tagName !== 'VIDEO') return null;
        
        return {
            resolution: this.getResolution(),
            frameRate: this.video.getVideoPlaybackQuality ? 
                this.video.getVideoPlaybackQuality().totalVideoFrames : 'N/A'
        };
    }
    
    // カメラガイダンス表示
    showCameraGuide() {
        // UI要素での表示を優先
        const guideElement = document.getElementById('camera-guide');
        if (guideElement) {
            guideElement.innerHTML = `
                <h3>📱 カメラアクセス問題</h3>
                <p>カメラが使用できません</p>
                <div style="text-align: left; margin: 10px 0; font-size: 14px;">
                    <strong>解決方法:</strong><br>
                    • ブラウザの「許可」をタップ<br>
                    • アドレスバーのカメラアイコンをクリック<br>
                    • 他のアプリでカメラを使用していないか確認<br>
                    • ページを再読み込み
                </div>
                <button onclick="location.reload()" 
                        style="background: white; color: #C846FF; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px;">
                    再試行
                </button>
                <button onclick="skipCameraInit()" 
                        style="background: rgba(255,255,255,0.3); color: white; border: 1px solid white; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px;">
                    静的背景で続行
                </button>
            `;
            guideElement.style.display = 'block';
            return;
        }
        
        // フォールバック: アラート表示
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                const userConfirm = confirm('📱 カメラアクセスに失敗しました。\n\n• ブラウザの「許可」をクリック\n• 他のアプリでカメラを使用していないか確認\n• ページを再読み込み\n\nOK: 再試行  Cancel: 静的背景で続行');
                if (userConfirm) {
                    location.reload();
                } else if (typeof skipCameraInit === 'function') {
                    skipCameraInit();
                }
            }, 1000);
        }
    }
}