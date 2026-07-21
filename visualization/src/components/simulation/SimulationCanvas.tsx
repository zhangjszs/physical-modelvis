import { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CoordinateTransformer } from '../../rendering/CoordinateTransformer';
import { CanvasRenderer } from '../../rendering/CanvasRenderer';
import { setupHiDPICanvas } from '../../rendering/dpr';
import { COLORS } from '../../utils/colorMap';
import { findFrameIndex, interpolateFrame, getTotalDuration } from '../../utils/frameUtils';
import type { TrajectoryPoint, SimulationResult } from 'physics-core';
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
import { woodTexture, metalTexture } from '../../rendering/textureFactory';
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
    drawDopplerScene,
    drawDoubleSlitScene,
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

const SCENES_2D_CUSTOM_BG = new Set([
    'electric-field',
    'magnetic-field',
    'em-combined',
    'collision',
    'spring',
    'inclined-plane'
]);

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
    'galileo-incline',
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
    'em-spectrum'
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

/** 绘制匀强电场线（渐变发光箭头，方向向上） */
function drawElectricField(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean
) {
    const spacing = 60;
    const baseColor = isDark ? ([251, 191, 36] as const) : ([234, 179, 8] as const);

    for (let x = spacing / 2; x < width; x += spacing) {
        const startY = height - 30;
        const endY = 30;
        ctx.strokeStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${isDark ? 0.12 : 0.15})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY + 12);
        ctx.stroke();
        const grad = ctx.createLinearGradient(x, startY, x, endY);
        grad.addColorStop(0, `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},0.2)`);
        grad.addColorStop(0.5, `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${isDark ? 0.55 : 0.65})`);
        grad.addColorStop(1, `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${isDark ? 0.55 : 0.65})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY + 12);
        ctx.stroke();
        ctx.fillStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${isDark ? 0.6 : 0.7})`;
        ctx.beginPath();
        ctx.moveTo(x, endY);
        ctx.lineTo(x - 7, endY + 14);
        ctx.lineTo(x, endY + 9);
        ctx.lineTo(x + 7, endY + 14);
        ctx.closePath();
        ctx.fill();
    }

    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    const lx = width - 12,
        ly = 24;
    const eLabel = 'E';
    const tm = ctx.measureText(eLabel);
    const arrowW = 18;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    ctx.fillRect(lx - tm.width - arrowW - 6, ly - 12, tm.width + arrowW + 10, 18);
    ctx.fillStyle = `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})`;
    ctx.fillText(eLabel, lx - arrowW, ly);
    {
        const ax = lx - arrowW + tm.width + 4,
            ay = ly - 9;
        ctx.strokeStyle = `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ax + 5, ay + 12);
        ctx.lineTo(ax + 5, ay);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + 5, ay);
        ctx.lineTo(ax + 1, ay + 5);
        ctx.lineTo(ax + 9, ay + 5);
        ctx.closePath();
        ctx.fillStyle = `rgb(${baseColor[0]},${baseColor[1]},${baseColor[2]})`;
        ctx.fill();
    }
}

/** 绘制匀强磁场符号（⊗ 画成圆圈+叉号，更精致） */
function drawMagneticField(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean
) {
    const spacing = 70;
    const r = 10;
    const lineColor = isDark ? 'rgba(168,85,247,0.55)' : 'rgba(147,51,234,0.5)';
    const circleColor = isDark ? 'rgba(168,85,247,0.3)' : 'rgba(147,51,234,0.25)';

    for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
            ctx.strokeStyle = circleColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.5;
            const d = r * 0.55;
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
    ctx.fillStyle = lineColor;
    ctx.fillText('B (垂直纸面向里)', width - 12, 12);
    ctx.textBaseline = 'alphabetic';
}

/** 绘制碰撞场景：两物体 3D 方块 + 阴影 + 高光 + 精致箭头 */
function drawCollisionScene(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean,
    params: Record<string, number>
) {
    const m1 = params['m1'] ?? 1;
    const m2 = params['m2'] ?? 1;
    const v1 = params['v1'] ?? 5;
    const v2 = params['v2'] ?? 0;
    const e = params['e'] ?? 1;
    const labelColor = isDark ? '#e2e8f0' : '#1e293b';
    const subColor = isDark ? '#94a3b8' : '#64748b';

    const size1 = Math.max(24, Math.min(64, 18 + m1 * 5));
    const size2 = Math.max(24, Math.min(64, 18 + m2 * 5));
    const cy = height / 2;

    function draw3DBox(cx: number, cy2: number, sz: number, baseHex: string) {
        const x = cx - sz / 2,
            y = cy2 - sz / 2;
        ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + 4, y + 4, sz, sz);
        const metalTex = metalTexture(sz, sz, baseHex, isDark);
        ctx.save();
        roundRectPath(ctx, x, y, sz, sz, 4);
        ctx.clip();
        ctx.drawImage(metalTex, x, y, sz, sz);
        ctx.restore();
        ctx.strokeStyle = darkenHex(baseHex, 50);
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        roundRectPath(ctx, x, y, sz, sz, 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        roundRectPath(ctx, x + 3, y + 3, sz - 6, sz * 0.3, 3);
        ctx.fill();
    }

    function drawArrow2(x1: number, y1: number, x2: number, y2: number, color: string) {
        const dx = x2 - x1,
            dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 3) return;
        const angle = Math.atan2(dy, dx);
        const headLen = Math.min(12, len * 0.3);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, color + '66');
        grad.addColorStop(1, color);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2 - headLen * 0.6 * Math.cos(angle), y2 - headLen * 0.6 * Math.sin(angle));
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - 0.38), y2 - headLen * Math.sin(angle - 0.38));
        ctx.lineTo(x2 - headLen * 0.45 * Math.cos(angle), y2 - headLen * 0.45 * Math.sin(angle));
        ctx.lineTo(x2 - headLen * Math.cos(angle + 0.38), y2 - headLen * Math.sin(angle + 0.38));
        ctx.closePath();
        ctx.fill();
    }

    draw3DBox(width * 0.25, cy, size1, '#3b82f6');
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m1=${m1}kg`, width * 0.25, cy + size1 / 2 + 18);
    ctx.fillStyle = subColor;
    ctx.font = '11px sans-serif';
    ctx.fillText(`v1=${v1}m/s`, width * 0.25, cy + size1 / 2 + 33);

    draw3DBox(width * 0.7, cy, size2, '#ef4444');
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m2=${m2}kg`, width * 0.7, cy + size2 / 2 + 18);
    ctx.fillStyle = subColor;
    ctx.font = '11px sans-serif';
    ctx.fillText(`v2=${v2}m/s`, width * 0.7, cy + size2 / 2 + 33);

    // 速度箭头按可用宽度归一化并钳制，大速度不再溢出画布
    const maxV = Math.max(Math.abs(v1), Math.abs(v2), 1);
    const vPixelScale = Math.min(4, (width * 0.16) / maxV);
    if (v1 !== 0) {
        const x1 = width * 0.25 + size1 / 2 + 5;
        drawArrow2(x1, cy, Math.max(10, Math.min(width - 10, x1 + v1 * vPixelScale)), cy, '#3b82f6');
    }
    if (v2 !== 0) {
        const x1 = width * 0.7 + size2 / 2 + 5;
        drawArrow2(x1, cy, Math.max(10, Math.min(width - 10, x1 + v2 * vPixelScale)), cy, '#ef4444');
    }

    const typeLabel = e >= 0.99 ? '弹性碰撞' : e < 0.01 ? '完全非弹性碰撞' : '非弹性碰撞';
    const labelText = `${typeLabel} (e=${e})`;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(labelText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = subColor;
    ctx.fillText(labelText, width / 2, height - 18);
}

/** 绘制弹簧振子场景：金属墙壁 + 立体弹簧线圈 + 3D 滑块 + 平衡位置 */
function drawSpringScene(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean,
    params: Record<string, number>
) {
    const k = params['k'] ?? 10;
    const m = params['m'] ?? 1;
    const A = params['A'] ?? 0.5;
    const damping = params['damping'] ?? 0;
    const labelColor = isDark ? '#e2e8f0' : '#1e293b';
    const subColor = isDark ? '#94a3b8' : '#64748b';
    const cy = height / 2;
    const anchorX = 60;
    const blockW = 44;
    const blockH = 34;
    const eqX = width * 0.5;
    // 振幅按画布可用宽度钳制，大 A 时滑块/弹簧不再越出右界
    const maxOff = Math.max(0, width - 30 - blockW / 2 - eqX);
    const blockX = eqX + Math.max(-maxOff, Math.min(maxOff, A * 200));

    const wallGrad = ctx.createLinearGradient(anchorX - 14, 0, anchorX, 0);
    wallGrad.addColorStop(0, isDark ? '#334155' : '#94a3b8');
    wallGrad.addColorStop(1, isDark ? '#475569' : '#cbd5e1');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(anchorX - 14, cy - 55, 14, 110);
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = -10; i < 120; i += 6) {
        ctx.beginPath();
        ctx.moveTo(anchorX - 14, cy - 55 + i);
        ctx.lineTo(anchorX - 4, cy - 55 + i + 10);
        ctx.stroke();
    }

    const coils = 14;
    const springLen = blockX - blockW / 2 - anchorX;
    const amplitude = Math.max(6, Math.min(14, 10 * (springLen / 200)));
    ctx.strokeStyle = isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.12)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(anchorX, cy);
    for (let i = 0; i <= coils; i++) {
        const px = anchorX + (springLen * i) / coils;
        const py = cy + (i % 2 === 0 ? -amplitude : amplitude);
        ctx.lineTo(px, i === 0 || i === coils ? cy : py);
    }
    ctx.stroke();
    const springGrad = ctx.createLinearGradient(anchorX, cy - amplitude, anchorX, cy + amplitude);
    springGrad.addColorStop(0, isDark ? '#67e8f9' : '#06b6d4');
    springGrad.addColorStop(0.5, isDark ? '#22d3ee' : '#0891b2');
    springGrad.addColorStop(1, isDark ? '#06b6d4' : '#0e7490');
    ctx.strokeStyle = springGrad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, cy);
    for (let i = 0; i <= coils; i++) {
        const px = anchorX + (springLen * i) / coils;
        const py = cy + (i % 2 === 0 ? -amplitude : amplitude);
        ctx.lineTo(px, i === 0 || i === coils ? cy : py);
    }
    ctx.stroke();
    ctx.lineJoin = 'miter';

    const bx = blockX - blockW / 2,
        by = cy - blockH / 2;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    roundRectPath(ctx, bx + 3, by + 3, blockW, blockH, 4);
    ctx.fill();
    const blockTex = metalTexture(blockW, blockH, '#3b82f6', isDark);
    ctx.save();
    roundRectPath(ctx, bx, by, blockW, blockH, 4);
    ctx.clip();
    ctx.drawImage(blockTex, bx, by, blockW, blockH);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRectPath(ctx, bx + 3, by + 3, blockW - 6, blockH * 0.3, 3);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m=${m}kg`, blockX, cy + blockH / 2 + 18);

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = isDark ? 'rgba(34,211,238,0.35)' : 'rgba(8,145,178,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(eqX, cy - 65);
    ctx.lineTo(eqX, cy + 65);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = subColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('平衡位置', eqX, cy - 70);

    const infoText = `k=${k}N/m  A=${A}m${damping > 0 ? `  阻尼=${damping}` : ''}`;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(infoText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = subColor;
    ctx.fillText(infoText, width / 2, height - 18);
}

