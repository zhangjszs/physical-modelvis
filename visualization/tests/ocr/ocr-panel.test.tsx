/**
 * OCRPanel 组件行为测试 (#75, #76 扩展举一反三)
 *
 * 覆盖验收标准 1 的 5 类交互 + 模式切换修复回归 (验收标准 4) + 举一反三生成链路 (#76):
 *   1. 打开/关闭 (入口按钮 ↔ 遮罩/关闭钮)
 *   2. 文件校验 (非图片 / 超 10MB)
 *   3. 识别成功 (状态提示 + 结果渲染) / 识别失败 (错误文案)
 *   4. 多题 tab 导航
 *   5. 加载仿真 (store 动作: appMode 切回教材模式 + setScene/setParameter 落库 + 面板关闭)
 *   6. 举一反三: 生成 → 变式 tab → 变式加载仿真 / 生成失败 / 切主 tab 清空变式
 *
 * mock 边界: 仅 mock global fetch (health/recognize/generate 三个端点), store 与 FileReader 走真实实现。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { OCRPanel } from '../../src/components/ocr/OCRPanel';
import { useSimulationStore } from '../../src/store/simulationStore';
import type { RecognizeResponse } from '../../server/ocr-utils';

const HEALTH_RESPONSE = {
    status: 'ok',
    defaultProvider: 'anthropic',
    providers: [{ id: 'anthropic', defaultModel: 'claude-sonnet-4-6' }]
};

function recognizeOk(problems: RecognizeResponse['problems']): { ok: boolean; status: number; body: unknown } {
    return {
        ok: true,
        status: 200,
        body: {
            result: { problems },
            meta: { provider: 'anthropic', model: 'm1', requestedModel: null, modelFallback: false }
        }
    };
}

/** 按请求 URL 路由的 fetch 桩: /health → HEALTH_RESPONSE, /recognize → 每测试预设响应,
 *  /generate → 可选预设 (未预设时返回 500, 防止用例误触发生成链路) (#76) */
function stubFetch(
    recognize: { ok: boolean; status: number; body: unknown },
    generate?: { ok: boolean; status: number; body: unknown }
): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/api/ocr/health')) {
                return new Response(JSON.stringify(HEALTH_RESPONSE), { status: 200 });
            }
            if (url.includes('/api/problems/generate')) {
                const g = generate ?? { ok: false, status: 500, body: { error: 'generate 未打桩' } };
                return new Response(JSON.stringify(g.body), { status: g.status });
            }
            return new Response(JSON.stringify(recognize.body), { status: recognize.status });
        })
    );
}

/** 点击入口按钮打开面板, 并等待健康检查 (act 包裹的异步更新) 落定为「已连接」 */
async function openPanel() {
    fireEvent.click(screen.getByRole('button', { name: /拍照解题/ }));
    await waitFor(() => expect(document.querySelector('.ocr-overlay')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('已连接')).toBeTruthy());
}

/** 经隐藏 input 上传文件 (模拟选择文件), 同步校验的错误立即可见 */
function uploadFile(file: File) {
    const input = document.querySelector('.ocr-dropzone input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });
}

/** 真实经 FileReader 读 data URL (异步), 完成后预览与识别按钮就绪 */
async function uploadImageAndWaitPreview(file: File) {
    uploadFile(file);
    await waitFor(() => expect(document.querySelector('.ocr-preview img')).toBeTruthy());
}

function makeImageFile(sizeBytes: number): File {
    return new File([new Uint8Array(sizeBytes)], 'photo.png', { type: 'image/png' });
}

/** 小图 (几十字节, 走真实 FileReader) */
const SMALL_IMAGE = () => makeImageFile(64);

describe('OCRPanel — 打开/关闭', () => {
    it('positive: 关闭态显示入口按钮, 点击后出现面板; 点关闭钮后面板消失', async () => {
        stubFetch(recognizeOk([]));
        render(<OCRPanel />);

        expect(document.querySelector('.ocr-overlay')).toBeNull();
        await openPanel();
        expect(screen.getByText('AI 拍照解题')).toBeTruthy();
        expect(document.querySelector('.ocr-dropzone')).toBeTruthy();

        fireEvent.click(document.querySelector('.ocr-close')!);
        await waitFor(() => expect(document.querySelector('.ocr-overlay')).toBeNull());
    });
});

describe('OCRPanel — 文件校验', () => {
    it('edge: 非图片文件 → 提示「请选择图片文件」, 不进入预览', async () => {
        stubFetch(recognizeOk([]));
        render(<OCRPanel />);
        await openPanel();

        uploadFile(new File([new Uint8Array(8)], 'notes.txt', { type: 'text/plain' }));
        expect(screen.getByText('请选择图片文件')).toBeTruthy();
        expect(document.querySelector('.ocr-preview')).toBeNull();
    });

    it('edge: 超 10MB 图片 → 提示「图片不能超过 10MB」, 不进入预览', async () => {
        stubFetch(recognizeOk([]));
        render(<OCRPanel />);
        await openPanel();

        uploadFile(makeImageFile(10 * 1024 * 1024 + 1));
        expect(screen.getByText('图片不能超过 10MB')).toBeTruthy();
        expect(document.querySelector('.ocr-preview')).toBeNull();
    });
});

describe('OCRPanel — 识别', () => {
    it('positive: 识别成功 → 状态「识别完成: 共 2 题」+ 多题 tab 出现, 默认显示第 1 题', async () => {
        stubFetch(
            recognizeOk([
                {
                    index: 1,
                    title: '斜面滑块',
                    description: '质量 2kg 沿斜面下滑',
                    sceneTemplate: 'inclined-plane',
                    given: { 质量: 2 }
                },
                {
                    index: 2,
                    title: '平抛运动',
                    description: '以 5m/s 水平抛出',
                    sceneTemplate: 'projectile',
                    given: { 初速度: 5 }
                }
            ])
        );
        render(<OCRPanel />);
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());

        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getByText(/识别完成: 共 2 题/)).toBeTruthy());
        expect(screen.getByText(/斜面滑块/)).toBeTruthy();
        // 多题导航: 2 个 tab, 第 1 个激活
        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(2);
        expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    });

    it('edge: 识别失败 (后端 500) → 状态区显示错误文案, 不渲染结果', async () => {
        stubFetch({ ok: false, status: 500, body: { error: '服务器内部错误' } });
        render(<OCRPanel />);
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());

        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(document.querySelector('.ocr-status.error')).toBeTruthy());
        expect(screen.getByText('服务器内部错误')).toBeTruthy();
        expect(screen.queryByRole('tab')).toBeNull();
    });
});

