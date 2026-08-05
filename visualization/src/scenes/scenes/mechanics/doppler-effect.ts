import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const doppler_effectScene: SceneConfig = {
    id: 'doppler-effect',
    name: '多普勒效应 (声源运动)',
    model: 'doppler' as const,
    parameters: [
        {
            name: 'soundSpeed',
            label: '声速 v',
            unit: 'm/s',
            value: 340,
            min: 300,
            max: 400,
            step: 1,
            default: 340,
            description: '空气中声速 (20°C ≈ 343 m/s)'
        },
        {
            name: 'sourceFreq',
            label: '声源频率 f',
            unit: 'Hz',
            value: 500,
            min: 50,
            max: 5000,
            step: 10,
            default: 500,
            description: '声源发出的原始频率'
        },
        {
            name: 'sourceSpeed',
            label: '声源速度 v_s',
            unit: 'm/s',
            value: 30,
            min: 0,
            max: 330,
            step: 1,
            default: 30,
            description: '声源相对介质的运动速度'
        },
        {
            name: 'dirAngle',
            label: '方向角 θ',
            unit: '°',
            value: 0,
            min: 0,
            max: 360,
            step: 1,
            default: 0,
            description: '声源运动方向与观察者连线夹角 (0°=靠近, 180°=远离)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 10,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 10,
            description: '仿真总时长 (仅影响声源运动轨迹动画)'
        }
    ],
    presets: [
        {
            id: 'approaching',
            name: '靠近观察者',
            description: 'θ=0° 声源靠近',
            parameters: { soundSpeed: 340, sourceFreq: 500, sourceSpeed: 30, dirAngle: 0, duration: 10 }
        },
        {
            id: 'receding',
            name: '远离观察者',
            description: 'θ=180° 声源远离',
            parameters: { soundSpeed: 340, sourceFreq: 500, sourceSpeed: 30, dirAngle: 180, duration: 10 }
        },
        {
            id: 'siren',
            name: '救护车警笛',
            description: 'f=800Hz vs=20m/s',
            parameters: { soundSpeed: 340, sourceFreq: 800, sourceSpeed: 20, dirAngle: 0, duration: 10 }
        },
        {
            id: 'high-speed',
            name: '超音速',
            description: 'vs=300m/s 近音速',
            parameters: { soundSpeed: 340, sourceFreq: 500, sourceSpeed: 300, dirAngle: 0, duration: 10 }
        },
        {
            id: 'crossing',
            name: '擦肩而过',
            description: 'θ=90° 横向掠过',
            parameters: { soundSpeed: 340, sourceFreq: 500, sourceSpeed: 30, dirAngle: 90, duration: 10 }
        }
    ],
    liveUpdate: true,
    hasTrajectory: true,
    buildProblem: params => {
        const soundSpeed = params['soundSpeed'] ?? 340;
        const sourceFreq = params['sourceFreq'] ?? 500;
        const sourceSpeed = params['sourceSpeed'] ?? 30;
        const dirAngle = params['dirAngle'] ?? 0;
        const duration = params['duration'] ?? 10;
        return {
            id: `dop-${Date.now()}`,
            title: '多普勒效应 (声源运动)',
            model: 'doppler',
            bodies: [
                {
                    id: 'source',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: -10, y: 0 },
                    velocity: { x: sourceSpeed, y: 0 }
                }
            ],
            constraints: {
                doppler: { soundSpeed, sourceFreq, sourceSpeed, directionAngle: dirAngle }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};
