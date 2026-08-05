import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const motion_compositionScene: SceneConfig = {
    id: 'motion-composition',
    name: '运动的合成与分解',
    model: 'motion-composition',
    parameters: [
        {
            name: 'vxConst',
            label: '水平速度 vx',
            unit: 'm/s',
            value: 2,
            min: 0,
            max: 10,
            step: 0.5,
            default: 2,
            description: '水平方向的匀速分运动速度'
        },
        {
            name: 'vyAccel',
            label: '竖直加速度 ay',
            unit: 'm/s²',
            value: 2,
            min: 0,
            max: 10,
            step: 0.5,
            default: 2,
            description: '竖直方向的匀加速分运动加速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const vxConst = params['vxConst'] ?? 2;
        const vyAccel = params['vyAccel'] ?? 2;
        const duration = params['duration'] ?? 3;
        return {
            id: `mc-${Date.now()}`,
            title: '运动的合成与分解',
            model: 'motion-composition',
            bodies: [
                {
                    id: 'ball',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: vxConst, y: 0 }
                }
            ],
            constraints: { motionComposition: { vxConst, vyAccel } },
            environment: { gravity: { enabled: true, value: vyAccel } },
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};
