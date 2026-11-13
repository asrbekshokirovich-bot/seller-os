#!/usr/bin/env bash
# ZumSavdo Android — imzolash. NAZORATCHI KOMPYUTERIDA ishlaydi.
#
# GitHub'dagi «android-imzosiz» oldindan-relizidan imzosiz AAB ni oladi,
# upload kalit bilan imzolaydi va undan telefonga oʻrnatiladigan APK yasaydi.
# Kalit ham, parol ham shu kompyuterdan chiqmaydi. Parol ekranga va logga
# yozilmaydi (QOIDALAR.md §3): faqat vaqtinchalik faylda, oxirida oʻchiriladi.
#
#   bash scripts/android-imzola.sh [KALIT_PAPKA] [CHIQISH_PAPKA]
#
#   KALIT_PAPKA   — zumsavdo-upload.p12 va KALIT-MALUMOTI.txt
#                   (standart: ~/Documents/ZumSavdo-Android-kalit)
#   CHIQISH_PAPKA — tayyor ZumSavdo-<versiya>-<kod>.apk va .aab
#                   (standart: ~/Documents/ZumSavdo-Android)
#
# Kerak: Java 11+ (jarsigner yoki jdk.jartool moduli), keytool, curl.
# Batafsil: docs/ANDROID.md.
set -euo pipefail

KALIT="${1:-$HOME/Documents/ZumSavdo-Android-kalit}"
CHIQ="${2:-$HOME/Documents/ZumSavdo-Android}"
AAB_URL="https://github.com/asrbekshokirovich-bot/seller-os/releases/download/android-imzosiz/zumsavdo-imzosiz.aab"
BT_VERSIYA="1.18.1"
BT_URL="https://github.com/google/bundletool/releases/download/$BT_VERSIYA/bundletool-all-$BT_VERSIYA.jar"
KESH="${XDG_CACHE_HOME:-$HOME/.cache}/zumsavdo-android"
ALIAS="zumsavdo"

xato() { echo "XATO: $*" >&2; exit 1; }

[ -f "$KALIT/zumsavdo-upload.p12" ] || xato "kalit topilmadi: $KALIT/zumsavdo-upload.p12"
[ -f "$KALIT/KALIT-MALUMOTI.txt" ] || xato "KALIT-MALUMOTI.txt topilmadi: $KALIT"

if command -v jarsigner >/dev/null 2>&1; then
  JARSIGNER=(jarsigner)
elif java --list-modules 2>/dev/null | grep -q '^jdk.jartool@'; then
  JARSIGNER=(java -m jdk.jartool/sun.security.tools.jarsigner.Main)
else
  xato "jarsigner yoʻq — Java JDK 11+ kerak"
fi

ISH="$(mktemp -d)"
tozala() {
  if [ -f "$ISH/pw" ]; then shred -u "$ISH/pw" 2>/dev/null || rm -f "$ISH/pw"; fi
  rm -rf "$ISH"
}
trap tozala EXIT

# Parol — fayldan faylga; ekranga chiqmaydi.
sed -n 's/^Parol: *//p' "$KALIT/KALIT-MALUMOTI.txt" | head -n1 | tr -d '\r\n' > "$ISH/pw"
[ -s "$ISH/pw" ] || xato "KALIT-MALUMOTI.txt da «Parol:» qatori yoʻq"
KUTILGAN="$(sed -n 's/^SHA-256: *//p' "$KALIT/KALIT-MALUMOTI.txt" | head -n1 | tr -d '\r[:space:]')"
[ -n "$KUTILGAN" ] || xato "KALIT-MALUMOTI.txt da «SHA-256:» qatori yoʻq"

mkdir -p "$KESH"
BT="$KESH/bundletool-all-$BT_VERSIYA.jar"
if [ ! -s "$BT" ]; then
  echo "bundletool yuklanmoqda..."
  curl -sSfL --retry 3 -o "$BT.part" "$BT_URL"
  mv "$BT.part" "$BT"
fi

echo "Imzosiz AAB yuklanmoqda..."
curl -sSfL --retry 3 -o "$ISH/imzosiz.aab" "$AAB_URL"
echo "Imzosiz AAB SHA-256: $(sha256sum "$ISH/imzosiz.aab" | cut -d' ' -f1)"

VNOM="$(java -jar "$BT" dump manifest --bundle "$ISH/imzosiz.aab" --xpath /manifest/@android:versionName 2>/dev/null | tr -d '\r\n')"
VKOD="$(java -jar "$BT" dump manifest --bundle "$ISH/imzosiz.aab" --xpath /manifest/@android:versionCode 2>/dev/null | tr -d '\r\n')"
[ -n "$VNOM" ] && [ -n "$VKOD" ] || xato "AAB dan versiya oʻqilmadi"
NOM="ZumSavdo-$VNOM-$VKOD"
echo "Versiya: $VNOM ($VKOD)"

