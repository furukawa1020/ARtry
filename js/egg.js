// 卵クラス
class Egg {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.size = CONFIG.EGG.SIZE;
        this.isActive = true;
        
        // 生存時間
        this.createdAt = Date.now();
        this.lifetime = CONFIG.EGG.LIFETIME;
        
        // アニメーション
        this.opacity = 0;
        this.scale = 0;
        this.rotation = 0;
        this.swayPhase = Utils.random(0, Math.PI * 2);
        this.pulsePhase = Utils.random(0, Math.PI * 2);
        
        // 色
        this.baseColor = Utils.hexToRgb(CONFIG.EGG.COLOR);
        this.pulseColor = Utils.hexToRgb(CONFIG.EGG.PULSE_COLOR);
        this.currentColor = { ...this.baseColor };
        
        // 物理
        this.swayAmount = CONFIG.EGG.SWAY_AMOUNT;
        this.swaySpeed = CONFIG.EGG.SWAY_SPEED;
        this.baseY = y;
        
        // エフェクト
        this.particles = [];
        this.cracks = [];
        this.isHatching = false;
        this.hatchProgress = 0;
        
        // 心拍効果
        this.heartbeatPhase = 0;
        this.heartbeatIntensity = 0.1;
        
        this.startSpawnAnimation();
        this.createAmbientParticles();
        
