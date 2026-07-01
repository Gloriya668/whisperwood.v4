/**
 * WhisperWood v5.0 — Rule Engine
 * 盲目迷雾 · Level System · Mirror · Counter · Chain Penalty
 *
 * 四关 + Boss 关，层层叠加。gesture.js 完全不改。
 *
 * Gesture Mapping (existing recognition → new names):
 *   CIRCLE      → circle
 *   SWIPE_LEFT  → zigzag
 *   SWIPE_UP    → lift
 */

// Map our 3 new gesture names → gesture.js GESTURE_TYPES constants
export const NEW_GESTURES = {
    circle: 'Circle',
    zigzag: 'Swipe_Left',
    lift: 'Swipe_Up',
};

// Additional static gesture aliases for better recognition accuracy
// gesture.js detects all 11 types perfectly; these map common static
// gestures to the 3 game targets so both motion AND static work
export const STATIC_ALIASES = {
    // Closed_Fist → circle (结界术)
    Closed_Fist: 'circle',
    // Open_Palm → zigzag (裂痕术)
    Open_Palm: 'zigzag',
    // Thumb_Up → lift (升腾术)
    Thumb_Up: 'lift',
};

// Reverse lookup: gesture.js ID → our gesture name (checks both direct + static aliases)
export function newGestureFromId(id) {
    // Direct motion gesture match
    for (const [k, v] of Object.entries(NEW_GESTURES)) {
        if (v === id) return k;
    }
    // Static gesture alias match (for higher accuracy via MediaPipe static detection)
    if (STATIC_ALIASES[id]) return STATIC_ALIASES[id];
    return null;
}

// Mirror map (what you SEE → what you DO)
export const MIRROR_MAP = {
    circle: 'zigzag',
    zigzag: 'lift',
    lift: 'circle',
};

// Counter map (what was cast → what beats it)
export const COUNTER_MAP = {
    circle: 'zigzag',
    zigzag: 'lift',
    lift: 'circle',
};

