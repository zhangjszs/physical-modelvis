import { useCompositionStore, SOURCE_DEFAULTS, type SourceKind } from '../../store/compositionStore';
import { CompositionStage } from './CompositionStage';
import { NumberField } from '../common/NumberField';
import { PanelSection } from '../common/PanelSection';
import type { FieldSource } from 'physics-core';

type UniformFieldZone = Extract<FieldSource, { kind: 'uniform-field-zone' }>;

/**
 * CompositionLab — 自由组合实验台 (L4 页面壳)。
 *
 * 左侧 3D 舞台 (拖拽布点), 右侧控制面板: 器材面板 / 粒子参数 /
 * 选中器材检查器 / 状态反馈。引擎侧由 compositionStore 驱动自动重仿真。
 */

const PALETTE: Array<{ kind: SourceKind; label: string }> = [
    { kind: 'point-charge', label: '＋ 点电荷' },
    { kind: 'charged-plate', label: '▬ 带电平板' },
    { kind: 'straight-wire', label: '│ 载流导线' },
    { kind: 'circular-coil', label: '◯ 圆形线圈' },
    { kind: 'bar-magnet', label: '🧲 条形磁铁' },
    { kind: 'uniform-field-zone', label: '▦ 匀强磁场区' }
];

/** 各类器材可在检查器编辑的数值字段 */
const EDITABLE_FIELDS: Record<SourceKind, Array<{ key: string; label: string; step: number }>> = {
    'point-charge': [{ key: 'charge', label: '电量 q (C)', step: 1e-7 }],
    'charged-plate': [{ key: 'sigma', label: '面电荷密度 σ (C/m²)', step: 1e-7 }],
    'straight-wire': [{ key: 'current', label: '电流 I (A)', step: 0.5 }],
    'circular-coil': [
        { key: 'current', label: '电流 I (A)', step: 0.5 },
        { key: 'turns', label: '匝数 N', step: 1 },
        { key: 'radius', label: '半径 R (m)', step: 0.01 }
    ],
    'bar-magnet': [
        { key: 'magneticMoment', label: '磁矩 m (A·m²)', step: 0.5 },
        { key: 'length', label: '长度 L (m)', step: 0.02 }
    ],
    // 匀强磁场区: 向量型参数 (field/size) 走下方定制编辑区, 此处留空
    'uniform-field-zone': []
};

const KIND_LABEL: Record<SourceKind, string> = {
    'point-charge': '点电荷',
    'charged-plate': '带电平板',
    'straight-wire': '载流导线',
    'circular-coil': '圆形线圈',
    'bar-magnet': '条形磁铁',
    'uniform-field-zone': '匀强磁场区'
};

/** 场线密度档位 (#93): 与 fieldLineSeeds 的 FIELD_LINE_DENSITY 区间一致 */
const DENSITY_OPTIONS: Array<{ value: number; label: string; title: string }> = [
    { value: 0.5, label: '疏', title: '0.5× 密度 — 线条少, 便于指认单根场线' },
    { value: 1, label: '标准', title: '1× 密度 (默认)' },
    { value: 2, label: '密', title: '2× 密度 — 演示电场线疏密对比' }
];

