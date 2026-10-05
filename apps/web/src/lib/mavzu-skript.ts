/**
 * Mavzu skripti — server layoutda ishlatiladi, shuning uchun React'siz
 * alohida fayl (`mavzu.ts` dagi hook faqat brauzerda).
 *
 * Ildiz layoutning `<head>` idagi skript: HTML oʻqilayotganda, chizishdan
 * oldin `<html data-mavzu>` va `<html lang>` ni brauzer xotirasidan qoʻyadi
 * (Next.js: «Preventing flash before hydration»).
 */

export const MAVZU_KALIT = 'so_mavzu';

/** Brauzer panelining rangi (telefon) — sahifa fonida. */
export const PANEL_RANGI = { tungi: '#13100C', yorug: '#F4EFE6' } as const;

/**
 * Til: avval brauzer xotirasi (`so_til`), boʻlmasa cookie (`tilniSaqla`
 * ikkalasini yozadi). Xotira yopiq boʻlsa ham (xususiy oyna) mavzu
 * standartga, til cookie ga tushadi.
 *
 * Til ruscha boʻlsa kirill shriftlari ham darhol yuklana boshlaydi (lotin
 * toʻplamlari `layout.tsx` da oldindan yuklanadi) — aks holda ruscha
 * sarlavhalar avval zaxira shriftda chiqib, keyin "sakrardi".
 *
 * Yorugʻ mavzuda `theme-color` ham shu yerda almashadi (ildiz layout
 * tungi rangni qoʻyadi): mavzu tugmasi yoʻq sahifada ham (/olchov)
 * brauzer paneli sahifa fonida boʻlsin.
 *
 * `data-skript` — skript ishladi: globals.css dagi «notoʻgʻri til
 * yashirin» qoidasi faqat shunda yoqiladi (JS butunlay oʻchiq boʻlsa
 * sahifa yashirin qolib ketmasin).
 */
export const MAVZU_SKRIPTI = `(function(){var d=document.documentElement,m,t,c;try{m=localStorage.getItem("${MAVZU_KALIT}");t=localStorage.getItem("so_til")}catch(e){}try{if(t!=="ru"&&t!=="uz"){c=document.cookie.match(/(?:^|; )so_til=(ru|uz)(?:;|$)/);t=c&&c[1]}}catch(e){}d.setAttribute("data-mavzu",m==="yorug"?"yorug":"tungi");if(t==="ru"||t==="uz")d.lang=t;if(t==="ru")["onest","unbounded"].forEach(function(n){var l=document.createElement("link");l.rel="preload";l.as="font";l.type="font/woff2";l.crossOrigin="anonymous";l.href="/fonts/"+n+"-cyrillic.woff2";document.head.appendChild(l)});d.setAttribute("data-skript","");try{c=document.querySelector("meta[name='theme-color']");if(c&&m==="yorug")c.setAttribute("content","${PANEL_RANGI.yorug}")}catch(e){}})()`;
