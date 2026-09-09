# 前端重构：迁移至 React + Vite + TypeScript 实施规划

本方案对应**重构方案 C（彻底现代化重写）的第一阶段**：保持现有 Python 后端 API 契约完全不变的前提下，新起独立分支，将原由纯 HTML/JS 编写的前端完整重构成现代化 **React 19 + Vite + TypeScript + Tailwind CSS** 单页面应用（SPA）。

---

## User Review Required

> [!IMPORTANT]
> **开发模式与生产分发策略**：
> 1. **代码存放位置**：将在根目录下新建 `frontend/` 目录存放完整的 React + Vite 源码，避免污染原有根目录。
> 2. **开发体验**：开发时启动 Vite 开发服务器（`npm run dev`，默认 `http://localhost:5173`），Vite 自动将 `/api/*`、`/icons/*`、`/assets/*` 代理到 Python 后端（`http://127.0.0.1:9600`），享受毫秒级热更新（HMR）。
> 3. **生产托管方案**：Vite 构建产物（`npm run build`）将直接输出到可配置目录（如 `static-dist/` 或直接替换 `static/`）。我们会在 `server.py` 中做无破坏性的轻量适配：优先托管 `frontend/dist`，不存在时回退托管旧 `static/`。这样原有的 `start.bat` / `python server.py` 直接双击依然可以运行编译后的 React 版本！
> 4. **Git 分支策略**：从当前 `main` 分支切出新分支 `refactor/react-vite-frontend` 进行所有开发与验证。

---

## Open Questions

> [!NOTE]
> 1. **UI 视觉风格偏好**：原版使用的是单一深色/浅色切换的「Ops 指挥台（深空蓝黑 + 细边框 + 蓝色强调 + 数据等宽字体）」。在 React 版本中，建议沿用并提炼升级为 Tailwind CSS 现代化设计系统（配备玻璃拟态/平滑过渡动效）。你是否有其他喜欢的 UI 风格（例如纯极简极客风、Mac 原生原生质感、或更贴近 Linear/Vercel 的界面风格）？
> 2. **包管理器**：当前机器已安装 Node.js v24 和 npm 11。你希望直接使用 `npm` 还是 `pnpm` / `bun` 来安装前端依赖？

---

## 现状与目标对比

| 维度 | 现存前端 (Vanilla ES Modules) | 新前端 (React + Vite + TS) |
| :--- | :--- | :--- |
| **框架与语言** | 纯 HTML + ES 原生 JS (无类型检查) | React 19 + TypeScript + Vite |
| **样式体系** | 单一 850 行 `base.css` + `ops.css` | Tailwind CSS + CSS Modules / 语义化 Design Tokens |
| **图标方案** | 编译出的 `icons.js` (56 个硬编码 SVG 字符串) | `lucide-react` 官方标准组件库 |
| **DOM 渲染** | 手写 `el()`、手工 Virtual DOM `reconcile()` 调和 | React 虚拟 DOM 声明式渲染，高性能高效 Diff |
| **弹窗与浮层** | `index.html` 堆叠 600 行隐藏 DOM + 手工事件监听 | 现代化组件化 Dialog/Drawer（结合 React Portal 与原生 `<dialog>` 标准） |
| **状态流转** | 全局对象 `state.data` + `window.__poll` 跨文件穿透 | 响应式状态流（自定义 Hook `useConsoleState` / 轻量 Store） |
| **开发体验** | 每次修改需要手动刷新浏览器 | Vite 毫秒级 HMR 热更新 |

---

## 模块架构与工程结构

在 `frontend/` 下建立清晰规范的模块结构：

