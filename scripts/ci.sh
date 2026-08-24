#!/usr/bin/env bash
#
# CI ning HAMMA qadami — bitta buyruqda.
#
# Nega bu fayl bor. 2026-08-24 da mahalliy tekshiruv har safar qoʻlda
# yigʻilardi: `npm run lint && npm run typecheck && npx vitest run …`.
# Ikki marta shu qatorda `tayyorlash.mjs --tekshir` tushib qoldi va
# "butun CI ni mahalliy ishlatdim" degan gap notoʻgʻri chiqdi — CI
# esa oʻsha qadamda yiqildi.
#
# Xato ehtiyotsizlikda emas, SHAKLDA edi: qoʻlda yigʻiladigan roʻyxatdan
# qadam tushib qolsa, buni hech narsa koʻrsatmaydi. Roʻyxat bitta joyda
# tursa, tushib qolishi mumkin emas.
#
# `.github/workflows/ci.yml` bilan bir xil boʻlishi SHART.

set -euo pipefail
cd "$(dirname "$0")/.."

qadam() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

qadam "npm ci"
npm ci --silent

qadam "lint"
npm run lint

qadam "typecheck"
npm run typecheck

qadam "qurish (web)"
# Typecheck yetarli EMAS. `next build` boshqa narsalarni ham
# tekshiradi: server/mijoz chegarasi ("use client" yoʻq komponentda
# `useState`), sahifa marshrutlari, va bogʻliqliklarni bogʻlash.
# Ular typecheckdan oʻtadi va faqat qurishda yiqiladi — yaʼni bu
# qadam boʻlmasa, buzilgan sahifa CI dan yashil oʻtardi.
npm run build --workspace @selleros/web

qadam "testlar (Node)"
npx vitest run

qadam "oʻlik kod"
npm run olik-kod

qadam "Edge Function nusxasi manbaga mos"
node supabase/functions/tayyorlash.mjs --tekshir

qadam "testlar (Python)"
(cd apps/scraper && pip install -e '.[dev]' --quiet && python -m pytest -q)

qadam "manba-haqiqat fayllari"
for f in QOIDALAR.md SXEMA.md FORMULA.md TUZOQLAR.md BACKLOG.md; do
  test -f "$f" || { echo "$f yoʻq"; exit 1; }
done
echo "hammasi joyida"

qadam "sir omborga tushmaganmi"
NAQSH="(sb_secret_[A-Za-z0-9_-]{12,}|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[A-Za-z0-9])"
SOXTA="sb_secret_$(printf 'A%.0s' $(seq 20))"
printf '%s\n' "$SOXTA" | grep -qE "$NAQSH" || { echo "naqsh oʻlik"; exit 1; }
echo "naqsh soxta kalitni topdi — qorovul tirik"
# `--untracked` SHART.
#
# Oddiy `git grep` faqat kuzatilayotgan fayllarni koʻradi. Yaʼni
# yangi yaratilgan fayl bu tekshiruvga umuman koʻrinmaydi — u faqat
# `git add` dan KEYIN paydo boʻladi. 2026-08-24 da aynan shunday
# boʻldi: mahalliy CI yashil chiqdi, commitdan keyingi yugurishda
# esa oʻsha fayl qizardi.
#
# Sir uchun bu tartib teskari: qorovul kalitni omborga tushishidan
# OLDIN koʻrishi kerak, keyin emas. `.gitignore` dagi fayllar
# baribir chetlab oʻtiladi — `ingest/.env` shu yerda.
if git grep -nIE --untracked "$NAQSH" -- ':!*.example' ':!.github/workflows/*' ':!scripts/*'; then
  echo "sirga oʻxshash matn topildi"; exit 1
fi
echo "sir topilmadi"

printf '\n\033[1;32mHammasi yashil.\033[0m\n'
