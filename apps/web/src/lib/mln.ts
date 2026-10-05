/**
 * Million soʻm — bir xona kasr, vergul bilan: `10 950 000` → `11,0`.
 *
 * `toFixed(1)` EMAS: u ikkilik kasrda yaxlitlaydi va 10,95 ni 10,9 ga
 * tushirardi (10.95 aslida 10.9499…). Bosh sahifadagi misol kartasida shu
 * sabab «20,9 − 10,9 = 9,9» chiqib qolgan edi. Avval yuz minglikka butun
 * son qilib yaxlitlanadi — yarmi yuqoriga ketadi.
 */
export function mlnKasr(n: number): string {
  return (Math.round(n / 100_000) / 10).toFixed(1).replace('.', ',');
}
