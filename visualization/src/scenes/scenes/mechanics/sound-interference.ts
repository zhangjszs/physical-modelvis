import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const sound_interferenceScene: SceneConfig = {
    id: 'sound-interference',
    name: '声波干涉 (双喇叭)',
    model: 'sound-interference' as const,
    parameters: [
        {
            name: 'frequency',
            label: '声波频率 f',
            unit: 'Hz',
            value: 500,
            min: 50,
            max: 5000,
            step: 10,
            default: 500,
            description: '相干声波频率'
        },
        {
            name: 'speakerDist',
            label: '两扬声器距离 d',
            unit: 'm',
            value: 3,
            min: 0.5,
            max: 20,
            step: 0.1,
            default: 3,
            description: '扬声器 S₁ 与 S₂ 的距离'
        },
        {
            name: 'soundSpeed',
            label: '声速 v',
            unit: 'm/s',
            value: 340,
            min: 300,
            max: 400,
            step: 1,
            default: 340,
            description: '空气中声速 (λ=v/f)'
        },
        {
            name: 'obsX',
            label: '观察点 x',
            unit: 'm',
            value: 3,
            min: -30,
            max: 30,
            step: 0.5,
            default: 3,
            description: '观察点水平坐标 (沿两源连线方向)'
        },
        {
            name: 'obsY',
            label: '观察点 y',
            unit: 'm',
            value: 10,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 10,
            description: '观察点到连线中点的垂直距离'
        },
        {
            name: 'amplitude',
            label: '单源振幅 A₀',
            unit: '',
            value: 0.5,
            min: 0.1,
            max: 1,
            step: 0.05,
            default: 0.5,
            description: '单个声源的振幅相对值'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景 (仅显示声强空间分布)'
        }
    ],
    buildProblem: params => {
        const frequency = params['frequency'] ?? 500;
        const speakerDist = params['speakerDist'] ?? 3;
        const soundSpeed = params['soundSpeed'] ?? 340;
        const obsX = params['obsX'] ?? 3;
        const obsY = params['obsY'] ?? 10;
        const amplitude = params['amplitude'] ?? 0.5;
        const duration = params['duration'] ?? 1;
        return {
            id: `si-${Date.now()}`,
            title: '声波干涉 (双喇叭)',
            model: 'sound-interference',
            bodies: [
                {
                    id: 'S1',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: -speakerDist / 2, y: 0 },
                    velocity: { x: 0, y: 0 }
                },
                {
                    id: 'S2',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: speakerDist / 2, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                soundInterference: {
                    frequency,
                    speakerDist,
                    soundSpeed,
                    observationX: obsX,
                    observationY: obsY,
                    amplitude
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
