# Mac 应用

下载 [JinriOverlay.zip](JinriOverlay.zip)，解压出「今日待办.app」：

1. 拖到「应用程序」或桌面
2. 再拖进程序坞
3. 第一次打开若被拦截：macOS 15+ 到「系统设置 → 隐私与安全性」点「仍要打开」；更早系统按住 Control 点图标 →「打开」
4. 不需要安装 Chrome

这是系统级无边框窗口（WKWebView）：没有标题栏、没有浅色底框，默认浮在其他窗口上面。打开后是完整的今日待办，顶上一排「置顶 / 导出 / 导入 / 关闭」。如果看到的是带标题栏和红绿灯的窗，那是旧版 Chrome 启动器，请删掉重下。

清单存在本机 `~/Library/Application Support/jinri-todos/data.json`。打不开时错误会记在同目录 `launch.log`。

重新打包：

```bash
./macos/build-app.sh
```
