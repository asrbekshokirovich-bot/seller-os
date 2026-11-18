// Yon panel — FAQAT CHAT (nazoratchi qarori, 2026-09-29).
//
// Panelda ZumSavdo saytining `/usta` sahifasi (suhbat) ramkada ochiladi.
// Boshqa hech narsa chizilmaydi: kartochka ham, natijalar ham, hisob ham —
// hammasi chatning oʻzida.
//
// SESSIYA. Ramka ichida sayt cookie'si ishlamaydi (uchinchi tomon
// konteksti). Shuning uchun tokenni orqa xizmat beradi (u
// `chrome.storage.local` da, Uzum sahifasidagi tugma bilan BIR XIL sessiya —
// kunlik limit va kesh bitta). Token manzil hash'ida sahifaga uzatiladi
// (`#sessiya=…&kengaytma=1`): hash serverga ketmaydi, sahifa uni
// `x-sessiya` sarlavhasida yuboradi.

import { uzumOchishManzillari } from './uzum-och';

/**
 * ZumSavdo sayt manzili (Vercel). Nazoratchi beradi; boʻsh boʻlsa panel
 * rostini aytadi va hech qayerga ulanmaydi — kodda taxminiy manzil yoʻq.
 */
const SAYT = 'https://zumsavdo.vercel.app';

function xabarYoz(matn: string): void {
  const el = document.getElementById('xabar');
  if (el) { el.textContent = matn; el.hidden = false; }
}

async function sessiyaTokeni(): Promise<string | null> {
  try {
    const j = (await chrome.runtime.sendMessage({ tur: 'sessiya' })) as { token?: string | null } | undefined;
    return typeof j?.token === 'string' && j.token ? j.token : null;
  } catch {
    return null;
  }
}

async function boshla(): Promise<void> {
  const ramka = document.getElementById('chat');
  if (!(ramka instanceof HTMLIFrameElement)) return;
  if (!SAYT) {
    xabarYoz('Sayt manzili sozlanmagan — kengaytmaning bu versiyasi chatni ocha olmaydi.');
    return;
  }
  const token = await sessiyaTokeni();
  if (!token) {
    xabarYoz('Sessiya ochilmadi — internetni tekshirib panelni qayta oching.');
    return;
  }
  ramka.src = `${SAYT}/usta#sessiya=${encodeURIComponent(token)}&kengaytma=1`;
  ramka.hidden = false;
  const el = document.getElementById('xabar');
  if (el) el.hidden = true;
}

void boshla();

// «Uzumda ochish» (0.5.0): chatdagi AI tahlilchi tugmasi → Uzum sahifalari yangi tablarda (`uzum-och.ts`).
// Faqat sayt ramkasidan; bir bosishda koʻpi bilan 3 ta; tez-tez bosilsa — 1,5 s da bir marta.
let oxirgiOchish = 0;
window.addEventListener('message', (e: MessageEvent) => {
  const ramka = document.getElementById('chat');
  if (e.origin !== SAYT || !(ramka instanceof HTMLIFrameElement) || e.source !== ramka.contentWindow) return;
  const urllar = uzumOchishManzillari(e.data);
  if (!urllar) return;
  const hozir = Date.now();
  if (hozir - oxirgiOchish < 1_500) return;
  oxirgiOchish = hozir;
  urllar.forEach((url, i) => { void chrome.tabs.create({ url, active: i === 0 }); });
});
