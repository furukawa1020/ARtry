// 魔法陣クラス
class MagicCircle {
    constructor(x, y, onComplete = null) {
        this.x = x;
        this.y = y;
        this.size = 0;
        this.targetSize = CONFIG.MAGIC_CIRCLE.SIZE;
        this.rotation = 0;
        this.opacity = 0;
        this.glowIntensity = 0;
        this.isActive = true;
        this.isExpanding = true;
        this.onComplete = onComplete;
        
        // タイミング制御
        this.createdAt = Date.now();
        this.expandDuration = 800;  // 展開時間
        this.sustainDuration = CONFIG.MAGIC_CIRCLE.DURATION - this.expandDuration - 500;
        this.fadeDuration = 500;    // フェード時間
        
        // アニメーション用
        this.pulsePhase = 0;
        this.particles = [];
        this.createParticles();
        
        Utils.log(`Magic circle created at (${x}, ${y})`);
    }
    
    // パーティクル生成
    createParticles() {
        const particleCount = CONFIG.EFFECTS.PARTICLE_COUNT;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const radius = this.targetSize * 0.6;
            
            this.particles.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                angle: angle,
                radius: radius,
                baseRadius: radius,
                opacity: 0,
                size: Utils.random(2, 4),
                speed: Utils.random(0.02, 0.05),
                pulseOffset: Utils.random(0, Math.PI * 2)
            });
        }
    }
    
    // 更新
    update(deltaTime) {
        if (!this.isActive) return false;
        
        const elapsed = Date.now() - this.createdAt;
        
        // フェーズ判定
        if (elapsed < this.expandDuration) {
            // 展開フェーズ
            this.updateExpansion(elapsed / this.expandDuration);
        } else if (elapsed < this.expandDuration + this.sustainDuration) {
            // 維持フェーズ
            this.updateSustain();
        } else if (elapsed < CONFIG.MAGIC_CIRCLE.DURATION) {
            // フェードフェーズ
            const fadeProgress = (elapsed - this.expandDuration - this.sustainDuration) / this.fadeDuration;
            this.updateFade(fadeProgress);
        } else {
            // 完了
            this.complete();
            return false;
        }
        
        // 共通アニメーション更新
        this.rotation += CONFIG.MAGIC_CIRCLE.ROTATION_SPEED;
        this.pulsePhase += CONFIG.MAGIC_CIRCLE.PULSE_SPEED;
        this.updateParticles();
        
        return true;
    }
    
    // 展開フェーズ更新
    updateExpansion(progress) {
        const easedProgress = Utils.easeOutQuart(progress);
        this.size = this.targetSize * easedProgress;
        this.opacity = easedProgress;
        this.glowIntensity = CONFIG.MAGIC_CIRCLE.GLOW_INTENSITY * easedProgress;
        
        // パーティクル透明度
        this.particles.forEach(particle => {
            particle.opacity = easedProgress;
        });
    }
    
    // 維持フェーズ更新
    updateSustain() {
        this.size = this.targetSize;
        this.opacity = 0.8 + Math.sin(this.pulsePhase) * 0.2;
        this.glowIntensity = CONFIG.MAGIC_CIRCLE.GLOW_INTENSITY * this.opacity;
    }
    
    // フェードフェーズ更新
    updateFade(progress) {
        const fadeProgress = 1 - progress;
        this.opacity = 0.8 * fadeProgress;
        this.glowIntensity = CONFIG.MAGIC_CIRCLE.GLOW_INTENSITY * fadeProgress;
        
        // パーティクルもフェード
        this.particles.forEach(particle => {
            particle.opacity = fadeProgress;
        });
    }
    
    // パーティクル更新
    updateParticles() {
        this.particles.forEach(particle => {
            // 回転
            particle.angle += particle.speed;
            
            // パルス効果で半径変更
            const pulse = Math.sin(this.pulsePhase + particle.pulseOffset) * 0.1;
            particle.radius = particle.baseRadius * (1 + pulse);
            
            // 座標更新
            particle.x = Math.cos(particle.angle) * particle.radius;
            particle.y = Math.sin(particle.angle) * particle.radius;
        });
    }
    
    // 完了処理
    complete() {
        this.isActive = false;
        
        if (this.onComplete) {
            this.onComplete(this.x, this.y);
        }
        
        Utils.log('Magic circle completed');
    }
    
    // 描画（p5.js用）
    draw(p5Instance) {
        if (!this.isActive || this.opacity <= 0) return;
        
        p5Instance.push();
        p5Instance.translate(this.x, this.y);
        
        // グロー効果
        this.drawGlow(p5Instance);
        
        // メイン魔法陣
        this.drawMainCircle(p5Instance);
        
        // 内側の模様
        this.drawInnerPatterns(p5Instance);
        
        // パーティクル
        this.drawParticles(p5Instance);
        
        p5Instance.pop();
    }
    
    // グロー効果描画
    drawGlow(p5Instance) {
        const glowSize = this.size + this.glowIntensity;
        const color = Utils.hexToRgb(CONFIG.MAGIC_CIRCLE.COLOR);
        
        // 外側の大きなグロー（神秘的な輝き）
        for (let i = 0; i < 8; i++) {
            const layerSize = glowSize * (1 + i * 0.15);
            const layerOpacity = (this.opacity * 0.08) / (i + 1);
            
            // 紫からピンクへのグラデーション効果
            const glowR = color.r + i * 10;
            const glowG = color.g + i * 5;
            const glowB = color.b + i * 15;
            
            p5Instance.fill(glowR, glowG, glowB, layerOpacity * 255);
            p5Instance.noStroke();
            p5Instance.ellipse(0, 0, layerSize, layerSize);
        }
        
        // 内側の集中した光
        const pulseGlow = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        p5Instance.fill(255, 200, 255, this.opacity * pulseGlow * 50);
        p5Instance.ellipse(0, 0, this.size * 0.7, this.size * 0.7);
    }
    
    // メイン魔法陣描画
    drawMainCircle(p5Instance) {
        const color = Utils.hexToRgb(CONFIG.MAGIC_CIRCLE.COLOR);
        
        p5Instance.push();
        p5Instance.rotate(this.rotation);
        
        // 外側の二重リング（画像の外周部分）
        p5Instance.strokeWeight(4);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 255);
        p5Instance.noFill();
        p5Instance.ellipse(0, 0, this.size, this.size);
        
        p5Instance.strokeWeight(2);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 200);
        p5Instance.ellipse(0, 0, this.size * 0.95, this.size * 0.95);
        
        // 中間の円（文字が配置される円）
        p5Instance.strokeWeight(2);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 180);
        p5Instance.ellipse(0, 0, this.size * 0.8, this.size * 0.8);
        
        // 内側の円（六芒星の外接円）
        p5Instance.strokeWeight(1.5);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 160);
        p5Instance.ellipse(0, 0, this.size * 0.6, this.size * 0.6);
        
        // 最内側の円
        p5Instance.strokeWeight(1);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 140);
        p5Instance.ellipse(0, 0, this.size * 0.25, this.size * 0.25);
        
        // 背景の薄い塗り（画像のような薄紫背景）
        p5Instance.fill(color.r, color.g, color.b, this.opacity * 30);
        p5Instance.noStroke();
        p5Instance.ellipse(0, 0, this.size * 0.95, this.size * 0.95);
        
        p5Instance.pop();
    }
    
    // 内側の模様描画
    drawInnerPatterns(p5Instance) {
        const color = Utils.hexToRgb(CONFIG.MAGIC_CIRCLE.COLOR);
        
        // 六芒星（ダビデの星）を描画
        this.drawHexagram(p5Instance, color);
        
        // 内側の円と三角形パターン
        this.drawInnerGeometry(p5Instance, color);
        
        // 古代文字風の装飾
        this.drawMysticSymbols(p5Instance, color);
    }
    
    // 六芒星（ダビデの星）描画
    drawHexagram(p5Instance, color) {
        p5Instance.push();
        p5Instance.rotate(this.rotation * 0.3);
        
        p5Instance.strokeWeight(3);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 220);
        p5Instance.noFill();
        
        const hexagramSize = this.size * 0.35;
        
        // 上向き三角形
        p5Instance.beginShape();
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2;
            const x = Math.cos(angle) * hexagramSize;
            const y = Math.sin(angle) * hexagramSize;
            p5Instance.vertex(x, y);
        }
        p5Instance.endShape(p5Instance.CLOSE);
        
        // 下向き三角形
        p5Instance.beginShape();
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 + Math.PI / 2;
            const x = Math.cos(angle) * hexagramSize;
            const y = Math.sin(angle) * hexagramSize;
            p5Instance.vertex(x, y);
        }
        p5Instance.endShape(p5Instance.CLOSE);
        
        p5Instance.pop();
    }
    
    // 内側の幾何学模様
    drawInnerGeometry(p5Instance, color) {
        p5Instance.push();
        p5Instance.rotate(-this.rotation * 0.5);
        
        // 中央の小さな六芒星
        p5Instance.strokeWeight(2);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 180);
        p5Instance.noFill();
        
        const innerHexSize = this.size * 0.12;
        
        // 内側上向き三角形
        p5Instance.beginShape();
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2;
            const x = Math.cos(angle) * innerHexSize;
            const y = Math.sin(angle) * innerHexSize;
            p5Instance.vertex(x, y);
        }
        p5Instance.endShape(p5Instance.CLOSE);
        
        // 内側下向き三角形
        p5Instance.beginShape();
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 + Math.PI / 2;
            const x = Math.cos(angle) * innerHexSize;
            const y = Math.sin(angle) * innerHexSize;
            p5Instance.vertex(x, y);
        }
        p5Instance.endShape(p5Instance.CLOSE);
        
        // 六芒星の頂点に小さな星
        p5Instance.strokeWeight(1.5);
        const starRadius = this.size * 0.37;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const x = Math.cos(angle) * starRadius;
            const y = Math.sin(angle) * starRadius;
            
            p5Instance.push();
            p5Instance.translate(x, y);
            this.drawSmallStar(p5Instance, color, 6);
            p5Instance.pop();
        }
        
        p5Instance.pop();
    }
    
    // 小さな星描画
    drawSmallStar(p5Instance, color, size) {
        p5Instance.strokeWeight(1);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 150);
        p5Instance.noFill();
        
        p5Instance.beginShape();
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * i) / 6;
            const radius = (i % 2 === 0) ? size : size * 0.4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            p5Instance.vertex(x, y);
        }
        p5Instance.endShape(p5Instance.CLOSE);
    }
    
    // 神秘的なシンボル描画
    drawMysticSymbols(p5Instance, color) {
        p5Instance.push();
        p5Instance.rotate(this.rotation * 0.2);
        
        p5Instance.strokeWeight(1.5);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 160);
        p5Instance.noFill();
        
        // 外周の古代文字風装飾
        const symbolRadius = this.size * 0.45;
        const symbolCount = 12;
        
        for (let i = 0; i < symbolCount; i++) {
            const angle = (Math.PI * 2 * i) / symbolCount;
            const x = Math.cos(angle) * symbolRadius;
            const y = Math.sin(angle) * symbolRadius;
            
            p5Instance.push();
            p5Instance.translate(x, y);
            p5Instance.rotate(angle + Math.PI / 2);
            
            // ヘブライ文字風のシンボル
            this.drawMysticCharacter(p5Instance, color, i);
            
            p5Instance.pop();
        }
        
        p5Instance.pop();
    }
    
    // 神秘的な文字描画
    drawMysticCharacter(p5Instance, color, index) {
        const charSize = 8;
        
        p5Instance.strokeWeight(1);
        p5Instance.stroke(color.r, color.g, color.b, this.opacity * 140);
        
        // パターンに応じて異なる文字を描画
        switch (index % 6) {
            case 0: // アレフ風
                p5Instance.line(-charSize/2, -charSize/2, charSize/2, charSize/2);
                p5Instance.line(-charSize/3, 0, charSize/3, 0);
                p5Instance.line(-charSize/2, charSize/2, charSize/2, -charSize/2);
                break;
                
            case 1: // ベト風
                p5Instance.line(-charSize/2, -charSize/2, -charSize/2, charSize/2);
                p5Instance.line(-charSize/2, -charSize/2, charSize/2, -charSize/2);
                p5Instance.line(-charSize/2, 0, charSize/3, 0);
                break;
                
            case 2: // ギメル風
                p5Instance.line(-charSize/2, -charSize/2, charSize/2, -charSize/2);
                p5Instance.line(charSize/2, -charSize/2, charSize/2, charSize/2);
                p5Instance.line(0, 0, charSize/2, charSize/2);
                break;
                
            case 3: // ダレト風
                p5Instance.line(-charSize/2, -charSize/2, charSize/2, -charSize/2);
                p5Instance.line(charSize/2, -charSize/2, charSize/2, charSize/2);
                break;
                
            case 4: // ヘー風
                p5Instance.line(-charSize/2, -charSize/2, -charSize/2, charSize/2);
                p5Instance.line(-charSize/2, -charSize/2, charSize/2, -charSize/2);
                p5Instance.line(-charSize/2, 0, charSize/4, 0);
                break;
                
            case 5: // ヴァヴ風
                p5Instance.line(0, -charSize/2, 0, charSize/2);
                p5Instance.ellipse(0, -charSize/3, charSize/4, charSize/4);
                break;
        }
    }
    
    // パーティクル描画
    drawParticles(p5Instance) {
        const color = Utils.hexToRgb(CONFIG.MAGIC_CIRCLE.COLOR);
        
        this.particles.forEach(particle => {
            if (particle.opacity <= 0) return;
            
            p5Instance.push();
            p5Instance.translate(particle.x, particle.y);
            
            p5Instance.fill(color.r, color.g, color.b, particle.opacity * 255);
            p5Instance.noStroke();
            
            // パルス効果
            const pulseSize = particle.size * (1 + Math.sin(this.pulsePhase + particle.pulseOffset) * 0.3);
            p5Instance.ellipse(0, 0, pulseSize, pulseSize);
            
            p5Instance.pop();
        });
    }
    
    // 破棄
    destroy() {
        this.isActive = false;
        this.particles = [];
    }
    
    // 魔法陣の中心からの距離を取得
    getDistanceFromCenter(x, y) {
        return Utils.distance(this.x, this.y, x, y);
    }
    
    // 指定座標が魔法陣内かどうか
    isInsideCircle(x, y) {
        return this.getDistanceFromCenter(x, y) <= this.size / 2;
    }
}

