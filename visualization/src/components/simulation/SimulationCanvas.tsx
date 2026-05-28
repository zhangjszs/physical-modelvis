import { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CoordinateTransformer } from '../../rendering/CoordinateTransformer';
import { CanvasRenderer } from '../../rendering/CanvasRenderer';
import { COLORS } from '../../utils/colorMap';
import { findFrameIndex, interpolateFrame, getTotalDuration } from '../../utils/frameUtils';

/** 绘制匀强电场线（平行箭头，方向向上） */
function drawElectricField(
  ctx: CanvasRenderingContext2D,
  _transformer: CoordinateTransformer,
  width: number,
  height: number,
  isDark: boolean,
) {
  const spacing = 60; // 像素间距
  ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.4)' : 'rgba(234,179,8,0.5)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = ctx.strokeStyle;

  for (let x = spacing / 2; x < width; x += spacing) {
    // 画向上的箭头线
    const startY = height - 30;
    const endY = 30;
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();

    // 箭头头部
    ctx.beginPath();
    ctx.moveTo(x, endY);
    ctx.lineTo(x - 6, endY + 12);
    ctx.lineTo(x + 6, endY + 12);
    ctx.closePath();
    ctx.fill();
  }

  // 标签
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('E ↑', width - 12, 24);
}

/** 绘制匀强磁场符号（⊗ 表示垂直纸面向里，· 表示向外） */
function drawMagneticField(
  ctx: CanvasRenderingContext2D,
  _transformer: CoordinateTransformer,
  width: number,
  height: number,
  isDark: boolean,
) {
  const spacing = 70;
  ctx.fillStyle = isDark ? 'rgba(168,85,247,0.5)' : 'rgba(147,51,234,0.5)';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let x = spacing / 2; x < width; x += spacing) {
    for (let y = spacing / 2; y < height; y += spacing) {
      ctx.fillText('⊗', x, y); // 垂直纸面向里
    }
  }

  // 标签
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('B ⊗ (垂直纸面向里)', width - 12, 12);
}

/** 绘制碰撞场景：两物体 + 碰撞标记 */
function drawCollisionScene(
  ctx: CanvasRenderingContext2D,
  _transformer: CoordinateTransformer,
  width: number,
  height: number,
  isDark: boolean,
  params: Record<string, number>,
) {
  const m1 = params['m1'] ?? 1;
  const m2 = params['m2'] ?? 1;
  const v1 = params['v1'] ?? 5;
  const v2 = params['v2'] ?? 0;
  const e = params['e'] ?? 1;
  const labelColor = isDark ? '#e2e8f0' : '#1e293b';
  const subColor = isDark ? '#94a3b8' : '#64748b';

  // 物体尺寸按质量缩放
  const size1 = Math.max(20, Math.min(60, 15 + m1 * 5));
  const size2 = Math.max(20, Math.min(60, 15 + m2 * 5));
  const cy = height / 2;

  // 物体1（蓝色）
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(width * 0.25 - size1 / 2, cy - size1 / 2, size1, size1);
  ctx.fillStyle = labelColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`m₁=${m1}kg`, width * 0.25, cy + size1 / 2 + 18);
  ctx.fillStyle = subColor;
  ctx.font = '11px sans-serif';
  ctx.fillText(`v₁=${v1}m/s`, width * 0.25, cy + size1 / 2 + 33);

  // 物体2（红色）
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(width * 0.7 - size2 / 2, cy - size2 / 2, size2, size2);
  ctx.fillStyle = labelColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`m₂=${m2}kg`, width * 0.7, cy + size2 / 2 + 18);
  ctx.fillStyle = subColor;
  ctx.font = '11px sans-serif';
  ctx.fillText(`v₂=${v2}m/s`, width * 0.7, cy + size2 / 2 + 33);

  // 速度箭头
  if (v1 !== 0) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.25 + size1 / 2 + 5, cy);
    ctx.lineTo(width * 0.25 + size1 / 2 + 5 + v1 * 3, cy);
    ctx.stroke();
  }
  if (v2 !== 0) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.7 + size2 / 2 + 5, cy);
    ctx.lineTo(width * 0.7 + size2 / 2 + 5 + v2 * 3, cy);
    ctx.stroke();
  }

  // 恢复系数标签
  ctx.fillStyle = subColor;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  const typeLabel = e >= 0.99 ? '弹性碰撞' : e < 0.01 ? '完全非弹性碰撞' : '非弹性碰撞';
  ctx.fillText(`${typeLabel} (e=${e})`, width / 2, height - 20);
}

