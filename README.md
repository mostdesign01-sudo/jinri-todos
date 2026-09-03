# 今日待办

一个很小的每日待办 PWA。中文界面，按上海时区过天。每条事项都落在具体日期上，可用月历查看今天和其他日子。

没有账号，数据存在浏览器的 `localStorage`（键名 `jinri-todos-v1`，数据版本 2）。旧版未完成会迁到今天，已完成留在原来的 `doneDate` 或 `lastDate`。

在线地址：https://mostdesign01-sudo.github.io/jinri-todos/

悬浮窗：https://mostdesign01-sudo.github.io/jinri-todos/overlay.html

## 能做什么

- 四档优先级：紧急 / 高 / 中 / 低（红 / 橙 / 蓝 / 灰），默认「中」
- 月历：点日期看那天的清单；收起时留下本周，点标题日期展开整月；有事项的日子有圆点；高亮今天和当前选中日
- 未完成留在原日期。今天会在清单上方用「逾期」带出过去没做完的；后面几天的待办排在「陆续」里
- 误删进最近删除，底部可立刻「找回」，工具栏「找回」也能再恢复；误勾完成可撤销（快捷键 Z）
- 未完成按优先级、再按创建时间排序；全页里已完成沉到底部
- 回车添加（加到**当前正在看的那天**），勾选完成；全页可点标题直接改字
- 首次打开有 3 条标了「示例」的任务，可一键「清示例」
- 全页支持导出 / 导入 JSON（导出包含全部日期）
- 快捷键：`N` 聚焦输入框，`1`–`4` 切换优先级，`←` `→` 换天
- 可安装到手机主屏幕（PWA）
- 标题用黑体；右边挂一盏会晃的小灯笼：傍晚、夜里或有逾期时会亮起来提醒

## 桌面悬浮窗

首页点「打开悬浮窗」会弹出**独立小窗**，主页面还留着。Chrome / Edge 会尽量用画中画，小窗可以浮在别的窗口上面；其他浏览器则开一个窄弹窗。若被拦截，允许本站弹出窗口即可。

`overlay.html` 只显示今天、逾期和陆续事项。在普通浏览器窗里铺满深色，避免露出浅色底框；Mac 原生悬浮窗会加上 `?glass=1&native=1`，变成圆角玻璃卡片。

### 做成桌面应用并置顶

**Mac（无边框、浮在最前）：**

Chrome 的应用窗去不掉系统标题栏和浅色底框。请下载 [JinriOverlay.zip](macos/JinriOverlay.zip)，解压出「今日待办悬浮窗.app」，拖到「应用程序」再拖进程序坞。第一次若拦下：Control-点图标 →「打开」。不需要装 Chrome。

这是系统窗口：没有红绿灯，默认置顶，可拖动圆角卡片。清单存在本机；若要和网页主页同一份，主页导出后再在窗里导入。退出点「关闭」或程序坞右键。

**Windows（最像桌面小工具）：**

1. 安装 [Chrome](https://www.google.com/chrome/) 或 Edge
2. 按 `Win + R`，粘贴后回车（没有地址栏的小应用窗）：

```bash
chrome --app=https://mostdesign01-sudo.github.io/jinri-todos/overlay.html
```

3. 安装 [PowerToys](https://learn.microsoft.com/windows/powertoys/)，点一下这个小窗，按 `Ctrl + Win + T` 钉在最前

Edge 把命令里的 `chrome` 换成 `msedge`。

### 手机

用 Safari 或 Chrome 打开首页，选「添加到主屏幕」。之后可以像独立 App 一样用。

## 本地打开

静态文件，直接打开 `index.html` 即可；若要体验离线缓存，建议用任意静态服务器：

```bash
python3 -m http.server 8080
```

然后访问 http://127.0.0.1:8080/

逻辑自检（不依赖 npm）：

```bash
node test-app.js
```
