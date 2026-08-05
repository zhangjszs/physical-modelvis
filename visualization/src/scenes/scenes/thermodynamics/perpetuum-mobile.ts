import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const perpetuum_mobileScene: SceneConfig = {
    id: 'perpetuum-mobile',
    name: '永动机不可能 (热二律)',
    model: 'perpetuum-mobile',
    parameters: [
        {
            name: 'mode',
            label: '演示模式',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '0=卡诺循环 T-S 图 + 效率上限; 1=开尔文表述判定'
        },
        {
            name: 'hotTemp',
            label: '热源温度 T_hot',
            unit: 'K',
            value: 600,
            min: 200,
            max: 1500,
            step: 10,
            default: 600,
            description: '高温热源温度 (K)'
        },
        {
            name: 'coldTemp',
            label: '冷源温度 T_cold',
            unit: 'K',
            value: 300,
            min: 30,
            max: 800,
            step: 10,
            default: 300,
            description: '低温冷源温度 (K)'
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
            description: 'T-S 图 + η-ξ 曲线 + 判定结果展示时长'
        }
    ],
    buildProblem: params => {
        const modeNum = params['mode'] ?? 0;
        const mode = modeNum === 1 ? ('kelvin' as const) : ('carnot' as const);
        const hotTemp = params['hotTemp'] ?? 600;
        const coldTemp = params['coldTemp'] ?? 300;
        const duration = params['duration'] ?? 5;
        return {
            id: `perpetuum-${Date.now()}`,
            title: '永动机不可能 (热二律)',
            model: 'perpetuum-mobile' as const,
            bodies: [
                { id: 'engine', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                perpetuumMobile: {
                    hotTemp,
                    coldTemp,
                    mode
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
