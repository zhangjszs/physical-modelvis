import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const forced_vibration_freqScene: SceneConfig = {
    id: 'forced-vibration-freq',
    name: '受迫振动 (频率响应)',
    model: 'forced-vibration' as const,
    parameters: [
        {
            name: 'mass',
            label: '振子质量 m',
            unit: 'kg',
            value: 1,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 1,
            description: '振子质量 (kg)'
        },
        {
            name: 'k',
            label: '弹簧劲度系数 k',
            unit: 'N/m',
            value: 100,
            min: 0.1,
            max: 1000,
            step: 1,
            default: 100,
            description: '弹簧劲度系数 (越大固有频率越高)'
        },
        {
            name: 'beta',
            label: '阻尼系数 β',
            unit: '1/s',
            value: 0.3,
            min: 0,
            max: 5,
            step: 0.05,
            default: 0.3,
            description: '粘滞阻尼系数 = c/(2m) (越大振幅衰减越快)'
        },
        {
            name: 'forceAmp',
            label: '驱动力幅值 F₀',
            unit: 'N',
            value: 1,
            min: 0.01,
            max: 100,
            step: 0.1,
            default: 1,
            description: '周期驱动力的幅值'
        },
        {
            name: 'driveFreq',
            label: '驱动频率 f_d',
            unit: 'Hz',
            value: 2,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 2,
            description: '驱动力的频率 (靠近固有频率时共振)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 20,
            min: 1,
            max: 60,
            step: 1,
            default: 20,
            description: '仿真总时长 (需足够长以观察稳态)'
        }
    ],
    buildProblem: params => {
        const mass = params['mass'] ?? 1;
        const springConstant = params['k'] ?? 100;
        const dampingBeta = params['beta'] ?? 0.3;
        const forceAmplitude = params['forceAmp'] ?? 1;
        const drivingFreq = params['driveFreq'] ?? 2;
        const duration = params['duration'] ?? 20;
        return {
            id: `fv-${Date.now()}`,
            title: '受迫振动 (频率响应)',
            model: 'forced-vibration',
            bodies: [
                {
                    id: 'oscillator',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                forcedVibration: { mass, springConstant, dampingBeta, forceAmplitude, drivingFreq }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 2000)
        };
    }
};
