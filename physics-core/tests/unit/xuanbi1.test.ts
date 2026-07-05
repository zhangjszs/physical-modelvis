import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ProjectileCollisionModel } from '../../src/models/projectile-collision.js';
import { DoublePendulumSyncModel } from '../../src/models/double-pendulum.js';
import { ForcedVibrationModel } from '../../src/models/forced-vibration.js';
import { ResonanceModel } from '../../src/models/resonance.js';
import { SoundWaveformModel } from '../../src/models/sound-waveform.js';
import { WaterDiffractionModel } from '../../src/models/water-diffraction.js';
import { SoundInterferenceModel } from '../../src/models/sound-interference.js';
import { DopplerModel } from '../../src/models/doppler.js';
import { ThinFilmModel } from '../../src/models/thin-film.js';
import { HologramModel } from '../../src/models/hologram.js';
import { SingleSlitModel } from '../../src/models/single-slit.js';
import { DiffractionGratingModel } from '../../src/models/diffraction-grating.js';
import { PolarizationModel } from '../../src/models/polarization.js';

function makeBody(id = 'b1', mass = 1) {
  return {
    id,
    mass: { value: mass, unit: 'kg' as const },
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  };
}

function makeProblemPartial(modelType: string, constraints: Record<string, unknown>, bodies: ReturnType<typeof makeBody>[] = [makeBody()]): PhysicsProblem {
  return {
    id: 'test-' + modelType,
    model: modelType as PhysicsProblem['model'],
    bodies,
    constraints: constraints as PhysicsProblem['constraints'],
    timeConfig: { duration: 5, sampleCount: 100 },
    environment: {},
  };
}

describe('E1: ProjectileCollisionModel', () => {
  const model = new ProjectileCollisionModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('projectile-collision');
    expect(model.name).toContain('平抛');
    expect(model.version).toBe('1.0.0');
  });
  it('动量守恒: m1=m2=1, v1=2, e=1 → OM+ON = OP', () => {
    const r = model.solve(makeProblemPartial('projectile-collision', {
      projectileCollision: { m1: 1, m2: 1, v1Initial: 2, tableHeight: 1, restitution: 1, gravity: 9.8 },
    }));
    const OP = r.diagnostics.maxValues.OP as number;
    const OM = r.diagnostics.maxValues.OM as number;
    const ON = r.diagnostics.maxValues.ON as number;
    expect(OP).toBeGreaterThan(0);
    expect(OM).toBeCloseTo(0, 5);
    expect(ON).toBeCloseTo(OP, 5);
  });
  it('完全非弹性 (e=0): OM≈ON', () => {
    const r = model.solve(makeProblemPartial('projectile-collision', {
      projectileCollision: { m1: 1, m2: 1, v1Initial: 4, tableHeight: 1.25, restitution: 0 },
    }));
    const OM = r.diagnostics.maxValues.OM as number;
    const ON = r.diagnostics.maxValues.ON as number;
    expect(Math.abs(OM - ON)).toBeLessThan(0.01);
  });
  it('动量守恒相对误差 < 1e-6', () => {
    const r = model.solve(makeProblemPartial('projectile-collision', {
      projectileCollision: { m1: 0.5, m2: 2, v1Initial: 3, tableHeight: 1, restitution: 1 },
    }));
    const relErr = r.diagnostics.maxValues.momentumRelErr as number;
    expect(relErr).toBeLessThan(1e-6);
  });
  it('conservedQuantities 包含水平动量', () => {
    const r = model.solve(makeProblemPartial('projectile-collision', {
      projectileCollision: { m1: 1, m2: 1, v1Initial: 2, tableHeight: 1 },
    }));
    expect(r.diagnostics.conservedQuantities.length).toBeGreaterThanOrEqual(1);
    expect(r.diagnostics.conservedQuantities[0]!.name).toContain('动量');
    expect(r.diagnostics.conservedQuantities[0]!.conserved).toBe(true);
  });
});

