import { makeTimeSeries } from '../../utils/timeSeries.js';
import type { SceneConfig } from '../../types/visualization';

/**
 * 光学 (选必一 第四章)
 * 共 8 个 SceneConfig
 */
export const OpticsScenes: SceneConfig[] = [
    {
        id: 'refraction',
        name: '光的折射定律 (Snell)',
        model: 'refraction',
        parameters: [
            {
                name: 'n1',
                label: '介质 1 折射率 n₁',
                unit: '',
                value: 1.0,
                min: 1.0,
                max: 2.5,
                step: 0.01,
                default: 1.0,
                description: '光疏介质 (空气=1.00, 水=1.33, 玻璃=1.50, 金刚石=2.42)'
            },
            {
                name: 'n2',
                label: '介质 2 折射率 n₂',
                unit: '',
                value: 1.5,
                min: 1.0,
                max: 2.5,
                step: 0.01,
                default: 1.5,
                description: '光密介质'
            },
            {
                name: 'angle',
                label: '入射角 θ₁',
                unit: '°',
                value: 30,
                min: 0,
                max: 89,
                step: 1,
                default: 30,
                description: '入射光线与法线夹角'
            }
        ],
        buildProblem: params => {
            const n1 = params['n1'] ?? 1.0;
            const n2 = params['n2'] ?? 1.5;
            const angleDeg = params['angle'] ?? 30;
            return {
                id: `refraction-${Date.now()}`,
                title: '光的折射定律 (Snell 定律)',
                model: 'refraction',
                bodies: [
                    { id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { refraction: { n1, n2, incidentAngleDeg: angleDeg } },
                environment: {},
                timeConfig: makeTimeSeries(1, 10, 0.1)
            };
        }
    },

    {
        id: 'interference',
        name: '双缝干涉 (杨氏实验)',
        model: 'interference',
        parameters: [
            {
                name: 'wavelength',
                label: '波长 λ',
                unit: 'nm',
                value: 600,
                min: 380,
                max: 780,
                step: 5,
                default: 600,
                description: '光波长 (红~620-780, 绿~495-570, 蓝~450-495)'
            },
            {
                name: 'slitSep',
                label: '缝距 d',
                unit: 'mm',
                value: 0.5,
                min: 0.1,
                max: 2,
                step: 0.05,
                default: 0.5,
                description: '双缝间距'
            },
            {
                name: 'screenDist',
                label: '缝-屏距离 L',
                unit: 'm',
                value: 2.0,
                min: 0.5,
                max: 5,
                step: 0.1,
                default: 2.0,
                description: '双缝到观察屏的距离'
            },
            {
                name: 'filmThickness',
                label: '薄膜厚度 (可选)',
                unit: 'μm',
                value: 0,
                min: 0,
                max: 2,
                step: 0.01,
                default: 0,
                description: '薄膜干涉时输入 (0=不启用薄膜模式)'
            },
            {
                name: 'filmN',
                label: '薄膜折射率',
                unit: '',
                value: 1.38,
                min: 1,
                max: 2.5,
                step: 0.01,
                default: 1.38,
                description: '薄膜材料折射率 (MgF₂=1.38, 玻璃=1.5)'
            }
        ],
        presets: [
            {
                id: 'red-light',
                name: '红光',
                description: 'λ=650nm 红光干涉',
                parameters: { wavelength: 650, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
            },
            {
                id: 'green-light',
                name: '绿光',
                description: 'λ=550nm 绿光干涉',
                parameters: { wavelength: 550, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
            },
            {
                id: 'blue-light',
                name: '蓝光',
                description: 'λ=450nm 蓝光干涉',
                parameters: { wavelength: 450, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
            },
            {
                id: 'thin-film',
                name: '薄膜干涉',
                description: 'MgF₂ 薄膜 500nm',
                parameters: { wavelength: 550, slitSep: 0.5, screenDist: 2.0, filmThickness: 0.5, filmN: 1.38 }
            },
            {
                id: 'narrow-slit',
                name: '窄缝',
                description: 'd=0.2mm 条纹更宽',
                parameters: { wavelength: 600, slitSep: 0.2, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
            }
        ],
        liveUpdate: true,
        buildProblem: params => {
            const wavelengthNm = params['wavelength'] ?? 600;
            const slitSeparationMm = params['slitSep'] ?? 0.5;
            const screenDistanceM = params['screenDist'] ?? 2.0;
            const filmThicknessUm = params['filmThickness'] ?? 0;
            const filmN = params['filmN'] ?? 1.38;
            const ic: {
                wavelengthNm: number;
                slitSeparationMm: number;
                screenDistanceM: number;
                filmThicknessUm?: number;
                filmN?: number;
            } = {
                wavelengthNm,
                slitSeparationMm,
                screenDistanceM
            };
            if (filmThicknessUm > 0) {
                ic.filmThicknessUm = filmThicknessUm;
                ic.filmN = filmN;
            }
            return {
                id: `interference-${Date.now()}`,
                title: '双缝干涉 (杨氏实验)',
                model: 'interference',
                bodies: [
                    { id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { interference: ic },
                environment: {},
                timeConfig: makeTimeSeries(1, 10, 0.1)
            };
        }
    },

    {
        id: 'thin-film',
        name: '薄膜干涉 (等厚)',
        model: 'thin-film' as const,
        parameters: [
            {
                name: 'thickness',
                label: '薄膜厚度 d',
                unit: 'nm',
                value: 300,
                min: 10,
                max: 2000,
                step: 10,
                default: 300,
                description: '薄膜中心厚度 (可见光波长的 1-3 倍)'
            },
            {
                name: 'refIndex',
                label: '薄膜折射率 n',
                unit: '',
                value: 1.38,
                min: 1,
                max: 3,
                step: 0.01,
                default: 1.38,
                description: '薄膜材料折射率 (MgF₂=1.38, 玻璃=1.5)'
            },
            {
                name: 'wavelength',
                label: '入射光波长 λ',
                unit: 'nm',
                value: 550,
                min: 380,
                max: 780,
                step: 5,
                default: 550,
                description: '入射单色光波长 (绿光≈550nm)'
            },
            {
                name: 'incAngle',
                label: '入射角 θ',
                unit: '°',
                value: 0,
                min: 0,
                max: 89,
                step: 1,
                default: 0,
                description: '入射光线与法线的夹角'
            },
            {
                name: 'subsIndex',
                label: '基片折射率 n_s',
                unit: '',
                value: 1.5,
                min: 1,
                max: 4,
                step: 0.01,
                default: 1.5,
                description: '薄膜下方基片折射率 (玻璃=1.5)'
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
                description: '静态场景 (仅显示反射率曲线)'
            }
        ],
        buildProblem: params => {
            const thickness = params['thickness'] ?? 300;
            const refIndex = params['refIndex'] ?? 1.38;
            const wavelength = params['wavelength'] ?? 550;
            const incAngle = params['incAngle'] ?? 0;
            const subsIndex = params['subsIndex'] ?? 1.5;
            const duration = params['duration'] ?? 1;
            return {
                id: `tf-${Date.now()}`,
                title: '薄膜干涉 (等厚)',
                model: 'thin-film',
                bodies: [
                    { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    thinFilm: { thickness, refIndex, wavelength, incidentAngle: incAngle, substrateIndex: subsIndex }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
        id: 'single-slit',
        name: '单缝衍射 (光强分布)',
        model: 'single-slit' as const,
        parameters: [
            {
                name: 'slitWidth',
                label: '缝宽 a',
                unit: 'mm',
                value: 0.1,
                min: 0.005,
                max: 1,
                step: 0.005,
                default: 0.1,
                description: '单缝宽度 (建议 0.05-0.5 mm 以获得明显衍射图样)'
            },
            {
                name: 'wavelength',
                label: '波长 λ',
                unit: 'nm',
                value: 550,
                min: 380,
                max: 780,
                step: 5,
                default: 550,
                description: '入射单色光波长'
            },
            {
                name: 'screenDist',
                label: '缝-屏距离 L',
                unit: 'm',
                value: 1.5,
                min: 0.1,
                max: 10,
                step: 0.1,
                default: 1.5,
                description: '单缝到观察屏的距离'
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
                description: '静态场景 (仅显示衍射图样)'
            }
        ],
        buildProblem: params => {
            const slitWidth = params['slitWidth'] ?? 0.1;
            const wavelength = params['wavelength'] ?? 550;
            const screenDist = params['screenDist'] ?? 1.5;
            const duration = params['duration'] ?? 1;
            return {
                id: `ss-${Date.now()}`,
                title: '单缝衍射 (光强分布)',
                model: 'single-slit',
                bodies: [
                    { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    singleSlit: { slitWidth, wavelength, screenDist }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
        id: 'diffraction-grating',
        name: '光栅衍射 (光栅方程)',
        model: 'diffraction-grating' as const,
        parameters: [
            {
                name: 'gratingConst',
                label: '光栅常数 d',
                unit: 'μm',
                value: 2,
                min: 0.5,
                max: 10,
                step: 0.1,
                default: 2,
                description: '相邻狭缝中心距 (d=1/N, N=刻线数)'
            },
            {
                name: 'slitWidth',
                label: '缝宽 a',
                unit: 'μm',
                value: 1,
                min: 0.2,
                max: 5,
                step: 0.1,
                default: 1,
                description: '单条狭缝的宽度'
            },
            {
                name: 'wavelength',
                label: '波长 λ',
                unit: 'nm',
                value: 550,
                min: 380,
                max: 780,
                step: 5,
                default: 550,
                description: '入射单色光波长'
            },
            {
                name: 'orderMax',
                label: '最大级次 k_max',
                unit: '',
                value: 4,
                min: 1,
                max: 10,
                step: 1,
                default: 4,
                description: '计算的最大衍射级次'
            },
            {
                name: 'slitCount',
                label: '总缝数 N',
                unit: '',
                value: 500,
                min: 10,
                max: 10000,
                step: 10,
                default: 500,
                description: '光栅总刻线数 (越多谱线越锐利)'
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
                description: '静态场景 (仅显示衍射谱线)'
            }
        ],
        buildProblem: params => {
            const gratingConstant = params['gratingConst'] ?? 2;
            const slitWidth = params['slitWidth'] ?? 1;
            const wavelength = params['wavelength'] ?? 550;
            const orderMax = params['orderMax'] ?? 4;
            const slitCount = params['slitCount'] ?? 500;
            const duration = params['duration'] ?? 1;
            return {
                id: `dg-${Date.now()}`,
                title: '光栅衍射 (光栅方程)',
                model: 'diffraction-grating',
                bodies: [
                    { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    diffractionGrating: { gratingConstant, slitWidth, wavelength, orderMax, slitCount }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
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
    },

    {
        id: 'hologram',
        name: '全息照相 (干涉记录)',
        model: 'hologram' as const,
        parameters: [
            {
                name: 'refAngle',
                label: '参考光角度 θ_r',
                unit: '°',
                value: 30,
                min: 0,
                max: 60,
                step: 1,
                default: 30,
                description: '参考光与光轴夹角'
            },
            {
                name: 'objAngle',
                label: '物光角度 θ_o',
                unit: '°',
                value: -10,
                min: -30,
                max: 30,
                step: 1,
                default: -10,
                description: '物光与光轴夹角 (反号表示另一侧)'
            },
            {
                name: 'wavelength',
                label: '激光波长 λ',
                unit: 'nm',
                value: 632.8,
                min: 380,
                max: 780,
                step: 5,
                default: 632.8,
                description: '激光波长 (He-Ne 激光器 632.8nm)'
            },
            {
                name: 'refAmp',
                label: '参考光振幅 A_r',
                unit: '',
                value: 1,
                min: 0.1,
                max: 10,
                step: 0.1,
                default: 1,
                description: '参考光振幅相对值'
            },
            {
                name: 'objAmp',
                label: '物光振幅 A_o',
                unit: '',
                value: 0.5,
                min: 0.1,
                max: 10,
                step: 0.1,
                default: 0.5,
                description: '物光振幅相对值 (通常 < 参考光)'
            },
            {
                name: 'recordWidth',
                label: '干板宽度 W',
                unit: 'mm',
                value: 20,
                min: 1,
                max: 100,
                step: 1,
                default: 20,
                description: '全息干板宽度 (mm)'
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
                description: '静态场景 (仅显示记录/再现条纹)'
            }
        ],
        buildProblem: params => {
            const referenceAngle = params['refAngle'] ?? 30;
            const objectAngle = params['objAngle'] ?? -10;
            const wavelength = params['wavelength'] ?? 632.8;
            const refAmp = params['refAmp'] ?? 1;
            const objAmp = params['objAmp'] ?? 0.5;
            const recordWidth = params['recordWidth'] ?? 20;
            const duration = params['duration'] ?? 1;
            return {
                id: `hlg-${Date.now()}`,
                title: '全息照相 (干涉记录)',
                model: 'hologram',
                bodies: [
                    { id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: {
                    hologram: {
                        referenceAngle,
                        objectAngle,
                        wavelength,
                        referenceAmp: refAmp,
                        objectAmp: objAmp,
                        recordWidth
                    }
                },
                environment: {},
                timeConfig: makeTimeSeries(duration, 100)
            };
        }
    },

    {
        id: 'total-internal-reflection',
        name: '全反射与光导',
        model: 'refraction',
        parameters: [
            {
                name: 'n1',
                label: '介质1 折射率 n₁',
                unit: '',
                value: 1.5,
                min: 1.0,
                max: 2.5,
                step: 0.01,
                default: 1.5,
                description: '入射侧介质 (光密侧, 如玻璃 1.50)'
            },
            {
                name: 'n2',
                label: '介质2 折射率 n₂',
                unit: '',
                value: 1.0,
                min: 1.0,
                max: 2.5,
                step: 0.01,
                default: 1.0,
                description: '透射侧介质 (光疏侧, 如空气 1.00)'
            },
            {
                name: 'angle',
                label: '入射角 θ₁',
                unit: '°',
                value: 50,
                min: 0,
                max: 89,
                step: 1,
                default: 50,
                description: '入射光线与法线夹角'
            },
            {
                name: 'mode',
                label: '模式 (0折射 1全反射 2光导)',
                unit: '',
                value: 1,
                min: 0,
                max: 2,
                step: 1,
                default: 1,
                description: '0=普通折射; 1=全反射; 2=光导纤维'
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
            const n1 = params['n1'] ?? 1.5;
            const n2 = params['n2'] ?? 1.0;
            const angleDeg = params['angle'] ?? 50;
            const duration = params['duration'] ?? 3;
            return {
                id: `tir-${Date.now()}`,
                title: '全反射与光导',
                model: 'refraction' as const,
                bodies: [
                    { id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                ],
                constraints: { refraction: { n1, n2, incidentAngleDeg: angleDeg } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 10, 0.1)
            };
        }
    }
];
