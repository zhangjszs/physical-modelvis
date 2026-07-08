/**
 * 参数安全取值助手
 *
 * `params['key'] ?? default` 只捕 null/undefined；slider 清空产生的 NaN 会穿透到
 * cos/sin 产生 NaN 球体坐标。Number.isNaN 双重守卫堵住这条路径。
 */
export const num = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
};
