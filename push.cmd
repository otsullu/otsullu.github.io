@echo off
cd /d D:\Work\OTSUllu\WebsiteYouTube
git add -A
set /p MSG="Commit message (or press Enter for 'Update site'): "
if "%MSG%"=="" set MSG=Update site
git commit -m "%MSG%"
git push
echo.
echo Done. Check https://otsullu.github.io
pause
