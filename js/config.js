// 設定ファイル - システム全体の定数とパラメータ
const CONFIG = {
    // カメラ設定
    CAMERA: {
        WIDTH: 640,
        HEIGHT: 480,
        FRAME_RATE: 30
    },
    
    // 魔法陣設定
    MAGIC_CIRCLE: {
        SIZE: 160,              // 魔法陣のサイズ（少し大きく）
        DURATION: 3000,         // 表示時間（ミリ秒）
        COLOR: '#C846FF',       // より鮮やかな紫色
        GLOW_INTENSITY: 60,     // 発光強度（少し強く）
        ROTATION_SPEED: 0.015,  // 回転速度（少しゆっくり）
        PULSE_SPEED: 0.08       // パルス速度（少しゆっくり）
    },
    
    // カエル設定
    FROG: {
        MAX_COUNT: 5,           // 最大同時表示数
        SIZE: 30,               // サイズ
        JUMP_HEIGHT: 80,        // ジャンプ高さ
        JUMP_DISTANCE: 120,     // ジャンプ距離
        LIFETIME: 8000,         // 生存時間（ミリ秒）
        COLOR: '#00FF88',       // 緑色
        JUMP_DURATION: 1200     // ジャンプアニメーション時間
    },
    
    // 卵設定
    EGG: {
        MAX_COUNT: 3,           // 最大同時表示数
        SIZE: 40,               // サイズ
        SWAY_AMOUNT: 0.3,       // 揺れの幅
        SWAY_SPEED: 0.05,       // 揺れの速度
        LIFETIME: 15000,        // 生存時間（ミリ秒）
        COLOR: '#FFE4B5',       // 卵色
        PULSE_COLOR: '#FFD700', // パルス色
        PULSE_SPEED: 0.08       // パルス速度
    },
    
    // パフォーマンス設定
    PERFORMANCE: {
        MAX_PARTICLES: 20,      // 最大パーティクル数
        FPS_TARGET: 30,         // 目標FPS
        QUALITY_AUTO_ADJUST: true, // 自動品質調整
        LOW_FPS_THRESHOLD: 20   // 低FPS閾値
    },
    
    // エフェクト設定
    EFFECTS: {
        SPAWN_FLASH_DURATION: 300,  // 召喚時のフラッシュ時間
        DESPAWN_FADE_DURATION: 500, // 消滅時のフェード時間
        PARTICLE_COUNT: 15,         // パーティクル数
        GLOW_RADIUS: 30            // グロー半径
    },
    
    // 音響設定
    AUDIO: {
        MASTER_VOLUME: 0.7,
        MAGIC_CIRCLE_VOLUME: 0.8,
        FROG_VOLUME: 0.6,
        EGG_VOLUME: 0.5
    }
};

// デバッグ設定
const DEBUG = {
    ENABLED: false,              // デバッグモード
    SHOW_FPS: true,             // FPS表示
    SHOW_OBJECT_COUNT: true,    // オブジェクト数表示
    SHOW_TOUCH_POINTS: false,   // タッチ座標表示
    LOG_PERFORMANCE: false      // パフォーマンスログ
};

// グローバル状態
const GAME_STATE = {
    initialized: false,
    cameraReady: false,
    audioReady: false,
    currentFPS: 0,
    objectCount: 0,
    performance: 'normal' // 'normal', 'low', 'potato'
};