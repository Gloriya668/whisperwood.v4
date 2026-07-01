# WhisperWood v5.0 — 产品需求文档

> 低语森林 · Gothic Dark Fairytale · 手势识别战斗游戏  
> 产品经理视角完整规格说明  
> 状态：已实现

---

# 目录

1. [产品概述](#1-产品概述)
2. [世界观与叙事](#2-世界观与叙事)
3. [核心架构](#3-核心架构)
4. [页面流程](#4-页面流程)
5. [手势识别系统](#5-手势识别系统)
6. [盲目迷雾机制](#6-盲目迷雾机制)
7. [关卡系统](#7-关卡系统)
8. [规则引擎](#8-规则引擎)
9. [Boss状态机](#9-boss状态机)
10. [游戏状态管理](#10-游戏状态管理)
11. [HUD系统](#11-hud系统)
12. [特效系统](#12-特效系统)
13. [3D空间系统](#13-3d空间系统)
14. [音效与音乐](#14-音效与音乐)
15. [心跳压迫系统](#15-心跳压迫系统)
16. [视觉设计规范](#16-视觉设计规范)
17. [技术架构](#17-技术架构)
18. [附录：参数速查表](#18-附录参数速查表)

---

# 1. 产品概述

## 1.1 产品定义

**WhisperWood v5.0** 是一款基于浏览器摄像头手势识别的黑暗童话风格单机战斗游戏。玩家通过 MediaPipe 实时手势识别做出对应咒术动作，在"盲目迷雾"的视觉压制下对抗暗黑之主的诅咒。

## 1.2 核心体验

- **认知负荷层层递进**：第1关仅需在迷雾间隙"看清即做"；到Boss关需要在2.5秒窗口内完成"看清 → 镜像翻转 → 克制推理 → 施放动作"
- **视觉压迫贯穿始终**：Boss 的注视 = 全屏模糊，从第一秒就在对抗迷雾
- **失败有滚雪球后果**：连续失误触发心跳压迫 + 倍率递减 + 画面暗红

## 1.3 技术基础

| 维度 | 选型 |
|------|------|
| 运行环境 | 浏览器（localhost / HTTPS） |
| 手势输入 | MediaPipe Gesture Recognizer（GPU delegate） |
| 渲染 | HTML/CSS/Tailwind + Canvas 2D |
| 音频 | Web Audio API（SFX合成）+ HTMLAudioElement（BGM） |
| 3D | CSS `perspective` + `transform: translateZ()` |
| 核心模块 | `gesture.js`（识别，只读不改） + `ruleEngine.js`（规则） + `app.js`（状态机） |

## 1.4 项目文件

```
whisperwood.v4.0/
├── index.html      42 KB — 页面结构/Tailwind/SVG素材
├── style.css       29 KB — 样式/动画/3D/盲目迷雾
├── app.js          19 KB — 状态机/特效/关卡流程
├── gesture.js      24 KB — 手势识别引擎（MD5: 94571cbf...）
├── ruleEngine.js   7 KB  — 规则引擎/关卡配置/Boss状态机
├── sfx.js          13 KB — 音效合成
├── bgm.js          1.4 KB — BGM播放器
└── bgm.mp3         4.3 MB — 用户自定义背景音乐
```

---

# 2. 世界观与叙事

## 2.1 背景设定

玩家是一名误入低语森林的年轻巫师。森林中盘踞着一位远古的**暗黑之主**——祂不需要身体，祂的眼睛本身就是诅咒。

**基础法则**：Boss 的注视具有魔力压制。只要祂睁眼，任何生灵的视野都会陷入浓雾。这不是某个阶段才出现的机制，而是这个世界的底层物理规律。

## 2.2 叙事线

| 关卡 | 叙事 |
|------|------|
| 第1关·迷雾初现 | 你刚踏入森林，发现只要那东西睁眼，什么都看不见。你必须在祂闭眼的间隙中施法，撑到祂疲惫。 |
| 第2关·镜像迷途 | Boss 布下了镜渊结界。屏幕上显示的符文是镜像幻象，真实的施法动作必须翻转。 |
| 第3关·残响追踪 | Boss已经能从迷雾中感知你的魔力残余频率。你必须不断用克制属性的咒术覆盖上一轮的痕迹。 |
| 第4关·衰减领域 | Boss 在学习你的魔力特征。每次失败都在向祂暴露你的频率——你的咒术效果正被逐步免疫。 |
| Boss·全境压制 | 四重诅咒同时降临：镜渊结界 + 残响追踪 + 魔力衰减 + 盲目迷雾。两步推理在2.5秒窗口内完成。 |

## 2.3 黑暗童话文案

| 页面 | 文案 |
|------|------|
| Landing | "迷雾深处，枯枝编织成笼。那低语声并非风——是祂在等你犯错。" |
| Camera | "森林需要看见你的手。别担心——祂只是在……观察。" |
| Countdown | "祂正在苏醒" / "别让我失望。" |
| Whisper(失败) | "时间耗尽了……迷雾吞没了一切。你没能在这片森林的注视下完成封印。" |
| Whisper(成功) | "所有诅咒尽归尘土。暗黑之主的低语终于沉默了。" |
| Result | 4组暗黑评语，按关卡分段 |

---

# 3. 核心架构

## 3.1 模块关系图

```
┌──────────────────────────────────────────────────┐
│                    gesture.js                      │
│              (手势识别，只读不改)                    │
│          Layer1 静态 + Layer2 动态 + Layer3 连招     │
│           输出 gesture ID → app.js                 │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                   app.js                           │
│              游戏状态机 + 特效 + 流程               │
│                                                    │
│  接收 gesture ID → newGestureFromId() → 转换名称    │
│  → ruleEngine.validate() → 判定通过/失败           │
│  → 触发特效/音效/HUD更新                           │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                 ruleEngine.js                      │
│             关卡配置 + 规则验证 + Boss状态机         │
│                                                    │
│  generatePrompt() → 根据关卡生成提示(镜像/克制)      │
│  validate() → 匹配判定 + 倍率计算 + 通关判断         │
│  tickBoss() → 睁眼/闭眼状态切换 + 回调              │
└──────────────────────────────────────────────────┘
```

## 3.2 数据流

```
摄像头 → MediaPipe Recognizer → gesture.js
  → gesture ID ("Circle" / "Swipe_Left" / "Swipe_Up")
  → newGestureFromId() 映射 → "circle" / "zigzag" / "lift"
  → ruleEngine.validate() → { valid, score, multiplier, levelComplete }
  → handleHit() 或 handleMiss()
  → 特效 / 音效 / HUD / 心跳
```

---

# 4. 页面流程

```
Landing
  └→ Camera (授权摄像头)
       └→ Tutorial (3个手势教学)
            └→ Level Select (选关)
                 └→ Countdown (3/2/1)
                      └→ Battle (核心战斗)
                           ├─ 通关 → Whisper(成功)
                           │          └→ Level Select(下一关) 或 Result(Boss通关)
                           └─ 超时 → Whisper(失败)
                                      └→ Countdown(重试)
                               
Result (结算)
  ├→ 再入深渊 → Countdown → Battle
  └→ 逃离 → Landing
```

## 4.1 各页面说明

### Landing
- 暗黑之主巨影背景（Alpha 40%）
- 小巫师角色（斗篷尖帽 + 幽蓝眼睛）
- 鹿角骷髅Logo SVG + 灰烬粒子 ×25
- 按钮「踏入荆棘」

### Camera
- 骷髅蜡烛图标（骷髅 + 头顶蜡烛SVG）
- 摄像头预览框 + 文案
- 按钮「允许窥视」
- 授权后：BGM开始、MediaPipe模型加载、2秒后自动跳Tutorial

### Tutorial
按序教学3种手势：结界术(circle) → 裂痕术(zigzag) → 升腾术(lift)
- 成功1200ms后自动下一手势
- 全部通过→Level Select

### Level Select
- 下拉菜单选择关卡（1-4 + Boss）
- 关卡信息卡片：目标分/限时/安全时间/凝视时间/底分/机制标签
- 按钮「踏入诅咒」→ Countdown

### Countdown
- 暗黑之主背景 + 120px数字 3→2→1
- 每跳：`sfxTick`，最后一跳：`sfxFinalTick`

### Battle
核心页面，详见§7-12

### Whisper
- 女巫帽骷髅SVG
- 结果文案 + 按钮「举起你的手」
- 通关→下一关Level Select / Boss通关→Result
- 失败→同关重试

### Result
- 枯树残月SVG
- 波次/得分/连招统计
- 手势准确率明细
- 暗黑评语 +「再入深渊」「逃离」按钮

---

# 5. 手势识别系统

> ⚠️ **核心模块，文件只读。** 所有游戏规则改动不得触及此文件。

## 5.1 文件信息

| 属性 | 值 |
|------|------|
| 文件名 | `gesture.js` |
| 大小 | 24.2 KB |
| MD5 | `94571cbf3d45b8db717388776d118c91` |
| 状态 | 只读，从未改动 |

## 5.2 三层架构

### Layer 1: 静态手势识别

| 手势 | 识别条件 | 方式 |
|------|----------|------|
| Closed_Fist (握拳) | 五指均不伸展 | MediaPipe(置信≥50%) + 自定义规则 |
| Open_Palm (张掌) | 四指均伸展 | MediaPipe + 自定义规则 |
| Thumb_Up (竖拇指) | 仅拇指伸展 | MediaPipe + 自定义规则 |
| Victory (剪刀手) | 食指+中指伸展 | 自定义规则（游戏中未启用） |

参数：MediaPipe置信度阈值 `0.50`、连续确认 `2` 帧、动态手势后抑制 `350ms`

### Layer 2: 动态手势识别

**EMA平滑器**: α = 0.35

**MotionTracker 状态机**: `idle → triggered → tracking → 评估 → reset`

| 参数 | 值 | 说明 |
|------|------|------|
| SWIPE_SPEED_TRIGGER | 0.06 | idle→triggered |
| SWIPE_SPEED_CONFIRM | 0.15 | triggered→tracking |
| SWIPE_MIN_DIST | 0.03 | 最小位移 |
| SWIPE_MAX_DURATION | 800ms | 超时放弃 |
| SWIPE_MIN_DURATION | 50ms | 最短挥动时间 |
| SWIPE_DIRECTNESS | 0.45 | 路径直接度 |
| SWIPE_DECEL_RATIO | 0.30 | 减速至峰值30%触发评估 |
| COOLDOWN_MS | 350ms | 识别后冷却 |
| MAX_POSITIONS | 60 | 位置历史 |
| 融合点权重 | wrist:30%, middle_MCP:40%, index_MCP:30% |

方向投票：逐段角度计算 → 按段长加权 → 主导方向须 ≥ 次优×1.3

Circle检测：窗口15/25/40、闭合度≤0.20、Shoelace面积≥0.0025、路径≥0.1、时长200-2200ms

### Layer 3: 连招识别

| 参数 | 值 |
|------|------|
| COMBO_WINDOW | 2500ms |
| COMBO_COOLDOWN | 700ms |

连招模式：握拳→张掌 / 张掌→握拳 / 上挥→下劈（v5.0中未启用）

## 5.3 v5.0 手势映射

游戏中仅使用3种动态手势，通过映射桥接：

```
gesture.js 输出               →  ruleEngine 转化       →  UI显示
GESTURE_TYPES.Circle       →  "circle"            →  ✨结界术
GESTURE_TYPES.Swipe_Left   →  "zigzag"            →  ⚡裂痕术
GESTURE_TYPES.Swipe_Up     →  "lift"              →  🕊升腾术
```

映射表位于 `ruleEngine.js` 的 `NEW_GESTURES` 对象与 `newGestureFromId()` 函数。

---

# 6. 盲目迷雾机制

## 6.1 机制定义

盲目迷雾是贯穿全部5关的**基础视觉规则**。它不是后期解锁的难度升级，而是世界底层设定——Boss睁眼，视野模糊；Boss闭眼，画面清晰。

## 6.2 实现方式

```css
#battle-main.blind-mist {
    filter: blur(14px) brightness(0.22);
    transition: filter 0.25s ease;
    pointer-events: none;
}
```

- 模糊时 UI 元素同时被抑制：轨迹 Canvas（blur 6px, opacity 0.3）、镜头框（blur 8px）
- `pointer-events: none` 确保模糊期间玩家无法"碰运气"

## 6.3 游戏设计意图

- **信息不对称压缩**：玩家必须在 Boss 闭眼的有限窗口内看清、推理、施法
- **节奏控制**：Boss 睁眼/闭眼周期形成天然心跳节奏——安全期的结束是可预期的，但每个安全期越来越短
- **压力递增**：第1关安全 5 秒 → Boss关仅 2.5 秒，压迫感逐关上升

## 6.4 迷雾周期表

| 关卡 | Boss安全(闭眼) | Boss凝视(睁眼) | 完整周期 |
|------|---------------|---------------|----------|
| 第1关 | 5.0s | 2.0s | 7.0s |
| 第2关 | 4.0s | 2.5s | 6.5s |
| 第3关 | 3.5s | 3.0s | 6.5s |
| 第4关 | 3.0s | 3.5s | 6.5s |
| Boss | 2.5s | 4.0s | 6.5s |

**设计意图**：安全时间逐关收窄，凝视时间逐关延长——Boss 正在变强。

---

# 7. 关卡系统

## 7.1 关卡设计原则

**层层叠加，不删不替。** 每个新关卡在前一关基础上叠加一条新规则，Boss关四重全开。

```
关1: 盲目迷雾（基础）
关2: 盲目迷雾 + 镜像翻转
关3: 盲目迷雾 + 复现克制
关4: 盲目迷雾 + 连锁惩罚
Boss: 盲目迷雾 + 镜像 + 克制 + 惩罚（四重叠加）
```

## 7.2 关卡参数总表

| 属性 | 第1关 | 第2关 | 第3关 | 第4关 | Boss |
|------|-------|-------|-------|-------|------|
| 名称 | 迷雾初现 | 镜像迷途 | 残响追踪 | 衰减领域 | 全境压制 |
| 目标分 | 200 | 300 | 400 | 500 | 600 |
| Boss安全 | 5.0s | 4.0s | 3.5s | 3.0s | 2.5s |
| Boss凝视 | 2.0s | 2.5s | 3.0s | 3.5s | 4.0s |
| 关卡限时 | 65s | 60s | 55s | 50s | 45s |
| 单次底分 | 30 | 30 | 35 | 40 | 50 |
| 镜像 | ✗ | ✓ | ✗ | ✗ | ✓ |
| 复现克制 | ✗ | ✗ | ✓ | ✗ | ✓ |
| 连锁惩罚 | ✗ | ✗ | ✗ | ✓ | ✓ |

## 7.3 通关条件

**单关通关**：`累计得分 ≥ 目标分` 且 `关卡限时 > 0`

**通关后流程**：
- 第1-4关通关后 → Whisper成功提示 → 自动推进到下一关的Level Select
- Boss关通关后 → Whisper成功提示 → Result结算页

**失败条件**：
- 关卡限时归零 → Whisper失败提示 → 同关重试

## 7.4 各关详细规则

### 第1关：迷雾初现

**规则**：Boss闭眼时屏幕显示一个手势，玩家跟做即可。

**判定**：
```
gesture === displayedGesture → 得分
```

**叙事**：你刚踏入森林，发现只要那东西睁眼，什么都看不见。你必须在祂闭眼的间隙中施法，撑到祂疲惫。

**设计意图**：这是教学关。迷雾的节奏宽松（安全5s，占空比71%），让玩家适应"必须在窗口内完成"这个基本约束。

### 第2关：镜像迷途

**规则**：屏幕上显示一个手势，但玩家必须做它的**镜像版本**。

**镜像映射**：
```
circle (结界术)  ←→  zigzag (裂痕术)
zigzag (裂痕术)  ←→  lift (升腾术)
lift (升腾术)    ←→  circle (结界术)
```

**判定**：
```
gesture === MIRROR_MAP[displayedGesture] → 得分
gesture === displayedGesture → 不计分（做了跟做手势）
```

**UI**：手势类型标签显示「🪞 镜像」，诅咒名显示"🪞 镜像"

**叙事**：Boss的镜渊结界混入了迷雾。你看到的符文是镜中幻象，真实施法动作必须做镜像翻转。

**设计意图**：打碎"看到什么做什么"的习惯。迷雾本就压缩了看清的时间，还要在看清后瞬间做一次空间翻转。这是认知负荷的第一次升级。

### 第3关：残响追踪

**规则**：屏幕不显示当前目标手势，而是显示**上一轮成功施放的手势**（作为Boss感知到的魔力残响）。玩家必须做出该手势的**克制手势**。

**克制循环**：
```
circle → zigzag → lift → circle
```

**工作流程**：
1. 第一轮：系统随机选起手式，玩家做它的克制手势 → 得分，记录
2. 第二轮：屏幕显示上一轮成功的手势（"残响"），玩家做克制
3. 循环往复

**判定**：
```
gesture === COUNTER_MAP[lastSuccessfulGesture] → 得分
```

**UI**：诅咒名显示"💭 残响: circle → 克它"

**叙事**：Boss已经能从迷雾中感知你的魔力残余频率。你必须不断用克制属性的符文覆盖上一轮的痕迹，否则Boss会在迷雾中锁定你的精确位置。

**设计意图**：在第一关的肌



肉记忆和第二关的空间翻转之后，这一关加入了**记忆+推理**。迷雾压缩了清晰时间，但先要回忆上一次做了什么 → 再推算克制关系。记忆和推理挤占了本就不多的动作时间。

### 第4关：衰减领域

**规则**：每次失败（做错手势），下一次成功得分倍率递减。成功一次后倍率重置。

**惩罚阶梯**：

| 连续失败次数 | 得分倍率 |
|------------|---------|
| 0 | ×1.0 |
| 1 | ×0.7 |
| 2+ | ×0.4 |

**判定**：
```
失败: failStreak++, 上限2
成功: score = baseScore × CHAIN_MULTIPLIER[failStreak], failStreak=0
```

**UI**：得分颜色随倍率变化——正常白（×1.0）、警告橙（×0.7）、危险红（×0.4）

**叙事**：迷雾中Boss正在学习你的魔力频率。每次失败都在向Boss暴露你的魔力特征。你的符文效果正在被Boss逐步免疫。

**设计意图**：一次失误不再是"浪费一轮"，而是"污染后续"。连续失败两次后每轮仅40%得分，基本宣告本关死刑。"不能连续犯错"和"迷雾中本来就容易犯错"形成矛盾张力。

### Boss关：全境压制

**四重叠加**：盲目迷雾 + 镜像翻转 + 复现克制 + 连锁惩罚。

**复合推理链**（所有机制同时生效时）：

> Boss闭眼（画面清晰）→ 屏幕显示上一轮残响（如"circle"）→ 先镜像翻转（zigzag）→ 再克制推理（lift）→ 做 lift 得分

两步推理在 2.5 秒的安全窗口内完成。对认知负荷的考验拉到极限。

**注意**：在 Boss 的 4 秒凝视期间，如果玩家做出任何手势 → 判定为失败（在 `watching` 状态下直接触发 `handleMiss`）。

---

# 8. 规则引擎

## 8.1 文件信息

| 属性 | 值 |
|------|------|
| 文件名 | `ruleEngine.js` |
| 导出模块 | `createRuleEngine`, `LEVELS`, `NEW_GESTURES`, `GESTURE_DISPLAY`, `MIRROR_MAP`, `COUNTER_MAP`, `newGestureFromId` |

## 8.2 工厂函数

```js
createRuleEngine(levelConfig) → RuleEngine 实例
```

传入关卡配置对象（从 `LEVELS[levelId-1]` 获取），返回包含以下方法的规则引擎实例。

## 8.3 API 接口

### generatePrompt()

**返回**：`{ displayedGesture, expectedGesture, hint, timestamp }`

**逻辑**：
```
1. 确定 actualTarget（玩家必须做的真实手势）:
   - 如果是 counter 模式且有上轮成功记录 → COUNTER_MAP[lastSuccessGesture]
   - 否则 → 随机选择一个手势

2. 确定 displayedGesture（屏幕上显示什么）:
   - 如果是 mirror 模式 → MIRROR_MAP 反查（显示镜像的原始端）
   - 否则 → actualTarget 本身

3. 生成 hint 标签:
   - mirror: "🪞 镜像"
   - counter: "💭 残响: X → 克它"
   - 两者叠加: "🪞 镜像 · 💭 残响: X → 克它"
```

### validate(gesture)

**参数**：玩家实际做出的手势名（"circle"/"zigzag"/"lift"）

**返回**：
```js
成功: { valid: true, score, multiplier, targetScore, levelComplete }
失败: { valid: false, reason: 'no_gesture' | 'wrong' }
```

**逻辑**：
1. gesture 为空 → failStreak++ → 失败
2. gesture ≠ expectedGesture → failStreak++ → 失败
3. 匹配成功：
   - 计算 multiplier（chainPenalty模式下查CHAIN_MULTIPLIER表，否则1.0）
   - score = round(baseScore × multiplier)
   - lastSuccessGesture = gesture
   - failStreak = 0
   - targetScore += score
   - levelComplete = targetScore >= targetScore

### startBossCycle() / stopBossCycle()

启动/停止Boss睁眼闭眼循环（详见 §9）。

### getter

| 方法 | 返回值 |
|------|--------|
| getBossState() | 'safe' \| 'watching' |
| getFailStreak() | 0 \| 1 \| 2 |
| getLastSuccess() | 手势名 \| null |
| getCurrentPrompt() | prompt对象 \| null |
| getTargetScore() | 当前累计得分 |

### 回调注册

| 方法 | 说明 |
|------|------|
| setOnBossStateChange(fn) | Boss状态变化时回调。参数: (state, prompt?) |
| setOnTimeUpdate(fn) | 预留的时间更新回调 |

### reset()

重置所有内部状态：failStreak、lastSuccessGesture、targetScore、currentPrompt、bossState。

---

# 9. Boss状态机

## 9.1 状态定义

```
safe ───→ watching ───→ safe ───→ watching ───→ ...
  │                     │
  └── 画面清晰            └── 画面模糊（盲目迷雾）
  └── 显示手势提示         └── 手势提示隐藏
  └── 接受玩家输入         └── 任何输入判定失败
```

## 9.2 状态转换逻辑

```js
function tickBoss() {
    if (bossState === 'safe') {
        bossState = 'watching';
        callback('watching');           // → 触发盲目迷雾 ON
    } else {
        bossState = 'safe';
        generatePrompt();               // → 生成新提示
        callback('safe', currentPrompt); // → 触发盲目迷雾 OFF + 更新手势显示
    }
    // 根据当前状态调度下一次切换
    const nextDelay = bossState === 'watching' ? bossWatch : bossSafe;
    setTimeout(tickBoss, nextDelay);
}
```

## 9.3 启动顺序

```
startBossCycle()
  → bossState = 'safe'
  → generatePrompt()
  → callback('safe', prompt)     // 画面清晰，显示第一个手势
  → setTimeout(tickBoss, bossSafe) // 5秒后切换为watching
```

## 9.4 凝视期间的规则

当 `bossState === 'watching'` 时：
- UI层：`#battle-main` 添加 `.blind-mist` class
- 手势显示：SVG/名称/提示全部清空，显示"迷雾中……"
- 玩家输入：`handleBattleGesture` 中检测到 `watching` 状态 → 直接判定失败

---

# 10. 游戏状态管理

## 10.1 Game State

```js
gameState = {
    health: 3,                // 生命值（3朵玫瑰）
    maxHealth: 3,             // 最大生命
    score: 0,                 // 累计得分
    currentLevel: 1,          // 当前关卡编号 1-5
    levelTimeLeft: 0,         // 关卡剩余秒数
    levelTimerInterval: null, // 关卡倒计时 timerID
    isActive: false,          // 游戏是否活跃
    gestureStats: {           // 手势命中/失误统计
        'Circle':      { hit: 0, miss: 0 },
        'Swipe_Left':  { hit: 0, miss: 0 },
        'Swipe_Up':    { hit: 0, miss: 0 },
    },
    consecutiveMisses: 0,     // 连续失误次数
    heartbeatInterval: null,  // 心跳压迫 timerID
}
```

## 10.2 战斗核心循环

```
startBattle()
  ├─ 读取关卡配置 LEVELS[level-1]
  ├─ 创建 ruleEngine
  ├─ 注册 onBossStateChange 回调
  │    ├─ 'watching' → setBlindMist(true) + 清空手势显示
  │    └─ 'safe'     → setBlindMist(false) + updateGestureDisplay()
  ├─ 启动关卡倒计时 levelTimerInterval
  ├─ 初始化 Trails / Camera / UI
  ├─ ruleEngine.startBossCycle()  → Boss睁眼闭眼循环开始
  └─ engine.startRecognition()    → MediaPipe识别开始

每帧手势检测:
  engine.onGesture → handleBattleGesture(gesture)
    ├─ bossState === 'watching' → handleMiss() (直接失败)
    ├─ newGestureFromId(gesture) → "circle"/"zigzag"/"lift"
    ├─ ruleEngine.validate() → { valid, score, ... }
    ├─ valid=true  → handleHit(result)
    │                  ├─ score+= 加分, 特效, 音效
    │                  ├─ result.levelComplete → 通关 → Whisper
    │                  └─ 继续 → setTimeout(generatePrompt, 500ms)
    └─ valid=false → handleMiss()
                       ├─ failStreak++, 心跳压迫
                       ├─ 特效 + UI更新
                       └─ setTimeout(generatePrompt, 500ms)

关卡倒计时:
  每秒 levelTimeLeft--
    ├─ > 0  → 更新计时条
    └─ ≤ 0 → endBattle(false) → Whisper(失败)
```

## 10.3 计分公式

```
单次得分 = round(baseScore × chainMultiplier[failStreak])

其中:
  baseScore = 关卡配置 (30/30/35/40/50)
  chainMultiplier = [1.0, 0.7, 0.4] (仅第4关和Boss关启用)
  failStreak 上限为 2

关卡通关条件: score ≥ targetScore
```

## 10.4 关卡推进逻辑

```
通关判定 { score ≥ targetScore }:
  currentLevel < 5 → Whisper(通关提示) → Level Select(下一关)
  currentLevel = 5 → Whisper(通关提示) → Result

失败判定 { levelTimeLeft ≤ 0 }:
  Whisper(失败提示) → Countdown(重试同关)
```

---

# 11. HUD系统

## 11.1 战斗HUD布局

```
┌──────────────────────────────┐
│ 第1关 · 迷雾初现               │ ← level-indicator
├──────────────────────────────┤
│ 盲目迷雾          [score]    │ ← wave-display / combo-counter
│ 🌹🌹🌹                       │ ← health-roses
│ 分数 ████░░░░ 30%          │ ← erosion-bar (进度条)
│ 剩余 ████████░░ 52s         │ ← level-timer-bar / level-timer-text
├──────────────────────────────┤
│                              │
│      ⚠ 诅咒名                │ ← curse-name
│     (诅咒名/镜像标签)          │
│                              │
│     ┌───Gesture Ring───┐    │
│     │   ✨结界术 SVG     │    │ ← battle-gesture-svg
│     └──────────────────┘    │
│     手势名称 [类型标签]       │ ← battle-gesture-name / gesture-type-indicator
│     提示文字                 │ ← battle-gesture-hint
│                              │
│  ┌───镜头框───┐              │ ← camera-mirror (右上)
│  │  [视频]    │              │
│  └───────────┘              │
│       🔊 🎵                  │ ← btn-sfx-toggle / btn-bgm-toggle
└──────────────────────────────┘
```

## 11.2 HUD组件清单

| ID | 元素 | 更新时机 | 说明 |
|------|------|----------|------|
| `level-indicator` | 关卡名 | startBattle | "第1关 · 迷雾初现" |
| `wave-display` | 状态标签 | 持续 | "盲目迷雾" |
| `combo-counter` | 分数 | 每次命中 | 命中时pop动画显示"+N" |
| `health-roses` | 生命 | updateBattleUI | 3朵'local_florist'图标MB |
| `erosion-bar` | 分数进度 | updateBattleUI | 0→100%，Ghost Blue渐变 |
| `erosion-percent` | 进度% | updateBattleUI | 显示当前完成% |
| `level-timer-bar` | 关卡倒计时 | 每秒 | 100→0%，≤15s变红 |
| `level-timer-text` | 剩余秒数 | 每秒 | "52s" |
| `curse-name` | 诅咒/提示 | Boss安全时 | flicker闪动，镜像时显示镜像标签 |
| `battle-gesture-svg` | 手势图形 | Boss安全时 | 结界术/裂痕术/升腾术SVG |
| `battle-gesture-name` | 手势名 | Boss安全时 | "✨结界术" |
| `battle-gesture-hint` | 操作提示 | Boss安全时 | "指尖画一个圆" |
| `gesture-type-indicator` | 类型标签 | Boss安全时 | "⚡ 动态" / "🪞 镜像" |
| `camera-mirror` | 自拍镜头 | startBattle | 72px圆形，镜像翻转 |
| `btn-sfx-toggle` | 音效开关 | - | 🔊/🔇 |
| `btn-bgm-toggle` | BGM开关 | - | 🎵 |

## 11.3 Boss凝视期间的HUD

当 `bossState === 'watching'` 时：
- 手势SVG: 清空
- 手势名称: "???"
- 提示文字: "迷雾中……"
- 诅咒名: "凝视压制"
- 盲目迷雾类名: `.blind-mist` 添加

---

# 12. 特效系统

## 12.1 魔法封印成功特效 (`#fx-success`)

**触发**：每次手势命中时。

| 元素 | 动画 | 参数 |
|------|------|------|
| 能量环×2 | 扩散消失 | 60→350px, 0.8s, cubic-bezier |
| 六芒星魔法阵 SVG | 旋转缩放出现 | rotate -180→0°, scale 0.3→1 |
| "咒术生效" 文字 | 延迟淡入 | 0.6s延迟, soul-flame发光 |
| 自动清除 | fade-out | 700ms后触发, 400ms过渡 |

## 12.2 恶魔凝视失败特效 (`#fx-failure`)

**触发**：每次手势失误时。

| 元素 | 动画 | 参数 |
|------|------|------|
| 暗影收缩 | radial-gradient | 红色调暗角 |
| 恶魔之眼 SVG | 睁眼动画 | 鹿角+枯枝+血丝+竖瞳+骷髅 |
| 色彩扭曲 | hue-rotate ±10° | `demon-distort` class 0.6s |
| "你的灵魂在颤抖" | 文字淡入 | soul-flame-red发光 |
| 自动清除 | 900ms后fade-out | 500ms过渡 |

## 12.3 魔法轨迹系统 (Canvas 2D)

独立 rAF 循环，仅在战斗页面运行（`trailAnimRunning` 控制）。

### 墨水丝带

- 3-pass 宽线发光（无 `shadowBlur`）
  - Pass1: alpha=0.12, width=3+10t
  - Pass2: alpha=0.07, width=3+20t
  - Pass3: alpha=0.04, width=3+30t
- 内层书法笔触（笔速决定粗细: `thick = max(0.3, 1 - segmentSpeed×0.02)`）
- 白色高光核心（尾端50%后渐显）
- 头部多层光环: 16/10/7px圆 + 4/2px核心

### 魔法粒子
| 参数 | 值 |
|------|------|
| 上限 | 60 |
| 生成速度 | `min(3, floor(speed×15))` /帧 |
| 类型 | 圆形(70%) + 星形(30%) |
| 颜色 | Ghost Blue(speed<0.15) / 亮青白(speed>0.15) |
| 副色触发 | speed>0.1, 50%概率生成Crimson粒子 |
| 衰减 | 0.015+random(0.02) |
| shadowBlur | 0 |

### 符文漂浮
| 参数 | 值 |
|------|------|
| 上限 | 15 |
| 字符池 | ⚶ ᛭ ✦ ⟡ ◈ ⬡ ✧ ⊛ ⟐ ◆ |
| 触发 | speed>0.12 且 85%概率 |
| 动画 | 上浮 + 旋转 ±0.05rad |
| shadowBlur | 0 |

### 爆裂粒子
- 触发：手势命中时
- 青色25发 + 红色12发
- 每粒子保留6帧尾迹
- 额外生成3个符文

---

# 13. 3D空间系统

## 13.1 实现方式

CSS `perspective: 1200px` 应用于 `#page-battle`，各元素通过 `translateZ()` 分层。

## 13.2 Z轴深度表

| Z深度 | 元素 | 视觉效果 |
|--------|------|----------|
| -80px | 背景雾霾层 | blur 3px, opacity 0.4 |
| -50px | Vignette暗角 | 0 |
| -30px | 符文环 Canvas | blur 1px |
| +15px | 手势挑战环 | rotateX 5deg倾斜 |
| +20px | 手势 SVG | drop-shadow投影 |
| +30px | 连招计数器 | 浮出感 |
| +45px | 摄像头镜框 | 冲前 |
| +60px | 魔法轨迹 Canvas | 最具立体感 |
| +80-100px | 恶魔凝视眼睛 | 直冲面部 |

## 13.3 恶魔凝视3D

- 眼睛: `translateZ(80px)` + `drop-shadow(25px红) + drop-shadow(30px黑)`
- 眼睑: `translateZ(100px)`
- 文字: `translateZ(60px)`
- 8眼系统（双主眼+6小眼），左右瞳孔独立动画周期

---

# 14. 音效与音乐

## 14.1 音效系统 (sfx.js)

Web Audio API 合成，零外部文件。

| 函数 | 触发时机 | 合成方式 |
|------|----------|----------|
| `sfxSuccess()` | 手势命中 | C5-E5-G5-C6-E6 正弦波琶音 |
| `sfxMiss()` | 手势失败 | 120→30Hz正弦波 + 500Hz带通噪声 |
| `sfxDemonHeartbeat(intensify)` | 恶魔凝视/心跳压迫 | Phase1:50Hz×3, Phase2:70Hz×4+15Hz |
| `sfxMirrorActivate()` | 镜像激活 | 下行方波 + detune锯齿波 |
| `sfxClick()` | 按钮点击 | 800→200Hz 0.06s |
| `sfxTick()` | 倒计时 | 三角波180→60Hz |
| `sfxFinalTick()` | 倒计时末 | 正弦波60→15Hz 0.5s |
| `sfxTransition()` | 页面切换 | 带通滤波噪声 2000→200Hz |
| `sfxWhisper()` | 低语页 | 3段带通滤波噪声 |
| `sfxWaveClear()` | 关卡通关 | C-E-G-C 三角波和弦 |
| `sfxBattleStart()` | 战斗开始 | 40+40.5Hz detune双振荡器低吟 |
| `sfxBattleStop()` | 战斗结束 | 0.5s淡出低吟 |
| `setVolume(v)` | 音量控制 | 0-1, 默认0.7 |

## 14.2 背景音乐 (bgm.js)

| 属性 | 值 |
|------|------|
| 格式 | `.mp3` |
| 播放模式 | `loop=true` |
| 默认音量 | 30% |
| 开始时机 | 摄像头授权后 |
| 停止时机 | Result页 / 逃离回Landing |
| Fallback | 浏览器autoplay被拦截时，首次点击自动重试 |

---

# 15. 心跳压迫系统

**触发**：连续失误（`consecutiveMisses ≥ 1`）。

## 15.1 分级

| 连续失误 | 心跳间隔 | 音效 | 画面效果 |
|----------|----------|------|----------|
| 1 | 1200ms | Phase1 (50Hz) | screen-shake |
| 2 | 800ms | Phase2 (70Hz+15Hz) | screen-shake + `miss-streak-2`(饱和↑亮↑) |
| 3+ | 500ms | Phase2 | screen-shake + `miss-streak-3`(暗红高对比) |

## 15.2 视觉效果

- `miss-streak-2`: `brightness(1.1)` + `saturation(1.2)`
- `miss-streak-3`: `brightness(0.85)` + `saturation(1.5)` + `contrast(1.2)`
- `heartbeat-pulse`: `brightness(0.6)` + `saturation(1.8)` + `scale(1.008)` → 150ms恢复
- `screen-shake`: translate ±8px X + ±3px Y + rotate ±1°

## 15.3 清除

命中手势 → `resetConsecutiveMisses()` → `misses=0` + 清除 `miss-streak-*` classes + `stopHeartbeat()`

---

# 16. 视觉设计规范

## 16.1 设计系统

| 维度 | 参数 |
|------|------|
| 风格 | Dark Fairytale × Gothic × Ink & Ash |
| 主色 | `#8ee5f0` Ghost Blue |
| 辅色 | `#ffb3b5` Crimson |
| 背景 | `#0a1513` Deep Ink Green |
| 标题字体 | Bodoni Moda（Victorian尖细衬线） |
| 正文字体 | Literata（书卷学术） |
| 质感 | SVG噪声纸纹理 + 暗角vignette |
| 按钮 | Gothic clip-path切角 + 玻璃 + 角落符文 + 光效扫掠 |
| 发光 | text-shadow多层（soul-flame / soul-flame-red） |

## 16.2 视觉素材

| 素材 | 使用位置 |
|------|----------|
| 暗黑之主 (Dark Lord) | Landing背景、Countdown背景、Whisper背景 |
| 小巫师 (Wizard) | Landing角色 |
| 女巫帽+骷髅 SVG | Whisper装饰 |
| 枯树+残月 SVG | Result装饰 |
| 骷髅蜡烛 SVG | Camera装饰 |
| 恶魔之眼 SVG（代码绘制） | 失败特效 + 恶魔凝视 |

## 16.3 CSS动画资产

| 类名 | 触发 | 描述 |
|------|------|------|
| `.blind-mist` | Boss睁眼 | blur(14px) + brightness(0.22) |
| `.screen-shake` | 失误 | translate ±8px + rotate ±1° |
| `.heartbeat-pulse` | 心跳 | brightness(0.6) + scale(1.008) |
| `.combo-pop` | 命中得分 | scale 1→1.8→1 |
| `.soul-flame` | 文字发光 | Ghost Blue 12+30px |
| `.soul-flame-red` | 文字发光 | Crimson 12+30px |
| `.vignette` | 页面常驻 | radial-gradient暗角 |
| `.paper-grain` | 全局 | SVG噪声纹理 |
| `.ash-dissolve` | 倒计时 | blur+scale动画 |
| `.curse-flicker` | 诅咒名 | opacity闪烁 4s |
| `.miss-streak-2/3` | 连续失误 | 画面变红饱和 |
| `.tremor-active` | 恶魔凝视 | ±1.2px高频微颤 |
| `.demon-distort` | 失败 | hue-rotate扭曲 |

---

# 17. 技术架构

## 17.1 运行环境

| 项目 | 要求 |
|------|------|
| 浏览器 | Chrome/Edge（MediaPipe WebGL delegate） |
| 协议 | localhost 或 HTTPS（摄像头API） |
| 启动 | `python -m http.server 8080` |
| 外链 | MediaPipe CDN (~5MB wasm) + Tailwind CDN + Google Fonts |

## 17.2 性能保障

| 措施 | 说明 |
|------|------|
| gesture.js 只读 | MD5 `94571cbf...` 从不改动 |
| Canvas无shadowBlur | 所有粒子/符文/glyph渲染 shadowBlur=0 |
| 轨迹rAF独立 | `trailAnimRunning` 可控启停 |
| 音频独立线程 | Web Audio API 与主线程分离 |
| CSS compositor-only | 全部 transform/opacity 动画，零layout触发 |
| 镜像仅匹佩层 | 不进识别pipeline |

## 17.3 已知限制

- 仅支持单手识别（`numHands: 1`）
- 依赖外链CDN（离线环境需自行托管MediaPipe）
- BGM 仅支持 MP3 格式
- 不支持移动端（摄像头 facingMode: 'user'）

---

# 18. 附录：参数速查表

## 18.1 gesture.js 关键参数

| 参数 | 值 |
|------|------|
| EMA α | 0.35 |
| 速度触发 | 0.06 |
| 速度确认 | 0.15 |
| 冷却 | 350ms |
| 静态确认帧 | 2 |
| MediaPipe置信度 | 50% |
| 动作抑制 | 350ms |

## 18.2 关卡参数

| 参数 | 1关 | 2关 | 3关 | 4关 | Boss |
|------|-----|-----|-----|-----|------|
| 目标分 | 200 | 300 | 400 | 500 | 600 |
| 安全(秒) | 5.0 | 4.0 | 3.5 | 3.0 | 2.5 |
| 凝视(秒) | 2.0 | 2.5 | 3.0 | 3.5 | 4.0 |
| 限时(秒) | 65 | 60 | 55 | 50 | 45 |
| 底分 | 30 | 30 | 35 | 40 | 50 |

## 18.3 镜像映射

```
circle (结界术) ←→ zigzag (裂痕术)
zigzag (裂痕术) ←→ lift (升腾术)
lift (升腾术)   ←→ circle (结界术)
```

## 18.4 克制映射

```
circle → zigzag → lift → circle
```

## 18.5 连锁惩罚

| failStreak | 倍率 |
|-----------|------|
| 0 | 1.0 |
| 1 | 0.7 |
| 2+ | 0.4 |

## 18.6 特效参数

| 系统 | 上限 | shadowBlur |
|------|------|------------|
| 魔法粒子 | 60 | 0 |
| 符文漂浮 | 15 | 0 |
| 爆裂粒子 | 25+12 | 0 |
| 灰烬粒子 | 25 | N/A(CSS) |

## 18.7 音效参数

| 音效 | 默认音量 |
|------|---------|
| 全部SFX | 70% |
| BGM | 30% |

## 18.8 文件清单

| 文件 | 大小 | 状态 |
|------|------|------|
| index.html | 42 KB | v5.0更新 |
| style.css | 29 KB | v5.0更新 |
| app.js | 19 KB | v5.0重写 |
| gesture.js | 24 KB | 原始未改 |
| ruleEngine.js | 7 KB | v5.0新增 |
| sfx.js | 13 KB | 原始 |
| bgm.js | 1.4 KB | 原始 |
| bgm.mp3 | 4.3 MB | 用户自定义 |

---

*文档版本: v5.0 · 编译日期: 2026-06-07*
*gesture.js MD5: 94571cbf3d45b8db717388776d118c91*
