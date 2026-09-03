-- 今日待办 · 悬浮窗
-- 1. 用「脚本编辑器」打开本文件
-- 2. 菜单「文件」→「导出…」
-- 3. 文件格式选「应用程序」，不要勾选「仅在运行时显示」
-- 4. 存到「应用程序」文件夹或桌面，再拖到程序坞

set overlayURL to "https://mostdesign01-sudo.github.io/jinri-todos/overlay.html"
set chromeBin to "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
set edgeBin to "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

if fileExists(chromeBin) then
	do shell script quoted form of chromeBin & " --app=" & quoted form of overlayURL & " >/dev/null 2>&1 &"
else if fileExists(edgeBin) then
	do shell script quoted form of edgeBin & " --app=" & quoted form of overlayURL & " >/dev/null 2>&1 &"
else
	do shell script "open " & quoted form of overlayURL
end if

on fileExists(posixPath)
	do shell script "test -x " & quoted form of posixPath & " && echo 1 || echo 0"
	return result is "1"
end fileExists
