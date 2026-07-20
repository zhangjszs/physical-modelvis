import { makeTimeSeries } from '../../utils/timeSeries.js';
import type { SceneConfig } from '../../types/visualization';
import { PHYSICS_CONSTANTS } from 'physics-core';

/**
 * 电磁学 (必修三 + 选必二)
 * 共 39 个 SceneConfig
 */
export const ElectromagnetismScenes: SceneConfig[] = [
    {
        id: 'electric-field',
        name: '匀强电场',
        model: 'uniform-electric-field',
        parameters: [
            {
                name: 'v0x',
                label: '水平初速度 vx₀',
                unit: 'm/s',
                value: 5,
                min: -100,
                max: 100,
                step: 0.5,
                default: 5,
                description: '水平方向初速度'
            },
            {
                name: 'v0y',
                label: '竖直初速度 vy₀',
                unit: 'm/s',
                value: 0,
                min: -100,
                max: 100,
                step: 0.5,
                default: 0,
                description: '竖直方向初速度'
            },
            {
                name: 'charge',
                label: '电荷量 q',
                unit: '×10⁻¹⁹ C',
                value: 1.6,
                min: -10,
                max: 10,
                step: 0.1,
                default: 1.6,
                description: '带电粒子电荷量（正=正电荷，负=负电荷）'
            },
            {
                name: 'mass',
                label: '质量 m',
                unit: '×10⁻²⁷ kg',
                value: 1.67,
                min: 0.01,
                max: 100,
                step: 0.1,
                default: 1.67,
                description: '粒子质量'
            },
            {
                name: 'Ey',
                label: '电场强度 Ey',
                unit: 'N/C',
                value: 100,
                min: -1000,
                max: 1000,
                step: 10,
                default: 100,
                description: '匀强电场的 y 分量（正=向上，负=向下）'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 2,
                min: 0.1,
                max: 20,
                step: 0.1,
                default: 2,
                description: '仿真的总时长'
            }
        ],
        buildProblem: params => {
            const v0x = params['v0x'] ?? 5;
            const v0y = params['v0y'] ?? 0;
            const q = (params['charge'] ?? 1.6) * 1e-19;
            const m = (params['mass'] ?? 1.67) * 1e-27;
            const Ey = params['Ey'] ?? 100;
            const duration = params['duration'] ?? 2;
            return {
                id: `electric-field-${Date.now()}`,
                title: '匀强电场',
                model: 'uniform-electric-field',
                bodies: [
                    {
                        id: 'charge',
                        mass: { value: m, unit: 'kg' },
                        charge: { value: q, unit: 'C' },
                        position: { x: 0, y: 0 },
                        velocity: { x: v0x, y: v0y }
                    }
                ],
                environment: {
                    electricField: { enabled: true, fieldVector: { x: 0, y: Ey } }
                },
                timeConfig: makeTimeSeries(duration, 1000, 0.001)
            };
        }
    },

    {
        id: 'magnetic-field',
        name: '匀强磁场',
        model: 'uniform-magnetic-field',
        parameters: [
            {
                name: 'v0x',
                label: '水平初速度 vx₀',
                unit: 'm/s',
                value: 1000,
                min: 1,
                max: 100000,
                step: 100,
                default: 1000,
                description: '水平方向初速度'
            },
            {
                name: 'v0y',
                label: '竖直初速度 vy₀',
                unit: 'm/s',
                value: 0,
                min: -100000,
                max: 100000,
                step: 100,
                default: 0,
                description: '竖直方向初速度'
            },
            {
                name: 'charge',
                label: '电荷量 q',
                unit: '×10⁻¹⁹ C',
                value: 1.6,
                min: -10,
                max: 10,
                step: 0.1,
                default: 1.6,
                description: '带电粒子电荷量'
            },
            {
                name: 'mass',
                label: '质量 m',
                unit: '×10⁻²⁷ kg',
                value: 1.67,
                min: 0.01,
                max: 100,
                step: 0.1,
                default: 1.67,
                description: '粒子质量'
            },
            {
                name: 'Bz',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.01,
                min: 0.0001,
                max: 10,
                step: 0.001,
                default: 0.01,
                description: '匀强磁场强度（垂直于运动平面）'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 0.01,
                min: 0.0001,
                max: 1,
                step: 0.001,
                default: 0.01,
                description: '仿真的总时长'
            }
        ],
        buildProblem: params => {
            const v0x = params['v0x'] ?? 1000;
            const v0y = params['v0y'] ?? 0;
            const q = (params['charge'] ?? 1.6) * 1e-19;
            const m = (params['mass'] ?? 1.67) * 1e-27;
            const Bz = params['Bz'] ?? 0.01;
            const duration = params['duration'] ?? 0.01;
            return {
                id: `magnetic-field-${Date.now()}`,
                title: '匀强磁场',
                model: 'uniform-magnetic-field',
                bodies: [
                    {
                        id: 'charge',
                        mass: { value: m, unit: 'kg' },
                        charge: { value: q, unit: 'C' },
                        position: { x: 0, y: 0 },
                        velocity: { x: v0x, y: v0y }
                    }
                ],
                environment: {
                    magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' }
                },
                timeConfig: makeTimeSeries(duration, 1000)
            };
        }
    },

    {
        id: 'em-combined',
        name: '电磁复合场',
        model: 'em-combined-field',
        parameters: [
            {
                name: 'charge',
                label: '电荷量 q',
                unit: '×10⁻¹⁹ C',
                value: 1.6,
                min: -10,
                max: 10,
                step: 0.1,
                default: 1.6,
                description: '带电粒子电荷量'
            },
            {
                name: 'mass',
                label: '质量 m',
                unit: '×10⁻²⁷ kg',
                value: 1.67,
                min: 0.01,
                max: 100,
                step: 0.1,
                default: 1.67,
                description: '粒子质量'
            },
            {
                name: 'v0x',
                label: '水平初速度 vx₀',
                unit: 'm/s',
                value: 1000,
                min: 1,
                max: 100000,
                step: 100,
                default: 1000,
                description: '水平方向初速度'
            },
            {
                name: 'v0y',
                label: '竖直初速度 vy₀',
                unit: 'm/s',
                value: 0,
                min: -100000,
                max: 100000,
                step: 100,
                default: 0,
                description: '竖直方向初速度'
            },
            {
                name: 'Ex',
                label: '电场强度 Ex',
                unit: 'N/C',
                value: 100,
                min: -1000,
                max: 1000,
                step: 10,
                default: 100,
                description: '匀强电场 x 分量'
            },
            {
                name: 'Bz',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.01,
                min: 0.0001,
                max: 10,
                step: 0.001,
                default: 0.01,
                description: '匀强磁场强度（垂直于运动平面）'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 0.01,
                min: 0.0001,
                max: 1,
                step: 0.001,
                default: 0.01,
                description: '仿真的总时长'
            }
        ],
        buildProblem: params => {
            const q = (params['charge'] ?? 1.6) * 1e-19;
            const m = (params['mass'] ?? 1.67) * 1e-27;
            const v0x = params['v0x'] ?? 1000;
            const v0y = params['v0y'] ?? 0;
            const Ex = params['Ex'] ?? 100;
            const Bz = params['Bz'] ?? 0.01;
            const duration = params['duration'] ?? 0.01;
            return {
                id: `em-combined-${Date.now()}`,
                title: '电磁复合场',
                model: 'em-combined-field',
                bodies: [
                    {
                        id: 'charge',
                        mass: { value: m, unit: 'kg' },
                        charge: { value: q, unit: 'C' },
                        position: { x: 0, y: 0 },
                        velocity: { x: v0x, y: v0y }
                    }
                ],
                environment: {
                    electricField: { enabled: true, fieldVector: { x: Ex, y: 0 } },
                    magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' }
                },
                timeConfig: makeTimeSeries(duration, 1000)
            };
        }
    },

    {
        id: 'circuit',
        name: '直流电路分析 (串并联)',
        model: 'circuit',
        parameters: [
            {
                name: 'emf',
                label: '电动势 E',
                unit: 'V',
                value: 12,
                min: 1,
                max: 36,
                step: 0.5,
                default: 12,
                description: '电源电动势 (1.5V 干电池×8 = 12V; 铅蓄电池 12V)'
            },
            {
                name: 'r',
                label: '内阻 r',
                unit: 'Ω',
                value: 1,
                min: 0,
                max: 10,
                step: 0.1,
                default: 1,
                description: '电源内阻 (理想电源=0)'
            },
            {
                name: 'r1',
                label: '电阻 R₁',
                unit: 'Ω',
                value: 10,
                min: 0.1,
                max: 100,
                step: 0.5,
                default: 10,
                description: '电阻 1 (串联)'
            },
            {
                name: 'r2',
                label: '电阻 R₂',
                unit: 'Ω',
                value: 10,
                min: 0.1,
                max: 100,
                step: 0.5,
                default: 10,
                description: '电阻 2'
            },
            {
                name: 'r2conn',
                label: 'R₂ 连接方式 (1=串联 0=并联)',
                unit: '',
                value: 1,
                min: 0,
                max: 1,
                step: 1,
                default: 1,
                description: '0=与 R₁ 并联, 1=与 R₁ 串联'
            },
            {
                name: 'r3',
                label: '电阻 R₃',
                unit: 'Ω',
                value: 20,
                min: 0,
                max: 100,
                step: 0.5,
                default: 20,
                description: '电阻 3 (0=不使用)'
            },
            {
                name: 'r3conn',
                label: 'R₃ 连接方式 (1=串联 0=并联)',
                unit: '',
                value: 1,
                min: 0,
                max: 1,
                step: 1,
                default: 1,
                description: '0=与当前拓扑并联, 1=串联'
            }
        ],
        buildProblem: params => {
            const emf = params['emf'] ?? 12;
            const r = params['r'] ?? 0;
            const r1 = params['r1'] ?? 10;
            const r2 = params['r2'] ?? 10;
            const r2conn = (params['r2conn'] ?? 1) === 1 ? 'series' : 'parallel';
            const r3 = params['r3'] ?? 0;
            const r3conn = (params['r3conn'] ?? 1) === 1 ? 'series' : 'parallel';

            const resistors: Array<{ resistance: number; connection: 'series' | 'parallel' }> = [
                { resistance: r1, connection: 'series' },
                { resistance: r2, connection: r2conn }
            ];
            if (r3 > 0) {
                resistors.push({ resistance: r3, connection: r3conn });
            }

            return {
                id: `circuit-${Date.now()}`,
                title: '直流电路分析 (串并联)',
                model: 'circuit' as const,
                bodies: [
                    { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { circuit: { emf, internalResistance: r, resistors } },
                environment: {},
                timeConfig: makeTimeSeries(1, 10, 0.1)
            };
        }
    },

    {
        id: 'magnetic-force',
        name: '安培力与洛伦兹力',
        model: 'magnetic-force',
        parameters: [
            {
                name: 'B',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.5,
                min: 0.01,
                max: 5,
                step: 0.01,
                default: 0.5,
                description: '匀强磁场磁感应强度'
            },
            {
                name: 'I',
                label: '电流 I (安培力)',
                unit: 'A',
                value: 2,
                min: 0,
                max: 30,
                step: 0.1,
                default: 2,
                description: '通电导线电流 (A)'
            },
            {
                name: 'L',
                label: '导线长度 L',
                unit: 'm',
                value: 0.3,
                min: 0.01,
                max: 5,
                step: 0.01,
                default: 0.3,
                description: '导线在磁场中的有效长度'
            },
            {
                name: 'theta',
                label: '导线与磁场夹角 θ',
                unit: '°',
                value: 90,
                min: 0,
                max: 180,
                step: 1,
                default: 90,
                description: '导线与磁场方向的夹角'
            },
            {
                name: 'q',
                label: '粒子电荷 q (洛伦兹力)',
                unit: '×10⁻¹⁹ C',
                value: 1.6,
                min: -10,
                max: 10,
                step: 0.1,
                default: 1.6,
                description: '运动粒子电荷 (元电荷 e = 1.6×10⁻¹⁹ C)'
            },
            {
                name: 'v',
                label: '粒子速度 v',
                unit: '×10⁶ m/s',
                value: 1,
                min: 0,
                max: 100,
                step: 0.1,
                default: 1,
                description: '粒子运动速度'
            },
            {
                name: 'phi',
                label: '速度与磁场夹角 φ',
                unit: '°',
                value: 90,
                min: 0,
                max: 180,
                step: 1,
                default: 90,
                description: '速度方向与磁场方向夹角'
            },
            {
                name: 'mass',
                label: '粒子质量 m',
                unit: '×10⁻³¹ kg',
                value: 9.1,
                min: 0.01,
                max: 100,
                step: 0.01,
                default: 9.1,
                description: '粒子质量 (电子 = 9.1×10⁻³¹ kg)'
            }
        ],
        buildProblem: params => {
            const B = params['B'] ?? 0.5;
            const current = params['I'] ?? 0;
            const wireLength = params['L'] ?? 0;
            const wireAngleDeg = params['theta'] ?? 90;
            const charge = (params['q'] ?? 0) * 1e-19;
            const velocity = (params['v'] ?? 0) * 1e6;
            const velocityAngleDeg = params['phi'] ?? 90;
            const particleMass = (params['mass'] ?? 0) * 1e-31;
            return {
                id: `magnetic-force-${Date.now()}`,
                title: '安培力与洛伦兹力',
                model: 'magnetic-force' as const,
                bodies: [
                    {
                        id: 'particle',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    magneticForce: {
                        magneticField: B,
                        current: current > 0 ? current : undefined,
                        wireLength: wireLength > 0 ? wireLength : undefined,
                        wireAngleDeg,
                        charge: charge !== 0 ? charge : undefined,
                        velocity: velocity > 0 ? velocity : undefined,
                        velocityAngleDeg,
                        particleMass: particleMass > 0 ? particleMass : undefined
                    }
                },
                environment: {},
                timeConfig: makeTimeSeries(1, 200, 0.01)
            };
        }
    },

    {
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
    },

    {
        id: 'ac-current',
        name: '交变电流与变压器 (选必二§3)',
        model: 'ac-current',
        parameters: [
            {
                name: 'Em',
                label: '峰值电动势 Eₘ',
                unit: 'V',
                value: 311,
                min: 1,
                max: 100000,
                step: 1,
                default: 311,
                description: '交流电峰值 (220V有效值对应 311V 峰值)'
            },
            {
                name: 'freq',
                label: '频率 f',
                unit: 'Hz',
                value: 50,
                min: 1,
                max: 10000,
                step: 1,
                default: 50,
                description: '市电 50Hz'
            },
            {
                name: 'nRatio',
                label: '变压器匝数比 n₂/n₁ (0=无)',
                unit: '',
                value: 0.1,
                min: 0,
                max: 100,
                step: 0.01,
                default: 0.1,
                description: '次级/初级匝数比；>1=升压；<1=降压；0=无变压器'
            }
        ],
        buildProblem: params => {
            const ac: { peakEmf: number; angularFreq: number; turnsRatio?: number } = {
                peakEmf: params['Em'] ?? 311,
                angularFreq: 2 * Math.PI * (params['freq'] ?? 50)
            };
            const nRatio = params['nRatio'] ?? 0;
            if (nRatio > 0) ac.turnsRatio = nRatio;
            return {
                id: `ac-${Date.now()}`,
                title: '交变电流与变压器',
                model: 'ac-current' as const,
                bodies: [
                    { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { ac },
                environment: {},
                timeConfig: makeTimeSeries(0.04, 40, 0.001)
            };
        }
    },

    {
        id: 'lc-oscillator',
        name: 'LC 电磁振荡',
        model: 'lc-oscillator',
        parameters: [
            {
                name: 'C',
                label: '电容 C',
                unit: 'pF',
                value: 100,
                min: 1,
                max: 1e6,
                step: 1,
                default: 100,
                description: '电容值 (pF)'
            },
            {
                name: 'Lind',
                label: '电感 L',
                unit: 'μH',
                value: 10,
                min: 0.001,
                max: 100000,
                step: 0.001,
                default: 10,
                description: '电感值 (μH)'
            },
            {
                name: 'Q0',
                label: '初始电荷 Q₀',
                unit: 'μC',
                value: 1,
                min: 0.001,
                max: 100,
                step: 0.001,
                default: 1,
                description: '电容初始充电量'
            }
        ],
        buildProblem: params => {
            return {
                id: `lc-${Date.now()}`,
                title: 'LC 电磁振荡',
                model: 'lc-oscillator' as const,
                bodies: [
                    { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    lc: {
                        capacitance: (params['C'] ?? 100) * 1e-12,
                        inductance: (params['Lind'] ?? 10) * 1e-6,
                        initialCharge: (params['Q0'] ?? 1) * 1e-6
                    }
                },
                environment: {},
                timeConfig: makeTimeSeries(1, 100, 0.01)
            };
        }
    },

    {
        id: 'current-balance',
        name: '电流天平 (安培力测量)',
        model: 'current-balance' as const,
        parameters: [
            {
                name: 'wireLen',
                label: '导线有效长度 l',
                unit: 'm',
                value: 0.05,
                min: 0.001,
                max: 1,
                step: 0.001,
                default: 0.05,
                description: '线圈垂直于磁场的单匝导线有效长度'
            },
            {
                name: 'turns',
                label: '线圈匝数 n',
                unit: '匝',
                value: 20,
                min: 1,
                max: 1000,
                step: 1,
                default: 20,
                description: '线圈匝数'
            },
            {
                name: 'mass',
                label: '砝码质量 m',
                unit: 'kg',
                value: 0.01,
                min: 0.001,
                max: 1,
                step: 0.001,
                default: 0.01,
                description: '天平砝码质量'
            },
            {
                name: 'current',
                label: '电流 I',
                unit: 'A',
                value: 1,
                min: 0,
                max: 100,
                step: 0.1,
                default: 1,
                description: '通过线圈的电流'
            },
            {
                name: 'magneticField',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.5,
                min: 0.01,
                max: 10,
                step: 0.01,
                default: 0.5,
                description: '匀强磁场磁感应强度'
            },
            {
                name: 'gravity',
                label: '重力加速度 g',
                unit: 'm/s²',
                value: PHYSICS_CONSTANTS.g.value,
                min: 1,
                max: 20,
                step: 0.1,
                default: PHYSICS_CONSTANTS.g.value,
                description: '当地重力加速度'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 5,
                min: 0.5,
                max: 30,
                step: 0.5,
                default: 5,
                description: '仿真总时长'
            }
        ],
        buildProblem: params => {
            const wireLen = params['wireLen'] ?? 0.05;
            const turns = params['turns'] ?? 20;
            const mass = params['mass'] ?? 0.01;
            const current = params['current'] ?? 1;
            const magneticField = params['magneticField'] ?? 0.5;
            const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
            const duration = params['duration'] ?? 5;
            return {
                id: `curBal-${Date.now()}`,
                title: '电流天平 (安培力测量)',
                model: 'current-balance',
                bodies: [
                    {
                        id: 'balance',
                        mass: { value: mass, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    currentBalance: { wireLen, turns, mass, current, magneticField, gravity: g }
                },
                environment: {
                    gravity: { enabled: true, value: g }
                },
                timeConfig: makeTimeSeries(duration, 300)
            };
        }
    },

    {
        id: 'eddy-current',
        name: '涡流现象 (阻尼摆动)',
        model: 'eddy-current' as const,
        parameters: [
            {
                name: 'magneticField',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.2,
                min: 0.01,
                max: 5,
                step: 0.01,
                default: 0.2,
                description: '交变磁场峰值 B'
            },
            {
                name: 'frequency',
                label: '磁场频率 f',
                unit: 'Hz',
                value: 50,
                min: 0.1,
                max: 1e6,
                step: 1,
                default: 50,
                description: '交变磁场频率'
            },
            {
                name: 'conductivity',
                label: '电导率 σ',
                unit: 'S/m',
                value: 5.8e7,
                min: 1e3,
                max: 1e8,
                step: 1e5,
                default: 5.8e7,
                description: '导体电导率 (铜~5.8x10⁷ S/m)'
            },
            {
                name: 'thickness',
                label: '导体厚度 d',
                unit: 'm',
                value: 0.001,
                min: 1e-5,
                max: 0.1,
                step: 0.0001,
                default: 0.001,
                description: '金属板厚度 (m)'
            },
            {
                name: 'muR',
                label: '相对磁导率 μᵣ',
                unit: '',
                value: 1,
                min: 1,
                max: 5000,
                step: 1,
                default: 1,
                description: '导体相对磁导率 (非铁磁体=1)'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 10,
                min: 0.5,
                max: 60,
                step: 0.5,
                default: 10,
                description: '仿真总时长'
            }
        ],
        buildProblem: params => {
            const magneticField = params['magneticField'] ?? 0.2;
            const frequency = params['frequency'] ?? 50;
            const conductivity = params['conductivity'] ?? 5.8e7;
            const thickness = params['thickness'] ?? 0.001;
            const muR = params['muR'] ?? 1;
            const duration = params['duration'] ?? 10;
            return {
                id: `eddy-${Date.now()}`,
                title: '涡流现象 (阻尼摆动)',
                model: 'eddy-current',
                bodies: [
                    {
                        id: 'plate',
                        mass: { value: 0.1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    eddyCurrent: { magneticField, frequency, conductivity, thickness, muR }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 500)
            };
        }
    },

    {
        id: 'em-damping',
        name: '电磁阻尼/驱动',
        model: 'em-damping' as const,
        parameters: [
            {
                name: 'magneticField',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.3,
                min: 0.01,
                max: 5,
                step: 0.01,
                default: 0.3,
                description: '匀强磁场磁感应强度'
            },
            {
                name: 'angularSpeed',
                label: '初始/目标角速度 ω₀',
                unit: 'rad/s',
                value: 100,
                min: 0,
                max: 5000,
                step: 10,
                default: 100,
                description: '初始 (阻尼) 或目标 (驱动) 角速度'
            },
            {
                name: 'conductivity',
                label: '电导率 σ',
                unit: 'S/m',
                value: 5.8e7,
                min: 1e3,
                max: 1e8,
                step: 1e5,
                default: 5.8e7,
                description: '导体电导率'
            },
            {
                name: 'inertia',
                label: '转动惯量 J',
                unit: 'kg·m²',
                value: 0.01,
                min: 1e-9,
                max: 100,
                step: 0.01,
                default: 0.01,
                description: '导体盘转动惯量'
            },
            {
                name: 'radius',
                label: '导体盘半径 R',
                unit: 'm',
                value: 0.1,
                min: 0.001,
                max: 10,
                step: 0.01,
                default: 0.1,
                description: '导体盘半径'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 5,
                min: 0.1,
                max: 60,
                step: 0.5,
                default: 5,
                description: '仿真总时长'
            }
        ],
        buildProblem: params => {
            const magneticField = params['magneticField'] ?? 0.3;
            const angularSpeed = params['angularSpeed'] ?? 100;
            const conductivity = params['conductivity'] ?? 5.8e7;
            const inertia = params['inertia'] ?? 0.01;
            const radius = params['radius'] ?? 0.1;
            const duration = params['duration'] ?? 5;
            return {
                id: `emd-${Date.now()}`,
                title: '电磁阻尼/驱动',
                model: 'em-damping',
                bodies: [
                    { id: 'disc', mass: { value: 0.5, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    emDamping: { mode: 'damping', magneticField, angularSpeed, conductivity, inertia, radius }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 500)
            };
        }
    },

    {
        id: 'mutual-inductance',
        name: '互感现象 (双线圈)',
        model: 'mutual-inductance' as const,
        parameters: [
            {
                name: 'L1',
                label: '原线圈自感 L₁',
                unit: 'H',
                value: 0.1,
                min: 1e-6,
                max: 1000,
                step: 0.01,
                default: 0.1,
                description: '原线圈自感 L1'
            },
            {
                name: 'L2',
                label: '副线圈自感 L₂',
                unit: 'H',
                value: 0.05,
                min: 1e-6,
                max: 1000,
                step: 0.01,
                default: 0.05,
                description: '副线圈自感 L2'
            },
            {
                name: 'coupling',
                label: '耦合系数 k',
                unit: '',
                value: 0.6,
                min: 0,
                max: 1,
                step: 0.01,
                default: 0.6,
                description: '耦合系数 (0=无耦合, 1=理想变压器)'
            },
            {
                name: 'frequency',
                label: '交流频率 f',
                unit: 'Hz',
                value: 50,
                min: 1,
                max: 1e5,
                step: 1,
                default: 50,
                description: '原边交流频率'
            },
            {
                name: 'primaryCurrent',
                label: '原边电流峰值 I₀',
                unit: 'A',
                value: 1,
                min: 0,
                max: 100,
                step: 0.1,
                default: 1,
                description: '原边交流电流幅值 I0'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 0.2,
                min: 0.05,
                max: 2,
                step: 0.05,
                default: 0.2,
                description: '仿真总时长'
            }
        ],
        buildProblem: params => {
            const L1 = params['L1'] ?? 0.1;
            const L2 = params['L2'] ?? 0.05;
            const coupling = params['coupling'] ?? 0.6;
            const frequency = params['frequency'] ?? 50;
            const primaryCurrent = params['primaryCurrent'] ?? 1;
            const duration = params['duration'] ?? 0.2;
            return {
                id: `mutInd-${Date.now()}`,
                title: '互感现象 (双线圈)',
                model: 'mutual-inductance',
                bodies: [
                    {
                        id: 'primary',
                        mass: { value: 0.1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    mutualInductance: { L1, L2, coupling, frequency, primaryCurrent }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 1000)
            };
        }
    },

    {
        id: 'self-inductance',
        name: '自感现象 (断电自感)',
        model: 'self-inductance' as const,
        parameters: [
            {
                name: 'inductance',
                label: '自感 L',
                unit: 'H',
                value: 0.5,
                min: 1e-6,
                max: 1000,
                step: 0.01,
                default: 0.5,
                description: '线圈自感 L'
            },
            {
                name: 'resistance',
                label: '电阻 R',
                unit: 'Ω',
                value: 10,
                min: 0.01,
                max: 1e6,
                step: 1,
                default: 10,
                description: '电路电阻 R'
            },
            {
                name: 'emf',
                label: '电源电动势 E',
                unit: 'V',
                value: 12,
                min: 0,
                max: 1000,
                step: 0.5,
                default: 12,
                description: '直流电源电动势 E'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 0.5,
                min: 0.1,
                max: 5,
                step: 0.05,
                default: 0.5,
                description: '仿真总时长 (含暂态过程)'
            }
        ],
        buildProblem: params => {
            const inductance = params['inductance'] ?? 0.5;
            const resistance = params['resistance'] ?? 10;
            const emf = params['emf'] ?? 12;
            const duration = params['duration'] ?? 0.5;
            return {
                id: `selfInd-${Date.now()}`,
                title: '自感现象 (断电自感)',
                model: 'self-inductance',
                bodies: [
                    { id: 'coil', mass: { value: 0.2, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    selfInductance: { inductance, resistance, emf, mode: 'turnOff' }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 500)
            };
        }
    },

    {
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
    },

    {
        id: 'em-spectrum',
        name: '电磁波谱 (频段分布)',
        model: 'em-spectrum' as const,
        parameters: [
            {
                name: 'freqMinExp',
                label: '频率下限 (10^n)',
                unit: '',
                value: 1,
                min: 0,
                max: 15,
                step: 1,
                default: 1,
                description: '频率下限: 10^{n} Hz (n=1 → 10 Hz)'
            },
            {
                name: 'freqMaxExp',
                label: '频率上限 (10^n)',
                unit: '',
                value: 16,
                min: 3,
                max: 22,
                step: 1,
                default: 16,
                description: '频率上限: 10^{n} Hz (n=16 → 10 PHz)'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                default: 1,
                description: '静态场景, 仅决定图表显示刷新'
            }
        ],
        buildProblem: params => {
            const freqMin = Math.pow(10, params['freqMinExp'] ?? 1);
            const freqMax = Math.pow(10, params['freqMaxExp'] ?? 16);
            const duration = params['duration'] ?? 1;
            return {
                id: `emSpec-${Date.now()}`,
                title: '电磁波谱 (频段分布)',
                model: 'em-spectrum',
                bodies: [
                    { id: 'probe', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    emSpectrum: { freqMin, freqMax, highlightBand: 'visible' }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 400, duration / 100)
            };
        }
    },

    {
        id: 'hall-effect',
        name: '霍尔元件 (VH-IS)',
        model: 'hall-effect' as const,
        parameters: [
            {
                name: 'current',
                label: '控制电流 I',
                unit: 'A',
                value: 1,
                min: 0,
                max: 100,
                step: 0.1,
                default: 1,
                description: '霍尔元件控制电流 I'
            },
            {
                name: 'magneticField',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.3,
                min: 0.001,
                max: 5,
                step: 0.01,
                default: 0.3,
                description: '垂直于元件表面的磁场 B'
            },
            {
                name: 'chargeDensity',
                label: '载流子浓度 n',
                unit: 'm^-3',
                value: 1e22,
                min: 1e18,
                max: 1e28,
                step: 1e20,
                default: 1e22,
                description: '半导体载流子浓度 n'
            },
            {
                name: 'thickness',
                label: '元件厚度 t',
                unit: 'm',
                value: 0.001,
                min: 1e-7,
                max: 0.01,
                step: 1e-4,
                default: 0.001,
                description: '霍尔元件厚度 t (m)'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                default: 1,
                description: '静态场景显示时长'
            }
        ],
        buildProblem: params => {
            const current = params['current'] ?? 1;
            const magneticField = params['magneticField'] ?? 0.3;
            const chargeDensity = params['chargeDensity'] ?? 1e22;
            const thickness = params['thickness'] ?? 0.001;
            const duration = params['duration'] ?? 1;
            return {
                id: `hall-${Date.now()}`,
                title: '霍尔元件 (VH-IS)',
                model: 'hall-effect',
                bodies: [
                    {
                        id: 'element',
                        mass: { value: 0.01, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    hallEffect: { current, magneticField, chargeDensity, thickness, carrierType: 'electron' }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 200)
            };
        }
    },

    {
        id: 'reed-switch',
        name: '干簧管 (磁控开关)',
        model: 'reed-switch' as const,
        parameters: [
            {
                name: 'magnetDistance',
                label: '磁铁到干簧管距离 d',
                unit: 'mm',
                value: 5,
                min: 0.1,
                max: 100,
                step: 0.1,
                default: 5,
                description: '磁体与干簧管间距 d'
            },
            {
                name: 'pullInThreshold',
                label: '吸合阈值 H_pull',
                unit: 'mT',
                value: 50,
                min: 5,
                max: 200,
                step: 1,
                default: 50,
                description: '吸合磁场阈值 (mT)'
            },
            {
                name: 'releaseThreshold',
                label: '释放阈值 H_rel',
                unit: 'mT',
                value: 30,
                min: 5,
                max: 200,
                step: 1,
                default: 30,
                description: '释放磁场阈值 (mT)'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                default: 1,
                description: '静态场景显示'
            }
        ],
        buildProblem: params => {
            const magnetDistance = params['magnetDistance'] ?? 5;
            const pullInThreshold = params['pullInThreshold'] ?? 50;
            const releaseThreshold = params['releaseThreshold'] ?? 30;
            const duration = params['duration'] ?? 1;
            return {
                id: `reed-${Date.now()}`,
                title: '干簧管 (磁控开关)',
                model: 'reed-switch',
                bodies: [
                    {
                        id: 'reed',
                        mass: { value: 0.001, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    reedSwitch: { mode: 'magnetic', magnetDistance, pullInThreshold, releaseThreshold }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
        id: 'photoresistor',
        name: '光敏电阻 (R-L特性)',
        model: 'photoresistor' as const,
        parameters: [
            {
                name: 'darkResistance',
                label: '暗电阻 R_dark',
                unit: 'Ohm',
                value: 1e6,
                min: 1e3,
                max: 1e9,
                step: 1e5,
                default: 1e6,
                description: '无光照时的暗电阻 (Ω)'
            },
            {
                name: 'sensitivity',
                label: '灵敏度 k',
                unit: '1/lx',
                value: 2e-3,
                min: 1e-5,
                max: 0.1,
                step: 1e-4,
                default: 2e-3,
                description: '指数灵敏度系数 k'
            },
            {
                name: 'lightIntensity',
                label: '工作点光照度 E',
                unit: 'lx',
                value: 100,
                min: 0.1,
                max: 1e5,
                step: 10,
                default: 100,
                description: '当前光照度 E (图亮度单位)'
            },
            {
                name: 'temperature',
                label: '环境温度 T',
                unit: '°C',
                value: 25,
                min: -20,
                max: 80,
                step: 1,
                default: 25,
                description: '环境温度 (℃)'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 5,
                min: 0.5,
                max: 30,
                step: 0.5,
                default: 5,
                description: '仿真总时长'
            }
        ],
        buildProblem: params => {
            const darkResistance = params['darkResistance'] ?? 1e6;
            const sensitivity = params['sensitivity'] ?? 2e-3;
            const lightIntensity = params['lightIntensity'] ?? 100;
            const temperatureCelsius = params['temperature'] ?? 25;
            const duration = params['duration'] ?? 5;
            return {
                id: `photo-${Date.now()}`,
                title: '光敏电阻 (R-L特性)',
                model: 'photoresistor',
                bodies: [
                    { id: 'ldr', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    photoresistor: { darkResistance, sensitivity, lightIntensity, temperatureCelsius }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 300)
            };
        }
    },

    {
        id: 'thermistor',
        name: '热敏电阻 (R-T特性)',
        model: 'thermistor' as const,
        parameters: [
            {
                name: 'temperature',
                label: '当前温度 T',
                unit: 'K',
                value: 300,
                min: 200,
                max: 600,
                step: 1,
                default: 300,
                description: '热敏电阻工作温度 (K)'
            },
            {
                name: 'R0',
                label: '基准电阻 R₀',
                unit: 'Ω',
                value: 1e4,
                min: 1,
                max: 1e6,
                step: 100,
                default: 1e4,
                description: 'T₀=298 K 时的基准电阻'
            },
            {
                name: 'BValue',
                label: '材料常数 B',
                unit: 'K',
                value: 3950,
                min: 1000,
                max: 6000,
                step: 100,
                default: 3950,
                description: 'NTC B 常数'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                default: 1,
                description: '静态场景显示'
            }
        ],
        buildProblem: params => {
            const temperature = params['temperature'] ?? 300;
            const R0 = params['R0'] ?? 1e4;
            const BValue = params['BValue'] ?? 3950;
            const duration = params['duration'] ?? 1;
            return {
                id: `therm-${Date.now()}`,
                title: '热敏电阻 (R-T特性)',
                model: 'thermistor',
                bodies: [
                    {
                        id: 'thermBody',
                        mass: { value: 0.01, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    thermistor: { temperature, mode: 'NTC', R0, BValue }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 200)
            };
        }
    },

    {
        id: 'strain-gauge',
        name: '电阻应变片 (惠斯通电桥)',
        model: 'strain-gauge' as const,
        parameters: [
            {
                name: 'strain',
                label: '应变 ε',
                unit: 'με',
                value: 1000,
                min: -5000,
                max: 5000,
                step: 50,
                default: 1000,
                description: '当前应变 (微应变单位)'
            },
            {
                name: 'gaugeFactor',
                label: '灵敏系数 K',
                unit: '',
                value: 2.1,
                min: 1,
                max: 200,
                step: 0.1,
                default: 2.1,
                description: '应变片灵敏系数 K (金属~2, 半导体~100)'
            },
            {
                name: 'bridgeVoltage',
                label: '桥路供电 U_K',
                unit: 'V',
                value: 5,
                min: 0.5,
                max: 30,
                step: 0.5,
                default: 5,
                description: '惠斯通电桥供电电压'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                default: 1,
                description: '静态场景显示'
            }
        ],
        buildProblem: params => {
            const strain = params['strain'] ?? 1000;
            const gaugeFactor = params['gaugeFactor'] ?? 2.1;
            const bridgeVoltage = params['bridgeVoltage'] ?? 5;
            const duration = params['duration'] ?? 1;
            return {
                id: `strain-${Date.now()}`,
                title: '电阻应变片 (惠斯通电桥)',
                model: 'strain-gauge',
                bodies: [
                    {
                        id: 'element',
                        mass: { value: 0.1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: {
                    strainGauge: { strain, gaugeFactor, bridgeVoltage }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 200)
            };
        }
    },

    {
        id: 'security-alarm',
        name: '门窗防盗报警 (磁控)',
        model: 'security-alarm' as const,
        parameters: [
            {
                name: 'magnetDistance',
                label: '磁体到干簧管距离 d',
                unit: 'mm',
                value: 5,
                min: 0,
                max: 300,
                step: 1,
                default: 5,
                description: '磁体与干簧管的间距'
            },
            {
                name: 'operateDistance',
                label: '吸合距离 d_operate',
                unit: 'mm',
                value: 15,
                min: 1,
                max: 50,
                step: 1,
                default: 15,
                description: '吸合距离阈值'
            },
            {
                name: 'releaseDistance',
                label: '释放距离 d_release',
                unit: 'mm',
                value: 25,
                min: 5,
                max: 50,
                step: 1,
                default: 25,
                description: '释放距离阈值'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
                default: 1,
                description: '静态场景显示'
            }
        ],
        buildProblem: params => {
            const magnetDistance = params['magnetDistance'] ?? 5;
            const operateDistance = params['operateDistance'] ?? 15;
            const releaseDistance = params['releaseDistance'] ?? 25;
            const duration = params['duration'] ?? 1;
            const doorState: 'closed' | 'open' = magnetDistance <= operateDistance ? 'closed' : 'open';
            return {
                id: `sec-${Date.now()}`,
                title: '门窗防盗报警 (磁控)',
                model: 'security-alarm',
                bodies: [
                    { id: 'door', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    securityAlarm: { doorState, magnetDistance, operateDistance, releaseDistance }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
        id: 'light-control-switch',
        name: '光控开关 (光敏+继电器)',
        model: 'light-control-switch' as const,
        parameters: [
            {
                name: 'lightIntensity',
                label: '当前光照度 L',
                unit: 'lx',
                value: 0.5,
                min: 0.01,
                max: 1e5,
                step: 0.5,
                default: 0.5,
                description: '当前环境光照强度 (夜晚~0.5 lx, 白天~50000 lx)'
            },
            {
                name: 'threshold',
                label: '触发阈值 L_th',
                unit: 'lx',
                value: 10,
                min: 0.1,
                max: 1e3,
                step: 1,
                default: 10,
                description: '路灯开关翻转阈值'
            },
            {
                name: 'Rfix',
                label: '分压电阻 R_fix',
                unit: 'Ω',
                value: 10000,
                min: 100,
                max: 1e6,
                step: 1000,
                default: 10000,
                description: '分压电路中固定电阻值'
            },
            {
                name: 'Esupply',
                label: '电源电压 E',
                unit: 'V',
                value: 12,
                min: 5,
                max: 24,
                step: 1,
                default: 12,
                description: '分压电路供电电压 E'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 'h',
                value: 24,
                min: 1,
                max: 48,
                step: 1,
                default: 24,
                description: '仿真总时长 (模拟 24h 光照变化)'
            }
        ],
        buildProblem: params => {
            const lightIntensity = params['lightIntensity'] ?? 0.5;
            const threshold = params['threshold'] ?? 10;
            const Rfix = params['Rfix'] ?? 10000;
            const Esupply = params['Esupply'] ?? 12;
            const durationH = params['duration'] ?? 24;
            return {
                id: `lcs-${Date.now()}`,
                title: '光控开关 (光敏+继电器)',
                model: 'light-control-switch',
                bodies: [
                    { id: 'lamp', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    lightControlSwitch: {
                        lightIntensity,
                        threshold,
                        Rfix,
                        Esupply,
                        VbeOn: 0.7,
                        Rdark: 1e6,
                        Rbright: 5000,
                        timeSpanH: durationH,
                        sampleCount: 240
                    }
                },
                environment: {},
                timeConfig: makeTimeSeries(durationH * 3600, 240)
            };
        }
    },

    {
        id: 'capacitor-charge',
        name: '电容充放电 (RC 暂态电路)',
        model: 'capacitor-charge' as const,
        parameters: [
            {
                name: 'resistance',
                label: '电阻 R',
                unit: 'Ω',
                value: 1000,
                min: 1,
                max: 1e6,
                step: 100,
                default: 1000,
                description: '回路电阻'
            },
            {
                name: 'capacitance',
                label: '电容 C',
                unit: 'μF',
                value: 100,
                min: 0.001,
                max: 1000,
                step: 1,
                default: 100,
                description: '电容值 (μF)'
            },
            {
                name: 'emf',
                label: '电动势 E',
                unit: 'V',
                value: 10,
                min: 0.1,
                max: 100,
                step: 0.5,
                default: 10,
                description: '电源电动势'
            },
            {
                name: 'mode',
                label: '充/放电 (0=充电, 1=放电)',
                unit: '',
                value: 0,
                min: 0,
                max: 1,
                step: 1,
                default: 0,
                description: '充电: Uc 从 0 升到 E; 放电: Uc 从 E 降到 0'
            },
            {
                name: 'duration',
                label: '模拟时长 (5τ)',
                unit: 's',
                value: 5,
                min: 2,
                max: 20,
                step: 0.5,
                default: 5,
                description: '仿真总时长 (对应 5τ)'
            }
        ],
        buildProblem: params => {
            const resistance = params['resistance'] ?? 1000;
            const capacitanceMuF = params['capacitance'] ?? 100;
            const capacitance = capacitanceMuF * 1e-6;
            const emf = params['emf'] ?? 10;
            const modeNum = params['mode'] ?? 0;
            const mode = modeNum >= 1 ? ('discharge' as const) : ('charge' as const);
            const duration = params['duration'] ?? 5;
            return {
                id: `capacitor-charge-${Date.now()}`,
                title: '电容充放电 (RC 暂态电路)',
                model: 'capacitor-charge' as const,
                bodies: [],
                constraints: { capacitor: { resistance, capacitance, emf, mode } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'parallel-plate-capacitor',
        name: '平行板电容器因素 (C=εr·S/4πkd)',
        model: 'parallel-plate-capacitor' as const,
        parameters: [
            {
                name: 'area',
                label: '极板面积 S',
                unit: 'm²',
                value: 0.01,
                min: 1e-4,
                max: 1,
                step: 1e-4,
                default: 0.01,
                description: '极板面积'
            },
            {
                name: 'distance',
                label: '极板距离 d',
                unit: 'mm',
                value: 1,
                min: 0.01,
                max: 10,
                step: 0.01,
                default: 1,
                description: '极板间距 (mm)'
            },
            {
                name: 'epsilonR',
                label: '相对介电常数 εr',
                unit: '',
                value: 3,
                min: 1,
                max: 100,
                step: 1,
                default: 3,
                description: '介质相对介电常数 (空气≈1)'
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
            const area = params['area'] ?? 0.01;
            const distanceMm = params['distance'] ?? 1;
            const distance = distanceMm / 1000;
            const epsilonR = params['epsilonR'] ?? 3;
            const duration = params['duration'] ?? 5;
            return {
                id: `parallel-plate-capacitor-${Date.now()}`,
                title: '平行板电容器因素',
                model: 'parallel-plate-capacitor' as const,
                bodies: [],
                constraints: { parallelPlate: { area, distance, epsilonR } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'load-voltage',
        name: '路端电压与负载 (U=E−Ir)',
        model: 'load-voltage' as const,
        parameters: [
            {
                name: 'emf',
                label: '电动势 E',
                unit: 'V',
                value: 12,
                min: 0.1,
                max: 50,
                step: 0.5,
                default: 12,
                description: '电源电动势'
            },
            {
                name: 'internalResistance',
                label: '内阻 r',
                unit: 'Ω',
                value: 2,
                min: 0,
                max: 100,
                step: 0.5,
                default: 2,
                description: '电源内阻'
            },
            {
                name: 'loadRMin',
                label: '负载电阻下限',
                unit: 'Ω',
                value: 1,
                min: 0.1,
                max: 100,
                step: 0.5,
                default: 1,
                description: '负载扫描范围下限'
            },
            {
                name: 'loadRMax',
                label: '负载电阻上限',
                unit: 'kΩ',
                value: 10,
                min: 0.01,
                max: 100,
                step: 0.5,
                default: 10,
                description: '负载扫描范围上限 (kΩ)'
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
            const emf = params['emf'] ?? 12;
            const internalResistance = params['internalResistance'] ?? 2;
            const loadRMin = params['loadRMin'] ?? 1;
            const loadRMax = (params['loadRMax'] ?? 10) * 1000;
            const duration = params['duration'] ?? 5;
            return {
                id: `load-voltage-${Date.now()}`,
                title: '路端电压与负载',
                model: 'load-voltage' as const,
                bodies: [],
                constraints: { loadVoltage: { emf, internalResistance, loadRange: [loadRMin, loadRMax] } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'resistance-law',
        name: '电阻定律 (R=ρ·L/S)',
        model: 'resistance-law' as const,
        parameters: [
            {
                name: 'length',
                label: '导线长度 L',
                unit: 'm',
                value: 1,
                min: 0.01,
                max: 100,
                step: 0.01,
                default: 1,
                description: '导线长度'
            },
            {
                name: 'diameter',
                label: '导线直径 d',
                unit: 'mm',
                value: 1,
                min: 0.1,
                max: 10,
                step: 0.1,
                default: 1,
                description: '导线直径 (mm)'
            },
            {
                name: 'material',
                label: '材料 (0=铜 1=铁 2=镍铬)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: '导体材料'
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
            const length = params['length'] ?? 1;
            const diameter = params['diameter'] ?? 1;
            const matNum = params['material'] ?? 0;
            const material = (matNum === 1 ? 'Fe' : matNum === 2 ? 'Nichrome' : 'Cu') as 'Cu' | 'Fe' | 'Nichrome';
            const duration = params['duration'] ?? 5;
            return {
                id: `resistance-law-${Date.now()}`,
                title: '电阻定律',
                model: 'resistance-law' as const,
                bodies: [],
                constraints: { resistanceLaw: { length, diameter, material } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'coulomb-force-explore',
        name: '探究电荷间作用力 (库仑定律)',
        model: 'coulomb-force-explore' as const,
        parameters: [
            {
                name: 'q1',
                label: '电荷 q₁',
                unit: 'μC',
                value: 1,
                min: 0.01,
                max: 100,
                step: 0.1,
                default: 1,
                description: '电荷 1 电量'
            },
            {
                name: 'q2',
                label: '电荷 q₂',
                unit: 'μC',
                value: 1,
                min: 0.01,
                max: 100,
                step: 0.1,
                default: 1,
                description: '电荷 2 电量'
            },
            {
                name: 'distance',
                label: '间距 r',
                unit: 'cm',
                value: 5,
                min: 0.1,
                max: 200,
                step: 0.5,
                default: 5,
                description: '两电荷间距'
            },
            {
                name: 'mode',
                label: '探究模式 (0=改变q, 1=改变r)',
                unit: '',
                value: 0,
                min: 0,
                max: 1,
                step: 1,
                default: 0,
                description: 'varyQ: 固定 r 改 q; varyR: 固定 q 改 r'
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
            const q1 = params['q1'] ?? 1;
            const q2 = params['q2'] ?? 1;
            const distance = params['distance'] ?? 5;
            const modeNum = params['mode'] ?? 0;
            const mode = modeNum >= 1 ? ('varyR' as const) : ('varyQ' as const);
            const duration = params['duration'] ?? 5;
            return {
                id: `coulomb-force-explore-${Date.now()}`,
                title: '探究电荷间作用力',
                model: 'coulomb-force-explore' as const,
                bodies: [],
                constraints: { coulombForce: { q1, q2, distance, mode } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'electroscope',
        name: '验电器 (箔片张角 vs 电量)',
        model: 'electroscope' as const,
        parameters: [
            {
                name: 'charge',
                label: '带电量 q',
                unit: 'μC',
                value: 1,
                min: 0.01,
                max: 50,
                step: 0.1,
                default: 1,
                description: '验电器带电量'
            },
            {
                name: 'foilLength',
                label: '箔片长度 L',
                unit: 'cm',
                value: 5,
                min: 1,
                max: 20,
                step: 0.5,
                default: 5,
                description: '箔片长度 (cm)'
            },
            {
                name: 'foilMass',
                label: '箔片质量 m',
                unit: 'g',
                value: 1,
                min: 0.01,
                max: 10,
                step: 0.01,
                default: 1,
                description: '箔片质量 (g)'
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
            const charge = params['charge'] ?? 1;
            const foilLength = params['foilLength'] ?? 5;
            const foilMass = params['foilMass'] ?? 1;
            const duration = params['duration'] ?? 5;
            return {
                id: `electroscope-${Date.now()}`,
                title: '验电器',
                model: 'electroscope' as const,
                bodies: [],
                constraints: { electroscope: { charge, foilLength, foilMass } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'electrostatic-induction',
        name: '静电感应 (近/远端感应电荷)',
        model: 'electrostatic-induction' as const,
        parameters: [
            {
                name: 'chargeC',
                label: '带电体 C 电量',
                unit: 'μC',
                value: 1,
                min: 0.01,
                max: 100,
                step: 0.1,
                default: 1,
                description: '外部带电体电量'
            },
            {
                name: 'separation',
                label: 'A/B 间隙',
                unit: 'cm',
                value: 2,
                min: 0.1,
                max: 30,
                step: 0.5,
                default: 2,
                description: '两导体间隙 (cm)'
            },
            {
                name: 'distanceAC',
                label: 'A 到 C 的距离',
                unit: 'cm',
                value: 10,
                min: 0.5,
                max: 100,
                step: 0.5,
                default: 10,
                description: '导体 A 左端到 C 的距离'
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
            const chargeC = params['chargeC'] ?? 1;
            const separation = params['separation'] ?? 2;
            const distanceAC = params['distanceAC'] ?? 10;
            const duration = params['duration'] ?? 5;
            return {
                id: `electrostatic-induction-${Date.now()}`,
                title: '静电感应',
                model: 'electrostatic-induction' as const,
                bodies: [],
                constraints: { electrostaticInduction: { chargeC, separation, distanceAC } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'electrostatic-shielding',
        name: '静电屏蔽 (接地 vs 不接地)',
        model: 'electrostatic-shielding' as const,
        parameters: [
            {
                name: 'externalField',
                label: '外部电场 E',
                unit: 'V/m',
                value: 500,
                min: 0,
                max: 1000,
                step: 10,
                default: 500,
                description: '外部电场强度'
            },
            {
                name: 'cavityCharge',
                label: '空腔电荷',
                unit: 'μC',
                value: 0,
                min: 0,
                max: 10,
                step: 0.1,
                default: 0,
                description: '空腔内电荷 (μC)'
            },
            {
                name: 'isGrounded',
                label: '接地 (0=不接地 1=接地)',
                unit: '',
                value: 1,
                min: 0,
                max: 1,
                step: 1,
                default: 1,
                description: '导体是否接地'
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
            const externalField = params['externalField'] ?? 500;
            const cavityCharge = params['cavityCharge'] ?? 0;
            const isGrounded = (params['isGrounded'] ?? 1) >= 1;
            const duration = params['duration'] ?? 5;
            return {
                id: `electrostatic-shielding-${Date.now()}`,
                title: '静电屏蔽',
                model: 'electrostatic-shielding' as const,
                bodies: [],
                constraints: { electrostaticShielding: { externalField, cavityCharge, isGrounded } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
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
    },

    {
        id: 'ampere-force',
        name: '安培力因素 (F=BIL·sinθ)',
        model: 'ampere-force' as const,
        parameters: [
            {
                name: 'B',
                label: '磁感应强度 B',
                unit: 'T',
                value: 0.5,
                min: 0.01,
                max: 5,
                step: 0.01,
                default: 0.5,
                description: '匀强磁场强度'
            },
            {
                name: 'I',
                label: '电流 I',
                unit: 'A',
                value: 2,
                min: 0,
                max: 20,
                step: 0.1,
                default: 2,
                description: '导线电流'
            },
            {
                name: 'L',
                label: '导线长度 L',
                unit: 'm',
                value: 0.2,
                min: 0.01,
                max: 2,
                step: 0.01,
                default: 0.2,
                description: '导线有效长度'
            },
            {
                name: 'angle',
                label: '导线与磁场夹角 θ',
                unit: '°',
                value: 30,
                min: 0,
                max: 90,
                step: 1,
                default: 30,
                description: '电流与磁场夹角'
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
            const B = params['B'] ?? 0.5;
            const I = params['I'] ?? 2;
            const L = params['L'] ?? 0.2;
            const angle = params['angle'] ?? 30;
            const duration = params['duration'] ?? 5;
            return {
                id: `ampere-force-${Date.now()}`,
                title: '安培力因素',
                model: 'ampere-force' as const,
                bodies: [],
                constraints: { ampereForce: { B, I, L, angle } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'em-wave-hertz',
        name: '赫兹电磁波实验 (LC振荡+驻波)',
        model: 'em-wave-hertz' as const,
        parameters: [
            {
                name: 'frequency',
                label: '振荡频率 f',
                unit: 'MHz',
                value: 100,
                min: 0.01,
                max: 300,
                step: 0.5,
                default: 100,
                description: 'LC 振荡频率 (MHz)'
            },
            {
                name: 'turns',
                label: '线圈匝数 N',
                unit: '匝',
                value: 10,
                min: 1,
                max: 100,
                step: 1,
                default: 10,
                description: '接收线圈匝数'
            },
            {
                name: 'sparkGap',
                label: '火花间隙',
                unit: 'mm',
                value: 1,
                min: 0.1,
                max: 10,
                step: 0.1,
                default: 1,
                description: '振子火花间隙 (mm)'
            },
            {
                name: 'distance',
                label: '接收端距离 d',
                unit: 'm',
                value: 5,
                min: 0.5,
                max: 100,
                step: 0.5,
                default: 5,
                description: '接收端到发射端距离'
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
            const frequency = (params['frequency'] ?? 100) * 1e6;
            const turns = params['turns'] ?? 10;
            const sparkGap = params['sparkGap'] ?? 1;
            const distance = params['distance'] ?? 5;
            const duration = params['duration'] ?? 5;
            return {
                id: `em-wave-hertz-${Date.now()}`,
                title: '赫兹电磁波实验',
                model: 'em-wave-hertz' as const,
                bodies: [],
                constraints: { hertzExperiment: { frequency, turns, sparkGap, distance } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'multimeter-tool',
        name: '多用电表 (选档读数)',
        model: 'multimeter' as const,
        parameters: [
            {
                name: 'mode',
                label: '档位 (0=DCV 1=ACV 2=Ohm 3=DCA)',
                unit: '',
                value: 0,
                min: 0,
                max: 3,
                step: 1,
                default: 0,
                description: '0=直流电压; 1=交流电压; 2=欧姆档; 3=直流电流'
            },
            {
                name: 'range',
                label: '量程',
                unit: '',
                value: 10,
                min: 0.001,
                max: 1e6,
                step: 0.001,
                default: 10,
                description: '量程设置值 (V/Ω/A 取决于档位)'
            },
            {
                name: 'testValue',
                label: '被测量值',
                unit: '',
                value: 4.5,
                min: 0,
                max: 1e6,
                step: 0.1,
                default: 4.5,
                description: '被测量的真实值 (与量程同单位)'
            },
            {
                name: 'duration',
                label: '动画时长',
                unit: 's',
                value: 3,
                min: 0.5,
                max: 10,
                step: 0.5,
                default: 3,
                description: '动画播放时长'
            }
        ],
        buildProblem: params => {
            const modeIdx = Math.round(params['mode'] ?? 0);
            const modes = ['DCV', 'ACV', 'Ohm', 'DCA'] as const;
            const mode = modes[modeIdx] ?? 'DCV';
            const range = params['range'] ?? 10;
            const testValue = params['testValue'] ?? 4.5;
            const duration = params['duration'] ?? 3;
            return {
                id: `multimeter-tool-${Date.now()}`,
                title: '多用电表 (选档读数)',
                model: 'multimeter' as const,
                bodies: [],
                constraints: { multimeter: { mode, range, testValue } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 60)
            };
        }
    },

    {
        id: 'vernier-caliper-tool',
        name: '游标卡尺读数',
        model: 'vernier-caliper' as const,
        parameters: [
            {
                name: 'objectSize',
                label: '被测物体长度',
                unit: 'mm',
                value: 23.4,
                min: 1,
                max: 150,
                step: 0.1,
                default: 23.4,
                description: '被测物体实际长度 (L = 主尺 + K×1/N)'
            },
            {
                name: 'nType',
                label: '分度 (0=10 1=20 2=50)',
                unit: '',
                value: 1,
                min: 0,
                max: 2,
                step: 1,
                default: 1,
                description: '10分度=0.1mm; 20分度=0.05mm; 50分度=0.02mm'
            },
            {
                name: 'duration',
                label: '动画时长',
                unit: 's',
                value: 3,
                min: 0.5,
                max: 10,
                step: 0.5,
                default: 3,
                description: '动画播放时长'
            }
        ],
        buildProblem: params => {
            const objectSize = params['objectSize'] ?? 23.4;
            const nTypeIdx = Math.round(params['nType'] ?? 1);
            const nTypes = [10, 20, 50] as const;
            const nType = nTypes[nTypeIdx] ?? 20;
            const duration = params['duration'] ?? 3;
            return {
                id: `vernier-caliper-tool-${Date.now()}`,
                title: '游标卡尺读数',
                model: 'vernier-caliper' as const,
                bodies: [],
                constraints: { vernierCaliper: { objectSize, nType } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 60)
            };
        }
    },

    {
        id: 'micrometer-tool',
        name: '螺旋测微器读数',
        model: 'micrometer' as const,
        parameters: [
            {
                name: 'thickness',
                label: '被测物体厚度',
                unit: 'mm',
                value: 5.75,
                min: 0.01,
                max: 25,
                step: 0.01,
                default: 5.75,
                description: '被测物体厚度 (L = a + b + n×0.01 mm)'
            },
            {
                name: 'duration',
                label: '动画时长',
                unit: 's',
                value: 3,
                min: 0.5,
                max: 10,
                step: 0.5,
                default: 3,
                description: '动画播放时长'
            }
        ],
        buildProblem: params => {
            const thickness = params['thickness'] ?? 5.75;
            const duration = params['duration'] ?? 3;
            return {
                id: `micrometer-tool-${Date.now()}`,
                title: '螺旋测微器读数',
                model: 'micrometer' as const,
                bodies: [],
                constraints: { micrometer: { thickness } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 60)
            };
        }
    },

    {
        id: 'current-magnetic',
        name: '电流的磁场',
        model: 'current-magnetic-field',
        parameters: [
            {
                name: 'mode',
                label: '模式 (0直导线 1线圈 2螺线管)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: '0=通电直导线; 1=圆形线圈; 2=螺线管'
            },
            {
                name: 'current',
                label: '电流 I',
                unit: 'A',
                value: 5,
                min: -20,
                max: 20,
                step: 1,
                default: 5,
                description: '电流大小; 负号表示方向翻转 (入纸面)'
            },
            {
                name: 'turns',
                label: '匝数 N',
                unit: '',
                value: 10,
                min: 1,
                max: 50,
                step: 1,
                default: 10,
                description: '线圈/螺线管匝数'
            },
            {
                name: 'radius',
                label: '线圈半径 (场景)',
                unit: '',
                value: 0.6,
                min: 0.2,
                max: 1.0,
                step: 0.05,
                default: 0.6,
                description: '线圈半径 (归一化场景单位)'
            },
            {
                name: 'duration',
                label: '动画时长',
                unit: 's',
                value: 5,
                min: 1,
                max: 10,
                step: 0.5,
                default: 5,
                description: '动画播放时长'
            }
        ],
        buildProblem: params => {
            const modeNum = Math.round(params['mode'] ?? 0);
            const mode: 'straight-wire' | 'coil' | 'solenoid' =
                modeNum === 2 ? 'solenoid' : modeNum === 1 ? 'coil' : 'straight-wire';
            const current = params['current'] ?? 5;
            const turns = Math.round(params['turns'] ?? 10);
            const radius = params['radius'] ?? 0.6;
            const duration = params['duration'] ?? 5;
            return {
                id: `current-magnetic-${Date.now()}`,
                title: '电流的磁场',
                model: 'current-magnetic-field' as const,
                bodies: [],
                constraints: {
                    currentMagneticField: { mode, current, turns, radius, steps: 600, maxLength: 6, lineCount: 16 }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 50)
            };
        }
    },

    {
        id: 'efield-lines',
        name: '电场线分布',
        model: 'electric-field-lines',
        parameters: [
            {
                name: 'mode',
                label: '模式 (0点电荷 1偶极 2平行板)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: '0=点电荷; 1=电偶极; 2=平行板电容器'
            },
            {
                name: 'q',
                label: '点电荷电量 q',
                unit: 'nC',
                value: 5,
                min: 1,
                max: 10,
                step: 0.5,
                default: 5,
                description: '点电荷模式下的正电荷量'
            },
            {
                name: 'dipoleCharge',
                label: '偶极电荷量',
                unit: 'nC',
                value: 5,
                min: 1,
                max: 10,
                step: 0.5,
                default: 5,
                description: '电偶极模式下的 ±q 大小'
            },
            {
                name: 'dipoleSeparation',
                label: '偶极间距 (场景)',
                unit: '',
                value: 1.0,
                min: 0.4,
                max: 2.0,
                step: 0.1,
                default: 1.0,
                description: '电偶极两电荷间距 (归一化场景单位)'
            },
            {
                name: 'plateVoltage',
                label: '平行板电压 U',
                unit: 'V',
                value: 12,
                min: 1,
                max: 50,
                step: 1,
                default: 12,
                description: '平行板模式下的极板电压'
            },
            {
                name: 'plateGap',
                label: '平行板间距 (场景)',
                unit: '',
                value: 1.2,
                min: 0.4,
                max: 2.0,
                step: 0.1,
                default: 1.2,
                description: '平行板两板间距 (归一化场景单位)'
            },
            {
                name: 'duration',
                label: '动画时长',
                unit: 's',
                value: 5,
                min: 1,
                max: 10,
                step: 0.5,
                default: 5,
                description: '动画播放时长'
            }
        ],
        buildProblem: params => {
            const modeNum = Math.round(params['mode'] ?? 0);
            const mode: 'point-charge' | 'dipole' | 'parallel-plate' =
                modeNum === 2 ? 'parallel-plate' : modeNum === 1 ? 'dipole' : 'point-charge';
            const q = params['q'] ?? 5;
            const dipoleCharge = params['dipoleCharge'] ?? 5;
            const dipoleSeparation = params['dipoleSeparation'] ?? 1.0;
            const plateVoltage = params['plateVoltage'] ?? 12;
            const plateGap = params['plateGap'] ?? 1.2;
            const duration = params['duration'] ?? 5;
            const constraints: {
                mode: 'point-charge' | 'dipole' | 'parallel-plate';
                charges?: Array<{ x: number; y: number; q: number }>;
                dipoleCharge?: number;
                dipoleSeparation?: number;
                plateVoltage?: number;
                plateGap?: number;
                plateLength?: number;
                steps?: number;
                maxLength?: number;
                lineCount?: number;
            } = { mode, steps: 600, maxLength: 6, lineCount: 16 };
            if (mode === 'point-charge') {
                constraints.charges = [{ x: 0, y: 0, q }];
            } else if (mode === 'dipole') {
                constraints.dipoleCharge = dipoleCharge;
                constraints.dipoleSeparation = dipoleSeparation;
            } else {
                constraints.plateVoltage = plateVoltage;
                constraints.plateGap = plateGap;
                constraints.plateLength = 2.0;
            }
            return {
                id: `efield-lines-${Date.now()}`,
                title: '电场线分布',
                model: 'electric-field-lines' as const,
                bodies: [],
                constraints: { electricFieldLines: constraints },
                environment: {},
                timeConfig: makeTimeSeries(duration, 50)
            };
        }
    },

    {
        id: 'bulb-vi',
        name: '小灯泡伏安特性',
        model: 'circuit',
        parameters: [
            {
                name: 'emf',
                label: '电动势 E',
                unit: 'V',
                value: 12,
                min: 1,
                max: 36,
                step: 0.5,
                default: 12,
                description: '电源电动势'
            },
            {
                name: 'r',
                label: '内阻 r',
                unit: 'Ω',
                value: 1,
                min: 0,
                max: 10,
                step: 0.1,
                default: 1,
                description: '电源内阻'
            },
            {
                name: 'R_bulb',
                label: '灯泡冷态电阻 R₀',
                unit: 'Ω',
                value: 10,
                min: 1,
                max: 50,
                step: 0.5,
                default: 10,
                description: '小灯泡冷态电阻 (温度系数 α=0.01)'
            },
            {
                name: 'duration',
                label: '动画时长',
                unit: 's',
                value: 3,
                min: 1,
                max: 10,
                step: 0.5,
                default: 3,
                description: '动画播放时长'
            }
        ],
        buildProblem: params => {
            const emf = params['emf'] ?? 12;
            const r = params['r'] ?? 1;
            const R_bulb = params['R_bulb'] ?? 10;
            const duration = params['duration'] ?? 3;
            return {
                id: `bulb-vi-${Date.now()}`,
                title: '小灯泡伏安特性',
                model: 'circuit' as const,
                bodies: [
                    { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    circuit: { emf, internalResistance: r, resistors: [{ resistance: R_bulb, connection: 'series' }] }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 10, 0.1)
            };
        }
    }
];
