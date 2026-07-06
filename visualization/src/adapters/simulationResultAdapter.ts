import type { SimulationResult, ChartSeries } from 'physics-core';
import type { GraphSeries, GraphType } from '../types/visualization';

/** 从 SimulationResult 提取曲线数据 */
export function extractGraphSeries(result: SimulationResult, graphType: GraphType): GraphSeries[] {
    const trajectory = result.trajectories[0];
    if (!trajectory || trajectory.length === 0) return [];

    switch (graphType) {
        case 'x_t':
            return [
                {
                    label: 'x',
                    data: trajectory.map(p => ({ t: p.t, value: p.position.x })),
                    unit: 'm',
                    color: '#3b82f6'
                }
            ];
        case 'y_t':
            return [
                {
                    label: 'y',
                    data: trajectory.map(p => ({ t: p.t, value: p.position.y })),
                    unit: 'm',
                    color: '#22c55e'
                }
            ];
        case 'vx_t':
            return [
                {
                    label: 'vx',
                    data: trajectory.map(p => ({ t: p.t, value: p.velocity.x })),
                    unit: 'm/s',
                    color: '#3b82f6'
                }
            ];
        case 'vy_t':
            return [
                {
                    label: 'vy',
                    data: trajectory.map(p => ({ t: p.t, value: p.velocity.y })),
                    unit: 'm/s',
                    color: '#22c55e'
                }
            ];
        case 'a_t':
            return [
                {
                    label: 'a',
                    data: trajectory.map(p => ({
                        t: p.t,
                        value: p.acceleration ? Math.sqrt(p.acceleration.x ** 2 + p.acceleration.y ** 2) : 0
                    })),
                    unit: 'm/s²',
                    color: '#f97316'
                }
            ];
        case 'ke_t':
            return [
                {
                    label: '动能',
                    data: trajectory.map(p => ({ t: p.t, value: p.kineticEnergy ?? 0 })),
                    unit: 'J',
                    color: '#22c55e'
                }
            ];
        case 'pe_t':
            return [
                {
                    label: '势能',
                    data: trajectory.map(p => ({ t: p.t, value: p.potentialEnergy ?? 0 })),
                    unit: 'J',
                    color: '#3b82f6'
                }
            ];
        case 'total_e_t':
            return [
                {
                    label: '机械能',
                    data: trajectory.map(p => ({
                        t: p.t,
                        value: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0)
                    })),
                    unit: 'J',
                    color: '#f59e0b'
                }
            ];
        case 'p_t':
            return [
                {
                    label: '动量',
                    data: trajectory.map(p => {
                        const mass = 1; // 从 result 元数据无法直接获取，使用默认值
                        const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
                        return { t: p.t, value: mass * speed };
                    }),
                    unit: 'kg·m/s',
                    color: '#a855f7'
                }
            ];
        case 'F_t':
            // 第三章: 优先使用 physics-core 返回的 F_t ChartSeries (牛顿第三定律)
            if (result.charts.F_t) {
                return [chartSeriesToGraphSeries(result.charts.F_t, 'F', '#ef4444')];
            }
            return [
                {
                    label: '合力',
                    data: trajectory.map(p => ({
                        t: p.t,
                        value: p.acceleration ? Math.sqrt(p.acceleration.x ** 2 + p.acceleration.y ** 2) : 0
                    })),
                    unit: 'N',
                    color: '#ef4444'
                }
            ];
        case 'F_theta':
            // 第三章: 力的合成 — 合力随夹角变化曲线
            if (result.charts.F_theta) {
                return [chartSeriesToGraphSeries(result.charts.F_theta, '合力 F', '#22c55e')];
            }
            return [];
        case 'f_N':
            // 第三章: 滑动摩擦力 — f-N 关系曲线
            if (result.charts.f_N) {
                return [chartSeriesToGraphSeries(result.charts.f_N, '摩擦力 f', '#ef4444')];
            }
            return [];
    }
}

/** 从 ChartSeries 转换为 GraphSeries */
export function chartSeriesToGraphSeries(cs: ChartSeries, label: string, color: string): GraphSeries {
    return {
        label,
        data: cs.points.map(p => ({ t: p.x, value: p.y })),
        unit: cs.yUnit,
        color
    };
}
