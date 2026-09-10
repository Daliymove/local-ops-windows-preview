# 总控台 Windows 运行与实战指南

本文档专门介绍在 **Windows 10 / 11 (64位)** 环境下运行、调试、管理和配置总控台（Local Ops Console）的完整指引与技术内幕。

---

## 1. 环境准备

* **操作系统**: Windows 10 (1809+) 或 Windows 11 (推荐，64 位)
* **Python 运行时**: Python 3.12 或更高版本（系统已安装 `python` 或 Python 启动器 `py -3`）
* **依赖说明**: **零第三方包依赖**。后端核心仅依赖 Python 3 标准库；前端发布产物已内置于工程中（若需二次开发前端，需安装 Node.js 18+ 与 npm）。

---

## 2. 启动方式全览

总控台在 Windows 提供了多种启动方式，满足日常使用、命令行操作及二次开发等不同场景：

| 启动方式 | 操作指令 / 入口 | 适用场景 | 窗口状态 | 输出日志路径 |
| :--- | :--- | :--- | :--- | :--- |
| **原生快捷方式 (推荐)** | 双击根目录 **`总控台.lnk`** | **日常高频使用** | **完全零黑框**（无 CMD/终端窗口） | `%LOCALAPPDATA%\总控台\Logs\console.log` |
| **命令行后台启动** | `start.cmd /b` | 终端/脚本集成 | 启动后立即释放当前终端 | `%LOCALAPPDATA%\总控台\Logs\console.log` |
| **前台交互式启动** | 双击 `start.cmd` 或 `start.bat` | 快速排错、查看实时日志 | 保持当前 CMD 窗口，`Ctrl+C` 退出 | CMD 终端实时滚动 + 文件日志 |
| **极速前端开发模式** | `start.cmd -Dev` | 前端组件与样式热重载调试 | 单窗口同时运行 Vite HMR 与 Python | CMD 终端实时热重载日志 |

> 💡 **小贴士**：你可以将根目录下的 **`总控台.lnk`** 直接「复制到桌面」或「固定到开始屏幕 / 任务栏」，开箱即用，带有官方 Ops 指挥台品牌图标。

---

## 3. 服务的停止与重启

### 3.1 停止总控台
1. **一键停止脚本**：双击根目录下的 **`stop.cmd`**（或 `stop.bat`），底层通过 `start.ps1 -Stop` 调用 `server.py --stop`，向后台总控台发送退出信号。
2. **Web 页面一键停止**：在浏览器总控台界面顶栏，点击右上角设置/电源菜单中的 **「停止控制台」**。
3. **命令行执行**：在任意终端运行：
   ```cmd
   py -3 server.py --stop
   ```

### 3.2 重启总控台
在 Web 界面顶栏点击 **「重启 :9600」** 按钮，系统会派生独立的后台 Helper 进程，等待旧进程释放端口后优雅复用原端口重新拉起总控台。

> ⚠️ **重要保证**：停止或重启总控台自身，**绝对不会中断**在启动台中已经启动的用户项目服务！它们运行在独立的受控子进程树中，生命周期与总控台解耦。

---

## 4. Windows 底层关键设计与技术突破

为了让 Windows 体验对齐 macOS 下的无缝后台体验，本项目针对 Windows 底层特性进行了多项关键加固：

### 4.1 彻底根除 CMD 黑色弹窗闪烁
在 Windows 下，若使用常规 `subprocess.run` 或 `Popen` 调用系统命令行工具（如 `netstat`、`taskkill`、PowerShell 查询等），Windows 默认会为子进程弹出短暂黑框（尤其在每 2 秒一次的轮询刷新中会导致桌面持续闪烁黑框）。

总控台在 `server.py` 与 `tools/win_anchor.py` 中实现了严格的无窗口进程创建策略：
```python
def _win_subprocess_kwargs():
    kwargs = {}
    if IS_WIN:
        # 0x08000000 = CREATE_NO_WINDOW
        kwargs["creationflags"] = 0x08000000
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 0  # SW_HIDE
        kwargs["startupinfo"] = si
    return kwargs
```
所有底层端口扫描、状态探测、健康诊断和脚本执行均全量注入此参数，确保后台静默运行时不会出现任何闪烁弹窗。

### 4.2 受控进程树与锚点模型 (`tools/win_anchor.py`)
Windows 内核没有 POSIX 进程组（Process Group）与 `killpg` 概念。为了精确追踪、控制和终止由用户命令派生的整棵子进程树，总控台设计了轻量锚点架构：
1. **生成随机 Token**：每次启动应用时生成唯一安全标识；
2. **启动锚点进程**：以 `tools/win_anchor.py --token <TOKEN>` 作为父进程，将用户命令写入临时脚本并执行；
3. **PPID 后代树追踪**：通过 `Win32_Process` 的 `ParentProcessId` 递归捕获该锚点派生的所有子孙进程；
4. **安全级联终止**：停止应用时，先执行 `taskkill /T` 优雅终止整个进程树；若有残留则自动升级为 `taskkill /T /F`，杜绝孤儿进程占用端口。

### 4.3 单窗口调度器与自动增量对账 (`start.ps1`)
`start.ps1` 是 Windows 环境的单一真实源调度中心：
1. **Python 解析与路径空格防护**：针对含空格路径（如 `D:\AI Coding\...`）进行严格单引号安全包裹，避免 Windows 命令解析异常进入交互式 REPL；
2. **源码变动自对账**：启动前毫秒级对比 `frontend/src`、`package.json`、`index.html` 的最新修改时间与 `frontend/dist/index.html`。若检测到源码更新或产物缺失，自动静默执行 `npm run build`，确保用户始终看到最新界面。

---

## 5. 数据存储与目录规范

所有用户数据均存放在 Windows 标准应用数据路径下，与项目源码目录完全解耦：

| 数据类别 | 绝对路径 | 权限说明 |
| :--- | :--- | :--- |
| **配置文件与图标** | `%APPDATA%\总控台\`<br>(如 `C:\Users\<用户名>\AppData\Roaming\总控台\`) | 存放 `config.json` 与用户上传的应用图标 `icons/` |
| **备份配置文件** | `%APPDATA%\总控台\config.json.bak` | 保存上一份正常运行的配置快照，防意外断电损坏 |
| **运行时日志** | `%LOCALAPPDATA%\总控台\Logs\`<br>(如 `C:\Users\<用户名>\AppData\Local\总控台\Logs\`) | `console.log` 记录总控台自身日志，`{appId}.log` 记录应用日志 |

> 日志文件单文件超过 10MB 时会自动 copy-truncate 轮转，并最多保留 3 份历史归档。
