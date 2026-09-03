-- 备用：用 Chrome 开应用窗（仍会有系统标题栏）。
-- 正式用法：下载同目录 JinriOverlay.zip，解压即是无边框悬浮窗。

set overlayURL to "https://mostdesign01-sudo.github.io/jinri-todos/overlay.html?app=1"
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
