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
        natijalarniKorsat(javob.natijalar);
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

function natijalarniKorsat(natijalar: Natija[]): void {
  let panel = document.getElementById('selleros-xitoy-panel');
  if (panel) panel.remove();

  panel = document.createElement('div');
  panel.id = 'selleros-xitoy-panel';

  const sarlavha = document.createElement('h3');
  sarlavha.textContent = '1688 natijalar';
  panel.appendChild(sarlavha);

  for (const n of natijalar) {
    const qator = document.createElement('div');
    qator.className = 'selleros-natija';

    if (typeof n.rasmUrl === 'string' && /^https?:\/\//i.test(n.rasmUrl)) {
      const rasm = document.createElement('img');
      rasm.src = n.rasmUrl;
      rasm.alt = n.title;
      rasm.referrerPolicy = 'no-referrer';
      qator.appendChild(rasm);
    }

    const matn = document.createElement('div');
    matn.className = 'selleros-natija-matn';
    // Raqamlar provayderdan, hech narsa hisoblanmaydi. Sotuv davri
    // provayderda yozilmagan — shuning uchun "sotilgan", "oyiga" emas.
    //
    // `innerHTML` EMAS — DOM bilan. Provayder javobi ishonchsiz kirish:
    // `manzil` `javascript:` boʻlsa, havola sifatida chizilganda u
    // uzum.uz sahifasida kod boʻlib ishlardi. Sxema uchta joyda
    // kesiladi: parser (`httpManzil`), shu yerdagi tekshiruv, va
    // `a.href` ga DOM orqali berish.
    const nom = document.createElement('strong');
    if (typeof n.manzil === 'string' && /^https?:\/\//i.test(n.manzil)) {
      const a = document.createElement('a');
      a.href = n.manzil;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = n.title;
      nom.appendChild(a);
    } else {
      nom.textContent = n.title;
    }
    matn.appendChild(nom);
    const qismlar = [`¥${n.narxYuan}`, typeof n.moq === 'number' ? `MOQ: ${n.moq}` : 'MOQ: —'];
    if (typeof n.buyurtmalar === 'number') qismlar.push(`buyurtma: ${n.buyurtmalar}`);
    if (n.superZavod === true) qismlar.push('super zavod');
    else if (n.zavod === true) qismlar.push('zavod');
    if (typeof n.reyting === 'number') qismlar.push(`★ ${n.reyting}`);
    for (const q of qismlar) {
      const span = document.createElement('span');
      span.textContent = q;
      matn.appendChild(span);
    }
    qator.appendChild(matn);

    panel.appendChild(qator);
  }

  const tugma = document.getElementById(TUGMA_ID);
  tugma?.parentElement?.insertBefore(panel, tugma.nextSibling);
}

function joylashtir(): void {
  if (document.getElementById(TUGMA_ID)) return;
  if (!tovarIdOl()) return;

  // Uzum.uz tovar sahifasida "Savatga" tugmasi yoniga qoʻshish.
  // Selektor oʻzgarishi mumkin — kengaytma yangilanadi.
  const joy = document.querySelector('[data-testid="product-actions"], .product-actions, .product-page');
  if (joy) {
    joy.appendChild(tugmaYarat());
  }
}

// SPA navigatsiyasini kuzatish
const kuzatuvchi = new MutationObserver(() => joylashtir());
kuzatuvchi.observe(document.body, { childList: true, subtree: true });
joylashtir();
