# 前端架构重构实施方案：React 19 + TypeScript + Vite + Tailwind CSS v4

本文档为总控台（Local Ops Console）前端现代化的顶层设计与技术规划方案。

---

## 1. 现状痛点与重构动因

原版前端采用无构建的原生 ES Modules + 手动 DOM 拼接技术：
- **手动 DOM 对账复杂度高**：随着启动台卡片、火花线、端口对账、诊断等交互增加，手动创建与替换 DOM 极易产生边界缺陷或偶发闪烁；
- **缺乏静态类型检查**：后端返回庞大的嵌套状态对象（`/api/state`），原生 JS 缺乏类型契约，字段重命名或可选字段未判空时排查困难；
- **状态与 UI 高度耦合**：轮询计时器、Toast 调度、模态框状态分散在多个全局函数与 DOM 事件中，缺少统一的状态流管线；
- **样式扩展受限**：纯手写 CSS 变量与多类名组合繁琐，缺乏现代化原子 CSS 工具的自动清理与一致性约束。

---

## 2. 方案技术选型

| 维度 | 原方案 | 新方案 | 选型考量 |
| :--- | :--- | :--- | :--- |
| **视图框架** | 原生 DOM 拼接 | **React 19** | 纯函数组件声明式渲染、自动 DOM Diff 避免闪烁、强大的生态系统 |
| **类型系统** | JSDoc 注释 (弱校验) | **TypeScript 5.x** | 严格类型检查，与 Python 后端数据结构 100% 对齐 |
| **构建体系** | 无构建 | **Vite 8** | 毫秒级冷启动与 HMR 热重载，生产包极速打包压缩 |
| **样式系统** | 原生 CSS 变量拼接 | **Tailwind CSS v4** | 原子化样式，零运行时开销，统一 Ops 指挥台设计令牌 |
| **图标库** | Python 离线导出的 JS 字典 | **`lucide-react`** | 按需加载，零维护成本，图标语义清晰 |
| **后端集成** | 纯静态托管 | **双模智能兼容** | 优先托管 `frontend/dist`；未构建时无缝回退至 `static/` |

---

## 3. 架构分层与目录规划

在项目根目录下新建 `frontend/` 目录：

```
frontend/
├── package.json
├── vite.config.ts           # 开发反向代理配置与生产构建配置
├── tsconfig.json            # 严格模式 TS 配置
├── index.html               # 挂载根节点与字体预加载
└── src/
    ├── types/
    │   └── console.ts       # 全量数据模型与 API 响应接口定义
    ├── services/
    │   ├── api.ts           # 强类型 HTTP 请求封装、CSRF 与防抖
    │   └── ports.ts         # 端口归一化纯函数算法
    ├── hooks/
    │   ├── useConsoleState.ts # 核心轮询 Hook (状态缓存、代际保护、完成通知)
    │   ├── useTheme.ts      # 主题切换 (跟随系统 / 浅色 / 深色)
    │   └── useModal.ts      # 模态弹窗与 Toast 调度
    ├── context/
    │   └── ModalContext.tsx # 全局浮层与命令面板上下文
    ├── components/
    │   ├── layout/
    │   │   ├── Shell.tsx    # 双栏响应式骨架
    │   │   ├── RailNav.tsx  # 左侧导航轨
    │   │   └── TopBar.tsx   # 顶栏快捷操作区
    │   ├── launchpad/
    │   │   ├── LaunchpadView.tsx # 启动台卡片网格与 KPI
    │   │   ├── AppCard.tsx  # 单应用卡片 (启停、状态流转、诊断操作)
    │   │   ├── AppDiagnosticModal.tsx # 运行诊断弹窗
    │   │   └── PortDiagnosticModal.tsx # 端口认领弹窗
    │   ├── services/
    │   │   ├── ServicesView.tsx # 服务与后台监控双视图
    │   │   ├── ServiceRow.tsx   # 服务数据行与进程溯源 Badge
    │   │   ├── PortDiscoveryBanner.tsx # 未管理新端口发现横幅
    │   │   └── WatchChips.tsx   # 关注关键字
    │   ├── widgets/
    │   │   ├── RightSidebar.tsx # 侧边信息栏容器
    │   │   ├── ActivityFeed.tsx # 实时动态与告警流
    │   │   ├── TopResources.tsx # 资源消耗排行榜
    │   │   └── QuickActions.tsx # 常用快捷操作
    │   └── overlays/
    │       ├── AppEditModal.tsx # 应用新增/编辑抽屉 (集成项目自动识别)
    │       ├── LogDrawer.tsx    # 实时日志滚动查看器
    │       ├── CmdkModal.tsx    # 全局 ⌘K 命令面板
    │       └── ConfirmDialog.tsx# 危险操作二次确认
    └── styles/
        ├── globals.css      # Tailwind v4 引入与基础样式
        └── themes.css       # Ops 指挥台主题色变量
```

---

## 4. 关键交互与数据流设计

### 4.1 代际保护与状态对账 (`mutationEpoch`)
为了解决用户在点击「启动/停止」后，如果恰好收到上一轮 2 秒轮询的旧数据导致卡片状态“先变回来再变过去”的闪烁问题：
- 本地维护递增的 `mutationEpoch`；
- 发起任何启停或编辑变更时，`mutationEpoch` 递增，并立即更新本地乐观状态；
- 后续到达的 `/api/state` 响应如果早于本次操作发起时间，直接丢弃，杜绝状态回跳。

### 4.2 任务退出通知协议
- 后台轮询检测到任务 `kind === "task"` 状态从运行中切换为已退出；
- 检查 `lastExit` 结构：
  - `status === "succeeded"`: 触发绿色成功 Toast（展示运行耗时）；
  - `status === "canceled"`: 触发黄色已取消 Toast；
  - `status === "failed"`: 触发红色失败 Toast 并提供一键查看日志入口；
  - `status === "stopped"`: 触发灰色已中止通知。

### 4.3 智能项目识别集成
- 在新增/编辑弹窗中选择工作目录后，自动触发 `/api/project/detect`；
- 解析并渲染候选启动命令（Node/npm、Hexo、FastAPI、Docker 等）；
- 用户点击候选后自动填充命令、端口及服务类型，减少手动输入错误。

---

## 5. 后端与构建管线适配

### 5.1 后端双模伺服 (`server.py`)
```python
DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")
STATIC_DIR = DIST_DIR if os.path.isdir(DIST_DIR) else os.path.join(BASE_DIR, "static")
```
- 后端无需配置编译工具链；
- 开发模式下，Vite 前端代理请求到 Python 端口；
- 发布模式下，直接输出至 `frontend/dist`，Python 无缝托管。

### 5.2 Windows 单窗口启动调度 (`start.ps1`)
- 增量检查 `frontend/src`、`package.json` 与 `frontend/dist` 的时间戳；
- 源码更新时自动调用 `npm run build`，并在同一终端启动 Python 后端，兼顾便捷与性能。