/** 绘制弹簧振子场景：弹簧 + 滑块 + 平衡位置 */
function drawSpringScene(
  ctx: CanvasRenderingContext2D,
  _transformer: CoordinateTransformer,
  width: number,
  height: number,
  isDark: boolean,
  params: Record<string, number>,
) {
  const k = params['k'] ?? 10;
  const m = params['m'] ?? 1;
  const A = params['A'] ?? 0.5;
  const damping = params['damping'] ?? 0;
  const labelColor = isDark ? '#e2e8f0' : '#1e293b';
  const subColor = isDark ? '#94a3b8' : '#64748b';
  const cy = height / 2;
  const anchorX = 60;
  const blockW = 40;
  const blockH = 30;
  // 块体位置基于振幅
  const eqX = width * 0.5;
  const blockX = eqX + A * 200;

  // 墙壁
  ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
  ctx.fillRect(anchorX - 10, cy - 50, 10, 100);

  // 弹簧（锯齿线）
  ctx.strokeStyle = isDark ? '#22d3ee' : '#0891b2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anchorX, cy);
  const coils = 12;
  const springLen = blockX - blockW / 2 - anchorX;
  for (let i = 0; i <= coils; i++) {
    const px = anchorX + (springLen * i) / coils;
    const py = cy + (i % 2 === 0 ? -10 : 10);
    ctx.lineTo(px, i === 0 || i === coils ? cy : py);
  }
  ctx.stroke();

  // 块体
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(blockX - blockW / 2, cy - blockH / 2, blockW, blockH);
  ctx.fillStyle = labelColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`m=${m}kg`, blockX, cy + blockH / 2 + 18);

  // 平衡位置虚线
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = isDark ? 'rgba(34,211,238,0.4)' : 'rgba(8,145,178,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(eqX, cy - 60);
  ctx.lineTo(eqX, cy + 60);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = subColor;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('平衡位置', eqX, cy - 65);

  // 信息标签
  ctx.fillStyle = subColor;
  ctx.font = '11px sans-serif';
  ctx.fillText(`k=${k}N/m  A=${A}m${damping > 0 ? `  阻尼=${damping}` : ''}`, width / 2, height - 20);
}

/** 绘制斜面场景：三角形 + 块体 + 力向量 */
function drawInclinedPlaneScene(
  ctx: CanvasRenderingContext2D,
  _transformer: CoordinateTransformer,
  width: number,
  height: number,
  isDark: boolean,
  params: Record<string, number>,
) {
  const thetaDeg = params['theta'] ?? 30;
  const m = params['m'] ?? 1;
  const mu = params['mu'] ?? 0;
  const labelColor = isDark ? '#e2e8f0' : '#1e293b';
  const subColor = isDark ? '#94a3b8' : '#64748b';
  const thetaRad = (thetaDeg * Math.PI) / 180;

  // 斜面三角形
  const baseX = width * 0.15;
  const baseY = height * 0.85;
  const slopeLen = width * 0.7;
  const topX = baseX + slopeLen * Math.cos(thetaRad);
  const topY = baseY - slopeLen * Math.sin(thetaRad);

  ctx.fillStyle = isDark ? 'rgba(71,85,105,0.5)' : 'rgba(148,163,184,0.3)';
  ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX + slopeLen, baseY);
  ctx.lineTo(topX, topY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 角度弧线
  ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const arcR = 50;
  ctx.arc(baseX + slopeLen, baseY, arcR, Math.PI, Math.PI + thetaRad, true);
  ctx.stroke();
  ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`θ=${thetaDeg}°`, baseX + slopeLen + arcR + 5, baseY - 10);

  // 块体在斜面中点
  const midX = baseX + slopeLen * 0.5 + (slopeLen * 0.5 * Math.cos(thetaRad)) / 2;
  const midY = baseY - (slopeLen * 0.5 * Math.sin(thetaRad)) / 2;
  const blockW = 30;
  const blockH = 20;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(-thetaRad);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(-blockW / 2, -blockH, blockW, blockH);
  ctx.restore();

  ctx.fillStyle = labelColor;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`m=${m}kg`, midX, midY - blockH - 10);

  // 力的分解示意（简化标注）
  if (mu > 0) {
    ctx.fillStyle = subColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`μ=${mu}`, width / 2, height - 20);
  }
}

