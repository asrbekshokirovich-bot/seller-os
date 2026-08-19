import json, re, pathlib

# (dokon, brend, pid, title, brand_sellers, brand_reviews, sold_30d, cat_median)
D = [
("PrimeKraft","primekraft",1330084,"Kollagen + Vitamin C + gialuron kislotasi, Primekraft, kukun, 200 gr",1,6430,292,30),
("AZALY","azaly",1584195,"Erkin bichimli, universal, zamonaviy dizayndagi ayollar ko‘ylagi",2,5278,7770,22),
("HORUN","horun",886388,"Chia urug'i, tabiiy qora \"Horun\" dan, 300 g",2,3981,288,60),
("SOLAB","solab",1704465,"L-karnitin, SOLAB, ozishga va energiyaga moʻljallangan yogʻyoquvchi, 90 kapsula",2,3798,323,13),
("Selmir","selmir",1049672,"Maydalangan zarchava Selmir – choy, sut, ichimlik, sous go‘sht, tovuq uchun ziravor, 130 g",2,3441,52,22),
("MacCoffee","maccoffee",45253,"Eriydigan qahva MacCoffee Classic, 100 gr",2,3304,86,26),
("Willmoda","willmoda",1012784,"Bolalar pijamalari, qorong'ida porlaydi, Willmoda, skelet",1,1729,439,13),
("Mod kids","modkids",986680,"Qizlar uchun to'plam: futbolka va shimlar, bolalar kiyimlari, Mod bolalar",1,1706,297,13),
("Nuppi","nuppi",529267,"Bolalar uchun pechenye Mazzalak banan bilan, format - mini, 150 g",2,1554,224,26),
("PASSIM","passim",176783,"Passim butun donli suli yormasi, 700 g",2,1362,43,34),
("ARTERY","artery",869121,"Raqamlar bo'yicha rasm chizish ARTERY Shedevlar, 40 * 50 sm",1,1333,56,17),
("Chortoq","chortoq",794851,"Ichimlik suvi Chortoq suv tabiiy, gazlangan, 1.5 litr",2,1289,464,22),
("Genau","genau",1220347,"Velotrenajyor Genau Spin Bike W101 , 8 kg maxovik, maksimal vazni 120 kg SB1-05A",1,877,13,17),
("Lamart","lamart",2064,"Sabzavot va mevalarni tozalash uchun pichoq Lamart LT2095",1,807,4,17),
("SERRADOR","serrador",797665,"Alon - Klassik uslubdagi erkaklar kamari - SERRADOR",1,641,305,13),
("Maula","maula",822951,"Ayollar qo'lqopli longsliv koftasi Maula, qora rang",1,637,17,30),
("INDENIM","indenim",804546,"INDENIM ayollar tunikasi AW8KTA10174",2,571,241,17),
("Kanishka","kanishka",1887742,"KANISHKA brelok IKKITALI",1,362,22,22),
("KREDA","kreda",259593,"Kreda Prime-gel oziq-ovqat bo'yoqlari, geleviy, suvda eriydigan",1,345,581,26),
("MeLiSSki","melisski",5700,"Bolalar aravachasi uchun matras MeLiSSki \"Yulduzlar\"",1,306,39,13),
("Amadora","amadora",2191965,"Ziraklar ayollar uchun kristalli qinnigul sirg’alar, 9 rang bujiteriya, Amadora taqinchoq",1,199,26,22),
("Ziaja","ziaja",1807672,"Tana uchun namlantiruvchi va oziqlantiruvchi losyon, купуasu ekstrakti bilan - 300 ml",2,140,168,17),
("Bager","bager",518924,"Ko'za Infuzor Bager M-323, shishali, 1.4 litr",2,107,4,24),
("TEFIA","tefia",1592647,"Qazg‘oqqa qarshi TEFIA MY TREAT losyoni, 120 ml, quruq va yog‘li bosh terisi uchun",1,102,13,17),
("BRUCKNER","bruckner",239419,"Qora mevali choy Bruckner, limon ta'mi bilan, 25 dona",2,98,4,26),
("Sitonni","sitonni",420361,"Erkaklar uchun mokasinlar Sitonni",1,98,56,17),
("DIVA-KIDS","divakids",859003,"Divakids tomonidan qizlar uchun pijamalar, DKM-897",2,88,22,17),
("kezy","kezy",2120343,"Kezy Involne Rangli Soch rangi Qora va Moviy 1.1 100ml",2,76,17,13),
("SEENTEX","seentex",315233,"Ikki kranli aralashtirgich Seentex SX353SHA-1KB ",1,73,13,13),
("ROSSVIK","rossvik",602190,"Yelim-aktivatori ROSSVIK, cho'tka bilan banka, 250 ml, 1 dona",1,70,17,13),
("BEBENEO","bebeneo",448896,"Ortodontik so'rg'ich №1 \"shaffof\" 0 dan 6 oygacha bo'lgan bolalar uchun",1,66,43,13),
("WORKPRO","workpro",1549621,"WORKPRO qurilish pichogi, neylon tutqich, zanglamaydigan pichoq, ip kesish, tugmali qul",2,57,34,17),
("AYQIZ","ayqiz",585401,"Narsalarni saqlash uchun xalta, kichik, 25 * 30 sm",1,51,284,22),
("KikkaBoo","kikkaboo",1935537,"KikkaBoo Moony me up, 220 ml, somonli ichimlik idishi",1,49,4,17),
("Barline","barline",2046478,"Barline Caramel — qahva, kokteyl va desertlar uchun karamel siropi, 1 l",1,45,13,13),
("Sensilis","sensilis",1287144,"Yuz uchun quyoshdan himoyalovchi SPF 50+ Sensilis Photocorrection HA+ krem-flyuidi, 50 ml",2,38,73,9),
("LaQandil","laqandil",849382,"\"LaQandil\" Qirolicha, shiftdagi qandil",1,31,26,22),
("SKINEVER","skinever",2896419,"Yuz uchun oqartiruvchi SKINEVER zardobi, 10% niatsinamid bilan, pigmentatsiyaga qarshi, 30 ml",1,19,241,13),
("KAYZER оснастка","kayzer",1142070,"Yog'och arra pichog'i 165*20*24T",1,17,4,13),
("RESPECTWEAR","respectwear",533100,"RespectWear erkaklar jinsi shimlari",1,14,4,17),
("Rieker","rieker",815649,"Erkaklar etiklari Rieker 12042 - 00,25",1,11,60,26),
("Samura","samura",1901060,"Oshxona pichog'i Samura Golf SG-0010 sabzavot pichog‘i AUS-8 yapon po‘latidan tayyorlangan",2,10,9,17),
("BOYOO","boyoo",676800,"Shahar muhandislik mexanizmini o'zgartiruvchi robot, 12 tasi 1 da, 566 zarracha",2,9,17,17),
("ARUA","arua",1962329,"Yostiq jild Arua Dalia DVALA",2,9,13,17),
("Derimod","derimod",2069762,"DERIMOD Erkaklar uchun etik, 25WFD6719FT",2,6,60,34),
("Miconic","miconic",3139015,"Porsche 911 Turbo printli erkaklar oversayz futbolkasi",1,4,None,17),
("INstreet","instreet",2179176,"U.S. POLO ASSN, Erkaklar poyabzali, 101938157",1,4,13,26),
("VITACCI","vitacci",1849927,"Vitacci 6550221 ayollar shippagi",1,3,125,22),
("NurKid","nurkid",1851775,"Qizlar uchun uchun maktab formasi, 100% oq paxta, yoqali ko‘ylak (5–14 yosh ), NurKid",1,1,13,13),
("PMKL","pmkl",3043950,"YASHENA Yelpig‘ich shaklidagi makiyaj cho‘tkasi — pudra, xaylayter",1,1,13,17),
("Stol Stoya","stolstoya",1886510,"Stol ostidagi simli tashkilotchi / tarmoq filtri ushlagichi, 800*110*100 mm",1,1,9,17),
("Furla","furla",1462766,"Furla Flow L sumkasi",2,0,4,22),
("Магазин женского белья Walhala","walhala",153420,"Ichki kiyim to'plami Walhala, ayol,Qizil ",2,0,None,24),
]

