import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const parallel_plate_capacitorScene: SceneConfig = {
    id: 'parallel-plate-capacitor',
    name: '平行板电容器因素 (C=εr·S/4πkd)',
    model: 'parallel-plate-capacitor' as const,
    parameters: [
        {
            name: 'area',
            label: '极板面积 S',
            unit: 'm²',
            value: 0.01,
            min: 1e-4,
            max: 1,
            step: 1e-4,
            default: 0.01,
            description: '极板面积'
        },
        {
            name: 'distance',
            label: '极板距离 d',
            unit: 'mm',
            value: 1,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 1,
            description: '极板间距 (mm)'
        },
        {
            name: 'epsilonR',
            label: '相对介电常数 εr',
            unit: '',
            value: 3,
            min: 1,
            max: 100,
            step: 1,
            default: 3,
            description: '介质相对介电常数 (空气≈1)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 2,
            max: 10,
            step: 0.5,
            default: 5,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const area = params['area'] ?? 0.01;
        const distanceMm = params['distance'] ?? 1;
        const distance = distanceMm / 1000;
        const epsilonR = params['epsilonR'] ?? 3;
        const duration = params['duration'] ?? 5;
        return {
            id: `parallel-plate-capacitor-${Date.now()}`,
            title: '平行板电容器因素',
            model: 'parallel-plate-capacitor' as const,
            bodies: [],
            constraints: { parallelPlate: { area, distance, epsilonR } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};
