// Uzum.uz tovar sahifasiga "Xitoydan top" tugmasini qoʻshadi.
//
// TARMOQQA CHIQMAYDI. Soʻrovni servis ishchisi (`background.ts`)
// yuboradi va natijani xabar orqali qaytaradi.
//
// NEGA. Manifest V3 da content script sahifaning (uzum.uz)
// manshasidan soʻrov yuboradi va CORS ga tushadi. Birinchi yozuvda
// `fetch` aynan shu yerda edi va manzil ham mavjud boʻlmagan domenga
// (`api.selleros.uz`) qaragan — yaʼni tugma nashr qilingan kunidan
// beri faqat "Tarmoq xatosi" berardi.

const TUGMA_ID = 'selleros-xitoy-tugma';
const PANEL_ID = 'selleros-xitoy-panel';
/** Uzum.uz tovar sahifasida tugma qoʻyiladigan blok. Selektor oʻzgarishi mumkin — kengaytma yangilanadi. */
const JOY_SELEKTOR = '[data-testid="product-actions"], .product-actions, .product-page';
/**
 * Seller OS chat manzili — "toʻliq hisob" havolasi uchun. Boʻsh boʻlsa
 * havola chizilmaydi (manzil nazoratchidan olinadi, kodda taxmin yoʻq).
 */
const SELLEROS_SAYT = '';

function tovarIdOl(): number | null {
  const mos = window.location.pathname.match(/\/product\/(\d+)/);
  return mos ? Number(mos[1]) : null;
}

/**
 * Sahifadagi tovar rasmi — provayder RASM boʻyicha qidiradi.
 *
 * Oʻlchandi 2026-09-25 (Uzum GraphQL `Product.photos[].key`,
 * serverdan): rasm manzili `https://images.uzum.uz/<key>/<oʻlcham>`
 * shaklida; `t_product_540_high.jpg` HEAD 200 (image/webp) qaytardi.
 * Sahifadagi birinchi shunday rasm tovarning asosiy rasmi. Bazada
 * rasm hali yoʻq, shuning uchun u shu yerdan olinadi.
 *
 * Topilmasa `null` — uch buni "rasm kelmadi" deb ochiq aytadi.
 */
