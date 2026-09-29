/**
 * Kod kartalari — suhbat ichidagi "jonli bloklar" (dizayn 1b–1d).
 *
 * RAQAMLAR API DAN. Bu yerda hech narsa hisoblanmaydi, faqat
 * koʻrsatiladi; yoʻq qiymat — chiziqcha. Tuzoq belgisi yashirilmaydi.
 * Web (`apps/web/src/app/usta/Suhbat.tsx`) bilan bir xil maydonlar,
 * faqat koʻrinish mobil dizayndan.
 *
 * TANLOV. Joriy savol shu kartaga tegishli boʻlsa (yoʻnalish, tovar,
 * 1688 taklifi) karta bosiladi va javob serverga ketadi. Tarixdagi
 * karta esa faqat koʻrsatiladi, tanlangani belgilangan holda.
 */

import * as Clipboard from 'expo-clipboard';
import { Check, Copy, ExternalLink } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { raqam, somda, YOQ } from '../lib/format';
import { havolami, rekvizitMatni, varaqaMatni } from '../lib/holat';
import { kartaSoyasi } from '../lib/mavzu';
import { useSozlama } from '../lib/sozlamalar';
import type { BuyurtmaNatija, RasmiyNatija, TannarxQatori, TovarQatori, XitoyKurs, XitoyQatori, YonalishQatori } from '../lib/turlar';
import { Karta, Matn, Ogohlik, Stat, Statlar, Teg, Tugma, type TegTuri } from './asos';

export interface Tanlov {
  /** Belgilangan qiymatlar (tarixda yoki joriy savolda). */
  tanlangan: Array<string | number>;
  /** Berilsa — karta bosiladi. Berilmasa — faqat koʻrsatiladi. */
  bos?: ((qiymat: string | number) => void) | undefined;
}

const tanlanganmi = (t: Tanlov, q: string | number) => t.tanlangan.some((x) => String(x) === String(q));

/* ------------------------------------------------------ 2-qadam: yoʻnalishlar (dizayn 1b) */

