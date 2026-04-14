@echo off
echo ============================================
echo  ProcessGuide AI - Starting Dev Environment
echo ============================================

:: Start Backend
echo.
echo [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "ProcessGuide Backend" cmd /k "cd /d "%~dp0backend" && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

:: Wait a couple seconds for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend
echo [2/2] Starting React frontend on http://localhost:5173 ...
start "ProcessGuide Frontend" cmd /k "cd /d "%~dp0frontend" && npm install && npm run dev"

echo.
echo Both services are starting in separate windows.
echo   Backend : http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo.
pause
