import json, re, pathlib
# (dokon, brend, pid, title, brand_sellers, brand_age_days, sold_30d, cat_median)
D=[("Amadora","amadora",2191965,"Ziraklar ayollar uchun kristalli qinnigul sirg’alar, 9 rang bujiteriya, Amadora taqinchoq",1,208,26,22),
("ARTERY","artery",869121,"Raqamlar bo'yicha rasm chizish ARTERY Shedevlar, 40 * 50 sm",1,1057,56,17),
("ARUA","arua",1962329,"Yostiq jild Arua Dalia DVALA",2,330,13,17),
("AYQIZ","ayqiz",585401,"Narsalarni saqlash uchun xalta, kichik, 25 * 30 sm",1,1091,284,22),
("AZALY","azaly",1584195,"Erkin bichimli, universal, zamonaviy dizayndagi ayollar ko‘ylagi",2,790,7770,22),
("Bager","bager",518924,"Ko'za Infuzor Bager M-323, shishali, 1.4 litr",2,1231,4,22),
("Barline","barline",2046478,"Barline Caramel — qahva, kokteyl va desertlar uchun karamel siropi, 1 l",1,240,13,13),
("BEBENEO","bebeneo",448896,"Ortodontik so'rg'ich №1 \"shaffof\" 0 dan 6 oygacha bo'lgan bolalar uchun",1,1047,43,13),
("BOYOO","boyoo",676800,"Shahar muhandislik mexanizmini o'zgartiruvchi robot, 12 tasi 1 da, 566 zarracha",2,1038,17,17),
("BRUCKNER","bruckner",239419,"Qora mevali choy Bruckner, limon ta'mi bilan, 25 dona",2,1109,4,26),
("Chortoq","chortoq",794851,"Ichimlik suvi Chortoq suv tabiiy, gazlangan, 1.5 litr",2,1210,464,22),
("Derimod","derimod",2069762,"DERIMOD Erkaklar uchun etik, 25WFD6719FT",2,358,60,34),
("DIVA-KIDS","divakids",859003,"Divakids tomonidan qizlar uchun pijamalar, DKM-897",2,1092,22,17),
("Furla","furla",1489762,"Furla Camelia kalit zanjiri",2,474,39,22),
("Genau","genau",1220347,"Velotrenajyor Genau Spin Bike W101 , 8 kg maxovik, maksimal vazni 120 kg SB1-05A",1,600,13,17),
("HORUN","horun",886388,"Chia urug'i, tabiiy qora \"Horun\" dan, 300 g",2,1002,288,60),
("INDENIM","indenim",805220,"INDENIM / ayollar shimlari AW8DEA17591",2,1102,4,22),
("INstreet","instreet",2177181,"INstreet еrkaklar uchun futbolka",1,201,9,13),
("Kanishka","kanishka",1887742,"KANISHKA brelok IKKITALI",1,359,22,22),
("KAYZER оснастка","kayzer",1142070,"Yog'och arra pichog'i 165*20*24T",1,638,4,13),
("kezy","kezy",2120343,"Kezy Involne Rangli Soch rangi Qora va Moviy 1.1 100ml",2,219,17,13),
("KikkaBoo","kikkaboo",1935537,"KikkaBoo Moony me up, 220 ml, somonli ichimlik idishi",1,287,4,17),
("KREDA","kreda",259593,"Kreda Prime-gel oziq-ovqat bo'yoqlari, geleviy, suvda eriydigan",1,1111,581,26),
("KREMBER","krember",793347,"Krember 5+, karamel va yong'oq bilan, 200 g",2,1118,305,22),
("Lamart","lamart",2064,"Sabzavot va mevalarni tozalash uchun pichoq Lamart LT2095",1,1231,4,17),
("LaQandil","laqandil",866371,"Lyustra \"LaQandil\" yotoqxona uchun qandil,  mehmonxona uchun qandil, oshxona uchun qandil",1,808,9,22),
("MacCoffee","maccoffee",45253,"Eriydigan qahva MacCoffee Classic, 100 gr",2,1209,69,22),
("Maula","maula",822951,"Ayollar qo'lqopli longsliv koftasi Maula, qora rang",1,1097,17,30),
("MeLiSSki","melisski",5700,"Bolalar aravachasi uchun matras MeLiSSki \"Yulduzlar\"",1,1228,39,13),
("Miconic","miconic",3138448,"\"Meowdidas\" Y2K uslubidagi mushuk tasviri tushirilgan futbolka",1,None,4,17),
("Mod kids","modkids",986680,"Qizlar uchun to'plam: futbolka va shimlar, bolalar kiyimlari, Mod bolalar",1,1132,297,13),
("Nuppi","nuppi",529267,"Bolalar uchun pechenye Mazzalak banan bilan, format - mini, 150 g",2,1203,224,30),
("NurKid","nurkid",1851775,"Qizlar uchun uchun maktab formasi, 100% oq paxta, yoqali ko‘ylak (5–14 yosh ), NurKid",1,371,13,13),
("PASSIM","passim",176783,"Passim butun donli suli yormasi, 700 g",2,1171,43,28),
("PMKL","pmkl",3043950,"YASHENA Yelpig‘ich shaklidagi makiyaj cho‘tkasi — pudra, xaylayter",1,37,13,17),
("PrimeKraft","primekraft",1330084,"Kollagen + Vitamin C + gialuron kislotasi, Primekraft, kukun, 200 gr",1,739,292,30),
("RESPECTWEAR","respectwear",533100,"RespectWear erkaklar jinsi shimlari",1,976,4,17),
("Rieker","rieker",815649,"Erkaklar etiklari Rieker 12042 - 00,25",1,1102,60,26),
("ROSSVIK","rossvik",602190,"Yelim-aktivatori ROSSVIK, cho'tka bilan banka, 250 ml, 1 dona",1,924,17,13),
("Samura","samura",1901060,"Oshxona pichog'i Samura Golf SG-0010 sabzavot pichog‘i AUS-8 yapon po‘latidan tayyorlangan",2,333,9,17),
("SEENTEX","seentex",315233,"Ikki kranli aralashtirgich Seentex SX353SHA-1KB ",1,1069,13,13),
("Selmir","selmir",1049672,"Maydalangan zarchava Selmir – choy, sut, ichimlik, sous go‘sht, tovuq uchun ziravor, 130 g",2,710,52,22),
("Sensilis","sensilis",1274925,"Sensilis The Cool Rescue yuz uchun mist spreyi, 150 ml, namlovchi, sezgir teri uchun",2,567,90,17),
("SERRADOR","serrador",797665,"Alon - Klassik uslubdagi erkaklar kamari - SERRADOR",1,914,305,13),
("Sitonni","sitonni",420361,"Erkaklar uchun mokasinlar Sitonni",1,1015,56,17),
("SKINEVER","skinever",2896419,"Yuz uchun oqartiruvchi SKINEVER zardobi, 10% niatsinamid bilan, pigmentatsiyaga qarshi, 30 ml",1,58,241,13),
("SOLAB","solab",1704465,"L-karnitin, SOLAB, ozishga va energiyaga moʻljallangan yogʻyoquvchi, 90 kapsula",2,391,323,13),
("Stol Stoya","stolstoya",1886510,"Stol ostidagi simli tashkilotchi / tarmoq filtri ushlagichi, 800*110*100 mm",1,351,9,22),
("TEFIA","tefia",1592647,"Qazg‘oqqa qarshi TEFIA MY TREAT losyoni, 120 ml, quruq va yog‘li bosh terisi uchun",1,442,13,17),
("VITACCI","vitacci",1849927,"Vitacci 6550221 ayollar shippagi",1,332,125,22),
("Willmoda","willmoda",1012784,"Bolalar pijamalari, qorong'ida porlaydi, Willmoda, skelet",1,1228,439,17),
("WORKPRO","workpro",1549621,"WORKPRO qurilish pichogi, neylon tutqich, zanglamaydigan pichoq, ip kesish, tugmali qul",2,460,34,17),
("Ziaja","ziaja",1807672,"Tana uchun namlantiruvchi va oziqlantiruvchi losyon, купуasu ekstrakti bilan - 300 ml",2,480,168,17),
("Магазин женского белья Walhala","walhala",152861,"Ichki kiyim to'plami Walhala, ayol, Qora",2,1153,None,26)]

