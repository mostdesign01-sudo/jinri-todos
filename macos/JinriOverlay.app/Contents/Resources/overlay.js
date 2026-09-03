// 今日待办 · 无边框置顶窗（JXA + WKWebView）
// argv[0] = .app/Contents 路径（由 MacOS/JinriOverlay 传入）

ObjC.import("Cocoa");
ObjC.import("WebKit");
ObjC.import("Foundation");

const STORAGE_KEY = "jinri-todos-v1";
const WIN_W = 420;
const WIN_H = 680;

function jsString(value) {
  if (value == null) return "";
  try {
    if (typeof value === "string") return value;
    if (value.js !== undefined && typeof value.js === "string") return value.js;
  } catch (e) {}
  return String(value);
}

function supportDir() {
  const dir = jsString($.NSHomeDirectory()) + "/Library/Application Support/jinri-todos";
  const fm = $.NSFileManager.defaultManager;
  if (!fm.fileExistsAtPath(dir)) {
    fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir, true, null, null);
  }
  return dir;
}

function readBackup() {
  const path = supportDir() + "/data.json";
  if (!$.NSFileManager.defaultManager.fileExistsAtPath(path)) return "";
  const str = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
  return jsString(str);
}

function writeBackup(text) {
  if (!text) return;
  const path = supportDir() + "/data.json";
  $(text).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
}

function showAlert(msg) {
  const alert = $.NSAlert.alloc.init;
  alert.setMessageText("今日待办");
  alert.setInformativeText(String(msg));
  alert.runModal();
}

function pageURL(root) {
  const dir = $.NSURL.fileURLWithPath(root + "/Resources/www/");
  return $.NSURL.URLWithStringRelativeToURL("overlay.html?glass=1&native=1", dir);
}

function userScriptSource(backup) {
  let src = 'document.documentElement.classList.add("glass","native");';
  if (backup) {
    src +=
      "try{localStorage.setItem(" +
      JSON.stringify(STORAGE_KEY) +
      "," +
      JSON.stringify(backup) +
      ");}catch(e){}";
  }
  src +=
    "(function(){var s=localStorage.setItem.bind(localStorage);" +
    "localStorage.setItem=function(k,v){s(k,v);" +
    "if(k===" +
    JSON.stringify(STORAGE_KEY) +
    '&&window.webkit&&webkit.messageHandlers&&webkit.messageHandlers.jinri){webkit.messageHandlers.jinri.postMessage("save:"+String(v));}' +
    "};})();";
  return src;
}

function buildMenu() {
  const main = $.NSMenu.alloc.init;
  const appMenu = $.NSMenu.alloc.initWithTitle("今日待办");
  appMenu.addItem($.NSMenuItem.alloc.initWithTitleActionKeyEquivalent("退出今日待办", "terminate:", "q"));
  const appItem = $.NSMenuItem.alloc.init;
  appItem.setSubmenu(appMenu);
  main.addItem(appItem);
  $.NSApp.setMainMenu(main);
}

function run(argv) {
  const root = argv && argv.length ? String(argv[0]) : "";
  if (!root) {
    showAlert("找不到应用目录。");
    return;
  }

  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyRegular);
  buildMenu();

  let mainWindow = null;
  let pinned = true;

  function setPinned(on) {
    pinned = !!on;
    if (!mainWindow) return;
    mainWindow.setLevel(pinned ? $.NSFloatingWindowLevel : $.NSNormalWindowLevel);
  }

  ObjC.registerSubclass({
    name: "JinriOverlayBridge",
    methods: {
      "userContentController:didReceiveScriptMessage:": {
        types: ["void", ["id", "id"]],
        implementation: function (controller, message) {
          const raw = jsString(message.body);
          if (raw === "quit") {
            $.NSApp.terminate(null);
            return;
          }
          if (raw === "pin") {
            setPinned(true);
            return;
          }
          if (raw === "unpin") {
            setPinned(false);
            return;
          }
          if (raw.indexOf("save:") === 0) {
            writeBackup(raw.slice(5));
          }
        },
      },
    },
  });

  const screen = $.NSScreen.mainScreen.visibleFrame;
  const x = screen.origin.x + screen.size.width - WIN_W - 28;
  const y = screen.origin.y + Math.max(40, screen.size.height - WIN_H - 40);
  const rect = $.NSMakeRect(x, y, WIN_W, WIN_H);
  const style = $.NSWindowStyleMaskBorderless | $.NSWindowStyleMaskResizable;

  const win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
    rect,
    style,
    $.NSBackingStoreBuffered,
    false
  );
  win.setTitle("今日待办");
  win.setOpaque(false);
  win.setBackgroundColor($.NSColor.clearColor);
  win.setHasShadow(true);
  win.setLevel($.NSFloatingWindowLevel);
  win.setCollectionBehavior(
    $.NSWindowCollectionBehaviorCanJoinAllSpaces |
      $.NSWindowCollectionBehaviorFullScreenAuxiliary |
      $.NSWindowCollectionBehaviorParticipatesInCycle
  );
  win.setIgnoresMouseEvents(false);
  win.setMovableByWindowBackground(true);
  win.setHidesOnDeactivate(false);
  win.setReleasedWhenClosed(false);
  win.setMinSize($.NSMakeSize(320, 420));
  mainWindow = win;

  const config = $.WKWebViewConfiguration.alloc.init;
  try {
    config.preferences.setValueForKey(true, "allowFileAccessFromFileURLs");
  } catch (e) {}
  const bridge = $.JinriOverlayBridge.alloc.init;
  config.userContentController.addScriptMessageHandlerName(bridge, "jinri");
  const script = $.WKUserScript.alloc.initWithSourceInjectionTimeForMainFrameOnly(
    userScriptSource(readBackup()),
    $.WKUserScriptInjectionTimeAtDocumentStart,
    true
  );
  config.userContentController.addUserScript(script);

  const webview = $.WKWebView.alloc.initWithFrameConfiguration($.NSMakeRect(0, 0, WIN_W, WIN_H), config);
  webview.setAutoresizingMask($.NSViewWidthSizable | $.NSViewHeightSizable);
  try {
    webview.setValueForKey(false, "drawsBackground");
  } catch (e) {}
  try {
    webview.underPageBackgroundColor = $.NSColor.clearColor;
  } catch (e) {}
  try {
    webview.setOpaque(false);
    webview.setWantsLayer(true);
    webview.layer.setOpaque(false);
    webview.layer.setBackgroundColor($.NSColor.clearColor.CGColor);
  } catch (e) {}

  const url = pageURL(root);
  if (!url) {
    showAlert("找不到 overlay.html。");
    return;
  }
  webview.loadRequest($.NSURLRequest.requestWithURL(url));

  win.setContentView(webview);
  win.makeKeyAndOrderFront($());
  app.activateIgnoringOtherApps(true);
  app.run();
}
