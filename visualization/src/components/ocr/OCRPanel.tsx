import { useState, useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

const OCR_PROXY_URL = 'http://localhost:3001';
const STORAGE_KEY = 'physvis_viz_ocr_model';

interface RecognizedProblem {
  title?: string;
  description?: string;
  source?: string;
  given?: Record<string, unknown>;
  options?: Array<{ letter: string; text: string }>;
  answer?: { correct?: string[]; explanation?: string };
  sceneTemplate?: string | null;
  formulas?: string[];
}

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

async function recognizeProblem(base64Image: string, model: string): Promise<RecognizedProblem> {
  const resp = await fetch(`${OCR_PROXY_URL}/api/ocr/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, model: model || undefined }),
  });

  const data = await resp.json() as { result?: RecognizedProblem; error?: string };
  if (!resp.ok) throw new Error(data.error ?? `请求失败 (${resp.status})`);
  if (!data.result) throw new Error('后端未返回识别结果');
  return data.result;
}

export function OCRPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'info' | 'error' | 'success'; msg: string } | null>(null);
  const [result, setResult] = useState<RecognizedProblem | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const base64Ref = useRef<string | null>(null);

  const [model, setModel] = useState(loadModel);

  const { setScene, setParameter } = useSimulationStore();

  useEffect(() => {
    checkBackendHealth().then(setBackendOk);
  }, []);

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
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const doRecognize = useCallback(async () => {
    if (!base64Ref.current) return;
    saveModel(model);
    setLoading(true);
    setStatus({ type: 'info', msg: '正在识别...' });
    setResult(null);
    try {
      const r = await recognizeProblem(base64Ref.current, model);
      setStatus({ type: 'success', msg: '识别完成' });
      setResult(r);
    } catch (e) {
      setStatus({ type: 'error', msg: e instanceof Error ? e.message : '识别失败' });
    } finally {
      setLoading(false);
    }
  }, [model]);

  const loadIntoSimulation = useCallback(() => {
    if (!result) return;
    // 匹配场景
    const sceneMap: Record<string, string> = {
      'projectile': 'projectile',
      'electric-field': 'electric-field',
      'magnetic-field': 'magnetic-field',
      'collision': 'collision',
      'spring': 'spring',
      'inclined-plane': 'inclined-plane',
      'em-combined': 'em-combined',
      'uniform-accelerated': 'uniform-accelerated',
      'free-fall': 'free-fall',
    };
    const sceneId = result.sceneTemplate ? sceneMap[result.sceneTemplate] ?? 'projectile' : 'projectile';
    setScene(sceneId);

    // 尝试填入参数
    const given = result.given ?? {};
    for (const [key, val] of Object.entries(given)) {
      if (typeof val === 'number') {
        const keyMap: Record<string, string> = {
          '初速度': 'v0', 'v0': 'v0', '速度': 'v0',
          '角度': 'angle', 'θ': 'angle',
          '重力加速度': 'g', 'g': 'g',
          '电场强度': 'Ey', 'E': 'Ey', 'Ey': 'Ey',
          '磁感应强度': 'Bz', 'B': 'Bz', 'Bz': 'Bz',
          '电荷量': 'charge', 'q': 'charge',
          '质量': 'mass', 'm': 'mass',
        };
        const paramKey = keyMap[key] ?? key;
        setParameter(paramKey, val);
      }
    }

    setIsOpen(false);
  }, [result, setScene, setParameter]);

  if (!isOpen) {
    return (
      <button className="btn btn-sm" onClick={() => setIsOpen(true)} style={{ background: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24' }}>
        📷 拍照解题
      </button>
    );
  }

  return (
    <div className="ocr-overlay visible" onClick={() => setIsOpen(false)}>
      <div className="ocr-modal" onClick={e => e.stopPropagation()}>
        <button className="ocr-close" onClick={() => setIsOpen(false)}>&times;</button>
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
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          <div className="ocr-preview">
            <img src={preview} alt="预览" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
            <button className="btn btn-sm" onClick={() => { setPreview(null); base64Ref.current = null; setResult(null); setStatus(null); }}
              style={{ marginTop: 8, color: '#ef4444' }}>移除</button>
          </div>
        )}

        <details className="ocr-config">
          <summary>设置</summary>
          <div className="ocr-field">
            <label>后端状态</label>
            <span style={{ color: backendOk === null ? '#94a3b8' : backendOk ? '#22c55e' : '#ef4444', fontSize: 13 }}>
              {backendOk === null ? '检测中...' : backendOk ? '已连接' : '未连接 (请启动 ocr-proxy)'}
            </span>
          </div>
          <div className="ocr-field">
            <label>模型</label>
            <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o (默认)" />
          </div>
        </details>

        <button className="btn btn-primary" onClick={doRecognize} disabled={!preview || loading || backendOk === false}
          style={{ width: '100%', marginTop: 12 }}>
          {loading ? '识别中...' : '识别题目'}
        </button>

        {status && (
          <div className={`ocr-status ${status.type}`}>{status.msg}</div>
        )}

        {result && (
          <div className="ocr-result">
            <div className="ocr-result-title">{result.title ?? '未命名'}</div>
            <div className="ocr-result-desc">{result.description}</div>
            {(result.options ?? []).length > 0 && (
              <div className="ocr-result-options">
                {result.options!.map(o => (
                  <div key={o.letter} className="ocr-result-opt"><strong>{o.letter}.</strong> {o.text}</div>
                ))}
              </div>
            )}
            {result.answer && (
              <div className="ocr-result-answer">
                <strong>答案：</strong>{result.answer.correct?.join('、')}
                {result.answer.explanation && <><br />{result.answer.explanation}</>}
              </div>
            )}
            <button className="btn btn-primary" onClick={loadIntoSimulation} style={{ width: '100%', marginTop: 12 }}>
              加载仿真
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
