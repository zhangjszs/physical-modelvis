import { useCompositionStore, SOURCE_DEFAULTS, type SourceKind } from '../../store/compositionStore';
import { CompositionStage } from './CompositionStage';

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
    { kind: 'circular-coil', label: '◯ 圆形线圈' }
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
    ]
};

const KIND_LABEL: Record<SourceKind, string> = {
    'point-charge': '点电荷',
    'charged-plate': '带电平板',
    'straight-wire': '载流导线',
    'circular-coil': '圆形线圈'
};

function NumberField(props: { label: string; value: number; step: number; onChange: (value: number) => void }) {
    return (
        <label className="composition-field">
            <span>{props.label}</span>
            <input
                type="number"
                value={props.value}
                step={props.step}
                onChange={e => {
                    const parsed = Number(e.target.value);
                    if (Number.isFinite(parsed)) props.onChange(parsed);
                }}
            />
        </label>
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
    const resetLab = useCompositionStore(s => s.resetLab);

    const selected = sources.find(p => p.id === selectedId) ?? null;

    return (
        <div className="classroom-scene" style={{ display: 'flex', gap: 12, height: '100%' }}>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <CompositionStage />
                <div
                    style={{
                        position: 'absolute',
                        left: 12,
                        top: 12,
                        fontSize: 12,
                        color: '#64748b',
                        background: 'rgba(255,255,255,0.72)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        pointerEvents: 'none'
                    }}
                >
                    点击选中 · 按住拖拽布点 (0.05 m 吸附) · 松手自动重算 · 右键旋转视角
                </div>
            </div>

            <aside className="inspector-panel" style={{ width: 300, flexShrink: 0, overflowY: 'auto' }}>
                <div className="panel-section">
                    <div className="panel-title">🧪 自由组合实验台</div>
                    <button className="btn btn-sm" style={{ width: '100%' }} onClick={onExit}>
                        ← 返回教材实验目录
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
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
                </div>

                <div className="panel-section">
                    <div className="panel-title">带电粒子</div>
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
                    <button className="btn btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={resetLab}>
                        清空实验台
                    </button>
                </div>

                <div className="panel-section">
                    <div className="panel-title">场线显示</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '4px 0' }}>
                        <input type="checkbox" checked={showElectricFieldLines} onChange={toggleElectricFieldLines} />
                        <span>显示电场线 (E)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '4px 0' }}>
                        <input type="checkbox" checked={showMagneticFieldLines} onChange={toggleMagneticFieldLines} />
                        <span>显示磁场线 (B)</span>
                    </label>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>
                        场线由场源实时追踪, 拖拽器材时跟手刷新; 线上箭头指示 E/B 方向。
                    </p>
                </div>

                <div className="panel-section">
                    <div className="panel-title">选中器材检查器</div>
                    {!selected && <p style={{ fontSize: 12, color: '#94a3b8' }}>点击场景中的器材进行编辑</p>}
                    {selected && (
                        <>
                            <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 8px' }}>
                                {KIND_LABEL[selected.source.kind]} · {selected.id}
                                <button
                                    className="btn btn-sm"
                                    style={{ float: 'right', color: '#dc2626' }}
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
                        </>
                    )}
                </div>

                <div className="panel-section">
                    <div className="panel-title">状态</div>
                    {validationMessage && <p style={{ fontSize: 12, color: '#dc2626' }}>⚠ {validationMessage}</p>}
                    {!validationMessage && result && (
                        <p style={{ fontSize: 12, color: '#16a34a' }}>
                            {result.completed
                                ? `✓ 轨迹求解完成 (${result.trajectory.length} 帧, ${result.stepCount} 步)`
                                : '⚠ 数值发散, 轨迹提前终止'}
                        </p>
                    )}
                    {!validationMessage && result && result.warnings.length > 0 && (
                        <ul style={{ fontSize: 11, color: '#b45309', paddingLeft: 16 }}>
                            {result.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    )}
                    {sources.length === 0 && (
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>
                            从上方器材面板添加场源 (默认 {Object.keys(SOURCE_DEFAULTS).length} 类: 点电荷 / 平板 / 导线
                            / 线圈), 引擎将按叠加原理实时合成电磁场并积分粒子轨迹。
                        </p>
                    )}
                </div>
            </aside>
        </div>
    );
}
