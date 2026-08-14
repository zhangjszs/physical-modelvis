import { getSceneSync, getScenesSync, getDefaultParams, loadAllScenes } from '../scenes/sceneRegistry';

export interface ExtractedQuantity {
    label: string;
    value: number;
    unit: string;
    source: string;
}

export interface ProblemAnalysis {
    sceneId: string;
    sceneName: string;
    confidence: number;
    parameters: Record<string, number>;
    extracted: ExtractedQuantity[];
    formulas: string[];
    checks: string[];
    assumptions: string[];
    warnings: string[];
}

interface ParsedValue {
    value: number;
    unit: string;
    source: string;
}

const SCENE_KEYWORDS: Array<{ sceneId: string; keywords: string[]; score: number }> = [
    { sceneId: 'em-combined', keywords: ['速度选择器', '复合场', '电场和磁场', '电磁场', '洛伦兹力'], score: 5 },
    { sceneId: 'magnetic-field', keywords: ['磁场', '磁感应强度', '匀强磁场', '回旋', '洛伦兹力'], score: 4 },
    { sceneId: 'electric-field', keywords: ['电场', '电场强度', '匀强电场', '带电粒子', '电荷'], score: 4 },
    { sceneId: 'collision', keywords: ['碰撞', '弹性碰撞', '非弹性碰撞', '恢复系数', '动量守恒'], score: 4 },
    { sceneId: 'spring', keywords: ['弹簧', '振子', '简谐运动', '劲度系数', '振幅'], score: 4 },
    { sceneId: 'inclined-plane', keywords: ['斜面', '倾角', '摩擦系数', '沿斜面', '下滑'], score: 4 },
    { sceneId: 'free-fall', keywords: ['自由落体', '静止释放', '竖直下落', '从高处落下'], score: 4 },
    { sceneId: 'projectile', keywords: ['平抛', '斜抛', '抛体', '水平抛出', '射程', '发射角'], score: 4 },
    { sceneId: 'uniform-accelerated', keywords: ['匀变速', '加速度', '刹车', '追及'], score: 2 }
];

const FIELD_LABELS: Record<string, string> = {
    v0: '初速度',
    v0x: '水平初速度',
    v0y: '竖直初速度',
    angle: '发射角',
    g: '重力加速度',
    height: '初始高度',
    duration: '模拟时长',
    m: '质量',
    mass: '粒子质量',
    m1: '物体1质量',
    m2: '物体2质量',
    v1: '物体1初速度',
    v2: '物体2初速度',
    e: '恢复系数',
    k: '劲度系数',
    A: '振幅',
    damping: '阻尼系数',
    theta: '斜面倾角',
    mu: '摩擦系数',
    Ey: '电场强度',
    Ex: '电场强度',
    Bz: '磁感应强度',
    charge: '电荷量'
};

function normalizeText(text: string): string {
    return text
        .replace(/[，。；、：]/g, ' ')
        .replace(/[（]/g, '(')
        .replace(/[）]/g, ')')
        .replace(/[＝]/g, '=')
        .replace(/[×·]/g, 'x')
        .replace(/\s+/g, ' ')
        .trim();
}

function firstMatch(
    text: string,
    patterns: RegExp[],
    unit: string,
    convert = (n: number, _raw: string) => n
): ParsedValue | null {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match?.[1]) continue;
        const raw = match[1];
        const numeric = Number(raw);
        if (!Number.isFinite(numeric)) continue;
        return { value: convert(numeric, match[0]), unit, source: match[0].trim() };
    }
    return null;
}

/** 单位提取配置：定义一种物理量的 SI 单位、正则模式、换算函数 */
interface UnitSpec {
    siUnit: string;
    buildPatterns: (label: string) => RegExp[];
    toSI: (n: number, raw: string) => number;
}

