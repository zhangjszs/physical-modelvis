/**
 * 递归扫描任意结构中的非有限数值与字符串级 NaN/Infinity (#28)
 *
 * 背景: NaN 一旦被 toFixed()/模板字符串包成文本, 就不再是 number 类型,
 * 导致 Number.isFinite / L9 跨场景鲁棒性 / L3 渲染器公式自检全部失效。
 * 本工具把"人类可读输出中不得出现 NaN/Infinity"变成可自动化门禁。
 *
 * 零依赖 Node ESM, 供三处复用:
 *   - scripts/self-check.mjs (L10 层)
 *   - visualization/tests/accuracy/find-non-finite.test.ts (工具单测)
 *   - visualization/tests/unit/optics-waves.test.ts (替代私有副本)
 */

/**
 * 递归扫描 value, 返回所有非有限数值/含 NaN|Infinity 字符串的路径列表。
 *
 * @param value  任意结构 (number/string/array/object/null/undefined)
 * @param path   当前路径前缀 (用于定位)
 * @returns 问题路径列表 (空数组 = 无问题)
 *
 * 规则:
 *   - number 且 !Number.isFinite → 记录 (NaN/Infinity/-Infinity)
 *   - string 且匹配 /\bNaN\b|\bInfinity\b/ → 记录 (字符串级泄漏)
 *   - array → 递归每个元素, 路径加 [i]
 *   - object (非 null) → 递归每个值, 路径加 .key
 *   - null/undefined/boolean → 跳过
 */
export function findNonFinite(value, path = '') {
    if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}=${value}`];
    if (typeof value === 'string') return /\bNaN\b|\bInfinity\b/.test(value) ? [`${path}="${value}"`] : [];
    if (Array.isArray(value)) return value.flatMap((v, i) => findNonFinite(v, `${path}[${i}]`));
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => findNonFinite(v, path ? `${path}.${k}` : k));
    }
    return [];
}

/**
 * 检查 charts 中的 NaN 是否均为合法 {NaN, NaN} 断点 (与 L9 约定一致)。
 *
 * doppler 的两处扫描在参数进入超声速激波区时会合法产生该断点。
 *
 * @returns 非断点的 NaN 路径列表 (空数组 = 全部合法)
 */
export function findNonBreakMarkerNaNs(result) {
    const charts = (result?.charts ?? {});
    const problems = [];
    for (const [key, series] of Object.entries(charts)) {
        if (!series || !Array.isArray(series.points)) continue;
        for (const [i, p] of series.points.entries()) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
                const isBreak = Number.isNaN(p.x) && Number.isNaN(p.y);
                if (!isBreak) problems.push(`charts.${key}[${i}] x=${p.x} y=${p.y}`);
            }
        }
    }
    return problems;
}
