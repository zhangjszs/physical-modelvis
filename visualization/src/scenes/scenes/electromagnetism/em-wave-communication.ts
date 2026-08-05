import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const em_wave_communicationScene: SceneConfig = {
    id: 'em-wave-communication',
    name: '电磁波发射接收',
    model: 'em-wave-communication' as const,
    parameters: [
        {
            name: 'carrierFreq',
            label: '载波频率 f_c',
            unit: 'MHz',
            value: 1,
            min: 0.1,
            max: 10000,
            step: 0.1,
            default: 1,
            description: '载波频率 fc (MHz)'
        },
        {
            name: 'audioFreq',
            label: '音频频率 f_m',
            unit: 'kHz',
            value: 1,
            min: 0.1,
            max: 200,
            step: 0.1,
            default: 1,
            description: '音频/基带信号频率 fm (kHz)'
        },
        {
            name: 'modulationIndex',
            label: '调制指数 m/β',
            unit: '',
            value: 0.8,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.8,
            description: '调制指数 (AM: m, FM: beta)'
        },
        {
            name: 'carrierAmplitude',
            label: '载波峰值 V_c',
            unit: 'V',
            value: 1,
            min: 0.01,
            max: 1000,
            step: 0.1,
            default: 1,
            description: '载波峰值电压 Vc'
        },
        {
            name: 'distance',
            label: '传输距离',
            unit: 'km',
            value: 10,
            min: 0.001,
            max: 1e5,
            step: 1,
            default: 10,
            description: '发射-接收距离 (km)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 'us',
            value: 10,
            min: 0.1,
            max: 1000,
            step: 0.1,
            default: 10,
            description: '仿真总时长 (用于显示多个周期)'
        }
    ],
    buildProblem: params => {
        const carrierFreqHz = (params['carrierFreq'] ?? 1) * 1e6;
        const audioFreqHz = (params['audioFreq'] ?? 1) * 1e3;
        const modulationIndex = params['modulationIndex'] ?? 0.8;
        const Vc = params['carrierAmplitude'] ?? 1;
        const distanceM = (params['distance'] ?? 10) * 1000;
        const duration = params['duration'] ?? 10;
        return {
            id: `emComm-${Date.now()}`,
            title: '电磁波发射接收',
            model: 'em-wave-communication',
            bodies: [
                {
                    id: 'antenna',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                emWaveComm: {
                    carrierFreq: carrierFreqHz,
                    audioFreq: audioFreqHz,
                    modulationType: 'AM',
                    modulationIndex,
                    carrierAmplitude: Vc,
                    distance: distanceM
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration * 1e-6, 800, 1e-7)
        };
    }
};
