// OCR UI - 拍照解题弹窗交互逻辑
const OCRUI = (function () {
    'use strict';

    let currentFile = null;
    let currentBase64 = null;
    let recognizedData = null;

    function init() {
        const overlay = document.getElementById('ocr-overlay');
        const dropzone = document.getElementById('ocr-dropzone');
        const fileInput = document.getElementById('ocr-file-input');
        const preview = document.getElementById('ocr-preview');
        const previewImg = document.getElementById('ocr-preview-img');
        const previewInfo = document.getElementById('ocr-preview-info');
        const previewRemove = document.getElementById('ocr-preview-remove');
        const btnOCR = document.getElementById('ocr-recognize');
        const btnClose = document.getElementById('ocr-close');
        const btnNavOCR = document.getElementById('btn-ocr');
        const btnLoadSim = document.getElementById('ocr-load-sim');

        // 加载保存的配置
        const cfg = OCRService.getConfig();
        if (cfg.apiKey) document.getElementById('ocr-api-key').value = cfg.apiKey;
        if (cfg.baseUrl) document.getElementById('ocr-base-url').value = cfg.baseUrl;
        if (cfg.model) document.getElementById('ocr-model').value = cfg.model;

        // 打开/关闭弹窗
        btnNavOCR.addEventListener('click', () => {
            overlay.classList.add('visible');
        });
        btnClose.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // 拖拽上传
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });

        // 点击选择
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files[0]) handleFile(fileInput.files[0]);
        });

        // 移除图片
        previewRemove.addEventListener('click', () => {
            clearPreview();
        });

        // 识别按钮
        btnOCR.addEventListener('click', doRecognize);

        // 开始仿真按钮
        btnLoadSim.addEventListener('click', loadIntoSimulation);
    }

    function handleFile(file) {
        const preview = document.getElementById('ocr-preview');
        const previewImg = document.getElementById('ocr-preview-img');
        const previewInfo = document.getElementById('ocr-preview-info');
        const dropzone = document.getElementById('ocr-dropzone');
        const btnOCR = document.getElementById('ocr-recognize');

        OCRService.imageToBase64(file).then(base64 => {
            currentFile = file;
            currentBase64 = base64;
            previewImg.src = base64;
            const sizeKB = (file.size / 1024).toFixed(1);
            previewInfo.textContent = file.name + ' (' + sizeKB + ' KB)';
            preview.classList.add('visible');
            dropzone.style.display = 'none';
            btnOCR.disabled = false;
            hideStatus();
            hideResult();
        }).catch(err => {
            showStatus(err.message, 'error');
        });
    }

    function clearPreview() {
        currentFile = null;
        currentBase64 = null;
        document.getElementById('ocr-preview').classList.remove('visible');
        document.getElementById('ocr-dropzone').style.display = '';
        document.getElementById('ocr-file-input').value = '';
        document.getElementById('ocr-recognize').disabled = true;
        hideResult();
    }

    function closeModal() {
        document.getElementById('ocr-overlay').classList.remove('visible');
    }

    function showStatus(msg, type) {
        const el = document.getElementById('ocr-status');
        el.className = 'ocr-status visible ' + type;
        el.innerHTML = msg;
    }

    function hideStatus() {
        document.getElementById('ocr-status').className = 'ocr-status';
    }

    function showResult(data) {
        recognizedData = data;
        document.getElementById('ocr-result-title').textContent = data.title || '未命名题目';
        document.getElementById('ocr-result-desc').textContent = data.description || '';

        const optBox = document.getElementById('ocr-result-options');
        optBox.innerHTML = '';
        (data.options || []).forEach(o => {
            const div = document.createElement('div');
            div.className = 'ocr-result-opt';
            div.innerHTML = '<strong>' + o.letter + '.</strong> ' + (o.text || '');
            optBox.appendChild(div);
        });

        const ansBox = document.getElementById('ocr-result-answer');
        if (data.answer && data.answer.correct) {
            ansBox.innerHTML = '<strong>正确答案：</strong>' + data.answer.correct.join('、') +
                (data.answer.explanation ? '<br>' + data.answer.explanation : '');
        } else {
            ansBox.innerHTML = '<strong>答案：</strong>未能识别';
        }

        document.getElementById('ocr-result').classList.add('visible');
    }

    function hideResult() {
        recognizedData = null;
        document.getElementById('ocr-result').classList.remove('visible');
    }

    async function doRecognize() {
        if (!currentBase64) return;

        const apiKey = document.getElementById('ocr-api-key').value.trim();
        const baseUrl = document.getElementById('ocr-base-url').value.trim();
        const model = document.getElementById('ocr-model').value.trim();

        if (!apiKey) {
            showStatus('请先在 API 设置中填写 API Key', 'error');
            return;
        }

        // 保存配置
        OCRService.saveConfig({ apiKey, baseUrl, model });

        const btnOCR = document.getElementById('ocr-recognize');
        btnOCR.disabled = true;
        showStatus('<span class="ocr-spinner"></span> 正在识别中，请稍候...', 'info');
        hideResult();

        try {
            const result = await OCRService.recognizeProblem(currentBase64, apiKey, baseUrl, model);
            showStatus('识别完成！请检查结果后点击「开始仿真」', 'success');
            showResult(result);
        } catch (err) {
            showStatus(err.message, 'error');
        } finally {
            btnOCR.disabled = false;
        }
    }

    function loadIntoSimulation() {
        if (!recognizedData) return;

        // 注册为新题目
        const id = 'ocr-' + Date.now();
        const problemConfig = {
            id: id,
            title: recognizedData.title || 'AI识别题目',
            source: recognizedData.source || 'AI 识别',
            type: 'electromagnetic',
            description: recognizedData.description || '',
            formulas: recognizedData.formulas || [],
            given: recognizedData.given || {},
            options: (recognizedData.options || []).map(o => ({
                letter: o.letter,
                text: o.text || '',
                correct: null,
                verification: null
            })),
            answer: recognizedData.answer || { correct: [], explanation: '' },
            sceneTemplate: recognizedData.sceneTemplate || null
        };

        const pc = PhysVis.ProblemRegistry.register(problemConfig);

        // 重新构建 tabs
        UIManager.buildTabs(PhysVis.ProblemRegistry.list());

        // 加载新题目
        App.loadProblem(pc.id);

        closeModal();
    }

    return { init };
})();
