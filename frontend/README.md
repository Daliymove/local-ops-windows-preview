# 总控台前端 (Console Frontend - React + Vite + TypeScript)

总控台现代前端应用，基于 React 19、Vite、TypeScript 与 Tailwind CSS v4 构建。

## 技术栈与架构

- **核心框架**: React 19 + TypeScript
- **构建工具**: Vite 8 + `@vitejs/plugin-react`
- **样式与设计系统**: Tailwind CSS v4 + Ops 指挥台主题设计令牌（深浅色自适应）
- **图标系统**: `lucide-react`
- **模块分层**:
  - `src/types/` — 严谨的 TypeScript 类型契约（对齐后端 `/api/state` 及全量 API）
  - `src/services/` — `api.ts`（强类型 API 客户端、CSRF 防护、Keep-Alive/防抖处理）、`ports.ts`（端口归一化）
  - `src/hooks/` — `useConsoleState.ts`（2s 智能轮询、任务自然结束/主动取消多状态弹窗提示）、`useTheme.ts`（主题深浅色跟随与切换）、`useModal.ts`
  - `src/context/` — 全局弹窗与模态流（确认对话框、创建/编辑、日志抽屉、端口诊断、应用诊断、全局 Command/K 与 Toast）
  - `src/components/layout/` — `RailNav.tsx`（左侧导航轨）、`TopBar.tsx`（顶栏与快捷状态）、`Shell.tsx`（主布局框架）
  - `src/components/launchpad/` — `LaunchpadView.tsx`（应用卡片网格、类型/健康过滤、搜索、空态、诊断入口）、`AppCard.tsx`（卡片与启停操作）
  - `src/components/services/` — `ServicesView.tsx`（服务/后台进程双视图、新端口发现横幅、关注进程芯片）、`ServiceRow.tsx`
  - `src/components/widgets/` — 右侧信息栏（快捷操作、TOP5 占用、实时活动动态）
  - `src/components/overlays/` — `AppEditModal.tsx`（创建/编辑、工作区识别、端口/脚本选择）、`LogDrawer.tsx`（日志抽屉）、`CmdkModal.tsx`（快捷命令盘）、`ConfirmDialog.tsx`

## 开发与构建

### 1. 开发模式 (HMR)
```bash
cd frontend
npm install
npm run dev
```
开发服务器将启动在 `http://localhost:5173`，并通过 Vite Proxy 自动转发 `/api`、`/icons`、`/assets` 请求至 Python 后端（`http://127.0.0.1:9600`）。

### 2. 生产构建
```bash
npm run build
```
构建产物输出至 `frontend/dist`。Python 后端（`server.py`）运行时会自动检测并优先提供 `frontend/dist` 下的现代单页应用，无构建产物时无缝回退至 `static/` 原生前端。

