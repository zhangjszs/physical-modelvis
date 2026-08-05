import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const water_diffractionScene: SceneConfig = {
    id: 'water-diffraction',
    name: '水波衍射 (遇障碍物)',
    model: 'water-diffraction' as const,
    parameters: [
        {
            name: 'wavelength',
            label: '波长 λ',
            unit: 'cm',
            value: 4,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 4,
            description: '水波波长 (cm)'
        },
        {
            name: 'slitWidth',
            label: '狭缝宽度 a',
            unit: 'cm',
            value: 5,
            min: 0.5,
            max: 50,
            step: 0.5,
            default: 5,
            description: '障碍物狭缝宽度 (a/λ<1 衍射明显)'
        },
        {
            name: 'screenDist',
            label: '缝-挡板距离 L',
            unit: 'cm',
            value: 50,
            min: 5,
            max: 200,
            step: 5,
            default: 50,
            description: '狭缝到后方挡板距离'
        },
        {
            name: 'waveAmp',
            label: '入射波振幅 A',
            unit: 'cm',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '入射水波振幅'
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
            description: '静态场景 (仅显示衍射强度图样)'
        }
    ],
    buildProblem: params => {
        const wavelength = params['wavelength'] ?? 4;
        const slitWidth = params['slitWidth'] ?? 5;
        const screenDist = params['screenDist'] ?? 50;
        const waveAmp = params['waveAmp'] ?? 1;
        const duration = params['duration'] ?? 1;
        return {
            id: `wd-${Date.now()}`,
            title: '水波衍射 (遇障碍物)',
            model: 'water-diffraction',
            bodies: [
                {
                    id: 'wave',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: -screenDist, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                waterDiffraction: { wavelength, slitWidth, screenDist, waveAmplitude: waveAmp }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 200)
        };
    }
};
