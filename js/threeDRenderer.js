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
    
    // ライティング設定
    setupLighting() {
        // 環境光（全体の基本照明）
        const ambientLight = new THREE.AmbientLight(0x4a0080, 0.3);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        // 魔法的な点光源
        const magicLight = new THREE.PointLight(0xC846FF, 1.0, 500);
        magicLight.position.set(0, 100, 200);
        magicLight.castShadow = true;
        magicLight.shadow.mapSize.width = 1024;
        magicLight.shadow.mapSize.height = 1024;
        this.scene.add(magicLight);
        this.lights.magic = magicLight;
        
        // 追加の色味ライト
        const accentLight = new THREE.DirectionalLight(0x8a2be2, 0.5);
        accentLight.position.set(-100, 50, 100);
        this.scene.add(accentLight);
        this.lights.accent = accentLight;
    }
    
    // 3D魔法陣作成
    createMagicCircle3D(x, y, id) {
        const group = new THREE.Group();
        
        // 座標をワールド座標に変換
        const worldPos = this.screenToWorld(x, y);
        group.position.set(worldPos.x, worldPos.y, 0);
        
        // メインの円盤
        const circleGeometry = new THREE.RingGeometry(40, 80, 32);
        const circleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xC846FF,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
        group.add(circleMesh);
        
        // 六芒星（3D押し出し）
        const starShape = this.createHexagramShape();
        const starGeometry = new THREE.ExtrudeGeometry(starShape, {
            depth: 2,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 2,
            bevelSize: 1,
            bevelThickness: 1
        });
        const starMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xC846FF,
            transparent: true,
            opacity: 0.9,
            emissive: 0x4a0080,
            emissiveIntensity: 0.3
        });
        const starMesh = new THREE.Mesh(starGeometry, starMaterial);
        starMesh.position.z = 1;
        group.add(starMesh);
        
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
        
        Utils.log(`3D Magic circle created at (${worldPos.x}, ${worldPos.y})`);
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
    
    // 3Dカエル作成
    createFrog3D(x, y, id) {
        const group = new THREE.Group();
        
        const worldPos = this.screenToWorld(x, y);
        group.position.set(worldPos.x, worldPos.y, 0);
        
        // ボディ（楕円体）
        const bodyGeometry = new THREE.SphereGeometry(15, 16, 12);
        bodyGeometry.scale(1, 0.8, 1.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00FF88,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);
        
        // 目（2個）
        const eyeGeometry = new THREE.SphereGeometry(4, 8, 8);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-6, 8, 10);
        leftEye.castShadow = true;
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(6, 8, 10);
        rightEye.castShadow = true;
        group.add(rightEye);
        
        // 瞳
        const pupilGeometry = new THREE.SphereGeometry(2, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-6, 8, 12);
        group.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(6, 8, 12);
        group.add(rightPupil);
        
        // アニメーション用データ
        group.userData = {
            type: 'frog',
            createdAt: Date.now(),
            isJumping: false,
            jumpTarget: { x: worldPos.x, y: worldPos.y, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            phase: Math.random() * Math.PI * 2
        };
        
        this.scene.add(group);
        this.frogs.set(id, group);
        
        return group;
    }
    
    // 3D卵作成
    createEgg3D(x, y, id) {
        const group = new THREE.Group();
        
        const worldPos = this.screenToWorld(x, y);
        group.position.set(worldPos.x, worldPos.y, 0);
        
        // 卵の形状（楕円体）
        const eggGeometry = new THREE.SphereGeometry(20, 16, 16);
        eggGeometry.scale(1, 1.3, 1);
        
        const eggMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xFFE4B5,
            transparent: true,
            opacity: 0.95,
            emissive: 0x332211,
            emissiveIntensity: 0.1
        });
        
        const eggMesh = new THREE.Mesh(eggGeometry, eggMaterial);
        eggMesh.castShadow = true;
        eggMesh.receiveShadow = true;
        group.add(eggMesh);
        
        // 内部の光
        const innerLight = new THREE.PointLight(0xFFD700, 0.5, 50);
        innerLight.position.set(0, 0, 0);
        group.add(innerLight);
        
        // アニメーション用データ
        group.userData = {
            type: 'egg',
            createdAt: Date.now(),
            swayPhase: Math.random() * Math.PI * 2,
            pulsePhase: Math.random() * Math.PI * 2,
            baseY: worldPos.y
        };
        
        this.scene.add(group);
        this.eggs.set(id, group);
        
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