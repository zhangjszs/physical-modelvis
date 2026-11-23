import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const light_control_switchScene: SceneConfig = {
    id: 'light-control-switch',
    name: '光控开关 (光敏+继电器)',
    model: 'light-control-switch' as const,
    parameters: [
        {
            name: 'lightIntensity',
            label: '当前光照度 L',
            unit: 'lx',
            value: 0.5,
            min: 0,
            max: 1e5,
            step: 0.5,
            default: 0.5,
            description: '当前环境光照强度 (完全黑暗 0 lx, 夜晚~0.5 lx, 白天~50000 lx)'
        },
        {
            name: 'Rfix',
            label: '分压电阻 R_fix',
            unit: 'Ω',
            value: 10000,
            min: 1000,
            max: 1e6,
            step: 1000,
            default: 10000,
            description: '分压电路中固定电阻值 (调节可改变等效临界照度 L_crit)'
        },
        {
            name: 'Esupply',
            label: '电源电压 E',
            unit: 'V',
            value: 12,
            min: 5,
            max: 24,
            step: 1,
            default: 12,
            description: '分压电路供电电压 E (调节可改变等效临界照度 L_crit)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 'h',
            value: 24,
            min: 1,
            max: 48,
            step: 1,
            default: 24,
            description: '仿真总时长 (模拟 24h 光照变化)'
        }
    ],
    buildProblem: params => {
        const lightIntensity = params['lightIntensity'] ?? 0.5;
        const Rfix = params['Rfix'] ?? 10000;
        const Esupply = params['Esupply'] ?? 12;
        const durationH = params['duration'] ?? 24;
        return {
            id: `lcs-${Date.now()}`,
            title: '光控开关 (光敏+继电器)',
            model: 'light-control-switch',
            bodies: [
                { id: 'lamp', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                lightControlSwitch: {
                    lightIntensity,
                    Rfix,
                    Esupply,
                    VbeOn: 0.7,
                    Rdark: 1e6,
                    Rbright: 5000,
                    timeSpanH: durationH,
                    sampleCount: 240
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(durationH * 3600, 240)
        };
    }
};
