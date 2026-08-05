import { SCENES } from './sceneRegistry';

/**
 * 实验导学数据 — 为每个场景提供「实验目标 + 分步引导」。
 * 核心场景使用精编步骤 (CURATED)，其余场景由 getSceneGuidance 自动生成通用步骤。
 */

export interface GuidanceStep {
    /** 步骤标题 */
    title: string;
    /** 用户操作说明 */
    action: string;
    /** 观察要点 */
    observe: string;
    /** 关联参数名（必须存在于场景 parameters） */
    paramFocus?: string[];
}

export interface SceneGuidance {
    sceneId: string;
    /** 实验目标 */
    goal: string;
    steps: GuidanceStep[];
}

const CURATED: Record<string, Omit<SceneGuidance, 'sceneId'>> = {
    projectile: {
        goal: '探究抛体运动的规律：轨迹形状、射程与初速度、抛射角的关系',
        steps: [
            {
                title: '认识场景',
                action: '观察舞台中的小球与默认参数（初速度 v₀=20 m/s、角度 θ=45°）',
                observe: '物体仅受重力，运动轨迹为抛物线',
                paramFocus: ['v0', 'angle']
            },
            {
                title: '改变初速度',
                action: '增大初速度 v₀，播放仿真，比较轨迹',
                observe: 'v₀ 越大射程越远；滞空时间与 v₀ 无关',
                paramFocus: ['v0']
            },
            {
                title: '改变抛射角',
                action: '依次设 θ=30°/45°/60° 并播放',
                observe: '45° 射程最远；30° 与 60° 射程相同（互余角对称）',
                paramFocus: ['angle']
            },
            {
                title: '研究水平与竖直分运动',
                action: '查看 x-t / y-t 图表',
                observe: 'x-t 为直线（水平匀速），y-t 为抛物线（竖直匀加速）'
            }
        ]
    },
    'free-fall': {
        goal: '验证自由落体运动：初速为零的匀加速直线运动',
        steps: [
            {
                title: '认识场景',
                action: '观察小球从高度 h 处由静止释放',
                observe: '小球下落越来越快，说明加速度恒定',
                paramFocus: ['height', 'g']
            },
            {
                title: '改变下落高度',
                action: '调节高度 h，播放仿真',
                observe: '下落时间 t = √(2h/g)，高度越大耗时越长',
                paramFocus: ['height']
            },
            {
                title: '数据验证',
                action: '查看 v-t / h-t 图表',
                observe: 'v-t 为过原点的直线（v=gt）；位移与时间平方成正比'
            }
        ]
    },
    'uniform-accelerated': {
        goal: '研究竖直方向的匀变速直线运动规律',
        steps: [
            {
                title: '认识场景',
                action: '观察竖直上抛/下抛物体的初始状态',
                observe: '物体只受重力，加速度恒为 g',
                paramFocus: ['v0y', 'g']
            },
            {
                title: '竖直上抛',
                action: '设 v₀y>0 播放，观察上升与回落过程',
                observe: '上升减速、下落加速；最高点速度为零',
                paramFocus: ['v0y']
            },
            {
                title: '图表验证',
                action: '查看 v-t 图',
                observe: 'v-t 为一条直线（斜率为 -g），穿过 t 轴即最高点'
            }
        ]
    },
    'inclined-plane': {
        goal: '探究斜面运动：牛顿第二定律与摩擦因数的作用',
        steps: [
            {
                title: '认识场景',
                action: '观察斜面上的滑块与参数（角度 θ、摩擦因数 μ）',
                observe: '滑块沿斜面加速下滑或匀速运动',
                paramFocus: ['theta', 'mu']
            },
            {
                title: '验证加速度公式',
                action: '设 μ=0，改变 θ 播放',
                observe: 'a = g·sinθ，θ 越大下滑越快',
                paramFocus: ['theta', 'mu']
            },
            {
                title: '引入摩擦',
                action: '增大 μ 到 tanθ 以上再播放',
                observe: 'μ<tanθ 加速下滑；μ=tanθ 匀速；μ>tanθ 减速',
                paramFocus: ['mu']
            }
        ]
    },
    collision: {
        goal: '验证碰撞中的动量守恒与能量转化',
        steps: [
            {
                title: '认识场景',
                action: '观察两小球的质量与初速度',
                observe: '碰撞过程动量守恒：m₁v₁+m₂v₂ 前后不变',
                paramFocus: ['m1', 'm2', 'v1', 'v2']
            },
            {
                title: '完全弹性碰撞',
                action: '设 e=1（或等质量对心碰）播放',
                observe: '等质量弹性碰撞交换速度；动能守恒',
                paramFocus: ['e']
            },
            {
                title: '完全非弹性碰撞',
                action: '设 e=0 播放',
                observe: '两球粘合一起运动，动能损失最大',
                paramFocus: ['e']
            }
        ]
    },
    spring: {
        goal: '研究弹簧振子的简谐运动与能量转化',
        steps: [
            {
                title: '认识场景',
                action: '观察弹簧振子的平衡位置与振幅 A',
                observe: '位移、速度均按正弦规律变化',
                paramFocus: ['m', 'k', 'A']
            },
            {
                title: '改变振幅',
                action: '调节振幅 A 播放',
                observe: '振幅越大速度峰值越大；周期与振幅无关',
                paramFocus: ['A']
            },
            {
                title: '周期公式',
                action: '改变质量 m 或劲度系数 k',
                observe: 'T = 2π√(m/k)，m 越大周期越长，k 越大周期越短',
                paramFocus: ['m', 'k']
            },
            {
                title: '能量转化',
                action: '查看动能/弹性势能图表',
                observe: '动能与势能此消彼长，总机械能守恒'
            }
        ]
    },
    'electric-field': {
        goal: '观察带电粒子在匀强电场中的偏转运动',
        steps: [
            {
                title: '认识场景',
                action: '观察电场方向与带电粒子的入射状态',
                observe: '粒子受恒定电场力 F=qE，做类平抛运动',
                paramFocus: ['Ey', 'charge', 'v0x']
            },
            {
                title: '改变电场强度',
                action: '增大电场强度 E 播放',
                observe: '偏转量与 E 成正比，E 越大偏转越明显',
                paramFocus: ['Ey']
            },
            {
                title: '改变电荷符号',
                action: '切换电荷正负',
                observe: '受力方向相反，偏转方向随之改变',
                paramFocus: ['charge']
            }
        ]
    },
    'magnetic-field': {
        goal: '观察带电粒子在匀强磁场中的匀速圆周运动',
        steps: [
            {
                title: '认识场景',
                action: '观察初速度方向与磁场方向的夹角',
                observe: '洛伦兹力始终垂直速度，只改变方向不做功',
                paramFocus: ['Bz', 'charge', 'v0x']
            },
            {
                title: '改变磁感应强度',
                action: '调节 B 播放',
                observe: '半径 r = mv/(qB)，B 越大半径越小',
                paramFocus: ['Bz']
            },
            {
                title: '改变初速度',
                action: '调节 v₀ 播放',
                observe: '半径与速度成正比；周期与速度无关',
                paramFocus: ['v0x']
            }
        ]
    },
    'em-combined': {
        goal: '研究带电粒子在叠加电磁场中的运动',
        steps: [
            {
                title: '认识场景',
                action: '同时调节电场与磁场参数',
                observe: '两场力叠加，可作直线、圆周或螺旋运动',
                paramFocus: ['Ex', 'Bz']
            },
            {
                title: '速度选择器',
                action: '调节 v₀ 使 qE = qvB，播放',
                observe: '粒子做匀速直线运动（仅当 v₀ = E/B）',
                paramFocus: ['Ex', 'Bz', 'v0x']
            },
            {
                title: '磁偏转',
                action: '撤去电场（E=0），播放',
                observe: '粒子做匀速圆周运动，轨迹为完整圆弧',
                paramFocus: ['Ex', 'Bz']
            }
        ]
    },
    'simple-pendulum': {
        goal: '研究单摆的周期与摆长、摆角的关系',
        steps: [
            {
                title: '认识场景',
                action: '观察摆球摆动，注意摆角较小',
                observe: '小角度下摆动近似简谐运动',
                paramFocus: ['length', 'angle']
            },
            {
                title: '周期与摆长',
                action: '增大摆长 L 播放',
                observe: 'T = 2π√(L/g)，摆长越长周期越大',
                paramFocus: ['length']
            },
            {
                title: '周期与摆角',
                action: '在小角度范围内改变摆角',
                observe: '周期与摆角无关（等时性）',
                paramFocus: ['angle']
            }
        ]
    },
    'mechanical-wave': {
        goal: '观察机械波的传播与横波/纵波的区别',
        steps: [
            {
                title: '认识场景',
                action: '观察质点列的振动传播',
                observe: '质点不随波迁移，只在平衡位置附近振动',
                paramFocus: ['amplitude', 'frequency']
            },
            {
                title: '横波与纵波',
                action: '切换 waveMode 横波/纵波模式',
                observe: '横波质点垂直传播方向振动；纵波平行方向疏密交替',
                paramFocus: ['waveMode']
            },
            {
                title: '改变频率',
                action: '增大频率播放',
                observe: '波长 λ = v/f，频率越高波长越短',
                paramFocus: ['frequency']
            }
        ]
    },
    diffusion: {
        goal: '观察扩散现象与温度的关系',
        steps: [
            {
                title: '认识场景',
                action: '观察红蓝粒子在介质中的无规则运动',
                observe: '分子永不停息地做无规则运动',
                paramFocus: ['temperature', 'medium']
            },
            {
                title: '改变温度',
                action: '升高温度播放',
                observe: '温度越高分子运动越剧烈，扩散越快',
                paramFocus: ['temperature']
            },
            {
                title: '对比介质',
                action: '切换气体/液体介质',
                observe: '气体扩散系数远大于液体，扩散速度快得多',
                paramFocus: ['medium']
            }
        ]
    },
    photoelectric: {
        goal: '研究光电效应：光子能量与逸出功的关系',
        steps: [
            {
                title: '认识场景',
                action: '观察入射光子轰击金属板，查看参数 W₀（逸出功）',
                observe: '光子能量 E = hν，只有 E ≥ W₀ 才产生光电子',
                paramFocus: ['W0', 'nuMin']
            },
            {
                title: '改变逸出功',
                action: '增大逸出功 W₀，观察是否产生光电子',
                observe: 'W₀ 超过光子能量后，光电子立即消失',
                paramFocus: ['W0']
            },
            {
                title: '截止频率',
                action: '对比 ν_min = W₀/h 与入射频率',
                observe: '入射频率低于截止频率时，无论光强多大都不产生光电效应',
                paramFocus: ['nuMin']
            }
        ]
    }
};

