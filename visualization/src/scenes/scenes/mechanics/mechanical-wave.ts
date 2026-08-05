import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const mechanical_waveScene: SceneConfig = {
    id: 'mechanical-wave',
    name: '机械波 (横波/纵波/干涉)',
    model: 'mechanical-wave',
    parameters: [
        {
            name: 'waveMode',
            label: '模式 (0=横波 1=纵波 2=干涉)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=横波 (振动方向⊥传播方向); 1=纵波 (振动方向∥传播方向); 2=干涉 (两列对向波叠加)'
        },
        {
            name: 'amplitude',
            label: '振幅 A',
            unit: 'm',
            value: 0.1,
            min: 0.01,
            max: 0.5,
            step: 0.01,
            default: 0.1,
            description: '质点振动的最大位移'
        },
        {
            name: 'frequency',
            label: '频率 f',
            unit: 'Hz',
            value: 2,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 2,
            description: '振动频率 (Hz)；频率越大波长越短'
        },
        {
            name: 'wavelength',
            label: '波长 λ',
            unit: 'm',
            value: 0.5,
            min: 0.05,
            max: 2,
            step: 0.05,
            default: 0.5,
            description: '波在一个周期内传播的距离'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 15,
            step: 0.5,
            default: 3,
            description: '仿真的总时长 (可观察到波传播过程)'
        }
    ],
    buildProblem: params => {
        const modeMap = ['transverse', 'longitudinal', 'interference'] as const;
        const modeIdx = params['waveMode'] ?? 0;
        const mode = modeMap[modeIdx] ?? 'transverse';
        const amplitude = params['amplitude'] ?? 0.1;
        const frequency = params['frequency'] ?? 2;
        const wavelength = params['wavelength'] ?? 0.5;
        const duration = params['duration'] ?? 3;
        return {
            id: `wave-${Date.now()}`,
            title: mode === 'transverse' ? '横波传播' : mode === 'longitudinal' ? '纵波传播' : '波的干涉',
            model: 'mechanical-wave' as const,
            bodies: [
                {
                    id: 'medium',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                wave: {
                    mode,
                    amplitude,
                    frequency,
                    wavelength,
                    xStart: -1,
                    xEnd: 3,
                    particleCount: 81,
                    ...(mode === 'interference' ? { amplitude2: amplitude, direction2: -1, phaseDiff: 0 } : {})
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 300)
        };
    }
};
