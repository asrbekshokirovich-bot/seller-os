"""
Uzum komissiyasi — Uzumning oʻz kalkulyator jadvalidan `selleros.uzum_komissiya` ga.

MANBA. "Kalkulyator: Logistika va saqlash / Калькулятор: Логистика и хранение"
(Google Sheets, egasi a.yermakova@uzum.com; havolasi Uzum sotuvchi qoʻllanmasining
3-bobida — seller.uzum.uz/manual/uz/3.tariffs). Varaq: "Комиссия на продажу" —
turkum ID, FBO/FBS/DBS komissiyasi chegirmagacha, chegirma va chegirmadan keyin.

ISHLATISH:
  1) Jadvalni .xlsx qilib yuklab oling (Fayl → Yuklab olish → Microsoft Excel).
  2) uv run --with openpyxl python supabase/seed/komissiya_yangila.py <fayl.xlsx> <YYYY-MM-DD>
     — `supabase/seed/uzum_komissiya.csv` yangilanadi, stdout ga SQL chiqadi.
  3) SQL ni Supabase SQL editor da ishga tushiring. U qaytargan uchta son (soni,
     ID yigʻindisi, ID×foiz yigʻindisi) skript SQL izohida yozgani bilan BIR XIL
     boʻlishi shart — aks holda maʼlumot yoʻlda buzilgan.

QOIDALAR (docs/KOMISSIYA.md):
  - FBO, CHEGIRMADAN KEYINGI foiz — Uzum hozir aynan shuni oladi.
  - FBO da "-%" (bu sxemada sotilmaydi) — yozilmaydi: `null` qoladi, taxmin yoʻq.
  - Bir ID ikki xil foiz bilan takrorlansa — yozilmaydi (qaysi biri toʻgʻri — nomaʼlum).
  - Yarim foiz (18,5) yaxlitlanmaydi — ustun numeric(5,2) (0062).
"""

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl

VARAQ = 'Комиссия на продажу'
ID_USTUN, FBO_KEYIN_USTUN = 0, 14  # "category ID" va "Комиссия после скидки → FBO"
CSV_YOL = Path(__file__).with_name('uzum_komissiya.csv')


def oqi(xlsx: str) -> tuple[list[tuple[int, float]], dict[str, list[int]]]:
    """(yuklanadigan [id, foiz], tashlanganlar) — foiz 0–100, 2 xonagacha."""
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    qatorlar = list(wb[VARAQ].iter_rows(values_only=True))
    sarlavha = qatorlar[2]
    if sarlavha[ID_USTUN] != 'category ID' or str(sarlavha[FBO_KEYIN_USTUN]).strip() != 'comm FBO %':
        raise SystemExit(f'varaq shakli oʻzgargan: {sarlavha[:16]}')
    foizlar: dict[int, set[float]] = defaultdict(set)
    fbo_yoq: list[int] = []
    for r in qatorlar[4:]:
        if r[ID_USTUN] is None:
            continue
        i = int(r[ID_USTUN])
        x = r[FBO_KEYIN_USTUN]
        if isinstance(x, (int, float)):
            foizlar[i].add(round(float(x) * 100, 2))
        else:
            fbo_yoq.append(i)
    yuk, zid = [], []
    for i, q in sorted(foizlar.items()):
        if len(q) > 1:
            zid.append(i)
        else:
            yuk.append((i, q.pop()))
    fbo_yoq = sorted(set(fbo_yoq) - set(foizlar))
    return yuk, {'fbo_yoq': fbo_yoq, 'zid_takror': zid}


def sql(yuk: list[tuple[int, float]], manba: str, sana: str) -> str:
    """Upsert SQL: foiz boʻyicha guruh, ID lar farq (delta) bilan — 60 KB oʻrniga ~12 KB."""
    guruh: dict[float, list[int]] = defaultdict(list)
    for i, p in yuk:
        guruh[p].append(i)
    enc = []
    for p in sorted(guruh):
        ids = sorted(guruh[p])
        enc.append([int(p) if p == int(p) else p, [ids[0]] + [b - a for a, b in zip(ids, ids[1:])]])
    soni, s_id = len(yuk), sum(i for i, _ in yuk)
    s_ip = round(sum(i * p for i, p in yuk), 2)
    m = manba.replace("'", "''")
    return f"""-- Kutilgan natija: soni {soni}, id_yigindi {s_id}, id_foiz_yigindi {s_ip:.2f}
with g as (
  select (e->>0)::numeric(5,2) as foiz, d.v::bigint as delta, d.ord
  from jsonb_array_elements('{json.dumps(enc, separators=(',', ':'))}'::jsonb) e
  cross join lateral jsonb_array_elements_text(e->1) with ordinality as d(v, ord)
), ids as (
  select foiz, sum(delta) over (partition by foiz order by ord) as id from g
), ins as (
  insert into selleros.uzum_komissiya (platform, category_external_id, komissiya_foizi, manba, olchandi, updated_at)
  select 'uzum', id, foiz, '{m}', date '{sana}', now() from ids
  on conflict (platform, category_external_id) do update
    set komissiya_foizi = excluded.komissiya_foizi, manba = excluded.manba,
        olchandi = excluded.olchandi, updated_at = now()
  returning category_external_id, komissiya_foizi
)
select count(*) as soni, sum(category_external_id) as id_yigindi,
       sum(category_external_id * komissiya_foizi) as id_foiz_yigindi from ins;
"""


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    xlsx, sana = sys.argv[1], sys.argv[2]
    yuk, tashlandi = oqi(xlsx)
    with CSV_YOL.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['category_external_id', 'komissiya_foizi'])
        w.writerows([i, f'{p:g}'] for i, p in yuk)
    manba = ('Uzum jadvali «Kalkulyator: Logistika va saqlash» (a.yermakova@uzum.com), '
             '«Комиссия на продажу», FBO, chegirmadan keyin')
    print(sql(yuk, manba, sana))
    print(f'-- yuklanadi: {len(yuk)}; FBO da yoʻq: {len(tashlandi["fbo_yoq"])}; '
          f'zid takror: {tashlandi["zid_takror"]}', file=sys.stderr)


if __name__ == '__main__':
    main()
