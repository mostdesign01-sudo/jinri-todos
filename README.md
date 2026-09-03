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

`overlay.html` 本身仍是一块透明玻璃小窗，只显示今天、逾期和陆续事项。顶部有拖动手柄，也方便以后嵌进 Electron。没有完整月历。

### 做成桌面应用并置顶

网页不能自己一直压在所有软件上面，需要开成独立应用窗，再用系统钉住。

**Windows（最像桌面小工具）：**

1. 安装 [Chrome](https://www.google.com/chrome/) 或 Edge
2. 按 `Win + R`，粘贴后回车（没有地址栏的小应用窗）：

```bash
chrome --app=https://mostdesign01-sudo.github.io/jinri-todos/overlay.html
```

3. 安装 [PowerToys](https://learn.microsoft.com/windows/powertoys/)，点一下这个小窗，按 `Ctrl + Win + T` 钉在最前

Edge 把命令里的 `chrome` 换成 `msedge`。

**Mac（做成 Dock 里的应用）：**

1. **Chrome 安装为应用：** 打开首页 → 右上角 `⋮` →「将今日待办安装为应用」。之后从启动台打开，没有浏览器外壳。
2. **只要悬浮清单：** 下载 [JinriOverlay.zip](macos/JinriOverlay.zip)，解压得到「今日待办悬浮窗.app」，拖到「应用程序」再拖进程序坞。第一次若拦下：Control-点图标 →「打开」。需要已安装 Chrome 或 Edge。
3. **Safari（较新系统）：**「文件」→「添加到程序坞」。
4. 终端每次开一个无地址栏小窗：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="https://mostdesign01-sudo.github.io/jinri-todos/overlay.html"
```

Mac 没有系统自带的一键置顶；Chrome 画中画小窗一般会浮在前面。

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