/** 同构提取的单位定义表（length/velocity/mass 共享同一套 4 模式模板） */
const UNITS: Record<string, UnitSpec> = {
    length: {
        siUnit: 'm',
        buildPatterns: label => [
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(cm|厘米)`, 'i'),
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(m|米)`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(cm|厘米)\\s*(?:的)?(?:${label})`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(m|米)\\s*(?:的)?(?:${label})`, 'i')
        ],
        toSI: (n, raw) => (/cm|厘米/i.test(raw) ? n / 100 : n)
    },
    velocity: {
        siUnit: 'm/s',
        buildPatterns: label => [
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(km/h|千米每小时)`, 'i'),
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(m/s|米每秒)`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(km/h|千米每小时)\\s*(?:的)?(?:${label})`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(m/s|米每秒)\\s*(?:的)?(?:${label})`, 'i')
        ],
        toSI: (n, raw) => (/km\/h|千米每小时/i.test(raw) ? n / 3.6 : n)
    },
    mass: {
        siUnit: 'kg',
        buildPatterns: label => [
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(g|克)`, 'i'),
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(kg|千克)`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(g|克)\\s*(?:的)?(?:${label})`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(kg|千克)\\s*(?:的)?(?:${label})`, 'i')
        ],
        toSI: (n, raw) => (/kg|千克/i.test(raw) ? n : n / 1000)
    }
};

/** 通用物理量提取：根据单位配置从文本中匹配并换算到 SI */
function extractValue(text: string, labels: string[], unit: keyof typeof UNITS): ParsedValue | null {
    const spec = UNITS[unit];
    if (!spec) return null;
    return firstMatch(text, spec.buildPatterns(labels.join('|')), spec.siUnit, spec.toSI);
}

/** 提取长度量 (cm/m → m) */
function lengthValue(text: string, labels: string[]): ParsedValue | null {
    return extractValue(text, labels, 'length');
}

/** 提取速度量 (km/h, m/s → m/s) */
function velocityValue(text: string, labels: string[]): ParsedValue | null {
    return extractValue(text, labels, 'velocity');
}

/** 提取质量量 (g/kg → kg) */
function massValue(text: string, labels: string[]): ParsedValue | null {
    return extractValue(text, labels, 'mass');
}

function unitlessValue(text: string, labels: string[], unit = ''): ParsedValue | null {
    const label = labels.join('|');
    return firstMatch(text, [new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)`, 'i')], unit);
}

function angleValue(text: string, labels: string[]): ParsedValue | null {
    const label = labels.join('|');
    return firstMatch(
        text,
        [
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(°|度)`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(°|度)\\s*(?:的)?(?:${label})`, 'i')
        ],
        '°'
    );
}

function accelerationValue(text: string): ParsedValue | null {
    return firstMatch(
        text,
        [/(?:g|重力加速度)\s*[=为是约]?\s*(-?\d+(?:\.\d+)?)\s*(m\/s²|m\/s2|米每二次方秒)/i],
        'm/s²'
    );
}

function fieldValue(text: string, labels: string[], unitPattern: string, unit: string): ParsedValue | null {
    const label = labels.join('|');
    return firstMatch(
        text,
        [
            new RegExp(`(?:${label})\\s*[=为是约]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*(${unitPattern})`, 'i'),
            new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(${unitPattern})\\s*(?:的)?(?:${label})`, 'i')
        ],
        unit
    );
}

function chargeValue(text: string): ParsedValue | null {
    const direct = firstMatch(
        text,
        [
            /(?:q|电荷量|带电量)\s*[=为是约]?\s*(-?\d+(?:\.\d+)?)\s*(?:x10\^-?19|x10-19|×10\^-?19)?\s*C/i,
            /(-?\d+(?:\.\d+)?)\s*(?:x10\^-?19|x10-19|×10\^-?19)\s*C/i
        ],
        '×10⁻¹⁹ C'
    );
    if (direct) return direct;

    const elementary = firstMatch(
        text,
        [/(?:q|电荷量|带电量)\s*[=为是约]?\s*(-?\d+(?:\.\d+)?)\s*e/i],
        '×10⁻¹⁹ C',
        n => n * 1.6
    );
    return elementary;
}

