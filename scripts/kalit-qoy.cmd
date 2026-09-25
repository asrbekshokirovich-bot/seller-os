@echo off
rem Kalit qo'yish - PowerShell oynasini ochib scripts\kalit-qoy.ps1 ni ishga tushiradi.
rem Ixtiyoriy argument: secret nomi (standart XITOY_API_KEY). Masalan: kalit-qoy.cmd GEMINI_API_KEY
set NOM=%~1
if "%NOM%"=="" set NOM=XITOY_API_KEY
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kalit-qoy.ps1" -Nom %NOM%
