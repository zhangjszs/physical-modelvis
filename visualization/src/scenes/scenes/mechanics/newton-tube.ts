import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const newton_tubeScene: SceneConfig = {
    id: 'newton-tube',
    name: '牛顿管 (真空 vs 空气)',
    model: 'uniform-accelerated',
    parameters: [
        {
            name: 'withAir',
            label: '介质 (1空气 0真空)',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 1,
            default: 1,
            description: '1=有空气 (羽毛受阻力); 0=真空 (同时落地)'
        },
        {
            name: 'height',
            label: '管高',
            unit: 'm',
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
            default: 5,
            description: '下落高度 (物理距离)'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: 9.8,
            min: 1,
            max: 30,
            step: 0.1,
            default: 9.8,
            description: '重力加速度'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 2,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 2,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const g = params['g'] ?? 9.8;
        const duration = params['duration'] ?? 2;
        return {
            id: `newton-tube-${Date.now()}`,
            title: '牛顿管',
            model: 'uniform-accelerated' as const,
            bodies: [
                { id: 'object', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            environment: { gravity: { enabled: true, value: g } },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};
