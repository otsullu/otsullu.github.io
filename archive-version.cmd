@echo off
cd /d "%~dp0"

set VER=1
:findver
if exist "v%VER%\" (
  set /a VER+=1
  goto findver
)

echo.
echo Archiving current root into v%VER%\ ...
echo.

mkdir "v%VER%"
mkdir "v%VER%\css"
mkdir "v%VER%\js"
mkdir "v%VER%\assets\img"
mkdir "v%VER%\data"
mkdir "v%VER%\pdfs"

for %%F in (*.html) do (
  echo   Copying %%F
  copy /Y "%%F" "v%VER%\%%F" >nul
)

copy /Y "css\style.css"  "v%VER%\css\style.css"  >nul
copy /Y "js\app.js"      "v%VER%\js\app.js"      >nul

if exist "js\pdf.min.js"        copy /Y "js\pdf.min.js"        "v%VER%\js\pdf.min.js"        >nul
if exist "js\pdf.worker.min.js" copy /Y "js\pdf.worker.min.js" "v%VER%\js\pdf.worker.min.js" >nul

xcopy /Y /E /Q "assets\img\*" "v%VER%\assets\img\" >nul
xcopy /Y /E /Q "data\*"       "v%VER%\data\"       >nul
xcopy /Y /E /Q "pdfs\*"       "v%VER%\pdfs\"       >nul

echo.
echo Done. v%VER%\ archived successfully.
echo.
echo Next steps:
echo   1. Edit root files for the new version
echo   2. Test locally with serve.cmd
echo   3. Run push.cmd when ready to go live
echo.