/** 匀强磁场区定制编辑区: 场强 (mT, 保方向改大小) + 三轴尺寸 (m) */
function UniformFieldZoneEditor(props: { id: string; source: UniformFieldZone }) {
    const updateSourceVector = useCompositionStore(s => s.updateSourceVector);
    const { id, source } = props;
    const sizeDims = [
        { key: 'x', label: '尺寸 X (m)' },
        { key: 'y', label: '尺寸 Y (m)' },
        { key: 'z', label: '尺寸 Z (m)' }
    ] as const;
    return (
        <>
            <NumberField
                label="场强 B (mT)"
                step={0.1}
                value={Math.hypot(source.field.x, source.field.y, source.field.z) * 1000}
                onChange={v => {
                    const mag = Math.hypot(source.field.x, source.field.y, source.field.z);
                    const dir =
                        mag > 0
                            ? { x: source.field.x / mag, y: source.field.y / mag, z: source.field.z / mag }
                            : { x: 0, y: 1, z: 0 };
                    const t = v / 1000;
                    updateSourceVector(id, 'field', { x: dir.x * t, y: dir.y * t, z: dir.z * t });
                }}
            />
            {sizeDims.map(dim => (
                <NumberField
                    key={dim.key}
                    label={dim.label}
                    step={0.05}
                    value={source.size[dim.key]}
                    onChange={v => updateSourceVector(id, 'size', { [dim.key]: v })}
                />
            ))}
            <p className="composition-desc">朝向固定 +y, 盒区轴对齐 (旋转编辑随 #100 解锁)。</p>
        </>
    );
}

export function CompositionLab({ onExit }: { onExit: () => void }) {
    const sources = useCompositionStore(s => s.sources);
    const selectedId = useCompositionStore(s => s.selectedId);
    const particle = useCompositionStore(s => s.particle);
    const duration = useCompositionStore(s => s.duration);
    const result = useCompositionStore(s => s.result);
    const validationMessage = useCompositionStore(s => s.validationMessage);
    const addSource = useCompositionStore(s => s.addSource);
    const updateSourceParams = useCompositionStore(s => s.updateSourceParams);
    const removeSource = useCompositionStore(s => s.removeSource);
    const setParticle = useCompositionStore(s => s.setParticle);
    const setDuration = useCompositionStore(s => s.setDuration);
    const showElectricFieldLines = useCompositionStore(s => s.showElectricFieldLines);
    const showMagneticFieldLines = useCompositionStore(s => s.showMagneticFieldLines);
    const toggleElectricFieldLines = useCompositionStore(s => s.toggleElectricFieldLines);
    const toggleMagneticFieldLines = useCompositionStore(s => s.toggleMagneticFieldLines);
    const fieldLineDensity = useCompositionStore(s => s.fieldLineDensity);
    const setFieldLineDensity = useCompositionStore(s => s.setFieldLineDensity);
    const resetLab = useCompositionStore(s => s.resetLab);

    const selected = sources.find(p => p.id === selectedId) ?? null;

    return (
        <div className="classroom-scene composition-layout">
            <div className="composition-stage-wrap">
                <CompositionStage />
                <div className="composition-tip">
                    点击选中 · 按住拖拽布点 (0.05 m 吸附) · 松手自动重算 · 右键旋转视角
                </div>
            </div>

            <aside className="inspector-panel composition-inspector">
                <PanelSection title="🧪 自由组合实验台">
                    <button className="btn btn-sm btn-block" onClick={onExit}>
                        ← 返回教材实验目录
                    </button>
                    <div className="composition-palette-grid">
                        {PALETTE.map(item => (
                            <button
                                key={item.kind}
                                className="btn btn-sm"
                                onClick={() => addSource(item.kind)}
                                title={`添加${KIND_LABEL[item.kind]}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </PanelSection>

                <PanelSection title="带电粒子">
                    <NumberField
                        label="电荷量 q (C)"
                        value={particle.charge}
                        step={1e-8}
                        onChange={v => setParticle({ charge: v })}
                    />
                    <NumberField
                        label="质量 m (kg)"
                        value={particle.mass}
                        step={1e-8}
                        onChange={v => setParticle({ mass: v })}
                    />
                    <NumberField label="仿真时长 (s)" value={duration} step={0.5} onChange={v => setDuration(v)} />
                    <button className="btn btn-sm btn-block composition-reset-btn" onClick={resetLab}>
                        清空实验台
                    </button>
                </PanelSection>

                <PanelSection title="场线显示">
                    <label className="composition-field-label">
                        <input type="checkbox" checked={showElectricFieldLines} onChange={toggleElectricFieldLines} />
                        <span>显示电场线 (E)</span>
                    </label>
                    <label className="composition-field-label">
                        <input type="checkbox" checked={showMagneticFieldLines} onChange={toggleMagneticFieldLines} />
                        <span>显示磁场线 (B)</span>
                    </label>
                    <div className="composition-density-row">
                        <span className="composition-density-title">密度</span>
                        {DENSITY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`btn btn-sm${fieldLineDensity === opt.value ? ' active' : ''}`}
                                onClick={() => setFieldLineDensity(opt.value)}
                                title={opt.title}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="composition-desc">
                        场线由场源实时追踪, 拖拽器材时跟手刷新; 线上箭头指示 E/B 方向, 密度档位演示场线疏密。
                    </p>
                </PanelSection>

                <PanelSection title="选中器材检查器">
                    {!selected && <p className="composition-empty-hint">点击场景中的器材进行编辑</p>}
                    {selected && (
                        <>
                            <p className="composition-selected-tag">
                                {KIND_LABEL[selected.source.kind]} · {selected.id}
                                <button
                                    className="btn btn-sm btn-danger-text"
                                    onClick={() => removeSource(selected.id)}
                                >
                                    删除
                                </button>
                            </p>
                            {EDITABLE_FIELDS[selected.source.kind].map(field => (
                                <NumberField
                                    key={field.key}
                                    label={field.label}
                                    step={field.step}
                                    value={
                                        (selected.source as unknown as Record<string, number | undefined>)[field.key] ??
                                        0
                                    }
                                    onChange={v => updateSourceParams(selected.id, { [field.key]: v })}
                                />
                            ))}
                            {selected.source.kind === 'uniform-field-zone' && (
                                <UniformFieldZoneEditor id={selected.id} source={selected.source} />
                            )}
                        </>
                    )}
                </PanelSection>

                <PanelSection title="状态">
                    {validationMessage && <p className="composition-status-err">⚠ {validationMessage}</p>}
                    {!validationMessage && result && (
                        <p className="composition-status-ok">
                            {result.completed
                                ? `✓ 轨迹求解完成 (${result.trajectory.length} 帧, ${result.stepCount} 步)`
                                : '⚠ 数值发散, 轨迹提前终止'}
                        </p>
                    )}
                    {!validationMessage && result && result.warnings.length > 0 && (
                        <ul className="composition-warn-list">
                            {result.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    )}
                    {sources.length === 0 && (
                        <p className="composition-empty-hint">
                            从上方器材面板添加场源 (默认 {Object.keys(SOURCE_DEFAULTS).length} 类: 点电荷 / 平板 / 导线
                            / 线圈 / 条形磁铁 / 匀强磁场区), 引擎将按叠加原理实时合成电磁场并积分粒子轨迹。
                        </p>
                    )}
                </PanelSection>
            </aside>
        </div>
    );
}