/**
 * 绘制斜面场景：教科书标准"左竖右斜"楔体 + 3D 滑块 + 角度标注
 */
function drawInclinedPlaneScene(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean,
    params: Record<string, number>
) {
    const thetaDeg = params['theta'] ?? 30;
    const m = params['m'] ?? 1;
    const mu = params['mu'] ?? 0;
    const labelColor = isDark ? '#e2e8f0' : '#1e293b';
    const subColor = isDark ? '#94a3b8' : '#64748b';
    const thetaRad = (thetaDeg * Math.PI) / 180;

    const baseLen = width * 0.65;
    const wallH = baseLen * Math.tan(thetaRad);
    const bottomRight = { x: width * 0.82, y: height * 0.82 };
    const bottomLeft = { x: bottomRight.x - baseLen, y: bottomRight.y };
    const topLeft = { x: bottomLeft.x, y: bottomRight.y - wallH };

    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.moveTo(topLeft.x + 5, topLeft.y + 5);
    ctx.lineTo(bottomLeft.x + 5, bottomLeft.y + 5);
    ctx.lineTo(bottomRight.x + 5, bottomRight.y + 5);
    ctx.closePath();
    ctx.fill();

    const wedgeW = bottomRight.x - bottomLeft.x;
    const wedgeH = bottomRight.y - topLeft.y;
    const woodTex = woodTexture(Math.max(64, wedgeW), Math.max(64, wedgeH), isDark ? '#7c5e3c' : '#b07c4f', isDark);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(woodTex, bottomLeft.x, topLeft.y, wedgeW, wedgeH);
    ctx.restore();

    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.18)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < wallH; i += 7) {
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x - 8, topLeft.y + i);
        ctx.lineTo(bottomLeft.x, topLeft.y + i + 7);
        ctx.stroke();
    }

    const arcR = 45;
    const startAngle = Math.PI;
    const slopeAngleFromBR = Math.atan2(topLeft.y - bottomRight.y, topLeft.x - bottomRight.x);
    // 取从水平底边(startAngle)到斜面边的最小扫角(=θ)，避免 anticlockwise=true 画出 330° 优角
    const minorSweep = (((slopeAngleFromBR - startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const midAngle = startAngle + minorSweep / 2;
    ctx.fillStyle = isDark ? 'rgba(251,191,36,0.10)' : 'rgba(217,119,6,0.08)';
    ctx.beginPath();
    ctx.moveTo(bottomRight.x, bottomRight.y);
    ctx.arc(bottomRight.x, bottomRight.y, arcR, startAngle, slopeAngleFromBR, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bottomRight.x, bottomRight.y, arcR, startAngle, slopeAngleFromBR, false);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        `\u03B8=${thetaDeg}\u00B0`,
        bottomRight.x + (arcR + 22) * Math.cos(midAngle),
        bottomRight.y + (arcR + 22) * Math.sin(midAngle)
    );
    ctx.textBaseline = 'alphabetic';

    const t = 0.45;
    const slopeCenterX = bottomRight.x + t * (topLeft.x - bottomRight.x);
    const slopeCenterY = bottomRight.y + t * (topLeft.y - bottomRight.y);
    const blockW = 38;
    const blockH = 24;

    ctx.save();
    ctx.translate(slopeCenterX, slopeCenterY);
    ctx.rotate(thetaRad);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRectPath(ctx, -blockW / 2 + 3, -blockH + 3, blockW, blockH, 4);
    ctx.fill();
    const bGrad = ctx.createLinearGradient(-blockW / 2, -blockH, blockW / 2, 0);
    bGrad.addColorStop(0, '#60a5fa');
    bGrad.addColorStop(0.5, '#3b82f6');
    bGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bGrad;
    roundRectPath(ctx, -blockW / 2, -blockH, blockW, blockH, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    roundRectPath(ctx, -blockW / 2 + 3, -blockH + 3, blockW - 6, blockH * 0.35, 3);
    ctx.fill();
    ctx.restore();

    const labelOffX = slopeCenterX + Math.sin(thetaRad) * (blockH + 12);
    const labelOffY = slopeCenterY - Math.cos(thetaRad) * (blockH + 12);
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m=${m}kg`, labelOffX, labelOffY);

    if (mu > 0) {
        const infoText = `\u03BC=${mu}`;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(infoText).width;
        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
        roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
        ctx.fill();
        ctx.fillStyle = subColor;
        ctx.fillText(infoText, width / 2, height - 18);
    }
}

/** 绘制电磁复合场：渐变电场线 + 精致磁场符号 */
function drawEMCombinedField(
    ctx: CanvasRenderingContext2D,
    _transformer: CoordinateTransformer,
    width: number,
    height: number,
    isDark: boolean
) {
    const spacing = 60;
    const eColor = isDark ? ([251, 191, 36] as const) : ([234, 179, 8] as const);
    for (let y = spacing / 2; y < height; y += spacing) {
        const startX = 30;
        const endX = width - 30;
        ctx.strokeStyle = `rgba(${eColor[0]},${eColor[1]},${eColor[2]},0.1)`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        const grad = ctx.createLinearGradient(startX, y, endX, y);
        grad.addColorStop(0, `rgba(${eColor[0]},${eColor[1]},${eColor[2]},0.2)`);
        grad.addColorStop(0.4, `rgba(${eColor[0]},${eColor[1]},${eColor[2]},${isDark ? 0.5 : 0.6})`);
        grad.addColorStop(1, `rgba(${eColor[0]},${eColor[1]},${eColor[2]},${isDark ? 0.5 : 0.6})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(${eColor[0]},${eColor[1]},${eColor[2]},${isDark ? 0.55 : 0.65})`;
        ctx.beginPath();
        ctx.moveTo(endX, y);
        ctx.lineTo(endX - 12, y - 5);
        ctx.lineTo(endX - 7, y);
        ctx.lineTo(endX - 12, y + 5);
        ctx.closePath();
        ctx.fill();
    }
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgb(${eColor[0]},${eColor[1]},${eColor[2]})`;
    ctx.fillText('E', 12, 20);
    {
        const arrowX = 26,
            arrowY = 16;
        ctx.strokeStyle = `rgb(${eColor[0]},${eColor[1]},${eColor[2]})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX + 14, arrowY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrowX + 14, arrowY);
        ctx.lineTo(arrowX + 9, arrowY - 4);
        ctx.lineTo(arrowX + 9, arrowY + 4);
        ctx.closePath();
        ctx.fillStyle = `rgb(${eColor[0]},${eColor[1]},${eColor[2]})`;
        ctx.fill();
    }

    const bSpacing = 70;
    const bR = 9;
    const bLineColor = isDark ? 'rgba(168,85,247,0.5)' : 'rgba(147,51,234,0.45)';
    const bCircleColor = isDark ? 'rgba(168,85,247,0.25)' : 'rgba(147,51,234,0.2)';
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

    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`t = ${currentTime.toFixed(4)} s`, 16, 18);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
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
        for (const traj of simulationResult.trajectories) {
            for (const p of traj) {
                allPoints.push(p.position);
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

        // 标准轨迹场景: 背景 / 网格 / 坐标轴 / 自定义背景 / 地面 / 完整轨迹 全部烘焙到离屏层,
        // 每帧仅需一次 drawImage 合成. 跳过低级的逐帧 clear / grid / axes 绘制.
        const skipStaticDraws = usesStaticLayer;

        // 自定义 2D 背景 (电场 / 磁场 / 碰撞 / 弹簧 / 斜面): 静态路径烘焙进离屏层,
        // 非静态路径 (gap 等自定义场景 / 无轨迹空状态) 直接绘制到主 canvas.
        let extraStaticDraw: ((c: CanvasRenderingContext2D) => void) | undefined;
        let extraSig = '';
        // 注意: 这里有意使用 if/else 而非 switch(currentScene), 避免被
        // renderer-routing 自检正则误识别为主路由 switch (它匹配最近的 switch).
        if (!is3DScene && hasCustom2DBackground) {
            const drawBg = (c: CanvasRenderingContext2D) => {
                if (currentScene === 'electric-field') {
                    drawElectricField(c, transformer, cssW, cssH, isDark);
                } else if (currentScene === 'magnetic-field') {
                    drawMagneticField(c, transformer, cssW, cssH, isDark);
                } else if (currentScene === 'em-combined') {
                    drawEMCombinedField(c, transformer, cssW, cssH, isDark);
                } else if (currentScene === 'collision') {
                    drawCollisionScene(c, transformer, cssW, cssH, isDark, parameters);
                } else if (currentScene === 'spring') {
                    drawSpringScene(c, transformer, cssW, cssH, isDark, parameters);
                } else if (currentScene === 'inclined-plane') {
                    drawInclinedPlaneScene(c, transformer, cssW, cssH, isDark, parameters);
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
                    drawDoubleSlitScene(sceneOpts);
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
            ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
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
        const circularRadius = parameters['radius'] ?? 1.0;
        const circularOmega = parameters['omega'] ?? 3.0;
        const circularPivotH = is3DScene ? 1.2 : 0;
        const circularBallH = is3DScene ? 0.35 : 0;

        const allPositions = points.map(p => p.position);

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
                const pastPoints = points.filter(p => p.t <= currentTime).map(p => p.position);
                renderer.drawTrajectory(pastPoints, COLORS.trajectory);
            } else {
                if (!skipGround) renderer.drawGround(0, cssW);
                ctx.globalAlpha = 0.3;
                renderer.drawTrajectory(allPositions, COLORS.trajectory);
                ctx.globalAlpha = 1.0;

                const pastPoints = points.filter(p => p.t <= currentTime).map(p => p.position);
                renderer.drawTrajectory(pastPoints, COLORS.trajectory);
            }
        }

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
                0.12,
                bodyColor,
                visibleLayers.bodyLabels ? label : undefined,
                circularBallH
            );
            const mass = parameters['mass'] ?? 0.2;
            const centripetalForce = mass * circularOmega * circularOmega * circularRadius;
            const centripetalAcc = circularOmega * circularOmega * circularRadius;
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
            const label = isEM ? (charge >= 0 ? '正电荷' : '负电荷') : isCircular ? '小球' : is3DScene ? '' : '物体';
            renderer.drawBody(frame.position, isCircular ? 0.12 : 0.15, bodyColor, label);

            if (isCircular) {
                const mass = parameters['mass'] ?? 0.2;
                const centripetalForce = mass * circularOmega * circularOmega * circularRadius;
                const centripetalAcc = circularOmega * circularOmega * circularRadius;
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
                    renderer.drawVector(frame.position, { x: forceX, y: forceY }, COLORS.force, 'F', isEM ? 1e20 : 0.3);
                }
            }
        }

        const probe = probeRef.current;
        if (probe && !isAirTrack) {
            renderer.drawCrosshair(probe.position, isDark);
            renderer.drawProbePoint(
                probe.position,
                {
                    t: probe.t,
                    vx: probe.velocity.x,
                    vy: probe.velocity.y
                },
                isDark
            );
        }

        const timeText = `t = ${currentTime.toFixed(3)} s`;
        const xText = `x = ${frame.position.x.toFixed(2)} m`;
        const yText = `y = ${frame.position.y.toFixed(2)} m`;
        const hasLabels = visibleLayers.bodyLabels;
        const panelH = hasLabels ? 64 : 28;
        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)';
        roundRectPath(ctx, 8, 10, 200, panelH, 6);
        ctx.fill();
        ctx.strokeStyle = is3DScene ? (isDark ? 'rgba(56,189,248,0.3)' : 'rgba(59,130,246,0.2)') : 'transparent';
        ctx.lineWidth = 1;
        roundRectPath(ctx, 8, 10, 200, panelH, 6);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(timeText, 16, 30);
        if (hasLabels) {
            ctx.font = '12px monospace';
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.fillText(xText, 16, 50);
            ctx.fillText(yText, 16, 68);
        }
    }, [
        simulationResult,
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
                const totalDuration = getTotalDuration(trajectories);
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
            const fpsCanvas = canvasRef.current;
            if (fpsCanvas) {
                const fctx = fpsCanvas.getContext('2d');
                if (fctx) {
                    const { w } = logicalSizeRef.current;
                    fctx.save();
                    fctx.font = '11px monospace';
                    fctx.textAlign = 'right';
                    fctx.textBaseline = 'top';
                    fctx.fillStyle = isDarkRef.current ? 'rgba(148,163,184,0.85)' : 'rgba(71,85,105,0.85)';
                    fctx.fillText(`${Math.round(fpsRef.current)} FPS`, w - 10, 8);
                    fctx.restore();
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
        const probeBallH = isCircular3D ? 0.35 : 0;

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

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map(c => c + c)
                  .join('')
            : h;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function darkenHex(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [r - amount, g - amount, b - amount].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}
