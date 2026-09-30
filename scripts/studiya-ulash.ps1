# STUDIYA ULASH - 9-qadam Cloudflare Worker'ini joylaydi va ikki tomonga
# bir xil imzo kalitini (STUDIYA_KALIT) qo'yadi.
#
# NEGA SKRIPT. Imzo kaliti Worker'da ham, Supabase Edge Function'da ham
# BIR XIL bo'lishi kerak (HMAC, docs/STUDIYA.md). Uni hech kim ko'rmasligi
# kerak (QOIDALAR.md: maxfiy narsa faqat env'da): skript tasodifiy 32 bayt
# yasaydi, ikki joyga FAYL orqali beradi (argument emas - u Task
# Manager'da ko'rinadi), fayllarni darhol o'chiradi, qiymatni ekranga
# hech qachon chiqarmaydi. Agent (Claude) ham ko'rmaydi.
#
# OLDIN (bir marta, nazoratchi):
#   - Cloudflare hisobi va `npx wrangler@4 login` (brauzerda ruxsat);
#   - Supabase CLI kirgan bo'lsin (kalit-qoy.cmd ishlagan bo'lsa - bor).
#
# QADAMLAR:
#   1. wrangler whoami            - Cloudflare'ga kirilganmi
#   2. wrangler deploy            - Worker joylanadi, manzil chiqishdan olinadi
#   3. kalit                      - RandomNumberGenerator, 32 bayt, hex
#   4. wrangler secret bulk       - Worker'ga (JSON fayl)
#   5. supabase secrets set       - STUDIYA_KALIT + STUDIYA_URL (env fayl)
#   6. GET <manzil>/salomat       - {"ok":true,"kalit":true} kutiladi
#
# ISHLATISH:  scripts\studiya-ulash.cmd   (ikki marta bosish yetarli)
# Qayta ishga tushirish xavfsiz: yangi kalit ikki tomonga birga yoziladi.

param(
  [string]$Loyiha = 'duequijnnzcngzzvjqst'
)

$ErrorActionPreference = 'Stop'

function Toxta($xabar) {
  Write-Host ''
  Write-Host "XATO: $xabar" -ForegroundColor Red
  Write-Host ''
  Read-Host 'Yopish uchun Enter bosing' | Out-Null
  exit 1
}

# Native buyruq: stderr'dagi "yangilanish bor" kabi eslatmalar PowerShell
# 5.1 da xato deb to'xtatmasin (kalit-qoy.ps1 dagi saboq) - natija
# $LASTEXITCODE bilan tekshiriladi.
function Ishga([scriptblock]$b) {
  $ErrorActionPreference = 'Continue'
  $chiqish = & $b 2>&1 | Out-String
  $kod = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  return @{ chiqish = $chiqish; kod = $kod }
}

function YopiqFayl([string]$kengaytma, [string]$matn) {
  $yol = Join-Path $env:TEMP ('so-studiya-' + [guid]::NewGuid().ToString('N') + $kengaytma)
  [IO.File]::WriteAllText($yol, $matn, (New-Object Text.UTF8Encoding($false)))
  icacls $yol /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null
  return $yol
}

$ildiz = Split-Path -Parent $PSScriptRoot
$worker = Join-Path $ildiz 'apps\studiya-worker'
if (-not (Test-Path (Join-Path $worker 'wrangler.jsonc'))) { Toxta "Worker papkasi topilmadi: $worker" }

# npx va supabase PATH'da bo'lmasa - ma'lum joylardan.
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  $node = Join-Path $env:ProgramFiles 'nodejs'
  if (Test-Path (Join-Path $node 'npx.cmd')) { $env:Path = "$node;$env:Path" }
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { Toxta 'npx topilmadi - Node.js o''rnatilganmi?' }
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  foreach ($j in @((Join-Path $env:USERPROFILE 'bin'), (Join-Path $env:USERPROFILE 'scoop/shims'), (Join-Path $env:APPDATA 'npm'), (Join-Path $env:LOCALAPPDATA 'Microsoft/WinGet/Links'))) {
    if (Test-Path (Join-Path $j 'supabase.exe')) { $env:Path = "$j;$env:Path"; break }
  }
}
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { Toxta "supabase CLI topilmadi. O'rnatish: https://supabase.com/docs/guides/cli" }

