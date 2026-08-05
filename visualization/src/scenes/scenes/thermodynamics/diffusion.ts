import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const diffusionScene: SceneConfig = {
    id: 'diffusion',
    name: '扩散现象 (浓度梯度)',
    model: 'diffusion',
    parameters: [
        {
            name: 'temperature',
            label: '温度 T',
            unit: 'K',
            value: 300,
            min: 200,
            max: 1000,
            step: 5,
            default: 300,
            description: '环境温度 (影响扩散系数 D ∝ T^(3/2))'
        },
        {
            name: 'medium',
            label: '扩散介质 (0=气体 1=液体)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '0=气体 (D~10⁻⁵ m²/s); 1=液体 (D~10⁻⁹ m²/s)'
        },
        {
            name: 'particleCount',
            label: '粒子数 N',
            unit: '',
            value: 500,
            min: 50,
            max: 5000,
            step: 50,
            default: 500,
            description: '用于统计的粒子总数'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 3,
            description: '图形展示时长'
        }
    ],
    buildProblem: params => {
        const temperature = params['temperature'] ?? 300;
        const medium = (params['medium'] ?? 0) === 1 ? ('liquid' as const) : ('gas' as const);
        const particleCount = params['particleCount'] ?? 500;
        const duration = params['duration'] ?? 3;
        return {
            id: `diffusion-${Date.now()}`,
            title: '扩散现象 (浓度梯度)',
            model: 'diffusion',
            bodies: [
                { id: 'source', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                diffusion: {
                    temperature,
                    mode: medium,
                    particleCount,
                    gridSize: 1e-6,
                    timeSteps: 100
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};
