// 音響管理クラス
class AudioManager {
    constructor() {
        this.context = null;
        this.isInitialized = false;
        this.isEnabled = true;
        this.masterVolume = CONFIG.AUDIO.MASTER_VOLUME;
        
        // 音源バッファ
        this.sounds = new Map();
        this.currentPlaying = new Set();
        
        // 音響効果
        this.reverb = null;
        this.compressor = null;
        
        this.initializeContext();
        this.createSyntheticSounds();
    }
    
    // AudioContext初期化
    async initializeContext() {
        try {
            // モダンブラウザとWebKit対応
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            
            if (!AudioContextClass) {
                Utils.warn('Web Audio API not supported');
                return false;
            }
            
            this.context = new AudioContextClass();
            
            // iOS Safari対応: ユーザー操作後に再開
            if (this.context.state === 'suspended') {
                Utils.log('AudioContext suspended, waiting for user interaction');
                
                // 自動再開を試行
                document.addEventListener('touchstart', this.resumeContext.bind(this), { once: true });
                document.addEventListener('click', this.resumeContext.bind(this), { once: true });
            }
            
            this.setupAudioEffects();
            this.isInitialized = true;
            GAME_STATE.audioReady = true;
            
            Utils.log('Audio system initialized');
            return true;
            
        } catch (error) {
            Utils.error('Audio initialization failed:', error);
            return false;
        }
    }
    
    // AudioContext再開
    async resumeContext() {
        if (this.context && this.context.state === 'suspended') {
            try {
                await this.context.resume();
                Utils.log('AudioContext resumed');
            } catch (error) {
                Utils.error('Failed to resume AudioContext:', error);
            }
        }
    }
    