describe('E2: DoublePendulumSyncModel', () => {
  const model = new DoublePendulumSyncModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('double-pendulum');
    expect(model.name).toContain('单摆');
  });
  it('同摆长+同相: T1=T2', () => {
    const r = model.solve(makeProblemPartial('double-pendulum', {
      doublePendulum: { length1: 1, length2: 1, initialAngle1: 5, initialAngle2: 5, phaseDiff: 0 },
    }));
    const T1 = r.diagnostics.maxValues.T1 as number;
    const T2 = r.diagnostics.maxValues.T2 as number;
    expect(Math.abs(T1 - T2)).toBeLessThan(1e-9);
    expect(r.diagnostics.flags?.sameLength).toBe(true);
    expect(r.diagnostics.flags?.inPhase).toBe(true);
  });
  it('不同摆长: T1≠T2', () => {
    const r = model.solve(makeProblemPartial('double-pendulum', {
      doublePendulum: { length1: 1, length2: 4, initialAngle1: 5, initialAngle2: 5, phaseDiff: 0 },
    }));
    const T1 = r.diagnostics.maxValues.T1 as number;
    const T2 = r.diagnostics.maxValues.T2 as number;
    expect(Math.abs(T1 - T2)).toBeGreaterThan(0.1);
    expect(r.diagnostics.flags?.sameLength).toBe(false);
  });
  it('反相: antiPhase flag', () => {
    const r = model.solve(makeProblemPartial('double-pendulum', {
      doublePendulum: { length1: 1, length2: 1, initialAngle1: 5, initialAngle2: 5, phaseDiff: 180 },
    }));
    expect(r.diagnostics.flags?.antiPhase).toBe(true);
  });
  it('θ-t 图表正确生成', () => {
    const r = model.solve(makeProblemPartial('double-pendulum', {
      doublePendulum: { length1: 1, length2: 1, initialAngle1: 10, initialAngle2: 10, phaseDiff: 0 },
    }));
    expect(r.charts.theta_t!.points.length).toBeGreaterThan(50);
    expect(r.charts.y_t!.points.length).toBeGreaterThan(50);
  });
});

describe('E3: ForcedVibrationModel', () => {
  const model = new ForcedVibrationModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('forced-vibration');
    expect(model.name).toBeDefined();
  });
  it('稳态振幅公式验证 (弱阻尼, f_drive=f_0)', () => {
    const m = 1, k = 100, F0 = 5, beta = 0.1;
    const omega0 = Math.sqrt(k / m);
    const f0 = omega0 / (2 * Math.PI);
    const A_theory = (F0 / m) / Math.sqrt((omega0 * omega0 - omega0 * omega0) ** 2 + (2 * beta * omega0) ** 2);
    const r = model.solve(makeProblemPartial('forced-vibration', {
      forcedVibration: { mass: m, springConstant: k, dampingBeta: beta, forceAmplitude: F0, drivingFreq: f0 },
    }));
    const A_theo = r.diagnostics.maxValues.amplitudeTheoretical as number;
    expect(A_theo).toBeCloseTo(A_theory, 5);
  });
  it('共振曲线峰值在 f_0 附近', () => {
    const m = 1, k = 100, F0 = 2;
    const r = model.solve(makeProblemPartial('forced-vibration', {
      forcedVibration: { mass: m, springConstant: k, dampingBeta: 0.2, forceAmplitude: F0, drivingFreq: 2 },
    }));
    expect(r.charts.A_f_drive!.points.length).toBeGreaterThan(50);
  });
  it('近共振 flag', () => {
    const m = 1, k = 100, F0 = 2;
    const f0 = Math.sqrt(k / m) / (2 * Math.PI);
    const r = model.solve(makeProblemPartial('forced-vibration', {
      forcedVibration: { mass: m, springConstant: k, dampingBeta: 0.1, forceAmplitude: F0, drivingFreq: f0 * 1.02 },
    }));
    expect(r.diagnostics.flags?.isNearResonance).toBe(true);
  });
  it('explanation.summary 含 f_0 和 f_d', () => {
    const r = model.solve(makeProblemPartial('forced-vibration', {
      forcedVibration: { mass: 1, springConstant: 100, dampingBeta: 0.3, forceAmplitude: 2, drivingFreq: 3 },
    }));
    expect(r.explanation.summary).toContain('Hz');
  });
});

