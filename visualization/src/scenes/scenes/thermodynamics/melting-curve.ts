import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const melting_curveScene: SceneConfig = {
    id: 'melting-curve',
    name: '熔化/凝固曲线 (T-t)',
    model: 'melting-curve',
    parameters: [
        {
            name: 'medium',
            label: '物质 (0=晶体 1=非晶体)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '晶体有平台 (T=T_m 熔化)；非晶体连续软化'
        },
        {
            name: 'meltingPoint',
            label: '熔点 T_m',
            unit: '°C',
            value: 0,
            min: -50,
            max: 2000,
            step: 5,
            default: 0,
            description: '冰=0°C, 海波=48°C, 铅=327°C, 铁=1538°C'
        },
        {
            name: 'heatingRate',
            label: '加热速率',
            unit: '°C/min',
            value: 5,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 5,
            description: '恒定加热速率'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 'min',
            value: 20,
            min: 5,
            max: 60,
            step: 1,
            default: 20,
            description: '温度-时间曲线总时长 (min)'
        }
    ],
    buildProblem: params => {
        const medium = (params['medium'] ?? 0) === 1 ? ('noncrystal' as const) : ('crystal' as const);
        const meltingPoint = params['meltingPoint'] ?? 0;
        const heatingRate = params['heatingRate'] ?? 5;
        const durationMin = params['duration'] ?? 20;
        return {
            id: `melt-${Date.now()}`,
            title: '熔化/凝固曲线 (T-t)',
            model: 'melting-curve',
            bodies: [
                { id: 'sample', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                meltingCurve: {
                    mode: medium,
                    meltingPoint,
                    heatingRate,
                    initialTemp: 0,
                    durationMin,
                    sampleCount: 200,
                    latentHeat: 334
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(durationMin * 60, 200)
        };
    }
};
