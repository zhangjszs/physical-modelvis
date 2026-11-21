import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const newton_tubeScene: SceneConfig = {
    id: 'newton-tube',
    name: '牛顿管 (真空 vs 空气)',
    model: 'newton-tube',
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
        const height = params['height'] ?? 5;
        const duration = params['duration'] ?? 2;
        const withAir = Math.round(params['withAir'] ?? 1) === 1;
        return {
            id: `newton-tube-${Date.now()}`,
            title: '牛顿管',
            model: 'newton-tube' as const,
            // 双体契约: trajectories[0]=硬币, trajectories[1]=羽毛, 从管顶 (0, height) 同时释放
            bodies: [
                { id: 'coin', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: height }, velocity: { x: 0, y: 0 } },
                {
                    id: 'feather',
                    mass: { value: 0.01, unit: 'kg' },
                    position: { x: 0, y: height },
                    velocity: { x: 0, y: 0 }
                }
            ],
            environment: { gravity: { enabled: true, value: g } },
            constraints: { newtonTube: { height, withAir } },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};