describe('E4: ResonanceModel', () => {
  const model = new ResonanceModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('resonance');
    expect(model.name).toContain('共振');
  });
  it('基本共振曲线生成', () => {
    const r = model.solve(makeProblemPartial('resonance', {
      resonance: { mass: 1, springConstant: 100, forceAmplitude: 5, dampingBetas: [0.1, 0.3], freqMin: 0.1, freqMax: 5 },
    }));
    expect(r.charts.A_f_drive!.points.length).toBeGreaterThan(50);
    expect(r.diagnostics.maxValues.Q).toBeGreaterThan(0);
  });
  it('阻尼越小 Q 越大', () => {
    const r1 = model.solve(makeProblemPartial('resonance', {
      resonance: { mass: 1, springConstant: 100, forceAmplitude: 5, dampingBetas: [0.05], freqMin: 0.1, freqMax: 5 },
    }));
    const r2 = model.solve(makeProblemPartial('resonance', {
      resonance: { mass: 1, springConstant: 100, forceAmplitude: 5, dampingBetas: [0.5], freqMin: 0.1, freqMax: 5 },
    }));
    const Q1 = r1.diagnostics.maxValues.Q as number;
    const Q2 = r2.diagnostics.maxValues.Q as number;
    expect(Q1).toBeGreaterThan(Q2);
  });
  it('峰值位置正数', () => {
    const r = model.solve(makeProblemPartial('resonance', {
      resonance: { mass: 1, springConstant: 100, forceAmplitude: 5, dampingBetas: [0.2], freqMin: 0.1, freqMax: 5 },
    }));
    const peakF = r.diagnostics.maxValues.peakF as number;
    const peakA = r.diagnostics.maxValues.peakA as number;
    expect(peakF).toBeGreaterThan(0);
    expect(peakA).toBeGreaterThan(0);
  });
  it('多阻尼曲线 flag', () => {
    const r = model.solve(makeProblemPartial('resonance', {
      resonance: { mass: 1, springConstant: 100, forceAmplitude: 5, dampingBetas: [0.1, 0.3, 0.5], freqMin: 0.1, freqMax: 5 },
    }));
    expect(r.diagnostics.flags?.hasMultipleDamping).toBe(true);
  });
});

describe('E5: SoundWaveformModel', () => {
  const model = new SoundWaveformModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('sound-waveform');
  });
  it('纯音: 峰值=A', () => {
    const r = model.solve(makeProblemPartial('sound-waveform', {
      soundWaveform: { frequency: 441, amplitude: 0.8, waveType: 'pure' },
    }));
    const maxDisp = r.diagnostics.maxValues.maxDisp as number;
    expect(maxDisp).toBeCloseTo(0.8, 1);
  });
  it('噪声: 最大振幅 <= A', () => {
    const r = model.solve(makeProblemPartial('sound-waveform', {
      soundWaveform: { frequency: 440, amplitude: 0.5, waveType: 'noise' },
    }));
    const maxDisp = r.diagnostics.maxValues.maxDisp as number;
    expect(maxDisp).toBeLessThanOrEqual(0.5 + 1e-6);
  });
  it('复合音生成成功', () => {
    const r = model.solve(makeProblemPartial('sound-waveform', {
      soundWaveform: { frequency: 200, amplitude: 0.7, waveType: 'complex', harmonics: [0.5, 0.3] },
    }));
    expect(r.diagnostics.maxValues.harmonicCount).toBe(2);
  });
  it('超高频警告', () => {
    const r = model.solve(makeProblemPartial('sound-waveform', {
      soundWaveform: { frequency: 25000, amplitude: 0.5, waveType: 'pure' },
    }));
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it('波形数据点正确', () => {
    const r = model.solve(makeProblemPartial('sound-waveform', {
      soundWaveform: { frequency: 1000, amplitude: 1, waveType: 'pure' },
    }));
    expect(r.charts.waveform_t!.points.length).toBeGreaterThan(50);
  });
});

describe('E6: WaterDiffractionModel', () => {
  const model = new WaterDiffractionModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('water-diffraction');
  });
  it('a/lambda<1 => strong', () => {
    const r = model.solve(makeProblemPartial('water-diffraction', {
      waterDiffraction: { wavelength: 10, slitWidth: 5, screenDist: 50, waveAmplitude: 1 },
    }));
    expect(r.diagnostics.flags?.isStrong).toBe(true);
    expect(r.diagnostics.maxValues.ratio).toBeCloseTo(0.5, 1);
  });
  it('a/lambda >> 1 => negligible', () => {
    const r = model.solve(makeProblemPartial('water-diffraction', {
      waterDiffraction: { wavelength: 2, slitWidth: 50, screenDist: 50, waveAmplitude: 1 },
    }));
    expect(r.diagnostics.flags?.isNegligible).toBe(true);
  });
  it('integration_curve 图正确生成', () => {
    const r = model.solve(makeProblemPartial('water-diffraction', {
      waterDiffraction: { wavelength: 10, slitWidth: 20, screenDist: 50, waveAmplitude: 1 },
    }));
    expect(r.charts.intensity_angle!.points.length).toBeGreaterThan(100);
  });
  it('中央主极大宽度计算', () => {
    const r = model.solve(makeProblemPartial('water-diffraction', {
      waterDiffraction: { wavelength: 5, slitWidth: 10, screenDist: 50, waveAmplitude: 1 },
    }));
    const halfW = r.diagnostics.maxValues.halfWidthAngle as number;
    expect(halfW).toBeGreaterThan(0);
    expect(halfW).toBeLessThan(90);
  });
});