describe('OCRPanel — 多题导航', () => {
    it('positive: 点击第 2 个 tab → 切换显示第 2 题内容', async () => {
        stubFetch(
            recognizeOk([
                { index: 1, title: '题目甲', description: '第一题描述' },
                { index: 2, title: '题目乙', description: '第二题描述' }
            ])
        );
        render(<OCRPanel />);
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());
        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));

        fireEvent.click(screen.getAllByRole('tab')[1]!);
        expect(screen.getByText(/题目乙/)).toBeTruthy();
        expect(screen.queryByText(/题目甲/)).toBeNull();
        expect(screen.getAllByRole('tab')[1]!.getAttribute('aria-selected')).toBe('true');
    });
});

describe('OCRPanel — 加载仿真 (含 #75 模式切换修复回归)', () => {
    it('positive: 组合台模式下点「加载仿真」→ appMode 切回教材模式 + setScene/setParameter 落库 + 面板关闭', async () => {
        stubFetch(
            recognizeOk([
                {
                    index: 1,
                    title: '弹簧振子',
                    description: '劲度系数 25 N/m',
                    sceneTemplate: 'spring',
                    given: { 初速度: 3, 质量: 0.5 }
                }
            ])
        );
        render(<OCRPanel />);

        // 模拟用户处于组合实验台顶层模式 (bug 修复前: setScene 生效但停留在组合台, 看不到仿真)
        useSimulationStore.setState({ appMode: 'composition-lab', currentScene: 'projectile', parameters: {} });
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());
        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '加载仿真' })).toBeTruthy());

        fireEvent.click(screen.getByRole('button', { name: '加载仿真' }));

        const state = useSimulationStore.getState();
        expect(state.appMode).toBe('scenes'); // ← #75 修复核心断言
        expect(state.currentScene).toBe('spring'); // resolveScene('spring')
        expect(state.parameters['v0']).toBe(3); // buildSceneParams: 初速度 → v0
        expect(state.parameters['mass']).toBe(0.5); // 质量 → mass
        await waitFor(() => expect(document.querySelector('.ocr-overlay')).toBeNull());
    });

    it('edge: 教材模式下加载仿真 → appMode 保持 scenes (幂等)', async () => {
        stubFetch(recognizeOk([{ index: 1, title: '平抛', sceneTemplate: 'projectile', given: {} }]));
        render(<OCRPanel />);
        useSimulationStore.setState({ appMode: 'scenes', currentScene: 'collision' });
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());
        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '加载仿真' })).toBeTruthy());

        fireEvent.click(screen.getByRole('button', { name: '加载仿真' }));
        const state = useSimulationStore.getState();
        expect(state.appMode).toBe('scenes');
        expect(state.currentScene).toBe('projectile');
    });
});

