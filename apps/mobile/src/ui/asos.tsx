/**
 * Dizayn gʻishtlari — `ZUMSavdo_Mobil*.html` dagi takrorlanuvchi bloklar.
 *
 * Har ekran rangni `useSozlama().r` dan oladi; bu yerda qattiq
 * yozilgan rang yoʻq, shuning uchun yorugʻ/tungi bitta kod bilan.
 */

import { ArrowLeft, Menu } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { kartaSoyasi, shaffof, SHRIFT } from '../lib/mavzu';
import { useSozlama } from '../lib/sozlamalar';

/* ------------------------------------------------------ matn */

type MatnTuri = 'oddiy' | 'kichik' | 'izoh' | 'yorliq' | 'sarlavha' | 'katta' | 'raqam';

export function Matn({ turi = 'oddiy', rang, style, children, qator }: {
  turi?: MatnTuri; rang?: string; style?: StyleProp<TextStyle>; children: ReactNode; qator?: number;
}) {
  const { r } = useSozlama();
  const asos: Record<MatnTuri, TextStyle> = {
    oddiy: { fontFamily: SHRIFT.matn, fontSize: 14, lineHeight: 21.5, color: r.ink },
    kichik: { fontFamily: SHRIFT.matn, fontSize: 12, lineHeight: 17, color: r.ink2 },
    izoh: { fontFamily: SHRIFT.matn, fontSize: 11, lineHeight: 15, color: r.ink2 },
    yorliq: { fontFamily: SHRIFT.matnYarim, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: r.ink2 },
    sarlavha: { fontFamily: SHRIFT.sarlavha, fontSize: 16, letterSpacing: -0.5, color: r.ink },
    katta: { fontFamily: SHRIFT.sarlavha, fontSize: 24, letterSpacing: -0.9, color: r.ink },
    raqam: { fontFamily: SHRIFT.sarlavha, fontSize: 14, letterSpacing: -0.3, color: r.ink, fontVariant: ['tabular-nums'] },
  };
  return (
    <Text numberOfLines={qator} style={[asos[turi], rang ? { color: rang } : null, style]}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------ bloklar */

export function Karta({ children, style, urgu }: { children: ReactNode; style?: StyleProp<ViewStyle>; urgu?: boolean }) {
  const { r, mavzu } = useSozlama();
  return (
    <View
      style={[
        { backgroundColor: r.karta, borderRadius: 22, padding: 16 },
        kartaSoyasi(mavzu),
        urgu ? { boxShadow: `0 0 0 2px ${r.acc}` } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type TegTuri = 'acc' | 'yaxshi' | 'ogoh' | 'yomon' | 'neytral';

export function Teg({ children, turi = 'neytral' }: { children: ReactNode; turi?: TegTuri }) {
  const { r } = useSozlama();
  const rang = turi === 'acc' ? r.acc : turi === 'yaxshi' ? r.yaxshi : turi === 'ogoh' ? r.ogoh : turi === 'yomon' ? r.yomon : r.ink2;
  const fon = turi === 'acc' ? r.accYumshoq : turi === 'neytral' ? r.iz : shaffof(rang, 0.1);
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: fon, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: SHRIFT.matnQalin, fontSize: 11.5, color: rang }}>{children}</Text>
    </View>
  );
}

/** Faol savdo qaysi bosqichda — roʻyxat va bosh sahifadagi teg. */
export function bosqichTegi(qadam: number, tr: (uz: string, ru: string) => string): { t: string; turi: TegTuri } {
  if (qadam <= 4) return { t: tr('Tahlil', 'Анализ'), turi: 'neytral' };
  if (qadam === 5) return { t: tr('Xitoy', 'Китай'), turi: 'acc' };
  if (qadam === 6) return { t: tr('Buyurtma', 'Заказ'), turi: 'ogoh' };
  return { t: tr('Rasmiy', 'Оформление'), turi: 'yaxshi' };
}

/**
 * Ogohlantirish matni — tuzoq sababi, "hisobga kirmadi". Uzun jumla
 * boʻlgani uchun teg (tabletka) emas, blok: yashirilmaydi, oʻqiladi.
 */
export function Ogohlik({ children }: { children: ReactNode }) {
  const { r } = useSozlama();
  return (
    <View style={{ backgroundColor: shaffof(r.ogoh, 0.1), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }}>
      <Text style={{ fontFamily: SHRIFT.matnYarim, fontSize: 11.5, lineHeight: 15, color: r.ogoh }}>{children}</Text>
    </View>
  );
}

/** "Tez orada" belgisi — tizimda hali yoʻq funksiya (nazoratchi qarori 2). */
export function TezOrada() {
  const { tr } = useSozlama();
  return <Teg>{tr('tez orada', 'скоро')}</Teg>;
}

export function Stat({ nom, q, izoh, style }: { nom: string; q: string; izoh?: string | undefined; style?: StyleProp<ViewStyle> }) {
  const { r } = useSozlama();
  return (
    <View style={[{ flexGrow: 1, flexBasis: '30%', backgroundColor: r.ichki, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 10 }, style]}>
      <Matn turi="izoh">{nom}</Matn>
      <Matn turi="raqam" style={{ marginTop: 4 }}>{q}</Matn>
      {izoh !== undefined && <Matn turi="izoh" style={{ marginTop: 2 }}>{izoh}</Matn>}
    </View>
  );
}

export function Statlar({ children }: { children: ReactNode }) {
  return <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>;
}

/* ------------------------------------------------------ tugmalar */

type TugmaTuri = 'asosiy' | 'teskari' | 'yengil';

export function Tugma({ children, onPress, turi = 'asosiy', ochiq = true, ikon, style }: {
  children: ReactNode; onPress?: () => void; turi?: TugmaTuri; ochiq?: boolean; ikon?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const { r } = useSozlama();
  const fon = turi === 'asosiy' ? r.acc : turi === 'teskari' ? r.teskari : r.ichki;
  const rang = turi === 'asosiy' ? r.accInk : turi === 'teskari' ? r.teskariInk : r.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!ochiq}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: 48, borderRadius: 999, backgroundColor: fon, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
        !ochiq ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      {ikon}
      <Text style={{ fontFamily: SHRIFT.matnYarim, fontSize: 14, color: rang }}>{children}</Text>
    </Pressable>
  );
}

/** Dumaloq ikonka tugmasi (44×44) — sarlavhadagi ☰, qoʻngʻiroq. */
export function DumaloqTugma({ children, onPress, yorliq }: { children: ReactNode; onPress?: () => void; yorliq: string }) {
  const { r, mavzu } = useSozlama();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={yorliq}
      onPress={onPress}
      style={[{ width: 44, height: 44, borderRadius: 999, backgroundColor: r.karta, alignItems: 'center', justifyContent: 'center' }, kartaSoyasi(mavzu)]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------ belgi va sarlavha */

export function Belgi({ olcham = 40 }: { olcham?: number }) {
  const { r } = useSozlama();
  return (
    <View style={{ width: olcham, height: olcham, borderRadius: olcham * 0.35, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: SHRIFT.sarlavhaQalin, fontSize: olcham * 0.45, color: r.accInk }}>Z</Text>
    </View>
  );
}

/** Suhbat sarlavhasi: ← · Z · nom/izoh · ☰ (dizayn 1a–1f). */
export function SuhbatSarlavhasi({ nom, izoh, orqaga, menyu }: {
  nom: string; izoh: string; orqaga: () => void; menyu: () => void;
}) {
  const { r, tr } = useSozlama();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Orqaga', 'Назад')} onPress={orqaga} style={{ width: 36, height: 44, marginLeft: -6, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={22} color={r.ink} />
        </Pressable>
        <Belgi />
        <View style={{ flexShrink: 1 }}>
          <Matn turi="sarlavha" qator={1}>{nom}</Matn>
          <Matn turi="kichik" qator={1}>{izoh}</Matn>
        </View>
      </View>
      <DumaloqTugma yorliq={tr('Qadamlar', 'Шаги')} onPress={menyu}>
        <Menu size={20} color={r.ink} />
      </DumaloqTugma>
    </View>
  );
}

/** Boʻlim sarlavhasi (Suhbatlar, Yuklar, Sozlamalar). */
export function EkranSarlavhasi({ children, ong }: { children: ReactNode; ong?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
      <Matn turi="katta">{children}</Matn>
      {ong}
    </View>
  );
}