# 1) AAB — jarsigner bilan (Google AAB uchun hujjatlagan yoʻl).
cp "$ISH/imzosiz.aab" "$ISH/$NOM.aab"
"${JARSIGNER[@]}" -keystore "$KALIT/zumsavdo-upload.p12" -storetype PKCS12 \
  -storepass:file "$ISH/pw" -keypass:file "$ISH/pw" \
  -sigalg SHA256withRSA -digestalg SHA-256 \
  "$ISH/$NOM.aab" "$ALIAS" >/dev/null 2>&1 || xato "AAB imzolanmadi"

# 2) APK — imzolangan AAB dan, bundletool universal rejimi (oʻsha kalit).
java -jar "$BT" build-apks --bundle "$ISH/$NOM.aab" --output "$ISH/z.apks" --mode=universal \
  --ks "$KALIT/zumsavdo-upload.p12" --ks-pass "file:$ISH/pw" \
  --ks-key-alias "$ALIAS" --key-pass "file:$ISH/pw" >/dev/null 2>&1 || xato "APK yasalmadi"
python3 -c 'import sys, zipfile; open(sys.argv[2], "wb").write(zipfile.ZipFile(sys.argv[1]).read("universal.apk"))' \
  "$ISH/z.apks" "$ISH/$NOM.apk"

# 3) Tekshiruv: ikkala fayl ham AYNAN shu kalit bilan imzolanganmi.
#    AAB — JAR imzosi (keytool oʻqiydi). APK — minSdk 24 boʻlgani uchun faqat
#    v2/v3 imzo (APK Signing Block) boʻlishi mumkin, keytool uni koʻrmaydi:
#    sertifikat blokdan oʻqiladi va uning SHA-256 izi solishtiriladi.
aab_izi() { keytool -printcert -jarfile "$1" 2>/dev/null | sed -n 's/^[[:space:]]*SHA256: *//p' | head -n1 | tr -d '[:space:]'; }
apk_izi() {
  python3 - "$1" <<'PY'
import hashlib, struct, sys
d = open(sys.argv[1], 'rb').read()
eocd = d.rfind(b'PK\x05\x06')
cd = struct.unpack('<I', d[eocd + 16:eocd + 20])[0]
if d[cd - 16:cd] != b'APK Sig Block 42':
    sys.exit(0)
hajm = struct.unpack('<Q', d[cd - 24:cd - 16])[0]
i, oxir, juft = cd - hajm, cd - 24, {}
while i < oxir:
    n = struct.unpack('<Q', d[i:i + 8])[0]
    juft[struct.unpack('<I', d[i + 8:i + 12])[0]] = d[i + 12:i + 8 + n]
    i += 8 + n
def lp(b, o):
    l = struct.unpack('<I', b[o:o + 4])[0]
    return b[o + 4:o + 4 + l], o + 4 + l
for sxema in (0xF05368C0, 0x7109871A):  # v3, v2
    if sxema in juft:
        imzolovchi, _ = lp(lp(juft[sxema], 0)[0], 0)
        malumot, _ = lp(imzolovchi, 0)
        _, o = lp(malumot, 0)               # dayjestlar
        sertlar, _ = lp(malumot, o)         # X.509 sertifikatlar
        sert, _ = lp(sertlar, 0)
        h = hashlib.sha256(sert).hexdigest().upper()
        print(':'.join(h[k:k + 2] for k in range(0, 64, 2)))
        break
PY
}
bor="$(aab_izi "$ISH/$NOM.aab")"
[ "$bor" = "$KUTILGAN" ] || xato "AAB: imzo izi «$bor», kutilgani «$KUTILGAN»"
bor="$(apk_izi "$ISH/$NOM.apk")"
[ "$bor" = "$KUTILGAN" ] || xato "APK: imzo izi «$bor», kutilgani «$KUTILGAN»"
"${JARSIGNER[@]}" -verify "$ISH/$NOM.aab" 2>/dev/null | grep -q 'jar verified' || xato "AAB imzosi tekshiruvdan oʻtmadi"

mkdir -p "$CHIQ"
cp "$ISH/$NOM.aab" "$ISH/$NOM.apk" "$CHIQ/"
echo "Tayyor — imzo izi $KUTILGAN:"
echo "  $CHIQ/$NOM.apk"
echo "  $CHIQ/$NOM.aab"
