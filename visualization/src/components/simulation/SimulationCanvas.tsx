import { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CoordinateTransformer } from '../../rendering/CoordinateTransformer';
import { CanvasRenderer } from '../../rendering/CanvasRenderer';
import { setupHiDPICanvas } from '../../rendering/dpr';
import { COLORS } from '../../utils/colorMap';
import { getThemeTokens, hexToRgba } from '../../utils/themeTokens';
import { findFrameIndex, interpolateFrame, getPlaybackDuration } from '../../utils/frameUtils';
import type { TrajectoryPoint, SimulationResult } from 'physics-core';
import type { Vec2 } from '../../types/visualization';
import {
    drawAirTrack,
    drawGlider,
    drawPhotogate,
    drawDigitalTimer,
    drawRuler,
    drawCalipers,
    updateAirflowParticles,
    type AirflowParticle,
    type TimerChannel
} from '../../rendering/props';
import { getBlockedGateIndices, getTimerDisplayValue, type PhotogateMeasurement } from '../../utils/photogate';
import {
    drawHookeLawScene,
    drawSlidingFrictionScene,
    drawForceCompositionScene,
    drawNewtonThirdLawScene
} from '../../rendering/chapter3Scenes';
import {
    drawDoublePendulumSyncScene,
    drawForcedVibrationScene,
    drawResonanceCurveScene,
    drawNewtonTubeScene
} from '../../rendering/chapter2Scenes';
import {
    drawSoundWaveformScene,
    drawWaterDiffractionScene,
    drawSoundInterferenceScene,
    drawDopplerScene,
    drawSingleSlitScene,
    drawThinFilmScene,
    drawRefractionScene,
    drawInterferenceScene,
    drawDiffractionGratingScene,
    drawPolarizationMalusScene,
    drawHologramScene,
    drawTotalInternalReflectionScene
} from '../../rendering/waveOptScenes';
import {
    drawCurrentBalanceScene,
    drawEmDampingScene,
    drawMutualInductanceScene,
    drawSelfInductanceScene,
    drawLCOscillatorScene
} from '../../rendering/emEquipmentScenes';
import {
    drawAlphaScatteringScene,
    drawDecayStatisticsScene,
    drawFissionChainScene
} from '../../rendering/nuclearScenes';
import {
    drawPhotoelectricScene,
    drawBlackBodyScene,
    drawElectronDiffractionScene,
    drawMicroDeformationScene
} from '../../rendering/waveParticleDualityScenes';
import { drawBohrScene, drawBohrOrbitScene } from '../../rendering/atomicModelScenes';
import {
    drawRadioactiveScene,
    drawRadiationDeflectionScene,
    drawCosmicRayScene,
    drawNeutronDiscoveryScene,
    drawGeigerCounterScene
} from '../../rendering/nuclearRadiationScenes';
import {
    drawDiffusionScene,
    drawBrownianScene,
    drawMolecularForceScene,
    drawOilFilmScene,
    drawLiquidMixingScene
} from '../../rendering/molecularKineticScenes';
import { drawGasLawScene } from '../../rendering/gasThermalScenes';
import {
    drawMeltingCurveScene,
    drawSurfaceTensionScene,
    drawCapillaryScene,
    drawWettingScene,
    drawLiquidCrystalScene
} from '../../rendering/solidLiquidScenes';
import {
    drawHeatTransferScene,
    drawJouleMechanicalScene,
    drawJouleElectricalScene,
    drawAdiabaticCompressionScene,
    drawEnergyTransformationScene,
    drawPerpetuumMobileScene,
    drawHeatDirectionScene
} from '../../rendering/thermodynamicLawScenes';
import {
    drawHallEffectScene,
    drawPhotoresistorScene,
    drawThermistorScene,
    drawReedSwitchScene,
    drawStrainGaugeScene
} from '../../rendering/sensorElementScenes';
import { drawSecurityAlarmScene, drawLightControlSwitchScene } from '../../rendering/sensorApplicationScenes';
import {
    drawFreeFallScene,
    drawVerticalMotionScene,
    drawProjectileScene,
    drawInclinedPlaneScene,
    drawCollisionScene,
    drawSpringScene,
    drawGalileoInclineScene,
    drawReactionTimeScene,
    drawTickerTimerScene,
    drawCenterOfGravityScene
} from '../../rendering/chapter1Scenes';
import {
    drawInertiaScene,
    drawNewtonFirstLawScene,
    drawNewtonSecondLawScene,
    drawOverweightScene,
    drawMomentumScene
} from '../../rendering/chapter4Scenes';
import {
    drawCurveConditionScene,
    drawMotionCompositionScene,
    drawCurveVelocityDirectionScene,
    drawProjectileCollisionScene,
    drawVerticalCircleScene,
    drawCentrifugalScene,
    drawTransmissionBeltScene
} from '../../rendering/chapter5Scenes';
import { drawOrbitalScene, drawCavendishScene, drawMoonEarthTestScene } from '../../rendering/chapter6Scenes';
import {
    drawEnergyConservationScene,
    drawSimplePendulumScene,
    drawWorkEnergyScene
} from '../../rendering/chapter7Scenes';
import { drawMechanicalWaveScene, drawBallXTimeScene } from '../../rendering/mechanicalWaveScenes';
import {
    drawCoulombForceExploreScene,
    drawElectroscopeScene,
    drawElectrostaticInductionScene,
    drawElectrostaticShieldingScene,
    drawFaradayCupScene,
    drawElectricFieldLinesScene
} from '../../rendering/electrostaticFieldScenes';
import { drawParallelPlateCapacitorScene, drawCapacitorChargeScene } from '../../rendering/electrostaticEnergyScenes';
import { drawElectricFieldScene, drawMagneticFieldScene } from '../../rendering/chargedParticleScenes';
import {
    drawCircuitScene,
    drawResistanceLawScene,
    drawLoadVoltageScene,
    drawMultimeterScene,
    drawVernierCaliperScene,
    drawMicrometerScene,
    drawBulbVIScene
} from '../../rendering/electricCircuitScenes';
import {
    drawMagneticForceScene,
    drawAmpereForceScene,
    drawCurrentMagneticFieldScene
} from '../../rendering/magneticFieldScenes';
import { drawEmInductionScene, drawEddyCurrentScene } from '../../rendering/emInductionScenes';
import {
    drawAcCurrentScene,
    drawEmWaveHertzScene,
    drawEmWaveCommunicationScene,
    drawEmSpectrumScene
} from '../../rendering/emWaveScenes';

const SCENES_3D = new Set(['projectile', 'uniform-accelerated', 'free-fall', 'circular-motion']);

/**
 * 二分统计轨迹中 t <= currentTime 的点数 (upper bound)。
 * 等价于 filter(p => p.t <= t).length, 但 O(logN) 且零分配。
 */