export function Yonalishlar({ royxat, eskirgan, baholanmadi, bolish, tanlov }: {
  royxat: YonalishQatori[]; eskirgan: boolean; baholanmadi: number; bolish: { sabab: string } | null; tanlov: Tanlov;
}) {
  const { r, tr } = useSozlama();
  const [birinchi, ...qolgan] = royxat;
  const byudjet = (y: YonalishQatori): { t: string; turi: TegTuri } =>
    y.yetadi === true ? { t: tr('byudjet yetadi', 'бюджета хватит'), turi: 'acc' }
      : y.yetadi === false ? { t: tr('byudjet yetmaydi', 'бюджета не хватит'), turi: 'yomon' }
        : { t: tr('byudjet: —', 'бюджет: —'), turi: 'neytral' };
  return (
    <View style={{ gap: 8 }}>
      {eskirgan && <Matn turi="kichik">{tr('Kesh 24 soatdan eski — raqamlar kechagi.', 'Кэш старше 24 часов — цифры вчерашние.')}</Matn>}
      {birinchi && (
        <Karta urgu={tanlov.bos !== undefined || tanlanganmi(tanlov, birinchi.categoryId)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexShrink: 1, gap: 8 }}>
              <Matn turi="sarlavha" style={{ fontSize: 17 }}>{birinchi.name}</Matn>
              <Teg turi={byudjet(birinchi).turi}>{byudjet(birinchi).t}</Teg>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Matn turi="izoh">{tr('ball', 'балл')}</Matn>
              <Matn turi="katta" rang={r.acc} style={{ fontSize: 30, marginTop: 2 }}>
                {birinchi.ball.value === null ? YOQ : String(birinchi.ball.value)}
              </Matn>
            </View>
          </View>
          <Statlar>
            <Stat nom={tr('Sotuvchi', 'Продавцы')} q={raqam(birinchi.dalil.sotuvchiSoni)} />
            <Stat nom={tr('Top-3 ulushi', 'Доля топ-3')} q={birinchi.dalil.top3Ulush === null ? YOQ : `${birinchi.dalil.top3Ulush}%`} />
            <Stat nom={tr('Optimal kirish', 'Оптим. вход')} q={somda(birinchi.optimalKirishSom, tr('soʻm', 'сум'))} style={{ flexBasis: '100%' }} />
          </Statlar>
          <TanlashTugmasi tanlov={tanlov} qiymat={birinchi.categoryId} />
        </Karta>
      )}
      {qolgan.map((y) => {
        const bor = tanlanganmi(tanlov, y.categoryId);
        return (
          <Pressable key={y.categoryId} disabled={!tanlov.bos} onPress={() => tanlov.bos?.(y.categoryId)} accessibilityRole="button">
            <Karta urgu={bor} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Matn style={{ fontFamily: 'Onest_600SemiBold' }} qator={1}>{y.name}</Matn>
                <Matn turi="izoh" style={{ marginTop: 2 }}>
                  {`${raqam(y.dalil.sotuvchiSoni)} ${tr('sotuvchi', 'продавцов')} · top-3 ${y.dalil.top3Ulush === null ? YOQ : `${y.dalil.top3Ulush}%`} · ${byudjet(y).t}`}
                </Matn>
              </View>
              <View style={{ minWidth: 44, height: 40, paddingHorizontal: 8, borderRadius: 12, backgroundColor: r.ichki, alignItems: 'center', justifyContent: 'center' }}>
                <Matn turi="raqam" style={{ fontSize: 16 }}>{y.ball.value === null ? YOQ : String(y.ball.value)}</Matn>
              </View>
            </Karta>
          </Pressable>
        );
      })}
      {bolish && <Matn turi="kichik">{bolish.sabab}</Matn>}
      {baholanmadi > 0 && <Matn turi="kichik">{tr(`${baholanmadi} ta nomzod baholanmadi — maʼlumot yetmadi.`, `${baholanmadi} кандидатов не оценены — не хватило данных.`)}</Matn>}
    </View>
  );
}

function TanlashTugmasi({ tanlov, qiymat }: { tanlov: Tanlov; qiymat: string | number }) {
  const { tr, r } = useSozlama();
  if (tanlanganmi(tanlov, qiymat)) {
    return <Tugma turi="yengil" ochiq={false} ikon={<Check size={16} color={r.ink} />} style={{ marginTop: 14 }}>{tr('Tanlandi', 'Выбрано')}</Tugma>;
  }
  if (!tanlov.bos) return null;
  return <Tugma onPress={() => tanlov.bos?.(qiymat)} style={{ marginTop: 14 }}>{tr('Tanlash →', 'Выбрать →')}</Tugma>;
}

/* ------------------------------------------------------ 3-qadam: tovar katalogi */

/**
 * Ulush FAQAT shu roʻyxat ichida ("roʻyxatdagi ulush") — butun turkumga
 * nisbatan emas. Reyting 0 — "baho yoʻq", baho emas (SXEMA.md).
 */