/** 精编导学覆盖的场景 id 集合 */
export const CURATED_SCENE_IDS = Object.keys(CURATED);

/** 该场景是否有精编导学步骤 */
export function isCurated(sceneId: string): boolean {
    return sceneId in CURATED;
}

/**
 * 获取场景导学数据。精编场景返回手写步骤；
 * 其余场景返回基于场景名与参数自动生成的通用步骤。
 */
export function getSceneGuidance(sceneId: string): SceneGuidance {
    const curated = CURATED[sceneId];
    if (curated) {
        return { sceneId, ...curated };
    }
    return buildFallback(sceneId);
}

function buildFallback(sceneId: string): SceneGuidance {
    const scene = SCENES.find(s => s.id === sceneId);
    const name = scene?.name ?? sceneId;
    const paramLabels = (scene?.parameters ?? []).map(p => p.label);
    return {
        sceneId,
        goal: `观察「${name}」的物理现象，探究其中的规律`,
        steps: [
            {
                title: '认识场景与参数',
                action: '查看右侧参数面板中的默认值',
                observe: paramLabels.length > 0 ? `可调参数：${paramLabels.join('、')}` : '本场景无可调参数'
            },
            {
                title: '调整参数',
                action: '拖动滑杆修改参数，观察画布变化',
                observe: '参数变化会引起对应物理量改变'
            },
            {
                title: '运行仿真',
                action: '点击「播放」运行仿真',
                observe: '注意观察运动过程与关键物理量的数值变化'
            },
            {
                title: '图表分析',
                action: '查看图表区域，对照参数变化',
                observe: '数据曲线反映物理量之间的定量关系'
            }
        ]
    };
}
