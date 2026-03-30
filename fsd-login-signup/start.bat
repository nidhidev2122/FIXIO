@echo off
REM Windows Batch Script to Start Backend and Frontend

echo.
echo ========================================
echo   FSD Login Signup - Full Stack Setup
echo ========================================
echo.

echo Installing dependencies if needed...
if not exist "node_modules" (
    call npm install
)

echo.
echo ========================================
echo   Starting Backend Server (Port 5000)
echo ========================================
echo.
echo API Endpoints:
echo   - POST   http://localhost:5000/api/register
echo   - POST   http://localhost:5000/api/login
echo   - POST   http://localhost:5000/api/forgot-password
echo   - POST   http://localhost:5000/api/social-login
echo   - GET    http://localhost:5000/api/users (testing)
echo   - GET    http://localhost:5000/api/health
echo.

REM Start backend in a new window
start "Backend Server" node server.js

timeout /t 2 /nobreak

echo.
echo ========================================
echo   Starting Frontend (Port 3001)
echo ========================================
echo.
echo Frontend URL: http://localhost:3001
echo.
echo To stop all servers, close both windows.
echo.

REM Start frontend in a new window
start "React Frontend" npm start

echo Both servers are starting...
pause
