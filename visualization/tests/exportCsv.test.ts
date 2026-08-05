import { describe, expect, it } from 'vitest';
import {
    buildFullExport,
    chartsToCsv,
    csvRow,
    downloadCsv,
    escapeCsvField,
    formatCell,
    trajectoriesToCsv
} from '@/utils/exportCsv';
import type { SimulationResult, TrajectoryPoint } from 'physics-core';

function traj(points: Array<{ t: number; x: number; y: number; vx: number; vy: number }>): TrajectoryPoint[] {
    return points.map(p => ({
        t: p.t,
        position: { x: p.x, y: p.y },
        velocity: { x: p.vx, y: p.vy }
    }));
}

const single = [
    traj([
        { t: 0, x: 0, y: 10, vx: 20, vy: 0 },
        { t: 1, x: 20, y: 5.1, vx: 20, vy: -9.8 }
    ])
];

const dual = [
    traj([
        { t: 0, x: 0, y: 0, vx: 1, vy: 0 },
        { t: 1, x: 1, y: 0, vx: 1, vy: 0 }
    ]),
    traj([{ t: 0, x: 5, y: 0, vx: -1, vy: 0 }])
];

describe('formatCell', () => {
    it('有限值截断到 6 位小数', () => {
        expect(formatCell(1.23456789)).toBe('1.234568');
        expect(formatCell(2)).toBe('2');
        expect(formatCell(-0.5)).toBe('-0.5');
    });
    it('非有限值输出空串', () => {
        expect(formatCell(Infinity)).toBe('');
        expect(formatCell(NaN)).toBe('');
        expect(formatCell(-Infinity)).toBe('');
    });
});

describe('escapeCsvField', () => {
    it('逗号/引号/换行需要转义', () => {
        expect(escapeCsvField('a,b')).toBe('"a,b"');
        expect(escapeCsvField('a"b')).toBe('"a""b"');
        expect(escapeCsvField('a\nb')).toBe('"a\nb"');
    });
    it('普通字段原样输出', () => {
        expect(escapeCsvField('plain')).toBe('plain');
        expect(escapeCsvField('')).toBe('');
    });
});

describe('csvRow', () => {
    it('数字经 formatCell, 字符串经转义', () => {
        expect(csvRow([1.5, 'a,b', NaN, 'ok'])).toBe('1.5,"a,b",,ok');
    });
});

describe('trajectoriesToCsv', () => {
    it('单物体: 首行 header 含 time 与 x/y/vx/vy 列', () => {
        const lines = trajectoriesToCsv(single).split('\n');
        expect(lines[0]).toBe('time (s),body1 x (m),body1 y (m),body1 vx (m/s),body1 vy (m/s)');
        expect(lines[1]).toBe('0,0,10,20,0');
        expect(lines[2]).toBe('1,20,5.1,20,-9.8');
    });
    it('多物体: 每物体 4 列, 行数取最长轨迹, 缺帧留空', () => {
        const lines = trajectoriesToCsv(dual).split('\n');
        expect(lines[0]).toBe(
            'time (s),body1 x (m),body1 y (m),body1 vx (m/s),body1 vy (m/s),body2 x (m),body2 y (m),body2 vx (m/s),body2 vy (m/s)'
        );
        expect(lines[1]).toBe('0,0,0,1,0,5,0,-1,0');
        expect(lines[2]).toBe('1,1,0,1,0,,,,'); // body2 缺第 2 帧 → 4 空列
    });
    it('空轨迹输出只有 header', () => {
        expect(trajectoriesToCsv([])).toBe('time (s)');
    });
});

describe('chartsToCsv', () => {
    const charts = {
        x_t: {
            xLabel: '时间',
            yLabel: '位移',
            xUnit: 's',
            yUnit: 'm',
            points: [
                { x: 0, y: 0 },
                { x: 1, y: 4.9 }
            ]
        },
        force_diagram: { bodyId: 'b', forces: [], netForce: { x: 0, y: 0 } }
    } as unknown as SimulationResult['charts'];

    it('每个图表一个块, 块间空行分隔, 含注释头', () => {
        const csv = chartsToCsv(charts);
        const blocks = csv.split('\n\n');
        expect(blocks.length).toBe(1);
        expect(blocks[0]?.split('\n')[0]).toBe('# x_t — 位移 (m)');
        expect(blocks[0]).toContain('时间 (s),位移 (m)');
        expect(blocks[0]).toContain('0,0\n1,4.9');
    });
    it('ForceDiagram 与空 points 系列被跳过', () => {
        expect(chartsToCsv({ force_diagram: charts.force_diagram } as never)).toBe('');
        expect(chartsToCsv({ x_t: { ...charts.x_t, points: [] } } as never)).toBe('');
    });
    it('空图表输出空串', () => {
        expect(chartsToCsv({})).toBe('');
    });
});

describe('buildFullExport', () => {
    const result = {
        meta: { model: 'projectile', solver: 'analytical', computationTime: 1, timestamp: 't0', version: '1.0' },
        trajectories: single,
        charts: chartsToCsv.length ? {} : {}
    } as unknown as SimulationResult;

    it('包含 meta 注释与轨迹段', () => {
        const csv = buildFullExport(result, '抛体运动');
        expect(csv).toContain('# 抛体运动 仿真数据导出');
        expect(csv).toContain('# model: projectile');
        expect(csv).toContain('# === 轨迹数据 ===');
        expect(csv).toContain('time (s),body1 x (m)');
    });
});

describe('downloadCsv', () => {
    it('创建带 BOM 前缀的 blob 并触发下载', () => {
        let captured: Blob | null = null;
        let clicked = false;
        let revoked = '';
        const origCreate = URL.createObjectURL;
        const origRevoke = URL.revokeObjectURL;
        const origClick = HTMLAnchorElement.prototype.click;
        URL.createObjectURL = b => {
            if (b instanceof Blob) captured = b;
            return 'blob:mock';
        };
        URL.revokeObjectURL = u => {
            revoked = u;
        };
        HTMLAnchorElement.prototype.click = function () {
            clicked = true;
        };
        try {
            downloadCsv('test.csv', 'a,b');
        } finally {
            URL.createObjectURL = origCreate;
            URL.revokeObjectURL = origRevoke;
            HTMLAnchorElement.prototype.click = origClick;
        }
        expect(clicked).toBe(true);
        expect(revoked).toBe('blob:mock');
        expect(captured).not.toBeNull();
        expect(captured!.type).toBe('text/csv;charset=utf-8');
    });
});
