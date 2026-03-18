@echo off
echo Installing npm dependencies...
echo.
echo This will install all required dependencies including:
echo - react and react-dom
echo - react-router-dom
echo - @heroicons/react
echo - react-big-calendar
echo - date-fns
echo.
npm install --legacy-peer-deps
echo.
echo Installation complete!
echo.
echo You can now run: npm run dev
pause 