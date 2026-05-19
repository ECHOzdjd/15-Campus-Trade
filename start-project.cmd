@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-project.ps1" %*
set EXIT_CODE=%ERRORLEVEL%
echo.
if not "%EXIT_CODE%"=="0" (
  echo Startup failed with exit code %EXIT_CODE%.
) else (
  echo Startup finished successfully.
)
pause
exit /b %EXIT_CODE%
