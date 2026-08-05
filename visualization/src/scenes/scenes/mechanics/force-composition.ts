import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const force_compositionScene: SceneConfig = {
    id: 'force-composition',
    name: '力的合成 (平行四边形定则)',
    model: 'force-composition',
    parameters: [
        {
            name: 'f1',
            label: '分力 F₁',
            unit: 'N',
            value: 3,
            min: 0,
            max: 20,
            step: 0.1,
            default: 3,
            description: '第一个分力的大小'
        },
        {
            name: 'f2',
            label: '分力 F₂',
            unit: 'N',
            value: 4,
            min: 0,
            max: 20,
            step: 0.1,
            default: 4,
            description: '第二个分力的大小'
        },
        {
            name: 'angleDeg',
            label: '夹角 θ',
            unit: '°',
            value: 90,
            min: 0,
            max: 180,
            step: 1,
            default: 90,
            description: 'F₁ 与 F₂ 之间的夹角'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.5,
            default: 1,
            description: 'F-θ 曲线扫描时长'
        }
    ],
    buildProblem: params => {
        const f1 = params['f1'] ?? 3;
        const f2 = params['f2'] ?? 4;
        const angleDeg = params['angleDeg'] ?? 90;
        const duration = params['duration'] ?? 1;
        return {
            id: `force-composition-${Date.now()}`,
            title: '力的合成与分解 (平行四边形定则)',
            model: 'force-composition',
            bodies: [
                {
                    id: 'point',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                forceComposition: { f1, f2, angleDeg, f1AngleDeg: 0 }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 360)
        };
    }
};
