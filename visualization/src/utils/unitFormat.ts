/** 格式化物理量数值 */
export function formatValue(value: number, decimals = 3): string {
    if (Math.abs(value) < 1e-10) return '0';
    if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
        return value.toExponential(decimals);
    }
    return value.toFixed(decimals);
}

/** 格式化时间 */
export function formatTime(t: number): string {
    return t.toFixed(2) + ' s';
}

/** 格式化带单位的物理量 */
export function formatQuantity(value: number, unit: string, decimals = 3): string {
    return formatValue(value, decimals) + ' ' + unit;
}

/** 格式化向量 */
export function formatVector(x: number, y: number, unit: string, decimals = 2): string {
    return `(${formatValue(x, decimals)}, ${formatValue(y, decimals)}) ${unit}`;
}
