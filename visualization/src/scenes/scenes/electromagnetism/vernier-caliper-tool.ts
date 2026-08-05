import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const vernier_caliper_toolScene: SceneConfig = {
    id: 'vernier-caliper-tool',
    name: '游标卡尺读数',
    model: 'vernier-caliper' as const,
    parameters: [
        {
            name: 'objectSize',
            label: '被测物体长度',
            unit: 'mm',
            value: 23.4,
            min: 1,
            max: 150,
            step: 0.1,
            default: 23.4,
            description: '被测物体实际长度 (L = 主尺 + K×1/N)'
        },
        {
            name: 'nType',
            label: '分度 (0=10 1=20 2=50)',
            unit: '',
            value: 1,
            min: 0,
            max: 2,
            step: 1,
            default: 1,
            description: '10分度=0.1mm; 20分度=0.05mm; 50分度=0.02mm'
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
        const objectSize = params['objectSize'] ?? 23.4;
        const nTypeIdx = Math.round(params['nType'] ?? 1);
        const nTypes = [10, 20, 50] as const;
        const nType = nTypes[nTypeIdx] ?? 20;
        const duration = params['duration'] ?? 3;
        return {
            id: `vernier-caliper-tool-${Date.now()}`,
            title: '游标卡尺读数',
            model: 'vernier-caliper' as const,
            bodies: [],
            constraints: { vernierCaliper: { objectSize, nType } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 60)
        };
    }
};
