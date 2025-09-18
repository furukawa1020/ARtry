// カエルクラス
class Frog {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.z = 0;
        this.targetX = x;
        this.targetY = y;
        this.size = CONFIG.FROG.SIZE;
        this.isActive = true;
        this.isJumping = false;
        
        // 生存時間
        this.createdAt = Date.now();
        this.lifetime = CONFIG.FROG.LIFETIME;
        
        // アニメーション
        this.opacity = 0;
        this.rotation = Utils.random(0, Math.PI * 2);
        this.phase = Utils.random(0, Math.PI * 2);
        this.scale = 0;
        
        // ジャンプパラメータ
        this.jumpProgress = 0;
        this.jumpStartTime = 0;
        this.jumpDuration = CONFIG.FROG.JUMP_DURATION;
        this.jumpHeight = CONFIG.FROG.JUMP_HEIGHT;
        
        // 色とアニメーション
        this.baseColor = Utils.hexToRgb(CONFIG.FROG.COLOR);
        this.currentColor = { ...this.baseColor };
        this.blinkPhase = Utils.random(0, Math.PI * 2);
        
        // 移動パターン
        this.movePattern = Utils.randomInt(0, 2); // 0: ランダム, 1: 円形, 2: 往復
        this.moveTimer = 0;
        this.moveInterval = Utils.random(2000, 4000);
        
        // 物理
        this.velocity = { x: 0, y: 0, z: 0 };
        this.gravity = 0.8;
        
        this.startSpawnAnimation();
        