describe('OCRPanel — 举一反三 (#76)', () => {
    const ORIGINAL = {
        index: 1,
        title: '平抛运动',
        description: '从 20m 高处以 5m/s 水平抛出',
        sceneTemplate: 'projectile',
        given: { 初速度: 5 }
    };
    const VARIANTS = [
        {
            index: 1,
            title: '变式·高塔抛出',
            description: '从 45m 高处以 8m/s 水平抛出',
            sceneTemplate: 'projectile',
            given: { 初速度: 8, 高度: 45 }
        },
        {
            index: 2,
            title: '变式·斜面滑块',
            description: '质量 2kg 沿斜面下滑',
            sceneTemplate: 'inclined-plane',
            given: { 质量: 2 }
        }
    ];

    it('positive: 识别 → 举一反三 → 变式 tab 出现 → 切变式 → 点变式「加载仿真」→ store 落库 + 面板关闭', async () => {
        stubFetch(recognizeOk([ORIGINAL]), {
            ok: true,
            status: 200,
            body: {
                result: { problems: VARIANTS },
                meta: { provider: 'anthropic', model: 'm1', requestedModel: null, modelFallback: false }
            }
        });
        render(<OCRPanel />);
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());
        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getByText(/识别完成: 共 1 题/)).toBeTruthy());

        fireEvent.click(screen.getByRole('button', { name: /举一反三/ }));
        await waitFor(() => expect(screen.getByText(/已生成 2 道变式题/)).toBeTruthy());
        expect(screen.getByText('变式题 (共 2 道)')).toBeTruthy();

        // 请求体核验: 原题 JSON + count=3 (前端默认)
        const generateCall = vi
            .mocked(fetch)
            .mock.calls.find(([input]) => String(input).includes('/api/problems/generate'));
        expect(generateCall).toBeTruthy();
        const sentBody = JSON.parse(String((generateCall![1] as RequestInit).body)) as {
            problem: { title: string };
            count: number;
        };
        expect(sentBody.problem.title).toBe('平抛运动');
        expect(sentBody.count).toBe(3);

        // 变式导航: 本例主结果仅 1 题 (无主 tab), 2 个 tab 均为变式, 默认第 1 道
        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(2);
        expect(screen.getByText(/变式·高塔抛出/)).toBeTruthy();

        // 切第 2 道变式 → 内容切换
        fireEvent.click(tabs[1]!);
        expect(screen.getByText(/变式·斜面滑块/)).toBeTruthy();
        expect(screen.queryByText(/变式·高塔抛出/)).toBeNull();

        // 变式卡片的「加载仿真」(主卡与变式卡各有一个, 取后者)
        const loadButtons = screen.getAllByRole('button', { name: '加载仿真' });
        expect(loadButtons).toHaveLength(2);
        fireEvent.click(loadButtons[1]!);

        const state = useSimulationStore.getState();
        expect(state.appMode).toBe('scenes');
        expect(state.currentScene).toBe('inclined-plane'); // 变式 2 的场景
        expect(state.parameters['mass']).toBe(2); // buildSceneParams: 质量 → mass
        await waitFor(() => expect(document.querySelector('.ocr-overlay')).toBeNull());
    });

    it('edge: 生成失败 (后端 502) → 状态区错误文案, 不出现变式区块', async () => {
        stubFetch(recognizeOk([ORIGINAL]), {
            ok: false,
            status: 502,
            body: { error: 'AI 返回内容中未识别到有效变式题' }
        });
        render(<OCRPanel />);
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());
        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getByRole('button', { name: /举一反三/ })).toBeTruthy());

        fireEvent.click(screen.getByRole('button', { name: /举一反三/ }));
        await waitFor(() => expect(document.querySelector('.ocr-status.error')).toBeTruthy());
        expect(screen.getByText('AI 返回内容中未识别到有效变式题')).toBeTruthy();
        expect(screen.queryByText(/变式题 \(共/)).toBeNull();
    });

    it('edge: 生成后切换主题 tab → 变式区块清空 (变式属于原题)', async () => {
        stubFetch(recognizeOk([ORIGINAL, { index: 2, title: '题目乙', description: '第二题描述' }]), {
            ok: true,
            status: 200,
            body: { result: { problems: VARIANTS } }
        });
        render(<OCRPanel />);
        await openPanel();
        await uploadImageAndWaitPreview(SMALL_IMAGE());
        fireEvent.click(screen.getByRole('button', { name: '识别题目' }));
        await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2)); // 主导航 2 题

        fireEvent.click(screen.getByRole('button', { name: /举一反三/ }));
        await waitFor(() => expect(screen.getByText(/已生成 2 道变式题/)).toBeTruthy());
        expect(screen.getByText(/变式题 \(共 2 道\)/)).toBeTruthy();

        // 切主 tab 到第 2 题 (主导航在 DOM 前部) → 变式区块消失
        fireEvent.click(screen.getAllByRole('tab')[1]!);
        expect(screen.getByText(/题目乙/)).toBeTruthy();
        expect(screen.queryByText(/变式题 \(共/)).toBeNull();
    });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
    // store 关键字段复位, 隔离测试间状态泄漏 (appMode/场景/参数)
    useSimulationStore.setState({ appMode: 'scenes', currentScene: 'projectile', parameters: {} });
});
