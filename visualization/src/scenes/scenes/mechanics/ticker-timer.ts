import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const ticker_timerScene: SceneConfig = {
    id: 'ticker-timer',
    name: '打点计时器测瞬时速度',
    model: 'ticker-timer',
    parameters: [
        {
            name: 'frequency',
            label: '打点频率 f',
            unit: 'Hz',
            value: 50,
            min: 10,
            max: 100,
            step: 5,
            default: 50,
            description: '电磁打点计时器电源频率 (50Hz=每隔 0.02s 打一点)'
        },
        {
            name: 'acceleration',
            label: '加速度 a',
            unit: 'm/s²',
            value: 2,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 2,
            description: '小车匀变速直线运动的加速度'
        },
        {
            name: 'frictionCoeff',
            label: '摩擦系数 μ',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 0.01,
            default: 0,
            description: '纸带与限位孔间的摩擦系数'
        },
        {
            name: 'initialVelocity',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 0,
            min: -5,
            max: 5,
            step: 0.1,
            default: 0,
            description: '第一个计数点对应的初速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 2,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 2,
            description: '仿真的总时长 (影响打出纸带长度)'
        }
    ],
    buildProblem: params => {
        const frequency = params['frequency'] ?? 50;
        const acceleration = params['acceleration'] ?? 2;
        const frictionCoeff = params['frictionCoeff'] ?? 0;
        const initialVelocity = params['initialVelocity'] ?? 0;
        const duration = params['duration'] ?? 2;
        return {
            id: `ticker-${Date.now()}`,
            title: '打点计时器',
            model: 'ticker-timer',
            bodies: [
                {
                    id: 'ticker',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: initialVelocity, y: 0 }
                }
            ],
            constraints: {
                tickerTimer: { frequency, acceleration, frictionCoefficient: frictionCoeff, initialVelocity }
            },
            environment: { gravity: { enabled: false } },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};