        Utils.log(`Egg spawned at (${x}, ${y})`);
    }
    
    // スポーンアニメーション開始
    startSpawnAnimation() {
        this.spawnStartTime = Date.now();
        this.spawnDuration = 1000;
    }
    
    // 周囲パーティクル生成
    createAmbientParticles() {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const radius = this.size * 0.8;
            
            this.particles.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                angle: angle,
                radius: radius,
                baseRadius: radius,
                size: Utils.random(1, 3),
                opacity: Utils.random(0.3, 0.8),
                speed: Utils.random(0.01, 0.03),
                pulseOffset: Utils.random(0, Math.PI * 2)
            });
        }
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
        
        // 揺れアニメーション
        this.updateSway();
        
        // パルス効果
        this.updatePulse();
        
        // パーティクル更新
        this.updateParticles();
        
        // 心拍効果
        this.updateHeartbeat();
        
        // ランダムイベント
        this.updateRandomEvents(elapsed);
        
        return true;
    }
    
    // スポーンアニメーション更新
    updateSpawnAnimation(currentTime) {
        const progress = (currentTime - this.spawnStartTime) / this.spawnDuration;
        const easedProgress = Utils.easeOutBounce(progress);
        
        this.opacity = progress;
        this.scale = easedProgress;
        
        // 出現時の光
        const flash = Math.sin(progress * Math.PI * 6) * 0.5;
        this.currentColor = {
            r: Math.min(255, this.baseColor.r + flash * 150),
            g: Math.min(255, this.baseColor.g + flash * 150),
            b: Math.min(255, this.baseColor.b + flash * 100)
        };
    }
    
    // 揺れアニメーション更新
    updateSway() {
        this.swayPhase += this.swaySpeed;
        
        // Y軸回転による揺れ
        this.rotation = Math.sin(this.swayPhase) * this.swayAmount;
        
        // 微細な上下移動
        this.y = this.baseY + Math.sin(this.swayPhase * 0.7) * 2;
    }
    
    // パルス効果更新
    updatePulse() {
        this.pulsePhase += CONFIG.EGG.PULSE_SPEED;
        
        const pulse = (Math.sin(this.pulsePhase) + 1) * 0.5; // 0-1の範囲
        
        // 色のパルス
        this.currentColor = {
            r: Utils.lerp(this.baseColor.r, this.pulseColor.r, pulse * 0.3),
            g: Utils.lerp(this.baseColor.g, this.pulseColor.g, pulse * 0.3),
            b: Utils.lerp(this.baseColor.b, this.pulseColor.b, pulse * 0.3)
        };
        
        // サイズのパルス
        this.scale = 1 + pulse * 0.05;
    }
    
    // パーティクル更新
    updateParticles() {
        this.particles.forEach(particle => {
            // 回転
            particle.angle += particle.speed;
            
            // パルス効果で半径変更
            const pulse = Math.sin(this.pulsePhase + particle.pulseOffset) * 0.2;
            particle.radius = particle.baseRadius * (1 + pulse);
            
            // 座標更新
            particle.x = Math.cos(particle.angle) * particle.radius;
            particle.y = Math.sin(particle.angle) * particle.radius;
            
            // 透明度の変化
            particle.opacity = 0.5 + Math.sin(this.pulsePhase + particle.pulseOffset) * 0.3;
        });
    }
    
    // 心拍効果更新
    updateHeartbeat() {
        this.heartbeatPhase += 0.08; // ゆっくりした心拍
        
        // ドクン、ドクンという2段階心拍
        const heartbeat = Math.sin(this.heartbeatPhase * 2) * Math.sin(this.heartbeatPhase);
        this.heartbeatIntensity = Math.max(0, heartbeat) * 0.15;
    }
    
    // ランダムイベント更新
    updateRandomEvents(elapsed) {
        // 孵化予兆（75%の生存時間経過後）
        if (elapsed > this.lifetime * 0.75 && !this.isHatching) {
            if (Math.random() < 0.002) { // 低確率でヒビ発生
                this.addCracks();
            }
        }
        
        // 発光スパーク（ランダム）
        if (Math.random() < 0.001) {
            this.createSparkEffect();
        }
    }
    
    // ヒビ追加
    addCracks() {
        const crackCount = Utils.randomInt(2, 4);
        
        for (let i = 0; i < crackCount; i++) {
            this.cracks.push({
                startAngle: Utils.random(0, Math.PI * 2),
                length: Utils.random(10, 20),
                opacity: Utils.random(0.5, 0.8),
                width: Utils.random(1, 2)
            });
        }
        
        Utils.log('Egg cracks appeared');
    }
    
    // スパーク効果生成
    createSparkEffect() {
        // 一時的な発光パーティクル追加
        const sparkCount = 5;
        
        for (let i = 0; i < sparkCount; i++) {
            this.particles.push({
                x: Utils.random(-this.size/2, this.size/2),
                y: Utils.random(-this.size/2, this.size/2),
                size: Utils.random(2, 4),
                opacity: 1,
                life: 60, // フレーム数
                maxLife: 60,
                isSpark: true
            });
        }
    }
    
    // 消滅開始
    startDespawn() {
        this.isActive = false;
        Utils.log('Egg despawned');
    }
    
    // 孵化開始（将来の拡張用）
    startHatching() {
        this.isHatching = true;
        this.hatchProgress = 0;
        Utils.log('Egg hatching started');
    }
    
    // 描画（p5.js用）
    draw(p5Instance) {
        if (!this.isActive || this.opacity <= 0) return;
        
        p5Instance.push();
        p5Instance.translate(this.x, this.y);
        p5Instance.scale(this.scale);
        p5Instance.rotate(this.rotation);
        
        // 影の描画
        this.drawShadow(p5Instance);
        
        // パーティクル（背景）
        this.drawBackgroundParticles(p5Instance);
        
        // メインエッグ
        this.drawEgg(p5Instance);
        
        // ヒビ
        this.drawCracks(p5Instance);
        
        // 発光エフェクト
        this.drawGlow(p5Instance);
        
        // パーティクル（前景）
        this.drawForegroundParticles(p5Instance);
        
        p5Instance.pop();
    }
    
    // 影描画
    drawShadow(p5Instance) {
        p5Instance.push();
        p5Instance.translate(5, 10); // 影のオフセット
        
        p5Instance.fill(0, 0, 0, this.opacity * 80);
        p5Instance.noStroke();
        p5Instance.ellipse(0, this.size * 0.2, this.size * 0.8, this.size * 0.3);
        
        p5Instance.pop();
    }
    
    // 背景パーティクル描画
    drawBackgroundParticles(p5Instance) {
        const color = this.pulseColor;
        
        this.particles.forEach(particle => {
            if (particle.isSpark) return; // スパークは後で描画
            
            p5Instance.push();
            p5Instance.translate(particle.x, particle.y);
            
            p5Instance.fill(color.r, color.g, color.b, particle.opacity * this.opacity * 150);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, particle.size, particle.size);
            
            p5Instance.pop();
        });
    }
    
    // 卵メイン描画
    drawEgg(p5Instance) {
        const color = this.currentColor;
        
        // グロー効果
        for (let i = 0; i < 3; i++) {
            const glowSize = this.size * (1 + i * 0.1);
            const glowOpacity = (this.opacity * 0.2) / (i + 1);
            
            p5Instance.fill(color.r, color.g, color.b, glowOpacity * 255);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, glowSize, glowSize * 1.3);
        }
        
        // メインボディ（卵形）
        p5Instance.fill(color.r, color.g, color.b, this.opacity * 255);
        p5Instance.stroke(color.r * 0.7, color.g * 0.7, color.b * 0.7, this.opacity * 200);
        p5Instance.strokeWeight(2);
        p5Instance.ellipse(0, 0, this.size, this.size * 1.3);
        
        // ハイライト
        p5Instance.fill(255, 255, 255, this.opacity * 100);
        p5Instance.noStroke();
        p5Instance.ellipse(-this.size * 0.15, -this.size * 0.2, this.size * 0.3, this.size * 0.2);
        
        // 心拍効果
        if (this.heartbeatIntensity > 0) {
            const heartbeatSize = this.size * (1 + this.heartbeatIntensity);
            p5Instance.fill(255, 100, 100, this.heartbeatIntensity * this.opacity * 150);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, heartbeatSize, heartbeatSize * 1.3);
        }
    }
    
    // ヒビ描画
    drawCracks(p5Instance) {
        if (this.cracks.length === 0) return;
        
        this.cracks.forEach(crack => {
            p5Instance.stroke(80, 60, 40, crack.opacity * this.opacity * 255);
            p5Instance.strokeWeight(crack.width);
            
            const startX = Math.cos(crack.startAngle) * this.size * 0.3;
            const startY = Math.sin(crack.startAngle) * this.size * 0.3;
            const endX = Math.cos(crack.startAngle) * (this.size * 0.3 + crack.length);
            const endY = Math.sin(crack.startAngle) * (this.size * 0.3 + crack.length);
            
            p5Instance.line(startX, startY, endX, endY);
        });
    }
    
    // 発光エフェクト描画
    drawGlow(p5Instance) {
        const pulse = (Math.sin(this.pulsePhase) + 1) * 0.5;
        const glowIntensity = pulse * 0.3 + this.heartbeatIntensity;
        
        if (glowIntensity > 0) {
            const color = this.pulseColor;
            
            // 内側からの光
            p5Instance.fill(color.r, color.g, color.b, glowIntensity * this.opacity * 100);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, this.size * 1.5, this.size * 1.8);
        }
    }
    
    // 前景パーティクル描画（スパーク等）
    drawForegroundParticles(p5Instance) {
        this.particles.forEach((particle, index) => {
            if (!particle.isSpark) return;
            
            // スパークの生存時間管理
            particle.life--;
            particle.opacity = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
                return;
            }
            
            p5Instance.push();
            p5Instance.translate(particle.x, particle.y);
            
            p5Instance.fill(255, 255, 255, particle.opacity * 255);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, particle.size, particle.size);
            
            p5Instance.pop();
        });
    }
    
    // 座標取得
    getPosition() {
        return { x: this.x, y: this.y, z: this.z };
    }
    
    // インタラクション（タップでリアクション）
    onTap() {
        // 心拍強化
        this.heartbeatIntensity = 0.3;
        
        // スパーク生成
        this.createSparkEffect();
        
        // 短時間の揺れ強化
        this.swayAmount = CONFIG.EGG.SWAY_AMOUNT * 2;
        setTimeout(() => {
            this.swayAmount = CONFIG.EGG.SWAY_AMOUNT;
        }, 1000);
        
        Utils.log('Egg tapped - reaction triggered');
    }
    
    // 破棄
    destroy() {
        this.isActive = false;
        this.particles = [];
        this.cracks = [];
    }
}

