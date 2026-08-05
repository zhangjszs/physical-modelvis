import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const curve_velocity_directionScene: SceneConfig = {
    id: 'curve-velocity-direction',
    name: '曲线运动速度方向',
    model: 'curve-velocity-direction',
    parameters: [
        {
            name: 'trackShape',
            label: '轨道形状',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=圆形 1=抛物线 2=螺旋'
        },
        {
            name: 'angularSpeed',
            label: '角速度 ω',
            unit: 'rad/s',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '物体沿曲线运动的角速度'
        },
        {
            name: 'releaseIndex',
            label: '脱离点序号',
            unit: '',
            value: 1,
            min: 0,
            max: 3,
            step: 1,
            default: 1,
            description: '演示切线速度方向的脱离点位置'
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
            description: '演示动画时长'
        }
    ],
    buildProblem: params => {
        const shapeIdx = Math.round(params['trackShape'] ?? 0);
        const angularSpeed = params['angularSpeed'] ?? 1;
        const releaseIndex = params['releaseIndex'] ?? 1;
        const duration = params['duration'] ?? 1;
        const shapes = ['circle', 'parabola', 'spiral'] as const;
        return {
            id: `cvd-${Date.now()}`,
            title: '曲线运动速度方向',
            model: 'curve-velocity-direction',
            bodies: [
                {
                    id: 'ball',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 1, y: 0 },
                    velocity: { x: 0, y: angularSpeed }
                }
            ],
            constraints: {
                curveVelocity: { trackShape: shapes[shapeIdx] ?? 'circle', angularSpeed, releaseIndex }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
