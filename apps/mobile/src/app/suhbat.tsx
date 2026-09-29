/**
 * Suhbat — dizayn 1a–1f. Butun yoʻl shu ekranda: savol, kod kartasi,
 * javob. Ekran HECH NARSANI hal qilmaydi: savol tartibini server
 * (`/suhbat`, `ssenariy.ts`) beradi, bu yer faqat chizadi.
 *
 * Tepada 12 segmentli progress — yoʻlning qayerida turganingiz;
 * ☰ — qadamlar roʻyxati (qurilmaganlari "tez orada").
 */

import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { oxirgiKodIdx, savolKorsatilsinmi, tarixdagiTanlov, tezOradaKorsatilsinmi } from '../lib/holat';
import { kartaSoyasi } from '../lib/mavzu';
import { QADAMLAR, qadamNomi } from '../lib/qadamlar';
import { useSozlama } from '../lib/sozlamalar';
import { useSuhbat } from '../lib/suhbat';
import type { BuyurtmaNatija, RasmiyNatija, TannarxQatori, TovarQatori, Xabar, XitoyKurs, XitoyQatori, YonalishQatori } from '../lib/turlar';
import { Matn, SuhbatSarlavhasi, TezOrada, Tugma } from '../ui/asos';
import { Javoblash } from '../ui/javoblash';
import { BuyurtmaVaraqasi, Chegaralar, RasmiyKartasi, TovarKatalogi, XitoyTakliflari, Yonalishlar, type Tanlov } from '../ui/kod-kartalari';