```text
frontend/
├── index.html                   # 极简 HTML 入口（包含品牌图标与字体预载）
├── package.json                 # 依赖声明与构建脚本
├── tsconfig.json                # TypeScript 严谨配置
├── vite.config.ts               # Vite 配置（API 反向代理、产物输出）
├── src/
│   ├── main.tsx                 # React 挂载入口
│   ├── App.tsx                  # 根组件（视图切换、全局浮层挂载、全局快捷键）
│   ├── types/                   # 强类型定义
│   │   ├── console.ts           # AppItem, ServiceItem, Health, StateSnapshot 等
│   │   └── api.ts               # API 请求与响应类型定义
│   ├── services/                # API 客户端层
│   │   ├── api.ts               # 封装 fetch，统一错误处理与超时控制
│   │   └── ports.ts             # 端口归一化纯函数（从 ports.js 强类型移植）
│   ├── hooks/                   # 核心自定义 Hook
│   │   ├── useConsoleState.ts   # 核心 2s 轮询逻辑、防旧快照闪回 (mutationEpoch)、断连重连检测
│   │   ├── useTheme.ts          # 深浅色切换与持久化
│   │   └── useKeyboardShortcuts.ts # ⌘K 命令面板、⌘J 日志中心等全局快捷键监听
│   ├── context/                 # 全局上下文
│   │   └── ModalContext.tsx     # 弹窗/抽屉/确认框统一调度控制
│   ├── components/
│   │   ├── layout/              # 布局组件
│   │   │   ├── Shell.tsx        # 主框架双栏/三栏网格
│   │   │   ├── RailNav.tsx      # 左侧图标导航轨（启动台/服务监控/日志/设置）
│   │   │   └── TopBar.tsx       # 顶栏（品牌标识、视图切换、Console 重启/停止、主题）
│   │   ├── launchpad/           # 启动台核心组件
│   │   │   ├── LaunchpadView.tsx # 启动台主容器、KPI 指标、分区过滤
│   │   │   ├── AppCard.tsx      # 服务/任务通用卡片（启停、状态、图标、动态光晕、操作栏）
│   │   │   ├── AppDiagnosticModal.tsx # 启动与健康诊断弹窗
│   │   │   └── PortDiagnosticModal.tsx # 端口冲突与认领弹窗
│   │   ├── services/            # 服务监控核心组件
│   │   │   ├── ServicesView.tsx # 服务监控主容器、KPI 指标卡片
│   │   │   ├── ServiceTable.tsx # 监听端口表格（排序、搜索、折叠分区）
│   │   │   ├── ServiceRow.tsx   # 服务数据行（来源标签、PID、CPU/内存、操作）
│   │   │   ├── PortDiscoveryBanner.tsx # 新端口发现提醒横幅
│   │   │   └── WatchChips.tsx   # 关注进程关键字管理
│   │   ├── widgets/             # 右侧信息边栏
│   │   │   ├── RightSidebar.tsx # 侧边栏容器
│   │   │   ├── ActivityFeed.tsx # 实时动态与告警事件流
│   │   │   ├── TopResources.tsx # 端口/资源 TOP 5
│   │   │   └── QuickActions.tsx # 常用快捷操作小组件
│   │   └── overlays/            # 模态弹窗与抽屉组件
│   │       ├── AppEditModal.tsx # 添加/编辑应用弹窗（项目探测选择、脚本选择、图标选取）
│   │       ├── LogDrawer.tsx    # 日志抽屉（支持实时轮询 tail 与自动滚屏）
│   │       ├── ConfirmDialog.tsx# 危险操作确认对话框（结束进程/删除应用）
│   │       ├── CmdkModal.tsx    # 全局快捷命令面板（⌘K 搜索与键盘操作）
│   │       └── SettingsModal.tsx# 设置中心弹窗
│   └── styles/
│       ├── globals.css          # 全局基础样式、Tailwind 导入、色彩变量
│       └── themes.css           # Ops 指挥台主题色彩令牌
```

---

## Proposed Changes

### 1. Git 分支创建
- 新建分支：`git checkout -b refactor/react-vite-frontend`

### 2. 前端工程初始化
#### [NEW] [package.json](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/package.json)
- 安装生产依赖：`react`, `react-dom`, `lucide-react`, `clsx`, `tailwind-merge`
- 安装开发依赖：`vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss`

#### [NEW] [vite.config.ts](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/vite.config.ts)
- 配置代理：
  - `/api` -> `http://127.0.0.1:9600`
  - `/icons` -> `http://127.0.0.1:9600`
  - `/assets` -> `http://127.0.0.1:9600`
- 配置编译输出路径到 `../static-dist` 或 `../static`。

### 3. 类型定义与网络交互层
#### [NEW] [types/console.ts](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/types/console.ts)
- 定义严谨的 TypeScript 接口：`AppItem`, `ServiceItem`, `ProcessOrigin`, `LastExit`, `HealthIssue`, `StateResponse` 等。
#### [NEW] [services/api.ts](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/services/api.ts)
- 完整移植原有的 REST API 请求逻辑（包含超时中断、401/403 本地回环防护、JSON 异常捕获）。
#### [NEW] [services/ports.ts](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/services/ports.ts)
- 迁移 `static/js/ports.js` 现有的全部归一化纯函数，保持行为 100% 相同。

