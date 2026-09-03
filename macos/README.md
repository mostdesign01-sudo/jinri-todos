# Mac 应用

下载 [JinriOverlay.zip](JinriOverlay.zip)，解压出「今日待办悬浮窗.app」：

1. 拖到「应用程序」或桌面
2. 再拖进程序坞
3. 第一次打开若被拦截：按住 Control 点图标 →「打开」
4. 不需要安装 Chrome

这是系统级无边框窗口（WKWebView）：没有标题栏、没有浅色底框，默认浮在其他窗口上面。清单存在本机 `~/Library/Application Support/jinri-todos/`。若要和网页主页同步，用导出 / 导入。

重新打包（改过 `overlay.html` 等文件后）：

```bash
./macos/build-app.sh
```
