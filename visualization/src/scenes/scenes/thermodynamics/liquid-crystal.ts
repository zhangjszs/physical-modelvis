import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const liquid_crystalScene: SceneConfig = {
    id: 'liquid-crystal',
    name: '液晶 (光学各向异性)',
    model: 'liquid-crystal',
    parameters: [
        {
            name: 'medium',
            label: '液晶模式 (0=向列型 1=胆甾型)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '向列型 (普通 LCD)；胆甾型 (彩色反射式)'
        },
        {
            name: 'startTemp',
            label: '起始温度',
            unit: '°C',
            value: 20,
            min: -5,
            max: 30,
            step: 1,
            default: 20,
            description: '扫描起始温度'
        },
        {
            name: 'endTemp',
            label: '终止温度',
            unit: '°C',
            value: 40,
            min: 10,
            max: 80,
            step: 1,
            default: 40,
            description: '扫描终止温度 (超过清亮点 Tc≈35°C 变为各向同性)'
        },
        {
            name: 'voltage',
            label: '驱动电压',
            unit: 'V',
            value: 3,
            min: 0,
            max: 10,
            step: 0.5,
            default: 3,
            description: '施加在液晶盒上的驱动电压'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: 'T-V 透射率曲线展示时长'
        }
    ],
    buildProblem: params => {
        const medium = (params['medium'] ?? 0) === 1 ? ('cholesteric' as const) : ('nematic' as const);
        const startTemp = params['startTemp'] ?? 20;
        const endTemp = params['endTemp'] ?? 40;
        const voltage = params['voltage'] ?? 3;
        const duration = params['duration'] ?? 3;
        const midTemp = (startTemp + endTemp) / 2;
        return {
            id: `liquid-crystal-${Date.now()}`,
            title: '液晶 (光学各向异性)',
            model: 'liquid-crystal',
            bodies: [
                { id: 'cell', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                liquidCrystal: {
                    temperature: midTemp,
                    voltage,
                    mode: medium,
                    clearingPoint: 35,
                    thresholdVoltage: 2,
                    pitchUm: medium === 'cholesteric' ? 0.4 : undefined
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};
