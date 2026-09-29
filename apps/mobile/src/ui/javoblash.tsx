/**
 * Pastki javob paneli — dizayn 1a: savolning variantlari karta ichida
 * katta tugmalar boʻlib, ostida "yoki oʻzingiz yozing" maydoni.
 *
 * Qaysi variantlar borligini SERVER aytadi (`savol.variantlar`);
 * bu yerda faqat chiziladi. Erkin matn ham joriy savolga javob:
 * server uni oʻzi tahlil qiladi, tushunmasa xato qaytaradi va u
 * pufakda koʻrinadi.
 */

import { ArrowUp, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { kartaSoyasi, SHRIFT } from '../lib/mavzu';
import { useSozlama } from '../lib/sozlamalar';
import type { Savol } from '../lib/turlar';
import { Karta, Matn, Tugma } from './asos';

/** Kartalar oqimda tanlanadigan savollar — pastda faqat yakun/izoh. */
function kartadaTanlanadimi(savolId: string): boolean {
  return savolId === 'yonalish' || savolId === 'tovarlar' || savolId.startsWith('xitoy_tanlov:');
}

function yorliq(id: string, tr: (uz: string, ru: string) => string): string {
  if (id === 'byudjet') return tr('Byudjet', 'Бюджет');
  if (id === 'marja') return tr('Marja', 'Маржа');
  if (id === 'shahar') return tr('Shahar', 'Город');
  if (id.startsWith('miqdor:')) return tr('Miqdor', 'Количество');
  return tr('Javob', 'Ответ');
}

export function Javoblash({ savol, tezOrada, kutishMatni, band, tanlangan, setTanlangan, javobBer, matnYubor, boshdan }: {
  savol: Savol | null;
  tezOrada: boolean;
  kutishMatni: string | null;
  band: boolean;
  tanlangan: Array<string | number>;
  setTanlangan: (t: Array<string | number>) => void;
  javobBer: (savolId: string, javob: unknown) => void;
  matnYubor: (matn: string) => void;
  boshdan: () => void;
}) {
  const { r, tr, mavzu } = useSozlama();
  const [matn, setMatn] = useState('');

  if (kutishMatni !== null) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Matn turi="kichik">{tr('1688 qidiruvi tugashini kutamiz — ilovani yopsangiz ham natija saqlanadi.', 'Ждём завершения поиска на 1688 — результат сохранится, даже если закрыть приложение.')}</Matn>
      </View>
    );
  }

  if (tezOrada || savol === null) {
    return (
      <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
        <Tugma turi="yengil" onPress={boshdan} ochiq={!band}>{tr('Yoʻlni boshidan boshlash', 'Начать путь заново')}</Tugma>
      </View>
    );
  }

  const otkaz = savol.otkazishMumkin ? (
    <Pressable accessibilityRole="button" disabled={band} onPress={() => javobBer(savol.id, null)} style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: SHRIFT.matnOrta, fontSize: 13, color: r.ink2 }}>{tr('Oʻtkazib yuborish', 'Пропустить')}</Text>
    </Pressable>
  ) : null;

  const kartada = kartadaTanlanadimi(savol.id);
  const kop = savol.turi === 'kopTanlov';
  const variantlar = kartada ? [] : savol.variantlar;
  const ixcham = variantlar.length > 0 && variantlar.length <= 4 && variantlar.every((v) => v.nom.length <= 18);

  const yubor = () => {
    const t = matn.trim();
    if (t === '' || band) return;
    if (savol.turi === 'son' && savol.erkin && /^[\d\s.,]+$/.test(t)) javobBer(savol.id, Number(t.replace(/[\s,]/g, '')));
    else if (savol.erkin || savol.turi === 'matn') javobBer(savol.id, t);
    else matnYubor(t);
    setMatn('');
  };

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, gap: 8 }}>
      {kartada && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 4 }}>
          <Matn turi="kichik" style={{ flex: 1 }}>
            {kop && tanlangan.length > 0
              ? tr(`Tanlandi: ${tanlangan.length}`, `Выбрано: ${tanlangan.length}`)
              : tr('Yuqoridagi kartalardan tanlang', 'Выберите карточку выше')}
          </Matn>
          {kop && tanlangan.length > 0 && (
            <Tugma onPress={() => javobBer(savol.id, tanlangan)} ochiq={!band} style={{ minHeight: 40 }}>{tr('Tayyor', 'Готово')}</Tugma>
          )}
        </View>
      )}

      {variantlar.length > 0 && (
        <Karta style={{ paddingBottom: kop ? 12 : 16 }}>
          <Matn turi="yorliq">{yorliq(savol.id, tr)}</Matn>
          <View style={{ marginTop: 12, flexDirection: ixcham ? 'row' : 'column', flexWrap: 'wrap', gap: 8 }}>
            {variantlar.map((v) => {
              const bor = tanlangan.some((x) => String(x) === String(v.qiymat));
              return (
                <Pressable
                  key={String(v.qiymat)}
                  accessibilityRole="button"
                  disabled={band}
                  onPress={() => {
                    if (!kop) { javobBer(savol.id, v.qiymat); return; }
                    setTanlangan(bor ? tanlangan.filter((x) => String(x) !== String(v.qiymat)) : [...tanlangan, v.qiymat]);
                  }}
                  style={({ pressed }) => ({
                    width: ixcham ? '48.5%' : '100%',
                    minHeight: ixcham ? 56 : 48,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    backgroundColor: bor || pressed ? r.acc : r.ichki,
                    opacity: band ? 0.6 : 1,
                  })}
                >
                  {({ pressed }) => (
                    <>
                      <Text style={{ flexShrink: 1, fontFamily: ixcham ? SHRIFT.sarlavha : SHRIFT.matnYarim, fontSize: 14, letterSpacing: ixcham ? -0.3 : 0, color: bor || pressed ? r.accInk : r.ink }}>{v.nom}</Text>
                      {bor && (
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: r.accInk, alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={13} color={r.acc} />
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
          {kop && tanlangan.length > 0 && (
            <Tugma onPress={() => javobBer(savol.id, tanlangan)} ochiq={!band} style={{ marginTop: 12 }}>{tr('Tayyor', 'Готово')}</Tugma>
          )}
        </Karta>
      )}

      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: r.karta, borderRadius: 999, paddingVertical: 5, paddingRight: 5, paddingLeft: 18 }, kartaSoyasi(mavzu)]}>
        <TextInput
          value={matn}
          onChangeText={setMatn}
          editable={!band}
          onSubmitEditing={yubor}
          returnKeyType="send"
          keyboardType={savol.turi === 'son' ? 'numeric' : 'default'}
          placeholder={savol.turi === 'son' ? tr('Yoki oʻzingiz yozing (son)', 'Или впишите число') : tr('Yoki oʻzingiz yozing', 'Или напишите сами')}
          placeholderTextColor={r.ink2}
          accessibilityLabel={savol.matn}
          style={{ flex: 1, minHeight: 44, fontFamily: SHRIFT.matn, fontSize: 14, color: r.ink }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Yuborish', 'Отправить')}
          disabled={band || matn.trim() === ''}
          onPress={yubor}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.teskari, alignItems: 'center', justifyContent: 'center', opacity: band || matn.trim() === '' ? 0.5 : 1 }}
        >
          <ArrowUp size={20} color={r.teskariInk} />
        </Pressable>
      </View>
      {otkaz}
    </View>
  );
}
