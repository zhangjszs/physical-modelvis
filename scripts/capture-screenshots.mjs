/**
 * README 界面演示截图一键复采 (#97)
 *
 * 用法（仓库根目录）: node scripts/capture-screenshots.mjs
 *   自动构建可视化生产产物（vite build）→ 起 vite preview（专用端口）→ 采 6 张关键界面
 *   → 落盘 docs/screenshots/ → 停 server，无残留进程。
 *
 * 环境变量:
 *   CAPTURE_PORT     preview server 端口（默认 4317，避开 3000/5199 等既有脚本端口）
 *   CAPTURE_OUT      输出目录（默认 docs/screenshots）
 *   CAPTURE_CHANNEL  Playwright 浏览器渠道（默认空 = 自带 chromium，跨平台）
 *
 * 确定性（重复执行两遍产物逐字节一致）:
 *   - 含 3D 舞台的图统一在「独立页面 + Playwright 虚拟时钟」下采集：3D 主球按真实帧间隔
 *     自转 (EquipmentStage.tsx `ball.rotation.y += delta * 2.4`)，真实时钟下两次运行的光照
 *     会差若干像素；虚拟时钟把整个动画时间线固定，两次运行逐帧一致。
 *   - 截图前不得再触发任何额外渲染（如点击右侧面板页签会重新挂载面板并改写累积帧序列）。
 *   - 2D 板书画布无条件逐帧重绘且无旋转相位依赖，真实时钟下已验证稳定（第 2 张）。
 *   - 视口固定 1440×900；2D 画布在布局变化（开数据抽屉）后需触发 window.resize 才会重排。
 *
 * 已知问题绕行（已立 auto-discovered 单跟踪，不属本脚本职责）:
 *   - 生产构建（preview / 线上部署）下首屏默认场景的 3D 舞台空白（dev 模式正常），
 *     故所有 3D 图都走「点击目录场景」路径触发渲染；
 *   - OCR 弹窗因 .top-bar 的 backdrop-filter 成为 fixed 定位参照而溢出视口顶部，
 *     脚本用 addStyleTag 临时取消该属性取景（不改应用源码）。
 *
 * 环境要求: headless Chromium 需要系统中文字体，缺失时中文渲染为方块（脚本启动时检测并警告）。
 * 图片预算: 单张 ≤1MB（超限自动降级 JPEG q88）、总量 ≤8MB（超限报错）。
 */
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = Number(process.env.CAPTURE_PORT ?? 4317);
const OUT_DIR = path.resolve(ROOT, process.env.CAPTURE_OUT ?? 'docs/screenshots');
const CHANNEL = process.env.CAPTURE_CHANNEL || '';
const BASE = `http://127.0.0.1:${PORT}/`;
const VIEWPORT = { width: 1440, height: 900 };
const SINGLE_SHOT_LIMIT = 1024 * 1024; // 单张 ≤1MB
const TOTAL_LIMIT = 8 * 1024 * 1024; // 总量 ≤8MB
const FIXED_CLOCK = new Date('2026-01-01T00:00:00Z'); // 虚拟时钟基准（固定动画时刻用）

/** 检测系统中文字体（fc-list 不存在时跳过，macOS/Windows 一般自带） */
function warnIfNoCjkFont() {
    try {
        const r = spawnSync('fc-list', [':lang=zh'], { encoding: 'utf8' });
        if (r.status === 0 && !r.stdout.trim()) {
            console.warn('[capture] 警告: 系统未发现中文字体 (fc-list :lang=zh 为空), 截图中文将渲染为方块。');
            console.warn(
                '[capture]       Linux 可安装 fonts-noto-cjk, 或将任意中文 .otf/.ttf 放入 ~/.local/share/fonts 后执行 fc-cache -f'
            );
        }
    } catch {
        // fc-list 不存在（macOS/Windows）→ 视为有中文字体
    }
}