export default function SuhbatEkrani() {
  const { r, tr } = useSozlama();
  const s = useSuhbat();
  const joy = useSafeAreaInsets();
  const [tanlangan, setTanlangan] = useState<Array<string | number>>([]);
  const [qadamlarOchiq, setQadamlarOchiq] = useState(false);
  const oqim = useRef<ScrollView>(null);

  const savol = s.keyingi?.tur === 'savol' ? s.keyingi.savol : null;
  const tezOrada = s.keyingi?.tur === 'tezOrada' ? s.keyingi : null;
  const kutish = s.keyingi?.tur === 'kutish' ? s.keyingi : null;

  // Savol almashsa tanlov tozalanadi.
  const savolId = savol?.id ?? null;
  useEffect(() => { setTanlangan([]); }, [savolId]);

  const oxirgiTovar = oxirgiKodIdx(s.xabarlar, 'tovarlar');
  const oxirgiYonalish = oxirgiKodIdx(s.xabarlar, 'yonalishlar');
  const oxirgiXitoy = oxirgiKodIdx(s.xabarlar, 'xitoy');

  /** Kartaning tanlov rejimi: joriy savolga tegishli boʻlsa — bosiladi. */
  function tanlovi(i: number, x: Xabar): Tanlov | undefined {
    if (x.rol !== 'kod') return undefined;
    if (x.savolId === 'yonalishlar') {
      return i === oxirgiYonalish && savol?.id === 'yonalish' && !s.band
        ? { tanlangan: [], bos: (q) => s.javobBer('yonalish', q) }
        : { tanlangan: tarixdagiTanlov(s.xabarlar, i, 'yonalish') };
    }
    if (x.savolId === 'tovarlar') {
      if (i === oxirgiTovar && savol?.id === 'tovarlar' && !s.band) {
        return {
          tanlangan,
          bos: (q) => setTanlangan((t) => (t.some((v) => String(v) === String(q)) ? t.filter((v) => String(v) !== String(q)) : [...t, q])),
        };
      }
      return { tanlangan: i === oxirgiTovar && savol?.id === 'tovarlar' ? tanlangan : tarixdagiTanlov(s.xabarlar, i, 'tovarlar') };
    }
    return undefined;
  }

  function xitoyTanlovi(i: number) {
    return (productId: number): Tanlov => {
      const sid = `xitoy_tanlov:${productId}`;
      if (i === oxirgiXitoy && savol?.id === sid && !s.band) return { tanlangan: [], bos: (q) => s.javobBer(sid, q) };
      return { tanlangan: tarixdagiTanlov(s.xabarlar, i, sid) };
    };
  }

  const joriyNom = tezOrada?.nom ?? qadamNomi(s.qadam);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: r.bg, paddingTop: joy.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SuhbatSarlavhasi
        nom={joriyNom || tr('Yangi savdo', 'Новая сделка')}
        izoh={tr(`${s.qadam}-qadam · ${QADAMLAR.length} dan`, `Шаг ${s.qadam} из ${QADAMLAR.length}`)}
        orqaga={() => (router.canGoBack() ? router.back() : router.replace('/bosh'))}
        menyu={() => setQadamlarOchiq(true)}
      />
      <Progress qadam={s.qadam} />

      <ScrollView
        ref={oqim}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 12, gap: 10 }}
        onContentSizeChange={() => oqim.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {s.xabarlar.map((x, i) => (
          <Pufak key={x.seq ?? `y${i}`} x={x} tanlov={tanlovi(i, x)} xitoy={xitoyTanlovi(i)} />
        ))}
        {savolKorsatilsinmi(s.xabarlar, savol) && savol && <AiPufak matn={savol.matn} />}
        {tezOradaKorsatilsinmi(s.xabarlar, s.keyingi) && tezOrada && (
          <View style={{ gap: 8 }}>
            <AiPufak matn={tezOrada.matn} />
            <View style={{ alignSelf: 'flex-start' }}><TezOrada /></View>
          </View>
        )}
        {kutish && <Yozmoqda matn={kutish.matn} />}
        {(s.band || !s.yuklandi) && <Yozmoqda matn={s.yuklandi ? tr('Yozmoqda…', 'Пишет…') : tr('Yuklanmoqda…', 'Загрузка…')} />}
        {s.xato !== null && <AiPufak matn={s.xato} xato />}
      </ScrollView>

      <View style={{ paddingBottom: joy.bottom }}>
        {s.yuklandi && (
          <Javoblash
            savol={savol}
            tezOrada={tezOrada !== null}
            kutishMatni={kutish?.matn ?? null}
            band={s.band}
            tanlangan={tanlangan}
            setTanlangan={setTanlangan}
            javobBer={s.javobBer}
            matnYubor={(m) => void s.yubor({ matn: m })}
            boshdan={s.boshdan}
          />
        )}
      </View>

      <QadamlarOynasi ochiq={qadamlarOchiq} yop={() => setQadamlarOchiq(false)} />
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------ bloklar */

function Progress({ qadam }: { qadam: number }) {
  const { r } = useSozlama();
  return (
    <View style={{ flexDirection: 'row', gap: 3, paddingHorizontal: 16, paddingBottom: 4 }}>
      {QADAMLAR.map((q) => (
        <View
          key={q.n}
          style={{
            flex: 1, height: 5, borderRadius: 999,
            backgroundColor: q.n <= qadam ? r.acc : r.iz,
            opacity: q.qurilgan ? 1 : 0.5,
          }}
        />
      ))}
    </View>
  );
}

function AiPufak({ matn, xato }: { matn: string; xato?: boolean }) {
  const { r, mavzu } = useSozlama();
  return (
    <View style={[{ alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: r.karta, borderTopLeftRadius: 6, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingVertical: 12, paddingHorizontal: 16 }, kartaSoyasi(mavzu)]}>
      <Matn rang={xato ? r.yomon : undefined}>{matn}</Matn>
    </View>
  );
}

function OdamPufak({ matn }: { matn: string }) {
  const { r } = useSozlama();
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: r.teskari, borderRadius: 18, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 }}>
      <Matn rang={r.teskariInk} style={{ fontFamily: 'Onest_500Medium' }}>{matn}</Matn>
    </View>
  );
}

function Yozmoqda({ matn }: { matn: string }) {
  const { r } = useSozlama();
  return (
    <View accessibilityRole="progressbar" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: r.karta }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {[0.35, 0.65, 1].map((o) => <View key={o} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: r.acc, opacity: o }} />)}
      </View>
      <Matn turi="kichik">{matn}</Matn>
    </View>
  );
}