function rasmUrlOl(): string | null {
  for (const img of Array.from(document.images)) {
    const m = (img.currentSrc || img.src || '').match(/images\.uzum\.uz\/([a-z0-9]+)\//);
    if (m) return `https://images.uzum.uz/${m[1]}/t_product_540_high.jpg`;
  }
  return null;
}

interface Javob {
  natijalar?: Natija[];
  izoh?: string;
  xato?: string;
  /** CBU kursi — server beradi; boʻlmasa faqat yuan koʻrsatiladi. */
  kurs?: { somPerYuan: number; sana: string; manba?: string } | null;
  /** Kunlik limit (server `so_xitoy_limit`): qolgan/limit. */
  limit?: { qolgan?: number; limit?: number } | null;
  /** 72 soatlik keshdan qaytdi — narxlar shuncha eski boʻlishi mumkin. */
  keshdan?: boolean;
}

interface Meta {
  kurs: { somPerYuan: number; sana: string; manba?: string } | null;
  limit: { qolgan?: number; limit?: number } | null;
  keshdan: boolean;
  productId: number;
}

function tugmaYarat(): HTMLButtonElement {
  const tugma = document.createElement('button');
  tugma.id = TUGMA_ID;
  tugma.textContent = 'Xitoydan top';
  tugma.title = 'Seller OS: 1688 dan oʻxshash tovarlarni topish';
  tugma.addEventListener('click', async () => {
    const pid = tovarIdOl();
    if (!pid) {
      tugma.textContent = 'Tovar topilmadi';
      return;
    }

    // Apify qidiruvi 30–90 s (background.ts har 5 s da tekshiradi).
    tugma.textContent = 'Qidirilmoqda… (1–2 daqiqa)';
    tugma.disabled = true;

    try {
      const javob: Javob = await chrome.runtime.sendMessage({
        tur: 'xitoy-qidiruv',
        productId: pid,
        rasmUrl: rasmUrlOl(),
      });

      if (!javob) {
        tugma.textContent = 'Javob kelmadi';
      } else if (javob.xato) {
        tugma.textContent = `Xato: ${javob.xato}`;
      } else if (javob.natijalar?.length) {
        tugma.textContent = `${javob.natijalar.length} ta topildi`;
        natijalarniKorsat(javob.natijalar, {
          kurs: javob.kurs ?? null,
          limit: javob.limit ?? null,
          keshdan: javob.keshdan === true,
          productId: pid,
        });
      } else if (javob.izoh) {
        // Boʻsh roʻyxatni "Xitoyda oʻxshashi yoʻq" deb oʻqish mumkin
        // edi, holbuki hech kim qidirmagan. Sabab koʻrsatiladi.
        tugma.textContent = javob.izoh;
      } else {
        tugma.textContent = 'Natija topilmadi';
      }
    } catch (e) {
      tugma.textContent = `Xato: ${(e as Error)?.message ?? 'nomaʼlum'}`;
    } finally {
      tugma.disabled = false;
    }
  });

  return tugma;
}

interface Natija {
  title: string;
  narxYuan: number;
  /** `null` — provayder rasm bermadi. */
  rasmUrl: string | null;
  /** `null` — provayder bermadi; chiziqcha, nol emas. */
  moq: number | null;
  manzil?: string | null;
  /** Buyurtmalar soni (jami, davri yoʻq) — Apify `bookedCount`. */
  buyurtmalar?: number | null;
  zavod?: boolean | null;
  superZavod?: boolean | null;
  reyting?: number | null;
  oxshashlikOrni?: number | null;
}

/** Soʻm — kurs boʻlsa; boʻlmasa `null` (yuan qoladi, nol yozilmaydi). */
function somga(narxYuan: number, kurs: Meta['kurs']): number | null {
  if (kurs === null || !Number.isFinite(kurs.somPerYuan) || kurs.somPerYuan <= 0) return null;
  return Math.round(narxYuan * kurs.somPerYuan);
}

function somMatni(x: number): string {
  return `${x.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} soʻm`;
}

function httpsManzil(x: unknown): x is string {
  return typeof x === 'string' && /^https?:\/\//i.test(x);
}

/**
 * Natijalar paneli. Tugmalar qatorining ICHIGA emas, oʻsha blokdan KEYIN
 * qoʻyiladi — aks holda flex qatorida siqilib (0.1.2 da 170 px), rasmlar
 * yoʻqolardi. Raqamlar provayderdan, soʻm — server bergan CBU kursi bilan;
 * hech narsa taxmin qilinmaydi.
 */
function natijalarniKorsat(natijalar: Natija[], meta: Meta): void {
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;

  // ---- sarlavha + yopish
  const bosh = document.createElement('div');
  bosh.className = 'selleros-panel-bosh';
  const sarlavha = document.createElement('h3');
  sarlavha.textContent = `1688 natijalar (${natijalar.length})`;
  bosh.appendChild(sarlavha);
  const yopish = document.createElement('button');
  yopish.type = 'button';
  yopish.className = 'selleros-yopish';
  yopish.textContent = 'Yopish';
  yopish.addEventListener('click', () => panel.remove());
  bosh.appendChild(yopish);
  panel.appendChild(bosh);

  // ---- holat qatori: kesh, limit, kurs
  const holat: string[] = [];
  if (meta.keshdan) holat.push('72 soatlik keshdan — narxlar shuncha eski boʻlishi mumkin');
  if (meta.limit && typeof meta.limit.qolgan === 'number' && typeof meta.limit.limit === 'number') {
    holat.push(`bugun ${meta.limit.limit - meta.limit.qolgan}/${meta.limit.limit} qidiruv ishlatildi`);
  }
  if (meta.kurs) holat.push(`kurs: ${meta.kurs.manba ?? 'CBU'}, 1 yuan = ${meta.kurs.somPerYuan} soʻm (${meta.kurs.sana})`);
  else holat.push('kurs olinmadi — narxlar faqat yuanda');
  const holatEl = document.createElement('div');
  holatEl.className = 'selleros-panel-holat';
  holatEl.textContent = holat.join(' · ');
  panel.appendChild(holatEl);

  // ---- qatorlar
  natijalar.forEach((n, i) => {
    const qator = document.createElement('div');
    qator.className = 'selleros-natija';

    if (httpsManzil(n.rasmUrl)) {
      const rasm = document.createElement('img');
      rasm.src = n.rasmUrl;
      rasm.alt = `1688 taklif ${i + 1}`;
      rasm.referrerPolicy = 'no-referrer';
      rasm.loading = 'lazy';
      qator.appendChild(rasm);
    }

    const matn = document.createElement('div');
    matn.className = 'selleros-natija-matn';

    // Oʻqiladigan nom: "1688 taklif №N · ochish" (havola), xitoycha nom
    // kichik shrift bilan pastda — agent uchun kerak, sotuvchi uchun emas.
    //
    // `innerHTML` EMAS — DOM bilan. Provayder javobi ishonchsiz kirish:
    // `manzil` `javascript:` boʻlsa, havola sifatida chizilganda u
    // uzum.uz sahifasida kod boʻlib ishlardi. Sxema uchta joyda
    // kesiladi: parser (`httpManzil`), shu yerdagi tekshiruv, va
    // `a.href` ga DOM orqali berish.
    const nom = document.createElement('strong');
    if (httpsManzil(n.manzil)) {
      const a = document.createElement('a');
      a.href = n.manzil;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `1688 taklif №${i + 1} · ochish`;
      nom.appendChild(a);
    } else {
      nom.textContent = `1688 taklif №${i + 1}`;
    }
    matn.appendChild(nom);

    const xitoycha = document.createElement('span');
    xitoycha.className = 'selleros-xitoycha';
    xitoycha.textContent = n.title;
    xitoycha.title = n.title;
    matn.appendChild(xitoycha);

    const narx = document.createElement('span');
    narx.className = 'selleros-narx';
    const som = somga(n.narxYuan, meta.kurs);
    narx.textContent = som === null ? `¥${n.narxYuan}` : `¥${n.narxYuan} ≈ ${somMatni(som)}`;
    matn.appendChild(narx);

    // Raqamlar provayderdan, hech narsa hisoblanmaydi. Sotuv davri
    // provayderda yozilmagan — shuning uchun "sotilgan", "oyiga" emas.
    const qismlar = [typeof n.moq === 'number' ? `MOQ: ${n.moq}` : 'MOQ: —'];
    if (typeof n.buyurtmalar === 'number') qismlar.push(`buyurtma: ${n.buyurtmalar}`);
    if (n.superZavod === true) qismlar.push('super zavod');
    else if (n.zavod === true) qismlar.push('zavod');
    if (typeof n.reyting === 'number') qismlar.push(`★ ${n.reyting.toFixed(1)}`);
    const qism = document.createElement('span');
    qism.textContent = qismlar.join(' · ');
    matn.appendChild(qism);

    qator.appendChild(matn);
    panel.appendChild(qator);
  });

  // ---- oxiri: chatga koʻprik
  const oxiri = document.createElement('div');
  oxiri.className = 'selleros-panel-oxiri';
  if (SELLEROS_SAYT) {
    const a = document.createElement('a');
    a.href = `${SELLEROS_SAYT}/usta`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Toʻliq hisob (chegara narx, kargo, soliq) — Seller OS chatida';
    oxiri.appendChild(a);
  } else {
    oxiri.textContent = 'Toʻliq hisob (chegara narx, kargo, soliq) — Seller OS chatida.';
  }
  panel.appendChild(oxiri);

  // Tugmalar blokidan KEYIN, toʻliq kenglikda. Blok topilmasa — tugmadan keyin.
  const joy = document.querySelector(JOY_SELEKTOR);
  const tugma = document.getElementById(TUGMA_ID);
  if (joy?.parentElement) joy.parentElement.insertBefore(panel, joy.nextSibling);
  else tugma?.parentElement?.insertBefore(panel, tugma.nextSibling);
}

function joylashtir(): void {
  if (document.getElementById(TUGMA_ID)) return;
  // Panel ochiq turganda sahifa oʻzgarsa (SPA) tugma qayta qoʻyiladi, panel qoladi.
  if (!tovarIdOl()) return;

  // Uzum.uz tovar sahifasida "Savatga" tugmasi yoniga qoʻshish.
  // Selektor oʻzgarishi mumkin — kengaytma yangilanadi.
  const joy = document.querySelector(JOY_SELEKTOR);
  if (joy) {
    joy.appendChild(tugmaYarat());
  }
}

// SPA navigatsiyasini kuzatish
const kuzatuvchi = new MutationObserver(() => joylashtir());
kuzatuvchi.observe(document.body, { childList: true, subtree: true });
joylashtir();