    // 音響エフェクト設定
    setupAudioEffects() {
        if (!this.context) return;
        
        // コンプレッサー（音量レベル調整）
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        this.compressor.connect(this.context.destination);
        
        // マスターボリューム
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.compressor);
    }
    
    // 合成音作成
    createSyntheticSounds() {
        if (!this.context) return;
        
        // 魔法陣発動音
        this.createMagicCircleSound();
        
        // カエル鳴き声
        this.createFrogSound();
        
        // 卵の鼓動音
        this.createEggHeartbeatSound();
        
        // UI効果音
        this.createUISound();
    }
    
    // 魔法陣発動音作成
    createMagicCircleSound() {
        const duration = 2.0;
        const sampleRate = this.context?.sampleRate || 44100;
        const buffer = this.context?.createBuffer(2, duration * sampleRate, sampleRate);
        
        if (!buffer) return;
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            
            for (let i = 0; i < channelData.length; i++) {
                const time = i / sampleRate;
                const progress = time / duration;
                
                // 低音のうねり + 高音のキラキラ
                const bass = Math.sin(time * 80 * Math.PI) * Math.exp(-time * 0.5);
                const mid = Math.sin(time * 220 * Math.PI) * Math.exp(-time * 1.0) * 0.5;
                const high = Math.sin(time * 880 * Math.PI) * Math.exp(-time * 2.0) * 0.3;
                
                // ノイズ追加
                const noise = (Math.random() - 0.5) * 0.1 * Math.exp(-time * 3);
                
                // エンベロープ
                const envelope = Math.exp(-time * 0.8) * (1 - progress * 0.5);
                
                channelData[i] = (bass + mid + high + noise) * envelope * 0.3;
            }
        }
        
        this.sounds.set('magicCircle', buffer);
        Utils.log('Magic circle sound created');
    }
    
    // カエル鳴き声作成
    createFrogSound() {
        const duration = 0.5;
        const sampleRate = this.context?.sampleRate || 44100;
        const buffer = this.context?.createBuffer(1, duration * sampleRate, sampleRate);
        
        if (!buffer) return;
        
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < channelData.length; i++) {
            const time = i / sampleRate;
            const progress = time / duration;
            
            // 基本周波数とハーモニクス
            const freq1 = 150 + Math.sin(time * 20) * 30; // 揺らぎ
            const freq2 = freq1 * 2;
            
            const wave1 = Math.sin(time * freq1 * 2 * Math.PI);
            const wave2 = Math.sin(time * freq2 * 2 * Math.PI) * 0.3;
            
            // エンベロープ（ゲコッという感じ）
            const attack = Math.min(1, progress * 20);
            const decay = Math.exp(-progress * 8);
            const envelope = attack * decay;
            
            channelData[i] = (wave1 + wave2) * envelope * 0.4;
        }
        
        this.sounds.set('frog', buffer);
        Utils.log('Frog sound created');
    }
    
    // 卵の鼓動音作成
    createEggHeartbeatSound() {
        const duration = 1.0;
        const sampleRate = this.context?.sampleRate || 44100;
        const buffer = this.context?.createBuffer(1, duration * sampleRate, sampleRate);
        
        if (!buffer) return;
        
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < channelData.length; i++) {
            const time = i / sampleRate;
            
            // ドクン（低音）
            const beat1Time = 0.1;
            const beat2Time = 0.3;
            
            let amplitude = 0;
            
            // 第一拍
            if (time < beat1Time) {
                const localTime = time / beat1Time;
                const freq = 60;
                amplitude = Math.sin(time * freq * 2 * Math.PI) * Math.exp(-localTime * 15);
            }
            
            // 第二拍（弱め）
            if (time > beat2Time && time < beat2Time + beat1Time) {
                const localTime = (time - beat2Time) / beat1Time;
                const freq = 55;
                amplitude += Math.sin((time - beat2Time) * freq * 2 * Math.PI) * Math.exp(-localTime * 12) * 0.7;
            }
            
            channelData[i] = amplitude * 0.3;
        }
        
        this.sounds.set('eggHeartbeat', buffer);
        Utils.log('Egg heartbeat sound created');
    }
    
    // UI効果音作成
    createUISound() {
        const duration = 0.2;
        const sampleRate = this.context?.sampleRate || 44100;
        const buffer = this.context?.createBuffer(1, duration * sampleRate, sampleRate);
        
        if (!buffer) return;
        
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < channelData.length; i++) {
            const time = i / sampleRate;
            const progress = time / duration;
            
            // 軽やかなベル音
            const freq = 800;
            const wave = Math.sin(time * freq * 2 * Math.PI);
            const envelope = Math.exp(-progress * 8);
            
            channelData[i] = wave * envelope * 0.2;
        }
        
        this.sounds.set('ui', buffer);
        Utils.log('UI sound created');
    }
    
    // 音再生
    async playSound(soundName, volume = 1.0, playbackRate = 1.0, delay = 0) {
        if (!this.isInitialized || !this.isEnabled || !this.context) {
            return null;
        }
        
        // AudioContext再開確認
        if (this.context.state === 'suspended') {
            await this.resumeContext();
        }
        
        const buffer = this.sounds.get(soundName);
        if (!buffer) {
            Utils.warn(`Sound '${soundName}' not found`);
            return null;
        }
        
        try {
            // 音源作成
            const source = this.context.createBufferSource();
            const gainNode = this.context.createGain();
            
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;
            
            // ボリューム設定
            const finalVolume = volume * this.getVolumeForSound(soundName);
            gainNode.gain.value = finalVolume;
            
            // 接続
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 再生開始
            const startTime = this.context.currentTime + delay;
            source.start(startTime);
            
            // 追跡
            const playback = { source, gainNode, soundName, startTime };
            this.currentPlaying.add(playback);
            
            // 終了時にクリーンアップ
            source.onended = () => {
                this.currentPlaying.delete(playback);
            };
            
            Utils.log(`Playing sound: ${soundName} (volume: ${finalVolume.toFixed(2)})`);
            return playback;
            
        } catch (error) {
            Utils.error(`Failed to play sound '${soundName}':`, error);
            return null;
        }
    }
    
    // 音種別ボリューム取得
    getVolumeForSound(soundName) {
        switch (soundName) {
            case 'magicCircle':
                return CONFIG.AUDIO.MAGIC_CIRCLE_VOLUME;
            case 'frog':
                return CONFIG.AUDIO.FROG_VOLUME;
            case 'eggHeartbeat':
                return CONFIG.AUDIO.EGG_VOLUME;
            case 'ui':
                return 0.5;
            default:
                return 0.7;
        }
    }
    
    // 魔法陣発動音再生
    playMagicCircleSound(volume = 1.0) {
        return this.playSound('magicCircle', volume);
    }
    
    // カエル鳴き声再生
    playFrogSound(volume = 1.0, pitch = 1.0) {
        const randomPitch = pitch * Utils.random(0.8, 1.2);
        return this.playSound('frog', volume, randomPitch);
    }
    
    // 卵鼓動音再生
    playEggHeartbeat(volume = 1.0) {
        return this.playSound('eggHeartbeat', volume);
    }
    
    // UI音再生
    playUISound(volume = 0.5) {
        return this.playSound('ui', volume);
    }
    
    // ランダムピッチでカエル大合唱
    playFrogChorus(count = 3, delay = 0.1) {
        const playbacks = [];
        
        for (let i = 0; i < count; i++) {
            const volume = Utils.random(0.3, 0.8);
            const pitch = Utils.random(0.7, 1.5);
            const delayTime = i * delay + Utils.random(0, 0.1);
            
            const playback = this.playSound('frog', volume, pitch, delayTime);
            if (playback) playbacks.push(playback);
        }
        
        return playbacks;
    }
    
    // マスターボリューム設定
    setMasterVolume(volume) {
        this.masterVolume = Utils.clamp(volume, 0, 1);
        
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        
        Utils.log(`Master volume set to ${this.masterVolume.toFixed(2)}`);
    }
    
    // 音響有効/無効切り替え
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.stopAllSounds();
        }
        
        Utils.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // 全音停止
    stopAllSounds() {
        this.currentPlaying.forEach(playback => {
            try {
                playback.source.stop();
            } catch (error) {
                // 既に停止している場合のエラーを無視
            }
        });
        
        this.currentPlaying.clear();
        Utils.log('All sounds stopped');
    }
    
    // 特定音停止
    stopSound(playback) {
        if (playback && this.currentPlaying.has(playback)) {
            try {
                playback.source.stop();
                this.currentPlaying.delete(playback);
            } catch (error) {
                Utils.error('Failed to stop sound:', error);
            }
        }
    }
    
    // リソース解放
    destroy() {
        this.stopAllSounds();
        
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        
        this.sounds.clear();
        this.isInitialized = false;
        GAME_STATE.audioReady = false;
        
        Utils.log('Audio system destroyed');
    }
    
    // 状態情報取得
    getStatus() {
        return {
            initialized: this.isInitialized,
            enabled: this.isEnabled,
            contextState: this.context?.state || 'unknown',
            currentlyPlaying: this.currentPlaying.size,
            masterVolume: this.masterVolume,
            soundsLoaded: this.sounds.size
        };
    }
}