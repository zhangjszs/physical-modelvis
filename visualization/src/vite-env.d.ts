/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** OCR 代理地址 (缺省 http://localhost:3001), 非本机部署时构建注入 (#74) */
    readonly VITE_OCR_PROXY_URL?: string;
}
