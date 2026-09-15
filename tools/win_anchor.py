#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Windows 受控进程锚点（总控台专用，仅 Windows 使用）。

由 server.py 的 _start_app_windows 拉起：argv[1] 是本次启动的随机标记
（console-run:<token>），argv[2] 是用户在启动台保存的命令字符串。

行为等价于 macOS 端的外层 bash 包装：
1. 把用户命令写入临时 .cmd 批处理文件，再以 ``cmd /d /c`` 执行
   （cmd 对含引号命令行的解析规则与 POSIX 完全不同，批处理文件是
   唯一能原样执行任意命令的稳妥通道）；文件以系统区域编码写入，
   与 cmd 的解析一致；
2. 直接子进程退出后继续等到整棵进程树清空再退出（对应 bash 的 ``wait``），
   因此“脚本把服务放后台后自己退出”的场景下锚点仍是受控身份锚；
3. 以直接子进程的退出码退出，供总控台记录任务成功/失败。

总控台自身重启不影响本锚点：锚点独立存活，受控身份由命令行标记 +
PPID 后代树识别（Windows 子进程在父进程退出后仍保留原 PPID）。
"""

import json
import locale
import os
import subprocess
import sys
import tempfile
import time

CREATE_NO_WINDOW = 0x08000000
POLL_SEC = 2.0


def _batch_file(command):
    """写入临时 .cmd 文件，返回其路径。调用方负责删除。"""
    encoding = locale.getpreferredencoding(False) or "utf-8"
    fd, path = tempfile.mkstemp(prefix="console-", suffix=".cmd")
    with os.fdopen(fd, "w", encoding=encoding, errors="replace",
                   newline="\r\n") as f:
        f.write("@echo off\r\n")
        f.write(command + "\r\n")
        f.write("exit /b %errorlevel%\r\n")
    return path


def _win_anchor_startupinfo():
    try:
        si = subprocess.STARTUPINFO()
        si.dwFlags |= getattr(subprocess, "STARTF_USESHOWWINDOW", 0x00000001)
        si.wShowWindow = 0
        return si
    except Exception:
        return None


_ctrl_handler_ref = None


def _register_shutdown_handler():
    """注册 Win32 关机注销处理器，关机时平滑退出，不残留任何进程。"""
    try:
        import ctypes
        from ctypes import wintypes

        def _ctrl_handler(ctrl_type: int) -> bool:
            if ctrl_type in (5, 6):
                os._exit(0)
            return False

        handler_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.DWORD)
        global _ctrl_handler_ref
        _ctrl_handler_ref = handler_type(_ctrl_handler)
        ctypes.windll.kernel32.SetConsoleCtrlHandler(_ctrl_handler_ref, True)
    except Exception:
        pass


def _live_descendants(root_pid):
    """root 是否有存活后代（含隔代；父进程已退出的孤儿仍按 PPID 命中）。
    使用 Win32 CreateToolhelp32Snapshot 原生快照，耗时 < 1ms，完全无需拉起 powershell.exe。
    """
    try:
        import ctypes
        from ctypes import wintypes

        class PROCESSENTRY32(ctypes.Structure):
            _fields_ = [
                ("dwSize", wintypes.DWORD),
                ("cntUsage", wintypes.DWORD),
                ("th32ProcessID", wintypes.DWORD),
                ("th32DefaultHeapID", ctypes.c_size_t),
                ("th32ModuleID", wintypes.DWORD),
                ("cntThreads", wintypes.DWORD),
                ("th32ParentProcessID", wintypes.DWORD),
                ("pcPriClassBase", wintypes.LONG),
                ("dwFlags", wintypes.DWORD),
                ("szExeFile", ctypes.c_char * 260),
            ]

        hSnapshot = ctypes.windll.kernel32.CreateToolhelp32Snapshot(0x00000002, 0)
        if hSnapshot in (wintypes.HANDLE(-1).value, -1):
            return True
        entry = PROCESSENTRY32()
        entry.dwSize = ctypes.sizeof(PROCESSENTRY32)
        children = {}
        if ctypes.windll.kernel32.Process32First(hSnapshot, ctypes.byref(entry)):
            while True:
                pid = entry.th32ProcessID
                ppid = entry.th32ParentProcessID
                if pid > 0 and ppid > 0:
                    children.setdefault(ppid, []).append(pid)
                if not ctypes.windll.kernel32.Process32Next(hSnapshot, ctypes.byref(entry)):
                    break
        ctypes.windll.kernel32.CloseHandle(hSnapshot)
        stack = list(children.get(root_pid, []))
        seen = set()
        while stack:
            pid = stack.pop()
            if pid in seen:
                continue
            seen.add(pid)
            stack.extend(children.get(pid, []))
            return True
        return False
    except Exception:
        return True


def main():
    _register_shutdown_handler()
    if len(sys.argv) < 3:
        return 1
    _marker, command = sys.argv[1], sys.argv[2]
    batch = _batch_file(command)
    try:
        proc = subprocess.Popen(
            ["cmd", "/d", "/c", batch],
            creationflags=CREATE_NO_WINDOW,
            startupinfo=_win_anchor_startupinfo())
    except OSError:
        return 1
    try:
        code = proc.wait()
        try:
            while _live_descendants(proc.pid):
                time.sleep(POLL_SEC)
        except KeyboardInterrupt:
            pass
        return code if isinstance(code, int) else 1
    finally:
        try:
            os.remove(batch)
        except OSError:
            pass


if __name__ == "__main__":
    sys.exit(main())
