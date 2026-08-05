import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const em_inductionScene: SceneConfig = {
    id: 'em-induction',
    name: '电磁感应 (法拉第定律)',
    model: 'em-induction',
    parameters: [
        {
            name: 'Bind',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.5,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.5,
            description: '磁场强度'
        },
        {
            name: 'A',
            label: '线圈面积 A',
            unit: 'm²',
            value: 0.01,
            min: 0.0001,
            max: 1,
            step: 0.0001,
            default: 0.01,
            description: '线圈面积'
        },
        {
            name: 'Nturns',
            label: '线圈匝数 N',
            unit: '',
            value: 100,
            min: 1,
            max: 1000,
            step: 1,
            default: 100,
            description: '线圈匝数'
        },
        {
            name: 'angleBind',
            label: '磁场与法线夹角 θ',
            unit: '°',
            value: 0,
            min: 0,
            max: 180,
            step: 1,
            default: 0,
            description: '磁场与线圈法线方向的夹角'
        },
        {
            name: 'Lcut',
            label: '切割导线长度 L (可选)',
            unit: 'm',
            value: 0,
            min: 0,
            max: 10,
            step: 0.01,
            default: 0,
            description: '导线切割磁感线的有效长度 (0=不启用切割)'
        },
        {
            name: 'vCut',
            label: '切割速度 v (可选)',
            unit: 'm/s',
            value: 0,
            min: 0,
            max: 100,
            step: 0.1,
            default: 0,
            description: '导线切割速度'
        }
    ],
    presets: [
        {
            id: 'strong-field',
            name: '强磁场',
            description: 'B=2T 大面积线圈',
            parameters: { Bind: 2, A: 0.01, Nturns: 100, angleBind: 0, Lcut: 0, vCut: 0 }
        },
        {
            id: 'small-coil',
            name: '小线圈',
            description: 'N=500 匝细线圈',
            parameters: { Bind: 0.5, A: 0.001, Nturns: 500, angleBind: 0, Lcut: 0, vCut: 0 }
        },
        {
            id: 'tilted',
            name: '倾斜角',
            description: 'θ=60° 磁通量减半',
            parameters: { Bind: 0.5, A: 0.01, Nturns: 100, angleBind: 60, Lcut: 0, vCut: 0 }
        },
        {
            id: 'cutting-wire',
            name: '切割导线',
            description: 'E=BLv 动生电动势',
            parameters: { Bind: 0.5, A: 0.01, Nturns: 0, angleBind: 0, Lcut: 0.5, vCut: 10 }
        },
        {
            id: 'high-speed-cut',
            name: '高速切割',
            description: 'v=50m/s 高速切割',
            parameters: { Bind: 1, A: 0.01, Nturns: 0, angleBind: 0, Lcut: 1, vCut: 50 }
        }
    ],
    liveUpdate: true,
    buildProblem: params => {
        const ec: {
            magneticField: number;
            area: number;
            turns?: number;
            angleDeg?: number;
            cuttingLength?: number;
            cuttingVelocity?: number;
        } = {
            magneticField: params['Bind'] ?? 0.5,
            area: params['A'] ?? 0.01
        };
        const Nturns = params['Nturns'] ?? 0;
        if (Nturns > 0) ec.turns = Nturns;
        const angleBind = params['angleBind'];
        if (angleBind !== undefined) ec.angleDeg = angleBind;
        const Lcut = params['Lcut'] ?? 0;
        const vCut = params['vCut'] ?? 0;
        if (Lcut > 0 && vCut > 0) {
            ec.cuttingLength = Lcut;
            ec.cuttingVelocity = vCut;
        }
        return {
            id: `em-induction-${Date.now()}`,
            title: '电磁感应 (法拉第定律)',
            model: 'em-induction' as const,
            bodies: [
                { id: 'coil', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { emInduction: ec },
            environment: {},
            timeConfig: makeTimeSeries(0.04, 40, 0.001)
        };
    }
};
