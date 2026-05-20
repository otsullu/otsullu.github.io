@echo off
cd /d "%~dp0"

:: Find next version number
set VER=1
:findver
if exist "v%VER%\" (
  set /a VER+=1
  goto findver
)

echo Archiving current root into v%VER%\...

mkdir "v%VER%\css"
mkdir "v%VER%\js"
mkdir "v%VER%\assets\img"

copy /Y index.html "v%VER%\index.html"
copy /Y css\style.css "v%VER%\css\style.css"
copy /Y js\app.js "v%VER%\js\app.js"
xcopy /Y /E assets\img\* "v%VER%\assets\img\"

echo Done. v%VER%\ is ready.
echo Drop your new site files at the root, then commit and push.
pause
