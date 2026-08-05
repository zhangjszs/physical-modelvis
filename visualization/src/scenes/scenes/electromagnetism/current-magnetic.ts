import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const current_magneticScene: SceneConfig = {
    id: 'current-magnetic',
    name: '电流的磁场',
    model: 'current-magnetic-field',
    parameters: [
        {
            name: 'mode',
            label: '模式 (0直导线 1线圈 2螺线管)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=通电直导线; 1=圆形线圈; 2=螺线管'
        },
        {
            name: 'current',
            label: '电流 I',
            unit: 'A',
            value: 5,
            min: -20,
            max: 20,
            step: 1,
            default: 5,
            description: '电流大小; 负号表示方向翻转 (入纸面)'
        },
        {
            name: 'turns',
            label: '匝数 N',
            unit: '',
            value: 10,
            min: 1,
            max: 50,
            step: 1,
            default: 10,
            description: '线圈/螺线管匝数'
        },
        {
            name: 'radius',
            label: '线圈半径 (场景)',
            unit: '',
            value: 0.6,
            min: 0.2,
            max: 1.0,
            step: 0.05,
            default: 0.6,
            description: '线圈半径 (归一化场景单位)'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
            default: 5,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const modeNum = Math.round(params['mode'] ?? 0);
        const mode: 'straight-wire' | 'coil' | 'solenoid' =
            modeNum === 2 ? 'solenoid' : modeNum === 1 ? 'coil' : 'straight-wire';
        const current = params['current'] ?? 5;
        const turns = Math.round(params['turns'] ?? 10);
        const radius = params['radius'] ?? 0.6;
        const duration = params['duration'] ?? 5;
        return {
            id: `current-magnetic-${Date.now()}`,
            title: '电流的磁场',
            model: 'current-magnetic-field' as const,
            bodies: [],
            constraints: {
                currentMagneticField: { mode, current, turns, radius, steps: 600, maxLength: 6, lineCount: 16 }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};
