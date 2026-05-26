// UIManager - UI panel management
const UIManager = {
    buildTabs(problems) {
        const container = document.getElementById('tabs');
        container.innerHTML = '';
        problems.forEach((p, i) => {
            const tab = document.createElement('button');
            tab.className = 'tab' + (i === 0 ? ' active' : '');
            tab.textContent = p.title;
            tab.dataset.id = p.id;
            tab.addEventListener('click', () => App.loadProblem(p.id));
            container.appendChild(tab);
        });
    },

    buildControlPanel() {
        document.getElementById('control-panel').innerHTML = `
            <div class="section"><div class="sec-title">播放控制</div>
                <div class="btn-row">
                    <button class="btn" id="btn-play">播放</button>
                    <button class="btn" id="btn-reset">重置</button>
                </div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">速度</div>
                <input type="range" id="speed-slider" min="0.1" max="3" step="0.1" value="1.0" style="width:100%;">
                <div style="text-align:right;font-size:11px;color:#00d4ff;" id="speed-display">1.0x</div>
            </div>
            <div class="section"><div class="sec-title">发射模式</div>
                <div class="mode-grid">
                    <button class="mode-btn active" data-mode="single">单粒子</button>
                    <button class="mode-btn" data-mode="multi">多角度</button>
                    <button class="mode-btn" data-mode="continuous">连续</button>
                    <button class="mode-btn" data-mode="verify">验证选项</button>
                </div>
            </div>
            <div class="section"><div class="sec-title">参数</div>
                <div class="param-box" id="param-box"></div>
            </div>
            <div class="section"><div class="sec-title">显示</div>
                <label class="check-label"><input type="checkbox" id="chk-trails" checked> 轨迹</label>
                <label class="check-label"><input type="checkbox" id="chk-hits" checked> 击中点</label>
                <label class="check-label"><input type="checkbox" id="chk-field" checked> 场符号</label>
            </div>
            <div class="section" style="opacity:0.5;font-size:10px;line-height:1.6;">
                <div>快捷键: Space 播放/暂停 · R 重置 · ↑↓ 调速</div>
            </div>
        `;
    },

    buildInfoPanel() {
        document.getElementById('info-panel').innerHTML = `
            <div class="sec-title">实时测量</div>
            <div class="info-grid">
                <div class="info-cell"><div class="info-lbl">角度</div><div class="info-val" id="v-angle">0</div></div>
                <div class="info-cell"><div class="info-lbl">半径</div><div class="info-val" id="v-r">2.00</div></div>
                <div class="info-cell"><div class="info-lbl">击中x</div><div class="info-val" id="v-hitx">-</div></div>
                <div class="info-cell"><div class="info-lbl">时间</div><div class="info-val" id="v-time">0.00</div></div>
                <div class="info-cell"><div class="info-lbl">发射数</div><div class="info-val" id="v-count">0</div></div>
                <div class="info-cell"><div class="info-lbl">击中数</div><div class="info-val" id="v-hits">0</div></div>
            </div>
            <div class="info-grid" style="margin-top:8px;">
                <div class="info-cell"><div class="info-lbl">速度</div><div class="info-val" id="v-speed">0</div></div>
                <div class="info-cell"><div class="info-lbl">动能</div><div class="info-val" id="v-ke">0</div></div>
                <div class="info-cell"><div class="info-lbl">存活</div><div class="info-val" id="v-alive">0</div></div>
            </div>
        `;
    },

    updateInfoPanel() {
        document.getElementById('v-angle').textContent = (Simulator.currentAngle * 180 / Math.PI).toFixed(1) + '°';
        const config = PhysVis.ProblemRegistry.get(App.currentProblemId);
        const R = (config && config.given && config.given.radius) || 2.0;
        document.getElementById('v-r').textContent = R.toFixed(2) + 'd';
        const lastHit = Simulator.particles.filter(p => p.hitPoint).pop();
        document.getElementById('v-hitx').textContent = lastHit ? lastHit.hitPoint.x.toFixed(3) : '-';
        document.getElementById('v-time').textContent = Simulator.time.toFixed(2);
        document.getElementById('v-count').textContent = Simulator.electronCount;
        document.getElementById('v-hits').textContent = Simulator.hitCount;

        const aliveParticles = Simulator.particles.filter(p => p.alive);
        document.getElementById('v-alive').textContent = aliveParticles.length;
        if (aliveParticles.length > 0) {
            const last = aliveParticles[aliveParticles.length - 1];
            const spd = Math.sqrt(last.vx * last.vx + last.vy * last.vy + (last.vz || 0) * (last.vz || 0));
            document.getElementById('v-speed').textContent = spd.toFixed(3);
            document.getElementById('v-ke').textContent = (0.5 * spd * spd).toFixed(3);
        } else {
            document.getElementById('v-speed').textContent = '0';
            document.getElementById('v-ke').textContent = '0';
        }
    },

    buildProblemPanel(config) {
        const panel = document.getElementById('problem-panel');
        panel.innerHTML = `
            <h1>${config.title}</h1>
            <div class="source">${config.source}</div>
            <div class="problem-text">${config.description}</div>
            ${(config.formulas || []).map(f => '<div class="formula">' + f + '</div>').join('')}
            <div style="margin-top:12px;font-size:13px;font-weight:600;color:#00d4ff;">下列说法正确的是：</div>
            <div class="options-list">
                ${(config.options || []).map(o => `
                    <div class="option-item" data-option="${o.letter}">
                        <div class="opt-letter">${o.letter}</div>
                        <div class="opt-text">${o.text}</div>
                    </div>
                `).join('')}
            </div>
            <div class="answer-box" id="answer-box">
                <div style="font-size:14px;font-weight:600;color:#00ff88;margin-bottom:8px;">正确答案：${config.answer.correct.join('、')}</div>
                <div>${config.answer.explanation}</div>
            </div>
        `;
        panel.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                panel.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                App.demonstrateOption(item.dataset.option);
                App.showDerivStep(item.dataset.option);
            });
        });

        const given = config.given || {};
        const labels = {
            plateSeparation: '板间距', d: 'd', magneticField: 'B',
            electricField: 'E', initialVelocity: 'v₀', radius: 'R'
        };
        document.getElementById('param-box').innerHTML = Object.entries(given)
            .filter(([k]) => labels[k])
            .map(([k, v]) => '<div class="param-row"><span class="param-label">' + labels[k] + '</span><span class="param-val">' + (typeof v === 'number' ? v.toFixed(2) : v) + '</span></div>')
            .join('');
    },

    buildDerivPanel(problemId) {
        const panel = document.getElementById('deriv-panel');
        if (problemId === 'baiyin-sanmo-2025') {
            panel.innerHTML = `
                <div class="sec-title" style="color:#ffc800;border-bottom-color:rgba(255,200,0,0.3);">计算推导</div>
                <div class="deriv-tabs">
                    <button class="deriv-tab active" data-d="all">全部</button>
                    <button class="deriv-tab" data-d="A">A 半径</button>
                    <button class="deriv-tab" data-d="B">B 周期</button>
                    <button class="deriv-tab" data-d="C">C 区域</button>
                    <button class="deriv-tab" data-d="D">D 击中率</button>
                </div>
                <div class="deriv-step" data-s="A">
                    <div class="deriv-title"><div class="deriv-num">A</div>求轨迹半径 R</div>
                    <div class="deriv-line"><span class="note">洛伦兹力提供向心力：</span></div>
                    <div class="deriv-line"><span class="eq">ev₀B</span> = <span class="eq">mv₀²/R</span></div>
                    <div class="deriv-line">→ R = <span class="eq">mv₀/(eB)</span></div>
                    <div class="deriv-line"><span class="note">代入 B = mv₀/(2ed)：</span></div>
                    <div class="deriv-line">R = mv₀ / (e · <span class="eq">mv₀/(2ed)</span>)</div>
                    <div class="deriv-line">R = <span class="res">2d</span> ✓</div>
                    <div class="conclusion ok">✅ 选项A正确：R = 2d</div>
                </div>
                <div class="deriv-step" data-s="B">
                    <div class="deriv-title"><div class="deriv-num">B</div>求运动周期 T</div>
                    <div class="deriv-line">T = <span class="eq">2πR/v₀</span></div>
                    <div class="deriv-line">T = 2π · <span class="eq">2d</span> / v₀</div>
                    <div class="deriv-line">T = <span class="res">4πd/v₀</span></div>
                    <div class="deriv-line"><span class="note">选项B给出：</span> <span class="wrong">T = πd/v₀</span></div>
                    <div class="conclusion no">❌ 选项B错误：T = 4πd/v₀ ≠ πd/v₀</div>
                </div>
                <div class="deriv-step" data-s="C">
                    <div class="deriv-title"><div class="deriv-num">C</div>求击中区域总长度</div>
                    <div class="deriv-line"><span class="note">圆心坐标：(2d·sinθ, -2d·cosθ)</span></div>
                    <div class="deriv-line"><span class="note">打到右板(x=2d)：sinθ ≥ 0</span></div>
                    <div class="deriv-line">最低点 y = <span class="eq">-2d</span>（θ=0）</div>
                    <div class="deriv-line">最高点 y = <span class="eq">2√3·d</span></div>
                    <div class="deriv-line">右板长度 = <span class="eq">2(√3+1)d</span></div>
                    <div class="deriv-line"><span class="note">左板对称，总长度：</span></div>
                    <div class="deriv-line">L = 2 × 2(√3+1)d = <span class="res">4(√3+1)d</span></div>
                    <div class="conclusion ok">✅ 选项C正确</div>
                </div>
                <div class="deriv-step" data-s="D">
                    <div class="deriv-title"><div class="deriv-num">D</div>求击中率</div>
                    <div class="deriv-line"><span class="note">R = 2d = S到极板距离</span></div>
                    <div class="deriv-line">上半方向 → 右板</div>
                    <div class="deriv-line">下半方向 → 左板</div>
                    <div class="deriv-line">所有电子都打到极板</div>
                    <div class="deriv-line">击中率 = <span class="res">100%</span></div>
                    <div class="deriv-line"><span class="note">选项D给出：</span> <span class="wrong">50%</span></div>
                    <div class="conclusion no">❌ 选项D错误：击中率=100%</div>
                </div>
            `;
            panel.querySelectorAll('.deriv-tab').forEach(tab => {
                tab.addEventListener('click', () => App.showDeriv(tab.dataset.d));
            });
        } else {
            panel.innerHTML = '<div class="sec-title" style="color:#ffc800;">推导过程</div><div style="font-size:12px;color:rgba(255,255,255,0.5);">选择白银三模题目查看详细推导</div>';
        }
    }
};