def brend_nomda(brand, title):
    t, b = title.lower(), brand.lower()
    i = t.find(b)
    if i < 0: return False
    oldin = ' ' if i == 0 else t[i-1]
    keyin = ' ' if i+len(b) >= len(t) else t[i+len(b)]
    w = re.compile(r'[^\W_]', re.UNICODE)
    return not w.match(oldin) and not w.match(keyin)

elems = []
for dokon, brend, pid, title, bs, br, sold, med in D:
    nomda = brend_nomda(brend, title)
    yopiq = nomda and bs <= 2 and br >= 200 and sold is not None and med > 0 and sold >= med*3
    if sold is None:
        sabab = "sotuv oʻlchanmagan — filtr javob bermasligi kerak"
        expect = "baholanmadi"
    elif yopiq:
        sabab = f"{dokon} brendning oʻz doʻkoni; brendni {bs} doʻkon sotadi, {br} sharh toʻplangan"
        expect = "closed_brand"
    else:
        yoq = []
        if not nomda: yoq.append("brend nomi tovar nomida yoʻq")
        if br < 200: yoq.append(f"atigi {br} sharh — yangi brend")
        if med > 0 and sold < med*3: yoq.append(f"sotuv turkum medianasidan past ({sold} < {med*3})")
        sabab = f"{dokon} brend doʻkoni, lekin: " + "; ".join(yoq)
        expect = None
    elems.append({
        "platform": "uzum", "external_id": pid, "expect": expect,
        "dokon": dokon, "title": title,
        "kirish": {"brand": brend, "title": title,
                   "sellersCount": None, "sellersStableDays": None,
                   "brandSellersCount": bs, "brandReviews": br,
                   "soldUnits30d": sold, "categoryMedianUnits30d": med},
        "note": sabab,
    })

pathlib.Path('apps/backend/test/fixtures/traps.json').write_text(json.dumps({
  "izoh": [
    "Tuzoq roʻyxati. `supabase/seed/tuzoq_nomzodlari.sql` chiqargan, 2026-08-19.",
    "Aniqlovchi belgi — doʻkon NOMI brend nomi bilan bir xil. Bu belgi",
    "filtrning signallaridan EMAS: filtr doʻkon nomiga umuman qaramaydi.",
    "`kirish` — bazadan olingan HAQIQIY oʻlchovlar, oʻylab topilgan emas.",
    "`sellersStableDays: null` — bazada 3 kunlik tarix bor, 60 kun kerak.",
    "Filtr yoshni sharh orqali isbotlaydi; shu yoʻl aynan shu yerda sinaladi.",
    "`expect: null` — filtr bayroq QOʻYMASLIGI kerak.",
    "`expect: 'baholanmadi'` — maʼlumot yetishmaydi, filtr JAVOB BERMASLIGI kerak.",
  ],
  "elementlar": elems,
}, ensure_ascii=False, indent=2) + "\n")

from collections import Counter
print(Counter(e["expect"] for e in elems))
