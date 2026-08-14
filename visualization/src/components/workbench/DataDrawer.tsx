import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { StateInspector } from '../simulation/StateInspector';
import { useSimulationStore } from '../../store/simulationStore';

// 非首屏关键组件懒加载（保持主 chunk 体积不变）
const GraphPanel = lazy(() => import('../charts/GraphPanel').then(m => ({ default: m.GraphPanel })));
const DiagnosticsPanel = lazy(() =>
    import('../diagnostics/DiagnosticsPanel').then(m => ({ default: m.DiagnosticsPanel }))
);
const PhotogateTimer = lazy(() => import('../simulation/PhotogateTimer').then(m => ({ default: m.PhotogateTimer })));

/** 数据抽屉：图表 + 光电门(air-track) + 状态检查器 + 诊断报告 */
export function DataDrawer() {
    const currentScene = useSimulationStore(s => s.currentScene);

    return (
        <div className="classroom-data-drawer">
            <ErrorBoundary
                label="数据图表"
                fallback={
                    <div className="panel-section">
                        <div className="panel-title">数据图表</div>
                        <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>图表加载失败</div>
                    </div>
                }
            >
                <Suspense
                    fallback={
                        <div className="panel-section" style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
                            加载中...
                        </div>
                    }
                >
                    <GraphPanel />
                </Suspense>
            </ErrorBoundary>
            <div className="classroom-data-side">
                {currentScene === 'air-track' && (
                    <ErrorBoundary
                        label="数字毫秒计"
                        fallback={
                            <div className="panel-section">
                                <div className="panel-title">数字毫秒计</div>
                                <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载失败</div>
                            </div>
                        }
                    >
                        <Suspense
                            fallback={
                                <div className="panel-section">
                                    <div className="panel-title">数字毫秒计</div>
                                    <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                                </div>
                            }
                        >
                            <PhotogateTimer />
                        </Suspense>
                    </ErrorBoundary>
                )}
                <StateInspector />
                <ErrorBoundary
                    label="诊断报告"
                    fallback={
                        <div className="panel-section">
                            <div className="panel-title">诊断报告</div>
                            <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载失败</div>
                        </div>
                    }
                >
                    <Suspense
                        fallback={
                            <div className="panel-section">
                                <div className="panel-title">诊断报告</div>
                                <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                            </div>
                        }
                    >
                        <DiagnosticsPanel />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
}
