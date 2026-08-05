import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const gas_lawScene: SceneConfig = {
    id: 'gas-law',
    name: '理想气体状态方程',
    model: 'gas-law',
    parameters: [
        {
            name: 'n',
            label: '物质的量 n',
            unit: 'mol',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '气体物质的量 (1 mol 标况下 22.4 L)'
        },
        {
            name: 'modeG',
            label: '过程 (0=等温 1=等压 2=等容)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=等温 (pV=const); 1=等压 (V/T=const); 2=等容 (p/T=const)'
        },
        {
            name: 'p0',
            label: '初始压强 p₀',
            unit: 'kPa',
            value: 101.3,
            min: 10,
            max: 500,
            step: 5,
            default: 101.3,
            description: '初始压强 (标准大气压 = 101.3 kPa)'
        },
        {
            name: 'V0',
            label: '初始体积 V₀',
            unit: 'L',
            value: 22.4,
            min: 1,
            max: 100,
            step: 0.5,
            default: 22.4,
            description: '初始体积 (1mol 标况下 22.4 L)'
        },
        {
            name: 'T0',
            label: '初始温度 T₀',
            unit: 'K',
            value: 273.15,
            min: 50,
            max: 600,
            step: 5,
            default: 273.15,
            description: '初始温度 (标况 = 273.15 K)'
        }
    ],
    presets: [
        {
            id: 'stp',
            name: '标准状况',
            description: '1mol, 101.3kPa, 273.15K, 22.4L',
            parameters: { n: 1, modeG: 0, p0: 101.3, V0: 22.4, T0: 273.15 }
        },
        {
            id: 'isothermal',
            name: '等温过程',
            description: '玻意耳定律 pV=常数',
            parameters: { n: 1, modeG: 0, p0: 101.3, V0: 22.4, T0: 293.15 }
        },
        {
            id: 'isobaric',
            name: '等压过程',
            description: '盖-吕萨克定律 V/T=常数',
            parameters: { n: 1, modeG: 1, p0: 101.3, V0: 22.4, T0: 273.15 }
        },
        {
            id: 'isochoric',
            name: '等容过程',
            description: '查理定律 p/T=常数',
            parameters: { n: 1, modeG: 2, p0: 101.3, V0: 22.4, T0: 273.15 }
        },
        {
            id: 'high-pressure',
            name: '高压气瓶',
            description: '10MPa, 50L 工业气瓶',
            parameters: { n: 20, modeG: 2, p0: 500, V0: 50, T0: 293.15 }
        }
    ],
    liveUpdate: true,
    buildProblem: params => {
        const moles = params['n'] ?? 1;
        const modeNum = params['modeG'] ?? 0;
        const mode = modeNum === 1 ? 'isobaric' : modeNum === 2 ? 'isochoric' : 'isothermal';
        const pInit = (params['p0'] ?? 101.3) * 1e3; // kPa → Pa
        const VInit = (params['V0'] ?? 22.4) / 1e3; // L → m³
        const TInit = params['T0'] ?? 273.15;
        return {
            id: `gas-law-${Date.now()}`,
            title: '理想气体状态方程 (pV=nRT)',
            model: 'gas-law' as const,
            bodies: [{ id: 'gas', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
            constraints: {
                gasLaw: {
                    moles,
                    mode,
                    initialPressure: pInit,
                    initialVolume: VInit,
                    initialTemperature: TInit
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(1, 10, 0.1)
        };
    }
};
