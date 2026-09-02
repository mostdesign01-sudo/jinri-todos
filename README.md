# 今日待办

一个很小的每日待办 PWA。中文界面，按上海时区过天。每条事项都落在具体日期上，可用月历查看今天和其他日子。

没有账号，数据存在浏览器的 `localStorage`（键名 `jinri-todos-v1`，数据版本 2）。旧版未完成会迁到今天，已完成留在原来的 `doneDate` 或 `lastDate`。

在线地址：https://mostdesign01-sudo.github.io/jinri-todos/

悬浮窗：https://mostdesign01-sudo.github.io/jinri-todos/overlay.html

## 能做什么

- 四档优先级：紧急 / 高 / 中 / 低（红 / 橙 / 蓝 / 灰），默认「中」
- 月历：点日期看那天的清单；收起时留下本周，点标题日期展开整月；有事项的日子有圆点；高亮今天和当前选中日
- 未完成留在原日期。今天会在清单上方用「逾期」带出过去没做完的
- 未完成按优先级、再按创建时间排序；全页里已完成沉到底部
- 回车添加（加到**当前正在看的那天**），勾选完成；全页可点标题直接改字
- 首次打开有 3 条标了「示例」的任务，可一键「清示例」
- 全页支持导出 / 导入 JSON（导出包含全部日期）
- 快捷键：`N` 聚焦输入框，`1`–`4` 切换优先级，`←` `→` 换天
- 可安装到手机主屏幕（PWA）

## 桌面悬浮窗

`overlay.html` 是一块透明玻璃小窗，只显示今天未完成和逾期事项、添加栏，以及「还有 N 件」。顶部有一条拖动手柄，方便以后嵌进 Electron。没有完整月历。

### Windows：PowerToys 置顶

1. 用 Chrome / Edge 打开 [overlay.html](https://mostdesign01-sudo.github.io/jinri-todos/overlay.html)
2. 安装 [PowerToys](https://learn.microsoft.com/windows/powertoys/)
3. 选中窗口后按 `Ctrl + Win + T`（Always On Top）钉在最前

也可以先把 Chrome 开成独立小窗再置顶：

```bash
chrome --app=https://mostdesign01-sudo.github.io/jinri-todos/overlay.html
```

Edge 类似：

```bash
msedge --app=https://mostdesign01-sudo.github.io/jinri-todos/overlay.html
```

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