function Pufak({ x, tanlov, xitoy }: { x: Xabar; tanlov: Tanlov | undefined; xitoy: (productId: number) => Tanlov }) {
  if (x.rol === 'obunachi') return <OdamPufak matn={x.matn} />;
  if (x.rol === 'menejer') return <AiPufak matn={x.matn} />;
  const n = (x.javob ?? {}) as Record<string, unknown>;
  const izoh = typeof n.izoh === 'string' ? n.izoh : null;
  let karta: ReactNode = null;
  if (n.olchov_yoq !== true) {
    switch (x.savolId) {
      case 'yonalishlar':
        karta = <Yonalishlar royxat={(n.royxat as YonalishQatori[] | undefined) ?? []} eskirgan={n.kesh_eskirgan === true} baholanmadi={Number(n.baholanmadi ?? 0)} bolish={(n.bolishTaklifi as { sabab: string } | null | undefined) ?? null} tanlov={tanlov ?? { tanlangan: [] }} />;
        break;
      case 'tovarlar':
        karta = <TovarKatalogi royxat={(n.royxat as TovarQatori[] | undefined) ?? []} chiqarildi={(n.chiqarildi as Array<{ title: string; sabab: string }> | undefined) ?? []} tanlov={tanlov ?? { tanlangan: [] }} />;
        break;
      case 'tannarx':
        karta = <Chegaralar qatorlar={(n.qatorlar as TannarxQatori[] | undefined) ?? []} izoh={izoh} />;
        break;
      case 'xitoy':
        karta = <XitoyTakliflari qatorlar={(n.qatorlar as XitoyQatori[] | undefined) ?? []} kurs={(n.kurs as XitoyKurs | null | undefined) ?? null} izoh={izoh} tanlovOl={xitoy} />;
        break;
      case 'buyurtma':
        karta = <BuyurtmaVaraqasi n={n as BuyurtmaNatija} />;
        break;
      case 'rasmiy':
        karta = <RasmiyKartasi n={n as RasmiyNatija} />;
        break;
      case 'ochiq_ish':
      case 'rasmiy_yakun':
        karta = izoh ? <Matn turi="kichik">{izoh}</Matn> : null;
        break;
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <AiPufak matn={x.matn} />
      {karta}
    </View>
  );
}

/* ------------------------------------------------------ qadamlar oynasi */

function QadamlarOynasi({ ochiq, yop }: { ochiq: boolean; yop: () => void }) {
  const { r, tr } = useSozlama();
  const s = useSuhbat();
  const joy = useSafeAreaInsets();
  return (
    <Modal visible={ochiq} transparent animationType="slide" onRequestClose={yop}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={yop} accessibilityLabel={tr('Yopish', 'Закрыть')} />
      <View style={{ backgroundColor: r.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 20 + joy.bottom, maxHeight: '85%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Matn turi="sarlavha">{tr(`Yoʻl · ${QADAMLAR.length} qadam`, `Путь · ${QADAMLAR.length} шагов`)}</Matn>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Yopish', 'Закрыть')} onPress={yop} hitSlop={10}>
            <X size={22} color={r.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 6 }}>
          {QADAMLAR.map((q) => {
            const otildi = q.qurilgan && q.n < s.qadam;
            const joriy = q.n === s.qadam;
            return (
              <View key={q.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: joriy ? r.accYumshoq : 'transparent', opacity: q.qurilgan ? 1 : 0.6 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: otildi || joriy ? r.acc : r.iz }}>
                  {otildi ? <Check size={14} color={r.accInk} /> : <Matn turi="raqam" rang={joriy ? r.accInk : r.ink2} style={{ fontSize: 11 }}>{String(q.n)}</Matn>}
                </View>
                <Matn style={{ flex: 1, fontFamily: joriy ? 'Onest_700Bold' : 'Onest_500Medium' }}>{q.nom}</Matn>
                {!q.qurilgan && <TezOrada />}
              </View>
            );
          })}
        </ScrollView>
        <Tugma turi="yengil" ochiq={!s.band} onPress={() => { s.boshdan(); yop(); }} style={{ marginTop: 14 }}>
          {tr('Boshidan boshlash (tarix saqlanadi)', 'Начать заново (история сохранится)')}
        </Tugma>
      </View>
    </Modal>
  );
}