/** 场景分类：根据关键词匹配打分，返回最佳场景与置信度 */
function classifyScene(text: string): { sceneId: string; confidence: number; warnings: string[] } {
    const scores = new Map<string, number>();
    for (const item of SCENE_KEYWORDS) {
        let score = 0;
        for (const keyword of item.keywords) {
            if (text.includes(keyword)) score += item.score;
        }
        if (score > 0) scores.set(item.sceneId, score);
    }

    if (text.includes('电场') && text.includes('磁场')) {
        scores.set('em-combined', (scores.get('em-combined') ?? 0) + 8);
    }
    if (text.includes('水平抛出') || text.includes('平抛')) {
        scores.set('projectile', (scores.get('projectile') ?? 0) + 6);
    }
    if (text.includes('静止释放') && (text.includes('高') || text.includes('下落'))) {
        scores.set('free-fall', (scores.get('free-fall') ?? 0) + 6);
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) {
        return {
            sceneId: 'projectile',
            confidence: 0.35,
            warnings: ['未识别到明确模型关键词，已默认按抛体运动搭建场景。']
        };
    }

    const [sceneId, topScore] = ranked[0]!;
    const secondScore = ranked[1]?.[1] ?? 0;
    const confidence = Math.min(0.95, 0.45 + topScore / 20 + Math.max(0, topScore - secondScore) / 30);
    const warnings =
        secondScore > 0 && topScore - secondScore <= 2
            ? ['题目关键词可能对应多个模型，请检查自动选择的场景是否符合题意。']
            : [];
    return { sceneId, confidence, warnings };
}

/** 添加提取到的参数（成功提取时写入 params 并记录到 extracted） */
function addParam(
    params: Record<string, number>,
    extracted: ExtractedQuantity[],
    name: string,
    parsed: ParsedValue | null
): void {
    if (!parsed) return;
    params[name] = parsed.value;
    extracted.push({
        label: FIELD_LABELS[name] ?? name,
        value: parsed.value,
        unit: parsed.unit,
        source: parsed.source
    });
}

/** 将提取到的参数限制在场景参数的可视化范围内 */
function clampToScene(sceneId: string, params: Record<string, number>, warnings: string[]): Record<string, number> {
    const scene = getSceneSync(sceneId);
    if (!scene) return params;

    const clamped: Record<string, number> = {};
    for (const param of scene.parameters) {
        const value = params[param.name];
        if (value === undefined) continue;
        const next = Math.max(param.min, Math.min(param.max, value));
        if (next !== value) {
            warnings.push(`${param.label} 超出可视化范围，已限制为 ${next}${param.unit}`);
        }
        clamped[param.name] = next;
    }
    return clamped;
}

function sceneFormulas(sceneId: string): string[] {
    switch (sceneId) {
        case 'projectile':
            return ['vx = v0 cosθ', 'vy = v0 sinθ', 'x = vx t', 'y = vy t - 1/2 gt²'];
        case 'free-fall':
            return ['h = 1/2 gt²', 'v = gt', 'v² = 2gh'];
        case 'uniform-accelerated':
            return ['v = v0 + at', 'x = x0 + v0t + 1/2 at²'];
        case 'electric-field':
            return ['F = qE', 'a = qE / m', 'y = y0 + vy0t + 1/2 at²'];
        case 'magnetic-field':
            return ['F = qvB', 'r = mv / |q|B', 'T = 2πm / |q|B'];
        case 'collision':
            return ['m1v1 + m2v2 = m1v1′ + m2v2′', 'e = (v2′ - v1′) / (v1 - v2)'];
        case 'spring':
            return ['F = -kx', 'ω = √(k/m)', 'T = 2π√(m/k)'];
        case 'inclined-plane':
            return ['a = g(sinθ - μcosθ)', 'N = mgcosθ', 'f = μN'];
        case 'em-combined':
            return ['F = q(E + v × B)', '速度选择条件：v = E / B'];
        default:
            return [];
    }
}

