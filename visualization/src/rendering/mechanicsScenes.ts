/**
 * 力学场景统一入口 (shim) — 逐步迁移到分章节文件。
 *
 * 拆分计划：
 *   - chapter1Scenes: 第一/二章 运动学 (自由落体、伽利略斜面、反应时间、打点计时器、重心)
 *   - chapter4Scenes: 第四章 牛顿运动定律 (惯性、牛一、牛二、超重失重、动量)
 *   - chapter5Scenes: 第五章 曲线运动 (曲线条件、运动合成、曲线速度、平抛碰撞、竖直圆周、离心、传动带)
 *   - chapter6Scenes: 第六章 万有引力 (轨道、卡文迪什、月地检验)
 *   - chapter7Scenes: 第七章 机械能守恒 (机械能守恒、单摆)
 *   - mechanicalWaveScenes: 机械波
 *
 * TODO: 待 SimulationCanvas 和测试全部切换到 chapter 文件后, 删除本文件。
 */

export {
    drawFreeFallScene,
    drawGalileoInclineScene,
    drawReactionTimeScene,
    drawTickerTimerScene,
    drawCenterOfGravityScene,
    type MechanicsSceneOptions as Chapter1SceneOptions
} from './chapter1Scenes';

export {
    drawInertiaScene,
    drawNewtonFirstLawScene,
    drawNewtonSecondLawScene,
    drawOverweightScene,
    drawMomentumScene
} from './chapter4Scenes';

export {
    drawCurveConditionScene,
    drawMotionCompositionScene,
    drawCurveVelocityDirectionScene,
    drawProjectileCollisionScene,
    drawVerticalCircleScene,
    drawCentrifugalScene,
    drawTransmissionBeltScene
} from './chapter5Scenes';

export { drawOrbitalScene, drawCavendishScene, drawMoonEarthTestScene } from './chapter6Scenes';

export { drawEnergyConservationScene, drawSimplePendulumScene } from './chapter7Scenes';

export { drawMechanicalWaveScene } from './mechanicalWaveScenes';

export type { MechanicsSceneOptions } from './chapter1Scenes';
