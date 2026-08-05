import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const faraday_cupScene: SceneConfig = {
    id: 'faraday-cup',
    name: '法拉第圆筒 (内表面电荷=0)',
    model: 'faraday-cup' as const,
    parameters: [
        {
            name: 'totalCharge',
            label: '圆筒总电荷 Q',
            unit: 'μC',
            value: 5,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 5,
            description: '圆筒总电量'
        },
        {
            name: 'innerProbeDepth',
            label: '内探针深度',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 0.05,
            default: 0,
            description: '内壁探针深度 (0=内壁, 1=腔体深处)'
        },
        {
            name: 'outerProbeDepth',
            label: '外探针深度',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 0.05,
            default: 1,
            description: '外壁探针深度 (0=表面, 1=外侧)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 2,
            max: 10,
            step: 0.5,
            default: 5,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const totalCharge = params['totalCharge'] ?? 5;
        const innerProbeDepth = params['innerProbeDepth'] ?? 0;
        const outerProbeDepth = params['outerProbeDepth'] ?? 1;
        const duration = params['duration'] ?? 5;
        return {
            id: `faraday-cup-${Date.now()}`,
            title: '法拉第圆筒',
            model: 'faraday-cup' as const,
            bodies: [],
            constraints: { faradayCup: { totalCharge, innerProbeDepth, outerProbeDepth } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};
