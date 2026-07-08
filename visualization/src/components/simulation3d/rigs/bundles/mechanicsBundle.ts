/**
 * 力学 rig 包 — 必修一（力学基础）
 * 抛体/落体/斜面/胡克定律/牛顿三定律/摩擦/惯性/超重失弹/弹簧/重心/微形变/测量工具
 */
import type { SceneRig } from '../../EquipmentStage';
import { projectileRig } from '../projectileRig';
import { freeFallRig } from '../freeFallRig';
import { newtonTubeRig } from '../newtonTubeRig';
import { inclineRig } from '../inclineRig';
import { tickerTimerRig } from '../tickerTimerRig';
import { hookeLawRig } from '../hookeLawRig';
import { airTrackRig } from '../airTrackRig';
import { newtonSecondLawRig } from '../newtonSecondLawRig';
import { slidingFrictionRig } from '../slidingFrictionRig';
import { forceCompositionRig } from '../forceCompositionRig';
import { inertiaRig } from '../inertiaRig';
import { overweightRig } from '../overweightRig';
import { reactionTimeRig } from '../reactionTimeRig';
import { newtonThirdLawRig } from '../newtonThirdLawRig';
import { springRig } from '../springRig';
import { centerOfGravityRig } from '../centerOfGravityRig';
import { pendulumRig } from '../pendulumRig';
import { newtonFirstLawRig } from '../newtonFirstLawRig';
import { microDeformationRig } from '../microDeformationRig';
import { vernierCaliperRig, micrometerRig, multimeterRig } from '../measurementToolRig';
import { verticalMotionRig } from '../verticalMotionRig';

export default {
    projectile: projectileRig,
    'free-fall': freeFallRig,
    'uniform-accelerated': verticalMotionRig,
    'energy-conservation': verticalMotionRig,
    'work-energy': verticalMotionRig,
    'ball-xt': pendulumRig,
    'newton-tube': newtonTubeRig,
    'inclined-plane': inclineRig,
    'galileo-incline': inclineRig,
    'ticker-timer': tickerTimerRig,
    'hooke-law': hookeLawRig,
    'air-track': airTrackRig,
    'newton-second-law': newtonSecondLawRig,
    'sliding-friction': slidingFrictionRig,
    'force-composition': forceCompositionRig,
    inertia: inertiaRig,
    overweight: overweightRig,
    'reaction-time': reactionTimeRig,
    'newton-third-law': newtonThirdLawRig,
    spring: springRig,
    'center-of-gravity': centerOfGravityRig,
    'simple-pendulum': pendulumRig,
    'newton-first-law': newtonFirstLawRig,
    'micro-deformation': microDeformationRig,
    'vernier-caliper-tool': vernierCaliperRig,
    'micrometer-tool': micrometerRig,
    'multimeter-tool': multimeterRig
} as Record<string, SceneRig>;
