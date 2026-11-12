@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 24 tro len de chay RestMan.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 (
  echo RestMan can Node.js 24 tro len. Hay cap nhat Node.js.
  pause
  exit /b 1
)
node server.cjs --open
if errorlevel 1 pause
endlocal