/** 绘制电磁复合场：电场线 + 磁场符号 */
function drawEMCombinedField(
  ctx: CanvasRenderingContext2D,
  _transformer: CoordinateTransformer,
  width: number,
  height: number,
  isDark: boolean,
) {
  // 电场线（水平，向右）
  const spacing = 60;
  ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.4)' : 'rgba(234,179,8,0.5)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = ctx.strokeStyle;
  for (let y = spacing / 2; y < height; y += spacing) {
    const startX = 30;
    const endX = width - 30;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX, y);
    ctx.lineTo(endX - 10, y - 5);
    ctx.lineTo(endX - 10, y + 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('E →', 12, 20);

  // 磁场符号
  const bSpacing = 70;
  ctx.fillStyle = isDark ? 'rgba(168,85,247,0.4)' : 'rgba(147,51,234,0.4)';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let x = bSpacing; x < width; x += bSpacing) {
    for (let y = bSpacing; y < height; y += bSpacing) {
      ctx.fillText('⊗', x, y);
    }
  }
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('B ⊗', width - 12, 12);
}

export function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const transformerRef = useRef<CoordinateTransformer | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const {
    simulationResult, currentTime, isPlaying, playbackSpeed,
    visibleLayers, theme, setCurrentTime, pause, currentScene, parameters,
  } = useSimulationStore();

  const isDark = theme === 'dark';

  // 初始化 renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      transformerRef.current = new CoordinateTransformer(canvas.width, canvas.height);
      rendererRef.current = new CanvasRenderer(ctx, transformerRef.current, visibleLayers, isDark);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // 更新 renderer 参数
  useEffect(() => {
    if (!transformerRef.current || !rendererRef.current) return;
    rendererRef.current.update(transformerRef.current, visibleLayers, isDark);
  }, [visibleLayers, isDark]);

  // 自动缩放
  useEffect(() => {
    if (!simulationResult || !transformerRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const allPoints: Array<{ x: number; y: number }> = [];
    for (const traj of simulationResult.trajectories) {
      for (const p of traj) {
        allPoints.push(p.position);
      }
    }
    transformerRef.current.autoFit(allPoints, canvas.width, canvas.height);
  }, [simulationResult]);

  // 渲染循环
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    const transformer = transformerRef.current;
    if (!canvas || !renderer || !transformer) return;

    const ctx = canvas.getContext('2d')!;
    renderer.clear(canvas.width, canvas.height);
    renderer.drawGrid(canvas.width, canvas.height);
    renderer.drawAxes(canvas.width, canvas.height);

    // 绘制场背景
    if (currentScene === 'electric-field') {
      drawElectricField(ctx, transformer, canvas.width, canvas.height, isDark);
    } else if (currentScene === 'magnetic-field') {
      drawMagneticField(ctx, transformer, canvas.width, canvas.height, isDark);
    } else if (currentScene === 'em-combined') {
      drawEMCombinedField(ctx, transformer, canvas.width, canvas.height, isDark);
    } else if (currentScene === 'collision') {
      drawCollisionScene(ctx, transformer, canvas.width, canvas.height, isDark, parameters);
    } else if (currentScene === 'spring') {
      drawSpringScene(ctx, transformer, canvas.width, canvas.height, isDark, parameters);
    } else if (currentScene === 'inclined-plane') {
      drawInclinedPlaneScene(ctx, transformer, canvas.width, canvas.height, isDark, parameters);
    }

    if (!simulationResult) {
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击「运行仿真」开始', canvas.width / 2, canvas.height / 2);
      return;
    }

    const trajectories = simulationResult.trajectories;
    const points = trajectories[0] ?? [];
    if (points.length === 0) return;

    // 绘制地面（仅重力场景）
    const noGroundScenes = ['electric-field', 'magnetic-field', 'em-combined', 'collision', 'spring'];
    if (!noGroundScenes.includes(currentScene)) {
      renderer.drawGround(0, canvas.width);
    }

    // 绘制完整轨迹（淡色）
    const allPositions = points.map(p => p.position);
    ctx.globalAlpha = 0.3;
    renderer.drawTrajectory(allPositions, COLORS.trajectory);
    ctx.globalAlpha = 1.0;

    // 绘制当前时间之前的轨迹
    const pastPoints = points.filter(p => p.t <= currentTime).map(p => p.position);
    renderer.drawTrajectory(pastPoints, COLORS.trajectory);

    // 获取当前帧
    const idx = findFrameIndex(trajectories, currentTime);
    const p0 = points[idx]!;
    const p1 = points[Math.min(idx + 1, points.length - 1)]!;
    const frame = interpolateFrame(p0, p1, currentTime);

    // 绘制物体（根据场景类型着色）
    const emScenes = ['electric-field', 'magnetic-field', 'em-combined'];
    const isEM = emScenes.includes(currentScene);
    const isCollision = currentScene === 'collision';
    const collisionColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

    if (isCollision && trajectories.length > 1) {
      // 多物体渲染
      for (let bi = 0; bi < trajectories.length; bi++) {
        const traj = trajectories[bi] ?? [];
        if (traj.length === 0) continue;
        const biIdx = findFrameIndex([traj], currentTime);
        const bp0 = traj[biIdx]!;
        const bp1 = traj[Math.min(biIdx + 1, traj.length - 1)]!;
        const bFrame = interpolateFrame(bp0, bp1, currentTime);
        const bColor = collisionColors[bi % collisionColors.length] ?? COLORS.body;
        renderer.drawBody(bFrame.position, 0.15, bColor, `物体${bi + 1}`);
        if (visibleLayers.velocityVector) {
          renderer.drawVector(bFrame.position, bFrame.velocity, bColor, `v${bi + 1}`, 0.15);
        }
      }
    } else {
      const charge = parameters['charge'] ?? 1.6;
      const bodyColor = isEM
        ? (charge >= 0 ? '#ef4444' : '#3b82f6')
        : COLORS.body;
      const label = isEM
        ? (charge >= 0 ? '正电荷' : '负电荷')
        : '物体';
      renderer.drawBody(frame.position, 0.15, bodyColor, label);

      // 绘制速度向量
      if (visibleLayers.velocityVector) {
        renderer.drawVector(frame.position, frame.velocity, COLORS.velocity, 'v', 0.15);
      }

      // 绘制加速度向量
      if (visibleLayers.accelerationVector && frame.acceleration) {
        renderer.drawVector(frame.position, frame.acceleration, COLORS.acceleration, 'a', 0.3);
      }

      // 绘制力向量
      if (visibleLayers.forceVector && frame.acceleration) {
        const mass = isEM ? (parameters['mass'] ?? 1.67) * 1e-27 : (parameters['m'] ?? 1);
        const forceX = frame.acceleration.x * mass;
        const forceY = frame.acceleration.y * mass;
        renderer.drawVector(frame.position, { x: forceX, y: forceY }, COLORS.force, 'F', isEM ? 1e20 : 0.3);
      }
    }

    // 时间标签
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${currentTime.toExponential(3)} s`, 16, 30);

    // 位置标签
    if (visibleLayers.bodyLabels) {
      ctx.font = '12px monospace';
      ctx.fillText(`x = ${frame.position.x.toExponential(3)} m`, 16, 50);
      ctx.fillText(`y = ${frame.position.y.toExponential(3)} m`, 16, 68);
    }
  }, [simulationResult, currentTime, visibleLayers, isDark, currentScene, parameters]);

  // 动画循环
  useEffect(() => {
    let running = true;
    const loop = (timestamp: number) => {
      if (!running) return;
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying && simulationResult) {
        const trajectories = simulationResult.trajectories;
        const totalDuration = getTotalDuration(trajectories);
        const newTime = currentTime + delta * playbackSpeed;
        if (newTime >= totalDuration) {
          setCurrentTime(totalDuration);
          pause();
        } else {
          setCurrentTime(newTime);
        }
      }

      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, simulationResult, currentTime, render, setCurrentTime, pause]);

  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 400 }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