// 卵管理クラス
class EggManager {
    constructor() {
        this.eggs = [];
        this.maxEggs = CONFIG.EGG.MAX_COUNT;
    }
    
    // 卵召喚
    spawn(x, y) {
        // 最大数チェック
        if (this.eggs.length >= this.maxEggs) {
            // 一番古い卵を削除
            const oldest = this.eggs.shift();
            oldest.destroy();
        }
        
        const egg = new Egg(x, y);
        this.eggs.push(egg);
        
        // オブジェクト数更新
        GAME_STATE.objectCount += 1;
        this.updateUI();
        
        Utils.log(`Eggs active: ${this.eggs.length}`);
        return egg;
    }
    
    // 全卵更新
    update(deltaTime) {
        this.eggs = this.eggs.filter(egg => egg.update(deltaTime));
        
        // オブジェクト数更新
        this.updateUI();
    }
    
    // 全卵描画
    draw(p5Instance) {
        this.eggs.forEach(egg => egg.draw(p5Instance));
    }
    
    // UI更新
    updateUI() {
        const objectsElement = document.getElementById('objects-count');
        if (objectsElement) {
            const totalObjects = this.eggs.length + (window.frogManager ? window.frogManager.getActiveCount() : 0);
            objectsElement.textContent = `🥚 召喚物: ${totalObjects}`;
        }
    }
    
    // アクティブな卵数取得
    getActiveCount() {
        return this.eggs.length;
    }
    
    // 指定座標の卵取得
    getEggAt(x, y, radius = 30) {
        return this.eggs.find(egg => {
            const distance = Utils.distance(egg.x, egg.y, x, y);
            return distance <= radius;
        });
    }
    
    // 全卵にタップイベント送信
    handleTap(x, y) {
        const tappedEgg = this.getEggAt(x, y);
        if (tappedEgg) {
            tappedEgg.onTap();
            return true;
        }
        return false;
    }
    
    // 全卵クリア
    clear() {
        this.eggs.forEach(egg => egg.destroy());
        this.eggs = [];
        this.updateUI();
    }
    
    // 全卵に指令
    commandAll(command, ...args) {
        this.eggs.forEach(egg => {
            if (typeof egg[command] === 'function') {
                egg[command](...args);
            }
        });
    }
}