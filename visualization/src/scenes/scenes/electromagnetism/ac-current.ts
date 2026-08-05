import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const ac_currentScene: SceneConfig = {
    id: 'ac-current',
    name: '交变电流与变压器 (选必二§3)',
    model: 'ac-current',
    parameters: [
        {
            name: 'Em',
            label: '峰值电动势 Eₘ',
            unit: 'V',
            value: 311,
            min: 1,
            max: 100000,
            step: 1,
            default: 311,
            description: '交流电峰值 (220V有效值对应 311V 峰值)'
        },
        {
            name: 'freq',
            label: '频率 f',
            unit: 'Hz',
            value: 50,
            min: 1,
            max: 10000,
            step: 1,
            default: 50,
            description: '市电 50Hz'
        },
        {
            name: 'nRatio',
            label: '变压器匝数比 n₂/n₁ (0=无)',
            unit: '',
            value: 0.1,
            min: 0,
            max: 100,
            step: 0.01,
            default: 0.1,
            description: '次级/初级匝数比；>1=升压；<1=降压；0=无变压器'
        }
    ],
    buildProblem: params => {
        const ac: {
            peakEmf: number;
            angularFreq: number;
            turnsRatio?: number;
        } = {
            peakEmf: params['Em'] ?? 311,
            angularFreq: 2 * Math.PI * (params['freq'] ?? 50)
        };
        const nRatio = params['nRatio'] ?? 0;
        if (nRatio > 0) ac.turnsRatio = nRatio;
        return {
            id: `ac-${Date.now()}`,
            title: '交变电流与变压器',
            model: 'ac-current' as const,
            bodies: [
                { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { ac },
            environment: {},
            timeConfig: makeTimeSeries(0.04, 40, 0.001)
        };
    }
};
