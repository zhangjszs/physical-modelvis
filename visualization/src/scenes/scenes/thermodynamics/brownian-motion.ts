import type { SceneConfig } from '../../../types/visualization';

export const brownian_motionScene: SceneConfig = {
    id: 'brownian-motion',
    name: '布朗运动 (微粒抖动)',
    model: 'brownian-motion',
    parameters: [
        {
            name: 'particleRadius',
            label: '微粒半径 r',
            unit: 'μm',
            value: 1.0,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1.0,
            description: '球形微粒半径 (典型花粉 1-10 μm)'
        },
        {
            name: 'liquidTemp',
            label: '液体温度 T',
            unit: 'K',
            value: 300,
            min: 270,
            max: 340,
            step: 5,
            default: 300,
            description: '液体温度 (K, 影响 Stokes-Einstein D)'
        },
        {
            name: 'fluidViscosity',
            label: '液体粘度 η',
            unit: 'cP',
            value: 1.0,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 1.0,
            description: '粘度 (cP, 水≈1.0, 蓖麻≈100)'
        },
        {
            name: 'nParticles',
            label: '粒子数',
            unit: '',
            value: 10,
            min: 1,
            max: 50,
            step: 1,
            default: 10,
            description: '同时随机游走的粒子条数'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const particleRadius = (params['particleRadius'] ?? 1.0) * 1e-6;
        const liquidTemp = params['liquidTemp'] ?? 300;
        const fluidViscosity = (params['fluidViscosity'] ?? 1.0) * 1e-3;
        const nParticles = params['nParticles'] ?? 10;
        const duration = params['duration'] ?? 5;
        const dt = 0.01;
        return {
            id: `brownian-${Date.now()}`,
            title: '布朗运动 (微粒抖动)',
            model: 'brownian-motion',
            bodies: [{ id: 'p0', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
            constraints: {
                brownianMotion: {
                    particleRadius,
                    liquidTemp,
                    fluidViscosity,
                    duration,
                    dt,
                    nParticles
                }
            },
            environment: {},
            timeConfig: { duration, dt, sampleCount: Math.min(500, Math.floor(duration / dt)) }
        };
    }
};
