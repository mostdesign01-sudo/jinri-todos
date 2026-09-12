// 今日待办 · 无边框置顶窗（JXA + WKWebView）
// argv[0] = .app/Contents 路径（由 MacOS/JinriOverlay 传入）

ObjC.import("Cocoa");
ObjC.import("WebKit");
ObjC.import("Foundation");

const STORAGE_KEY = "jinri-todos-v1";
const WIN_W = 520;
const WIN_H = 820;

// AppKit 常量按数值写，JXA 对宏定义的桥接不稳定。
const NSBackingStoreBuffered = 2;
const NSWindowStyleMaskBorderless = 0;
const NSWindowStyleMaskResizable = 8;
const NSNormalWindowLevel = 0;
const NSFloatingWindowLevel = 3;
const NSViewWidthSizable = 2;
const NSViewHeightSizable = 16;
const NSWindowCollectionBehaviorCanJoinAllSpaces = 1;
const NSWindowCollectionBehaviorParticipatesInCycle = 32;
const NSWindowCollectionBehaviorFullScreenAuxiliary = 256;
const NSApplicationActivationPolicyRegular = 0;
const NSModalResponseOK = 1;
const NSUTF8StringEncoding = 4;
const WKUserScriptInjectionTimeAtDocumentStart = 0;

function str(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    const u = ObjC.unwrap(value);
    if (typeof u === "string") return u;
    if (u !== undefined && u !== null) return String(u);
  } catch (e) {}
  try {
    return String(value.js);
  } catch (e) {}
  return String(value);
}

function supportDir() {
  const dir = str($.NSHomeDirectory()) + "/Library/Application Support/jinri-todos";
  const fm = $.NSFileManager.defaultManager;
  if (!fm.fileExistsAtPath(dir)) {
    fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir, true, null, null);
  }
  return dir;
}

function readText(path) {
  if (!$.NSFileManager.defaultManager.fileExistsAtPath(path)) return "";
  return str($.NSString.stringWithContentsOfFileEncodingError(path, NSUTF8StringEncoding, null));
}

function writeText(path, text) {
  $(String(text)).writeToFileAtomicallyEncodingError(path, true, NSUTF8StringEncoding, null);
}

function backupPath() {
  return supportDir() + "/data.json";
}

function showAlert(title, msg) {
  const alert = $.NSAlert.alloc.init;
  alert.setMessageText(String(title));
  alert.setInformativeText(String(msg || ""));
  alert.runModal();
}

// 网页在 file:// 下打开：先把上次的清单塞回 localStorage，
// 之后每次写入都回传给原生端存到 Application Support。
// 若 localStorage 在 file:// 下不可用，就用内存版顶替。
function userScriptSource(backup) {
  const key = JSON.stringify(STORAGE_KEY);
  const seed = JSON.stringify(backup || "");
  return [
    "(function(){",
    "document.documentElement.classList.add('glass','native');",
    "var KEY=" + key + ";var seed=" + seed + ";",
    "function post(m){try{webkit.messageHandlers.jinri.postMessage(m);}catch(e){}}",
    "var store=null;",
    "try{window.localStorage.getItem(KEY);store=window.localStorage;}catch(e){store=null;}",
    "if(!store){",
    "  var mem={};",
    "  store={getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null;},",
    "         setItem:function(k,v){mem[k]=String(v);},",
    "         removeItem:function(k){delete mem[k];},clear:function(){mem={};}};",
    "  try{Object.defineProperty(window,'localStorage',{value:store,configurable:true});}catch(e){}",
    "}",
    "if(seed){try{store.setItem(KEY,seed);}catch(e){}}",
    "var raw=store.setItem.bind(store);",
    "var patched=function(k,v){raw(k,v);if(k===KEY)post('save:'+String(v));};",
    "try{Object.defineProperty(store,'setItem',{value:patched,configurable:true,writable:true});}catch(e){",
    "  try{Storage.prototype.setItem=patched;}catch(e2){}",
    "}",
    "})();",
  ].join("\n");
}

function buildMenu(app) {
  const main = $.NSMenu.alloc.init;
  const appMenu = $.NSMenu.alloc.initWithTitle("今日待办");
  appMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("退出今日待办", "terminate:", "q"));
  const appItem = $.NSMenuItem.alloc.init;
  appItem.setSubmenu(appMenu);
  main.addItem(appItem);

  const edit = $.NSMenu.alloc.initWithTitle("编辑");
  edit.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("撤销", "undo:", "z"));
  edit.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("剪切", "cut:", "x"));
  edit.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("拷贝", "copy:", "c"));
  edit.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("粘贴", "paste:", "v"));
  edit.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("全选", "selectAll:", "a"));
  const editItem = $.NSMenuItem.alloc.init;
  editItem.setSubmenu(edit);
  main.addItem(editItem);

  app.setMainMenu(main);
}

