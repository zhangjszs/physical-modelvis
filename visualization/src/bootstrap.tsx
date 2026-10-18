/**
 * 应用主挂载入口 (#140)。
 *
 * 由 main.tsx 动态 import() 加载，解耦静态入口与 React 核心生态，
 * 确保首屏 bundle ≤70kB，为 React 19 升级保留预算空间。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