Write-Host ''
Write-Host '=== Studiya (9-qadam) ulash ===' -ForegroundColor Cyan
Write-Host "Worker : $worker"
Write-Host "Loyiha : $Loyiha"

# ---- 1. Cloudflare'ga kirilganmi
Push-Location $worker
try {
  $w = Ishga { npx --yes wrangler@4 whoami }
  if ($w.kod -ne 0 -or $w.chiqish -match '(?i)not (authenticated|logged in)') {
    Toxta "Cloudflare'ga kirilmagan. Avval terminalda: npx wrangler@4 login`n$($w.chiqish)"
  }
  Write-Host 'Cloudflare: kirilgan.' -ForegroundColor Green

  # ---- 2. Joylash
  Write-Host 'Worker joylanmoqda...'
  $d = Ishga { npx --yes wrangler@4 deploy }
  if ($d.kod -ne 0) { Toxta "wrangler deploy muvaffaqiyatsiz (kod $($d.kod)). workers.dev subdomen so'ralgan bo'lsa - Cloudflare dashboard -> Workers & Pages da nom tanlang.`n$($d.chiqish)" }
  $m = [regex]::Match($d.chiqish, 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev')
  if (-not $m.Success) { Toxta "Joylandi, lekin workers.dev manzili chiqishda topilmadi:`n$($d.chiqish)" }
  $manzil = $m.Value
  Write-Host "Manzil : $manzil" -ForegroundColor Green

  # ---- 3. Kalit (ekranga chiqmaydi)
  $b = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($b)
  $rng.Dispose()
  $kalit = ($b | ForEach-Object { $_.ToString('x2') }) -join ''
  [Array]::Clear($b, 0, $b.Length)

  $json = $null
  $envf = $null
  try {
    # ---- 4. Worker'ga
    $json = YopiqFayl '.json' ('{"STUDIYA_KALIT":"' + $kalit + '"}')
    $s = Ishga { npx --yes wrangler@4 secret bulk $json }
    if ($s.kod -ne 0) { Toxta "wrangler secret bulk muvaffaqiyatsiz (kod $($s.kod))." }
    Write-Host "Worker : STUDIYA_KALIT qo'yildi (qiymat ko'rsatilmaydi)." -ForegroundColor Green

    # ---- 5. Supabase'ga
    $envf = YopiqFayl '.env' ("STUDIYA_KALIT=$kalit`nSTUDIYA_URL=$manzil`n")
    $kalit = $null
    $p = Ishga { supabase secrets set --env-file $envf --project-ref $Loyiha }
    if ($p.kod -ne 0) { Toxta "supabase secrets set muvaffaqiyatsiz (kod $($p.kod))." }
    Write-Host "Supabase: STUDIYA_KALIT va STUDIYA_URL qo'yildi." -ForegroundColor Green
  }
  finally {
    foreach ($f in @($json, $envf)) { if ($f -and (Test-Path $f)) { Remove-Item $f -Force -ErrorAction SilentlyContinue } }
    $kalit = $null
  }
  foreach ($f in @($json, $envf)) { if ($f -and (Test-Path $f)) { Toxta "Vaqtinchalik fayl o'chmadi - qo'lda o'chiring: $f" } }
}
finally {
  Pop-Location
}

# ---- 6. Tekshiruv (yangi versiya tarqalishi bir necha soniya olishi mumkin)
$ok = $false
for ($i = 0; $i -lt 6 -and -not $ok; $i++) {
  try {
    $j = Invoke-RestMethod -Uri "$manzil/salomat" -TimeoutSec 15
    if ($j.ok -eq $true -and $j.kalit -eq $true) { $ok = $true; break }
  } catch { }
  Start-Sleep -Seconds 3
}
if (-not $ok) { Toxta "$manzil/salomat {`"ok`":true,`"kalit`":true} qaytarmadi. Bir daqiqadan keyin qayta tekshiring." }

Write-Host ''
Write-Host "TAYYOR: Studiya ulandi ($manzil). Endi Claude'ga 'uladim' deb yozing." -ForegroundColor Green
Write-Host ''
Read-Host 'Yopish uchun Enter bosing' | Out-Null
