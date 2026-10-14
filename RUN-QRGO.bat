@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install it from https://nodejs.org then run this again. & pause & exit /b 1)
node serve.mjs
pause
