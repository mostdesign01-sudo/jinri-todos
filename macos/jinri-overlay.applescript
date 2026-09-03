-- 今日待办 · 悬浮窗（备用）
-- 更省事：直接下载同目录 JinriOverlay.zip，解压即可。
-- 若仍想自己导出：用「脚本编辑器」打开 → 文件 → 导出 → 应用程序。

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
