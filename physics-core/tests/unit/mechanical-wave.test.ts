import { describe, it, expect } from 'vitest';
import { MechanicalWaveModel } from '../../src/models/mechanical-wave.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MechanicalWaveModel();

function makeProblem(
    overrides: {
        mode?: 'transverse' | 'longitudinal' | 'interference';
        amplitude?: number;
        frequency?: number;
        wavelength?: number;
        duration?: number;
        amplitude2?: number;
        direction2?: number;
        phaseDiff?: number;
    } = {}
): PhysicsProblem {
    const {
        mode = 'transverse',
        amplitude = 0.1,
        frequency = 2,
        wavelength = 0.5,
        duration = 3,
        amplitude2,
        direction2,
        phaseDiff
    } = overrides;
    return {
        id: 'wave-test',
        model: 'mechanical-wave',
        bodies: [
            { id: 'medium', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
        ],
        constraints: {
            wave: {
                mode,
                amplitude,
                frequency,
                wavelength,
                ...(amplitude2 !== undefined ? { amplitude2 } : {}),
                ...(direction2 !== undefined ? { direction2 } : {}),
                ...(phaseDiff !== undefined ? { phaseDiff } : {})
            }
        },
        environment: {},
        timeConfig: { duration, sampleCount: 300 }
    };
}

describe('MechanicalWaveModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('mechanical-wave');
        expect(model.name).toBe('机械波');
    });

    it('横波: 波速 = f·λ', () => {
        const r = model.solve(makeProblem({ frequency: 2, wavelength: 0.5 }));
        const v = r.diagnostics.maxValues.waveSpeed;
        expect(v).toBeCloseTo(1.0, 5); // 2 * 0.5 = 1 m/s
    });

    it('纵波: 波速 = f·λ', () => {
        const r = model.solve(makeProblem({ mode: 'longitudinal', frequency: 5, wavelength: 0.3 }));
        const v = r.diagnostics.maxValues.waveSpeed;
        expect(v).toBeCloseTo(1.5, 5); // 5 * 0.3 = 1.5 m/s
    });

    it('波形快照轨迹长度 = N = 81 质点', () => {
        const r = model.solve(makeProblem({}));
        // 最后一个轨迹是波形快照 (N = 81 质点)
        const snapshot = r.trajectories[r.trajectories.length - 1]!;
        expect(snapshot.length).toBe(81);
    });

    it('质点不随波迁移 (质点轨迹 x 保持不变为平衡位置)', () => {
        const r = model.solve(makeProblem({}));
        // 被追踪质点 0 (索引 0 平衡位置在 xStart = -1)
        const traj = r.trajectories[0]!;
        const xInit = traj[0]!.position.x;
        // 横波: 质点 x 不变 (仅 y 振)
        const allSameX = traj.every(p => Math.abs(p.position.x - xInit) < 1e-9);
        expect(allSameX).toBe(true);
    });

    it('横波质点 y 为简谐振动 (对称正负)', () => {
        const r = model.solve(makeProblem({ mode: 'transverse' }));
        // 中间质点轨迹 (trajs 是 tracked[4] = 中间)
        const midTraj = r.trajectories[4]!;
        const ys = midTraj.map(p => p.position.y);
        const max = Math.max(...ys);
        const min = Math.min(...ys);
        expect(max).toBeGreaterThan(0.05);
        expect(min).toBeLessThan(-0.05);
        expect(Math.abs(max + min)).toBeLessThan(0.02); // 对称
    });

    it('纵波质点 x 振动', () => {
        const r = model.solve(makeProblem({ mode: 'longitudinal' }));
        const midTraj = r.trajectories[4]!;
        const xs = midTraj.map(p => p.position.x);
        const max = Math.max(...xs);
        const min = Math.min(...xs);
        expect(max - min).toBeGreaterThan(0.1); // 振动明显
    });

    it('生成 wave-t 快照图表', () => {
        const r = model.solve(makeProblem({}));
        expect(r.charts.wave_t).toBeDefined();
        expect(r.charts.wave_t!.points.length).toBe(81);
    });

    it('生成 y-t 振动图与 v-t 波速图', () => {
        const r = model.solve(makeProblem({}));
        expect(r.charts.y_t).toBeDefined();
        expect(r.charts.v_t).toBeDefined();
        // 波速为常数
        const vs = r.charts.v_t!.points.map(p => p.y);
        const allSame = vs.every(v => Math.abs(v - vs[0]!) < 1e-9);
        expect(allSame).toBe(true);
    });

    it('干涉: 对向波形成驻波 — 波节质点振幅≈0, 波腹质点振幅≈2A', () => {
        const r = model.solve(
            makeProblem({
                mode: 'interference',
                frequency: 2,
                wavelength: 0.4,
                amplitude2: 0.1,
                phaseDiff: 0,
                direction2: -1
            })
        );
        // 驻波: y = 2A·sin(ωt)·cos(kx), 波节在 x=(2n+1)λ/4, λ=0.4 → x=0.1, 0.3, 0.5, ...
        // tracked 质点 x: -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3
        //   x=0.5 (trajs[3]) 是波节: 时间域振幅≈0
        const nodeTraj = r.trajectories[3]!;
        const nodeAmp = Math.max(...nodeTraj.map(p => Math.abs(p.position.y)));
        expect(nodeAmp).toBeLessThan(0.02);
        //   x=0 (trajs[2]) 是波腹: 振幅可达 2A=0.2
        const antinodeTraj = r.trajectories[2]!;
        const antinodeAmp = Math.max(...antinodeTraj.map(p => Math.abs(p.position.y)));
        expect(antinodeAmp).toBeGreaterThan(0.15);
    });

    it('summary 包含波速/频率/波长', () => {
        const r = model.solve(makeProblem({ frequency: 3, wavelength: 0.4 }));
        expect(r.explanation.summary).toContain('v=');
        expect(r.explanation.summary).toContain('f=');
        expect(r.explanation.summary).toContain('λ=');
    });
});
