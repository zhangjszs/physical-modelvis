import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const multimeter_toolScene: SceneConfig = {
    id: 'multimeter-tool',
    name: '多用电表 (选档读数)',
    model: 'multimeter' as const,
    parameters: [
        {
            name: 'mode',
            label: '档位 (0=DCV 1=ACV 2=Ohm 3=DCA)',
            unit: '',
            value: 0,
            min: 0,
            max: 3,
            step: 1,
            default: 0,
            description: '0=直流电压; 1=交流电压; 2=欧姆档; 3=直流电流'
        },
        {
            name: 'range',
            label: '量程',
            unit: '',
            value: 10,
            min: 0.001,
            max: 1e6,
            step: 0.001,
            default: 10,
            description: '量程设置值 (V/Ω/A 取决于档位)'
        },
        {
            name: 'testValue',
            label: '被测量值',
            unit: '',
            value: 4.5,
            min: 0,
            max: 1e6,
            step: 0.1,
            default: 4.5,
            description: '被测量的真实值 (与量程同单位)'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const modeIdx = Math.round(params['mode'] ?? 0);
        const modes = ['DCV', 'ACV', 'Ohm', 'DCA'] as const;
        const mode = modes[modeIdx] ?? 'DCV';
        const range = params['range'] ?? 10;
        const testValue = params['testValue'] ?? 4.5;
        const duration = params['duration'] ?? 3;
        return {
            id: `multimeter-tool-${Date.now()}`,
            title: '多用电表 (选档读数)',
            model: 'multimeter' as const,
            bodies: [],
            constraints: { multimeter: { mode, range, testValue } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 60)
        };
    }
};
