import type { SceneConfig } from '../../types/visualization';

/**
 * 热学/气体/分子动理论 (选必三)
 * 共 18 个 SceneConfig
 */
export const ThermodynamicsScenes: SceneConfig[] = [
    {
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
                    bodies: [
                        { id: 'gas', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
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
                    timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 }
                };
            }
        },

    {
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
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'brownian-motion',
            name: '布朗运动 (微粒抖动)',
            model: 'brownian-motion',
            parameters: [
                {
                    name: 'particleRadius',
                    label: '微粒半径 r',
                    unit: 'μm',
                    value: 1.0,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 1.0,
                    description: '球形微粒半径 (典型花粉 1-10 μm)'
                },
                {
                    name: 'liquidTemp',
                    label: '液体温度 T',
                    unit: 'K',
                    value: 300,
                    min: 270,
                    max: 340,
                    step: 5,
                    default: 300,
                    description: '液体温度 (K, 影响 Stokes-Einstein D)'
                },
                {
                    name: 'fluidViscosity',
                    label: '液体粘度 η',
                    unit: 'cP',
                    value: 1.0,
                    min: 0.1,
                    max: 100,
                    step: 0.1,
                    default: 1.0,
                    description: '粘度 (cP, 水≈1.0, 蓖麻≈100)'
                },
                {
                    name: 'nParticles',
                    label: '粒子数',
                    unit: '',
                    value: 10,
                    min: 1,
                    max: 50,
                    step: 1,
                    default: 10,
                    description: '同时随机游走的粒子条数'
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
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const particleRadius = (params['particleRadius'] ?? 1.0) * 1e-6;
                const liquidTemp = params['liquidTemp'] ?? 300;
                const fluidViscosity = (params['fluidViscosity'] ?? 1.0) * 1e-3;
                const nParticles = params['nParticles'] ?? 10;
                const duration = params['duration'] ?? 5;
                const dt = 0.01;
                return {
                    id: `brownian-${Date.now()}`,
                    title: '布朗运动 (微粒抖动)',
                    model: 'brownian-motion',
                    bodies: [
                        { id: 'p0', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        brownianMotion: {
                            particleRadius,
                            liquidTemp,
                            fluidViscosity,
                            duration,
                            dt,
                            nParticles
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt, sampleCount: Math.min(500, Math.floor(duration / dt)) }
                };
            }
        },

    {
            id: 'oil-film',
            name: '油膜法测分子直径',
            model: 'oil-film',
            parameters: [
                {
                    name: 'oilConcentration',
                    label: '油酸浓度比 (1:x)',
                    unit: '',
                    value: 500,
                    min: 100,
                    max: 2000,
                    step: 50,
                    default: 500,
                    description: '1 mL 油酸配成 x mL 溶液 (典型 1:500)'
                },
                {
                    name: 'dropsPerMl',
                    label: '每毫升滴数',
                    unit: '滴/mL',
                    value: 50,
                    min: 10,
                    max: 200,
                    step: 5,
                    default: 50,
                    description: '滴管每毫升滴数 (标定)'
                },
                {
                    name: 'filmArea',
                    label: '油膜面积 S',
                    unit: 'cm²',
                    value: 200,
                    min: 10,
                    max: 1000,
                    step: 10,
                    default: 200,
                    description: '油膜轮廓面积'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '图形展示时长'
                }
            ],
            buildProblem: params => {
                const oilConcentration = params['oilConcentration'] ?? 500;
                const dropsPerMl = params['dropsPerMl'] ?? 50;
                const filmArea = params['filmArea'] ?? 200;
                const duration = params['duration'] ?? 3;
                return {
                    id: `oil-film-${Date.now()}`,
                    title: '油膜法测分子直径',
                    model: 'oil-film',
                    bodies: [
                        { id: 'drop', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        oilFilm: { oilConcentration, dropsPerMl, filmArea, drops: 1 }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'liquid-mixing',
            name: '液体混合 (扩散)',
            model: 'liquid-mixing',
            parameters: [
                {
                    name: 'volumeWater',
                    label: '水的体积 V_w',
                    unit: 'mL',
                    value: 50,
                    min: 0,
                    max: 200,
                    step: 5,
                    default: 50,
                    description: '水的体积'
                },
                {
                    name: 'volumeAlcohol',
                    label: '酒精体积 V_a',
                    unit: 'mL',
                    value: 50,
                    min: 0,
                    max: 200,
                    step: 5,
                    default: 50,
                    description: '无水酒精体积'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '图形展示时长'
                }
            ],
            buildProblem: params => {
                const volumeWater = params['volumeWater'] ?? 50;
                const volumeAlcohol = params['volumeAlcohol'] ?? 50;
                const duration = params['duration'] ?? 3;
                return {
                    id: `liquid-mix-${Date.now()}`,
                    title: '液体混合 (扩散)',
                    model: 'liquid-mixing',
                    bodies: [
                        { id: 'mix', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        liquidMixing: { volumeWater, volumeAlcohol }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 50, sampleCount: 50 }
                };
            }
        },

    {
            id: 'molecular-force',
            name: '分子力曲线 (F-r)',
            model: 'molecular-force',
            parameters: [
                {
                    name: 'epsilon',
                    label: '势阱深度 ε',
                    unit: '×10⁻²¹ J',
                    value: 1.0,
                    min: 0.01,
                    max: 10,
                    step: 0.01,
                    default: 1.0,
                    description: 'Lennard-Jones 势参数 (典型 10⁻²¹ J 量级)'
                },
                {
                    name: 'sigma',
                    label: '分子直径 σ',
                    unit: 'nm',
                    value: 0.34,
                    min: 0.1,
                    max: 1.0,
                    step: 0.01,
                    default: 0.34,
                    description: 'LJ 直径参数 (典型 0.3-0.5 nm)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: 'F-r 曲线展示时长'
                }
            ],
            buildProblem: params => {
                const epsilon = (params['epsilon'] ?? 1.0) * 1e-21;
                const sigma = (params['sigma'] ?? 0.34) * 1e-9;
                const duration = params['duration'] ?? 3;
                return {
                    id: `mol-force-${Date.now()}`,
                    title: '分子力曲线 (F-r)',
                    model: 'molecular-force',
                    bodies: [
                        { id: 'pair', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: { molecularForce: { epsilon, sigma } },
                    environment: {},
                    timeConfig: { duration, dt: duration / 50, sampleCount: 50 }
                };
            }
        },

    {
            id: 'melting-curve',
            name: '熔化/凝固曲线 (T-t)',
            model: 'melting-curve',
            parameters: [
                {
                    name: 'medium',
                    label: '物质 (0=晶体 1=非晶体)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '晶体有平台 (T=T_m 熔化)；非晶体连续软化'
                },
                {
                    name: 'meltingPoint',
                    label: '熔点 T_m',
                    unit: '°C',
                    value: 0,
                    min: -50,
                    max: 2000,
                    step: 5,
                    default: 0,
                    description: '冰=0°C, 海波=48°C, 铅=327°C, 铁=1538°C'
                },
                {
                    name: 'heatingRate',
                    label: '加热速率',
                    unit: '°C/min',
                    value: 5,
                    min: 0.5,
                    max: 20,
                    step: 0.5,
                    default: 5,
                    description: '恒定加热速率'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 'min',
                    value: 20,
                    min: 5,
                    max: 60,
                    step: 1,
                    default: 20,
                    description: '温度-时间曲线总时长 (min)'
                }
            ],
            buildProblem: params => {
                const medium = (params['medium'] ?? 0) === 1 ? ('noncrystal' as const) : ('crystal' as const);
                const meltingPoint = params['meltingPoint'] ?? 0;
                const heatingRate = params['heatingRate'] ?? 5;
                const durationMin = params['duration'] ?? 20;
                return {
                    id: `melt-${Date.now()}`,
                    title: '熔化/凝固曲线 (T-t)',
                    model: 'melting-curve',
                    bodies: [
                        { id: 'sample', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        meltingCurve: {
                            mode: medium,
                            meltingPoint,
                            heatingRate,
                            initialTemp: 0,
                            durationMin,
                            sampleCount: 200,
                            latentHeat: 334
                        }
                    },
                    environment: {},
                    timeConfig: { duration: durationMin * 60, dt: (durationMin * 60) / 200, sampleCount: 200 }
                };
            }
        },

    {
            id: 'surface-tension',
            name: '表面张力 (膜收缩)',
            model: 'surface-tension',
            parameters: [
                {
                    name: 'medium',
                    label: '液体 (0=水 1=水银)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '水 σ₀=0.072 N/m; 水银 σ₀=0.487 N/m (20°C)'
                },
                {
                    name: 'sliderLength',
                    label: '吊环长度 L',
                    unit: 'cm',
                    value: 4,
                    min: 0.5,
                    max: 20,
                    step: 0.5,
                    default: 4,
                    description: '与液面接触的吊环长度 (F_sigma = 2·sigma·L)'
                },
                {
                    name: 'temperature',
                    label: '温度',
                    unit: '°C',
                    value: 20,
                    min: 0,
                    max: 80,
                    step: 1,
                    default: 20,
                    description: '液体温度 (sigma 随 T 升高而降低)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '图形展示时长'
                }
            ],
            buildProblem: params => {
                const medium = (params['medium'] ?? 0) === 1 ? ('mercury' as const) : ('water' as const);
                const sliderLength = (params['sliderLength'] ?? 4) / 100;
                const temperature = params['temperature'] ?? 20;
                const duration = params['duration'] ?? 3;
                return {
                    id: `surf-tension-${Date.now()}`,
                    title: '表面张力 (膜收缩)',
                    model: 'surface-tension',
                    bodies: [
                        { id: 'ring', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        surfaceTension: { liquidMode: medium, sliderLength, temperature }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'capillary',
            name: '毛细现象 (液面升降)',
            model: 'capillary',
            parameters: [
                {
                    name: 'tubeRadius',
                    label: '毛细管半径 r',
                    unit: 'mm',
                    value: 0.5,
                    min: 0.01,
                    max: 1.0,
                    step: 0.01,
                    default: 0.5,
                    description: '毛细管半径 (越小毛细效应越显著)'
                },
                {
                    name: 'medium',
                    label: '液体 (0=水 1=水银)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '水 (浸润, h>0 上升)；水银 (不浸润, h<0 下降)'
                },
                {
                    name: 'material',
                    label: '管壁材料 (0=玻璃 1=石蜡)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '玻璃-水完全浸润 θ≈0°；石蜡-水不浸润 θ≈105°'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '毛细高度展示时长'
                }
            ],
            buildProblem: params => {
                const tubeRadius = (params['tubeRadius'] ?? 0.5) * 1e-3;
                const medium = (params['medium'] ?? 0) === 1 ? ('mercury' as const) : ('water' as const);
                const material = (params['material'] ?? 0) === 1 ? ('paraffin' as const) : ('glass' as const);
                const duration = params['duration'] ?? 3;
                return {
                    id: `capillary-${Date.now()}`,
                    title: '毛细现象 (液面升降)',
                    model: 'capillary',
                    bodies: [
                        {
                            id: 'meniscus',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { capillary: { tubeRadius, liquidMode: medium, materialMode: material } },
                    environment: {},
                    timeConfig: { duration, dt: duration / 50, sampleCount: 50 }
                };
            }
        },

    {
            id: 'wetting',
            name: '润湿/不润湿 (接触角)',
            model: 'wetting',
            parameters: [
                {
                    name: 'medium',
                    label: '液体 (0=水 1=水银)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '水/水银'
                },
                {
                    name: 'surface',
                    label: '固体 (0=玻璃 1=蜡面)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '玻璃 θ 小 (亲水)；蜡面 θ 大 (疏水)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '接触角示意图展示时长'
                }
            ],
            buildProblem: params => {
                const medium = (params['medium'] ?? 0) === 1 ? ('mercury' as const) : ('water' as const);
                const surface = (params['surface'] ?? 0) === 1 ? ('wax' as const) : ('glass' as const);
                const duration = params['duration'] ?? 3;
                return {
                    id: `wetting-${Date.now()}`,
                    title: '润湿/不润湿 (接触角)',
                    model: 'wetting',
                    bodies: [
                        { id: 'drop', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: { wetting: { liquidMode: medium, surfaceMode: surface } },
                    environment: {},
                    timeConfig: { duration, dt: duration / 50, sampleCount: 50 }
                };
            }
        },

    {
            id: 'liquid-crystal',
            name: '液晶 (光学各向异性)',
            model: 'liquid-crystal',
            parameters: [
                {
                    name: 'medium',
                    label: '液晶模式 (0=向列型 1=胆甾型)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '向列型 (普通 LCD)；胆甾型 (彩色反射式)'
                },
                {
                    name: 'startTemp',
                    label: '起始温度',
                    unit: '°C',
                    value: 20,
                    min: -5,
                    max: 30,
                    step: 1,
                    default: 20,
                    description: '扫描起始温度'
                },
                {
                    name: 'endTemp',
                    label: '终止温度',
                    unit: '°C',
                    value: 40,
                    min: 10,
                    max: 80,
                    step: 1,
                    default: 40,
                    description: '扫描终止温度 (超过清亮点 Tc≈35°C 变为各向同性)'
                },
                {
                    name: 'voltage',
                    label: '驱动电压',
                    unit: 'V',
                    value: 3,
                    min: 0,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '施加在液晶盒上的驱动电压'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: 'T-V 透射率曲线展示时长'
                }
            ],
            buildProblem: params => {
                const medium = (params['medium'] ?? 0) === 1 ? ('cholesteric' as const) : ('nematic' as const);
                const startTemp = params['startTemp'] ?? 20;
                const endTemp = params['endTemp'] ?? 40;
                const voltage = params['voltage'] ?? 3;
                const duration = params['duration'] ?? 3;
                const midTemp = (startTemp + endTemp) / 2;
                return {
                    id: `liquid-crystal-${Date.now()}`,
                    title: '液晶 (光学各向异性)',
                    model: 'liquid-crystal',
                    bodies: [
                        { id: 'cell', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        liquidCrystal: {
                            temperature: midTemp,
                            voltage,
                            mode: medium,
                            clearingPoint: 35,
                            thresholdVoltage: 2,
                            pitchUm: medium === 'cholesteric' ? 0.4 : undefined
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 50, sampleCount: 50 }
                };
            }
        },

    {
            id: 'joule-mechanical',
            name: '探究做功与内能关系 (机械功)',
            model: 'joule-mechanical',
            parameters: [
                {
                    name: 'mass',
                    label: '重物质量 m',
                    unit: 'kg',
                    value: 5,
                    min: 0.1,
                    max: 30,
                    step: 0.1,
                    default: 5,
                    description: '下落重物质量 (kg)'
                },
                {
                    name: 'height',
                    label: '下落高度 h',
                    unit: 'm',
                    value: 1.5,
                    min: 0.1,
                    max: 5,
                    step: 0.05,
                    default: 1.5,
                    description: '重物每次下落的高度 (m)'
                },
                {
                    name: 'drops',
                    label: '下落次数 n',
                    unit: '次',
                    value: 100,
                    min: 1,
                    max: 500,
                    step: 1,
                    default: 100,
                    description: '重物下落次数 (反映总机械功 W = n·m·g·h)'
                },
                {
                    name: 'waterMass',
                    label: '水当量 M',
                    unit: 'kg',
                    value: 0.5,
                    min: 0.05,
                    max: 3,
                    step: 0.05,
                    default: 0.5,
                    description: '量热器内水质量 (kg)'
                },
                {
                    name: 'specificHeat',
                    label: '比热容 c',
                    unit: 'J/(kg·K)',
                    value: 4184,
                    min: 1000,
                    max: 5000,
                    step: 50,
                    default: 4184,
                    description: '水的比热容 J/(kg·K)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '机械功-热量曲线展示时长'
                }
            ],
            buildProblem: params => {
                const mass = params['mass'] ?? 5;
                const height = params['height'] ?? 1.5;
                const drops = Math.max(1, Math.floor(params['drops'] ?? 100));
                const waterMass = params['waterMass'] ?? 0.5;
                const specificHeat = params['specificHeat'] ?? 4184;
                const duration = params['duration'] ?? 5;
                return {
                    id: `joule-mech-${Date.now()}`,
                    title: '探究做功与内能关系 (机械功)',
                    model: 'joule-mechanical' as const,
                    bodies: [
                        {
                            id: 'weight',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        jouleMechanical: {
                            mass,
                            height,
                            drops,
                            waterMass,
                            specificHeat
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'joule-electrical',
            name: '探究做功与内能关系 (电功)',
            model: 'joule-electrical',
            parameters: [
                {
                    name: 'voltage',
                    label: '电源电压 U',
                    unit: 'V',
                    value: 12,
                    min: 0.1,
                    max: 30,
                    step: 0.1,
                    default: 12,
                    description: '电加热器两端电压 (V)'
                },
                {
                    name: 'resistance',
                    label: '电阻 R',
                    unit: 'Ω',
                    value: 10,
                    min: 1,
                    max: 100,
                    step: 0.5,
                    default: 10,
                    description: '加热器电阻 (Ω)'
                },
                {
                    name: 'time',
                    label: '通电时间 t',
                    unit: 's',
                    value: 300,
                    min: 1,
                    max: 1200,
                    step: 1,
                    default: 300,
                    description: '通电时长 (s)'
                },
                {
                    name: 'waterMass',
                    label: '水当量 M',
                    unit: 'kg',
                    value: 0.5,
                    min: 0.05,
                    max: 3,
                    step: 0.05,
                    default: 0.5,
                    description: '量热器内水质量 (kg)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '电功-热量曲线展示时长'
                }
            ],
            buildProblem: params => {
                const voltage = params['voltage'] ?? 12;
                const resistance = params['resistance'] ?? 10;
                const time = params['time'] ?? 300;
                const waterMass = params['waterMass'] ?? 0.5;
                const duration = params['duration'] ?? 5;
                return {
                    id: `joule-elec-${Date.now()}`,
                    title: '探究做功与内能关系 (电功)',
                    model: 'joule-electrical' as const,
                    bodies: [
                        { id: 'heater', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        jouleElectrical: {
                            voltage,
                            resistance,
                            time,
                            waterMass
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'adiabatic-compression',
            name: '绝热压缩 (气体点火)',
            model: 'adiabatic-compression',
            parameters: [
                {
                    name: 'initialTemp',
                    label: '初始温度 T₁',
                    unit: 'K',
                    value: 300,
                    min: 250,
                    max: 400,
                    step: 5,
                    default: 300,
                    description: '压缩前气体初温 (K)'
                },
                {
                    name: 'compressionRatio',
                    label: '压缩比 r = V₁/V₂',
                    unit: '',
                    value: 9,
                    min: 3,
                    max: 20,
                    step: 0.5,
                    default: 9,
                    description: '汽油机典型压缩比 8~12; 柴油机 15~22'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '绝热 T-p-V 曲线展示时长'
                }
            ],
            buildProblem: params => {
                const initialTemp = params['initialTemp'] ?? 300;
                const compressionRatio = params['compressionRatio'] ?? 9;
                const duration = params['duration'] ?? 5;
                return {
                    id: `adiabatic-${Date.now()}`,
                    title: '绝热压缩 (气体点火)',
                    model: 'adiabatic-compression' as const,
                    bodies: [
                        { id: 'piston', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        adiabaticCompression: {
                            initialTemp,
                            compressionRatio,
                            gamma: 1.4
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'heat-transfer',
            name: '热传递 (三种模式对比)',
            model: 'heat-transfer',
            parameters: [
                {
                    name: 'mode',
                    label: '主导传热模式',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=热传导; 1=热对流; 2=热辐射'
                },
                {
                    name: 'medium',
                    label: '材料',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 3,
                    step: 1,
                    default: 0,
                    description: '0=铜 (k=401); 1=玻璃 (k=1.0); 2=钢; 3=聚苯乙烯'
                },
                {
                    name: 'ambientTemp',
                    label: '环境温度 T_env',
                    unit: 'K',
                    value: 350,
                    min: 250,
                    max: 1000,
                    step: 5,
                    default: 350,
                    description: '高温热源/环境 (K)'
                },
                {
                    name: 'initialTemp',
                    label: '物体初温 T₀',
                    unit: 'K',
                    value: 300,
                    min: 200,
                    max: 600,
                    step: 5,
                    default: 300,
                    description: '被加热/冷却物体初温 (K)'
                },
                {
                    name: 'time',
                    label: '模拟时间',
                    unit: 's',
                    value: 60,
                    min: 5,
                    max: 600,
                    step: 5,
                    default: 60,
                    description: '传热持续时长 (s)（观察温度上升曲线）'
                },
                {
                    name: 'duration',
                    label: '展示时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: 'T-t / Qdot-t 曲线对比展示时长'
                }
            ],
            buildProblem: params => {
                const modeNum = params['mode'] ?? 0;
                const mode =
                    modeNum === 1
                        ? ('convection' as const)
                        : modeNum === 2
                          ? ('radiation' as const)
                          : ('conduction' as const);
                const mediumNum = params['medium'] ?? 0;
                const materialType =
                    mediumNum === 1
                        ? ('glass' as const)
                        : mediumNum === 2
                          ? ('steel' as const)
                          : mediumNum === 3
                            ? ('polystyrene' as const)
                            : ('copper' as const);
                const ambientTemp = params['ambientTemp'] ?? 350;
                const initialTemp = params['initialTemp'] ?? 300;
                const time = params['time'] ?? 60;
                const duration = params['duration'] ?? 5;
                return {
                    id: `heat-transfer-${Date.now()}`,
                    title: '热传递 (三种模式对比)',
                    model: 'heat-transfer' as const,
                    bodies: [
                        { id: 'sample', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        heatTransfer: {
                            mode,
                            materialType,
                            ambientTemp,
                            initialTemp,
                            time
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'energy-transformation',
            name: '能量转化 (能量守恒)',
            model: 'energy-transformation',
            parameters: [
                {
                    name: 'mode',
                    label: '实验模式',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=单摆; 1=发电机; 2=光伏电池'
                },
                {
                    name: 'inputEnergy',
                    label: '输入能量 E_in',
                    unit: 'J',
                    value: 100,
                    min: 1,
                    max: 100000,
                    step: 1,
                    default: 100,
                    description: '输入能量的大小 (J)'
                },
                {
                    name: 'efficiency',
                    label: '转化效率 η',
                    unit: '',
                    value: 0.85,
                    min: 0.05,
                    max: 0.99,
                    step: 0.01,
                    default: 0.85,
                    description: '有用输出 / 输入 (0~1)'
                },
                {
                    name: 'duration',
                    label: '展示时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '能量柱 + 效率曲线展示时长'
                }
            ],
            buildProblem: params => {
                const modeNum = params['mode'] ?? 0;
                const modeVal =
                    modeNum === 1
                        ? ('generator' as const)
                        : modeNum === 2
                          ? ('photovoltaic' as const)
                          : ('pendulum' as const);
                const inputEnergy = params['inputEnergy'] ?? 100;
                const efficiency = params['efficiency'] ?? 0.85;
                const duration = params['duration'] ?? 5;
                return {
                    id: `energy-trans-${Date.now()}`,
                    title: '能量转化 (能量守恒)',
                    model: 'energy-transformation' as const,
                    bodies: [
                        { id: 'device', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        energyTransformation: {
                            mode: modeVal,
                            inputEnergy,
                            efficiency
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'perpetuum-mobile',
            name: '永动机不可能 (热二律)',
            model: 'perpetuum-mobile',
            parameters: [
                {
                    name: 'mode',
                    label: '演示模式',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '0=卡诺循环 T-S 图 + 效率上限; 1=开尔文表述判定'
                },
                {
                    name: 'hotTemp',
                    label: '热源温度 T_hot',
                    unit: 'K',
                    value: 600,
                    min: 200,
                    max: 1500,
                    step: 10,
                    default: 600,
                    description: '高温热源温度 (K)'
                },
                {
                    name: 'coldTemp',
                    label: '冷源温度 T_cold',
                    unit: 'K',
                    value: 300,
                    min: 30,
                    max: 800,
                    step: 10,
                    default: 300,
                    description: '低温冷源温度 (K)'
                },
                {
                    name: 'duration',
                    label: '展示时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: 'T-S 图 + η-ξ 曲线 + 判定结果展示时长'
                }
            ],
            buildProblem: params => {
                const modeNum = params['mode'] ?? 0;
                const mode = modeNum === 1 ? ('kelvin' as const) : ('carnot' as const);
                const hotTemp = params['hotTemp'] ?? 600;
                const coldTemp = params['coldTemp'] ?? 300;
                const duration = params['duration'] ?? 5;
                return {
                    id: `perpetuum-${Date.now()}`,
                    title: '永动机不可能 (热二律)',
                    model: 'perpetuum-mobile' as const,
                    bodies: [
                        { id: 'engine', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        perpetuumMobile: {
                            hotTemp,
                            coldTemp,
                            mode
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        },

    {
            id: 'heat-direction',
            name: '热力学方向性 (热二定律)',
            model: 'heat-direction',
            parameters: [
                {
                    name: 'hotTemp',
                    label: '高温物体 T_hot',
                    unit: 'K',
                    value: 400,
                    min: 250,
                    max: 550,
                    step: 5,
                    default: 400,
                    description: '高温热源初始温度 (K)'
                },
                {
                    name: 'coldTemp',
                    label: '低温物体 T_cold',
                    unit: 'K',
                    value: 250,
                    min: 150,
                    max: 350,
                    step: 5,
                    default: 250,
                    description: '低温物体初始温度 (K)'
                },
                {
                    name: 'thermalConductivity',
                    label: '等效导热系数 k',
                    unit: 'W/(m·K)',
                    value: 5,
                    min: 0.1,
                    max: 100,
                    step: 0.1,
                    default: 5,
                    description: '接触界面等效导热系数 (τ = 10 / (k+0.01))'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '温度趋衡 T-t 曲线展示时长'
                }
            ],
            buildProblem: params => {
                const hotTemp = params['hotTemp'] ?? 400;
                const coldTemp = params['coldTemp'] ?? 250;
                const thermalConductivity = params['thermalConductivity'] ?? 5;
                const duration = params['duration'] ?? 5;
                return {
                    id: `heat-dir-${Date.now()}`,
                    title: '热力学方向性 (热二定律)',
                    model: 'heat-direction' as const,
                    bodies: [
                        {
                            id: 'contact',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        heatDirection: {
                            hotTemp,
                            coldTemp,
                            thermalConductivity,
                            duration
                        }
                    },
                    environment: {},
                    timeConfig: { duration, dt: duration / 100, sampleCount: 100 }
                };
            }
        }
];