### 4. 核心状态轮询与响应式模型
#### [NEW] [hooks/useConsoleState.ts](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/hooks/useConsoleState.ts)
- 迁移原版 `window.__poll` 逻辑：
  - 每 2 秒定时请求 `/api/state`；
  - 代际检查（`mutationEpoch`）：当用户执行启停操作后，自动丢弃较早发出的旧快照，防止状态闪回；
  - 任务完成系统通知触发；
  - 页面失焦与重连处理；
  - 提供即时刷新函数 `triggerPoll()`。

### 5. UI 组件迁移与重构
#### [NEW] [components/layout/Shell.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/layout/Shell.tsx)
- 实现响应式左右分栏与左侧图标导航轨。
#### [NEW] [components/launchpad/LaunchpadView.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/launchpad/LaunchpadView.tsx)
- 启动台服务/任务分区渲染、KPI 指标统计、卡片列表。
#### [NEW] [components/launchpad/AppCard.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/launchpad/AppCard.tsx)
- 替换原来手动 DOM 拼接的 `createAppCard()`，声明式编写卡片结构、图标回退（图片 -> Glyph -> 首字母）、动态边缘发光色计算。
#### [NEW] [components/services/ServicesView.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/services/ServicesView.tsx)
- 服务表格、进程来源识别勋章（Cursor/VS Code/AI/Terminal）、一键终止/置顶/隐藏。
#### [NEW] [components/overlays/AppEditModal.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/overlays/AppEditModal.tsx)
- 弹窗添加/编辑应用：目录选择、脚本探测选择、图标与 Glyph 选取。
#### [NEW] [components/overlays/LogDrawer.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/overlays/LogDrawer.tsx)
- 日志抽屉组件，支持 tail 自动刷新和清爽代码显示。
#### [NEW] [components/overlays/CmdkModal.tsx](file:///d:/AI%20Coding/local-ops-windows-preview/frontend/src/components/overlays/CmdkModal.tsx)
- ⌘K 命令面板，全局键盘快捷导航。

### 6. 后端服务兼容适配
#### [MODIFY] [server.py](file:///d:/AI%20Coding/local-ops-windows-preview/server.py)
- 轻量支持前端构建目录：
  ```python
  DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
  STATIC_DIR = DIST_DIR if os.path.isdir(DIST_DIR) else os.path.join(BASE_DIR, "static")
  ```
- 这样开发阶段可以使用 Vite 开发调试，执行 `npm run build` 后 Python 后端自动无缝托管新的 React 产物，原有原版用户和机制丝毫不受影响。

---

## Verification Plan

### 1. 自动化验证
- **TypeScript 编译**：在 `frontend/` 下运行 `npm run build`，确保无任何类型错误（0 TS errors）。
- **静态代码检查**：确保所有组件符合现代 React 最佳实践与可访问性规范。

### 2. 手工全功能回归测试
1. **启动双服务验证**：
   - 终端 1 启动后端：`python server.py --no-browser`
   - 终端 2 启动前端：`cd frontend && npm run dev`
2. **启动台功能验收**：
   - 查看现有配置的应用卡片能否正常展示、状态是否同步；
   - 测试服务的「启动」、「停止」、「重启」与状态实时流转；
   - 测试批处理任务的「运行」与「中止」，观察退出码通知与耗时展示；
   - 测试「+ 添加服务」：选择工作区目录 -> 触发 `/api/project/detect` -> 点选候选命令 -> 保存生效；
   - 测试「编辑服务」与「删除服务」；
3. **服务监控功能验收**：
   - 检查本机监听端口是否完整呈现，PID、CPU%、内存占用是否实时刷新；
   - 检查启动者溯源（AI 助手/VS Code/终端等）；
   - 测试「结束进程」确认框；
   - 测试未管理端口发现并「加入启动台」；
4. **辅助功能验收**：
   - ⌘K 命令面板唤起与键盘操作；
   - 日志抽屉实时滚屏；
   - 深浅色切换；
   - 模拟断开后端连接，检查断连横幅与恢复重连表现；
5. **生产打包构建验证**：
   - 运行 `npm run build` 生成 `frontend/dist`；
   - 直接运行 `python server.py`（不启动 Vite），访问 `http://127.0.0.1:9600`，确认直接输出编译后的 React 应用且功能完全正常。
