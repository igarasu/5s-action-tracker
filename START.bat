@echo off
chcp 65001 >nul
title 5S Action Tracker

:: Set working directory to the folder where this bat file is located
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   5S Action Tracker - 起動中...                 ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: Find bun.exe (Aki environment)
set "BUN_PATH=%USERPROFILE%\.aki\bin\bun.exe"
if exist "%BUN_PATH%" (
    echo [INFO] Bun を使用します
    goto :USE_BUN
)

:: Try node directly
where node >nul 2>nul
if %errorlevel%==0 (
    echo [INFO] Node.js を使用します
    goto :USE_NODE
)

:: Neither found
echo.
echo ❌ エラー: Node.js または Bun が見つかりません。
echo    Node.js をインストールしてください: https://nodejs.org/
echo.
pause
exit /b 1

:USE_BUN
:: Install dependencies if needed
if not exist "node_modules" (
    echo [1/3] パッケージをインストール中...
    "%BUN_PATH%" install
)

echo [2/3] バックエンドサーバーを起動中...
start "" /b cmd /c "cd /d "%~dp0" && "%BUN_PATH%" server\mock-server.js"

timeout /t 2 /nobreak >nul

echo [3/3] フロントエンドを起動中...
start "" /b cmd /c "cd /d "%~dp0\client" && "%BUN_PATH%" ..\node_modules\vite\bin\vite.js --host"

goto :DONE

:USE_NODE
:: Install dependencies if needed
if not exist "node_modules" (
    echo [1/3] パッケージをインストール中...
    call npm install
)

echo [2/3] バックエンドサーバーを起動中...
start "" /b cmd /c "cd /d "%~dp0" && node server\mock-server.js"

timeout /t 2 /nobreak >nul

echo [3/3] フロントエンドを起動中...
start "" /b cmd /c "cd /d "%~dp0\client" && npx vite --host"

goto :DONE

:DONE
timeout /t 3 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   ✅ 起動完了！                                 ║
echo ║                                                  ║
echo ║   ブラウザで以下を開いてください:               ║
echo ║   http://localhost:5173                          ║
echo ║                                                  ║
echo ║   終了するにはこのウィンドウを閉じてください    ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: Open browser automatically
start http://localhost:5173

:: Keep window open
pause >nul
