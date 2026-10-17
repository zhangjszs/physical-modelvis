import { lazy } from 'react';
import { LazyPanel } from '../common/LazyPanel';
import { StateInspector } from '../simulation/StateInspector';
import { useSimulationStore } from '../../store/simulationStore';

// 非首屏关键组件懒加载（保持主 chunk 体积不变）
const GraphPanel = lazy(() => import('../charts/GraphPanel').then(m => ({ default: m.GraphPanel })));
const DiagnosticsPanel = lazy(() =>
    import('../diagnostics/DiagnosticsPanel').then(m => ({ default: m.DiagnosticsPanel }))
);
const PhotogateTimer = lazy(() => import('../simulation/PhotogateTimer').then(m => ({ default: m.PhotogateTimer })));

interface DataDrawerProps {
    onClose?: () => void;
}

/** 数据抽屉：图表 + 光电门(air-track) + 状态检查器 + 诊断报告 */
export function DataDrawer({ onClose }: DataDrawerProps) {
    const currentScene = useSimulationStore(s => s.currentScene);

    return (
        <div className="classroom-data-drawer-wrapper">
            <div className="data-drawer-header">
                <span className="data-drawer-title">📊 实验动力学图表与数据分析</span>
                {onClose && (
                    <button type="button" className="btn btn-sm" onClick={onClose} aria-label="收起数据抽屉">
                        ✕ 收起
                    </button>
                )}
            </div>
            <div className="classroom-data-drawer">
                <LazyPanel label="数据图表" errorText="图表加载失败">
                    <GraphPanel />
                </LazyPanel>
                <div className="classroom-data-side">
                    {currentScene === 'air-track' && (
                        <LazyPanel label="数字毫秒计">
                            <PhotogateTimer />
                        </LazyPanel>
                    )}
                    <StateInspector />
                    <LazyPanel label="诊断报告">
                        <DiagnosticsPanel />
                    </LazyPanel>
                </div>
            </div>
        </div>
    );
}
