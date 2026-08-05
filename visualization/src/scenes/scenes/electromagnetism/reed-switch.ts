import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const reed_switchScene: SceneConfig = {
    id: 'reed-switch',
    name: '干簧管 (磁控开关)',
    model: 'reed-switch' as const,
    parameters: [
        {
            name: 'magnetDistance',
            label: '磁铁到干簧管距离 d',
            unit: 'mm',
            value: 5,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 5,
            description: '磁体与干簧管间距 d'
        },
        {
            name: 'pullInThreshold',
            label: '吸合阈值 H_pull',
            unit: 'mT',
            value: 50,
            min: 5,
            max: 200,
            step: 1,
            default: 50,
            description: '吸合磁场阈值 (mT)'
        },
        {
            name: 'releaseThreshold',
            label: '释放阈值 H_rel',
            unit: 'mT',
            value: 30,
            min: 5,
            max: 200,
            step: 1,
            default: 30,
            description: '释放磁场阈值 (mT)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景显示'
        }
    ],
    buildProblem: params => {
        const magnetDistance = params['magnetDistance'] ?? 5;
        const pullInThreshold = params['pullInThreshold'] ?? 50;
        const releaseThreshold = params['releaseThreshold'] ?? 30;
        const duration = params['duration'] ?? 1;
        return {
            id: `reed-${Date.now()}`,
            title: '干簧管 (磁控开关)',
            model: 'reed-switch',
            bodies: [
                {
                    id: 'reed',
                    mass: { value: 0.001, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                reedSwitch: { mode: 'magnetic', magnetDistance, pullInThreshold, releaseThreshold }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