function countPastPoints(points: TrajectoryPoint[], t: number): number {
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((points[mid]?.t ?? Infinity) <= t) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/**
 * 只画背景装饰的场景集合 (#159 逐节审计)。
 *
 * 「只画背景」= 画完背景后仍走标准轨迹/物体渲染流程 —— 同一物理量会出现
 * 两套表示 (装饰件 + 真实物体)。electric-field / magnetic-field 已在本轮
 * 升级为专属整屏板书, 从这里移出 (#159 高中核心 24 节)。
 */
const SCENES_2D_CUSTOM_BG = new Set(['em-combined']);

/** 第三章「相互作用——力」场景集合：完整自定义渲染，不走标准轨迹/物体绘制流程 */
const SCENES_CHAPTER3 = new Set(['hooke-law', 'sliding-friction', 'force-composition', 'newton-third-law']);

/** 选必一 第二章「机械振动」场景集合：完整自定义渲染 (双摆/受迫振动/共振) */
const SCENES_CHAPTER2 = new Set(['double-pendulum-sync', 'forced-vibration-freq', 'resonance-curve']);

/** 选必一 第四章「波动/光学」场景集合：完整自定义渲染 */
const SCENES_WAVEOPT = new Set([
    'sound-waveform',
    'water-diffraction',
    'doppler-effect',
    'sound-interference',
    'single-slit',
    'thin-film',
    'refraction',
    'interference',
    'diffraction-grating',
    'polarization-malus',
    'hologram'
]);

/** 选必二「电磁装备」场景集合：电流天平/电磁阻尼/互感/自感/LC 振荡 */
const SCENES_EM_EQUIP = new Set([
    'current-balance',
    'em-damping',
    'mutual-inductance',
    'self-inductance',
    'lc-oscillator'
]);

/** 选必三「量子/原子核」场景集合：α 散射/衰变统计/裂变链式反应 */
const SCENES_NUCLEAR = new Set(['alpha-scattering', 'decay-statistics', 'fission-chain']);

/** 选必三「近代物理」场景集合：光电/玻尔/衰变/光杠杆/黑体/电子衍射/放射偏转/宇宙射线/中子/轨道 */
const SCENES_MODERN = new Set([
    'photoelectric',
    'bohr',
    'radioactive',
    'micro-deformation',
    'black-body',
    'electron-diffraction',
    'radiation-deflection',
    'cosmic-ray',
    'neutron-discovery',
    'bohr-orbit'
]);

/** 选必三「传感器 / 控制电路」场景集合：霍尔 / 光敏 / 热敏 / 干簧管 / 应变片 / 报警 / 光控 */
const SCENES_SENSOR = new Set([
    'hall-effect',
    'photoresistor',
    'thermistor',
    'reed-switch',
    'strain-gauge',
    'security-alarm',
    'light-control-switch'
]);

/** 选必三「热学/分子/热力学」场景集合：扩散/布朗/熔化/热传递/表面张力/毛细/液晶 */
const SCENES_THERMAL = new Set([
    'diffusion',
    'brownian-motion',
    'oil-film',
    'liquid-mixing',
    'molecular-force',
    'melting-curve',
    'heat-transfer',
    'surface-tension',
    'capillary',
    'wetting',
    'liquid-crystal',
    'joule-mechanical',
    'joule-electrical',
    'adiabatic-compression',
    'energy-transformation',
    'perpetuum-mobile',
    'heat-direction',
    'gas-law'
]);

/** 基础力学实验场景集合：自由落体/斜面/惯性/牛顿定律等完整教学图 */
const SCENES_MECHANICS = new Set([
    'free-fall',
    // #159 逐节审计: 抛体 / 竖直运动 改为专属板书 (屏幕坐标系自定义渲染),
    // 必须落在「完整自定义渲染」集合里, 否则 switch 分支不会执行, 且 autoFit 会与
    // 板书自己的比例尺打架。
    'projectile',
    'uniform-accelerated',
    'galileo-incline',
    // #159 逐节审计: 斜面/碰撞/弹簧改为专属板书 (器材与物体共用同一屏幕映射),
    // 旧实现是「静态装饰件 + 通用轨迹通道真实物体」的双表示。
    'inclined-plane',
    'collision',
    'spring',
    'reaction-time',
    'ticker-timer',
    'transmission-belt',
    'vertical-circle',
    'center-of-gravity',
    'inertia',
    'newton-first-law',
    'newton-second-law',
    'curve-condition',
    'motion-composition',
    'curve-velocity-direction',
    'simple-pendulum',
    'energy-conservation',
    'overweight',
    'centrifugal',
    'orbital',
    'momentum',
    'projectile-collision',
    'mechanical-wave',
    'cavendish',
    'moon-earth-test'
]);

/** 电学/电磁基础与仪器读数场景集合：完整教学图和读数图 */
const SCENES_ELECTROMAGNETISM = new Set([
    'circuit',
    'ac-current',
    'em-induction',
    'magnetic-force',
    'ampere-force',
    'capacitor-charge',
    'parallel-plate-capacitor',
    'load-voltage',
    'resistance-law',
    'multimeter-tool',
    'vernier-caliper-tool',
    'micrometer-tool',
    'coulomb-force-explore',
    'electroscope',
    'electrostatic-induction',
    'electrostatic-shielding',
    'faraday-cup',
    'em-wave-hertz',
    'eddy-current',
    'em-wave-communication',
    'em-spectrum',
    'electric-field',
    'magnetic-field'
]);

/** 可视化缺口补建 8 场景集合 (Stage K) */
const SCENES_GAP = new Set([
    'total-internal-reflection',
    'current-magnetic',
    'efield-lines',
    'newton-tube',
    'bulb-vi',
    'work-energy',
    'ball-xt',
    'geiger-counter'
]);

/** 绘制碰撞场景：两物体 3D 方块 + 阴影 + 高光 + 精致箭头 */
function drawEMCombinedField(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean,
    params: Record<string, number>
) {
    const tokens = getThemeTokens(isDark);
    const spacing = 60;
    const eColor = tokens.canvasEFieldAccent;
    // 场景参数即引擎输入 (buildProblem 直接取同名参数), 故方向/大小与引擎一致
    const Ey = params['Ey'] ?? 10;
    const downward = Ey >= 0;
    for (let x = spacing / 2; x < width; x += spacing) {
        const startY = downward ? 30 : height - 30;
        const endY = downward ? height - 30 : 30;
        ctx.strokeStyle = hexToRgba(eColor, 0.1);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
        const grad = ctx.createLinearGradient(x, startY, x, endY);
        grad.addColorStop(0, hexToRgba(eColor, 0.2));
        grad.addColorStop(0.4, tokens.canvasEMFieldGradient);
        grad.addColorStop(1, tokens.canvasEMFieldGradient);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
        // 箭头指向场线终点 (场方向)
        ctx.fillStyle = tokens.canvasEMFieldArrow;
        ctx.beginPath();
        ctx.moveTo(x, endY);
        ctx.lineTo(x - 5, endY + (downward ? -12 : 12));
        ctx.lineTo(x + 5, endY + (downward ? -12 : 12));
        ctx.closePath();
        ctx.fill();
    }
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = eColor;
    ctx.fillText('E', 12, 20);
    {
        // 左上角方向小图例 (箭头方向 = 电场方向)
        const arrowX = 26,
            arrowY = 16;
        ctx.strokeStyle = eColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX, arrowY + (downward ? 14 : -14));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY + (downward ? 14 : -14));
        ctx.lineTo(arrowX - 4, arrowY + (downward ? 5 : -5));
        ctx.lineTo(arrowX + 4, arrowY + (downward ? 5 : -5));
        ctx.closePath();
        ctx.fillStyle = eColor;
        ctx.fill();
    }

    const bSpacing = 70;
    const bR = 9;
    const bLineColor = tokens.canvasBFieldLineSoft;
    const bCircleColor = tokens.canvasBFieldCircleSoft;
    for (let x = bSpacing; x < width; x += bSpacing) {
        for (let y = bSpacing; y < height; y += bSpacing) {
            ctx.strokeStyle = bCircleColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, bR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = bLineColor;
            ctx.lineWidth = 1.3;
            const d = bR * 0.5;
            ctx.beginPath();
            ctx.moveTo(x - d, y - d);
            ctx.lineTo(x + d, y + d);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + d, y - d);
            ctx.lineTo(x - d, y + d);
            ctx.stroke();
        }
    }
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = bLineColor;
    ctx.fillText('B', width - 28, 12);
    {
        const cx = width - 14,
            cy = 18,
            cr = 7;
        ctx.strokeStyle = bLineColor;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - cr * 0.55, cy - cr * 0.55);
        ctx.lineTo(cx + cr * 0.55, cy + cr * 0.55);
        ctx.moveTo(cx + cr * 0.55, cy - cr * 0.55);
        ctx.lineTo(cx - cr * 0.55, cy + cr * 0.55);
        ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
}