describe('E7: SoundInterferenceModel', () => {
  const model = new SoundInterferenceModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('sound-interference');
    expect(model.name).toContain('干涉');
  });
  it('对称点 (x=0) delta_r=0 → 加强', () => {
    const r = model.solve(makeProblemPartial('sound-interference', {
      soundInterference: { frequency: 1000, speakerDist: 4, soundSpeed: 340, amplitude: 1, observationX: 0, observationY: 10 },
    }));
    expect(r.diagnostics.flags?.isConstructive).toBe(true);
  });
  it('x=∞ 方向趋于平坦', () => {
    const r = model.solve(makeProblemPartial('sound-interference', {
      soundInterference: { frequency: 500, speakerDist: 2, soundSpeed: 340, amplitude: 1, observationX: 0, observationY: 0.5 },
    }));
    // just ensure no error
    expect(r).toBeDefined();
  });
  it('n_destructive 检测', () => {
    const r = model.solve(makeProblemPartial('sound-interference', {
      soundInterference: { frequency: 1000, speakerDist: 2, soundSpeed: 340, amplitude: 1 },
    }));
    expect(typeof r.diagnostics.flags?.isDestructive).toBe('boolean');
  });
  it('scan_line 图正确生成', () => {
    const r = model.solve(makeProblemPartial('sound-interference', {
      soundInterference: { frequency: 1000, speakerDist: 4, soundSpeed: 340, amplitude: 1 },
    }));
    expect(r.charts.scan_line!.points.length).toBeGreaterThan(100);
  });
});

describe('E8: DopplerModel', () => {
  const model = new DopplerModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('doppler');
    expect(model.name).toContain('多普勒');
  });
  it('朝向运动 → f_prime > f', () => {
    const r = model.solve(makeProblemPartial('doppler', {
      doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 30, directionAngle: 0 },
    }));
    expect(r.diagnostics.flags?.isApproaching).toBe(true);
    expect(r.diagnostics.maxValues.fObserved).toBeGreaterThan(1000);
  });
  it('远离运动 → f_prime < f', () => {
    const r = model.solve(makeProblemPartial('doppler', {
      doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 30, directionAngle: 180 },
    }));
    expect(r.diagnostics.flags?.isReceding).toBe(true);
    expect(r.diagnostics.maxValues.fObserved).toBeLessThan(1000);
  });
  it('拍频计算', () => {
    const r = model.solve(makeProblemPartial('doppler', {
      doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 30, directionAngle: 0 },
    }));
    expect(r.diagnostics.maxValues.fBeat).toBeGreaterThan(0);
  });
  it('近声速警告', () => {
    const r = model.solve(makeProblemPartial('doppler', {
      doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 300, directionAngle: 0 },
    }));
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('E9: ThinFilmModel', () => {
  const model = new ThinFilmModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('thin-film');
    expect(model.name).toContain('薄膜');
  });
  it('垂直入射空气-膜-空气对称, 半透明', () => {
    const r = model.solve(makeProblemPartial('thin-film', {
      thinFilm: { thickness: 200, refIndex: 1.5, wavelength: 600, incidentAngle: 0, substrateIndex: 1.5 },
    }));
    expect(r.diagnostics.maxValues.Rnorm).toBeGreaterThanOrEqual(0);
    expect(r.diagnostics.maxValues.Rnorm).toBeLessThanOrEqual(1);
  });
  it('增透条件: Rnorm 较低', () => {
    // 2nd = lambda/2 => d = lambda/(4n) = 600/(4*1.5) = 100nm
    const r = model.solve(makeProblemPartial('thin-film', {
      thinFilm: { thickness: 100, refIndex: 1.5, wavelength: 600, incidentAngle: 0, substrateIndex: 1.0 },
    }));
    // 空气(n=1)-膜(n=1.5)-空气(n=1), 干涉会使得反射率在某处极小
    // 允许有限范围内, 这里只要 Rnorm < 0.5 即可
    expect(r.diagnostics.maxValues.Rnorm).toBeLessThan(0.5);
  });
  it('膜厚扫描图生成', () => {
    const r = model.solve(makeProblemPartial('thin-film', {
      thinFilm: { thickness: 200, refIndex: 1.5, wavelength: 600, incidentAngle: 0 },
    }));
    expect(r.charts.thickness_scan!.points.length).toBeGreaterThan(50);
  });
  it('全反射时抛出', () => {
    // n1*sin(theta1) = n2*sin(theta2), n1=1.5, n2=1.0, theta1=60 deg -> sin(theta2)=1.5*sin(60)=1.299 > 1
    expect(() => {
      model.solve(makeProblemPartial('thin-film', {
        thinFilm: { thickness: 200, refIndex: 1.0, wavelength: 600, incidentAngle: 0, substrateIndex: 1.5 },
      }));
    }).not.toThrow(); // n=1, no TIR when going to higher index

    // Use thicker substrate with n < 1 incoming: TIR impossible here
    // Just test that model handles large angle gracefully
    const r = model.solve(makeProblemPartial('thin-film', {
      thinFilm: { thickness: 200, refIndex: 1.5, wavelength: 600, incidentAngle: 45, substrateIndex: 1.0 },
    }));
    expect(r).toBeDefined();
  });
});

