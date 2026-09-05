import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { findFrameIndex, interpolateFrame, getTotalDuration } from '../../utils/frameUtils';

interface Point {
    x: number;
    y: number;
}

interface PhotogateState {
    id: 'A' | 'B';
    name: string;
    pos: Point; // in viewport px
    color: string;
    isBlocked: boolean;
    lastTriggerTime: number | null;
    dtMs: number | null;
    speed: number | null;
}

/**
 * 舞台悬浮交互测量工具箱 (方案 B 核心)
 * 支持：
 * 1. 📏 自由拖拽/旋转/伸缩毫米刻度直尺 (Acrylic Draggable Ruler)
 * 2. ⏱️ 自由摆放双光电门测速仪 (Interactive Dual Photogate Timer)
 */
export function MeasurementToolbox() {
    const containerRef = useRef<HTMLDivElement>(null);

    // 工具开启状态
    const [rulerOpen, setRulerOpen] = useState(false);
    const [photogateOpen, setPhotogateOpen] = useState(false);

    // =========================================================================
    // 1. 直尺状态 (Ruler)
    // =========================================================================
    // 端点 A 与端点 B (屏幕像素坐标)
    const [pointA, setPointA] = useState<Point>({ x: 80, y: 320 });
    const [pointB, setPointB] = useState<Point>({ x: 380, y: 320 });
    const [rulerScaleUnit, setRulerScaleUnit] = useState<'m' | 'cm'>('m');

    // 拖拽状态: 'body' | 'handleA' | 'handleB' | null
    const [rulerDragging, setRulerDragging] = useState<'body' | 'handleA' | 'handleB' | null>(null);
    const dragStartPosRef = useRef<{ clientX: number; clientY: number; startA: Point; startB: Point }>({
        clientX: 0,
        clientY: 0,
        startA: { x: 0, y: 0 },
        startB: { x: 0, y: 0 }
    });

    // 直尺物理计算
    const rulerMetrics = useMemo(() => {
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const lengthPx = Math.sqrt(dx * dx + dy * dy);
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

        // 默认比例：以 100px = 1.0m (或 10px = 1cm) 作为物理标定
        const pxPerMeter = 100;
        const lengthMeter = lengthPx / pxPerMeter;
        const dxMeter = Math.abs(dx) / pxPerMeter;
        const dyMeter = Math.abs(dy) / pxPerMeter;

        return {
            lengthPx,
            angleRad,
            angleDeg,
            lengthMeter,
            dxMeter,
            dyMeter
        };
    }, [pointA, pointB]);

    // =========================================================================
    // 2. 光电门状态 (Photogates)
    // =========================================================================
    const [gateA, setGateA] = useState<PhotogateState>({
        id: 'A',
        name: '光电门 1',
        pos: { x: 220, y: 260 },
        color: '#38bdf8',
        isBlocked: false,
        lastTriggerTime: null,
        dtMs: null,
        speed: null
    });

    const [gateB, setGateB] = useState<PhotogateState>({
        id: 'B',
        name: '光电门 2',
        pos: { x: 420, y: 260 },
        color: '#f59e0b',
        isBlocked: false,
        lastTriggerTime: null,
        dtMs: null,
        speed: null
    });

    const [draggingGate, setDraggingGate] = useState<'A' | 'B' | null>(null);
    const gateDragStartRef = useRef<{ clientX: number; clientY: number; startPos: Point }>({
        clientX: 0,
        clientY: 0,
        startPos: { x: 0, y: 0 }
    });

    // 监听仿真运行状态，用于光电门穿行触发
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const currentTime = useSimulationStore(s => s.currentTime);
    const isPlaying = useSimulationStore(s => s.isPlaying);

    // 实时监测小球穿过光电门
    useEffect(() => {
        if (!photogateOpen || !simulationResult || simulationResult.trajectories.length === 0) return;
        const trajectory = simulationResult.trajectories[0] ?? [];
        if (trajectory.length < 2) return;

        const idx = findFrameIndex(simulationResult.trajectories, currentTime);
        const p0 = trajectory[idx];
        const p1 = trajectory[Math.min(idx + 1, trajectory.length - 1)];
        if (!p0 || !p1) return;

        const frame = interpolateFrame(p0, p1, currentTime);
        const speed = Math.sqrt(frame.velocity.x * frame.velocity.x + frame.velocity.y * frame.velocity.y);

        // 视口相对投影：假设舞台中心基准点 (简化模型)
        // 判定小球经过光电门
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        // 小球物理速度映射挡光时间 (挡光片宽度假定为 0.05m / 5cm)
        const flagWidth = 0.05; // 5cm
        const currentDtMs = speed > 0.01 ? (flagWidth / speed) * 1000 : null;

        // 根据时间戳比对穿过门 A 与门 B 的时刻
        const totalDuration = getTotalDuration(simulationResult.trajectories) || 5;
        const normTime = currentTime / Math.max(0.01, totalDuration);

        // 门 A 在 20%~40% 路径区间响应，门 B 在 50%~80% 区间响应
        const thresholdA = (gateA.pos.x - 50) / Math.max(100, rect.width - 100);
        const thresholdB = (gateB.pos.x - 50) / Math.max(100, rect.width - 100);

        const isTriggerA = Math.abs(normTime - thresholdA) < 0.04 && isPlaying;
        const isTriggerB = Math.abs(normTime - thresholdB) < 0.04 && isPlaying;

        if (isTriggerA && !gateA.isBlocked) {
            setGateA(prev => ({
                ...prev,
                isBlocked: true,
                lastTriggerTime: currentTime,
                dtMs: currentDtMs,
                speed: speed
            }));
        } else if (!isTriggerA && gateA.isBlocked) {
            setGateA(prev => ({ ...prev, isBlocked: false }));
        }

        if (isTriggerB && !gateB.isBlocked) {
            setGateB(prev => ({
                ...prev,
                isBlocked: true,
                lastTriggerTime: currentTime,
                dtMs: currentDtMs,
                speed: speed
            }));
        } else if (!isTriggerB && gateB.isBlocked) {
            setGateB(prev => ({ ...prev, isBlocked: false }));
        }
    }, [
        currentTime,
        isPlaying,
        photogateOpen,
        simulationResult,
        gateA.pos.x,
        gateA.isBlocked,
        gateB.pos.x,
        gateB.isBlocked
    ]);

    // 清空光电门数据
    const handleResetPhotogateData = useCallback(() => {
        setGateA(prev => ({ ...prev, isBlocked: false, lastTriggerTime: null, dtMs: null, speed: null }));
        setGateB(prev => ({ ...prev, isBlocked: false, lastTriggerTime: null, dtMs: null, speed: null }));
    }, []);

    // =========================================================================
    // 3. 统一全局 Pointer 事件处理 (支持平滑拖拽与多点触控)
    // =========================================================================
    const handlePointerDownRuler = (type: 'body' | 'handleA' | 'handleB', e: React.PointerEvent) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setRulerDragging(type);
        dragStartPosRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            startA: { ...pointA },
            startB: { ...pointB }
        };
    };

    const handlePointerDownGate = (gate: 'A' | 'B', e: React.PointerEvent) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingGate(gate);
        gateDragStartRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            startPos: gate === 'A' ? { ...gateA.pos } : { ...gateB.pos }
        };
    };

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            // 直尺拖拽逻辑
            if (rulerDragging) {
                const dx = e.clientX - dragStartPosRef.current.clientX;
                const dy = e.clientY - dragStartPosRef.current.clientY;

                if (rulerDragging === 'body') {
                    setPointA({
                        x: dragStartPosRef.current.startA.x + dx,
                        y: dragStartPosRef.current.startA.y + dy
                    });
                    setPointB({
                        x: dragStartPosRef.current.startB.x + dx,
                        y: dragStartPosRef.current.startB.y + dy
                    });
                } else if (rulerDragging === 'handleA') {
                    setPointA({
                        x: dragStartPosRef.current.startA.x + dx,
                        y: dragStartPosRef.current.startA.y + dy
                    });
                } else if (rulerDragging === 'handleB') {
                    setPointB({
                        x: dragStartPosRef.current.startB.x + dx,
                        y: dragStartPosRef.current.startB.y + dy
                    });
                }
            }

            // 光电门拖拽逻辑
            if (draggingGate) {
                const dx = e.clientX - gateDragStartRef.current.clientX;
                const dy = e.clientY - gateDragStartRef.current.clientY;

                if (draggingGate === 'A') {
                    setGateA(prev => ({
                        ...prev,
                        pos: {
                            x: Math.max(30, gateDragStartRef.current.startPos.x + dx),
                            y: Math.max(40, gateDragStartRef.current.startPos.y + dy)
                        }
                    }));
                } else {
                    setGateB(prev => ({
                        ...prev,
                        pos: {
                            x: Math.max(30, gateDragStartRef.current.startPos.x + dx),
                            y: Math.max(40, gateDragStartRef.current.startPos.y + dy)
                        }
                    }));
                }
            }
        },
        [rulerDragging, draggingGate]
    );

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        setRulerDragging(null);
        setDraggingGate(null);
    }, []);

    // 综合两门加速度与时间差
    const dualGateSummary = useMemo(() => {
        if (!gateA.speed || !gateB.speed || !gateA.lastTriggerTime || !gateB.lastTriggerTime) {
            return null;
        }
        const deltaT = Math.abs(gateB.lastTriggerTime - gateA.lastTriggerTime);
        const distPx = Math.abs(gateB.pos.x - gateA.pos.x);
        const distM = distPx / 100;
        const avgSpeed = deltaT > 0 ? distM / deltaT : 0;
        const accel = deltaT > 0 ? (gateB.speed - gateA.speed) / deltaT : 0;

        return {
            deltaT,
            distM,
            avgSpeed,
            accel
        };
    }, [gateA.speed, gateB.speed, gateA.lastTriggerTime, gateB.lastTriggerTime, gateA.pos.x, gateB.pos.x]);

    return (
        <div
            ref={containerRef}
            className="measurement-toolbox-overlay"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* 顶层浮动工具条 */}
            <div className="measurement-toolbar">
                <button
                    className={`tool-btn ${rulerOpen ? 'active' : ''}`}
                    onClick={() => setRulerOpen(prev => !prev)}
                    title="开启或隐藏可拖拽多功能直尺"
                >
                    📏 {rulerOpen ? '收起测量尺' : '移动测量尺'}
                </button>
                <button
                    className={`tool-btn ${photogateOpen ? 'active' : ''}`}
                    onClick={() => setPhotogateOpen(prev => !prev)}
                    title="开启或隐藏自由摆放光电门测速仪"
                >
                    ⏱️ {photogateOpen ? '收起光电门' : '光电门测速仪'}
                </button>
            </div>

            {/* ============================================================= */}
            {/* 1. 可拖拽旋转多功能刻度直尺 (SVG 精密亚克力尺) */}
            {/* ============================================================= */}
            {rulerOpen && (
                <div className="ruler-wrapper">
                    <svg
                        className="ruler-svg"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        }}
                    >
                        <defs>
                            <linearGradient id="acrylicGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(254, 240, 138, 0.45)" />
                                <stop offset="50%" stopColor="rgba(253, 224, 71, 0.25)" />
                                <stop offset="100%" stopColor="rgba(250, 204, 21, 0.45)" />
                            </linearGradient>
                            <filter id="rulerGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.25)" />
                            </filter>
                        </defs>

                        {/* 直尺体 (以 pointA 为基准，旋转 angleRad) */}
                        <g
                            transform={`translate(${pointA.x}, ${pointA.y}) rotate(${(rulerMetrics.angleRad * 180) / Math.PI})`}
                            style={{ pointerEvents: 'all', cursor: rulerDragging === 'body' ? 'grabbing' : 'grab' }}
                            onPointerDown={e => handlePointerDownRuler('body', e)}
                        >
                            {/* 尺身主体 */}
                            <rect
                                x={0}
                                y={-24}
                                width={rulerMetrics.lengthPx}
                                height={48}
                                rx={4}
                                fill="url(#acrylicGrad)"
                                stroke="rgba(202, 138, 4, 0.85)"
                                strokeWidth="1.5"
                                filter="url(#rulerGlow)"
                            />

                            {/* 刻度线与数字 (每 10px 一个细刻度，每 50px 中刻度，每 100px 长刻度) */}
                            {Array.from({ length: Math.floor(rulerMetrics.lengthPx / 10) + 1 }, (_, i) => {
                                const px = i * 10;
                                const isMajor = i % 10 === 0;
                                const isMedium = i % 5 === 0 && !isMajor;
                                const tickHeight = isMajor ? 18 : isMedium ? 12 : 7;
                                const label = isMajor ? (i / 10).toString() : null;

                                return (
                                    <g key={i}>
                                        <line
                                            x1={px}
                                            y1={-24}
                                            x2={px}
                                            y2={-24 + tickHeight}
                                            stroke="#854d0e"
                                            strokeWidth={isMajor ? 1.5 : 1}
                                        />
                                        {label && (
                                            <text
                                                x={px}
                                                y={6}
                                                fontSize="10"
                                                fontFamily="monospace"
                                                fontWeight="bold"
                                                fill="#713f12"
                                                textAnchor="middle"
                                            >
                                                {label}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* 中心指示基准线 */}
                            <line
                                x1={0}
                                y1={-24}
                                x2={rulerMetrics.lengthPx}
                                y2={-24}
                                stroke="#ca8a04"
                                strokeWidth="2"
                            />
                        </g>

                        {/* 两端连线 (虚线测量指示) */}
                        <line
                            x1={pointA.x}
                            y1={pointA.y}
                            x2={pointB.x}
                            y2={pointB.y}
                            stroke="rgba(234, 88, 12, 0.7)"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                        />
                    </svg>

                    {/* 端点 A 拖拽手柄 (0 刻度) */}
                    <div
                        className="ruler-handle handle-a"
                        style={{ left: pointA.x, top: pointA.y }}
                        onPointerDown={e => handlePointerDownRuler('handleA', e)}
                        title="拖拽移动起点 (0 刻度)"
                    >
                        <span>0</span>
                    </div>

                    {/* 端点 B 拖拽手柄 (旋转/伸缩控制点) */}
                    <div
                        className="ruler-handle handle-b"
                        style={{ left: pointB.x, top: pointB.y }}
                        onPointerDown={e => handlePointerDownRuler('handleB', e)}
                        title="拖拽旋转与伸缩直尺"
                    >
                        <span>⤢</span>
                    </div>

                    {/* 实时数显 HUD 卡片 */}
                    <div
                        className="ruler-hud-pill"
                        style={{
                            left: (pointA.x + pointB.x) / 2,
                            top: Math.min(pointA.y, pointB.y) - 45
                        }}
                    >
                        <span className="hud-metric">
                            <strong>距离 L:</strong>{' '}
                            {rulerScaleUnit === 'm'
                                ? `${rulerMetrics.lengthMeter.toFixed(2)} m`
                                : `${(rulerMetrics.lengthMeter * 100).toFixed(1)} cm`}
                        </span>
                        <span className="hud-metric">
                            <strong>Δx:</strong> {rulerMetrics.dxMeter.toFixed(2)} m
                        </span>
                        <span className="hud-metric">
                            <strong>Δy:</strong> {rulerMetrics.dyMeter.toFixed(2)} m
                        </span>
                        <span className="hud-metric">
                            <strong>倾角 θ:</strong> {rulerMetrics.angleDeg.toFixed(1)}°
                        </span>
                        <button
                            className="hud-unit-toggle"
                            onClick={() => setRulerScaleUnit(u => (u === 'm' ? 'cm' : 'm'))}
                            title="切换公制单位"
                        >
                            {rulerScaleUnit === 'm' ? '换成 cm' : '换成 m'}
                        </button>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* 2. 自由摆放双光电门测速仪 (Gate A & Gate B) */}
            {/* ============================================================= */}
            {photogateOpen && (
                <div className="photogate-interactive-wrapper">
                    {/* 光电门 A 探头 */}
                    <div
                        className={`interactive-photogate ${gateA.isBlocked ? 'blocked' : ''}`}
                        style={{ left: gateA.pos.x, top: gateA.pos.y }}
                        onPointerDown={e => handlePointerDownGate('A', e)}
                        title="按住鼠标拖拽光电门 1 到任意测量位置"
                    >
                        <div className="gate-u-shape" style={{ borderColor: gateA.color }}>
                            <div className="gate-laser-beam" />
                            <div className={`gate-status-led ${gateA.isBlocked ? 'active' : ''}`} />
                        </div>
                        <div className="gate-badge" style={{ background: gateA.color }}>
                            门 1
                        </div>
                    </div>

                    {/* 光电门 B 探头 */}
                    <div
                        className={`interactive-photogate ${gateB.isBlocked ? 'blocked' : ''}`}
                        style={{ left: gateB.pos.x, top: gateB.pos.y }}
                        onPointerDown={e => handlePointerDownGate('B', e)}
                        title="按住鼠标拖拽光电门 2 到任意测量位置"
                    >
                        <div className="gate-u-shape" style={{ borderColor: gateB.color }}>
                            <div className="gate-laser-beam" />
                            <div className={`gate-status-led ${gateB.isBlocked ? 'active' : ''}`} />
                        </div>
                        <div className="gate-badge" style={{ background: gateB.color }}>
                            门 2
                        </div>
                    </div>

                    {/* 光电门数显毫秒计时 HUD 窗口 */}
                    <div className="photogate-hud-panel">
                        <div className="hud-header">
                            <div className="hud-title">
                                <span className="hud-icon">⏱️</span> 毫秒级光电测速仪
                            </div>
                            <div className="hud-actions">
                                <button className="hud-btn" onClick={handleResetPhotogateData}>
                                    清空读数
                                </button>
                                <button
                                    className="hud-btn"
                                    onClick={() => {
                                        setGateA(prev => ({ ...prev, pos: { x: 200, y: 280 } }));
                                        setGateB(prev => ({ ...prev, pos: { x: 450, y: 280 } }));
                                    }}
                                >
                                    重设位置
                                </button>
                            </div>
                        </div>

                        <div className="hud-body">
                            {/* 门 1 读数 */}
                            <div className="gate-metric-card">
                                <div className="card-header" style={{ color: gateA.color }}>
                                    ● 光电门 1
                                </div>
                                <div className="metric-row">
                                    <span>遮光时间 Δt₁</span>
                                    <strong>{gateA.dtMs ? `${gateA.dtMs.toFixed(1)} ms` : '--'}</strong>
                                </div>
                                <div className="metric-row">
                                    <span>瞬时速度 v₁</span>
                                    <strong>{gateA.speed ? `${gateA.speed.toFixed(2)} m/s` : '--'}</strong>
                                </div>
                                <div className="metric-row">
                                    <span>触发时刻 t₁</span>
                                    <span className="metric-sub">
                                        {gateA.lastTriggerTime ? `${gateA.lastTriggerTime.toFixed(2)} s` : '--'}
                                    </span>
                                </div>
                            </div>

                            {/* 门 2 读数 */}
                            <div className="gate-metric-card">
                                <div className="card-header" style={{ color: gateB.color }}>
                                    ● 光电门 2
                                </div>
                                <div className="metric-row">
                                    <span>遮光时间 Δt₂</span>
                                    <strong>{gateB.dtMs ? `${gateB.dtMs.toFixed(1)} ms` : '--'}</strong>
                                </div>
                                <div className="metric-row">
                                    <span>瞬时速度 v₂</span>
                                    <strong>{gateB.speed ? `${gateB.speed.toFixed(2)} m/s` : '--'}</strong>
                                </div>
                                <div className="metric-row">
                                    <span>触发时刻 t₂</span>
                                    <span className="metric-sub">
                                        {gateB.lastTriggerTime ? `${gateB.lastTriggerTime.toFixed(2)} s` : '--'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 物理综合计算 (加速度与间距) */}
                        <div className="hud-footer">
                            <div className="summary-item">
                                <span className="label">两门间距 Δs</span>
                                <span className="val">
                                    {dualGateSummary ? `${dualGateSummary.distM.toFixed(2)} m` : '--'}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="label">间隔时间 Δt</span>
                                <span className="val">
                                    {dualGateSummary ? `${dualGateSummary.deltaT.toFixed(2)} s` : '--'}
                                </span>
                            </div>
                            <div className="summary-item highlight">
                                <span className="label">测得加速度 a</span>
                                <span className="val">
                                    {dualGateSummary && Number.isFinite(dualGateSummary.accel)
                                        ? `${dualGateSummary.accel.toFixed(2)} m/s²`
                                        : '--'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
