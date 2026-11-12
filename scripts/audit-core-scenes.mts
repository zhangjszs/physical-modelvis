/**
 * 《高中核心》24 节逐景引擎审计 dump (#159 Phase 2)
 *
 * 用途: 为每一节「高中核心」场景跑**真实链路** ——
 *   scene.buildProblem(defaultParams) → solveProblem → SimulationResult
 * 并把引擎输出 (trajectories / charts / diagnostics.maxValues / extra) 结构化落盘,
 * 供逐节「引擎读数 ↔ 画面/标牌读数」对照取证。
 *
 * 用法 (仓库根目录):
 *   npx tsx scripts/audit-core-scenes.mts            # dump 全部 24 节
 *   npx tsx scripts/audit-core-scenes.mts --only projectile,free-fall
 *   npx tsx scripts/audit-core-scenes.mts --out .scratch/core-audit
 *
 * 产物: <out>/<sceneId>.json —— 每节含
 *   sceneId / name / model / domain / rig / params(默认值)
 *   trajectories[]  { label, points, first, last, min/max 坐标, 步长 }
 *   charts{}        每个键的 { unit, xLabel, yLabel, points, 采样数, 首末值, min/max }
 *   maxValues{}     diagnostics.maxValues 原样
 *   extra{}         extra 通道顶层键 + 结构摘要
 *   probe           非有限数/空结果/缺轨迹等红旗
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAllScenes, getSceneSync } from '../visualization/src/scenes/sceneRegistry';
import { runSceneSimulation } from '../visualization/src/adapters/physicsCoreAdapter';
import { SCENE_TO_MODULE } from '../visualization/src/components/simulation3d/rigs/index';
import { CLASSROOM_SCRIPTS } from '../visualization/src/scenes/classroomScripts';

/** 《高中核心》分组 = classroomScripts 的键集 (侧栏「🌟 高中核心精讲」) */
export const CORE_SCENE_IDS: string[] = Object.keys(CLASSROOM_SCRIPTS);

/** 场景 → 领域子目录归类 (与 src/scenes/scenes/<domain>/ 一致) */
const DOMAIN_BY_MODEL_PREFIX: Array<[RegExp, string]> = [
    [
        /electric|magnetic|current|voltage|circuit|capacitor|em-|electro|induct|resistance|ampere|hall|reed|photoresistor|strain|thermi|security|light-control|bulb|load/i,
        'electromagnetism'
    ],
    [
        /refract|total-internal|polar|holo|interference|diffraction|thin-film|sound|doppler|wave|resonance|forced-vibration|double-pendulum|single-slit|hologram/i,
        'optics'
    ],
    [
        /gas|heat|melting|surface|capillary|wetting|liquid|brownian|diffusion|oil|joule|adiabatic|energy-transformation|perpetuum|black-body|photoelectric|bohr|radioactive|geiger|fission|alpha|decay|cosmic|electron-diffraction|faraday|neutron|radiation/i,
        'modern'
    ],
    [/thermo/i, 'thermodynamics']
];

function domainOf(sceneId: string, model: string): string {
    const hay = `${sceneId} ${model}`;
    for (const [re, dom] of DOMAIN_BY_MODEL_PREFIX) if (re.test(hay)) return dom;
    return 'mechanics';
}

