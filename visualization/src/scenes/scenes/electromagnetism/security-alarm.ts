import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const security_alarmScene: SceneConfig = {
    id: 'security-alarm',
    name: '门窗防盗报警 (磁控)',
    model: 'security-alarm' as const,
    parameters: [
        {
            name: 'magnetDistance',
            label: '磁体到干簧管距离 d',
            unit: 'mm',
            value: 5,
            min: 0,
            max: 300,
            step: 1,
            default: 5,
            description: '磁体与干簧管的间距'
        },
        {
            name: 'operateDistance',
            label: '吸合距离 d_operate',
            unit: 'mm',
            value: 15,
            min: 1,
            max: 50,
            step: 1,
            default: 15,
            description: '吸合距离阈值'
        },
        {
            name: 'releaseDistance',
            label: '释放距离 d_release',
            unit: 'mm',
            value: 25,
            min: 5,
            max: 50,
            step: 1,
            default: 25,
            description: '释放距离阈值'
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
        const operateDistance = params['operateDistance'] ?? 15;
        const releaseDistance = params['releaseDistance'] ?? 25;
        const duration = params['duration'] ?? 1;
        const doorState: 'closed' | 'open' = magnetDistance <= operateDistance ? 'closed' : 'open';
        return {
            id: `sec-${Date.now()}`,
            title: '门窗防盗报警 (磁控)',
            model: 'security-alarm',
            bodies: [
                { id: 'door', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                securityAlarm: { doorState, magnetDistance, operateDistance, releaseDistance }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
