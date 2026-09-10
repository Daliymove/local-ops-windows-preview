# 总控台 (Console) 项目文档中心

本文档中心汇集了总控台在架构设计、平台适配（尤其是 Windows 10/11）、前端现代化重构以及核心 API 契约方面的技术文档与使用指南。

---

## 📚 文档目录索引

### 1. 核心架构与设计
* [**系统架构与设计全景 (`ARCHITECTURE.md`)**](./ARCHITECTURE.md)  
  深入解析 Python 3.12 单文件无依赖后端、双轨前端服务机制、受控进程身份模型（Token + 进程组/锚点）、进程溯源（AI 助手/编辑器识别）与安全边界。

### 2. 平台专属指南
* [**Windows 运行与使用指南 (`WINDOWS_GUIDE.md`)**](./WINDOWS_GUIDE.md)  
  Windows 10/11 环境下的完整实战指南：涵盖原生快捷方式静默启动（`总控台.lnk`）、命令行后台与前台启动、优雅停止（`stop.cmd`）、CMD 黑色弹窗根除原理（`CREATE_NO_WINDOW`）、`win_anchor.py` 进程树管理与路径空格防护。

### 3. 前端工程与重构
* [**前端重构方案 (`FRONTEND_REFACTOR_PLAN.md`)**](./FRONTEND_REFACTOR_PLAN.md)  
  记录从原生无框架 JavaScript/HTML 迁移至 **React 19 + TypeScript + Vite + Tailwind CSS v4** 的顶层架构方案与模块设计。
* [**前端重构与验收总结 (`FRONTEND_REFACTOR_WALKTHROUGH.md`)**](./FRONTEND_REFACTOR_WALKTHROUGH.md)  
  前端重构验收交付报告：核心模块分层、组件树清单、构建与自动化测试验证、双模热更新开发说明。
* [**前端独立说明文档 (`../frontend/README.md`)**](../frontend/README.md)  
  面向前端开发者的快速上手指南：依赖安装、本地 HMR 调试（`npm run dev`）、生产打包（`npm run build`）。

### 4. 界面截图与资产
* [**界面预览 (`screenshots/`)**](./screenshots/)  
  包含 Ops 指挥台风格的启动台与服务监控界面高清预览。

---

## 🗂️ 根目录关键规范索引

| 文件 | 说明 |
| :--- | :--- |
| [**`README.md`**](../README.md) | 项目总入口：快速上手、功能特性概览、基本配置与社区维护说明。 |
| [**`AGENTS.md`**](../AGENTS.md) | 总控台规范总则：API 契约清单、进程生命周期状态机、跨平台适配底层要求。 |
| [**`CHANGELOG.md`**](../CHANGELOG.md) | 变更记录（Keep a Changelog 规范）：每次迭代的功能更新、修复与破坏性调整。 |
| [**`CONTRIBUTING.md`**](../CONTRIBUTING.md) | 社区贡献准则、安全边界与代码审查规范。 |
| [**`SECURITY.md`**](../SECURITY.md) | 安全威胁模型、回环绑定策略与漏洞报告指引。 |
| [**`RELEASE_CHECKLIST.md`**](../RELEASE_CHECKLIST.md) | 版本发布前的人工验收清单与质量核对流程。 |
