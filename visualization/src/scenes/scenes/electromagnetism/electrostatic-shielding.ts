import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const electrostatic_shieldingScene: SceneConfig = {
    id: 'electrostatic-shielding',
    name: '静电屏蔽 (接地 vs 不接地)',
    model: 'electrostatic-shielding' as const,
    parameters: [
        {
            name: 'externalField',
            label: '外部电场 E',
            unit: 'V/m',
            value: 500,
            min: 0,
            max: 1000,
            step: 10,
            default: 500,
            description: '外部电场强度'
        },
        {
            name: 'cavityCharge',
            label: '空腔电荷',
            unit: 'μC',
            value: 0,
            min: 0,
            max: 10,
            step: 0.1,
            default: 0,
            description: '空腔内电荷 (μC)'
        },
        {
            name: 'isGrounded',
            label: '接地 (0=不接地 1=接地)',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 1,
            default: 1,
            description: '导体是否接地'
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
        const externalField = params['externalField'] ?? 500;
        const cavityCharge = params['cavityCharge'] ?? 0;
        const isGrounded = (params['isGrounded'] ?? 1) >= 1;
        const duration = params['duration'] ?? 5;
        return {
            id: `electrostatic-shielding-${Date.now()}`,
            title: '静电屏蔽',
            model: 'electrostatic-shielding' as const,
            bodies: [],
            constraints: { electrostaticShielding: { externalField, cavityCharge, isGrounded } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};