def nomda(b,t):
    t,b=t.lower(),b.lower(); i=t.find(b)
    if i<0: return False
    o=' ' if i==0 else t[i-1]; k=' ' if i+len(b)>=len(t) else t[i+len(b)]
    w=re.compile(r'[^\W_]',re.UNICODE)
    return not w.match(o) and not w.match(k)

el=[]
for dokon,brend,pid,title,bs,age,sold,med in D:
    n=nomda(brend,title)
    if sold is None or age is None:
        expect='baholanmadi'
        yoq=[]
        if sold is None: yoq.append('sotuv oʻlchanmagan')
        if age is None: yoq.append('yosh oʻlchanmagan (id kalibrovka chegarasidan tashqarida)')
        sabab=f"{dokon}: " + ', '.join(yoq) + " — filtr javob bermasligi kerak"
    elif n and bs<=2 and age>=180 and med>0 and sold>=med*3:
        expect='closed_brand'
        sabab=f"{dokon} brend doʻkoni; brendni {bs} doʻkon sotadi, {age} kundan beri bor, sotuv medianadan {round(sold/med,1)}x yuqori"
    else:
        expect=None
        yoq=[]
        if not n: yoq.append('brend nomi tovar nomida yoʻq')
        if age<180: yoq.append(f'brend atigi {age} kunlik — yangi')
        if med>0 and sold<med*3: yoq.append(f'sotuv past ({sold} < {med*3})')
        sabab=f"{dokon} brend doʻkoni, lekin: " + '; '.join(yoq)
    el.append({"platform":"uzum","external_id":pid,"expect":expect,"dokon":dokon,"title":title,
      "kirish":{"brand":brend,"title":title,"sellersCount":None,"sellersStableDays":None,
                "brandSellersCount":bs,"brandAgeDays":age,"soldUnits30d":sold,
                "categoryMedianUnits30d":med},"note":sabab})

pathlib.Path('apps/backend/test/fixtures/traps.json').write_text(json.dumps({"izoh":[
 "Tuzoq roʻyxati. `supabase/seed/tuzoq_nomzodlari.sql` chiqargan, 2026-08-19.",
 "Aniqlovchi belgi — doʻkon NOMI brend nomi bilan bir xil. Filtr doʻkon",
 "nomiga umuman qaramaydi, shuning uchun test aylanma emas.",
 "`kirish` — bazadan olingan HAQIQIY oʻlchovlar.",
 "`brandAgeDays` — Uzum id soatidan: id lar ketma-ket beriladi, brendning",
 "eng kichik id li mahsuloti uning yoshini koʻrsatadi. Kalibrovka sharh",
 "sanalaridan (526 mahsulot, korrelyatsiya 0.81).",
 "`expect: null` — filtr bayroq QOʻYMASLIGI kerak.",
 "`expect: 'baholanmadi'` — maʼlumot yetishmaydi, javob bermasligi kerak.",
], "elementlar":el}, ensure_ascii=False, indent=2)+"\n")
from collections import Counter
print(Counter(e["expect"] for e in el))
