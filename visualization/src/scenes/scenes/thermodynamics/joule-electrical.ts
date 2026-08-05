import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const joule_electricalScene: SceneConfig = {
    id: 'joule-electrical',
    name: '探究做功与内能关系 (电功)',
    model: 'joule-electrical',
    parameters: [
        {
            name: 'voltage',
            label: '电源电压 U',
            unit: 'V',
            value: 12,
            min: 0.1,
            max: 30,
            step: 0.1,
            default: 12,
            description: '电加热器两端电压 (V)'
        },
        {
            name: 'resistance',
            label: '电阻 R',
            unit: 'Ω',
            value: 10,
            min: 1,
            max: 100,
            step: 0.5,
            default: 10,
            description: '加热器电阻 (Ω)'
        },
        {
            name: 'time',
            label: '通电时间 t',
            unit: 's',
            value: 300,
            min: 1,
            max: 1200,
            step: 1,
            default: 300,
            description: '通电时长 (s)'
        },
        {
            name: 'waterMass',
            label: '水当量 M',
            unit: 'kg',
            value: 0.5,
            min: 0.05,
            max: 3,
            step: 0.05,
            default: 0.5,
            description: '量热器内水质量 (kg)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: '电功-热量曲线展示时长'
        }
    ],
    buildProblem: params => {
        const voltage = params['voltage'] ?? 12;
        const resistance = params['resistance'] ?? 10;
        const time = params['time'] ?? 300;
        const waterMass = params['waterMass'] ?? 0.5;
        const duration = params['duration'] ?? 5;
        return {
            id: `joule-elec-${Date.now()}`,
            title: '探究做功与内能关系 (电功)',
            model: 'joule-electrical' as const,
            bodies: [
                { id: 'heater', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                jouleElectrical: {
                    voltage,
                    resistance,
                    time,
                    waterMass
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