// Three gesture names + hints for display
export const GESTURE_DISPLAY = {
    circle: { name: '✨结界术', hint: '握拳 / 画圆', svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="28" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.7"/><circle cx="50" cy="50" r="18" stroke-width="1.5" opacity="0.4"/><circle cx="50" cy="50" r="5" stroke-width="2" opacity="0.8" fill="rgba(142,229,240,0.15)"/></svg>` },
    zigzag: { name: '⚡裂痕术', hint: '张掌 / 向左挥', svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M15 30 L35 70 L55 25 L85 65" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="85" cy="65" r="4" stroke-width="1.5" opacity="0.5"/></svg>` },
    lift: { name: '🕊升腾术', hint: '竖拇指 / 向上挥', svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M50 80 L50 25" stroke-width="3" stroke-linecap="round"/><path d="M35 40 L50 20 L65 40" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="85" r="4" stroke-width="2" opacity="0.4"/></svg>` },
};

// ====== Level Config ======
export const LEVELS = [
    {
        id: 1,
        name: '迷雾初现',
        tagline: 'Boss的眼睛是迷雾之源',
        targetScore: 200,
        bossSafe: 5000,   // Boss闭眼安全时间
        bossWatch: 2000,  // Boss睁眼注视时间
        timeLimit: 65,    // 总限时(秒)
        baseScore: 30,
        mirror: false,
        counter: false,
        chainPenalty: false,
    },
    {
        id: 2,
        name: '镜像迷途',
        tagline: '镜渊结界混入了迷雾',
        targetScore: 300,
        bossSafe: 4000,
        bossWatch: 2500,
        timeLimit: 60,
        baseScore: 30,
        mirror: true,
        counter: false,
        chainPenalty: false,
    },
    {
        id: 3,
        name: '残响追踪',
        tagline: 'Boss在迷雾中感知你的魔力残余',
        targetScore: 400,
        bossSafe: 3500,
        bossWatch: 3000,
        timeLimit: 55,
        baseScore: 35,
        mirror: false,
        counter: true,
        chainPenalty: false,
    },
    {
        id: 4,
        name: '衰减领域',
        tagline: '每次失败都在向Boss暴露你的频率',
        targetScore: 500,
        bossSafe: 3000,
        bossWatch: 3500,
        timeLimit: 50,
        baseScore: 40,
        mirror: false,
        counter: false,
        chainPenalty: true,
    },
    {
        id: 5,
        name: '全境压制',
        tagline: '四重诅咒同时降临',
        targetScore: 600,
        bossSafe: 2500,
        bossWatch: 4000,
        timeLimit: 45,
        baseScore: 50,
        mirror: true,
        counter: true,
        chainPenalty: true,
    },
];

const CHAIN_MULTIPLIER = [1.0, 0.7, 0.4];

// ====== Rule Engine Factory ======
export function createRuleEngine(levelConfig) {
    let failStreak = 0;
    let lastSuccessGesture = null;
    let lastExpectedGesture = null; // Prevent consecutive repeats
    let bossState = 'safe'; // 'safe' | 'watching'
    let bossTimerInterval = null;
    let targetScore = 0;
    let currentPrompt = null;

    // Boss timer callbacks
    let onBossStateChange = null;
    let onTimeUpdate = null;

    // Random gesture pick (excluding the given gesture)
    function randomGesture(exclude) {
        const gestures = Object.keys(NEW_GESTURES);
        const pool = exclude ? gestures.filter(g => g !== exclude) : gestures;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function generatePrompt() {
        let actualTarget; // What player must physically do

        if (levelConfig.counter && lastSuccessGesture) {
            // Counter mode: player must counter the last successful gesture
            actualTarget = COUNTER_MAP[lastSuccessGesture];
        } else {
            // Non-counter (or counter mode first round): random, excluding last expected
            // This prevents the same gesture appearing twice in a row
            actualTarget = randomGesture(lastExpectedGesture);
        }

        // Track what we're expecting (for next round's exclusion)
        lastExpectedGesture = actualTarget;

        // What to display on screen
        let displayedGesture;
        let hint = null;

        if (levelConfig.mirror) {
            // Mirror mode: show the OPPOSITE of what player must do
            displayedGesture = Object.keys(MIRROR_MAP).find(k => MIRROR_MAP[k] === actualTarget);
            hint = '🪞 镜像';
        } else {
            displayedGesture = actualTarget;
        }

        if (levelConfig.counter && lastSuccessGesture) {
            hint = (hint ? hint + ' · ' : '') + `💭 残响: ${GESTURE_DISPLAY[lastSuccessGesture]?.name || lastSuccessGesture} → 克它`;
        }

        currentPrompt = { displayedGesture, expectedGesture: actualTarget, hint, timestamp: Date.now() };
        return currentPrompt;
    }

    function validate(gesture) {
        if (!gesture || !currentPrompt) {
            failStreak = Math.min(failStreak + 1, 2);
            return { valid: false, reason: 'no_gesture' };
        }

        if (gesture !== currentPrompt.expectedGesture) {
            failStreak = Math.min(failStreak + 1, 2);
            return { valid: false, reason: 'wrong' };
        }

        // Success
        const multiplier = levelConfig.chainPenalty
            ? CHAIN_MULTIPLIER[Math.min(failStreak, 2)]
            : 1.0;
        const score = Math.round(levelConfig.baseScore * multiplier);

        lastSuccessGesture = gesture;
        failStreak = 0;
        targetScore += score;

        return {
            valid: true,
            score,
            multiplier,
            targetScore,
            levelComplete: targetScore >= levelConfig.targetScore,
        };
    }

    // ===== Boss state machine =====
    function tickBoss() {
        if (bossState === 'safe') {
            bossState = 'watching';
            if (onBossStateChange) onBossStateChange('watching');
        } else {
            bossState = 'safe';
            generatePrompt();
            if (onBossStateChange) onBossStateChange('safe', currentPrompt);
        }

        // Schedule next toggle
        const nextDelay = bossState === 'watching' ? levelConfig.bossWatch : levelConfig.bossSafe;
        bossTimerInterval = setTimeout(tickBoss, nextDelay);
    }

    function startBossCycle() {
        bossState = 'safe';
        generatePrompt();
        if (onBossStateChange) onBossStateChange('safe', currentPrompt);
        bossTimerInterval = setTimeout(tickBoss, levelConfig.bossSafe);
    }

    function stopBossCycle() {
        clearTimeout(bossTimerInterval);
        bossTimerInterval = null;
    }

    function getBossState() { return bossState; }
    function getFailStreak() { return failStreak; }
    function getLastSuccess() { return lastSuccessGesture; }
    function getCurrentPrompt() { return currentPrompt; }
    function getTargetScore() { return targetScore; }

    return {
        generatePrompt,
        validate,
        startBossCycle,
        stopBossCycle,
        getBossState,
        getFailStreak,
        getLastSuccess,
        getCurrentPrompt,
        getTargetScore,
        setOnBossStateChange(fn) { onBossStateChange = fn; },
        setOnTimeUpdate(fn) { onTimeUpdate = fn; },
        reset() {
            failStreak = 0;
            lastSuccessGesture = null;
            lastExpectedGesture = null;
            targetScore = 0;
            currentPrompt = null;
            bossState = 'safe';
        },
    };
}
