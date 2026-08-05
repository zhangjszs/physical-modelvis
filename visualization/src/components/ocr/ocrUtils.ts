/**
 * OCR 前端纯函数 — 场景解析 / 参数映射 / 题型标签 (可测试, 无 React 依赖)
 */
import type { OcrProblemType } from '../../../server/ocr-utils';

/** sceneTemplate → 实际场景 ID 映射 (与后端 prompt 中可选值对齐) */
const SCENE_TEMPLATE_MAP: Record<string, string> = {
    projectile: 'projectile',
    'electric-field': 'electric-field',
    'magnetic-field': 'magnetic-field',
    collision: 'collision',
    spring: 'spring',
    'inclined-plane': 'inclined-plane',
    'em-combined': 'em-combined',
    'uniform-accelerated': 'uniform-accelerated',
    'free-fall': 'free-fall'
};

/** 中文参数名 / 物理量符号 → 场景参数 key */
const PARAM_KEY_MAP: Record<string, string> = {
    初速度: 'v0',
    v0: 'v0',
    速度: 'v0',
    角度: 'angle',
    θ: 'angle',
    重力加速度: 'g',
    g: 'g',
    电场强度: 'Ey',
    E: 'Ey',
    Ey: 'Ey',
    磁感应强度: 'Bz',
    B: 'Bz',
    Bz: 'Bz',
    电荷量: 'charge',
    q: 'charge',
    质量: 'mass',
    m: 'mass'
};

export const OCR_PROBLEM_TYPE_LABEL: Record<OcrProblemType, string> = {
    'single-choice': '单选题',
    'multiple-choice': '多选题',
    'fill-blank': '填空题',
    essay: '解答题'
};

/** 解析 sceneTemplate → 场景 ID, 未知/缺省回退 projectile */
export function resolveScene(sceneTemplate: string | null | undefined): string {
    if (!sceneTemplate) return 'projectile';
    return SCENE_TEMPLATE_MAP[sceneTemplate] ?? 'projectile';
}

/** 提取 given 中数值型参数, 映射为场景参数名; 非数值 (条件/字符串) 丢弃 */
export function buildSceneParams(given: Record<string, unknown> | undefined): Array<{ key: string; value: number }> {
    if (!given) return [];
    const params: Array<{ key: string; value: number }> = [];
    for (const [key, val] of Object.entries(given)) {
        if (typeof val === 'number' && Number.isFinite(val)) {
            params.push({ key: PARAM_KEY_MAP[key] ?? key, value: val });
        }
    }
    return params;
}

/** 根据 options 数量与 type 推断题型标签 (兜底展示用) */
export function inferProblemTypeLabel(type: OcrProblemType | undefined, hasOptions: boolean): string {
    if (type && OCR_PROBLEM_TYPE_LABEL[type]) return OCR_PROBLEM_TYPE_LABEL[type];
    if (hasOptions) return '选择题';
    return '解答题';
}
