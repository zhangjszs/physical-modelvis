import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const polarization_malusScene: SceneConfig = {
    id: 'polarization-malus',
    name: '偏振光 (马吕斯定律)',
    model: 'polarization' as const,
    parameters: [
        {
            name: 'initIntensity',
            label: '入射光强 I₀',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 0.05,
            default: 1,
            description: '入射光强相对值'
        },
        {
            name: 'nPolarizers',
            label: '偏振片数量 n',
            unit: '',
            value: 2,
            min: 1,
            max: 5,
            step: 1,
            default: 2,
            description: '偏振片数目 (1=检偏, ≥2=多级系统)'
        },
        {
            name: 'angle0',
            label: '第 1 片角度',
            unit: '°',
            value: 0,
            min: 0,
            max: 360,
            step: 1,
            default: 0,
            description: '第一片偏振片透振方向 (相对入射偏振)'
        },
        {
            name: 'angle1',
            label: '第 2 片角度',
            unit: '°',
            value: 45,
            min: 0,
            max: 360,
            step: 1,
            default: 45,
            description: '第二片偏振片透振方向 (≥2 片时有效)'
        },
        {
            name: 'angle2',
            label: '第 3 片角度',
            unit: '°',
            value: 90,
            min: 0,
            max: 360,
            step: 1,
            default: 90,
            description: '第三片偏振片透振方向 (≥3 片时有效)'
        },
        {
            name: 'incAngle',
            label: '入射偏振方向',
            unit: '°',
            value: 0,
            min: 0,
            max: 360,
            step: 1,
            default: 0,
            description: '入射光偏振方向 (仅参考)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景 (仅显示光强曲线)'
        }
    ],
    buildProblem: params => {
        const initialIntensity = params['initIntensity'] ?? 1;
        const nPolarizers = params['nPolarizers'] ?? 2;
        const angle0 = params['angle0'] ?? 0;
        const angle1 = params['angle1'] ?? 45;
        const angle2 = params['angle2'] ?? 90;
        let extraAngles: number[] = [];
        if (nPolarizers >= 4) extraAngles = [angle0 + 22];
        if (nPolarizers >= 5) extraAngles = [angle0 + 22, angle0 + 67];
        const polarizerAngles = [angle0, angle1, angle2, ...extraAngles].slice(0, nPolarizers);
        const incidentAngle = params['incAngle'] ?? 0;
        const duration = params['duration'] ?? 1;
        return {
            id: `pol-${Date.now()}`,
            title: '偏振光 (马吕斯定律)',
            model: 'polarization',
            bodies: [
                { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                polarization: { initialIntensity, nPolarizers, polarizerAngles, incidentAngle }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};
