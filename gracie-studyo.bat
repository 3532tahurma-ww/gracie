@echo off
rem Gracie Studyo - kisiler ve fotograflar, diyalog editoru, bot kurallari (tarayicida acilir)
cd /d "%~dp0"
title Gracie Studyo
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\studio-server.ps1"
if errorlevel 1 pause
