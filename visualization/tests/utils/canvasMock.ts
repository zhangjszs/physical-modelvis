/**
 * 带记录能力的 CanvasRenderingContext2D mock 工厂。
 *
 * 用途：在 snapshot 测试中捕获 draw 函数对 ctx 的全部调用序列，
 * 然后用 serializeCalls 序列化为稳定的字符串用于 toMatchInlineSnapshot。
 *
 * 设计参考：tests/gapScenes.integration.test.ts:81 的 makeRecordingCtx，
 * 但扩展为完整记录参数 + 时序 + 风格变更历史。
 *
 * 与 tests/setup.ts 的全局 no-op mock 共存：
 * - setup.ts 的 mock 让现有测试不破（HTMLCanvasElement.prototype.getContext 拦截）
 * - 本文件 createRecordingCanvas 只在显式调用的测试内使用，不污染全局
 */

/**
 * 单次 ctx 调用记录。
 * - 方法调用：name 为方法名（如 'fillRect'），args 为参数数组
 * - 属性赋值：name 形如 'set fillStyle'，args 为 [新值]
 */
export interface CanvasCall {
    name: string;
    args: unknown[];
}

/**
 * 录制型 canvas mock，包含 ctx 代理 + 调用记录容器。
 */
export interface RecordingCanvas {
    /** 代理对象，作为 CanvasRenderingContext2D 传给 draw 函数 */
    ctx: CanvasRenderingContext2D;
    /** 时序调用序列（含 set 属性） */
    calls: CanvasCall[];
    /** 按方法名计数（不含 set 属性） */
    counts: Record<string, number>;
    /** fillText / strokeText 收集的文本 */
    texts: string[];
    /** fillStyle 历史赋值序列 */
    fills: string[];
    /** strokeStyle 历史赋值序列 */
    strokes: string[];
    /** font 历史赋值序列 */
    fonts: string[];
    /** 清空所有记录（保留容器引用，便于在 it 内重用） */
    reset(): void;
    /** 按方法名过滤调用 */
    filter(name: string): CanvasCall[];
}

/**
 * 创建录制型 canvas mock。
 * @param opts canvas 尺寸，默认 900×600
 */
export function createRecordingCanvas(opts?: { width?: number; height?: number }): RecordingCanvas {
    const width = opts?.width ?? 900;
    const height = opts?.height ?? 600;

    const calls: CanvasCall[] = [];
    const counts: Record<string, number> = {};
    const texts: string[] = [];
    const fills: string[] = [];
    const strokes: string[] = [];
    const fonts: string[] = [];

    const record = (name: string, args: unknown[]): void => {
        calls.push({ name, args });
        if (!name.startsWith('set ')) {
            counts[name] = (counts[name] ?? 0) + 1;
        }
    };

    const canvasObj = { width, height };

    // 渐变 sentinel：addColorStop 为 noop，序列化时用占位字符串
    const gradientSentinel = {
        addColorStop: (...args: unknown[]) => {
            record('gradient.addColorStop', args);
        }
    };

    const handler: ProxyHandler<object> = {
        get(_t, prop) {
            // canvas 属性（部分 draw 函数会读 ctx.canvas.width / height）
            if (prop === 'canvas') return canvasObj;

            // measureText：返回固定 width，保证 snapshot 稳定
            if (prop === 'measureText') {
                return (s: unknown) => {
                    record('measureText', [s]);
                    return { width: String(s).length * 6 };
                };
            }

            // 渐变工厂
            if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient') {
                return (...args: unknown[]) => {
                    record(String(prop), args);
                    return gradientSentinel;
                };
            }

            // 文本相关方法：同时记录到 texts 数组
            if (prop === 'fillText' || prop === 'strokeText') {
                return (s: unknown, ...rest: unknown[]) => {
                    record(String(prop), [s, ...rest]);
                    if (typeof s === 'string') texts.push(s);
                    return undefined;
                };
            }

            // symbol 属性（如 Symbol.toPrimitive、util.inspect.custom）不拦截
            if (typeof prop === 'symbol') return undefined;

            // 其他方法：统一记录
            return (...args: unknown[]) => {
                record(String(prop), args);
                return undefined;
            };
        },
        set(_t, prop, value) {
            const propName = String(prop);
            record(`set ${propName}`, [value]);

            // 收集风格历史
            if (propName === 'fillStyle' && (typeof value === 'string' || typeof value === 'object')) {
                fills.push(typeof value === 'string' ? value : '<gradient>');
            } else if (propName === 'strokeStyle' && (typeof value === 'string' || typeof value === 'object')) {
                strokes.push(typeof value === 'string' ? value : '<gradient>');
            } else if (propName === 'font' && typeof value === 'string') {
                fonts.push(value);
            }

            return true;
        }
    };

    const ctx = new Proxy({} as object, handler) as unknown as CanvasRenderingContext2D;

    return {
        ctx,
        calls,
        counts,
        texts,
        fills,
        strokes,
        fonts,
        reset() {
            calls.length = 0;
            for (const k of Object.keys(counts)) delete counts[k];
            texts.length = 0;
            fills.length = 0;
            strokes.length = 0;
            fonts.length = 0;
        },
        filter(name: string): CanvasCall[] {
            return calls.filter(c => c.name === name);
        }
    };
}