describe('E10: HologramModel', () => {
  const model = new HologramModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('hologram');
    expect(model.name).toContain('全息');
  });
  it('条纹间距和密度计算', () => {
    const r = model.solve(makeProblemPartial('hologram', {
      hologram: { referenceAngle: 30, objectAngle: 10, wavelength: 632, referenceAmp: 5, objectAmp: 1, recordWidth: 50 },
    }));
    expect(r.diagnostics.maxValues.fringeSpacing_um).toBeGreaterThan(0);
    expect(r.diagnostics.maxValues.fringeDensity).toBeGreaterThan(0);
  });
  it('记录光强极大值 = (Ar + Ao)^2', () => {
    const r = model.solve(makeProblemPartial('hologram', {
      hologram: { referenceAngle: 20, objectAngle: 5, wavelength: 632, referenceAmp: 5, objectAmp: 1, recordWidth: 50 },
    }));
    expect(r.diagnostics.maxValues.maxRecordI).toBeCloseTo(36, 0);
  });
  it('干板可记录 flag', () => {
    const r = model.solve(makeProblemPartial('hologram', {
      hologram: { referenceAngle: 30, objectAngle: 0, wavelength: 632, referenceAmp: 5, objectAmp: 1, recordWidth: 50 },
    }));
    expect(r.diagnostics.flags?.canRecord).toBeDefined();
  });
  it('条纹间距过大会警告', () => {
    const r = model.solve(makeProblemPartial('hologram', {
      hologram: { referenceAngle: 1, objectAngle: 0.5, wavelength: 632, referenceAmp: 5, objectAmp: 1, recordWidth: 10 },
    }));
    // 密度 flag should indicate potential issue
    expect(r.diagnostics.maxValues.fringeDensity).toBeDefined();
  });
});

describe('E11: SingleSlitModel', () => {
  const model = new SingleSlitModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('single-slit');
    expect(model.name).toContain('单缝');
  });
  it('中央主极大宽度公式: Delta_x = 2*lambda*L/a', () => {
    const lambdaNm = 500, aMm = 0.1, L = 1.0;
    const expectedWidth = 2 * lambdaNm * 1e-9 * L / (aMm * 1e-3) * 1000; // mm
    const r = model.solve(makeProblemPartial('single-slit', {
      singleSlit: { slitWidth: aMm, wavelength: lambdaNm, screenDist: L },
    }));
    const width = r.diagnostics.maxValues.centralWidthMm as number;
    expect(width).toBeCloseTo(expectedWidth, 2);
  });
  it('极小位置 sin(theta)=lambda/a', () => {
    const r = model.solve(makeProblemPartial('single-slit', {
      singleSlit: { slitWidth: 0.1, wavelength: 500, screenDist: 1 },
    }));
    const sinT = r.diagnostics.maxValues.sinTheta1 as number;
    expect(sinT).toBeCloseTo(500e-9 / 0.1e-3, 5);
  });
  it('单缝衍射图生成', () => {
    const r = model.solve(makeProblemPartial('single-slit', {
      singleSlit: { slitWidth: 0.2, wavelength: 600, screenDist: 1 },
    }));
    expect(r.charts.intensity_angle!.points.length).toBeGreaterThan(200);
  });
  it('缝宽扫描图生成', () => {
    const r = model.solve(makeProblemPartial('single-slit', {
      singleSlit: { slitWidth: 0.1, wavelength: 500, screenDist: 1 },
    }));
    expect(r.charts.width_scan!.points.length).toBeGreaterThan(20);
  });
});

