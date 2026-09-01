// Uzum.uz tovar sahifasiga "Xitoydan top" tugmasini qoʻshadi.
//
// PROVAYDER HALI ULANMAGAN: tugma bosilganda backendga soʻrov
// yuboriladi, backend keshdan yoki provayder API dan javob beradi.

const BACKEND_URL = 'https://api.selleros.uz';
const TUGMA_ID = 'selleros-xitoy-tugma';

function tovarIdOl(): number | null {
  const mos = window.location.pathname.match(/\/product\/(\d+)/);
  return mos ? Number(mos[1]) : null;
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

    tugma.textContent = 'Qidirilmoqda...';
    tugma.disabled = true;

    try {
      const javob = await fetch(`${BACKEND_URL}/xitoy-qidiruv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: pid }),
      });
      const data = await javob.json();

      if (data.xato) {
        tugma.textContent = `Xato: ${data.xato}`;
      } else if (data.natijalar?.length) {
        tugma.textContent = `${data.natijalar.length} ta topildi`;
        natijalarniKorsat(data.natijalar);
      } else {
        tugma.textContent = 'Natija topilmadi';
      }
    } catch {
      tugma.textContent = 'Tarmoq xatosi';
    } finally {
      tugma.disabled = false;
    }
  });

  return tugma;
}

interface Natija {
  title: string;
  narxYuan: number;
  rasmUrl: string;
  moq: number;
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

    const rasm = document.createElement('img');
    rasm.src = n.rasmUrl;
    rasm.alt = n.title;
    qator.appendChild(rasm);

    const matn = document.createElement('div');
    matn.className = 'selleros-natija-matn';
    matn.innerHTML = `
      <strong>${escapeHtml(n.title)}</strong>
      <span>¥${n.narxYuan}</span>
      <span>MOQ: ${n.moq}</span>
    `;
    qator.appendChild(matn);

    panel.appendChild(qator);
  }

  const tugma = document.getElementById(TUGMA_ID);
  tugma?.parentElement?.insertBefore(panel, tugma.nextSibling);
}

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
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
