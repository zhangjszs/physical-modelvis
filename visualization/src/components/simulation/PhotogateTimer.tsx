import { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import {
  getTimerDisplayValue,
  getTimerDisplayVelocity,
  type PhotogateMeasurement,
} from '../../utils/photogate';

/**
 * 数字毫秒计 React 面板。
 *
 * 借鉴 PhET 仪器面板风格与真实 J0201 型数字毫秒计视觉：
 * 7 段数码管风格（黑底 + 绿色等宽字体 + 文字阴影发光）。
 *
 * 数据来源：simulationStore.experimentData（由 ProjectileScene 计算）。
 * 单一数据源，与 Canvas 内的数字毫秒计仪表盘互补。
 */
export function PhotogateTimer() {
  const { experimentData, currentTime, parameters, theme } = useSimulationStore();

  const isDark = theme === 'dark';
  const flagWidth = parameters['flagWidth'] ?? 0.02;

  const channels = useMemo(() => {
    if (!experimentData || experimentData.length === 0) return [];
    return experimentData.map((m, i) => {
      const deltaT = getTimerDisplayValue(m, currentTime);
      const velocity = getTimerDisplayVelocity(m, currentTime, flagWidth);
      const isBlocked = m.valid && currentTime >= m.blockStartTime && currentTime <= m.blockEndTime;
      const isDone = m.valid && currentTime > m.blockEndTime;
      const isWaiting = m.valid && currentTime < m.blockStartTime;
      return { m, index: i, deltaT, velocity, isBlocked, isDone, isWaiting };
    });
  }, [experimentData, currentTime, flagWidth]);

  // 匀速判据
  const conclusion = useMemo(() => {
    const done = channels.filter(c => c.isDone);
    if (done.length < 2) return null;
    const [a, b] = [done[0]!, done[1]!];
    const v1 = a.m.speed;
    const v2 = b.m.speed;
    if (!Number.isFinite(v1) || !Number.isFinite(v2)) return null;
    const vAvg = (v1 + v2) / 2;
    if (vAvg < 1e-9) return null;
    const relDiff = Math.abs(v1 - v2) / vAvg;
    return { v1, v2, vAvg, relDiff, isUniform: relDiff < 0.01 };
  }, [channels]);

  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const subColor = isDark ? '#94a3b8' : '#64748b';

  if (channels.length === 0) {
    return (
      <div className="panel-section photogate-timer-panel">
        <div className="panel-title">数字毫秒计</div>
        <div style={{ padding: '12px', color: subColor, fontSize: 12 }}>无测量数据</div>
      </div>
    );
  }

  return (
    <div className="panel-section photogate-timer-panel">
      <div className="panel-title">数字毫秒计</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
        {channels.map(ch => (
          <ChannelCard
            key={ch.index}
            label={`CH${ch.index + 1}`}
            gatePosition={ch.m.gatePosition}
            deltaT={ch.deltaT}
            velocity={ch.velocity}
            isBlocked={ch.isBlocked}
            isDone={ch.isDone}
            isWaiting={ch.isWaiting}
            isDark={isDark}
          />
        ))}
      </div>

      {/* 实验参数小标签 */}
      <div style={{
        padding: '6px 8px',
        marginTop: 4,
        background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)',
        borderRadius: 4,
        fontSize: 11,
        color: subColor,
        fontFamily: 'monospace',
      }}>
        <div>挡光片宽度 Δx = {flagWidth.toFixed(3)} m</div>
        {conclusion && (
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${isDark ? '#334155' : '#cbd5e1'}` }}>
            <div style={{ color: textColor }}>
              v₁ = {conclusion.v1.toFixed(4)} m/s, v₂ = {conclusion.v2.toFixed(4)} m/s
            </div>
            <div style={{
              marginTop: 4,
              padding: '4px 6px',
              borderRadius: 3,
              background: conclusion.isUniform
                ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)')
                : (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)'),
              color: conclusion.isUniform ? '#22c55e' : '#f59e0b',
              fontWeight: 'bold',
              fontSize: 11,
            }}>
              {conclusion.isUniform
                ? `✓ v₁≈v₂（相差 ${(conclusion.relDiff * 100).toFixed(2)}%），滑块做匀速运动`
                : `⚠ |v₁−v₂|/v̄ = ${(conclusion.relDiff * 100).toFixed(2)}%（不匀速或测量异常）`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChannelCardProps {
  label: string;
  gatePosition: number;
  deltaT: number | null;
  velocity: number | null;
  isBlocked: boolean;
  isDone: boolean;
  isWaiting: boolean;
  isDark: boolean;
}

function ChannelCard(props: ChannelCardProps) {
  const { label, gatePosition, deltaT, velocity, isBlocked, isDone, isWaiting, isDark } = props;

  // 数值显示
  const deltaTDisplay = deltaT === null
    ? '----'
    : (Math.abs(deltaT) < 1 ? `${(deltaT * 1000).toFixed(2)}` : `${deltaT.toFixed(4)}`);
  const deltaTUnit = deltaT === null ? 'ms' : (Math.abs(deltaT) < 1 ? 'ms' : 's');
  const velocityDisplay = velocity === null
    ? '----'
    : `${Math.abs(velocity).toFixed(3)}`;

  // 状态指示
  const status = isBlocked ? '挡光中' : (isDone ? '已完成' : (isWaiting ? '待挡光' : '----'));
  const statusColor = isBlocked ? '#ef4444' : (isDone ? '#22c55e' : (isWaiting ? '#94a3b8' : '#64748b'));

  // 卡片背景与边框（挡光中高亮闪烁）
  const cardBg = isBlocked
    ? (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)')
    : (isDark ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.85)');
  const borderColor = isBlocked ? '#ef4444' : (isDark ? '#334155' : '#1e293b');

  return (
    <div style={{
      background: cardBg,
      border: `1.5px solid ${borderColor}`,
      borderRadius: 6,
      padding: '8px 10px',
      position: 'relative',
      animation: isBlocked ? 'photogate-flash 0.6s infinite alternate' : undefined,
    }}>
      <style>{`
        @keyframes photogate-flash {
          from { box-shadow: 0 0 0 rgba(239,68,68,0.0); }
          to { box-shadow: 0 0 10px rgba(239,68,68,0.6); }
        }
      `}</style>

      {/* 通道标签 + 状态 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 4,
      }}>
        <span style={{
          color: '#22d3ee',
          fontFamily: 'bold 11px monospace',
          fontSize: 11,
          fontWeight: 'bold',
        }}>
          {label} · G@{gatePosition.toFixed(2)}m
        </span>
        <span style={{
          color: statusColor,
          fontSize: 10,
          fontWeight: 'bold',
          padding: '1px 6px',
          background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}>
          {status}
        </span>
      </div>

      {/* 数值显示（数码管风格） */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: '4px 8px',
        background: isDark ? '#020617' : '#000',
        borderRadius: 3,
        border: `1px solid ${isDark ? '#1e293b' : '#0f172a'}`,
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>Δt</div>
          <div style={{
            color: isBlocked ? '#fca5a5' : '#22c55e',
            fontFamily: '"Courier New", monospace',
            fontSize: 18,
            fontWeight: 'bold',
            textShadow: `0 0 8px ${isBlocked ? '#ef4444' : '#22c55e'}`,
            minWidth: 80,
            textAlign: 'right',
            display: 'inline-block',
          }}>
            {deltaTDisplay}
          </div>
          <span style={{
            color: '#64748b',
            fontSize: 10,
            marginLeft: 4,
            fontFamily: 'monospace',
          }}>
            {deltaTUnit}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>v=Δx/Δt</div>
          <div style={{
            color: '#22d3ee',
            fontFamily: '"Courier New", monospace',
            fontSize: 14,
            fontWeight: 'bold',
            textShadow: '0 0 6px #22d3ee',
          }}>
            {velocityDisplay}
          </div>
          <span style={{
            color: '#64748b',
            fontSize: 9,
            fontFamily: 'monospace',
          }}>
            m/s
          </span>
        </div>
      </div>
    </div>
  );
}

// 暴露类型供外部使用
export type { PhotogateMeasurement };