// ============================================================
// 序列化辅助
// ============================================================

/** 序列化时跳过的"噪声"调用名（次数太易变、无信息量） */
const NOISE_METHODS = new Set([
    'save',
    'restore',
    'beginPath',
    'closePath',
    'measureText',
    // 渐变工厂和 addColorStop 是创建过程，不是绘制操作
    'createLinearGradient',
    'createRadialGradient',
    'createConicGradient',
    'gradient.addColorStop',
    'set lineCap',
    'set lineJoin',
    'set textAlign',
    'set textBaseline',
    'set lineDash',
    'set lineDashOffset',
    'set globalAlpha',
    'set globalCompositeOperation',
    'set imageSmoothingEnabled',
    'set imageSmoothingQuality'
]);

/** 需要前缀当前风格的调用 */
const FILL_METHODS = new Set(['fillRect', 'fillText', 'fill', 'arc', 'ellipse']);
const STROKE_METHODS = new Set([
    'strokeRect',
    'strokeText',
    'stroke',
    'lineTo',
    'moveTo',
    'arcTo',
    'bezierCurveTo',
    'quadraticCurveTo',
    'rect'
]);

/**
 * 把 ctx 调用序列序列化为人类可读的字符串。
 *
 * - 跳过 save/restore/beginPath/closePath 等结构调用
 * - 在每个 fill/stroke 方法前缀当前的 fillStyle/strokeStyle/font/lineWidth
 * - 渐变对象用 <gradient> 占位
 * - transform 用 <transform> 占位
 */
export function serializeCalls(calls: CanvasCall[]): string {
    const lines: string[] = [];
    const style: { fill?: string; stroke?: string; font?: string; lineWidth?: number } = {};

    for (const call of calls) {
        const { name, args } = call;

        // 风格变更：记录到 style 但不输出（后续方法调用时前缀）
        if (name === 'set fillStyle') {
            style.fill = args[0] instanceof Object ? '<gradient>' : String(args[0]);
            continue;
        }
        if (name === 'set strokeStyle') {
            style.stroke = args[0] instanceof Object ? '<gradient>' : String(args[0]);
            continue;
        }
        if (name === 'set font') {
            style.font = String(args[0]);
            continue;
        }
        if (name === 'set lineWidth') {
            style.lineWidth = Number(args[0]);
            continue;
        }

        // transform 占位
        if (name === 'setTransform' || name === 'set transform') {
            lines.push('<transform>');
            continue;
        }
        if (name === 'translate' || name === 'rotate' || name === 'scale') {
            // 简化坐标变换为占位（精确数值对 snapshot 不稳定）
            lines.push(`<${name}>`);
            continue;
        }

        // 噪声跳过
        if (NOISE_METHODS.has(name)) continue;

        // 风格前缀（仅当相关风格有变更时输出）
        const prefix: string[] = [];
        if (FILL_METHODS.has(name) && style.fill !== undefined) {
            prefix.push(`fill=${style.fill}`);
        }
        if (STROKE_METHODS.has(name) && style.stroke !== undefined) {
            prefix.push(`stroke=${style.stroke}`);
        }
        if ((name === 'fillText' || name === 'strokeText') && style.font !== undefined) {
            prefix.push(`font=${style.font}`);
        }
        if (STROKE_METHODS.has(name) && style.lineWidth !== undefined) {
            prefix.push(`lw=${style.lineWidth}`);
        }

        const argStr = args.map(formatArg).join(',');
        const prefixStr = prefix.length > 0 ? prefix.join(' ') + ' ' : '';
        lines.push(`${prefixStr}${name}(${argStr})`);
    }

    return lines.join('\n');
}

/** 格式化单个参数为可读字符串 */
function formatArg(arg: unknown): string {
    if (typeof arg === 'string') return `"${arg}"`;
    if (typeof arg === 'number') {
        if (Number.isInteger(arg)) return String(arg);
        return arg.toFixed(3);
    }
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (arg instanceof Object) return '<obj>';
    return String(arg);
}