/** 根据场景参数生成物理诊断建议（如飞行时间、加速度等） */
function sceneChecks(sceneId: string, params: Record<string, number>): string[] {
    const checks: string[] = [];
    const g = params.g ?? 9.8;

    if (sceneId === 'projectile') {
        const v0 = params.v0 ?? 20;
        const angle = ((params.angle ?? 45) * Math.PI) / 180;
        const vy = v0 * Math.sin(angle);
        const flight = Math.max(0.1, (2 * vy) / g);
        checks.push(`飞行时间约 ${flight.toFixed(2)} s，用来检查轨迹落点。`);
        checks.push('水平速度应保持不变，竖直速度应随时间线性变化。');
    } else if (sceneId === 'free-fall') {
        const h = params.height ?? 20;
        const t = Math.sqrt((2 * h) / g);
        checks.push(`落地时间约 ${t.toFixed(2)} s，末速度约 ${(g * t).toFixed(2)} m/s。`);
    } else if (sceneId === 'inclined-plane') {
        const theta = ((params.theta ?? 30) * Math.PI) / 180;
        const mu = params.mu ?? 0;
        const a = g * (Math.sin(theta) - mu * Math.cos(theta));
        checks.push(`沿斜面加速度约 ${a.toFixed(2)} m/s²。`);
        checks.push(a < 0 ? '摩擦或初速度方向可能使物体减速，请检查运动方向。' : '速度应沿斜面方向逐渐增大。');
    } else if (sceneId === 'spring') {
        const m = params.m ?? 1;
        const k = params.k ?? 10;
        checks.push(`周期约 ${(2 * Math.PI * Math.sqrt(m / k)).toFixed(2)} s。`);
        checks.push('无阻尼时机械能应近似守恒。');
    } else if (sceneId === 'collision') {
        checks.push('碰撞前后总动量应守恒。');
        checks.push((params.e ?? 1) >= 0.99 ? '弹性碰撞还应近似满足动能守恒。' : '非弹性碰撞中动能通常不守恒。');
    } else if (sceneId === 'electric-field') {
        checks.push('加速度方向应与 qE 方向一致，负电荷方向相反。');
    } else if (sceneId === 'magnetic-field') {
        checks.push('速度大小应保持不变，轨迹半径由 r = mv / |q|B 决定。');
    } else if (sceneId === 'em-combined') {
        checks.push('当 v 接近 E/B 时，粒子应近似匀速直线通过选择器。');
    }

    return checks;
}

