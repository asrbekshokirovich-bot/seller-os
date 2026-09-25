# KALIT QO'YISH - maxfiy kalitni Supabase Edge Function secret'iga yuboradi.
#
# NEGA BU SKRIPT. QOIDALAR.md: maxfiy narsa faqat env'da, chatga va
# repoga hech qachon tushmaydi. Nazoratchi kalitni SHU OYNADA yozadi,
# skript uni Supabase'ga beradi va xotiradan o'chiradi. Agent (Claude)
# kalitni ko'rmaydi: bu fayl tayyor bo'lgach agent ishtirok etmaydi.
#
# QANDAY ISHLAYDI.
#   1. Kalit yashirin so'raladi (Read-Host -AsSecureString) - ekranda
#      yulduzcha ham chiqmaydi, tarixga tushmaydi.
#   2. Qiymat VAQTINCHA faylga yoziladi (faqat shu foydalanuvchi o'qiy
#      oladi) va `supabase secrets set --env-file` bilan yuboriladi.
#      Argument sifatida BERILMAYDI: argument Task Manager'da ko'rinadi.
#   3. Vaqtinchalik fayl DARHOL o'chiriladi (xato bo'lsa ham - finally).
#   4. `supabase secrets list` bilan NOMI borligi tekshiriladi (qiymat
#      hech qachon qaytmaydi, faqat digest).
#
# ISHLATISH:  scripts\kalit-qoy.cmd   (ikki marta bosish yetarli)
#        yoki powershell -ExecutionPolicy Bypass -File scripts\kalit-qoy.ps1 -Nom GEMINI_API_KEY

param(
  [string]$Nom = 'XITOY_API_KEY',
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

if ($Nom -notmatch '^[A-Z][A-Z0-9_]*$') { Toxta "Secret nomi faqat KATTA harf, raqam va _ : '$Nom'" }

$cli = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $cli) { Toxta "supabase CLI topilmadi. O'rnatish: https://supabase.com/docs/guides/cli" }

Write-Host ''
Write-Host '=== Supabase secret qo''yish ===' -ForegroundColor Cyan
Write-Host "Loyiha : $Loyiha (marketplace-analyzer)"
Write-Host "Nom    : $Nom"
Write-Host ''
Write-Host 'Kalitni yozing va Enter bosing. Yozganingiz EKRANDA KO''RINMAYDI - bu normal.' -ForegroundColor Yellow
Write-Host '(Bekor qilish: bo''sh qoldirib Enter)'
Write-Host ''

$xavfsiz = Read-Host -Prompt "$Nom" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($xavfsiz)
try { $qiymat = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

$qiymat = $qiymat.Trim()
if ($qiymat.Length -eq 0) { Write-Host 'Bekor qilindi, hech narsa yuborilmadi.'; Read-Host 'Enter' | Out-Null; exit 0 }
if ($qiymat -match '\s') { $qiymat = $null; Toxta 'Kalit ichida bo''sh joy bor - noto''g''ri nusxa olingan bo''lsa kerak.' }
if ($qiymat.Length -lt 8) { $qiymat = $null; Toxta 'Kalit juda qisqa (8 belgidan kam) - to''liq nusxa olinmagan.' }
Write-Host "Qabul qilindi: $($qiymat.Length) belgi (qiymat ko'rsatilmaydi)."

# Vaqtinchalik env fayl - faqat joriy foydalanuvchi o'qiydi.
$vaqt = Join-Path $env:TEMP ("so-secret-" + [guid]::NewGuid().ToString('N') + '.env')
try {
  [IO.File]::WriteAllText($vaqt, "$Nom=$qiymat`n", (New-Object Text.UTF8Encoding($false)))
  $qiymat = $null
  icacls $vaqt /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null

  Write-Host ''
  Write-Host 'Supabase''ga yuborilmoqda...'
  # CLI "yangi versiya bor" eslatmasini stderr'ga yozadi. 'Stop' rejimida
  # PowerShell 5.1 buni xato deb to'xtatadi (sinovda o'lchandi) - shu
  # chaqiruv atrofida 'Continue', natija $LASTEXITCODE bilan tekshiriladi.
  $ErrorActionPreference = 'Continue'
  $chiqish = & supabase secrets set --env-file $vaqt --project-ref $Loyiha 2>&1
  $kod = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  # CLI chiqishida qiymat bo'lmaydi, lekin baribir faqat xato holatda ko'rsatamiz.
  if ($kod -ne 0) { Toxta ("supabase secrets set muvaffaqiyatsiz (kod $kod):`n" + ($chiqish -join "`n")) }
}
finally {
  if (Test-Path $vaqt) { Remove-Item $vaqt -Force -ErrorAction SilentlyContinue }
  $qiymat = $null
  $xavfsiz.Dispose()
}

# Tekshiruv: nom ro'yxatda bormi (faqat digest qaytadi, qiymat emas).
$ErrorActionPreference = 'Continue'
$royxat = & supabase secrets list --project-ref $Loyiha 2>&1 | Out-String
$ErrorActionPreference = 'Stop'
if ($royxat -match "(?m)^\s*$Nom\s*\|") {
  Write-Host ''
  Write-Host "TAYYOR: '$Nom' Supabase'da turibdi. Endi Claude'ga 'qo'ydim' deb yozing." -ForegroundColor Green
} else {
  Toxta "Yuborildi deb aytildi, lekin ro'yxatda '$Nom' ko'rinmadi. Chiqish:`n$royxat"
}

if (Test-Path $vaqt) { Toxta ('Vaqtinchalik fayl o''chmadi - qo''lda o''chiring: ' + $vaqt) }
Write-Host ''
Read-Host 'Yopish uchun Enter bosing' | Out-Null
