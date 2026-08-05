import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const heat_transferScene: SceneConfig = {
    id: 'heat-transfer',
    name: '热传递 (三种模式对比)',
    model: 'heat-transfer',
    parameters: [
        {
            name: 'mode',
            label: '主导传热模式',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=热传导; 1=热对流; 2=热辐射'
        },
        {
            name: 'medium',
            label: '材料',
            unit: '',
            value: 0,
            min: 0,
            max: 3,
            step: 1,
            default: 0,
            description: '0=铜 (k=401); 1=玻璃 (k=1.0); 2=钢; 3=聚苯乙烯'
        },
        {
            name: 'ambientTemp',
            label: '环境温度 T_env',
            unit: 'K',
            value: 350,
            min: 250,
            max: 1000,
            step: 5,
            default: 350,
            description: '高温热源/环境 (K)'
        },
        {
            name: 'initialTemp',
            label: '物体初温 T₀',
            unit: 'K',
            value: 300,
            min: 200,
            max: 600,
            step: 5,
            default: 300,
            description: '被加热/冷却物体初温 (K)'
        },
        {
            name: 'time',
            label: '模拟时间',
            unit: 's',
            value: 60,
            min: 5,
            max: 600,
            step: 5,
            default: 60,
            description: '传热持续时长 (s)（观察温度上升曲线）'
        },
        {
            name: 'duration',
            label: '展示时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: 'T-t / Qdot-t 曲线对比展示时长'
        }
    ],
    buildProblem: params => {
        const modeNum = params['mode'] ?? 0;
        const mode =
            modeNum === 1 ? ('convection' as const) : modeNum === 2 ? ('radiation' as const) : ('conduction' as const);
        const mediumNum = params['medium'] ?? 0;
        const materialType =
            mediumNum === 1
                ? ('glass' as const)
                : mediumNum === 2
                  ? ('steel' as const)
                  : mediumNum === 3
                    ? ('polystyrene' as const)
                    : ('copper' as const);
        const ambientTemp = params['ambientTemp'] ?? 350;
        const initialTemp = params['initialTemp'] ?? 300;
        const time = params['time'] ?? 60;
        const duration = params['duration'] ?? 5;
        return {
            id: `heat-transfer-${Date.now()}`,
            title: '热传递 (三种模式对比)',
            model: 'heat-transfer' as const,
            bodies: [
                { id: 'sample', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                heatTransfer: {
                    mode,
                    materialType,
                    ambientTemp,
                    initialTemp,
                    time
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
