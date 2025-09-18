// 3D描画システム（Three.js）
class ThreeDRenderer {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        
        // 3Dオブジェクト管理
        this.magicCircles = new Map();
        this.frogs = new Map();
        this.eggs = new Map();
        
        // カメラ背景
        this.cameraBackground = null;
        this.videoTexture = null;
        
        // アニメーション
        this.clock = new THREE.Clock();
        this.animationId = null;
        
        // ライティング
        this.lights = {};
        
        this.initialize();
    }
    
    // 3Dシステム初期化
    initialize() {
        try {
            // シーン作成
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a0033); // ダークパープル
            
            // カメラ設定（AR風の透視投影）
            this.camera = new THREE.PerspectiveCamera(
                75, // 視野角
                window.innerWidth / window.innerHeight, // アスペクト比
                0.1, // ニアクリップ
                1000 // ファークリップ
            );
            this.camera.position.set(0, 0, 300);
            
            // レンダラー作成
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true 
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // DOM に追加
            this.container.appendChild(this.renderer.domElement);
            
            // ライティング設定
            this.setupLighting();
            
            // リサイズイベント
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            this.isInitialized = true;
            Utils.log('3D renderer initialized');
            
            // アニメーションループ開始
            this.startRenderLoop();
            
        } catch (error) {
            Utils.error('3D initialization failed:', error);
        }
    }
    
    // ライティング設定（カメラ背景に配慮した軽量版）
    setupLighting() {
        // 環境光（非常に弱く、白っぽく）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        // 魔法的な点光源（強度を大幅に下げる）
        const magicLight = new THREE.PointLight(0xC846FF, 0.3, 300);
        magicLight.position.set(0, 100, 200);
        magicLight.castShadow = false; // 影を無効にして軽量化
        this.scene.add(magicLight);
        this.lights.magic = magicLight;
        
        // 追加の色味ライト（非常に弱く）
        const accentLight = new THREE.DirectionalLight(0x8a2be2, 0.1);
        accentLight.position.set(-100, 50, 100);
        this.scene.add(accentLight);
        this.lights.accent = accentLight;
        
        console.log('Lighting setup with reduced intensity for camera background');
    }
    
    // カメラ背景設定（背景プレーン使用）
    setCameraBackground(cameraManager) {
        console.log('setCameraBackground called:', !!cameraManager, cameraManager?.isInitialized);
        
        if (!cameraManager || !cameraManager.isInitialized) {
            // カメラが無い場合はデフォルト背景
            this.scene.background = new THREE.Color(0x1a0033);
            console.log('Using default background - no camera');
            Utils.log('Using default background - no camera');
            return;
        }
        
        try {
            // 既存の背景メッシュを削除
            if (this.cameraBackground) {
                this.scene.remove(this.cameraBackground);
                if (this.cameraBackground.geometry) this.cameraBackground.geometry.dispose();
                if (this.cameraBackground.material) this.cameraBackground.material.dispose();
            }
            
            // カメラのVideoTexture取得
            this.videoTexture = cameraManager.getThreeTexture();
            console.log('Got video texture:', !!this.videoTexture);
            
            if (this.videoTexture) {
                // シーン背景を透明に
                this.scene.background = null;
                
                // 背景プレーンを作成（カメラの視野全体をカバー）
                const aspect = window.innerWidth / window.innerHeight;
                const distance = this.camera.position.z;
                const vFOV = this.camera.fov * Math.PI / 180;
                const height = 2 * Math.tan(vFOV / 2) * distance;
                const width = height * aspect;
                
                const backgroundGeometry = new THREE.PlaneGeometry(width, height);
                const backgroundMaterial = new THREE.MeshBasicMaterial({
                    map: this.videoTexture,
                    side: THREE.FrontSide,
                    depthTest: false,
                    depthWrite: false
                });
                
                this.cameraBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
                
                // 背景を最背面に配置
                this.cameraBackground.position.z = -distance + 10;
                this.cameraBackground.renderOrder = -1000;
                
                // シーンに追加
                this.scene.add(this.cameraBackground);
                
                // テクスチャ設定
                this.videoTexture.minFilter = THREE.LinearFilter;
                this.videoTexture.magFilter = THREE.LinearFilter;
                this.videoTexture.format = THREE.RGBFormat;
                this.videoTexture.flipY = false;
                this.videoTexture.needsUpdate = true;
                
                console.log('Camera background plane created and added to scene');
                Utils.log('Camera background plane created and added to scene');
                
            } else {
                console.warn('Failed to get video texture from camera');
                Utils.warn('Failed to get video texture from camera');
                this.scene.background = new THREE.Color(0x1a0033);
            }
        } catch (error) {
            console.error('Failed to set camera background:', error);
            Utils.error('Failed to set camera background:', error);
            this.scene.background = new THREE.Color(0x1a0033);
        }
    }
    
    // 3D魔法陣作成（リアル画像テクスチャ使用）
    createMagicCircle3D(x, y, id) {
        const group = new THREE.Group();
        
        // 座標をワールド座標に変換
        const worldPos = this.screenToWorld(x, y);
        group.position.set(worldPos.x, worldPos.y, 0);
        
        // 魔法陣画像テクスチャ読み込み
        const textureLoader = new THREE.TextureLoader();
        const magicTexture = textureLoader.load('/assets/images/magic-circle_5540.jpg');
        magicTexture.wrapS = THREE.ClampToEdgeWrapping;
        magicTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // メイン魔法陣（画像テクスチャ）
        const circleGeometry = new THREE.PlaneGeometry(160, 160, 32, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({ 
            map: magicTexture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            alphaTest: 0.1
        });
        
        const magicCircle = new THREE.Mesh(circleGeometry, circleMaterial);
        magicCircle.rotation.x = -Math.PI / 2; // 地面に平行
        group.add(magicCircle);
        
        // 発光エフェクト追加
        const glowGeometry = new THREE.PlaneGeometry(180, 180);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xC846FF,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
        glowRing.rotation.x = -Math.PI / 2;
        glowRing.position.y = -0.5;
        group.add(glowRing);
        
        // パーティクルシステム
        const particles = this.createMagicParticles();
        group.add(particles);
        
        // アニメーション用データ
        group.userData = {
            type: 'magicCircle',
            createdAt: Date.now(),
            rotationSpeed: 0.02,
            pulsePhase: 0,
            opacity: 0
        };
        
        this.scene.add(group);
        this.magicCircles.set(id, group);
        
        Utils.log(`3D Magic circle created with texture at (${worldPos.x}, ${worldPos.y})`);
        return group;
    }
    
    // 六芒星シェイプ作成
    createHexagramShape() {
        const shape = new THREE.Shape();
        const size = 30;
        
        // 上向き三角形
        shape.moveTo(0, size);
        shape.lineTo(-size * 0.866, -size * 0.5);
        shape.lineTo(size * 0.866, -size * 0.5);
        shape.lineTo(0, size);
        
        // 下向き三角形（ホール）
        const hole = new THREE.Path();
        hole.moveTo(0, -size);
        hole.lineTo(size * 0.866, size * 0.5);
        hole.lineTo(-size * 0.866, size * 0.5);
        hole.lineTo(0, -size);
        
        shape.holes.push(hole);
        return shape;
    }
    
    // 魔法パーティクル作成
    createMagicParticles() {
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            // ランダム位置
            const radius = Math.random() * 60 + 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * 0.5;
            
            positions[i * 3] = radius * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(theta);
            positions[i * 3 + 2] = phi * 10;
            
            // 紫系の色
            colors[i * 3] = 0.8 + Math.random() * 0.2;     // R
            colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // G
            colors[i * 3 + 2] = 1.0;                       // B
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Points(geometry, material);
    }
    
    // 3Dカエル作成（リアルモデル）
    createFrog3D(x, y, id) {
        const group = new THREE.Group();
        
        const worldPos = this.screenToWorld(x, y);
        group.position.set(worldPos.x, worldPos.y, 0);
        
        // カエルの体（楕円体）
        const bodyGeometry = new THREE.SphereGeometry(12, 16, 12);
        bodyGeometry.scale(1, 0.6, 1.2); // 横に潰して縦長に
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4CAF50,
            shininess: 30,
            transparent: true,
            opacity: 0.95
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 8;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);
        
        // 頭部（大きめの楕円）
        const headGeometry = new THREE.SphereGeometry(10, 16, 12);
        headGeometry.scale(1.1, 1, 1.3);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x66BB6A,
            shininess: 30
        });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.set(0, 15, 5);
        headMesh.castShadow = true;
        group.add(headMesh);
        
        // 大きな目（カエルらしく突出）
        const eyeBaseGeometry = new THREE.SphereGeometry(5, 12, 12);
        const eyeBaseMaterial = new THREE.MeshPhongMaterial({ color: 0x8BC34A });
        
        const leftEyeBase = new THREE.Mesh(eyeBaseGeometry, eyeBaseMaterial);
        leftEyeBase.position.set(-7, 20, 8);
        leftEyeBase.castShadow = true;
        group.add(leftEyeBase);
        
        const rightEyeBase = new THREE.Mesh(eyeBaseGeometry, eyeBaseMaterial);
        rightEyeBase.position.set(7, 20, 8);
        rightEyeBase.castShadow = true;
        group.add(rightEyeBase);
        
        // 目玉
        const eyeGeometry = new THREE.SphereGeometry(3.5, 12, 12);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-7, 22, 10);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(7, 22, 10);
        group.add(rightEye);
        
        // 瞳（縦長楕円）
        const pupilGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        pupilGeometry.scale(1, 1.5, 1);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-7, 22, 12);
        group.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(7, 22, 12);
        group.add(rightPupil);
        
        // 前足（小さめ）
        const frontLegGeometry = new THREE.CylinderGeometry(2, 3, 8, 8);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
        
        const leftFrontLeg = new THREE.Mesh(frontLegGeometry, legMaterial);
        leftFrontLeg.position.set(-8, 4, 10);
        leftFrontLeg.rotation.z = 0.3;
        leftFrontLeg.castShadow = true;
        group.add(leftFrontLeg);
        
        const rightFrontLeg = new THREE.Mesh(frontLegGeometry, legMaterial);
        rightFrontLeg.position.set(8, 4, 10);
        rightFrontLeg.rotation.z = -0.3;
        rightFrontLeg.castShadow = true;
        group.add(rightFrontLeg);
        
        // 後足（大きめ、ジャンプ用）
        const backLegGeometry = new THREE.CylinderGeometry(3, 4, 12, 8);
        
        const leftBackLeg = new THREE.Mesh(backLegGeometry, legMaterial);
        leftBackLeg.position.set(-10, 2, -5);
        leftBackLeg.rotation.z = 0.5;
        leftBackLeg.rotation.x = -0.3;
        leftBackLeg.castShadow = true;
        group.add(leftBackLeg);
        
        const rightBackLeg = new THREE.Mesh(backLegGeometry, legMaterial);
        rightBackLeg.position.set(10, 2, -5);
        rightBackLeg.rotation.z = -0.5;
        rightBackLeg.rotation.x = -0.3;
        rightBackLeg.castShadow = true;
        group.add(rightBackLeg);
        
        // アニメーション用データ
        group.userData = {
            type: 'frog',
            createdAt: Date.now(),
            isJumping: false,
            jumpTarget: { x: worldPos.x, y: worldPos.y, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            phase: Math.random() * Math.PI * 2,
            eyeBlinkTimer: 0
        };
        
        this.scene.add(group);
        this.frogs.set(id, group);
        
        Utils.log(`Realistic 3D frog created at (${worldPos.x}, ${worldPos.y})`);
        return group;
    }
    
    // 3D卵作成（リアルモデル）
    createEgg3D(x, y, id) {
        const group = new THREE.Group();
        
        const worldPos = this.screenToWorld(x, y);
        group.position.set(worldPos.x, worldPos.y, 0);
        
        // 卵の外殻（より卵らしい形状）
        const eggGeometry = new THREE.SphereGeometry(18, 24, 24);
        eggGeometry.scale(1, 1.4, 1); // 縦長の卵形
        
        // 卵殻のマテリアル（真珠のような質感）
        const eggMaterial = new THREE.MeshPhysicalMaterial({ 
            color: 0xFFF8DC,
            roughness: 0.1,
            metalness: 0.1,
            clearcoat: 0.3,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: 0.95,
            transmission: 0.1 // 半透明効果
        });
        
        const eggMesh = new THREE.Mesh(eggGeometry, eggMaterial);
        eggMesh.castShadow = true;
        eggMesh.receiveShadow = true;
        group.add(eggMesh);
        
        // 内部の発光体（生命力を表現）
        const innerGlowGeometry = new THREE.SphereGeometry(12, 16, 16);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.2, // 透明度を下げる
            blending: THREE.AdditiveBlending
        });
        
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        group.add(innerGlow);
        
        // 魔法的なスポット模様
        for (let i = 0; i < 5; i++) {
            const spotGeometry = new THREE.SphereGeometry(2, 8, 8);
            const spotMaterial = new THREE.MeshBasicMaterial({
                color: 0xDDA0DD,
                transparent: true,
                opacity: 0.3 // 透明度を下げる
            });
            
            const spot = new THREE.Mesh(spotGeometry, spotMaterial);
            spot.position.set(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 30
            );
            group.add(spot);
        }
        
        // 内部の点光源（神秘的な光）
        const innerLight = new THREE.PointLight(0xFFD700, 0.2, 80); // 強度を大幅に下げる
        innerLight.position.set(0, 0, 0);
        group.add(innerLight);
        
        // 周囲のオーラエフェクト
        const auraGeometry = new THREE.SphereGeometry(25, 16, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0xDDA0DD,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        group.add(aura);
        
        // アニメーション用データ
        group.userData = {
            type: 'egg',
            createdAt: Date.now(),
            swayPhase: Math.random() * Math.PI * 2,
            pulsePhase: Math.random() * Math.PI * 2,
            baseY: worldPos.y,
            rotationSpeed: 0.01,
            innerGlow: innerGlow,
            aura: aura
        };
        
        this.scene.add(group);
        this.eggs.set(id, group);
        
        Utils.log(`Realistic 3D egg created at (${worldPos.x}, ${worldPos.y})`);
        return group;
    }
    
    // 座標変換（スクリーン → ワールド）
    screenToWorld(screenX, screenY) {
        const vector = new THREE.Vector3();
        
        vector.set(
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1,
            0.5
        );
        
        vector.unproject(this.camera);
        
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
        
        return pos;
    }
    
    // アニメーション更新
    updateAnimations() {
        const deltaTime = this.clock.getDelta();
        const currentTime = Date.now();
        
        // 魔法陣アニメーション
        this.magicCircles.forEach((circle, id) => {
            const data = circle.userData;
            const elapsed = currentTime - data.createdAt;
            
            if (elapsed > CONFIG.MAGIC_CIRCLE.DURATION) {
                this.removeMagicCircle(id);
                return;
            }
            
            // 回転
            circle.rotation.z += data.rotationSpeed;
            
            // パルス
            data.pulsePhase += 0.1;
            const pulse = Math.sin(data.pulsePhase) * 0.3 + 0.7;
            circle.scale.setScalar(pulse);
            
            // フェード
            const fadeProgress = Math.min(1, elapsed / 1000);
            circle.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = fadeProgress * 0.8;
                }
            });
        });
        
        // カエルアニメーション
        this.frogs.forEach((frog, id) => {
            const data = frog.userData;
            
            if (!data.isJumping && Math.random() < 0.01) {
                // ランダムジャンプ開始
                this.startFrogJump(frog);
            }
            
            if (data.isJumping) {
                this.updateFrogJump(frog, deltaTime);
            }
            
            // 体の揺れ
            data.phase += 0.1;
            frog.rotation.y = Math.sin(data.phase) * 0.2;
        });
        
        // 卵アニメーション
        this.eggs.forEach((egg, id) => {
            const data = egg.userData;
            
            // 揺れ
            data.swayPhase += 0.05;
            egg.rotation.z = Math.sin(data.swayPhase) * 0.3;
            egg.position.y = data.baseY + Math.sin(data.swayPhase * 0.7) * 3;
            
            // パルス
            data.pulsePhase += 0.08;
            const pulse = Math.sin(data.pulsePhase) * 0.2 + 0.8;
            egg.scale.setScalar(pulse);
        });
    }
    
    // カエルジャンプ開始
    startFrogJump(frog) {
        const data = frog.userData;
        const jumpDistance = 100;
        const angle = Math.random() * Math.PI * 2;
        
        data.jumpTarget = {
            x: frog.position.x + Math.cos(angle) * jumpDistance,
            y: frog.position.y + Math.sin(angle) * jumpDistance,
            z: 0
        };
        
        data.velocity = {
            x: (data.jumpTarget.x - frog.position.x) * 0.02,
            y: (data.jumpTarget.y - frog.position.y) * 0.02,
            z: 3
        };
        
        data.isJumping = true;
    }
    
    // カエルジャンプ更新
    updateFrogJump(frog, deltaTime) {
        const data = frog.userData;
        
        frog.position.x += data.velocity.x;
        frog.position.y += data.velocity.y;
        frog.position.z += data.velocity.z;
        
        // 重力
        data.velocity.z -= 0.15;
        
        // 着地判定
        if (frog.position.z <= 0) {
            frog.position.z = 0;
            data.isJumping = false;
            data.velocity.z = 0;
        }
    }
    
    // オブジェクト削除
    removeMagicCircle(id) {
        const circle = this.magicCircles.get(id);
        if (circle) {
            this.scene.remove(circle);
            this.magicCircles.delete(id);
        }
    }
    
    removeFrog(id) {
        const frog = this.frogs.get(id);
        if (frog) {
            this.scene.remove(frog);
            this.frogs.delete(id);
        }
    }
    
    removeEgg(id) {
        const egg = this.eggs.get(id);
        if (egg) {
            this.scene.remove(egg);
            this.eggs.delete(id);
        }
    }
    
    // レンダリングループ
    startRenderLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            this.updateAnimations();
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    // ウィンドウリサイズ
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 背景プレーンのサイズも更新
        if (this.cameraBackground) {
            const aspect = window.innerWidth / window.innerHeight;
            const distance = this.camera.position.z;
            const vFOV = this.camera.fov * Math.PI / 180;
            const height = 2 * Math.tan(vFOV / 2) * distance;
            const width = height * aspect;
            
            this.cameraBackground.geometry.dispose();
            this.cameraBackground.geometry = new THREE.PlaneGeometry(width, height);
        }
    }
    
    // システム破棄
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        
        this.magicCircles.clear();
        this.frogs.clear();
        this.eggs.clear();
    }
}