/**
 * 绘制气垫导轨测速度实验场景。
 */
function drawAirTrackScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isDark: boolean,
    params: Record<string, number>,
    currentTime: number,
    gliderX: number,
    gliderV: number,
    experimentData: PhotogateMeasurement[] | null,
    airflowParticles: AirflowParticle[]
): AirflowParticle[] {
    const padding = 60;
    const trackLength = params['trackLength'] ?? 1.5;
    const x1 = params['x1'] ?? 0.3;
    const x2 = params['x2'] ?? 0.8;
    const tokens = getThemeTokens(isDark);
    const flagWidth = params['flagWidth'] ?? 0.02;
    const mass = params['mass'] ?? 0.2;

    const trackLeftX = padding;
    const trackRightX = width - padding;
    const trackScreenW = trackRightX - trackLeftX;
    const pixelsPerMeter = trackScreenW / trackLength;
    const trackTopY = Math.round(height * 0.55);
    const trackHeight = 28;
    const rulerY = trackTopY + trackHeight + 28;
    // 计时器矩形钳制在画布内，窄屏 (width<600) 不再越界到画布外
    const timerW = Math.min(280, width - 32);
    const timerRect = { x: Math.max(16, width - timerW - 16), y: 16, width: timerW, height: 120 };

    const blockedGates = experimentData ? getBlockedGateIndices(experimentData, currentTime) : new Set<number>();

    drawRuler({
        ctx,
        x: trackLeftX,
        y: rulerY,
        length: trackScreenW,
        pixelsPerMeter,
        isDark,
        majorInterval: 0.1,
        minorPerMajor: 5,
        orientation: 'horizontal',
        label: '位置 x (m)',
        marks: [
            { position: x1, label: 'G1', color: '#22d3ee' },
            { position: x2, label: 'G2', color: '#a78bfa' }
        ]
    });

    const airholes: Array<{ x: number; y: number }> = [];
    const trackRect = { x: trackLeftX, y: trackTopY, width: trackScreenW, height: trackHeight };
    const airholeCount = Math.max(5, Math.floor(trackScreenW / 30));
    const spacing = trackScreenW / airholeCount;
    for (let i = 0; i < airholeCount; i++) {
        airholes.push({ x: trackLeftX + spacing * (i + 0.5), y: trackTopY + 4 });
    }
    const updatedParticles = updateAirflowParticles(airflowParticles, airholes, trackTopY);

    const trackLayout = drawAirTrack({
        ctx,
        rect: trackRect,
        isDark,
        airflowParticles: updatedParticles,
        airholeCount,
        label: '气垫导轨'
    });

    const gatePositions = [x1, x2];
    const gateLabels = ['G1', 'G2'];
    const gateColors = ['#22d3ee', '#a78bfa'];
    for (let i = 0; i < gatePositions.length; i++) {
        const gx = trackLeftX + gatePositions[i]! * pixelsPerMeter;
        drawPhotogate({
            ctx,
            x: gx,
            trackTopY: trackLayout.topY,
            isDark,
            isBlocked: blockedGates.has(i),
            ledOn: blockedGates.has(i),
            label: gateLabels[i],
            labelColor: gateColors[i]
        });
    }

    const gliderScreenX = trackLeftX + gliderX * pixelsPerMeter;
    const gliderW = 56;
    const gliderH = 22;
    const flagPx = Math.max(flagWidth * pixelsPerMeter, 4);
    drawGlider({
        ctx,
        centerX: gliderScreenX,
        bottomY: trackLayout.topY,
        width: gliderW,
        height: gliderH,
        flagWidth: flagPx,
        flagHeight: gliderH * 0.7,
        flagColor: '#ef4444',
        isDark,
        label: `m=${mass.toFixed(2)}kg`,
        showVelocityVector: true,
        velocity: gliderV,
        velocityScale: 60,
        velocityColor: '#22c55e'
    });

    const channels: TimerChannel[] = (experimentData ?? []).map((m, i) => {
        const isActive = blockedGates.has(i);
        const deltaT = getTimerDisplayValue(m, currentTime);
        return {
            label: `CH${i + 1} (G${i + 1}@${m.gatePosition.toFixed(2)}m)`,
            value: deltaT,
            unit: 's',
            color: i === 0 ? '#22c55e' : '#22d3ee',
            isActive
        };
    });

    drawDigitalTimer({
        ctx,
        rect: timerRect,
        isDark,
        title: '数字毫秒计 J0201',
        channels
    });

    ctx.fillStyle = tokens.readoutText;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`t = ${currentTime.toFixed(4)} s`, 16, 18);
    ctx.fillStyle = tokens.text3;
    ctx.font = '12px monospace';
    ctx.fillText(`v = ${gliderV.toFixed(3)} m/s`, 16, 38);
    ctx.fillText(`Δx = ${flagWidth.toFixed(3)} m`, 16, 56);

    const calipersY = height - 40;
    const calipersWidthPx = Math.max(flagPx, 20);
    const calipersX = trackLeftX + 200;
    drawCalipers({
        ctx,
        x: calipersX,
        y: calipersY,
        width: calipersWidthPx,
        isDark,
        label: `Δx = ${flagWidth.toFixed(3)} m`,
        pixelsPerMeter
    });

    return updatedParticles;
}