// 魔法陣管理クラス
class MagicCircleManager {
    constructor() {
        this.circles = [];
        this.maxCircles = 3; // 同時表示可能数
    }
    
    // 魔法陣作成
    create(x, y, onComplete = null) {
        // 最大数チェック
        if (this.circles.length >= this.maxCircles) {
            // 一番古い魔法陣を削除
            const oldest = this.circles.shift();
            oldest.destroy();
        }
        
        const circle = new MagicCircle(x, y, onComplete);
        this.circles.push(circle);
        
        Utils.log(`Magic circles active: ${this.circles.length}`);
        return circle;
    }
    
    // 全魔法陣更新
    update(deltaTime) {
        this.circles = this.circles.filter(circle => circle.update(deltaTime));
    }
    
    // 全魔法陣描画
    draw(p5Instance) {
        this.circles.forEach(circle => circle.draw(p5Instance));
    }
    
    // 指定座標の魔法陣取得
    getCircleAt(x, y) {
        return this.circles.find(circle => circle.isInsideCircle(x, y));
    }
    
    // アクティブな魔法陣数取得
    getActiveCount() {
        return this.circles.length;
    }
    
    // 全魔法陣クリア
    clear() {
        this.circles.forEach(circle => circle.destroy());
        this.circles = [];
    }
}