/** 数值摘要 */
function num(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function summarizeArray(arr: unknown[]): { length: number; nonFinite: number } {
    let nonFinite = 0;
    const walk = (v: unknown): void => {
        if (typeof v === 'number') {
            if (!Number.isFinite(v)) nonFinite++;
            return;
        }
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    arr.forEach(walk);
    return { length: arr.length, nonFinite };
}

/** 结构摘要 (不落全量数据, 只描述形状) */
function shapeOf(value: unknown, depth = 0): unknown {
    if (depth > 3) return '…';
    if (Array.isArray(value)) {
        return { __array: true, length: value.length, sample: value.length ? shapeOf(value[0], depth + 1) : null };
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) out[k] = shapeOf(v, depth + 1);
        return out;
    }
    return value;
}

async function main() {
    const argv = process.argv.slice(2);
    const onlyArg = argv.indexOf('--only');
    const only =
        onlyArg >= 0 && argv[onlyArg + 1]
            ? argv[onlyArg + 1]
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean)
            : null;
    const outArg = argv.indexOf('--out');
    const outDir = path.resolve(
        process.cwd(),
        outArg >= 0 && argv[outArg + 1] ? argv[outArg + 1] : '.scratch/core-audit'
    );

    await loadAllScenes();
    const ids = only ?? CORE_SCENE_IDS;
    fs.mkdirSync(outDir, { recursive: true });

    const manifest: Array<Record<string, unknown>> = [];
    for (const id of ids) {
        const scene = getSceneSync(id);
        if (!scene) {
            console.error(`[audit] 场景未注册: ${id}`);
            continue;
        }
        const defaults: Record<string, number> = {};
        for (const p of scene.parameters) defaults[p.name] = p.default;

        const { result, error } = runSceneSimulation(scene, defaults);
        const probe: string[] = [];
        if (error) probe.push(`求解失败: ${error}`);

        const trajectorySummary = (result?.trajectories ?? []).map((pts, idx) => {
            let minX = Infinity,
                maxX = -Infinity,
                minY = Infinity,
                maxY = -Infinity;
            for (const pt of pts) {
                const x = pt.position?.x ?? NaN;
                const y = pt.position?.y ?? NaN;
                if (Number.isFinite(x)) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                }
                if (Number.isFinite(y)) {
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
            const arrStat = summarizeArray(pts as unknown[]);
            if (arrStat.nonFinite > 0) probe.push(`轨迹 #${idx} 含 ${arrStat.nonFinite} 个非有限数`);
            if (pts.length === 0) probe.push(`轨迹 #${idx} 为空`);
            return {
                index: idx,
                count: pts.length,
                tRange: pts.length ? [pts[0].t, pts[pts.length - 1].t] : null,
                first: pts[0] ?? null,
                last: pts[pts.length - 1] ?? null,
                bbox: {
                    minX: Number.isFinite(minX) ? minX : null,
                    maxX: Number.isFinite(maxX) ? maxX : null,
                    minY: Number.isFinite(minY) ? minY : null,
                    maxY: Number.isFinite(maxY) ? maxY : null
                }
            };
        });

        const chartSummary: Record<string, unknown> = {};
        for (const [key, series] of Object.entries(result?.charts ?? {})) {
            if (!series || typeof series !== 'object' || !('points' in series)) continue;
            const pts = series.points ?? [];
            const arrStat = summarizeArray(pts as unknown[]);
            if (arrStat.nonFinite > 0) probe.push(`图表 ${key} 含 ${arrStat.nonFinite} 个非有限数`);
            let min = Infinity,
                max = -Infinity;
            for (const pt of pts) {
                const v = num(pt.y);
                if (v === null) continue;
                min = Math.min(min, v);
                max = Math.max(max, v);
            }
            chartSummary[key] = {
                xLabel: series.xLabel,
                yLabel: series.yLabel,
                xUnit: series.xUnit,
                yUnit: series.yUnit,
                count: pts.length,
                xRange: pts.length ? [pts[0].x, pts[pts.length - 1].x] : null,
                first: pts[0] ?? null,
                last: pts[pts.length - 1] ?? null,
                min: Number.isFinite(min) ? min : null,
                max: Number.isFinite(max) ? max : null
            };
        }

        const maxValues = (result?.diagnostics as { maxValues?: Record<string, number> })?.maxValues ?? {};
        const extra = result?.extra ?? {};

        const record = {
            sceneId: id,
            name: scene.name,
            model: scene.model,
            domain: domainOf(id, scene.model),
            rigModule: SCENE_TO_MODULE[id] ?? null,
            hasTrajectory: scene.hasTrajectory ?? null,
            liveUpdate: scene.liveUpdate ?? null,
            params: defaults,
            parameterRanges: scene.parameters.map(p => ({
                name: p.name,
                label: p.label,
                unit: p.unit,
                min: p.min,
                max: p.max,
                default: p.default
            })),
            trajectories: trajectorySummary,
            charts: chartSummary,
            maxValues,
            extraKeys: Object.keys(extra),
            extraShape: shapeOf(extra),
            error,
            probe
        };
        fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(record, null, 2), 'utf8');
        manifest.push({
            sceneId: id,
            name: scene.name,
            model: scene.model,
            domain: record.domain,
            rigModule: record.rigModule,
            trajCount: trajectorySummary.length,
            chartKeys: Object.keys(chartSummary),
            maxValueKeys: Object.keys(maxValues),
            extraKeys: record.extraKeys,
            error,
            probe
        });
        console.log(
            `[audit] ${id.padEnd(22)} ${String(scene.model).padEnd(26)} traj=${trajectorySummary.length} charts=${Object.keys(chartSummary).length} max=${Object.keys(maxValues).length} extra=[${record.extraKeys.join(',')}] ${probe.length ? '⚠ ' + probe.join('; ') : ''}`
        );
    }

    fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[audit] 共 ${manifest.length} 节 → ${outDir}`);
    console.log(
        `[audit] 高中核心分组总数核对: ${CORE_SCENE_IDS.length} (期望 24) ${CORE_SCENE_IDS.length === 24 ? '✓' : '✗'}`
    );
}

main().catch(err => {
    console.error('[audit] 失败:', err);
    process.exit(1);
});
