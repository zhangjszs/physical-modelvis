import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const magnetic_forceScene: SceneConfig = {
    id: 'magnetic-force',
    name: '安培力与洛伦兹力',
    model: 'magnetic-force',
    parameters: [
        {
            name: 'B',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.5,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.5,
            description: '匀强磁场磁感应强度'
        },
        {
            name: 'I',
            label: '电流 I (安培力)',
            unit: 'A',
            value: 2,
            min: 0,
            max: 30,
            step: 0.1,
            default: 2,
            description: '通电导线电流 (A)'
        },
        {
            name: 'L',
            label: '导线长度 L',
            unit: 'm',
            value: 0.3,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.3,
            description: '导线在磁场中的有效长度'
        },
        {
            name: 'theta',
            label: '导线与磁场夹角 θ',
            unit: '°',
            value: 90,
            min: 0,
            max: 180,
            step: 1,
            default: 90,
            description: '导线与磁场方向的夹角'
        },
        {
            name: 'q',
            label: '粒子电荷 q (洛伦兹力)',
            unit: '×10⁻¹⁹ C',
            value: 1.6,
            min: -10,
            max: 10,
            step: 0.1,
            default: 1.6,
            description: '运动粒子电荷 (元电荷 e = 1.6×10⁻¹⁹ C)'
        },
        {
            name: 'v',
            label: '粒子速度 v',
            unit: '×10⁶ m/s',
            value: 1,
            min: 0,
            max: 100,
            step: 0.1,
            default: 1,
            description: '粒子运动速度'
        },
        {
            name: 'phi',
            label: '速度与磁场夹角 φ',
            unit: '°',
            value: 90,
            min: 0,
            max: 180,
            step: 1,
            default: 90,
            description: '速度方向与磁场方向夹角'
        },
        {
            name: 'mass',
            label: '粒子质量 m',
            unit: '×10⁻³¹ kg',
            value: 9.1,
            min: 0.01,
            max: 100,
            step: 0.01,
            default: 9.1,
            description: '粒子质量 (电子 = 9.1×10⁻³¹ kg)'
        }
    ],
    buildProblem: params => {
        const B = params['B'] ?? 0.5;
        const current = params['I'] ?? 0;
        const wireLength = params['L'] ?? 0;
        const wireAngleDeg = params['theta'] ?? 90;
        const charge = (params['q'] ?? 0) * 1e-19;
        const velocity = (params['v'] ?? 0) * 1e6;
        const velocityAngleDeg = params['phi'] ?? 90;
        const particleMass = (params['mass'] ?? 0) * 1e-31;
        return {
            id: `magnetic-force-${Date.now()}`,
            title: '安培力与洛伦兹力',
            model: 'magnetic-force' as const,
            bodies: [
                {
                    id: 'particle',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                magneticForce: {
                    magneticField: B,
                    current: current > 0 ? current : undefined,
                    wireLength: wireLength > 0 ? wireLength : undefined,
                    wireAngleDeg,
                    charge: charge !== 0 ? charge : undefined,
                    velocity: velocity > 0 ? velocity : undefined,
                    velocityAngleDeg,
                    particleMass: particleMass > 0 ? particleMass : undefined
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(1, 200, 0.01)
        };
    }
};
