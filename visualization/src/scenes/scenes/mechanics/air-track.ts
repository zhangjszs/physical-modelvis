import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const air_trackScene: SceneConfig = {
    id: 'air-track',
    name: '气垫导轨测速度',
    model: 'uniform-linear',
    parameters: [
        {
            name: 'mass',
            label: '滑块质量 m',
            unit: 'kg',
            value: 0.2,
            min: 0.05,
            max: 2,
            step: 0.01,
            default: 0.2,
            description: '滑块质量（仅展示，匀速运动不影响结果）'
        },
        {
            name: 'v0',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 0.5,
            min: 0.05,
            max: 5,
            step: 0.05,
            default: 0.5,
            description: '滑块在导轨上滑行的速度'
        },
        {
            name: 'flagWidth',
            label: '挡光片宽度 Δx',
            unit: 'm',
            value: 0.02,
            min: 0.005,
            max: 0.1,
            step: 0.005,
            default: 0.02,
            description: '挡光片宽度（推荐 0.01/0.02/0.05/0.10 m）'
        },
        {
            name: 'x1',
            label: '光电门1位置 x₁',
            unit: 'm',
            value: 0.3,
            min: 0,
            max: 1.5,
            step: 0.01,
            default: 0.3,
            description: '第一个光电门距导轨起点的距离'
        },
        {
            name: 'x2',
            label: '光电门2位置 x₂',
            unit: 'm',
            value: 0.8,
            min: 0,
            max: 1.5,
            step: 0.01,
            default: 0.8,
            description: '第二个光电门距导轨起点的距离'
        },
        {
            name: 'trackLength',
            label: '导轨长度',
            unit: 'm',
            value: 1.5,
            min: 0.5,
            max: 3,
            step: 0.1,
            default: 1.5,
            description: '气垫导轨总长度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 2,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 2,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const v0 = params['v0'] ?? 0.5;
        const duration = params['duration'] ?? 2;
        const mass = params['mass'] ?? 0.2;
        return {
            id: `air-track-${Date.now()}`,
            title: '气垫导轨测速度',
            model: 'uniform-linear',
            bodies: [
                {
                    id: 'glider',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0, y: 0 }
                }
            ],
            environment: {},
            timeConfig: makeTimeSeries(duration, 400)
        };
    }
};