/** 构建可视化生产产物（与 CI 同一 npm script；失败即抛错退出） */
function buildViz() {
    return new Promise((resolve, reject) => {
        console.log('[capture] 构建可视化生产产物 (visualization: npm run build) ...');
        const child = spawn('npm', ['run', 'build'], {
            cwd: path.join(ROOT, 'visualization'),
            stdio: 'inherit'
        });
        child.on('error', reject);
        child.on('exit', code => {
            if (code === 0) resolve();
            else reject(new Error(`vite build 失败 (exit ${code})`));
        });
    });
}

/** 轮询等待 preview server 就绪 */
function waitForServer(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const poll = () => {
            const req = http.get(url, res => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) {
                    resolve();
                } else if (Date.now() > deadline) {
                    reject(new Error(`preview 就绪超时 (${timeoutMs}ms, status ${res.statusCode})`));
                } else {
                    setTimeout(poll, 500);
                }
            });
            req.on('error', () => {
                if (Date.now() > deadline) reject(new Error(`preview 就绪超时 (${timeoutMs}ms, 连接失败)`));
                else setTimeout(poll, 500);
            });
        };
        poll();
    });
}

/** 起 vite preview（detached 进程组，便于整组 kill：npm→vite 孙进程） */
function startPreview() {
    const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
        cwd: path.join(ROOT, 'visualization'),
        stdio: 'ignore',
        detached: true
    });
    child.on('error', err => console.error(`[capture] preview 启动失败: ${err.message}`));
    return child;
}

/** 停 preview: 进程组 SIGTERM → 兜底 SIGKILL（不留 npm/vite 残留） */
async function stopPreview(child) {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    try {
        process.kill(-child.pid, 'SIGTERM');
    } catch {
        child.kill('SIGTERM');
    }
    const timer = setTimeout(() => {
        try {
            process.kill(-child.pid, 'SIGKILL');
        } catch {
            child.kill('SIGKILL');
        }
    }, 5000);
    await exited;
    clearTimeout(timer);
}

/** 清理产物目录里上一次采集的截图（NN-*.png|jpg），避免改名后残留旧图 */
function pruneOldShots() {
    for (const f of fs.readdirSync(OUT_DIR)) {
        if (/^\d{2}-.*\.(png|jpg)$/i.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
    }
}

/** 截图并落盘；PNG 超预算自动降级 JPEG q88；返回 { file, bytes } */
async function shoot(page, name) {
    const png = await page.screenshot({ type: 'png' });
    let file = `${name}.png`;
    let buf = png;
    if (png.length > SINGLE_SHOT_LIMIT) {
        buf = await page.screenshot({ type: 'jpeg', quality: 88 });
        file = `${name}.jpg`;
        console.log(`[capture] ${name}: PNG ${(png.length / 1024).toFixed(0)}KB 超限, 降级 JPEG q88`);
    }
    fs.writeFileSync(path.join(OUT_DIR, file), buf);
    console.log(`[capture] ${file}  ${(buf.length / 1024).toFixed(0)}KB`);
    return { file, bytes: buf.length };
}

/* ================= 真实时钟辅助（第 2 张 2D 板书画布用） ================= */

/** 等目录激活项匹配目标场景 + 2 个 rAF（与 verify-*.cjs 的就绪信号一致） */
async function waitSceneReady(page, sceneName) {
    await page.waitForFunction(
        target => {
            const el = document.querySelector('.directory-scene.active span');
            return el ? el.textContent.trim() === target : false;
        },
        sceneName,
        { timeout: 30000, polling: 100 }
    );
    await page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))));
}

/** 等目录懒加载完成（行数连续两次轮询不变，上限 15s） */
async function waitDirectoryLoaded(page) {
    await page.waitForFunction(
        () => {
            const w = window;
            const count = () => document.querySelectorAll('.directory-scene').length;
            const now = count();
            if (w.__prevDirCount === now && now > 0) {
                delete w.__prevDirCount;
                return true;
            }
            w.__prevDirCount = now;
            return false;
        },
        undefined,
        { timeout: 15000, polling: 300 }
    );
}

