import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const moon_earth_testScene: SceneConfig = {
    id: 'moon-earth-test',
    name: '月地检验 (牛顿)',
    model: 'moon-earth-test',
    parameters: [
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态演示场景'
        }
    ],
    buildProblem: params => {
        const duration = params['duration'] ?? 1;
        return {
            id: `met-${Date.now()}`,
            title: '月地检验',
            model: 'moon-earth-test',
            bodies: [
                { id: 'moon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                moonEarthTest: {
                    earthRadius: 6.371e6,
                    moonDistance: 3.844e8,
                    moonPeriod: 27.3 * 86400
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};