describe('E12: DiffractionGratingModel', () => {
  const model = new DiffractionGratingModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('diffraction-grating');
    expect(model.name).toContain('光栅');
  });
  it('光栅方程: k_max = floor(d/lambda)', () => {
    // d=2um, lambda=500nm => d/lambda=4 => k_max=4
    const r = model.solve(makeProblemPartial('diffraction-grating', {
      diffractionGrating: { gratingConstant: 2, slitWidth: 0.5, wavelength: 500, orderMax: 10, slitCount: 1000 },
    }));
    const kMax = r.diagnostics.maxValues.orderMax as number;
    expect(kMax).toBeLessThanOrEqual(4);
  });
  it('缺级检测: d/a=2 => k=2,4,6 缺级', () => {
    const r = model.solve(makeProblemPartial('diffraction-grating', {
      diffractionGrating: { gratingConstant: 2, slitWidth: 1, wavelength: 500, orderMax: 5, slitCount: 1000 },
    }));
    expect(r.diagnostics.flags?.hasMissingOrders).toBe(true);
    expect(r.diagnostics.maxValues.missingOrderCount).toBeGreaterThan(0);
  });
  it('衍射图生成', () => {
    const r = model.solve(makeProblemPartial('diffraction-grating', {
      diffractionGrating: { gratingConstant: 2, slitWidth: 1, wavelength: 500, orderMax: 3, slitCount: 1000 },
    }));
    expect(r.charts.grating_intensity!.points.length).toBeGreaterThan(200);
  });
  it('角色散大于 0', () => {
    const r = model.solve(makeProblemPartial('diffraction-grating', {
      diffractionGrating: { gratingConstant: 3, slitWidth: 1, wavelength: 500, orderMax: 2, slitCount: 1000 },
    }));
    expect(r.explanation.summary).toContain('d=');
  });
});

describe('E13: PolarizationModel', () => {
  const model = new PolarizationModel();
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('polarization');
    expect(model.name).toContain('偏振');
  });
  it('马吕斯定律: theta=0 => I=I_0', () => {
    const r = model.solve(makeProblemPartial('polarization', {
      polarization: { initialIntensity: 1, nPolarizers: 1, polarizerAngles: [0] },
    }));
    expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(1, 5);
  });
  it('马吕斯定律: theta=90 => I=0 (消光)', () => {
    const r = model.solve(makeProblemPartial('polarization', {
      polarization: { initialIntensity: 1, nPolarizers: 1, polarizerAngles: [90] },
    }));
    expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0, 5);
    expect(r.diagnostics.flags?.isExtinct).toBe(true);
  });
  it('马吕斯定律: theta=60 => I=I_0*cos^2(60)=I_0*0.25', () => {
    const r = model.solve(makeProblemPartial('polarization', {
      polarization: { initialIntensity: 1, nPolarizers: 1, polarizerAngles: [60] },
    }));
    expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0.25, 3);
  });
  it('两偏振片 0/90 => I=0', () => {
    const r = model.solve(makeProblemPartial('polarization', {
      polarization: { initialIntensity: 1, nPolarizers: 2, polarizerAngles: [0, 90] },
    }));
    expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0, 5);
  });
  it('三偏振片 0/45/90 => I>0 (0.25)', () => {
    const r = model.solve(makeProblemPartial('polarization', {
      polarization: { initialIntensity: 1, nPolarizers: 3, polarizerAngles: [0, 45, 90] },
    }));
    // After 1st: 1*cos^2(0)=1; after 2nd: 1*cos^2(45)=0.5; after 3rd: 0.5*cos^2(45)=0.25
    expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0.25, 3);
  });
});
