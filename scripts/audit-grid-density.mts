/**
 * 《高中核心》24 节 2D 网格密度诊断 (#159 Phase 2 · electric-field 2D 挂死根因)
 *
 * 背景: 修复前的 electric-field 切到 2D 板书模式后**主线程被彻底占死**
 * (page.evaluate 连续三次 15s 超时), 根因定位到
 *   visualization/src/rendering/CanvasRenderer.ts
 *     - calcGridSpacing(scale): 当没有任何 t*scale 落在 [40,120] 时兜底 return 1
 *     - draw2DGrid(): for (x = xStart; x < width; x += screenSpacing) 双重循环
 * 修复前该节默认参数下轨迹 y 跨度 1.916e10 m ⇒ autoFit 得 scale ≈ 2.05e-8 px/m
 * ⇒ screenSpacing ≈ 2.05e-8 px ⇒ 循环次数 ≈ (786/ss) × (393/ss) ≈ 1.5e13 次 ⇒ 卡死。
 *
 * 本脚本按**真实链路** (scene.buildProblem(defaultParams) → solveProblem) 取每节轨迹,
 * 复算 2D autoFit 缩放 → 网格屏幕间距 → draw2DGrid 的实际循环次数,
 * 用于判断「加网格间距下限」这个 guard 对既有 24 节是否有视觉/性能影响。
 *
 * 用法 (仓库根目录):
 *   npx tsx scripts/audit-grid-density.mts
 *   npx tsx scripts/audit-grid-density.mts --only gas-law,photoelectric
 */
import { getSceneSync, loadAllScenes } from '../visualization/src/scenes/sceneRegistry';
import { runSceneSimulation } from '../visualization/src/adapters/physicsCoreAdapter';
import { CLASSROOM_SCRIPTS } from '../visualization/src/scenes/classroomScripts';

/** 2D 画布实际尺寸 (与舞台一致) + CoordinateTransformer.autoFit 的默认 padding */
const CANVAS_W = 786;
const CANVAS_H = 393;
const PADDING = 60;

/** 网格间隔目标表 (与 CanvasRenderer.calcGridSpacing 一致) */
const GRID_TARGETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];

/** calcGridSpacing 的等价实现 (与 CanvasRenderer 保持同步) */
function calcGridSpacing(scale: number): number {
    for (const t of GRID_TARGETS) {
        if (t * scale >= 40 && t * scale <= 120) return t;
    }
    return 1;
}

/** CoordinateTransformer.autoFit (2D 分支) 的等价实现 */
function autoFitScale(points: Array<{ x: number; y: number }>): number {
    if (points.length === 0) return 80;
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    minY = Math.min(minY, 0);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const availW = CANVAS_W - PADDING * 2;
    const availH = CANVAS_H - PADDING * 2;
    return Math.min(availW / rangeX, availH / rangeY);
}

interface Row {
    id: string;
    spanY: number;
    scale: number;
    spacing: number;
    ss: number;
    arcs: number;
}

async function main(): Promise<void> {
    const onlyArg = process.argv.indexOf('--only');
    const only = onlyArg >= 0 ? (process.argv[onlyArg + 1] ?? '').split(',').filter(Boolean) : null;

    await loadAllScenes();
    const ids = Object.keys(CLASSROOM_SCRIPTS).filter(id => !only || only.includes(id));

    const rows: Row[] = [];
    for (const id of ids) {
        const scene = getSceneSync(id);
        if (!scene) {
            console.error(`[grid] 场景未注册: ${id}`);
            continue;
        }
        const defaults: Record<string, number> = {};
        for (const p of scene.parameters) defaults[p.name] = p.default;
        const { result, error } = runSceneSimulation(scene, defaults);
        if (error) console.error(`[grid] ${id} 求解失败: ${error}`);
        const pts = (result?.trajectories ?? []).flatMap(t =>
            t.map(p => ({ x: p.position?.x ?? NaN, y: p.position?.y ?? NaN }))
        );
        if (pts.length === 0) {
            console.error(`[grid] ${id} 无轨迹点, 跳过`);
            continue;
        }
        const scale = autoFitScale(pts);
        const spacing = calcGridSpacing(scale);
        const ss = spacing * scale;
        const arcs = Math.ceil(CANVAS_W / ss) * Math.ceil(CANVAS_H / ss);
        let minY = Infinity,
            maxY = -Infinity;
        for (const p of pts) {
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        rows.push({ id, spanY: maxY - minY, scale, spacing, ss, arcs });
    }

    rows.sort((a, b) => b.arcs - a.arcs);
    console.log(
        'sceneId'.padEnd(22),
        'y跨度(m)'.padEnd(14),
        'scale(px/m)'.padEnd(14),
        '网格物理间距'.padEnd(12),
        '屏幕间距(px)'.padEnd(14),
        'draw2DGrid 循环次数'
    );
    for (const r of rows) {
        console.log(
            r.id.padEnd(22),
            r.spanY.toExponential(3).padEnd(14),
            r.scale.toExponential(3).padEnd(14),
            String(r.spacing).padEnd(12),
            r.ss.toExponential(3).padEnd(14),
            r.arcs.toExponential(3)
        );
    }
    const worst = rows[0];
    if (!worst) {
        console.log('\n[grid] 无数据');
        return;
    }
    console.log(
        `\n最坏: ${worst.id} — 屏幕间距 ${worst.ss.toExponential(3)} px, 循环 ${worst.arcs.toExponential(3)} 次` +
            (worst.arcs > 1e6 ? '  ⇒ 必然拖死主线程 (须加间距下限)' : '  ⇒ 在可接受范围')
    );
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