        Utils.log(`Frog spawned at (${x}, ${y})`);
    }
    
    // スポーンアニメーション開始
    startSpawnAnimation() {
        this.spawnStartTime = Date.now();
        this.spawnDuration = 600;
    }
    
    // 更新
    update(deltaTime) {
        if (!this.isActive) return false;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.createdAt;
        
        // 生存時間チェック
        if (elapsed > this.lifetime) {
            this.startDespawn();
            return false;
        }
        
        // スポーンアニメーション
        if (currentTime - this.spawnStartTime < this.spawnDuration) {
            this.updateSpawnAnimation(currentTime);
        } else {
            this.opacity = 1;
            this.scale = 1;
        }
        
        // ジャンプアニメーション
        if (this.isJumping) {
            this.updateJump(currentTime);
        }
        
        // 移動AI
        this.updateMovement(currentTime);
        
        // アニメーション更新
        this.updateAnimations(deltaTime);
        
        // 画面境界チェック
        this.checkBounds();
        
        return true;
    }
    
    // スポーンアニメーション更新
    updateSpawnAnimation(currentTime) {
        const progress = (currentTime - this.spawnStartTime) / this.spawnDuration;
        const easedProgress = Utils.easeOutBounce(progress);
        
        this.opacity = progress;
        this.scale = easedProgress;
        
        // 光る効果
        const flash = Math.sin(progress * Math.PI * 8) * 0.3;
        this.currentColor = {
            r: this.baseColor.r + flash * 100,
            g: this.baseColor.g + flash * 100,
            b: this.baseColor.b + flash * 50
        };
    }
    
    // ジャンプアニメーション更新
    updateJump(currentTime) {
        this.jumpProgress = (currentTime - this.jumpStartTime) / this.jumpDuration;
        
        if (this.jumpProgress >= 1) {
            // ジャンプ完了
            this.isJumping = false;
            this.x = this.targetX;
            this.y = this.targetY;
            this.z = 0;
            this.jumpProgress = 0;
        } else {
            // 放物線移動
            const easedProgress = Utils.easeInOutSine(this.jumpProgress);
            
            this.x = Utils.lerp(this.startX, this.targetX, easedProgress);
            this.y = Utils.lerp(this.startY, this.targetY, easedProgress);
            
            // 高さの計算（放物線）
            const heightProgress = Math.sin(this.jumpProgress * Math.PI);
            this.z = heightProgress * this.jumpHeight;
            
            // ジャンプ中の回転
            this.rotation = this.jumpProgress * Math.PI * 2;
        }
    }
    
    // 移動AI更新
    updateMovement(currentTime) {
        if (this.isJumping) return;
        
        this.moveTimer += 16; // deltaTime想定
        
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.moveInterval = Utils.random(2000, 4000);
            this.startNewJump();
        }
    }
    
    // 新しいジャンプ開始
    startNewJump() {
        if (this.isJumping) return;
        
        this.startX = this.x;
        this.startY = this.y;
        
        // 移動パターンに応じて目標地点決定
        switch (this.movePattern) {
            case 0: // ランダム移動
                this.targetX = this.x + Utils.random(-CONFIG.FROG.JUMP_DISTANCE, CONFIG.FROG.JUMP_DISTANCE);
                this.targetY = this.y + Utils.random(-CONFIG.FROG.JUMP_DISTANCE, CONFIG.FROG.JUMP_DISTANCE);
                break;
                
            case 1: // 円形移動
                const angle = Utils.random(0, Math.PI * 2);
                const distance = Utils.random(50, CONFIG.FROG.JUMP_DISTANCE);
                this.targetX = this.x + Math.cos(angle) * distance;
                this.targetY = this.y + Math.sin(angle) * distance;
                break;
                
            case 2: // 往復移動
                const direction = Math.sin(Date.now() * 0.001) > 0 ? 1 : -1;
                this.targetX = this.x + direction * CONFIG.FROG.JUMP_DISTANCE;
                this.targetY = this.y + Utils.random(-30, 30);
                break;
        }
        
        // 画面内に制限
        this.clampTargetToBounds();
        
        this.isJumping = true;
        this.jumpStartTime = Date.now();
        this.jumpDuration = Utils.random(800, 1400);
        this.jumpHeight = Utils.random(CONFIG.FROG.JUMP_HEIGHT * 0.7, CONFIG.FROG.JUMP_HEIGHT * 1.3);
        
        Utils.log(`Frog jumping to (${this.targetX.toFixed(1)}, ${this.targetY.toFixed(1)})`);
    }
    
    // 目標位置を画面内に制限
    clampTargetToBounds() {
        const margin = this.size;
        this.targetX = Utils.clamp(this.targetX, margin, window.innerWidth - margin);
        this.targetY = Utils.clamp(this.targetY, margin, window.innerHeight - margin);
    }
    
    // アニメーション更新
    updateAnimations(deltaTime) {
        this.phase += 0.1;
        this.blinkPhase += 0.15;
        
        // 色の変化
        if (!this.isJumping) {
            const pulse = Math.sin(this.phase) * 0.1;
            this.currentColor = {
                r: this.baseColor.r + pulse * 30,
                g: this.baseColor.g + pulse * 20,
                b: this.baseColor.b + pulse * 10
            };
        }
    }
    
    // 画面境界チェック
    checkBounds() {
        const margin = this.size * 2;
        
        if (this.x < -margin || this.x > window.innerWidth + margin ||
            this.y < -margin || this.y > window.innerHeight + margin) {
            this.startDespawn();
        }
    }
    
    // 消滅開始
    startDespawn() {
        this.isActive = false;
        Utils.log('Frog despawned');
    }
    
    // 描画（p5.js用）
    draw(p5Instance) {
        if (!this.isActive || this.opacity <= 0) return;
        
        p5Instance.push();
        p5Instance.translate(this.x, this.y - this.z);
        p5Instance.scale(this.scale);
        p5Instance.rotate(this.rotation);
        
        // 影の描画
        this.drawShadow(p5Instance);
        
        // メインボディ
        this.drawBody(p5Instance);
        
        // 目
        this.drawEyes(p5Instance);
        
        // ジャンプエフェクト
        if (this.isJumping) {
            this.drawJumpEffect(p5Instance);
        }
        
        p5Instance.pop();
    }
    
    // 影描画
    drawShadow(p5Instance) {
        if (this.z <= 0) return;
        
        p5Instance.push();
        p5Instance.translate(0, this.z * 0.5); // 影のオフセット
        
        const shadowOpacity = Utils.map(this.z, 0, this.jumpHeight, 0.6, 0.2);
        const shadowSize = Utils.map(this.z, 0, this.jumpHeight, 1, 0.5);
        
        p5Instance.fill(0, 0, 0, shadowOpacity * this.opacity * 100);
        p5Instance.noStroke();
        p5Instance.ellipse(0, 0, this.size * shadowSize, this.size * shadowSize * 0.5);
        
        p5Instance.pop();
    }
    
    // ボディ描画
    drawBody(p5Instance) {
        const color = this.currentColor;
        
        // グロー効果
        for (let i = 0; i < 3; i++) {
            const glowSize = this.size * (1 + i * 0.1);
            const glowOpacity = (this.opacity * 0.3) / (i + 1);
            
            p5Instance.fill(color.r, color.g, color.b, glowOpacity * 255);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, glowSize, glowSize * 0.8);
        }
        
        // メインボディ
        p5Instance.fill(color.r, color.g, color.b, this.opacity * 255);
        p5Instance.stroke(0, 0, 0, this.opacity * 150);
        p5Instance.strokeWeight(2);
        p5Instance.ellipse(0, 0, this.size, this.size * 0.8);
        
        // ベリー
        p5Instance.fill(color.r * 0.8, color.g * 1.2, color.b * 0.9, this.opacity * 200);
        p5Instance.noStroke();
        p5Instance.ellipse(0, this.size * 0.1, this.size * 0.6, this.size * 0.4);
    }
    
    // 目描画
    drawEyes(p5Instance) {
        const eyeSize = this.size * 0.15;
        const eyeOffset = this.size * 0.15;
        
        // 白目
        p5Instance.fill(255, 255, 255, this.opacity * 255);
        p5Instance.stroke(0, 0, 0, this.opacity * 200);
        p5Instance.strokeWeight(1);
        p5Instance.ellipse(-eyeOffset, -eyeOffset, eyeSize, eyeSize);
        p5Instance.ellipse(eyeOffset, -eyeOffset, eyeSize, eyeSize);
        
        // 瞳
        const blinkAmount = Math.max(0, Math.sin(this.blinkPhase));
        const pupilSize = eyeSize * 0.6 * blinkAmount;
        
        if (pupilSize > 0) {
            p5Instance.fill(0, 0, 0, this.opacity * 255);
            p5Instance.noStroke();
            p5Instance.ellipse(-eyeOffset, -eyeOffset, pupilSize, pupilSize);
            p5Instance.ellipse(eyeOffset, -eyeOffset, pupilSize, pupilSize);
        }
    }
    
    // ジャンプエフェクト描画
    drawJumpEffect(p5Instance) {
        const trailLength = 5;
        const color = this.currentColor;
        
        // 軌跡エフェクト
        for (let i = 0; i < trailLength; i++) {
            const alpha = (trailLength - i) / trailLength * 0.3;
            const size = this.size * (0.8 + i * 0.05);
            
            p5Instance.fill(color.r, color.g, color.b, alpha * this.opacity * 255);
            p5Instance.noStroke();
            p5Instance.ellipse(i * -3, i * 2, size, size * 0.8);
        }
    }
    
    // 強制ジャンプ（外部から呼び出し可能）
    forceJump(targetX, targetY) {
        if (this.isJumping) return false;
        
        this.startX = this.x;
        this.startY = this.y;
        this.targetX = targetX;
        this.targetY = targetY;
        
        this.clampTargetToBounds();
        
        this.isJumping = true;
        this.jumpStartTime = Date.now();
        
        return true;
    }
    
    // 座標取得
    getPosition() {
        return { x: this.x, y: this.y, z: this.z };
    }
    
    // 破棄
    destroy() {
        this.isActive = false;
    }
}

