import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const cosmic_rayScene: SceneConfig = {
    id: 'cosmic-ray',
    name: '宇宙射线',
    model: 'cosmic-ray' as const,
    parameters: [
        {
            name: 'altitude',
            label: '海拔高度',
            unit: 'm',
            value: 0,
            min: 0,
            max: 30000,
            step: 1000,
            default: 0,
            description: '观测点海拔'
        },
        {
            name: 'shieldingMode',
            label: '屏蔽材料 (0=空气 1=铅 2=水)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '屏蔽介质类型'
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
        const altitude = params['altitude'] ?? 0;
        const shieldingModeNum = params['shieldingMode'] ?? 0;
        const shieldingMode =
            shieldingModeNum === 1 ? ('lead' as const) : shieldingModeNum === 2 ? ('water' as const) : ('air' as const);
        const duration = params['duration'] ?? 5;
        return {
            id: `cosmic-ray-${Date.now()}`,
            title: '宇宙射线',
            model: 'cosmic-ray' as const,
            bodies: [
                { id: 'muon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { cosmicRay: { altitude, shieldingMode } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};
