/**
 * 物理常量字面量门禁模式 (单一真源)
 *
 * 由 #13/#51 建立于引擎侧测试, #53 抽出到此处供**引擎侧与渲染侧两套测试共用**
 * (依 DECISIONS.md D3: 门禁严格度对齐、不做白名单, 且"复制两份模式"本身就是新的双源)。
 *
 * 消费者:
 *   - physics-core/tests/unit/constants-single-source.test.ts  (扫 src/models)
 *   - visualization/tests/accuracy/rendering-constants-single-source.test.ts (扫 src/rendering)
 *
 * 口径: 剥离注释与字符串后, 计算代码中若出现下列物理常量字面量即判违规,
 * 应改为引用 PHYSICS_CONSTANTS / 渲染层 constants.ts。展示文本/常量定义处允许出现。
 */

/** 物理常量的字面量模式 —— 只针对"出现在计算表达式中"的情形 */
export const LITERAL_PATTERNS: Array<{ name: string; re: RegExp }> = [
    // 重力加速度 (排除 9.80665 精确值与 9.8xxxx 变体)
    { name: 'g=9.8', re: /(?<![\d.])9\.8(?![\d])/ },
    // 库仑常数
    { name: 'k=8.9875517923e9', re: /8\.9875517923e9/ },
    // 真空磁导率 μ₀ = 4π×10⁻⁷ (展开写法)
    { name: 'mu0=4π×1e-7', re: /4\s*\*\s*Math\.PI\s*\*\s*1e-7/ },
    // 摩尔气体常量
    { name: 'R=8.314', re: /(?<![\d.])8\.314(?![\d])/ },
    // 基本电荷 / 光速
    // e 覆盖全精度与常见截断写法 (1.602e-19 / 1.6e-19 此前绕过门禁, 见 #51)。
    //   用 1\.6 前缀 (而非更窄的 1\.60) 才能同时捕获 1.6e-19; (?<![\d.]) 抑制
    //   被数字/小数点前缀包裹的误伤; 指数固定 e-19, 故 1.602e-13(MeV→J) 等不受波及。
    { name: 'e=1.602176634e-19', re: /(?<![\d.])1\.6\d*e-19/ },
    { name: 'c=299792458', re: /(?<![\d.])299792458(?![\d])/ }
];

/**
 * 去掉注释与字符串字面量后再检测 —— 注释/字符串里的常量是**展示文本**, 允许存在。
 */
export function stripCommentsAndStrings(src: string): string {
    return (
        src
            // 块注释
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            // 行注释
            .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
            // 模板字符串 (含插值的整体移除会误伤, 故先移除普通串再处理)
            .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
            .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
            .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    );
}

/**
 * 门禁模式自检样例 (#51): 逐条给出"应命中的正样例"与"不应命中的负样例"。
 * 防止模式本身写错导致门禁形同虚设 —— 电荷模式曾只匹配全精度写法, 截断写法完全绕过。
 * 新增模式若未在此登记, 两套门禁测试均判失败 (强制补样例)。
 */
export const PATTERN_SAMPLES: Record<string, { positive: string[]; negative: string[] }> = {
    'g=9.8': { positive: ['const g = 9.8;', 'a = 9.8 * m'], negative: ['9.80665', '98', '0.985'] },
    'k=8.9875517923e9': { positive: ['const k = 8.9875517923e9;'], negative: ['8.99e9', '8.9875517923e8'] },
    'mu0=4π×1e-7': { positive: ['4 * Math.PI * 1e-7', '4*Math.PI*1e-7'], negative: ['4 * Math.PI * 1e-8'] },
    'R=8.314': { positive: ['const R = 8.314;'], negative: ['8.314462618', '8.31'] },
    'e=1.602176634e-19': {
        positive: ['1.602176634e-19', '1.602e-19', '1.6e-19', 'const q = 1.6e-19;', 'total * 200e6 * 1.602e-19'],
        negative: ['2.5e-19', '1.602e-13', '1.6e-20', '11.6e-19']
    },
    'c=299792458': { positive: ['const c = 299792458;'], negative: ['2997924580', '2.99792458e8'] }
};
