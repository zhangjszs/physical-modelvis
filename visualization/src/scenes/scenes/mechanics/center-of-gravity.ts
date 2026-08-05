import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const center_of_gravityScene: SceneConfig = {
    id: 'center-of-gravity',
    name: '悬挂法确定重心',
    model: 'center-of-gravity',
    parameters: [
        {
            name: 'shapeType',
            label: '薄板形状',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=L形 1=三角形 2=不规则四边形'
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
            description: '静态场景 (该参数无实际物理影响)'
        }
    ],
    buildProblem: params => {
        const shapeIdx = Math.round(params['shapeType'] ?? 0);
        const shapes: Array<
            Array<{
                x: number;
                y: number;
            }>
        > = [
            // L 形
            [
                { x: -1, y: -1 },
                { x: 1, y: -1 },
                { x: 1, y: 0 },
                { x: 0, y: 0 },
                { x: 0, y: 1 },
                { x: -1, y: 1 }
            ],
            // 三角形
            [
                { x: -1, y: -1 },
                { x: 1, y: -1 },
                { x: 0, y: 1 }
            ],
            // 不规则四边形
            [
                { x: -1.2, y: -0.5 },
                { x: 0.8, y: -1 },
                { x: 1.2, y: 0.8 },
                { x: -0.5, y: 1 }
            ]
        ];
        const vertices = shapes[shapeIdx] ?? shapes[0]!;
        const duration = params['duration'] ?? 1;
        return {
            id: `cog-${Date.now()}`,
            title: '悬挂法确定重心',
            model: 'center-of-gravity',
            bodies: [
                { id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { centerOfGravity: { vertices } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
