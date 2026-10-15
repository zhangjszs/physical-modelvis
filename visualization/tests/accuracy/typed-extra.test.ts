/**
 * extra 通道类型化访问层 — 守卫真实性 + 正反用例 (#124)
 *
 * #82 把 charts 键名收进类型层 (chartsOf/getChart); 本单把渲染层残余的
 * extra/meta 双重强转收进同一口径 (engineExtraAccess.ts)。本文件守两件事:
 *   ① 真实性探针 — 两个 extra 消费场景全模式跑真实 solveProblem, 断言守卫**不误拒**
 *      合法结构。引擎若改坏 extra 形状 (键名/类型漂移), 此处即红 —— 而不是像过去
 *      那样靠 `as unknown as` 静默漂进画面。
 *   ② 正反用例 — 手写合法结构通过; 结构性脏数据 (缺键 / 类型错 / NaN / 语义错位)
 *      一律拒为 null, 渲染层据此走 placeholder 回退。
 */

import { describe, it, expect } from 'vitest';
import { solveProblem } from 'physics-core';
import { getScenesSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import { readElectricFieldExtra, readMagFieldExtra } from '../../src/rendering/engineExtraAccess';
import type { SceneConfig } from '../../src/types/visualization';

/** 场景 default 参数 + 覆盖项 */
function paramsOf(scene: SceneConfig, override: Record<string, number> = {}): Record<string, number> {
    const params: Record<string, number> = {};
    for (const p of scene.parameters) params[p.name] = p.default;
    return { ...params, ...override };
}

function sceneById(id: string): SceneConfig {
    const scene = getScenesSync().find(s => s.id === id);
    expect(scene, `${id} 场景存在`).toBeDefined();
    return scene!;
}

describe('#124 extra 访问层真实性探针 (合法结构不被误拒)', () => {
    it('electric-field-lines: 三种模式真实 solve 结果均通过守卫', async () => {
        await loadAllScenes();
        const scene = sceneById('efield-lines');
        for (const mode of [0, 1, 2]) {
            const result = solveProblem(scene.buildProblem(paramsOf(scene, { mode })));
            expect(result.extra, `mode=${mode} 应产出 extra`).toBeDefined();
            const extra = readElectricFieldExtra(result.extra);
            expect(extra, `mode=${mode} 合法结构应通过守卫`).not.toBeNull();
            expect(extra!.fieldLines.length, `mode=${mode} 有电场线`).toBeGreaterThan(0);
            expect(extra!.samples.length, `mode=${mode} 有采样点`).toBeGreaterThan(0);
        }
    });

    it('current-magnetic-field: 三种模式真实 solve 结果均通过守卫', async () => {
        await loadAllScenes();
        const scene = sceneById('current-magnetic');
        for (const mode of [0, 1, 2]) {
            const result = solveProblem(scene.buildProblem(paramsOf(scene, { mode })));
            expect(result.extra, `mode=${mode} 应产出 extra`).toBeDefined();
            const extra = readMagFieldExtra(result.extra);
            expect(extra, `mode=${mode} 合法结构应通过守卫`).not.toBeNull();
            expect(extra!.fieldLines.length, `mode=${mode} 有磁场线`).toBeGreaterThan(0);
            expect(extra!.samples.length, `mode=${mode} 有采样点`).toBeGreaterThan(0);
        }
    });

    it('平行板模式带 plates / 直导线模式带 wire / 线圈模式带 poles — 可选分支均被正确放行', async () => {
        await loadAllScenes();
        const eScene = sceneById('efield-lines');
        const plates = readElectricFieldExtra(solveProblem(eScene.buildProblem(paramsOf(eScene, { mode: 2 }))).extra);
        expect(plates!.plates, 'mode=2 应有 plates 位置盒').toBeDefined();
        expect(plates!.plateField, 'mode=2 应有板间场强').toBeTypeOf('number');

        const mScene = sceneById('current-magnetic');
        const wire = readMagFieldExtra(solveProblem(mScene.buildProblem(paramsOf(mScene, { mode: 0 }))).extra);
        expect(wire!.wire, 'mode=0 应有导线位置').toBeDefined();
        const coil = readMagFieldExtra(solveProblem(mScene.buildProblem(paramsOf(mScene, { mode: 1 }))).extra);
        expect(coil!.poles, 'mode=1 应有 N/S 极位置').toBeDefined();
    });
    it('参数扫描: 极值组合下只要引擎产出 extra 就不得被误拒 (防止画面回退 placeholder)', async () => {
        await loadAllScenes();
        const eScene = sceneById('efield-lines');
        const mScene = sceneById('current-magnetic');
        // 两个守卫的产物类型不同, 这里取并集签名 (extra: unknown) => unknown, 探针只断言「非 null」
        const cases: Array<{
            scene: SceneConfig;
            read: (extra: unknown) => unknown;
            override: Record<string, number>;
        }> = [
            ...[0, 1, 2].flatMap(mode =>
                [1, 5, 10].map(q => ({ scene: eScene, read: readElectricFieldExtra, override: { mode, q } }))
            ),
            { scene: eScene, read: readElectricFieldExtra, override: { mode: 1, dipoleSeparation: 0.4 } },
            { scene: eScene, read: readElectricFieldExtra, override: { mode: 1, dipoleSeparation: 2.0 } },
            { scene: eScene, read: readElectricFieldExtra, override: { mode: 2, plateGap: 0.4 } },
            { scene: eScene, read: readElectricFieldExtra, override: { mode: 2, plateGap: 2.0 } },
            { scene: eScene, read: readElectricFieldExtra, override: { mode: 2, plateVoltage: 50 } },
            ...[0, 1, 2].flatMap(mode =>
                [-20, 0, 20].map(current => ({
                    scene: mScene,
                    read: readMagFieldExtra,
                    override: { mode, current }
                }))
            ),
            { scene: mScene, read: readMagFieldExtra, override: { mode: 1, turns: 1 } },
            { scene: mScene, read: readMagFieldExtra, override: { mode: 2, turns: 50 } }
        ];
        let probed = 0;
        for (const { scene, read, override } of cases) {
            let result;
            try {
                result = solveProblem(scene.buildProblem(paramsOf(scene, override)));
            } catch {
                continue; // 越界/零场等非法输入由 L2 参数契约负责, 不属本探针
            }
            if (!result.extra) continue; // 未产出 extra → 渲染层走原有 placeholder 分支
            probed++;
            expect(read(result.extra), `${scene.id} ${JSON.stringify(override)} 应放行`).not.toBeNull();
        }
        expect(probed, '扫描应覆盖多个真实产出分支').toBeGreaterThan(15);
    });
});

describe('#124 extra 访问层正例 (手写合法结构)', () => {
    const electric = {
        fieldLines: [
            {
                points: [
                    { x: 0, y: 0 },
                    { x: 0.5, y: 0.2 }
                ],
                sign: 1
            },
            { points: [{ x: 1, y: 1 }], sign: -1 }
        ],
        samples: [{ x: 0.1, y: -0.2, ex: 1.5, ey: -0.5, magnitude: 1.58 }],
        plates: { top: 0.6, bottom: -0.6, left: -0.8, right: 0.8 },
        plateField: 100
    };

    it('电场线: 全字段通过, 值原样透传', () => {
        const extra = readElectricFieldExtra(electric);
        expect(extra).not.toBeNull();
        expect(extra!.fieldLines).toHaveLength(2);
        expect(extra!.samples[0]!.ex).toBe(1.5);
        expect(extra!.plates?.right).toBe(0.8);
        expect(extra!.plateField).toBe(100);
    });

    it('电场线: 仅必需字段 (空折线/空采样数组) 也算合法 — 守卫只拒结构性脏数据', () => {
        const extra = readElectricFieldExtra({ fieldLines: [{ points: [] }], samples: [] });
        expect(extra).not.toBeNull();
        expect(extra!.fieldLines[0]!.points).toHaveLength(0);
    });

    it('磁场线: 带 wire / 带 poles / 可选字段齐备均通过', () => {
        expect(readMagFieldExtra({ fieldLines: [{ points: [{ x: 0, y: 0 }] }], samples: [] })).not.toBeNull();
        const withWire = readMagFieldExtra({
            fieldLines: [],
            samples: [{ x: 0, y: 0, bx: 1, by: 2, magnitude: 1 }],
            wire: { x: 0.3, y: -0.2 }
        });
        expect(withWire?.wire?.x).toBe(0.3);
        const withPoles = readMagFieldExtra({
            fieldLines: [],
            samples: [],
            poles: { north: { x: 0, y: 0.5 }, south: { x: 0, y: -0.5 } }
        });
        expect(withPoles?.poles?.north.y).toBe(0.5);
    });
});

describe('#124 extra 访问层反例 (结构漂移被拒 → null)', () => {
    /** 电场线基准合法结构, 反例在其上做单点破坏 */
    const base = () => ({
        fieldLines: [{ points: [{ x: 0, y: 0 }], sign: 1 }],
        samples: [{ x: 0.1, y: 0.2, ex: 1, ey: 2, magnitude: 2.236 }]
    });

    it('undefined / null / 非对象 → null', () => {
        expect(readElectricFieldExtra(undefined)).toBeNull();
        expect(readElectricFieldExtra(null)).toBeNull();
        expect(readElectricFieldExtra(42)).toBeNull();
        expect(readMagFieldExtra('fieldLines')).toBeNull();
    });

    it('缺必需键 fieldLines 或 samples → null', () => {
        expect(readElectricFieldExtra({ samples: base().samples })).toBeNull();
        expect(readElectricFieldExtra({ fieldLines: base().fieldLines })).toBeNull();
        expect(readMagFieldExtra({ fieldLines: [], samples: [], profile: undefined })).not.toBeNull();
        expect(readMagFieldExtra({})).toBeNull();
    });

    it('fieldLines 非数组 / 折线顶点非数值 → null', () => {
        expect(readElectricFieldExtra({ ...base(), fieldLines: 'oops' })).toBeNull();
        expect(readElectricFieldExtra({ ...base(), fieldLines: [{ points: [{ x: 0, y: '1' }] }] })).toBeNull();
        expect(readElectricFieldExtra({ ...base(), fieldLines: [{ points: 3 }] })).toBeNull();
    });

    it('采样点分量缺失 / NaN / Infinity → null (与自检 L10 非有限值口径一致)', () => {
        const noEy = { x: 0.1, y: 0.2, ex: 1, magnitude: 2.236 };
        expect(readElectricFieldExtra({ ...base(), samples: [noEy] })).toBeNull();
        expect(
            readElectricFieldExtra({ ...base(), samples: [{ x: NaN, y: 0, ex: 1, ey: 2, magnitude: 3 }] })
        ).toBeNull();
        expect(
            readElectricFieldExtra({ ...base(), samples: [{ x: 0, y: 0, ex: Infinity, ey: 0, magnitude: 1 }] })
        ).toBeNull();
        expect(
            readMagFieldExtra({ ...base(), samples: [{ x: 0, y: 0, bx: 0, by: 0, magnitude: Number.NaN }] })
        ).toBeNull();
    });

    it('通道语义错位: 磁场结构 (bx/by) 不被电场守卫接受, 反之亦然', () => {
        const magSamples = [{ x: 0, y: 0, bx: 1, by: 2, magnitude: 2.236 }];
        const eleSamples = [{ x: 0, y: 0, ex: 1, ey: 2, magnitude: 2.236 }];
        expect(readElectricFieldExtra({ ...base(), samples: magSamples })).toBeNull();
        expect(readMagFieldExtra({ fieldLines: [], samples: eleSamples })).toBeNull();
    });

    it('可选字段类型错 (plates/plateField/wire/poles) → null', () => {
        expect(readElectricFieldExtra({ ...base(), plates: { top: 1, bottom: -1, left: 0 } })).toBeNull();
        expect(readElectricFieldExtra({ ...base(), plateField: '强' })).toBeNull();
        expect(readMagFieldExtra({ fieldLines: [], samples: [], wire: { x: 0 } })).toBeNull();
        expect(readMagFieldExtra({ fieldLines: [], samples: [], poles: { north: { x: 0, y: 0 } } })).toBeNull();
    });
});

describe('#124 meta.duration 类型层声明 (渲染层回退口径不变)', () => {
    it('引擎 meta 不含 duration 字段 → 渲染层 ?? 默认时长分支保持生效', async () => {
        await loadAllScenes();
        const scene = sceneById('efield-lines');
        const result = solveProblem(scene.buildProblem(paramsOf(scene)));
        // 引擎 makeMeta 统一产出五字段; duration 为可选声明, 当前不产出
        expect(result.meta.model).toBe('electric-field-lines');
        expect(result.meta.duration).toBeUndefined();
        expect(result.meta.duration ?? 5).toBe(5);
    });
});
