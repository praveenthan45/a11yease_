@echo off
setlocal
title pluga11y - Admin Server (1434)
cd /d "%~dp0"
set "TASK_SERVER_URL=http://localhost:1434/"
if not exist ".local\admin-auth.json" (
    echo ERROR: Configure an admin account first. See README.md.
    pause
    exit /b 1
)
set "TASK_NODE_EXE="
for /f "delims=" %%N in ('where.exe node.exe 2^>nul') do if not defined TASK_NODE_EXE set "TASK_NODE_EXE=%%N"
if not defined TASK_NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "TASK_NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined TASK_NODE_EXE (
    echo ERROR: Install Node.js 24 or newer to start the local website.
    pause
    exit /b 1
)
"%TASK_NODE_EXE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
    echo ERROR: Node.js 24 or newer is required. Update Node.js and try again.
    pause
    exit /b 1
)
powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:1434/login' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
if not errorlevel 1 (
    echo pluga11y is already running. Opening %TASK_SERVER_URL%
    start "" "%TASK_SERVER_URL%"
    exit /b 0
)
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$ProgressPreference = 'SilentlyContinue'; for ($attempt = 0; $attempt -lt 80; $attempt++) { try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:1434/login' -UseBasicParsing -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process 'http://localhost:1434/'; break } } catch {}; Start-Sleep -Milliseconds 250 }" >nul 2>nul
echo pluga11y admin login: %TASK_SERVER_URL%
echo Keep this window open. Press Ctrl+C to stop the server.
"%TASK_NODE_EXE%" server\admin.mjs
set "TASK_SERVER_EXIT=%errorlevel%"
if not "%TASK_SERVER_EXIT%"=="0" echo ERROR: pluga11y could not start. Review the error above.
pause
exit /b %TASK_SERVER_EXIT%
