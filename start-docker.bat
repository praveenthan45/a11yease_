@echo off
setlocal
title pluga11y - Start Website
cd /d "%~dp0"

if not exist ".local\admin-auth.json" (
    echo ERROR: Admin credentials are not configured. See README.md.
    pause
    exit /b 1
)

set "TASK_DOCKER_EXE="
for /f "delims=" %%D in ('where.exe docker.exe 2^>nul') do if not defined TASK_DOCKER_EXE set "TASK_DOCKER_EXE=%%D"
if not defined TASK_DOCKER_EXE if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" set "TASK_DOCKER_EXE=%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
if not defined TASK_DOCKER_EXE goto node_server

"%TASK_DOCKER_EXE%" info >nul 2>nul
if errorlevel 1 goto node_server
"%TASK_DOCKER_EXE%" compose version >nul 2>nul
if errorlevel 1 goto node_server

"%TASK_DOCKER_EXE%" compose -f "%~dp0compose.yaml" up -d --build
if errorlevel 1 (
    echo ERROR: Docker could not start the website. Check the error above.
    echo If port 1434 is occupied by another server, stop it with Ctrl+C first.
    pause
    exit /b 1
)

echo pluga11y is running in Docker at http://localhost:1434/
start "" "http://localhost:1434/"
echo You can close this window; the Docker container keeps running.
echo To stop it: docker compose -f "%~dp0compose.yaml" down
pause
exit /b 0

:node_server
echo Docker is unavailable. Starting the local website with Node.js instead.
call "%~dp0start-server.bat"
exit /b %errorlevel%
