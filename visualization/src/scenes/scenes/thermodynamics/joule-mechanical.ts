import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const joule_mechanicalScene: SceneConfig = {
    id: 'joule-mechanical',
    name: '探究做功与内能关系 (机械功)',
    model: 'joule-mechanical',
    parameters: [
        {
            name: 'mass',
            label: '重物质量 m',
            unit: 'kg',
            value: 5,
            min: 0.1,
            max: 30,
            step: 0.1,
            default: 5,
            description: '下落重物质量 (kg)'
        },
        {
            name: 'height',
            label: '下落高度 h',
            unit: 'm',
            value: 1.5,
            min: 0.1,
            max: 5,
            step: 0.05,
            default: 1.5,
            description: '重物每次下落的高度 (m)'
        },
        {
            name: 'drops',
            label: '下落次数 n',
            unit: '次',
            value: 100,
            min: 1,
            max: 500,
            step: 1,
            default: 100,
            description: '重物下落次数 (反映总机械功 W = n·m·g·h)'
        },
        {
            name: 'waterMass',
            label: '水当量 M',
            unit: 'kg',
            value: 0.5,
            min: 0.05,
            max: 3,
            step: 0.05,
            default: 0.5,
            description: '量热器内水质量 (kg)'
        },
        {
            name: 'specificHeat',
            label: '比热容 c',
            unit: 'J/(kg·K)',
            value: 4184,
            min: 1000,
            max: 5000,
            step: 50,
            default: 4184,
            description: '水的比热容 J/(kg·K)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: '机械功-热量曲线展示时长'
        }
    ],
    buildProblem: params => {
        const mass = params['mass'] ?? 5;
        const height = params['height'] ?? 1.5;
        const drops = Math.max(1, Math.floor(params['drops'] ?? 100));
        const waterMass = params['waterMass'] ?? 0.5;
        const specificHeat = params['specificHeat'] ?? 4184;
        const duration = params['duration'] ?? 5;
        return {
            id: `joule-mech-${Date.now()}`,
            title: '探究做功与内能关系 (机械功)',
            model: 'joule-mechanical' as const,
            bodies: [
                {
                    id: 'weight',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                jouleMechanical: {
                    mass,
                    height,
                    drops,
                    waterMass,
                    specificHeat
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
