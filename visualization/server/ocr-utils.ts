/**
 * OCR 识别结果解析与归一化 — 纯函数模块 (可测试, 无 HTTP/IO 副作用)
 *
 * 职责:
 *   1. stripJsonFence: 剥离 AI 输出常见的 ```json ... ``` 围栏
 *   2. normalizeRecognizeResult: 将 AI 返回的 JSON 归一化为统一的
 *      { problems: RecognizedProblem[] } 结构 (支持多题 / 单题对象 / 数组三种形态)
 */
export type OcrProblemType = 'single-choice' | 'multiple-choice' | 'fill-blank' | 'essay';

export interface RecognizedProblem {
    index?: number;
    type?: OcrProblemType;
    title?: string;
    description?: string;
    source?: string;
    given?: Record<string, unknown>;
    options?: Array<{ letter: string; text: string }>;
    answer?: { correct?: string[]; explanation?: string };
    sceneTemplate?: string | null;
    formulas?: string[];
}

export interface RecognizeResponse {
    problems: RecognizedProblem[];
}

/** 剥离 ```json ... ``` 代码围栏 (若存在) */
export function stripJsonFence(content: string): string {
    const trimmed = content.trim();
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    return match ? match[1]!.trim() : trimmed;
}

const ALLOWED_TYPES: OcrProblemType[] = ['single-choice', 'multiple-choice', 'fill-blank', 'essay'];

function sanitizeProblem(raw: unknown): RecognizedProblem | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const problem: RecognizedProblem = {};
    if (typeof obj.title === 'string') problem.title = obj.title;
    if (typeof obj.description === 'string') problem.description = obj.description;
    if (typeof obj.source === 'string') problem.source = obj.source;
    if (obj.given && typeof obj.given === 'object' && !Array.isArray(obj.given)) {
        problem.given = obj.given as Record<string, unknown>;
    }
    if (Array.isArray(obj.options)) {
        problem.options = obj.options
            .filter((o): o is { letter: string; text: string } => {
                if (!o || typeof o !== 'object') return false;
                const c = o as Record<string, unknown>;
                return typeof c.letter === 'string' && typeof c.text === 'string';
            })
            .map(o => ({ letter: o.letter, text: o.text }));
    }
    if (obj.answer && typeof obj.answer === 'object' && !Array.isArray(obj.answer)) {
        const a = obj.answer as Record<string, unknown>;
        const answer: { correct?: string[]; explanation?: string } = {};
        if (Array.isArray(a.correct)) {
            answer.correct = a.correct.filter((c): c is string => typeof c === 'string');
        }
        if (typeof a.explanation === 'string') answer.explanation = a.explanation;
        problem.answer = answer;
    }
    if (obj.sceneTemplate === null || typeof obj.sceneTemplate === 'string') {
        problem.sceneTemplate = obj.sceneTemplate as string | null;
    }
    if (Array.isArray(obj.formulas)) {
        problem.formulas = obj.formulas.filter((f): f is string => typeof f === 'string');
    }
    const type = typeof obj.type === 'string' ? (obj.type as OcrProblemType) : undefined;
    if (type && ALLOWED_TYPES.includes(type)) problem.type = type;
    return problem;
}

/**
 * 归一化 AI 返回的识别结果:
 *   - 新格式 { problems: [...] }
 *   - 单题对象 { title, ... } (向后兼容)
 *   - 数组 [{...}, {...}]
 * 统一输出 { problems: [...] }, 并补齐 1-based 题号; 非法项过滤。
 */
export function normalizeRecognizeResult(parsed: unknown): RecognizeResponse {
    let rawItems: unknown[] = [];
    if (Array.isArray(parsed)) {
        rawItems = parsed;
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.problems)) {
            rawItems = obj.problems;
        } else {
            rawItems = [obj];
        }
    }

    const problems = rawItems
        .map(sanitizeProblem)
        .filter((p): p is RecognizedProblem => p !== null)
        .map((p, i) => ({ ...p, index: i + 1 }));

    return { problems };
}
