import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const circuitScene: SceneConfig = {
    id: 'circuit',
    name: '直流电路分析 (串并联)',
    model: 'circuit',
    parameters: [
        {
            name: 'emf',
            label: '电动势 E',
            unit: 'V',
            value: 12,
            min: 1,
            max: 36,
            step: 0.5,
            default: 12,
            description: '电源电动势 (1.5V 干电池×8 = 12V; 铅蓄电池 12V)'
        },
        {
            name: 'r',
            label: '内阻 r',
            unit: 'Ω',
            value: 1,
            min: 0,
            max: 10,
            step: 0.1,
            default: 1,
            description: '电源内阻 (理想电源=0)'
        },
        {
            name: 'r1',
            label: '电阻 R₁',
            unit: 'Ω',
            value: 10,
            min: 0.1,
            max: 100,
            step: 0.5,
            default: 10,
            description: '电阻 1 (串联)'
        },
        {
            name: 'r2',
            label: '电阻 R₂',
            unit: 'Ω',
            value: 10,
            min: 0.1,
            max: 100,
            step: 0.5,
            default: 10,
            description: '电阻 2'
        },
        {
            name: 'r2conn',
            label: 'R₂ 连接方式 (1=串联 0=并联)',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 1,
            default: 1,
            description: '0=与 R₁ 并联, 1=与 R₁ 串联'
        },
        {
            name: 'r3',
            label: '电阻 R₃',
            unit: 'Ω',
            value: 20,
            min: 0,
            max: 100,
            step: 0.5,
            default: 20,
            description: '电阻 3 (0=不使用)'
        },
        {
            name: 'r3conn',
            label: 'R₃ 连接方式 (1=串联 0=并联)',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 1,
            default: 1,
            description: '0=与当前拓扑并联, 1=串联'
        }
    ],
    buildProblem: params => {
        const emf = params['emf'] ?? 12;
        const r = params['r'] ?? 0;
        const r1 = params['r1'] ?? 10;
        const r2 = params['r2'] ?? 10;
        const r2conn = (params['r2conn'] ?? 1) === 1 ? 'series' : 'parallel';
        const r3 = params['r3'] ?? 0;
        const r3conn = (params['r3conn'] ?? 1) === 1 ? 'series' : 'parallel';
        const resistors: Array<{
            resistance: number;
            connection: 'series' | 'parallel';
        }> = [
            { resistance: r1, connection: 'series' },
            { resistance: r2, connection: r2conn }
        ];
        if (r3 > 0) {
            resistors.push({ resistance: r3, connection: r3conn });
        }
        return {
            id: `circuit-${Date.now()}`,
            title: '直流电路分析 (串并联)',
            model: 'circuit' as const,
            bodies: [
                { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { circuit: { emf, internalResistance: r, resistors } },
            environment: {},
            timeConfig: makeTimeSeries(1, 10, 0.1)
        };
    }
};
