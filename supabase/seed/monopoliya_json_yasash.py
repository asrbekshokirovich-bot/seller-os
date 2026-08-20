import json, pathlib

# Perepis boʻyicha: (id, nom, dokon, top3_foiz) — qamrov 100%
TOLIQ = [
  (15461,"Praline konfetlari",9,100),(14287,"Guruch",23,98),
  (15462,"Jele konfetlari",17,98),(12868,"Chop etish uchun qogʻoz",293,97),
  (16263,"SIM-kartalar",8,97),(14342,"Krekerlar",27,97),
  (16020,"Sut",13,96),(12052,"Filtrli kuvshinlar",57,96),
  (14621,"Bir martali tagliklar",28,96),(12920,"Dush uchun gellar",82,95),
  (14343,"Suxarilar, krekerlar",21,95),(13730,"Burchaklar va ushlagichlar",32,95),
  # salbiy: koʻp sotuvchi, past konsentratsiya
  (12980,"Simsiz quloqchinlar",3566,16),(12648,"Parfyumlangan suv",2448,21),
  (11770,"Sumkalar",2439,12),(11937,"Qoplamalar",2054,20),
  (2610,"Soat",1726,18),(13069,"Kiyim toʻplamlari",1648,23),
  (13983,"Krossovkalar",1525,15),(11574,"Bilaguzuklar",1499,23),
  (14251,"Kiprik uchun tushlar",1495,18),(13061,"Ziraklar",1456,19),
]

# Yupqa namuna: (id, nom, olchangan, namuna_top3, haqiqiy_dokon, haqiqiy_top3)
YUPQA = [
  (12980,"Simsiz quloqchinlar",22,43,3565,16),
  (15271,"Smartfonlar Android",20,39,1059,27),
  (11937,"Qoplamalar",10,76,2052,21),
  (12663,"Stikerlar",9,60,341,30),
  (11770,"Sumkalar",9,63,2439,12),
  (13061,"Ziraklar",8,57,1452,19),
  (12394,"Choʻtkalar va shpatellar",8,79,720,43),
]

el = []
for cid, nom, dokon, top3 in TOLIQ:
    monopol = dokon >= 8 and top3 > 70
    el.append({
      "platform":"uzum","category_external_id":cid,
      "expect":"monopoly" if monopol else None,
      "turkum":nom,
      "kirish":{"categoryId":cid,"name":nom,
                "top3SharePercent":top3,"measuredSellers":dokon,"totalSellers":dokon},
      "note": (f"{nom}: {dokon} sotuvchi, top-3 ulushi {top3}% — perepisdan, qamrov 100%"
               if monopol else
               f"{nom}: {dokon} sotuvchi, top-3 atigi {top3}% — bozor tarqoq, tuzoq emas"),
    })

for cid, nom, olch, ntop3, jami, htop3 in YUPQA:
    el.append({
      "platform":"uzum","category_external_id":cid,
      "expect":"baholanmadi",
      "turkum":f"{nom} (yupqa namuna)",
      "kirish":{"categoryId":cid,"name":nom,
                "top3SharePercent":ntop3,"measuredSellers":olch,"totalSellers":jami},
      "note": (f"{nom}: namuna {olch}/{jami} = {round(100*olch/jami)}% qamrov. "
               f"Namuna ulushi {ntop3}%, haqiqiy {htop3}%. "
               "Filtr javob BERMASLIGI kerak — namuna qiyshiq."),
    })

pathlib.Path('apps/backend/test/fixtures/monopoliya.json').write_text(json.dumps({
  "izoh":[
    "6-tuzoq roʻyxati. Oʻlchov sanasi 2026-08-19/20.",
    "Konsentratsiya PEREPISDAN hisoblanadi (butun turkum, hamma doʻkon),",
    "2-qatlam namunasidan EMAS. Sabab: namuna konsentratsiyani 2–4",
    "barobar oshirib koʻrsatadi — 'yupqa namuna' qatorlariga qarang.",
    "`expect: 'baholanmadi'` — qamrov past, filtr javob bermasligi kerak.",
  ],
  "elementlar": el,
}, ensure_ascii=False, indent=2)+"\n")
from collections import Counter
print(Counter(e["expect"] for e in el))