/** 点击目录里的场景（行首 span 是场景名，只比较名字 span，避免「精讲」徽章污染） */
async function clickScene(page, sceneName) {
    await page.waitForFunction(
        target =>
            [...document.querySelectorAll('.directory-scene')].some(
                e => (e.querySelector('span')?.textContent || '').trim() === target
            ),
        sceneName,
        { timeout: 30000, polling: 200 }
    );
    const ok = await page.$$eval(
        '.directory-scene',
        (els, t) => {
            const el = els.find(e => (e.querySelector('span')?.textContent || '').trim() === t);
            if (el) {
                el.click();
                return true;
            }
            return false;
        },
        sceneName
    );
    if (!ok) throw new Error(`目录中找不到场景: ${sceneName}`);
    await waitSceneReady(page, sceneName);
    await page.waitForTimeout(600);
}

/** 打开应用（真实时钟）并等目录懒加载完成 */
async function openApp(page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.directory-scene', { timeout: 30000 });
    await waitDirectoryLoaded(page);
}

/* ================= 虚拟时钟辅助（含 3D 舞台的图用） ================= */

/** 反复「检查条件 → 推进虚拟时钟」直到条件成立（页内 rAF/定时器都在时钟控制下） */
async function clockRunUntil(page, fn, timeoutMs = 30000, step = 250) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await fn()) return;
        await page.clock.runFor(step);
    }
    throw new Error('虚拟时钟等待超时');
}

/** 新页面装虚拟时钟并打开应用，等目录懒加载完成 */
async function openAppClock(page) {
    await page.clock.install({ time: FIXED_CLOCK });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await clockRunUntil(page, async () => (await page.locator('.directory-scene').count()) > 0);
    await clockRunUntil(
        page,
        async () =>
            page.$$eval('.directory-scene', () => {
                const w = window;
                const now = document.querySelectorAll('.directory-scene').length;
                if (w.__prevDirCount === now && now > 0) return true;
                w.__prevDirCount = now;
                return false;
            }),
        20000,
        300
    );
}

/** 虚拟时钟下点击目录场景并推进渲染（替代真实时钟的 rAF 等待） */
async function clickSceneClock(page, sceneName) {
    await clockRunUntil(
        page,
        async () =>
            page.$$eval(
                '.directory-scene',
                (els, t) => els.some(e => (e.querySelector('span')?.textContent || '').trim() === t),
                sceneName
            ),
        30000,
        250
    );
    await page.$$eval(
        '.directory-scene',
        (els, t) => {
            const el = els.find(e => (e.querySelector('span')?.textContent || '').trim() === t);
            el?.click();
        },
        sceneName
    );
    await clockRunUntil(
        page,
        async () =>
            page.$$eval(
                '.directory-scene.active span',
                (els, t) => els.some(e => e.textContent.trim() === t),
                sceneName
            ),
        30000,
        250
    );
    await page.clock.runFor(2000); // 推进场景切换后的渲染（虚拟时间 → 帧间隔确定）
}

/* ================================== 主流程 ================================== */