function run(argv) {
  const root = argv && argv.length ? String(argv[0]) : "";
  if (!root) {
    showAlert("今日待办", "找不到应用目录。");
    return;
  }
  const wwwDir = root + "/Resources/www/";
  if (!$.NSFileManager.defaultManager.fileExistsAtPath(wwwDir + "index.html")) {
    showAlert("今日待办", "找不到页面文件，请重新解压 zip。");
    return;
  }

  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy(NSApplicationActivationPolicyRegular);
  buildMenu(app);

  let mainWindow = null;
  let webview = null;

  // 无边框窗默认不能成为 key window，输入框就打不了字，这里放开。
  if (!$.JinriPanel) {
    ObjC.registerSubclass({
      name: "JinriPanel",
      superclass: "NSWindow",
      methods: {
        canBecomeKeyWindow: { types: ["bool", []], implementation: function () { return true; } },
        canBecomeMainWindow: { types: ["bool", []], implementation: function () { return true; } },
      },
    });
  }

  function setPinned(on) {
    if (!mainWindow) return;
    mainWindow.setLevel(on ? NSFloatingWindowLevel : NSNormalWindowLevel);
  }

  function runJS(js) {
    if (!webview) return;
    try {
      webview.evaluateJavaScriptCompletionHandler(js, null);
    } catch (e) {}
  }

  function doExport(json) {
    const panel = $.NSSavePanel.savePanel;
    panel.setNameFieldStringValue("jinri-todos.json");
    panel.setCanCreateDirectories(true);
    if (panel.runModal() !== NSModalResponseOK) return;
    writeText(str(panel.URL.path), json);
  }

  function doImport() {
    const panel = $.NSOpenPanel.openPanel;
    panel.setCanChooseFiles(true);
    panel.setCanChooseDirectories(false);
    panel.setAllowsMultipleSelection(false);
    if (panel.runModal() !== NSModalResponseOK) return;
    const path = str(panel.URLs.objectAtIndex(0).path);
    const text = readText(path);
    if (!text) {
      showAlert("今日待办", "这个文件是空的。");
      return;
    }
    runJS("window.__jinriImport && window.__jinriImport(" + JSON.stringify(text) + ")");
  }

  if (!$.JinriOverlayBridge) {
    ObjC.registerSubclass({
      name: "JinriOverlayBridge",
      superclass: "NSObject",
      protocols: ["WKScriptMessageHandler"],
      methods: {
        "userContentController:didReceiveScriptMessage:": {
          types: ["void", ["id", "id"]],
          implementation: function (controller, message) {
            const raw = str(message.body);
            if (raw === "quit") {
              app.terminate(null);
            } else if (raw === "pin") {
              setPinned(true);
            } else if (raw === "unpin") {
              setPinned(false);
            } else if (raw === "drag") {
              if (mainWindow) mainWindow.performWindowDragWithEvent(app.currentEvent);
            } else if (raw === "import") {
              doImport();
            } else if (raw.indexOf("export:") === 0) {
              doExport(raw.slice(7));
            } else if (raw.indexOf("save:") === 0) {
              writeText(backupPath(), raw.slice(5));
            }
          },
        },
      },
    });
  }

  const screen = $.NSScreen.mainScreen.visibleFrame;
  const x = screen.origin.x + screen.size.width - WIN_W - 28;
  const y = screen.origin.y + Math.max(24, screen.size.height - WIN_H - 40);
  const rect = $.NSMakeRect(x, y, WIN_W, WIN_H);

  const win = $.JinriPanel.alloc.initWithContentRectStyleMaskBackingDefer(
    rect,
    NSWindowStyleMaskBorderless | NSWindowStyleMaskResizable,
    NSBackingStoreBuffered,
    false
  );
  win.setTitle("今日待办");
  win.setOpaque(false);
  win.setBackgroundColor($.NSColor.clearColor);
  win.setHasShadow(true);
  win.setLevel(NSFloatingWindowLevel);
  win.setCollectionBehavior(
    NSWindowCollectionBehaviorCanJoinAllSpaces |
      NSWindowCollectionBehaviorFullScreenAuxiliary |
      NSWindowCollectionBehaviorParticipatesInCycle
  );
  win.setMovableByWindowBackground(true);
  win.setHidesOnDeactivate(false);
  win.setReleasedWhenClosed(false);
  win.setMinSize($.NSMakeSize(320, 420));
  mainWindow = win;

  const config = $.WKWebViewConfiguration.alloc.init;
  try {
    config.preferences.setValueForKey($.NSNumber.numberWithBool(true), "allowFileAccessFromFileURLs");
  } catch (e) {}
  const bridge = $.JinriOverlayBridge.alloc.init;
  config.userContentController.addScriptMessageHandlerName(bridge, "jinri");
  const script = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(
    userScriptSource(readText(backupPath())),
    WKUserScriptInjectionTimeAtDocumentStart,
    true
  );
  config.userContentController.addUserScript(script);

  webview = $.WKWebView.alloc.initWithFrameConfiguration($.NSMakeRect(0, 0, WIN_W, WIN_H), config);
  webview.setAutoresizingMask(NSViewWidthSizable | NSViewHeightSizable);
  try {
    webview.setValueForKey($.NSNumber.numberWithBool(false), "drawsBackground");
  } catch (e) {}
  try {
    webview.setUnderPageBackgroundColor($.NSColor.clearColor);
  } catch (e) {}

  const dirURL = $.NSURL.fileURLWithPathIsDirectory(wwwDir, true);
  const pageURL = $.NSURL.URLWithStringRelativeToURL("index.html?glass=1&native=1", dirURL);
  webview.loadFileURLAllowingReadAccessToURL(pageURL, dirURL);

  win.setContentView(webview);
  win.makeKeyAndOrderFront(null);
  win.makeFirstResponder(webview);
  app.activateIgnoringOtherApps(true);
  app.run();
}
