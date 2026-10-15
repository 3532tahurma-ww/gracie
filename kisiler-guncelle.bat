@echo off
rem Gracie - fotograflar\ klasorundeki karakter fotograflarini uygulamaya hazirlar (people\ ve js\data\people.js)
rem Sadece degisen klasorler islenir. Orijinal fotograflara dokunulmaz. Ayrinti: fotograflar\OKUBENI.md
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-people.ps1"
echo.
echo Bitti. Uygulamayi yenile (F5).
pause
