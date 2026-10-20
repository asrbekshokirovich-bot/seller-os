/**
 * Skreyper ishlari holati — oxirgi ishlar va qaysi qadam yiqilgani (2026-10-20).
 *
 * NEGA BU KERAK. «Skreyper (SellerOS)» ishi har safar qizil koʻrinadi — sababi
 * maʼlum («Brend qamrovini yangilash», docs/SKREYPER.md 9-boʻlim). Shu sababli
 * qizil rangga qarab haqiqiy nosozlikni (Oʻlchash, Haqiqatan oʻlchandimi) ajratib
 * boʻlmaydi. Bu skript har ishning FAQAT yiqilgan qadamlarini koʻrsatadi.
 *
 * Kalit kerak emas: ombor ochiq, GitHub API kalitsiz soatiga 60 soʻrovgacha.
 *
 *   node scripts/skreyper-holat.mjs          # oxirgi 5 ish
 *   node scripts/skreyper-holat.mjs 10       # oxirgi 10 ish
 */

const OMBOR = process.env.SKREYPER_OMBORI ?? 'asrbekshokirovich-bot/seller-os';
const API = `https://api.github.com/repos/${OMBOR}/actions`;
const soni = Math.min(Math.max(Number(process.argv[2]) || 5, 1), 20);

async function ol(url) {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

const { workflow_runs: ishlar = [] } = await ol(`${API}/workflows/skreyper.yml/runs?per_page=${soni}`);
if (!ishlar.length) {
  console.log('Ish topilmadi.');
  process.exit(0);
}
for (const ish of ishlar) {
  const { jobs = [] } = await ol(`${API}/runs/${ish.id}/jobs`);
  const qadamlar = jobs.flatMap((j) => j.steps ?? []);
  const yiqilgan = qadamlar.filter((q) => q.conclusion === 'failure').map((q) => q.name);
  const yurmoqda = qadamlar.find((q) => q.status === 'in_progress')?.name;
  const holat = ish.status !== 'completed'
    ? `yurmoqda${yurmoqda ? `: ${yurmoqda}` : ''}`
    : yiqilgan.length ? `yiqilgan: ${yiqilgan.join(', ')}` : 'hammasi yashil';
  console.log(`${ish.created_at}  ${ish.event.padEnd(17)}  ${holat}`);
}
