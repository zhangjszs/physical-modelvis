# 环境探测缓存（ENV）

> 时间流接力首轮探测生成；后续棒直接读本文件，不再重复探测。
> 人工可直接编辑覆盖，人工版本优先于重新探测。
> 绝对路径（repo root / 机器目录）属机器相关信息，禁止写入本文件。

- **主分支**：main（`git remote show origin` → HEAD branch: main）
- **包管理**：npm workspaces（根目录一次装齐 core + viz + 根工具链；lockfile = package-lock.json）
- **构建**：`npm run build`（= build:core + build:viz）
  - 引擎单独：`npm run build:core`；前端单独：`npm run build:viz`
- **测试**：`npm test`（先 physics-core 再 visualization）
  - 单独：`npm run test:core` / `npm run test:viz`
  - 单文件：`cd <pkg> && npx vitest run <相对路径>`（Linux 用 `npx`，非 Windows 的 `npx.cmd`）
- **类型检查**：`npm run typecheck`（含 `scripts/guard-dist-freshness.mjs` dist 新鲜度守卫）
- **Lint**：`npm run lint`（修复：`npm run lint:fix`）
- **格式**：`npm run format:check`（写入：`npm run format`）
- **一键全量门禁（CI 等价）**：`npm run precheck`
  = build:core → typecheck → lint → format:check → test → count:check → build:viz → check:bundle → selfcheck
- **物理自检**：`npm run selfcheck`（scripts/self-check.mjs，L0–L6 + L8–L11，共 11 层，无 L7）
- **首屏体积门禁**：`npm run check:bundle`（入口 chunks gzip ≤70kB）
- **测试数单一真源**：`npm run count:sync` 实跑并回写三处 `<!-- test-count -->` 标记
  （README 顶部行 + README 测试覆盖块 + docs/plan.md）；`npm run count:check` 校验漂移
- **gh CLI**：可用（账号 zhangjszs；token scopes: gist, read:org, repo, workflow）→ issue 操作走线上，无需草稿降级
- **PATH**：本机 npm/node 由 mise 管理，不在默认 PATH。跑任何 npm/npx/node 前先
  `export PATH="$HOME/.local/share/mise/shims:$PATH"`（pre-push 钩子有兜底，手动跑脚本时需要）
- **部署**：GitHub Pages `https://zhangjszs.github.io/physical-modelvis/`（deploy.yml，CI 成功后 workflow_run 触发）

探测于 2026-10-01T11:47:39Z，agent `qoder-20261001T114739Z`