(async () => {
    warnIfNoCjkFont();
    await buildViz();

    fs.mkdirSync(OUT_DIR, { recursive: true });
    pruneOldShots();

    const server = startPreview();
    let browser;
    const shots = [];
    try {
        await waitForServer(BASE, 60000);
        browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });

        /** 独立页面 + 虚拟时钟采一张图（3D 图统一入口；页面用完即关） */
        const clockShot = async (name, capture) => {
            const page = await browser.newPage({ viewport: VIEWPORT });
            try {
                await openAppClock(page);
                await capture(page);
                shots.push(await shoot(page, name));
            } finally {
                await page.close();
            }
        };

        // 1) 课堂工作台总览（抛体运动：3D 器材 + 教材目录 + 课堂教案）
        //    抛体是启动默认场景，"点击当前场景"不会重建 rig（渲染期无确定的收敛终点）；
        //    先切到另一场景再切回，使最终一次为真实场景切换（渲染帧序列确定，见头注释）。
        await clockShot('01-overview', async page => {
            await clickSceneClock(page, '自由落体');
            await clickSceneClock(page, '抛体运动 (平抛+斜抛)');
        });

        // 2) 2D 板书 + 数据图表（单摆：角度/受力/能量板书 + 位移-时间正弦曲线）
        {
            const page = await browser.newPage({ viewport: VIEWPORT });
            try {
                await openApp(page);
                await clickScene(page, '单摆 (简谐运动)');
                await page.click('button[title="切换到 2D 板书示意模式"]');
                await page.waitForSelector('.stage-viewport canvas', { timeout: 20000 });
                await page.waitForTimeout(300);
                await page.click('button:has-text("数据/图像")');
                await page.waitForSelector('.classroom-data-drawer .recharts-surface', {
                    timeout: 20000
                });
                await page.waitForTimeout(2200); // 等 recharts 入场动画完整落定（默认 ~1.5s）
                // 2D 画布只在 window.resize 时重排，抽屉改变布局后需抖动视口触发重绘
                await page.setViewportSize({ width: VIEWPORT.width, height: VIEWPORT.height + 1 });
                await page.setViewportSize(VIEWPORT);
                await page.waitForTimeout(400);
                shots.push(await shoot(page, '02-scene-2d-charts'));
            } finally {
                await page.close();
            }
        }

        // 3) 3D 实验器材（匀强磁场：带电粒子圆周运动 + 课堂教案）
        await clockShot('03-scene-3d-magnetic', page => clickSceneClock(page, '匀强磁场'));

        // 4) AI 拍照解题面板（叠在 2D 场景上；临时取消 top-bar 毛玻璃以修正 fixed 定位参照）
        await clockShot('04-ocr-panel', async page => {
            await page.addStyleTag({
                content: '.top-bar{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'
            });
            await clickSceneClock(page, '玻尔氢原子模型 (能级与光谱)');
            await page.click('button:has-text("拍照解题")');
            await page.waitForSelector('.ocr-modal', { state: 'visible', timeout: 15000 });
            await clockRunUntil(
                page,
                async () =>
                    page.evaluate(() => {
                        const m = document.querySelector('.ocr-modal');
                        if (!m) return false;
                        const r = m.getBoundingClientRect();
                        return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1;
                    }),
                10000,
                200
            );
            await page.clock.runFor(300);
        });

        // 5) 实验导学面板（叠在 2D 场景上；等面板内容绑定到当前场景）
        await clockShot('05-guidance-panel', async page => {
            await clickSceneClock(page, '玻尔氢原子模型 (能级与光谱)');
            await page.click('button:has-text("导学")');
            await page.waitForSelector('.guidance-panel', { state: 'visible', timeout: 15000 });
            await clockRunUntil(
                page,
                async () =>
                    page.$$eval(
                        '.guidance-goal',
                        els => els.length > 0 && (els[0].textContent || '').includes('玻尔氢原子模型')
                    ),
                10000,
                250
            );
            await page.clock.runFor(300);
        });

        // 6) 组合实验台（点电荷 + 圆形线圈 + 双色场线 + 2× 密度）
        await clockShot('06-composition-bench', async page => {
            await page.click('button:has-text("组合实验")');
            await page.clock.runFor(1000);
            await page.waitForSelector('.composition-stage canvas', { timeout: 30000 });
            await page.click('button[title="添加点电荷"]');
            await page.clock.runFor(1600);
            await page.click('button[title="添加圆形线圈"]');
            await page.clock.runFor(1600);
            await page.locator('label:has-text("显示磁场线 (B)") input').check();
            await page.click('button[title*="2×"]');
            await page.clock.runFor(1600);
            const solved = await page.locator('text=轨迹求解完成').count();
            if (!solved) throw new Error('组合实验台轨迹求解未完成（"轨迹求解完成" 未出现）');
        });

        const total = shots.reduce((s, x) => s + x.bytes, 0);
        console.log(
            `[capture] 完成 ${shots.length} 张, 总量 ${(total / 1024 / 1024).toFixed(2)}MB / 预算 ${TOTAL_LIMIT / 1024 / 1024}MB`
        );
        if (total > TOTAL_LIMIT) {
            throw new Error(`截图总量 ${(total / 1024 / 1024).toFixed(2)}MB 超出预算 ${TOTAL_LIMIT / 1024 / 1024}MB`);
        }
    } finally {
        if (browser) await browser.close();
        await stopPreview(server);
        console.log('[capture] preview server 已停止');
    }
})().catch(err => {
    console.error(`[capture] 失败: ${err.message}`);
    process.exit(1);
});
