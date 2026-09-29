@echo off
rem Studiya (9-qadam) - Cloudflare Worker'ini joylaydi va STUDIYA_KALIT ni
rem Worker va Supabase'ga qo'yadi (qiymat ekranga chiqmaydi). Oldin: npx wrangler@4 login
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0studiya-ulash.ps1"
