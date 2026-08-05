// 修正脚本：拆分生成的子文件中，scene id 含连字符（kebab-case）会导致
// `export const <id>Scene` 不是合法 JS 标识符。本脚本将所有 <id>Scene 改为合法标识符
// （连字符/非常规字符 -> 下划线，数字开头补前缀 _），并同步修正子目录 index.ts 的引用。
// 文件名保持 kebab（文件系统允许），仅改 const 名与引用。

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const base = join(repoRoot, 'visualization', 'src', 'scenes', 'scenes');

const dirs = ['mechanics', 'electromagnetism', 'optics', 'thermodynamics', 'modern'];

function sanitize(id) {
  let s = id.replace(/[^a-zA-Z0-9_$]/g, '_');
  if (/^[0-9]/.test(s)) s = '_' + s;
  return s;
}

for (const name of dirs) {
  const dir = join(base, name);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
  const map = []; // { raw, safe }
  for (const f of files) {
    const raw = basename(f, '.ts');
    const safe = sanitize(raw);
    map.push({ raw, safe });
  }

  // 修正每个子文件
  for (const { raw, safe } of map) {
    const fp = join(dir, `${raw}.ts`);
    const content = readFileSync(fp, 'utf8');
    const oldConst = `export const ${raw}Scene: SceneConfig =`;
    const newConst = `export const ${safe}Scene: SceneConfig =`;
    if (!content.includes(oldConst)) {
      throw new Error(`在 ${fp} 中未找到预期声明: ${oldConst}`);
    }
    const fixed = content.replaceAll(oldConst, newConst);
    writeFileSync(fp, fixed);
  }

  // 修正子目录 index.ts（import 与汇总数组两处都用 <raw>Scene）
  const idxPath = join(dir, 'index.ts');
  let idx = readFileSync(idxPath, 'utf8');
  for (const { raw, safe } of map) {
    idx = idx.replaceAll(`${raw}Scene`, `${safe}Scene`);
  }
  writeFileSync(idxPath, idx);

  console.log(`✓ ${name}: 修正 ${map.length} 个场景标识符`);
}

console.log('\n完成。下一步重新运行 npm run format 确认无语法错误。');