export function SimulationCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const transformerRef = useRef<CoordinateTransformer | null>(null);
    const logicalSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
    const animFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const airflowParticlesRef = useRef<AirflowParticle[]>([]);
    const fpsRef = useRef<number>(0);
    const probeRef = useRef<TrajectoryPoint | null>(null);

    // Refs 用于 rAF 循环: 每次 render 同步写入最新值, loop 只读 ref — 避免 effect 依赖
    // currentTime/render 导致每帧 teardown+re-setup。模式参考 EquipmentStage.tsx。
    const currentTimeRef = useRef<number>(0);
    const isPlayingRef = useRef<boolean>(false);
    const playbackSpeedRef = useRef<number>(1);
    const simulationResultRef = useRef<SimulationResult | null>(null);
    const renderRef = useRef<() => void>(() => {});
    const isDarkRef = useRef<boolean>(true);

    // 轨迹位置数组缓存: points (trajectories[0]) 是跨帧稳定引用, 仅在新仿真结果时重建,
    // 避免每帧 map 分配新数组
    const allPositionsCacheRef = useRef<{ points: TrajectoryPoint[]; positions: Vec2[] } | null>(null);

    const simulationResult = useSimulationStore(s => s.simulationResult);
    const currentScene = useSimulationStore(s => s.currentScene);
    const parameters = useSimulationStore(s => s.parameters);
    const experimentData = useSimulationStore(s => s.experimentData);
    // 高频字段独立订阅: 播放期间每帧变化, 驱动 rAF 重渲染
    const currentTime = useSimulationStore(s => s.currentTime);
    const isPlaying = useSimulationStore(s => s.isPlaying);
    const playbackSpeed = useSimulationStore(s => s.playbackSpeed);
    const visibleLayers = useSimulationStore(s => s.visibleLayers);
    const theme = useSimulationStore(s => s.theme);
    // 参数对比实验
    const compareMode = useSimulationStore(s => s.compareMode);
    const compareResults = useSimulationStore(s => s.compareResults);
    // action / stable selectors 返回稳定引用, 不会额外触发重渲染
    const setCurrentTime = useSimulationStore(s => s.setCurrentTime);
    const pause = useSimulationStore(s => s.pause);

    // 每次 render 同步把最新 selector 值写入 ref — rAF loop 闭包读 ref 即可拿到最新值,
    // 避免 effect 依赖高频字段导致每帧 teardown+re-setup (模式参考 EquipmentStage.tsx).
    currentTimeRef.current = currentTime;
    isPlayingRef.current = isPlaying;
    playbackSpeedRef.current = playbackSpeed;
    simulationResultRef.current = simulationResult;

    const isDark = theme === 'dark';
    isDarkRef.current = isDark;
    const is3DScene = SCENES_3D.has(currentScene);
    const isAirTrack = currentScene === 'air-track';
    const isChapter3 = SCENES_CHAPTER3.has(currentScene);
    const isChapter2 = SCENES_CHAPTER2.has(currentScene);
    const isWaveOpt = SCENES_WAVEOPT.has(currentScene);
    const isEmEquip = SCENES_EM_EQUIP.has(currentScene);
    const isNuclear = SCENES_NUCLEAR.has(currentScene);
    const isThermal = SCENES_THERMAL.has(currentScene);
    const isSensor = SCENES_SENSOR.has(currentScene);
    const isMechanics = SCENES_MECHANICS.has(currentScene);
    const isElectromagnetism = SCENES_ELECTROMAGNETISM.has(currentScene);
    const isGap = SCENES_GAP.has(currentScene);
    const isModern = SCENES_MODERN.has(currentScene);
    const hasCustom2DBackground = SCENES_2D_CUSTOM_BG.has(currentScene);

    // 标准轨迹场景: 背景 + 网格 + 坐标轴 + 地面 + 完整轨迹 全部缓存到离屏层, 每帧仅一次 drawImage
    const isCustomScene =
        isGap ||
        isChapter3 ||
        isChapter2 ||
        isWaveOpt ||
        isEmEquip ||
        isNuclear ||
        isThermal ||
        isSensor ||
        isMechanics ||
        isElectromagnetism ||
        isModern;
    const hasTrajectory = !!simulationResult && (simulationResult.trajectories[0] ?? []).length > 0;
    const usesStaticLayer = !isCustomScene && !isAirTrack && hasTrajectory;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const rect = canvas.parentElement!.getBoundingClientRect();
            const cssW = Math.round(rect.width);
            const cssH = Math.round(rect.height);
            logicalSizeRef.current = { w: cssW, h: cssH };
            const dpr = setupHiDPICanvas(canvas, cssW, cssH);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            transformerRef.current = new CoordinateTransformer(cssW, cssH);
            rendererRef.current = new CanvasRenderer(ctx, transformerRef.current, visibleLayers, isDark);
            rendererRef.current.setDpr(dpr);
            if (is3DScene) {
                rendererRef.current.set3DEnabled(true, cssW, cssH);
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [currentScene]);

    useEffect(() => {
        if (!transformerRef.current || !rendererRef.current) return;
        const canvas = canvasRef.current;
        if (canvas) {
            rendererRef.current.set3DEnabled(is3DScene, logicalSizeRef.current.w, logicalSizeRef.current.h);
        }
        rendererRef.current.update(transformerRef.current, visibleLayers, isDark);
    }, [visibleLayers, isDark, is3DScene]);

    useEffect(() => {
        if (!simulationResult || !transformerRef.current) return;
        if (
            isAirTrack ||
            isChapter3 ||
            isChapter2 ||
            isWaveOpt ||
            isEmEquip ||
            isNuclear ||
            isThermal ||
            isSensor ||
            isMechanics ||
            isElectromagnetism ||
            isModern
        )
            return; // 自定义渲染场景使用屏幕坐标，无需 autoFit
        const canvas = canvasRef.current;
        if (!canvas) return;
        const allPoints: Array<{ x: number; y: number }> = [];
        // 参数对比模式：坐标拟合需要覆盖所有对比组的轨迹
        const resultsToFit =
            compareMode && compareResults.length > 0
                ? compareResults
                      .filter((e): e is typeof e & { result: SimulationResult } => e.result !== null)
                      .map(e => e.result)
                : [simulationResult];
        for (const result of resultsToFit) {
            for (const traj of result.trajectories) {
                for (const p of traj) {
                    allPoints.push(p.position);
                }
            }
        }
        if (is3DScene) {
            transformerRef.current.autoFit(allPoints, logicalSizeRef.current.w, logicalSizeRef.current.h, 90, true);
            if (rendererRef.current) {
                rendererRef.current.set3DEnabled(true, logicalSizeRef.current.w, logicalSizeRef.current.h);
            }
        } else {
            transformerRef.current.autoFit(allPoints, logicalSizeRef.current.w, logicalSizeRef.current.h);
        }
    }, [
        simulationResult,
        compareMode,
        compareResults,
        currentScene,
        is3DScene,
        isAirTrack,
        isChapter3,
        isChapter2,
        isWaveOpt,
        isEmEquip,
        isNuclear,
        isThermal,
        isSensor,
        isMechanics,
        isElectromagnetism,
        isModern
    ]);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const renderer = rendererRef.current;
        const transformer = transformerRef.current;
        if (!canvas || !renderer || !transformer) return;

        // 从 ref 读最新时间 — 保证 rAF loop 每帧拿到最新值, 无需把 currentTime 放进 deps
        const currentTime = currentTimeRef.current;

        const ctx = canvas.getContext('2d')!;
        const { w: cssW, h: cssH } = logicalSizeRef.current;
        const tokens = getThemeTokens(isDark);

        // 标准轨迹场景: 背景 / 网格 / 坐标轴 / 自定义背景 / 地面 / 完整轨迹 全部烘焙到离屏层,
        // 每帧仅需一次 drawImage 合成. 跳过低级的逐帧 clear / grid / axes 绘制.
        const skipStaticDraws = usesStaticLayer;

        // 自定义 2D 背景 (当前仅剩电磁复合场): 静态路径烘焙进离屏层,
        // 非静态路径 (gap 等自定义场景 / 无轨迹空状态) 直接绘制到主 canvas.
        let extraStaticDraw: ((c: CanvasRenderingContext2D) => void) | undefined;
        let extraSig = '';
        // 注意: 这里有意使用 if/else 而非 switch(currentScene), 避免被
        // renderer-routing 自检正则误识别为主路由 switch (它匹配最近的 switch).
        if (!is3DScene && hasCustom2DBackground) {
            const drawBg = (c: CanvasRenderingContext2D) => {
                if (currentScene === 'em-combined') {
                    drawEMCombinedField(c, transformer, cssW, cssH, isDark, parameters);
                }
            };
            if (usesStaticLayer) {
                extraStaticDraw = drawBg;
                extraSig = JSON.stringify(parameters);
            } else {
                drawBg(ctx);
            }
        }

        if (!skipStaticDraws) {
            renderer.clear(cssW, cssH);
            // 第三章场景使用屏幕坐标系，不需要网格/坐标轴
            if (
                !isChapter3 &&
                !isChapter2 &&
                !isWaveOpt &&
                !isEmEquip &&
                !isNuclear &&
                !isThermal &&
                !isSensor &&
                !isMechanics &&
                !isElectromagnetism &&
                !isModern
            ) {
                renderer.drawGrid(cssW, cssH);
                renderer.drawAxes(cssW, cssH);
            }
        }

        // 第三章场景：完整自定义渲染 (背景 + 动态元素 + HUD)，跳过标准轨迹/物体流程
        if (
            isGap ||
            isChapter3 ||
            isChapter2 ||
            isWaveOpt ||
            isEmEquip ||
            isNuclear ||
            isThermal ||
            isSensor ||
            isMechanics ||
            isElectromagnetism ||
            isModern
        ) {
            const sceneOpts = {
                ctx,
                width: cssW,
                height: cssH,
                isDark,
                params: parameters,
                simulationResult,
                currentTime
            };
            switch (currentScene) {
                case 'hooke-law':
                    drawHookeLawScene(sceneOpts);
                    break;
                case 'sliding-friction':
                    drawSlidingFrictionScene(sceneOpts);
                    break;
                case 'force-composition':
                    drawForceCompositionScene(sceneOpts);
                    break;
                case 'newton-third-law':
                    drawNewtonThirdLawScene(sceneOpts);
                    break;
                case 'double-pendulum-sync':
                    drawDoublePendulumSyncScene(sceneOpts);
                    break;
                case 'forced-vibration-freq':
                    drawForcedVibrationScene(sceneOpts);
                    break;
                case 'resonance-curve':
                    drawResonanceCurveScene(sceneOpts);
                    break;
                case 'sound-waveform':
                    drawSoundWaveformScene(sceneOpts);
                    break;
                case 'water-diffraction':
                    drawWaterDiffractionScene(sceneOpts);
                    break;
                case 'doppler-effect':
                    drawDopplerScene(sceneOpts);
                    break;
                case 'sound-interference':
                    drawSoundInterferenceScene(sceneOpts);
                    break;
                case 'single-slit':
                    drawSingleSlitScene(sceneOpts);
                    break;
                case 'thin-film':
                    drawThinFilmScene(sceneOpts);
                    break;
                case 'refraction':
                    drawRefractionScene(sceneOpts);
                    break;
                case 'interference':
                    drawInterferenceScene(sceneOpts);
                    break;
                case 'diffraction-grating':
                    drawDiffractionGratingScene(sceneOpts);
                    break;
                case 'polarization-malus':
                    drawPolarizationMalusScene(sceneOpts);
                    break;
                case 'hologram':
                    drawHologramScene(sceneOpts);
                    break;
                case 'current-balance':
                    drawCurrentBalanceScene(sceneOpts);
                    break;
                case 'em-damping':
                    drawEmDampingScene(sceneOpts);
                    break;
                case 'mutual-inductance':
                    drawMutualInductanceScene(sceneOpts);
                    break;
                case 'self-inductance':
                    drawSelfInductanceScene(sceneOpts);
                    break;
                case 'lc-oscillator':
                    drawLCOscillatorScene(sceneOpts);
                    break;
                case 'alpha-scattering':
                    drawAlphaScatteringScene(sceneOpts);
                    break;
                case 'decay-statistics':
                    drawDecayStatisticsScene(sceneOpts);
                    break;
                case 'fission-chain':
                    drawFissionChainScene(sceneOpts);
                    break;
                case 'photoelectric':
                    drawPhotoelectricScene(sceneOpts);
                    break;
                case 'bohr':
                    drawBohrScene(sceneOpts);
                    break;
                case 'radioactive':
                    drawRadioactiveScene(sceneOpts);
                    break;
                case 'micro-deformation':
                    drawMicroDeformationScene(sceneOpts);
                    break;
                case 'black-body':
                    drawBlackBodyScene(sceneOpts);
                    break;
                case 'electron-diffraction':
                    drawElectronDiffractionScene(sceneOpts);
                    break;
                case 'radiation-deflection':
                    drawRadiationDeflectionScene(sceneOpts);
                    break;
                case 'cosmic-ray':
                    drawCosmicRayScene(sceneOpts);
                    break;
                case 'neutron-discovery':
                    drawNeutronDiscoveryScene(sceneOpts);
                    break;
                case 'bohr-orbit':
                    drawBohrOrbitScene(sceneOpts);
                    break;
                case 'diffusion':
                    drawDiffusionScene(sceneOpts);
                    break;
                case 'brownian-motion':
                    drawBrownianScene(sceneOpts);
                    break;
                case 'melting-curve':
                    drawMeltingCurveScene(sceneOpts);
                    break;
                case 'heat-transfer':
                    drawHeatTransferScene(sceneOpts);
                    break;
                case 'surface-tension':
                    drawSurfaceTensionScene(sceneOpts);
                    break;
                case 'capillary':
                    drawCapillaryScene(sceneOpts);
                    break;
                case 'liquid-crystal':
                    drawLiquidCrystalScene(sceneOpts);
                    break;
                case 'oil-film':
                    drawOilFilmScene(sceneOpts);
                    break;
                case 'liquid-mixing':
                    drawLiquidMixingScene(sceneOpts);
                    break;
                case 'molecular-force':
                    drawMolecularForceScene(sceneOpts);
                    break;
                case 'wetting':
                    drawWettingScene(sceneOpts);
                    break;
                case 'joule-mechanical':
                    drawJouleMechanicalScene(sceneOpts);
                    break;
                case 'joule-electrical':
                    drawJouleElectricalScene(sceneOpts);
                    break;
                case 'adiabatic-compression':
                    drawAdiabaticCompressionScene(sceneOpts);
                    break;
                case 'energy-transformation':
                    drawEnergyTransformationScene(sceneOpts);
                    break;
                case 'perpetuum-mobile':
                    drawPerpetuumMobileScene(sceneOpts);
                    break;
                case 'heat-direction':
                    drawHeatDirectionScene(sceneOpts);
                    break;
                case 'gas-law':
                    drawGasLawScene(sceneOpts);
                    break;
                case 'hall-effect':
                    drawHallEffectScene(sceneOpts);
                    break;
                case 'photoresistor':
                    drawPhotoresistorScene(sceneOpts);
                    break;
                case 'thermistor':
                    drawThermistorScene(sceneOpts);
                    break;
                case 'reed-switch':
                    drawReedSwitchScene(sceneOpts);
                    break;
                case 'strain-gauge':
                    drawStrainGaugeScene(sceneOpts);
                    break;
                case 'security-alarm':
                    drawSecurityAlarmScene(sceneOpts);
                    break;
                case 'light-control-switch':
                    drawLightControlSwitchScene(sceneOpts);
                    break;
                case 'free-fall':
                    drawFreeFallScene(sceneOpts);
                    break;
                case 'uniform-accelerated':
                    drawVerticalMotionScene(sceneOpts);
                    break;
                case 'projectile':
                    drawProjectileScene(sceneOpts);
                    break;
                case 'inclined-plane':
                    drawInclinedPlaneScene(sceneOpts);
                    break;
                case 'collision':
                    drawCollisionScene(sceneOpts);
                    break;
                case 'spring':
                    drawSpringScene(sceneOpts);
                    break;
                case 'galileo-incline':
                    drawGalileoInclineScene(sceneOpts);
                    break;
                case 'reaction-time':
                    drawReactionTimeScene(sceneOpts);
                    break;
                case 'ticker-timer':
                    drawTickerTimerScene(sceneOpts);
                    break;
                case 'transmission-belt':
                    drawTransmissionBeltScene(sceneOpts);
                    break;
                case 'vertical-circle':
                    drawVerticalCircleScene(sceneOpts);
                    break;
                case 'center-of-gravity':
                    drawCenterOfGravityScene(sceneOpts);
                    break;
                case 'inertia':
                    drawInertiaScene(sceneOpts);
                    break;
                case 'newton-first-law':
                    drawNewtonFirstLawScene(sceneOpts);
                    break;
                case 'newton-second-law':
                    drawNewtonSecondLawScene(sceneOpts);
                    break;
                case 'curve-condition':
                    drawCurveConditionScene(sceneOpts);
                    break;
                case 'motion-composition':
                    drawMotionCompositionScene(sceneOpts);
                    break;
                case 'curve-velocity-direction':
                    drawCurveVelocityDirectionScene(sceneOpts);
                    break;
                case 'simple-pendulum':
                    drawSimplePendulumScene(sceneOpts);
                    break;
                case 'energy-conservation':
                    drawEnergyConservationScene(sceneOpts);
                    break;
                case 'overweight':
                    drawOverweightScene(sceneOpts);
                    break;
                case 'centrifugal':
                    drawCentrifugalScene(sceneOpts);
                    break;
                case 'orbital':
                    drawOrbitalScene(sceneOpts);
                    break;
                case 'momentum':
                    drawMomentumScene(sceneOpts);
                    break;
                case 'projectile-collision':
                    drawProjectileCollisionScene(sceneOpts);
                    break;
                case 'mechanical-wave':
                    drawMechanicalWaveScene(sceneOpts);
                    break;
                case 'cavendish':
                    drawCavendishScene(sceneOpts);
                    break;
                case 'moon-earth-test':
                    drawMoonEarthTestScene(sceneOpts);
                    break;
                case 'circuit':
                    drawCircuitScene(sceneOpts);
                    break;
                case 'ac-current':
                    drawAcCurrentScene(sceneOpts);
                    break;
                case 'em-induction':
                    drawEmInductionScene(sceneOpts);
                    break;
                case 'magnetic-force':
                    drawMagneticForceScene(sceneOpts);
                    break;
                case 'ampere-force':
                    drawAmpereForceScene(sceneOpts);
                    break;
                case 'capacitor-charge':
                    drawCapacitorChargeScene(sceneOpts);
                    break;
                case 'coulomb-force-explore':
                    drawCoulombForceExploreScene(sceneOpts);
                    break;
                case 'electroscope':
                    drawElectroscopeScene(sceneOpts);
                    break;
                case 'electrostatic-induction':
                    drawElectrostaticInductionScene(sceneOpts);
                    break;
                case 'electrostatic-shielding':
                    drawElectrostaticShieldingScene(sceneOpts);
                    break;
                case 'faraday-cup':
                    drawFaradayCupScene(sceneOpts);
                    break;
                case 'em-wave-hertz':
                    drawEmWaveHertzScene(sceneOpts);
                    break;
                case 'eddy-current':
                    drawEddyCurrentScene(sceneOpts);
                    break;
                case 'em-wave-communication':
                    drawEmWaveCommunicationScene(sceneOpts);
                    break;
                case 'em-spectrum':
                    drawEmSpectrumScene(sceneOpts);
                    break;
                case 'electric-field':
                    drawElectricFieldScene(sceneOpts);
                    break;
                case 'magnetic-field':
                    drawMagneticFieldScene(sceneOpts);
                    break;
                case 'parallel-plate-capacitor':
                    drawParallelPlateCapacitorScene(sceneOpts);
                    break;
                case 'load-voltage':
                    drawLoadVoltageScene(sceneOpts);
                    break;
                case 'resistance-law':
                    drawResistanceLawScene(sceneOpts);
                    break;
                case 'multimeter-tool':
                    drawMultimeterScene(sceneOpts);
                    break;
                case 'vernier-caliper-tool':
                    drawVernierCaliperScene(sceneOpts);
                    break;
                case 'micrometer-tool':
                    drawMicrometerScene(sceneOpts);
                    break;
                case 'total-internal-reflection':
                    drawTotalInternalReflectionScene(sceneOpts);
                    break;
                case 'current-magnetic':
                    drawCurrentMagneticFieldScene(sceneOpts);
                    break;
                case 'efield-lines':
                    drawElectricFieldLinesScene(sceneOpts);
                    break;
                case 'newton-tube':
                    drawNewtonTubeScene(sceneOpts);
                    break;
                case 'bulb-vi':
                    drawBulbVIScene(sceneOpts);
                    break;
                case 'work-energy':
                    drawWorkEnergyScene(sceneOpts);
                    break;
                case 'ball-xt':
                    drawBallXTimeScene(sceneOpts);
                    break;
                case 'geiger-counter':
                    drawGeigerCounterScene(sceneOpts);
                    break;
            }
            return;
        }

        if (!simulationResult) {
            ctx.fillStyle = tokens.canvasEmptyText;
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('点击「运行仿真」开始', cssW / 2, cssH / 2);
            return;
        }

        if (isAirTrack) {
            const trajectories = simulationResult.trajectories;
            const points = trajectories[0] ?? [];
            if (points.length === 0) return;
            const idx = findFrameIndex(trajectories, currentTime);
            const p0 = points[idx]!;
            const p1 = points[Math.min(idx + 1, points.length - 1)]!;
            const frame = interpolateFrame(p0, p1, currentTime);
            airflowParticlesRef.current = drawAirTrackScene(
                ctx,
                cssW,
                cssH,
                isDark,
                parameters,
                currentTime,
                frame.position.x,
                frame.velocity.x,
                experimentData,
                airflowParticlesRef.current
            );
            return;
        }

        const trajectories = simulationResult.trajectories;
        const points = trajectories[0] ?? [];
        if (points.length === 0) return;

        const noGroundScenes = [
            'electric-field',
            'magnetic-field',
            'em-combined',
            'collision',
            'spring',
            'circular-motion'
        ];
        const skipGround = noGroundScenes.includes(currentScene) && !is3DScene;

        const isCircular = currentScene === 'circular-motion';
        const circularCenter = { x: 0, y: 0 };
        // 单一真源：圆锥摆的 effective radius / centripetalForce 由引擎 maxValues 给出；
        // 场景参数只在结果未就绪时兜底（此前 2D 直接用 UI radius，与引擎轨迹半径不一致）。
        const circularMv = simulationResult?.diagnostics?.maxValues;
        const engineRadius = typeof circularMv?.['radius'] === 'number' ? circularMv['radius'] : undefined;
        const engineSpeed = typeof circularMv?.['maxSpeed'] === 'number' ? circularMv['maxSpeed'] : undefined;
        const engineForce =
            typeof circularMv?.['centripetalForce'] === 'number' ? circularMv['centripetalForce'] : undefined;
        const engineAcc =
            typeof circularMv?.['maxAcceleration'] === 'number' ? circularMv['maxAcceleration'] : undefined;
        const circularRadius = engineRadius ?? parameters['radius'] ?? 1.0;
        const circularOmega =
            engineSpeed !== undefined && circularRadius > 0
                ? engineSpeed / circularRadius
                : (parameters['omega'] ?? 3.0);
        const circularForce =
            engineForce ?? (parameters['mass'] ?? 0.2) * circularRadius * circularOmega * circularOmega;
        const circularAcc = engineAcc ?? circularRadius * circularOmega * circularOmega;
        // 2D 板书的球径/球高随有效半径缩放：小半径圆锥摆不再出现「球比圈大」或球飞出视口
        const circularBallRadius = Math.min(0.12, Math.max(0.005, circularRadius * 0.12));
        const circularPivotH = is3DScene ? 1.2 : 0;
        const circularBallH = is3DScene ? Math.min(0.35, Math.max(0.05, circularRadius * 0.6)) : 0;

        // 完整轨迹位置数组: points 引用跨帧稳定, 缓存复用避免每帧 map 分配
        if (!allPositionsCacheRef.current || allPositionsCacheRef.current.points !== points) {
            allPositionsCacheRef.current = { points, positions: points.map(p => p.position) };
        }
        const allPositions = allPositionsCacheRef.current.positions;

        // 完整轨迹 (当前位置之前的累积轨迹 除外) 是静态几何, 随仿真结果而定, 缓存进离屏层.
        // points (trajectories[0]) 是跨帧稳定的引用, 用作缓存身份 —— 仅在新仿真结果或视口/主题变化时重建.
        if (isCircular && is3DScene) {
            renderer.setCircularCoordMode(true, circularBallH);
            if (usesStaticLayer) {
                renderer.drawStaticLayer(
                    cssW,
                    cssH,
                    allPositions,
                    points,
                    COLORS.trajectory,
                    skipGround,
                    extraStaticDraw,
                    extraSig,
                    (positions, color) => renderer.draw3DCircularTrajectory(positions, color, circularBallH)
                );
            } else {
                if (!skipGround) renderer.drawGround(0, cssW);
                renderer.draw3DCircularTrajectory(allPositions, COLORS.trajectory, circularBallH);
            }
        } else {
            renderer.setCircularCoordMode(false);
            if (usesStaticLayer) {
                renderer.drawStaticLayer(
                    cssW,
                    cssH,
                    allPositions,
                    points,
                    COLORS.trajectory,
                    skipGround,
                    extraStaticDraw,
                    extraSig
                );
                // 随播放增长的轨迹是动态的, 每帧重绘 (从缓存层之上合成).
                // 用二分求已播放点数量并传 endIndex, 避免每帧 filter+map 分配新数组.
                const pastCount = countPastPoints(points, currentTime);
                renderer.drawTrajectory(allPositions, COLORS.trajectory, pastCount);
            } else {
                if (!skipGround) renderer.drawGround(0, cssW);
                ctx.globalAlpha = 0.3;
                renderer.drawTrajectory(allPositions, COLORS.trajectory);
                ctx.globalAlpha = 1.0;

                const pastCount = countPastPoints(points, currentTime);
                renderer.drawTrajectory(allPositions, COLORS.trajectory, pastCount);
            }
        }

        // ========== 参数对比模式: 多轨迹叠加 ==========
        const inCompareMode = compareMode && compareResults.length > 0;

        if (inCompareMode) {
            // 对比模式: 遍历所有 compareResults, 每组用各自颜色绘制轨迹 + 物体
            renderer.setCircularCoordMode(false);
            if (!skipGround) renderer.drawGround(0, cssW);

            for (let ci = 0; ci < compareResults.length; ci++) {
                const entry = compareResults[ci]!;
                if (!entry.result) continue; // 失败变体不绘制轨迹
                const entryTraj = entry.result.trajectories[0] ?? [];
                if (entryTraj.length === 0) continue;

                const entryPositions = entryTraj.map(p => p.position);
                const pastCount = countPastPoints(entryTraj, currentTime);

                // 完整轨迹 (半透明)
                ctx.globalAlpha = 0.3;
                renderer.drawTrajectory(entryPositions, entry.color);
                ctx.globalAlpha = 1.0;
                // 随播放增长的轨迹
                renderer.drawTrajectory(entryPositions, entry.color, pastCount);

                // 当前帧物体
                const cIdx = findFrameIndex([entryTraj], currentTime);
                const cp0 = entryTraj[cIdx]!;
                const cp1 = entryTraj[Math.min(cIdx + 1, entryTraj.length - 1)]!;
                const cFrame = interpolateFrame(cp0, cp1, currentTime);
                renderer.drawBody(cFrame.position, 0.12, entry.color, `${entry.paramValue}`);
                if (visibleLayers.velocityVector && cFrame.velocity) {
                    renderer.drawVector(cFrame.position, cFrame.velocity, entry.color, '', 0.12);
                }
            }
        }

        // ========== 单仿真模式 (原有逻辑) ==========
        if (!inCompareMode) {
            const idx = findFrameIndex(trajectories, currentTime);
            const p0 = points[idx]!;
            const p1 = points[Math.min(idx + 1, points.length - 1)]!;
            const frame = interpolateFrame(p0, p1, currentTime);

            if (isCircular) {
                renderer.drawCircularMotionSetup(
                    circularCenter,
                    frame.position,
                    circularRadius,
                    circularOmega,
                    circularPivotH,
                    circularBallH
                );
            }

            const emScenes = ['electric-field', 'magnetic-field', 'em-combined'];
            const isEM = emScenes.includes(currentScene);
            const isCollision = currentScene === 'collision';
            const collisionColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

            if (isCollision && trajectories.length > 1) {
                for (let bi = 0; bi < trajectories.length; bi++) {
                    const traj = trajectories[bi] ?? [];
                    if (traj.length === 0) continue;
                    const biIdx = findFrameIndex([traj], currentTime);
                    const bp0 = traj[biIdx]!;
                    const bp1 = traj[Math.min(biIdx + 1, traj.length - 1)]!;
                    const bFrame = interpolateFrame(bp0, bp1, currentTime);
                    const bColor = collisionColors[bi % collisionColors.length] ?? COLORS.body;
                    renderer.drawBody(bFrame.position, 0.15, bColor, `物体${bi + 1}`);
                    if (visibleLayers.velocityVector) {
                        renderer.drawVector(bFrame.position, bFrame.velocity, bColor, `v${bi + 1}`, 0.15);
                    }
                }
            } else if (isCircular && is3DScene) {
                const bodyColor = '#f97316';
                const label = '小球';
                renderer.drawCircularBody3D(
                    frame.position,
                    circularBallRadius,
                    bodyColor,
                    visibleLayers.bodyLabels ? label : undefined,
                    circularBallH
                );
                const centripetalForce = circularForce;
                const centripetalAcc = circularAcc;
                renderer.drawCircularForceVectors(
                    circularCenter,
                    frame.position,
                    frame.velocity,
                    centripetalForce,
                    centripetalAcc,
                    visibleLayers.velocityVector,
                    visibleLayers.accelerationVector,
                    visibleLayers.forceVector,
                    circularBallH
                );
            } else {
                const charge = parameters['charge'] ?? 1.6;
                const bodyColor = isEM ? (charge >= 0 ? '#ef4444' : '#3b82f6') : isCircular ? '#f97316' : COLORS.body;
                const label = isEM
                    ? charge >= 0
                        ? '正电荷'
                        : '负电荷'
                    : isCircular
                      ? '小球'
                      : is3DScene
                        ? ''
                        : '物体';
                renderer.drawBody(frame.position, isCircular ? circularBallRadius : 0.15, bodyColor, label);

                if (isCircular) {
                    const centripetalForce = circularForce;
                    const centripetalAcc = circularAcc;
                    renderer.drawCircularForceVectors(
                        circularCenter,
                        frame.position,
                        frame.velocity,
                        centripetalForce,
                        centripetalAcc,
                        visibleLayers.velocityVector,
                        visibleLayers.accelerationVector,
                        visibleLayers.forceVector,
                        0
                    );
                } else {
                    if (visibleLayers.velocityVector) {
                        renderer.drawVector(frame.position, frame.velocity, COLORS.velocity, 'v', 0.15);
                    }
                    if (visibleLayers.accelerationVector && frame.acceleration) {
                        renderer.drawVector(frame.position, frame.acceleration, COLORS.acceleration, 'a', 0.3);
                    }
                    if (visibleLayers.forceVector && frame.acceleration) {
                        const mass = isEM ? (parameters['mass'] ?? 1.67) * 1e-27 : (parameters['m'] ?? 1);
                        const forceX = frame.acceleration.x * mass;
                        const forceY = frame.acceleration.y * mass;
                        renderer.drawVector(
                            frame.position,
                            { x: forceX, y: forceY },
                            COLORS.force,
                            'F',
                            isEM ? 1e20 : 0.3
                        );
                    }
                }
            }

            // probe 绘制 + HUD 面板 (单仿真模式)
            const probe = probeRef.current;
            if (probe && !isAirTrack) {
                renderer.drawCrosshair(probe.position, isDark);
                renderer.drawProbePoint(
                    probe.position,
                    { t: probe.t, vx: probe.velocity.x, vy: probe.velocity.y },
                    isDark
                );
            }

            const timeText = `t = ${currentTime.toFixed(3)} s`;
            const xText = `x = ${frame.position.x.toFixed(2)} m`;
            const yText = `y = ${frame.position.y.toFixed(2)} m`;
            const hasLabels = visibleLayers.bodyLabels;
            const panelH = hasLabels ? 64 : 28;
            ctx.fillStyle = tokens.canvasHudBgStrong;
            roundRectPath(ctx, 8, 10, 200, panelH, 6);
            ctx.fill();
            ctx.strokeStyle = is3DScene ? tokens.canvasHudBorder : 'transparent';
            ctx.lineWidth = 1;
            roundRectPath(ctx, 8, 10, 200, panelH, 6);
            ctx.stroke();
            ctx.fillStyle = tokens.readoutText;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(timeText, 16, 30);
            if (hasLabels) {
                ctx.font = '12px monospace';
                ctx.fillStyle = tokens.text3;
                ctx.fillText(xText, 16, 50);
                ctx.fillText(yText, 16, 68);
            }
        }
    }, [
        simulationResult,
        compareMode,
        compareResults,
        visibleLayers,
        isDark,
        currentScene,
        parameters,
        experimentData,
        is3DScene,
        isAirTrack,
        isChapter3,
        isChapter2,
        hasCustom2DBackground,
        isWaveOpt,
        isEmEquip,
        isNuclear,
        isThermal,
        isSensor,
        isMechanics,
        isElectromagnetism,
        isModern
    ]);

    // render 引用同步到 ref — rAF loop 通过 renderRef.current() 调用, 总是拿到最新 render
    renderRef.current = render;

    useEffect(() => {
        let running = true;
        const loop = (timestamp: number) => {
            if (!running) return;
            if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
            const delta = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            // 平滑 FPS 估算（用于应用内渲染性能诊断，无 React 重渲染开销）
            if (delta > 0) {
                const instFps = 1 / delta;
                fpsRef.current = fpsRef.current === 0 ? instFps : fpsRef.current * 0.9 + instFps * 0.1;
            }

            if (isPlayingRef.current && simulationResultRef.current) {
                const trajectories = simulationResultRef.current.trajectories;
                const totalDuration = getPlaybackDuration(trajectories);
                const newTime = currentTimeRef.current + delta * playbackSpeedRef.current;
                if (newTime >= totalDuration) {
                    setCurrentTime(totalDuration);
                    pause();
                } else {
                    setCurrentTime(newTime);
                }
            }

            renderRef.current();
            // FPS 叠层（右上角，逻辑像素坐标，叠加在已按 dpr 缩放的 ctx 上）
            // 仅 dev 模式绘制，生产环境跳过逐帧文本绘制 (#16)
            if (import.meta.env.DEV) {
                const fpsCanvas = canvasRef.current;
                if (fpsCanvas) {
                    const fctx = fpsCanvas.getContext('2d');
                    if (fctx) {
                        const { w } = logicalSizeRef.current;
                        fctx.save();
                        fctx.font = '11px monospace';
                        fctx.textAlign = 'right';
                        fctx.textBaseline = 'top';
                        fctx.fillStyle = getThemeTokens(isDarkRef.current).canvasCompareOverlayText;
                        fctx.fillText(`${Math.round(fpsRef.current)} FPS`, w - 10, 8);
                        fctx.restore();
                    }
                }
            }
            animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);
        return () => {
            running = false;
            cancelAnimationFrame(animFrameRef.current);
        };
        // rAF 循环通过 ref 读取最新状态(isPlaying/playbackSpeed/simulationResult/currentTime/render),
        // 因此 effect 仅依赖稳定的 zustand actions。这样 loop 不会在播放中因 currentTime 每帧变化而 teardown/re-setup。
    }, [setCurrentTime, pause]);

    useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        const canvas: HTMLCanvasElement = canvasEl;

        function getRenderer(): CanvasRenderer | null {
            return rendererRef.current;
        }

        const isCircular3D = currentScene === 'circular-motion';
        const probeRadius =
            typeof simulationResult?.diagnostics?.maxValues?.['radius'] === 'number'
                ? simulationResult.diagnostics.maxValues['radius']
                : (parameters['radius'] ?? 1.0);
        const probeBallH = isCircular3D ? Math.min(0.35, Math.max(0.05, probeRadius * 0.6)) : 0;

        function physToScreen(pos: { x: number; y: number }): { x: number; y: number } {
            const r = getRenderer();
            if (!r) return { x: 0, y: 0 };
            if (r.is3D() && isCircular3D) {
                return r.world3DToScreen(pos.x, probeBallH, pos.y);
            }
            return r.worldToScreenPoint(pos);
        }

        function findNearestTrajectoryPoint(mx: number, my: number): TrajectoryPoint | null {
            if (!simulationResult) return null;
            const trajectories = simulationResult.trajectories;
            if (!trajectories || trajectories.length === 0) return null;
            const points = trajectories[0] ?? [];
            if (points.length < 2) return null;

            const hitRadius = 18;
            let best: { point: TrajectoryPoint; dist: number } | null = null;

            for (let i = 0; i < points.length; i++) {
                const p = points[i]!;
                const s = physToScreen(p.position);
                const dx = s.x - mx;
                const dy = s.y - my;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < hitRadius && (!best || d < best.dist)) {
                    best = { point: p, dist: d };
                }
            }

            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i]!;
                const p1 = points[i + 1]!;
                const s0 = physToScreen(p0.position);
                const s1 = physToScreen(p1.position);
                const segDx = s1.x - s0.x;
                const segDy = s1.y - s0.y;
                const segLen2 = segDx * segDx + segDy * segDy;
                if (segLen2 < 1) continue;
                let t = ((mx - s0.x) * segDx + (my - s0.y) * segDy) / segLen2;
                t = Math.max(0, Math.min(1, t));
                const px = s0.x + t * segDx;
                const py = s0.y + t * segDy;
                const dx = px - mx;
                const dy = py - my;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < hitRadius && (!best || d < best.dist)) {
                    const interpT = p0.t + t * (p1.t - p0.t);
                    const interpX = p0.position.x + t * (p1.position.x - p0.position.x);
                    const interpY = p0.position.y + t * (p1.position.y - p0.position.y);
                    const interpVx = p0.velocity.x + t * (p1.velocity.x - p0.velocity.x);
                    const interpVy = p0.velocity.y + t * (p1.velocity.y - p0.velocity.y);
                    best = {
                        point: {
                            t: interpT,
                            position: { x: interpX, y: interpY },
                            velocity: { x: interpVx, y: interpVy },
                            acceleration: p0.acceleration
                        },
                        dist: d
                    };
                }
            }

            if (!best) return null;
            return best.point;
        }

        function getCanvasPos(e: MouseEvent): { x: number; y: number } {
            const rect = canvas.getBoundingClientRect();
            // 绘制坐标系为逻辑 CSS 像素（resize 中已按 dpr 缩放 ctx），
            // 故鼠标坐标也应映射到逻辑空间，scale ≈ 1。
            const scaleX = logicalSizeRef.current.w / rect.width || 1;
            const scaleY = logicalSizeRef.current.h / rect.height || 1;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }

        function onMouseMove(e: MouseEvent) {
            const { x: mx, y: my } = getCanvasPos(e);
            const nearest = findNearestTrajectoryPoint(mx, my);
            probeRef.current = nearest;
            canvas.style.cursor = nearest ? 'crosshair' : 'default';
        }

        function onMouseLeave() {
            probeRef.current = null;
            canvas.style.cursor = 'default';
        }

        function onClick(e: MouseEvent) {
            const { x: mx, y: my } = getCanvasPos(e);
            const nearest = findNearestTrajectoryPoint(mx, my);
            if (nearest) {
                pause();
                setCurrentTime(nearest.t);
            }
        }

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
        canvas.addEventListener('click', onClick);
        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseleave', onMouseLeave);
            canvas.removeEventListener('click', onClick);
        };
    }, [simulationResult, pause, setCurrentTime]);

    return (
        <div className="canvas-wrapper">
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
}

/* ====================================================================== */
/*  场景绘制工具函数                                                        */
/* ====================================================================== */

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
