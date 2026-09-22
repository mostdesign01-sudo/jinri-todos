# 今日待办

一个很小的每日待办 PWA。中文界面，按上海时区过天。每条事项都落在具体日期上，可用月历查看今天和其他日子。

没有账号，数据存在浏览器的 `localStorage`（键名 `jinri-todos-v1`，数据版本 2）。旧版未完成会迁到今天，已完成留在原来的 `doneDate` 或 `lastDate`。

在线地址：https://mostdesign01-sudo.github.io/jinri-todos/

悬浮窗：https://mostdesign01-sudo.github.io/jinri-todos/overlay.html

## 能做什么

- 四档优先级：紧急 / 高 / 中 / 低（红 / 橙 / 蓝 / 灰），默认「中」
- 月历：点日期看那天的清单；有事项的日子有圆点；高亮今天和当前选中日
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

### Mac

见下面的「Mac 桌面壳」：一个 Tauri 2 原生小窗，直接装载这块悬浮窗，自带置顶。

### 手机

用 Safari 或 Chrome 打开首页，选「添加到主屏幕」。之后可以像独立 App 一样用。

## Mac 桌面壳

`desktop/` 是一个 [Tauri 2](https://v2.tauri.app/) 工程，把仓库根目录现成的 `overlay.html`（连同 `overlay.css`、`styles.css`、`app.js`、`icon.svg`）装进一个无边框、透明、Always on Top 的 Mac 原生窗口。网页和 GitHub Pages 的 PWA 完全不受影响：桌面壳只是把这几个静态文件打进二进制，没有第二份拷贝；桌面专用的那点 JS / CSS 在启动时由 Rust 注入 webview，网页端永远不会加载它们。

```
desktop/
├── ui/
│   ├── desktop.js           桌面专用层：胶囊、「收起」按钮、Esc，镜像 Rust 的折叠状态
│   └── desktop.css          胶囊与「收起」的样式
└── src-tauri/
    ├── Cargo.toml           Rust 包（二进制名 jinri-todos）
    ├── build.rs             根目录网页文件改动时触发重编
    ├── tauri.conf.json      窗口 / 打包配置，frontendDist 指向 ../../overlay.html 等
    ├── capabilities/        webview 权限（core:default、拖动窗口、allow-set-collapsed / allow-is-collapsed）
    ├── icons/               由根目录 icon.svg 生成的 .icns / .png
    └── src/main.rs          建窗、折叠 / 展开时改原生窗口尺寸、⌥Space、记住位置
```

### 用法

- **默认是胶囊**：一条 240×44 的小药丸，写着 `今日 · N`；有逾期就多一个红点和 `逾期 · k`；今天和逾期都清空时显示 `都做完了`。左端竖条可以拖动，其余部分点一下展开。
- **展开**：就是原来的悬浮窗（今天 + 逾期清单、添加栏），窗口本身变成 380×560，可在 320–480 宽之间拉伸；展开时若会超出屏幕边缘，会自动挪回屏幕内。
- **收起**：按 `Esc`，或点右上角的「收起」。折叠时是**真的把原生窗口缩成 240×44**，不是 CSS 隐藏，所以不会挡住下面的桌面。
- **⌥Space（Option+空格）**：全局快捷键，在任何 App 里都能切换展开 / 收起；展开后自动聚焦输入框，直接打字回车即可。
- **记住位置**：拖到哪里，下次启动还在哪里（写在 `~/Library/Application Support/com.mostdesign.jinritodos/.window-state.json`）。

**关于 ⌥Space 的权限**：它用的是 macOS 的 Carbon 热键 API，不需要「辅助功能」或「输入监控」授权。如果按了没反应，通常是被别的 App 占用了（比如 Alfred、Raycast 的默认热键），或者当前输入法把 ⌥Space 吞成了不换行空格。改键在 `desktop/src-tauri/src/main.rs` 顶部的 `TOGGLE_MODIFIERS` / `TOGGLE_KEY`。

### 依赖

1. **Xcode Command Line Tools**：`xcode-select --install`
2. **Rust**（rustup，stable）：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. **Tauri CLI**：`cargo install tauri-cli --version '^2' --locked`（首次编译几分钟；也可用 `npm i -g @tauri-apps/cli` 后以 `npx tauri` 代替 `cargo tauri`）

### 开发运行

```bash
cd desktop
cargo tauri dev
```

首次会拉取并编译 Tauri，之后几秒起窗，起来就是胶囊。改了根目录的 `overlay.html` / `app.js` / CSS 或 `desktop/ui/` 之后重新执行 `cargo tauri dev`（文件是打进二进制的，没有热更新）。

### 打包

```bash
cd desktop
cargo tauri build
```

产物在 `desktop/src-tauri/target/release/bundle/`：`macos/今日待办.app` 和 `dmg/`。未签名，第一次打开需要在「系统设置 → 隐私与安全性」里点允许，或者右键 → 打开。

### 数据

待办仍存在 webview 里的 `localStorage`（键 `jinri-todos-v1`），落在 `~/Library/WebKit/com.mostdesign.jinritodos/`。它与 Safari/Chrome 里打开网页版的数据是**两份互不相通**的，导入导出请先用网页全页版。M3 会迁到本地 JSON。

### 里程碑

- **M1（已合并）**：Tauri 2 脚手架；无边框、透明、置顶、所有桌面空间可见的小窗；装载现有 `overlay.html`；手柄拖动。
- **M2（本次）**：默认折叠成胶囊（`今日 · N` / 红点 `逾期 · k` / `都做完了`）；点胶囊展开，`Esc` 或「收起」折叠；折叠时原生窗口真的缩到 240×44；全局 ⌥Space 切换；记住窗口位置。
- **M3**：数据从 `localStorage` 迁到本地 JSON 文件（Tauri fs 命令读写 `~/Library/Application Support/...`），与网页版可互相导入导出。
- **暂不做**：菜单栏托盘、登录时启动、自动更新、签名与公证。

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
