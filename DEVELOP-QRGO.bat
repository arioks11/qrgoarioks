@echo off
cd /d "%~dp0source"
where node >nul 2>nul || (echo Node.js is required. Install it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm install
call npm run dev -- --open
pause
