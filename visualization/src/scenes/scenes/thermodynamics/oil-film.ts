import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const oil_filmScene: SceneConfig = {
    id: 'oil-film',
    name: '油膜法测分子直径',
    model: 'oil-film',
    parameters: [
        {
            name: 'oilConcentration',
            label: '油酸浓度比 (1:x)',
            unit: '',
            value: 500,
            min: 100,
            max: 2000,
            step: 50,
            default: 500,
            description: '1 mL 油酸配成 x mL 溶液 (典型 1:500)'
        },
        {
            name: 'dropsPerMl',
            label: '每毫升滴数',
            unit: '滴/mL',
            value: 50,
            min: 10,
            max: 200,
            step: 5,
            default: 50,
            description: '滴管每毫升滴数 (标定)'
        },
        {
            name: 'filmArea',
            label: '油膜面积 S',
            unit: 'cm²',
            value: 200,
            min: 10,
            max: 1000,
            step: 10,
            default: 200,
            description: '油膜轮廓面积'
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
            description: '图形展示时长'
        }
    ],
    buildProblem: params => {
        const oilConcentration = params['oilConcentration'] ?? 500;
        const dropsPerMl = params['dropsPerMl'] ?? 50;
        const filmArea = params['filmArea'] ?? 200;
        const duration = params['duration'] ?? 3;
        return {
            id: `oil-film-${Date.now()}`,
            title: '油膜法测分子直径',
            model: 'oil-film',
            bodies: [
                { id: 'drop', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                oilFilm: { oilConcentration, dropsPerMl, filmArea, drops: 1 }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