// カエル管理クラス
class FrogManager {
    constructor() {
        this.frogs = [];
        this.maxFrogs = CONFIG.FROG.MAX_COUNT;
    }
    
    // カエル召喚
    spawn(x, y) {
        // 最大数チェック
        if (this.frogs.length >= this.maxFrogs) {
            // 一番古いカエルを削除
            const oldest = this.frogs.shift();
            oldest.destroy();
        }
        
        const frog = new Frog(x, y);
        this.frogs.push(frog);
        
        // オブジェクト数更新
        GAME_STATE.objectCount = this.frogs.length;
        this.updateUI();
        
        Utils.log(`Frogs active: ${this.frogs.length}`);
        return frog;
    }
    
    // 複数体召喚
    spawnMultiple(x, y, count = 3) {
        const spawnedFrogs = [];
        
        for (let i = 0; i < count; i++) {
            // ランダムオフセットで配置
            const offsetX = x + Utils.random(-30, 30);
            const offsetY = y + Utils.random(-30, 30);
            const frog = this.spawn(offsetX, offsetY);
            
            if (frog) {
                // 少し遅延してジャンプ開始
                setTimeout(() => {
                    if (frog.isActive) {
                        frog.startNewJump();
                    }
                }, i * 200);
                
                spawnedFrogs.push(frog);
            }
        }
        
        return spawnedFrogs;
    }
    
    // 全カエル更新
    update(deltaTime) {
        this.frogs = this.frogs.filter(frog => frog.update(deltaTime));
        
        // オブジェクト数更新
        GAME_STATE.objectCount = this.frogs.length;
        this.updateUI();
    }
    
    // 全カエル描画
    draw(p5Instance) {
        // Z順でソート（高いものを後に描画）
        const sortedFrogs = [...this.frogs].sort((a, b) => a.z - b.z);
        sortedFrogs.forEach(frog => frog.draw(p5Instance));
    }
    
    // UI更新
    updateUI() {
        const objectsElement = document.getElementById('objects-count');
        if (objectsElement) {
            objectsElement.textContent = `🐸 召喚物: ${this.frogs.length}`;
        }
    }
    
    // アクティブなカエル数取得
    getActiveCount() {
        return this.frogs.length;
    }
    
    // 指定座標に近いカエル取得
    getFrogNear(x, y, radius = 50) {
        return this.frogs.find(frog => {
            const distance = Utils.distance(frog.x, frog.y, x, y);
            return distance <= radius;
        });
    }
    
    // 全カエルクリア
    clear() {
        this.frogs.forEach(frog => frog.destroy());
        this.frogs = [];
        GAME_STATE.objectCount = 0;
        this.updateUI();
    }
    
    // 全カエルに指令
    commandAll(command, ...args) {
        this.frogs.forEach(frog => {
            if (typeof frog[command] === 'function') {
                frog[command](...args);
            }
        });
    }
}