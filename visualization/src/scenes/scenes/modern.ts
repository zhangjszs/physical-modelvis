import { makeTimeSeries } from '../../utils/timeSeries.js';
import type { SceneConfig } from '../../types/visualization';

/**
 * 近代物理/原子核/实验 (选必三 + 选必一实验)
 * 共 14 个 SceneConfig
 */
export const ModernScenes: SceneConfig[] = [
    {
        id: 'photoelectric',
        name: '光电效应 (爱因斯坦方程)',
        model: 'photoelectric',
        parameters: [
            {
                name: 'W0',
                label: '逸出功 W₀',
                unit: 'eV',
                value: 2.3,
                min: 1,
                max: 6,
                step: 0.05,
                default: 2.3,
                description: '金属逸出功 (钠≈2.28, 钾≈2.3, 锌≈4.3, 铜≈4.7)'
            },
            {
                name: 'nuMin',
                label: '起始频率 ν_min',
                unit: 'THz',
                value: 300,
                min: 100,
                max: 1500,
                step: 50,
                default: 300,
                description: '入射光频率范围下限'
            },
            {
                name: 'nuMax',
                label: '终止频率 ν_max',
                unit: 'THz',
                value: 1500,
                min: 500,
                max: 5000,
                step: 50,
                default: 1500,
                description: '入射光频率范围上限'
            }
        ],
        buildProblem: params => {
            const workFunction = params['W0'] ?? 2.3;
            const freqMinTHz = params['nuMin'] ?? Math.max(workFunction * 110, 100);
            const freqMaxTHz = params['nuMax'] ?? workFunction * 400;
            return {
                id: `photoelectric-${Date.now()}`,
                title: '光电效应 (爱因斯坦光电方程)',
                model: 'photoelectric' as const,
                bodies: [
                    {
                        id: 'electron',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { photoelectric: { workFunction, freqMinTHz, freqMaxTHz } },
                environment: {},
                timeConfig: makeTimeSeries(1, 10, 0.1)
            };
        }
    },

    {
        id: 'bohr',
        name: '玻尔氢原子模型 (能级与光谱)',
        model: 'bohr-model',
        parameters: [
            {
                name: 'seriesB',
                label: '线系 (0=赖曼 1=巴尔末 2=帕邢)',
                unit: '',
                value: 1,
                min: 0,
                max: 2,
                step: 1,
                default: 1,
                description: '0=赖曼系(紫外,n₁=1); 1=巴尔末系(可见,n₁=2); 2=帕邢系(红外,n₁=3)'
            },
            {
                name: 'maxN',
                label: '最大主量子数 n_max',
                unit: '',
                value: 6,
                min: 3,
                max: 10,
                step: 1,
                default: 6,
                description: '决定计算多少条谱线'
            }
        ],
        buildProblem: params => {
            const seriesNum = params['seriesB'] ?? 1;
            const series =
                seriesNum === 0 ? ('Lyman' as const) : seriesNum === 2 ? ('Paschen' as const) : ('Balmer' as const);
            const maxN = params['maxN'] ?? 6;
            return {
                id: `bohr-${Date.now()}`,
                title: '玻尔氢原子模型 (能级与发射光谱)',
                model: 'bohr-model' as const,
                bodies: [
                    {
                        id: 'electron',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { bohr: { series, maxN } },
                environment: {},
                timeConfig: makeTimeSeries(1, 10, 0.1)
            };
        }
    },

    {
        id: 'radioactive',
        name: '放射性衰变 (云室径迹)',
        model: 'radioactive-decay',
        parameters: [
            {
                name: 'N0',
                label: '初始原子数 N₀',
                unit: '个',
                value: 1000,
                min: 100,
                max: 10000,
                step: 100,
                default: 1000,
                description: '放射性核素初始原子数'
            },
            {
                name: 'halfLife',
                label: '半衰期 T₁/₂',
                unit: 's',
                value: 10,
                min: 0.1,
                max: 3600,
                step: 0.1,
                default: 10,
                description: '半衰期 (秒)'
            },
            {
                name: 'tEnd',
                label: '模拟时长',
                unit: 's',
                value: 50,
                min: 1,
                max: 10000,
                step: 1,
                default: 50,
                description: '模拟时间 (建议 ≥ 3×T₁/₂)'
            },
            {
                name: 'rayType',
                label: '射线 (0=α 1=β 2=γ)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: 'α=短直径迹; β=长弯径迹; γ=极少径迹'
            }
        ],
        buildProblem: params => {
            const initialAtoms = params['N0'] ?? 1000;
            const halfLife = params['halfLife'] ?? 10;
            const duration = params['tEnd'] ?? 5 * halfLife;
            const rayNum = params['rayType'] ?? 0;
            const radiationType =
                rayNum === 1 ? ('beta' as const) : rayNum === 2 ? ('gamma' as const) : ('alpha' as const);
            return {
                id: `radioactive-${Date.now()}`,
                title: '放射性衰变 (云室粒子径迹)',
                model: 'radioactive-decay' as const,
                bodies: [
                    { id: 'nuclei', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { radioactive: { initialAtoms, halfLife, duration, radiationType } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 300)
            };
        }
    },

    {
        id: 'micro-deformation',
        name: '光杠杆放大微小形变',
        model: 'micro-deformation',
        parameters: [
            {
                name: 'pressure',
                label: '桌面压力 F',
                unit: 'N',
                value: 100,
                min: 10,
                max: 500,
                step: 10,
                default: 100,
                description: '按压桌面的力 (模拟重物放在桌面上)'
            },
            {
                name: 'laserDist',
                label: '激光到镜面距离',
                unit: 'm',
                value: 1,
                min: 0.5,
                max: 3,
                step: 0.1,
                default: 1,
                description: '激光笔到平面镜的距离'
            },
            {
                name: 'mirrorDist',
                label: '镜面到投影屏距离 D',
                unit: 'm',
                value: 5,
                min: 1,
                max: 20,
                step: 0.5,
                default: 5,
                description: '反射光路越长, 放大效果越明显 (光杠杆放大)'
            },
            {
                name: 'youngModulus',
                label: '杨氏模量 E',
                unit: 'GPa',
                value: 10,
                min: 1,
                max: 200,
                step: 1,
                default: 10,
                description: '桌面材料的杨氏模量 (玻璃约 70GPa, 木材约 10GPa)'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 1,
                min: 0.5,
                max: 3,
                step: 0.1,
                default: 1,
                description: '静态场景 (该参数仅用于仿真框架)'
            }
        ],
        buildProblem: params => {
            const pressure = params['pressure'] ?? 100;
            const laserDist = params['laserDist'] ?? 1;
            const mirrorDist = params['mirrorDist'] ?? 5;
            const youngModulusGPa = params['youngModulus'] ?? 10;
            const duration = params['duration'] ?? 1;
            return {
                id: `micro-def-${Date.now()}`,
                title: '光杠杆放大微小形变',
                model: 'micro-deformation',
                bodies: [
                    { id: 'table', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    microDeformation: {
                        laserDist,
                        mirrorDist,
                        pressure,
                        youngModulus: youngModulusGPa * 1e9,
                        thickness: 0.05,
                        tableLength: 1
                    }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
        id: 'alpha-scattering',
        name: 'α 粒子散射实验',
        model: 'alpha-scattering' as const,
        parameters: [
            {
                name: 'alphaEnergy',
                label: 'α 粒子能量',
                unit: 'MeV',
                value: 5,
                min: 0.5,
                max: 15,
                step: 0.5,
                default: 5,
                description: 'α 粒子入射动能'
            },
            {
                name: 'targetZ',
                label: '靶核电荷数 Z',
                unit: '',
                value: 79,
                min: 1,
                max: 92,
                step: 1,
                default: 79,
                description: '靶核质子数 (金=79)'
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
            const alphaEnergy = params['alphaEnergy'] ?? 5;
            const targetZ = params['targetZ'] ?? 79;
            const duration = params['duration'] ?? 5;
            return {
                id: `alpha-scattering-${Date.now()}`,
                title: 'α 粒子散射实验',
                model: 'alpha-scattering' as const,
                bodies: [
                    { id: 'alpha', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { alphaScattering: { alphaEnergy, targetZ, foilThickness: 1e-6 } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'black-body',
        name: '黑体辐射',
        model: 'black-body' as const,
        parameters: [
            {
                name: 'temperature',
                label: '黑体温度',
                unit: 'K',
                value: 3000,
                min: 300,
                max: 10000,
                step: 100,
                default: 3000,
                description: '黑体绝对温度'
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
            const temperature = params['temperature'] ?? 3000;
            const duration = params['duration'] ?? 5;
            return {
                id: `black-body-${Date.now()}`,
                title: '黑体辐射',
                model: 'black-body' as const,
                bodies: [
                    { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { blackBody: { temperature } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'electron-diffraction',
        name: '电子衍射',
        model: 'electron-diffraction' as const,
        parameters: [
            {
                name: 'accVoltage',
                label: '加速电压',
                unit: 'V',
                value: 10000,
                min: 100,
                max: 50000,
                step: 100,
                default: 10000,
                description: '电子加速电压'
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
            const accVoltage = params['accVoltage'] ?? 10000;
            const duration = params['duration'] ?? 5;
            return {
                id: `electron-diffraction-${Date.now()}`,
                title: '电子衍射',
                model: 'electron-diffraction' as const,
                bodies: [
                    {
                        id: 'electron',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { electronDiffraction: { accVoltage, crystalLattice: 0.213 } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'radiation-deflection',
        name: '放射线磁场偏转',
        model: 'radiation-deflection' as const,
        parameters: [
            {
                name: 'Bfield',
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
                name: 'particleEnergy',
                label: '粒子动能',
                unit: 'MeV',
                value: 5,
                min: 0.1,
                max: 20,
                step: 0.1,
                default: 5,
                description: '粒子入射动能'
            },
            {
                name: 'particleType',
                label: '粒子类型 (0=α 1=β 2=γ)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: 'α=氦核, β=电子, γ=光子'
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
            const Bfield = params['Bfield'] ?? 0.5;
            const particleEnergy = params['particleEnergy'] ?? 5;
            const particleTypeNum = params['particleType'] ?? 0;
            const particleType =
                particleTypeNum === 1
                    ? ('beta' as const)
                    : particleTypeNum === 2
                      ? ('gamma' as const)
                      : ('alpha' as const);
            const duration = params['duration'] ?? 5;
            return {
                id: `radiation-deflection-${Date.now()}`,
                title: '放射线磁场偏转',
                model: 'radiation-deflection' as const,
                bodies: [
                    {
                        id: 'particle',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { radiationDeflection: { Bfield, particleEnergy, particleType } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'decay-statistics',
        name: '衰变统计规律',
        model: 'decay-statistics' as const,
        parameters: [
            {
                name: 'meanCount',
                label: '平均计数 N̄',
                unit: '',
                value: 50,
                min: 1,
                max: 200,
                step: 1,
                default: 50,
                description: '泊松分布均值'
            },
            {
                name: 'nTrials',
                label: '试验次数',
                unit: '',
                value: 1000,
                min: 100,
                max: 5000,
                step: 100,
                default: 1000,
                description: '蒙特卡洛试验次数'
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
            const meanCount = params['meanCount'] ?? 50;
            const nTrials = params['nTrials'] ?? 1000;
            const duration = params['duration'] ?? 5;
            return {
                id: `decay-statistics-${Date.now()}`,
                title: '衰变统计规律',
                model: 'decay-statistics' as const,
                bodies: [
                    {
                        id: 'nucleus',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { decayStatistics: { meanCount, nTrials } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'cosmic-ray',
        name: '宇宙射线',
        model: 'cosmic-ray' as const,
        parameters: [
            {
                name: 'altitude',
                label: '海拔高度',
                unit: 'm',
                value: 0,
                min: 0,
                max: 30000,
                step: 1000,
                default: 0,
                description: '观测点海拔'
            },
            {
                name: 'shieldingMode',
                label: '屏蔽材料 (0=空气 1=铅 2=水)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: '屏蔽介质类型'
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
            const altitude = params['altitude'] ?? 0;
            const shieldingModeNum = params['shieldingMode'] ?? 0;
            const shieldingMode =
                shieldingModeNum === 1
                    ? ('lead' as const)
                    : shieldingModeNum === 2
                      ? ('water' as const)
                      : ('air' as const);
            const duration = params['duration'] ?? 5;
            return {
                id: `cosmic-ray-${Date.now()}`,
                title: '宇宙射线',
                model: 'cosmic-ray' as const,
                bodies: [
                    { id: 'muon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { cosmicRay: { altitude, shieldingMode } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'neutron-discovery',
        name: '中子发现 (查德威克实验)',
        model: 'neutron-discovery' as const,
        parameters: [
            {
                name: 'alphaEnergy',
                label: 'α 粒子能量',
                unit: 'MeV',
                value: 5,
                min: 1,
                max: 10,
                step: 0.5,
                default: 5,
                description: 'α 粒子入射动能'
            },
            {
                name: 'targetMass',
                label: '靶核质量',
                unit: 'u',
                value: 1,
                min: 1,
                max: 14,
                step: 1,
                default: 1,
                description: '靶核质量数 (氢=1, 氮=14)'
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
            const alphaEnergy = params['alphaEnergy'] ?? 5;
            const targetMass = params['targetMass'] ?? 1;
            const duration = params['duration'] ?? 5;
            return {
                id: `neutron-discovery-${Date.now()}`,
                title: '中子发现 (查德威克实验)',
                model: 'neutron-discovery' as const,
                bodies: [
                    { id: 'alpha', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { neutronDiscovery: { alphaEnergy, targetMass } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'fission-chain',
        name: '核裂变链式反应',
        model: 'fission-chain' as const,
        parameters: [
            {
                name: 'multiplicationFactor',
                label: '有效增殖因子 k',
                unit: '',
                value: 1.0,
                min: 0.5,
                max: 1.5,
                step: 0.01,
                default: 1.0,
                description: 'k=1临界, k>1超临界, k<1次临界'
            },
            {
                name: 'generations',
                label: '代数',
                unit: '',
                value: 10,
                min: 3,
                max: 30,
                step: 1,
                default: 10,
                description: '链式反应代数'
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
            const multiplicationFactor = params['multiplicationFactor'] ?? 1.0;
            const generations = params['generations'] ?? 10;
            const duration = params['duration'] ?? 5;
            return {
                id: `fission-chain-${Date.now()}`,
                title: '核裂变链式反应',
                model: 'fission-chain' as const,
                bodies: [
                    {
                        id: 'neutron',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { fissionChain: { multiplicationFactor, generations } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100, 0.01)
            };
        }
    },

    {
        id: 'bohr-orbit',
        name: '玻尔氢原子模型 (轨道能级)',
        model: 'bohr-model' as const,
        parameters: [
            {
                name: 'seriesB',
                label: '线系 (0=赖曼 1=巴尔末 2=帕邢)',
                unit: '',
                value: 1,
                min: 0,
                max: 2,
                step: 1,
                default: 1,
                description: '0=赖曼系(紫外,n₁=1); 1=巴尔末系(可见,n₁=2); 2=帕邢系(红外,n₁=3)'
            },
            {
                name: 'maxN',
                label: '最大主量子数 n_max',
                unit: '',
                value: 6,
                min: 3,
                max: 10,
                step: 1,
                default: 6,
                description: '决定计算多少条谱线'
            },
            {
                name: 'duration',
                label: '模拟时长',
                unit: 's',
                value: 2,
                min: 1,
                max: 5,
                step: 0.5,
                default: 2,
                description: '仿真总时长'
            }
        ],
        buildProblem: params => {
            const seriesNum = params['seriesB'] ?? 1;
            const series =
                seriesNum === 0 ? ('Lyman' as const) : seriesNum === 2 ? ('Paschen' as const) : ('Balmer' as const);
            const maxN = params['maxN'] ?? 6;
            const duration = params['duration'] ?? 2;
            return {
                id: `bohr-orbit-${Date.now()}`,
                title: '玻尔氢原子模型 (轨道能级)',
                model: 'bohr-model' as const,
                bodies: [
                    {
                        id: 'electron',
                        mass: { value: 1, unit: 'kg' },
                        position: { x: 0, y: 0 },
                        velocity: { x: 0, y: 0 }
                    }
                ],
                constraints: { bohr: { series, maxN } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 10, 0.1)
            };
        }
    },

    {
        id: 'geiger-counter',
        name: '盖革计数器',
        model: 'radioactive-decay',
        parameters: [
            {
                name: 'N0',
                label: '初始原子数 N₀',
                unit: '个',
                value: 1000,
                min: 100,
                max: 10000,
                step: 100,
                default: 1000,
                description: '放射性核素初始原子数'
            },
            {
                name: 'halfLife',
                label: '半衰期 T₁/₂',
                unit: 's',
                value: 10,
                min: 0.1,
                max: 3600,
                step: 0.1,
                default: 10,
                description: '半衰期 (秒)'
            },
            {
                name: 'tEnd',
                label: '模拟时长',
                unit: 's',
                value: 50,
                min: 1,
                max: 10000,
                step: 1,
                default: 50,
                description: '模拟时间 (建议 ≥ 3×T₁/₂)'
            },
            {
                name: 'rayType',
                label: '射线 (0α 1β 2γ)',
                unit: '',
                value: 0,
                min: 0,
                max: 2,
                step: 1,
                default: 0,
                description: 'α=短径迹; β=长弯径迹; γ=极少径迹'
            }
        ],
        buildProblem: params => {
            const initialAtoms = params['N0'] ?? 1000;
            const halfLife = params['halfLife'] ?? 10;
            const duration = params['tEnd'] ?? 50;
            const rayNum = params['rayType'] ?? 0;
            const radiationType =
                rayNum === 1 ? ('beta' as const) : rayNum === 2 ? ('gamma' as const) : ('alpha' as const);
            return {
                id: `geiger-counter-${Date.now()}`,
                title: '盖革计数器',
                model: 'radioactive-decay' as const,
                bodies: [
                    { id: 'nuclei', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { radioactive: { initialAtoms, halfLife, duration, radiationType } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 300)
            };
        }
    }
];