export function TovarKatalogi({ royxat, chiqarildi, tanlov }: {
  royxat: TovarQatori[]; chiqarildi: Array<{ title: string; sabab: string }>; tanlov: Tanlov;
}) {
  const { r, tr, mavzu } = useSozlama();
  const jami = royxat.reduce((s, t) => s + (t.nomzod.soldUnits30d ?? 0), 0);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {royxat.map((t) => {
          const n = t.nomzod;
          const bor = tanlanganmi(tanlov, n.productId);
          const sold = n.soldUnits30d;
          const ulush = jami > 0 && sold !== null ? Math.round((100 * sold) / jami) : null;
          const ogoh = t.bayroqlar.find((b) => b.severity !== 'note') ?? t.bayroqlar[0];
          const bahoYoq = n.reyting === null || n.reyting === undefined || (n.reyting === 0 && !n.sharhSoni);
          return (
            <Pressable
              key={n.productId}
              disabled={!tanlov.bos}
              onPress={() => tanlov.bos?.(n.productId)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: bor }}
              style={[
                { width: '48.5%', backgroundColor: r.karta, borderRadius: 18, padding: 10, gap: 6 },
                kartaSoyasi(mavzu),
                bor ? { boxShadow: `0 0 0 2px ${r.acc}` } : null,
              ]}
            >
              <View style={{ aspectRatio: 1, borderRadius: 12, backgroundColor: r.ichki, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {n.rasmUrl
                  ? <Image source={{ uri: n.rasmUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <Matn turi="katta" rang={r.ink2}>{n.title.trim().charAt(0).toUpperCase() || '·'}</Matn>}
                {bor && (
                  <View style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color={r.accInk} />
                  </View>
                )}
              </View>
              <Matn qator={2} style={{ fontSize: 13, lineHeight: 17, fontFamily: 'Onest_600SemiBold' }}>{n.title}</Matn>
              <Matn turi="izoh" qator={1}>{n.shopName ?? YOQ}</Matn>
              <Matn turi="raqam" style={{ fontSize: 15 }}>{somda(n.narxSom, tr('soʻm', 'сум'))}</Matn>
              <Matn turi="izoh">
                {`${tr('30 kunda', 'За 30 дн')}: ${sold === null ? YOQ : `${raqam(sold)} ${tr('dona', 'шт')}`} · ${n.sotuvManbasi === 'olchandi' ? tr('oʻlchandi', 'измерено') : n.sotuvManbasi === 'taxmin' ? tr('taxmin', 'оценка') : YOQ}`}
              </Matn>
              {ulush !== null && (
                <View style={{ gap: 3 }}>
                  <Matn turi="izoh">{`${tr('roʻyxatdagi ulush', 'доля в списке')} ${ulush}%`}</Matn>
                  <View style={{ height: 5, borderRadius: 999, backgroundColor: r.iz, overflow: 'hidden' }}>
                    <View style={{ width: `${ulush}%`, height: '100%', backgroundColor: r.acc }} />
                  </View>
                </View>
              )}
              <Matn turi="izoh">
                {`${bahoYoq ? tr('baho yoʻq', 'нет оценки') : `★ ${n.reyting}`} · ${n.sharhSoni === null || n.sharhSoni === undefined ? YOQ : `${raqam(n.sharhSoni)} ${tr('sharh', 'отз.')}`}`}
              </Matn>
              {t.miqdor
                ? <Matn turi="izoh">{`${tr('taklif', 'предложение')}: ${t.miqdor.dona} ${tr('dona', 'шт')}`}</Matn>
                : t.miqdorSababi ? <Matn turi="izoh">{t.miqdorSababi}</Matn> : null}
              {ogoh && <Ogohlik>{ogoh.reason}</Ogohlik>}
            </Pressable>
          );
        })}
      </View>
      {chiqarildi.length > 0 && (
        <Matn turi="kichik">
          {`${tr('Tuzoq sababli chiqarildi:', 'Исключены из-за ловушек:')} ${chiqarildi.map((c) => `${c.title} — ${c.sabab}`).join('; ')}`}
        </Matn>
      )}
    </View>
  );
}

/* ------------------------------------------------------ 4-qadam: tannarx (dizayn 1c) */

export function Chegaralar({ qatorlar, izoh }: { qatorlar: TannarxQatori[]; izoh: string | null }) {
  const { r, tr } = useSozlama();
  return (
    <Karta>
      <Matn turi="yorliq">{tr('Xitoyda chegara narx', 'Потолок цены в Китае')}</Matn>
      <View style={{ marginTop: 12, gap: 8 }}>
        {qatorlar.map((q) => (
          <View key={q.productId} style={{ backgroundColor: r.ichki, borderRadius: 16, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Matn qator={2} style={{ flex: 1, fontFamily: 'Onest_500Medium' }}>{q.title}</Matn>
              {q.miqdor !== null && <Matn turi="raqam">{`${q.miqdor} ${tr('dona', 'шт')}`}</Matn>}
            </View>
            <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Matn turi="kichik">{`${tr('Uzumda', 'На Uzum')} `}<Matn turi="raqam" style={{ fontSize: 12 }}>{somda(q.sotuvNarxiSom, tr('soʻm', 'сум'))}</Matn></Matn>
              <Matn turi="kichik">{`${tr('Marja', 'Маржа')} `}<Matn turi="raqam" style={{ fontSize: 12 }}>{q.marjaFoizi === null ? YOQ : `${q.marjaFoizi}%`}</Matn></Matn>
            </View>
            <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Matn turi="kichik">{tr('Xitoyda maksimum', 'Максимум в Китае')}</Matn>
              <Matn turi="raqam" rang={r.yaxshi} style={{ fontSize: 15 }}>{somda(q.chegaraSom, tr('soʻm', 'сум'))}</Matn>
            </View>
            {q.hisob && <Matn turi="izoh" style={{ marginTop: 6, fontFamily: 'Onest_400Regular' }}>{q.hisob}</Matn>}
            {q.yetishmaydi.length > 0 && <Matn turi="izoh" rang={r.ogoh} style={{ marginTop: 4 }}>{`${tr('Hisobga kirmadi:', 'Не учтено:')} ${q.yetishmaydi.join(', ')}`}</Matn>}
          </View>
        ))}
      </View>
      {izoh && <Matn turi="kichik" style={{ marginTop: 10 }}>{izoh}</Matn>}
    </Karta>
  );
}

/* ------------------------------------------------------ 5-qadam: 1688 takliflari (dizayn 1d) */

/**
 * Uch holat ATAYLAB farq qiladi: topildi / 1688 da oʻxshash yoʻq (bu
 * javob) / qidirilmadi (sabab). Soʻm — CBU kursi bilan; kurs yoʻq —
 * soʻm koʻrsatilmaydi. Havola faqat http(s).
 */
export function XitoyTakliflari({ qatorlar, kurs, izoh, tanlovOl }: {
  qatorlar: XitoyQatori[]; kurs: XitoyKurs | null; izoh: string | null;
  tanlovOl: (productId: number) => Tanlov;
}) {
  const { r, tr } = useSozlama();
  const holat = (h: XitoyQatori['holat']): { t: string; turi: TegTuri } =>
    h === 'topildi' ? { t: tr('topildi', 'найдено'), turi: 'yaxshi' }
      : h === 'topilmadi' ? { t: tr('1688 da oʻxshash yoʻq', 'на 1688 нет похожих'), turi: 'neytral' }
        : { t: tr('qidirilmadi', 'не искалось'), turi: 'ogoh' };
  return (
    <View style={{ gap: 8 }}>
      {qatorlar.map((q) => {
        const tanlov = tanlovOl(q.productId);
        return (
          <Karta key={q.productId}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Matn qator={2} style={{ flex: 1, fontFamily: 'Onest_600SemiBold' }}>{q.title}</Matn>
              <Teg turi={holat(q.holat).turi}>{holat(q.holat).t}</Teg>
            </View>
            <Matn turi="kichik" style={{ marginTop: 4 }}>
              {`${tr('Chegara', 'Потолок')}: ${somda(q.chegaraSom, tr('soʻm', 'сум'))} · ${tr('1688 topdi', '1688 нашёл')}: ${raqam(q.jami)}${q.keshdan ? ` · ${tr('keshdan', 'из кэша')}` : ''}`}
            </Matn>
            {(q.yetishmaydi?.length ?? 0) > 0 && (
              <Matn turi="izoh" rang={r.ogoh} style={{ marginTop: 4 }}>{`${tr('Chegaraga kirmadi:', 'В потолок не вошло:')} ${q.yetishmaydi!.join(', ')}`}</Matn>
            )}
            {q.sabab && <Matn turi="izoh" rang={r.ogoh} style={{ marginTop: 4 }}>{q.sabab}</Matn>}
            {q.holat === 'topilmadi' && q.tashxis && <Matn turi="izoh" style={{ marginTop: 4 }}>{q.tashxis}</Matn>}
            {(q.tashlandi ?? 0) > 0 && <Matn turi="izoh" style={{ marginTop: 4 }}>{`${q.tashlandi} ${tr('ta karta oʻqilmadi va koʻrsatilmadi', 'карточек не прочитано')}`}</Matn>}
            <View style={{ marginTop: 10, gap: 8 }}>
              {q.takliflar.map((t) => {
                const bor = tanlanganmi(tanlov, t.sourceId);
                return (
                  <Pressable
                    key={t.sourceId}
                    disabled={!tanlov.bos}
                    onPress={() => tanlov.bos?.(t.sourceId)}
                    accessibilityRole="button"
                    style={[
                      { backgroundColor: r.ichki, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 10 },
                      bor ? { boxShadow: `0 0 0 2px ${r.acc}`, backgroundColor: r.accYumshoq } : null,
                    ]}
                  >
                    <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: r.iz, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                      {t.rasmUrl
                        ? <Image source={{ uri: t.rasmUrl }} style={{ width: '100%', height: '100%' }} />
                        : <Matn turi="raqam" rang={r.ink2}>1688</Matn>}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <Matn qator={1} style={{ flex: 1, fontFamily: 'Onest_600SemiBold', fontSize: 13 }}>{t.title}</Matn>
                        <Matn turi="raqam" rang={r.acc} style={{ fontSize: 15 }}>{`¥${t.narxYuan}`}</Matn>
                      </View>
                      <Matn turi="izoh">
                        {`MOQ ${t.moq ?? YOQ} · ${t.reyting === null ? YOQ : `${t.reyting.toFixed(1)}★`} · ${t.buyurtmalar === null ? YOQ : `${raqam(t.buyurtmalar)} ${tr('buyurtma', 'заказов')}`} · ${t.superZavod === true ? tr('super zavod', 'супер-завод') : t.zavod === true ? tr('zavod', 'завод') : t.zavod === false ? tr('sotuvchi', 'продавец') : YOQ}`}
                      </Matn>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                        <Matn turi="kichik">{t.narxSom !== null ? `≈ ${somda(t.narxSom, tr('soʻm', 'сум'))}` : tr('soʻm: kurs yoʻq', 'сум: нет курса')}</Matn>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          {t.chegaradaMi !== null && <Teg turi={t.chegaradaMi ? 'yaxshi' : 'ogoh'}>{t.chegaradaMi ? tr('chegarada', 'в потолке') : tr('yuqori', 'выше')}</Teg>}
                          {havolami(t.manzil) && (
                            <Pressable accessibilityRole="link" accessibilityLabel={tr('1688 da ochish', 'Открыть на 1688')} onPress={() => void Linking.openURL(t.manzil!)} hitSlop={8}>
                              <ExternalLink size={16} color={r.ink2} />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Karta>
        );
      })}
      <Matn turi="kichik">
        {(kurs
          ? tr(`Kurs: ${kurs.manba}, 1 ¥ = ${raqam(kurs.somPerYuan)} soʻm (${kurs.sana}).`, `Курс: ${kurs.manba}, 1 ¥ = ${raqam(kurs.somPerYuan)} сум (${kurs.sana}).`)
          : tr('Kurs olinmadi — soʻm koʻrsatilmadi.', 'Курс не получен — сумы не показаны.')) + (izoh ? ` ${izoh}` : '')}
      </Matn>
    </View>
  );
}

/* ------------------------------------------------------ 6-qadam: buyurtma varaqasi */

function NusxaTugmasi({ matn, nom }: { matn: string; nom: string }) {
  const { r, tr } = useSozlama();
  const [bo, setBo] = useState(false);
  return (
    <Tugma
      turi="yengil"
      ikon={bo ? <Check size={16} color={r.ink} /> : <Copy size={16} color={r.ink} />}
      onPress={() => { void Clipboard.setStringAsync(matn).then(() => { setBo(true); setTimeout(() => setBo(false), 2000); }); }}
      style={{ marginTop: 12 }}
    >
      {bo ? tr('Nusxalandi', 'Скопировано') : nom}
    </Tugma>
  );
}

export function BuyurtmaVaraqasi({ n }: { n: BuyurtmaNatija }) {
  const { r, tr } = useSozlama();
  const j = n.jami;
  return (
    <Karta>
      <Matn turi="yorliq">{tr('Buyurtma varaqasi', 'Лист заказа')}</Matn>
      <View style={{ marginTop: 12, gap: 8 }}>
        {(n.qatorlar ?? []).map((x) => (
          <View key={x.productId} style={{ backgroundColor: r.ichki, borderRadius: 16, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Matn qator={2} style={{ flex: 1, fontFamily: 'Onest_500Medium' }}>{x.title}</Matn>
              <Teg turi={x.holat === 'tayyor' ? 'yaxshi' : 'ogoh'}>{x.holat === 'tayyor' ? tr('varaqada', 'в листе') : tr('tanlanmagan', 'не выбран')}</Teg>
            </View>
            {x.xitoyTitle && (
              <Pressable disabled={!havolami(x.manzil)} onPress={() => void Linking.openURL(x.manzil!)}>
                <Matn turi="izoh" qator={1} rang={havolami(x.manzil) ? r.acc : r.ink2} style={{ marginTop: 3 }}>{x.xitoyTitle}</Matn>
              </Pressable>
            )}
            <Matn turi="kichik" style={{ marginTop: 8 }}>
              {`${x.miqdor === null ? YOQ : `${x.miqdor} ${tr('dona', 'шт')}`} × ${x.narxYuan === null ? YOQ : `¥${x.narxYuan}`} = ${x.jamiYuan === null ? YOQ : `¥${x.jamiYuan}`}${x.jamiSom !== null ? ` ≈ ${somda(x.jamiSom, tr('soʻm', 'сум'))}` : ''}`}
            </Matn>
            <Matn turi="izoh" style={{ marginTop: 2 }}>{`${tr('Kargo / dona', 'Карго / шт')}: ${somda(x.kargoSom, tr('soʻm', 'сум'))}${x.kargoIzoh ? ` · ${x.kargoIzoh}` : ''}`}</Matn>
          </View>
        ))}
      </View>
      {j && (
        <>
          <Statlar>
            <Stat nom={tr('Dona', 'Штук')} q={raqam(j.dona)} />
            <Stat nom={tr('Jami ¥', 'Итого ¥')} q={j.yuan === null ? YOQ : `¥${j.yuan}`} />
            <Stat nom={tr('Jami soʻm', 'Итого сум')} q={raqam(j.som)} />
            <Stat nom={tr('Kargo jami', 'Карго итого')} q={raqam(j.kargoSom)} style={{ flexBasis: '100%' }} />
          </Statlar>
          {n.kargo?.izoh && <Matn turi="izoh" rang={r.ogoh} style={{ marginTop: 8 }}>{`${tr('Kargo hisobga kirmadi:', 'Карго не учтено:')} ${n.kargo.izoh}`}</Matn>}
          {j.tayyor > 0 && <NusxaTugmasi matn={varaqaMatni(n)} nom={tr('Varaqani nusxalash (agentga)', 'Скопировать лист (агенту)')} />}
        </>
      )}
      {n.izoh && <Matn turi="kichik" style={{ marginTop: 10 }}>{n.izoh}</Matn>}
    </Karta>
  );
}

/* ------------------------------------------------------ 7-qadam: rasmiylashtirish */

function Manba({ manba, olchandi }: { manba: string | null; olchandi: string | null }) {
  const { tr } = useSozlama();
  if (!manba && !olchandi) return null;
  return <Matn turi="izoh" style={{ marginTop: 8 }}>{`${tr('Manba', 'Источник')}: ${manba ?? YOQ}${olchandi ? ` · ${olchandi}` : ''}`}</Matn>;
}

function Havola({ url, children }: { url: string | null; children: string }) {
  const { r } = useSozlama();
  if (!havolami(url)) return <Matn turi="kichik">{children}</Matn>;
  return (
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
      <Matn turi="kichik" rang={r.acc}>{children}</Matn>
    </Pressable>
  );
}

/** Faktlar kartasi: har raqam yonida manba; fakt yoʻq — "faktda yoʻq", nol emas. */
export function RasmiyKartasi({ n }: { n: RasmiyNatija }) {
  const { r, tr } = useSozlama();
  const f = n.faktlar;
  if (!f) return <Matn turi="kichik">{n.sabab ?? tr('faktlar yoʻq', 'нет данных')}</Matn>;
  const s = n.soliq;
  const som = (x: number | null | undefined) => (x === null || x === undefined ? tr('faktda yoʻq', 'нет в фактах') : somda(x, tr('soʻm', 'сум')));
  const bepul = (x: number | null) => (x === null ? YOQ : x === 0 ? tr('bepul', 'бесплатно') : som(x));
  const rekvizit = rekvizitMatni(n);
  return (
    <View style={{ gap: 8 }}>
      {f.yetishmaydi.length > 0 && <Matn turi="kichik" rang={r.ogoh}>{`${tr('Faktda yoʻq:', 'Нет в фактах:')} ${f.yetishmaydi.join(', ')}`}</Matn>}
      <Karta>
        <Matn turi="yorliq">{tr('Soliq 2026', 'Налоги 2026')}</Matn>
        <Statlar>
          <Stat nom={tr('Ijtimoiy / oy', 'Соцналог / мес')} q={som(s?.ijtimoiySom)} izoh={f.soliq.tolovKuni !== null ? tr(`${f.soliq.tolovKuni}-sanagacha`, `до ${f.soliq.tolovKuni} числа`) : undefined} />
          <Stat nom={tr('Aylanma', 'С оборота')} q={f.soliq.aylanmaFoiz !== null ? `${f.soliq.aylanmaFoiz} %` : tr('faktda yoʻq', 'нет в фактах')} />
          <Stat nom={tr('Partiya sotilsa', 'С партии')} q={s?.aylanmaSom !== null && s?.aylanmaSom !== undefined ? som(s.aylanmaSom) : YOQ} />
          <Stat nom={tr('BHM', 'БРВ')} q={som(f.bhmSom)} izoh={f.soliq.rejimTugaydi ? tr(`rejim ${f.soliq.rejimTugaydi} gacha`, `режим до ${f.soliq.rejimTugaydi}`) : undefined} />
        </Statlar>
        <Manba manba={f.soliq.manba} olchandi={f.soliq.olchandi} />
      </Karta>
      {!n.kabinetBor && (
        <>
          <Karta>
            <Matn turi="sarlavha">{tr('1. YATT ochish', '1. Открыть ИП')}</Matn>
            <Statlar>
              <Stat nom={tr('Onlayn boj', 'Онлайн')} q={som(f.yatt.bojOnlaynSom)} />
              <Stat nom={tr('Shaxsan', 'Лично')} q={som(f.yatt.bojShaxsanSom)} />
              <Stat nom={tr('Vaqt', 'Время')} q={f.yatt.muddatDaqiqa !== null ? `~${f.yatt.muddatDaqiqa} ${tr('daq', 'мин')}` : YOQ} />
            </Statlar>
            {f.yatt.royxatUrl && <View style={{ marginTop: 8 }}><Havola url={f.yatt.royxatUrl}>{f.yatt.royxatUrl}</Havola></View>}
            <Manba manba={f.yatt.manba} olchandi={f.yatt.olchandi} />
          </Karta>
          <Karta>
            <Matn turi="sarlavha">{tr('2. Biznes hisob raqami', '2. Расчётный счёт')}</Matn>
            {f.banklar.length === 0
              ? <Matn turi="kichik" style={{ marginTop: 8 }}>{tr('Bank roʻyxati faktda yoʻq.', 'Список банков не заполнен.')}</Matn>
              : f.banklar.map((b) => (
                <View key={b.nom} style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Matn style={{ fontFamily: 'Onest_600SemiBold' }}>{b.nom}</Matn>
                    <Matn turi="izoh">{b.onlayn === true ? tr('onlayn', 'онлайн') : b.onlayn === false ? tr('ofisda', 'в офисе') : YOQ}{b.izoh ? ` · ${b.izoh}` : ''}</Matn>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Matn turi="izoh">{`${tr('ochish', 'открытие')}: ${bepul(b.ochishSom)}`}</Matn>
                    <Matn turi="izoh">{`${tr('oylik', 'в месяц')}: ${bepul(b.oylikSom)}`}</Matn>
                  </View>
                </View>
              ))}
            <Matn turi="izoh" style={{ marginTop: 10 }}>{tr('Faqat oʻz nomingizdagi hisob — Uzum boshqa odamning kartasiga toʻlamaydi.', 'Только счёт на ваше имя — Uzum не платит на чужую карту.')}</Matn>
          </Karta>
          <Karta>
            <Matn turi="sarlavha">{tr('3. Uzum kabineti', '3. Кабинет Uzum')}</Matn>
            <View style={{ marginTop: 8, gap: 4 }}>
              <Havola url={f.uzum.kabinetUrl}>{f.uzum.kabinetUrl ?? tr('manzil faktda yoʻq', 'нет адреса')}</Havola>
              <Matn turi="kichik">{tr('Hujjatlar: YATT guvohnomasi + pasport', 'Документы: свидетельство ИП + паспорт')}</Matn>
              <Matn turi="kichik">{tr('my3.soliq.uz → komissionerlar → Uzum rekvizitlari:', 'my3.soliq.uz → комиссионеры → реквизиты Uzum:')}</Matn>
              {rekvizit && <Matn turi="izoh" style={{ fontFamily: 'Onest_500Medium' }}>{rekvizit}</Matn>}
              {f.uzum.faollashtirishKun !== null && <Matn turi="kichik">{tr(`Tekshiruv ~${f.uzum.faollashtirishKun} kun`, `Проверка ~${f.uzum.faollashtirishKun} дн`)}</Matn>}
              {f.uzum.tolovStandart && <Matn turi="kichik">{`${tr('Toʻlov jadvali:', 'График выплат:')} ${f.uzum.tolovStandart}`}</Matn>}
            </View>
            {rekvizit && <NusxaTugmasi matn={rekvizit} nom={tr('Rekvizitlarni nusxalash', 'Скопировать реквизиты')} />}
            {havolami(f.uzum.qollanmaUrl) && (
              <Tugma turi="yengil" onPress={() => void Linking.openURL(f.uzum.qollanmaUrl!)} style={{ marginTop: 8 }}>{tr('Rasmiy qoʻllanma', 'Официальная инструкция')}</Tugma>
            )}
            <Manba manba={f.uzum.manba} olchandi={f.uzum.olchandi} />
          </Karta>
        </>
      )}
      {n.izoh && <Matn turi="kichik">{n.izoh}</Matn>}
    </View>
  );
}