/** 按场景推断物理参数：从文本中提取各场景所需的物理量 */
function inferParameters(
    sceneId: string,
    text: string,
    assumptions: string[],
    extracted: ExtractedQuantity[]
): Record<string, number> {
    const params: Record<string, number> = {};

    addParam(params, extracted, 'g', accelerationValue(text));
    addParam(params, extracted, 'duration', fieldValue(text, ['时间', '时长', 't'], 's|秒', 's'));

    if (sceneId === 'projectile') {
        addParam(params, extracted, 'v0', velocityValue(text, ['初速度', '速度', 'v0', 'v']));
        addParam(params, extracted, 'angle', angleValue(text, ['角度', '发射角', 'θ', 'theta']));
        if (text.includes('平抛') || text.includes('水平抛出')) {
            params.angle = 0;
            assumptions.push('识别到平抛/水平抛出，发射角按 0° 处理。');
        }
    } else if (sceneId === 'free-fall') {
        addParam(params, extracted, 'height', lengthValue(text, ['高度', '高处', 'h']));
    } else if (sceneId === 'inclined-plane') {
        addParam(params, extracted, 'm', massValue(text, ['质量', 'm']));
        addParam(params, extracted, 'theta', angleValue(text, ['倾角', '角度', 'θ', 'theta']));
        addParam(params, extracted, 'mu', unitlessValue(text, ['摩擦系数', 'μ', 'mu']));
        addParam(params, extracted, 'v0', velocityValue(text, ['初速度', '速度', 'v0', 'v']));
    } else if (sceneId === 'spring') {
        addParam(params, extracted, 'm', massValue(text, ['质量', 'm']));
        addParam(params, extracted, 'k', fieldValue(text, ['劲度系数', '弹簧系数', 'k'], 'N/m|牛每米', 'N/m'));
        addParam(params, extracted, 'A', lengthValue(text, ['振幅', '位移', 'A', 'x']));
        addParam(params, extracted, 'damping', unitlessValue(text, ['阻尼系数', '阻尼']));
    } else if (sceneId === 'collision') {
        addParam(params, extracted, 'm1', massValue(text, ['m1', '物体1质量', '甲质量']));
        addParam(params, extracted, 'm2', massValue(text, ['m2', '物体2质量', '乙质量']));
        addParam(params, extracted, 'v1', velocityValue(text, ['v1', '物体1速度', '甲速度']));
        addParam(params, extracted, 'v2', velocityValue(text, ['v2', '物体2速度', '乙速度']));
        addParam(params, extracted, 'e', unitlessValue(text, ['恢复系数', 'e']));
    } else if (sceneId === 'electric-field') {
        addParam(params, extracted, 'v0x', velocityValue(text, ['水平速度', '水平初速度', 'vx', 'v0x', '速度']));
        addParam(params, extracted, 'v0y', velocityValue(text, ['竖直速度', '竖直初速度', 'vy', 'v0y']));
        addParam(params, extracted, 'charge', chargeValue(text));
        addParam(params, extracted, 'mass', massValue(text, ['粒子质量', '质量', 'm']));
        addParam(params, extracted, 'Ey', fieldValue(text, ['电场强度', 'Ey', 'E'], 'N/C|V/m|牛每库|伏每米', 'N/C'));
    } else if (sceneId === 'magnetic-field') {
        addParam(params, extracted, 'v0x', velocityValue(text, ['水平速度', '水平初速度', 'vx', 'v0x', '速度']));
        addParam(params, extracted, 'v0y', velocityValue(text, ['竖直速度', '竖直初速度', 'vy', 'v0y']));
        addParam(params, extracted, 'charge', chargeValue(text));
        addParam(params, extracted, 'mass', massValue(text, ['粒子质量', '质量', 'm']));
        addParam(params, extracted, 'Bz', fieldValue(text, ['磁感应强度', '磁场强度', 'B', 'Bz'], 'T|特斯拉', 'T'));
    } else if (sceneId === 'em-combined') {
        addParam(params, extracted, 'v0x', velocityValue(text, ['水平速度', '水平初速度', 'vx', 'v0x', '速度']));
        addParam(params, extracted, 'v0y', velocityValue(text, ['竖直速度', '竖直初速度', 'vy', 'v0y']));
        addParam(params, extracted, 'charge', chargeValue(text));
        addParam(params, extracted, 'mass', massValue(text, ['粒子质量', '质量', 'm']));
        addParam(params, extracted, 'Ex', fieldValue(text, ['电场强度', 'Ex', 'E'], 'N/C|V/m|牛每库|伏每米', 'N/C'));
        addParam(params, extracted, 'Bz', fieldValue(text, ['磁感应强度', '磁场强度', 'B', 'Bz'], 'T|特斯拉', 'T'));
    }

    return params;
}

export async function analyzePhysicsProblem(rawText: string): Promise<ProblemAnalysis> {
    // 场景配置为懒加载(领域 chunk),分析前确保缓存就绪
    await loadAllScenes();
    const text = normalizeText(rawText);
    const extracted: ExtractedQuantity[] = [];
    const assumptions: string[] = [];
    const warnings: string[] = [];
    const { sceneId, confidence } = classifyScene(text);
    const scene = getSceneSync(sceneId) ?? getScenesSync()[0];
    const inferred = inferParameters(sceneId, text, assumptions, extracted);
    const defaults = getDefaultParams(sceneId);
    const merged = { ...defaults, ...clampToScene(sceneId, inferred, warnings) };

    if (scene) {
        for (const param of scene.parameters) {
            if (inferred[param.name] === undefined) {
                assumptions.push(`${param.label} 未在题目中明确给出，使用默认值 ${param.default}${param.unit}。`);
            }
        }
    }

    return {
        sceneId,
        sceneName: scene?.name ?? sceneId,
        confidence,
        parameters: merged,
        extracted,
        formulas: sceneFormulas(sceneId),
        checks: sceneChecks(sceneId, merged),
        assumptions,
        warnings
    };
}
