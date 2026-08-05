import { useState, useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { resolveScene, buildSceneParams, inferProblemTypeLabel } from './ocrUtils';
import type { RecognizeResponse, RecognizedProblem } from '../../../server/ocr-utils';

const OCR_PROXY_URL = 'http://localhost:3001';
const STORAGE_KEY = 'physvis_viz_ocr_model';

function loadModel(): string {
    return localStorage.getItem(STORAGE_KEY) ?? '';
}

function saveModel(model: string) {
    localStorage.setItem(STORAGE_KEY, model);
}

async function checkBackendHealth(): Promise<boolean> {
    try {
        const resp = await fetch(`${OCR_PROXY_URL}/api/ocr/health`, { signal: AbortSignal.timeout(3000) });
        return resp.ok;
    } catch {
        return false;
    }
}

async function recognizeProblem(base64Image: string, model: string): Promise<RecognizeResponse> {
    const resp = await fetch(`${OCR_PROXY_URL}/api/ocr/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, model: model || undefined })
    });

    const data = (await resp.json()) as { result?: RecognizeResponse; error?: string };
    if (!resp.ok) throw new Error(data.error ?? `请求失败 (${resp.status})`);
    if (!data.result) throw new Error('后端未返回识别结果');
    return data.result;
}

export function OCRPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'info' | 'error' | 'success'; msg: string } | null>(null);
    const [problems, setProblems] = useState<RecognizedProblem[] | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [backendOk, setBackendOk] = useState<boolean | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const base64Ref = useRef<string | null>(null);

    const [model, setModel] = useState(loadModel);

    const { setScene, setParameter } = useSimulationStore();

    // 仅在面板打开时检查后端健康, 避免页面加载时对 3001 发起请求
    // (后端未启动时会产生浏览器网络错误噪音, 污染页面 console)
    useEffect(() => {
        if (!isOpen) return;
        setBackendOk(null);
        checkBackendHealth().then(setBackendOk);
    }, [isOpen]);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setStatus({ type: 'error', msg: '请选择图片文件' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setStatus({ type: 'error', msg: '图片不能超过 10MB' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            base64Ref.current = base64;
            setPreview(base64);
            setStatus(null);
            setProblems(null);
            setActiveIndex(0);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const doRecognize = useCallback(async () => {
        if (!base64Ref.current) return;
        saveModel(model);
        setLoading(true);
        setStatus({ type: 'info', msg: '正在识别...' });
        setProblems(null);
        setActiveIndex(0);
        try {
            const r = await recognizeProblem(base64Ref.current, model);
            if (r.problems.length === 0) throw new Error('未识别到有效题目');
            setStatus({ type: 'success', msg: `识别完成: 共 ${r.problems.length} 题` });
            setProblems(r.problems);
        } catch (e) {
            setStatus({ type: 'error', msg: e instanceof Error ? e.message : '识别失败' });
        } finally {
            setLoading(false);
        }
    }, [model]);

    const activeProblem = problems?.[activeIndex] ?? null;

    const loadIntoSimulation = useCallback(() => {
        const problem = problems?.[activeIndex];
        if (!problem) return;
        setScene(resolveScene(problem.sceneTemplate));

        // 尝试填入数值型参数
        for (const { key, value } of buildSceneParams(problem.given)) {
            setParameter(key, value);
        }

        setIsOpen(false);
    }, [problems, activeIndex, setScene, setParameter]);

    if (!isOpen) {
        return (
            <button
                className="btn btn-sm"
                onClick={() => setIsOpen(true)}
                style={{ background: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24' }}
            >
                📷 拍照解题
            </button>
        );
    }

    return (
        <div className="ocr-overlay visible" onClick={() => setIsOpen(false)}>
            <div className="ocr-modal" onClick={e => e.stopPropagation()}>
                <button className="ocr-close" onClick={() => setIsOpen(false)}>
                    &times;
                </button>
                <div className="ocr-title">AI 拍照解题</div>

                {!preview ? (
                    <div
                        className="ocr-dropzone"
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <div style={{ fontSize: 36, opacity: 0.6 }}>📷</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>拖拽图片或点击选择</div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleFile(f);
                            }}
                        />
                    </div>
                ) : (
                    <div className="ocr-preview">
                        <img src={preview} alt="预览" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                        <button
                            className="btn btn-sm"
                            onClick={() => {
                                setPreview(null);
                                base64Ref.current = null;
                                setProblems(null);
                                setActiveIndex(0);
                                setStatus(null);
                            }}
                            style={{ marginTop: 8, color: '#ef4444' }}
                        >
                            移除
                        </button>
                    </div>
                )}

                <details className="ocr-config">
                    <summary>设置</summary>
                    <div className="ocr-field">
                        <label>后端状态</label>
                        <span
                            style={{
                                color: backendOk === null ? '#94a3b8' : backendOk ? '#22c55e' : '#ef4444',
                                fontSize: 13
                            }}
                        >
                            {backendOk === null ? '检测中...' : backendOk ? '已连接' : '未连接 (请启动 ocr-proxy)'}
                        </span>
                    </div>
                    <div className="ocr-field">
                        <label>模型</label>
                        <input
                            type="text"
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            placeholder="gpt-4o (默认)"
                        />
                    </div>
                </details>

                <button
                    className="btn btn-primary"
                    onClick={doRecognize}
                    disabled={!preview || loading || backendOk === false}
                    style={{ width: '100%', marginTop: 12 }}
                >
                    {loading ? '识别中...' : '识别题目'}
                </button>

                {status && <div className={`ocr-status ${status.type}`}>{status.msg}</div>}

                {problems && problems.length > 1 && (
                    <div className="ocr-nav" role="tablist" aria-label="题目导航">
                        {problems.map((_, i) => (
                            <button
                                key={i}
                                role="tab"
                                aria-selected={i === activeIndex}
                                className={`ocr-nav-btn ${i === activeIndex ? 'active' : ''}`}
                                onClick={() => setActiveIndex(i)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                {activeProblem && (
                    <div className="ocr-result">
                        <div className="ocr-result-head">
                            <span className="ocr-result-type">
                                {inferProblemTypeLabel(activeProblem.type, (activeProblem.options ?? []).length > 0)}
                            </span>
                            <span className="ocr-result-title">
                                {activeProblem.index != null && problems!.length > 1
                                    ? `第 ${activeProblem.index} 题: `
                                    : ''}
                                {activeProblem.title ?? '未命名'}
                            </span>
                        </div>
                        <div className="ocr-result-desc">{activeProblem.description}</div>
                        {(activeProblem.options ?? []).length > 0 && (
                            <div className="ocr-result-options">
                                {activeProblem.options!.map(o => (
                                    <div key={o.letter} className="ocr-result-opt">
                                        <strong>{o.letter}.</strong> {o.text}
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeProblem.formulas && activeProblem.formulas.length > 0 && (
                            <div className="ocr-result-formulas">{activeProblem.formulas.join('; ')}</div>
                        )}
                        {activeProblem.answer && (
                            <div className="ocr-result-answer">
                                <strong>答案：</strong>
                                {activeProblem.answer.correct?.join('、')}
                                {activeProblem.answer.explanation && (
                                    <>
                                        <br />
                                        {activeProblem.answer.explanation}
                                    </>
                                )}
                            </div>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={loadIntoSimulation}
                            style={{ width: '100%', marginTop: 12 }}
                        >
                            加载仿真
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
