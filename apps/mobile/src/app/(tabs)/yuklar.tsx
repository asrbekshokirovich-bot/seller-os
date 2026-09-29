/**
 * Yuklar — dizayn 3b.
 *
 * Tizim yukni KUZATMAYDI: kargo hamkori yoʻq (dizayn/HOLAT.md 9-band).
 * Shuning uchun karta 6-qadam buyurtma varaqasidagi narsani koʻrsatadi —
 * tovar, miqdor, narx, obunachi kiritgan buyurtma raqami. Yuk
 * qayerdaligi va yetib kelish sanasi — chiziqcha, "kuzatuv tez orada".
 * Dizayndagi "Bojxonada · ~4 okt" oʻylab topilmaydi.
 */

import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { raqam, somda, YOQ } from '../../lib/format';
import { yukKartalari } from '../../lib/holat';
import { useSozlama } from '../../lib/sozlamalar';
import { useSuhbat } from '../../lib/suhbat';
import { EkranSarlavhasi, Karta, Matn, TezOrada, Tugma } from '../../ui/asos';

type Tab = 'yolda' | 'keldi';

export default function Yuklar() {
  const { r, tr } = useSozlama();
  const s = useSuhbat();
  const joy = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('yolda');
  const kartalar = yukKartalari(s.xabarlar);

  const bosqichlar = [tr('Zavod', 'Завод'), tr('Kargo', 'Карго'), tr('Bojxona', 'Таможня'), tr('Ombor', 'Склад')];

  return (
    <View style={{ flex: 1, backgroundColor: r.bg, paddingTop: joy.top }}>
      <EkranSarlavhasi>{tr('Yuklar', 'Грузы')}</EkranSarlavhasi>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { nom: tr('Varaqada', 'В листе'), q: String(kartalar.length), rang: r.acc },
            { nom: tr('Yoʻlda', 'В пути'), q: YOQ, rang: r.ink },
            { nom: tr('Yetib keldi', 'Прибыло'), q: YOQ, rang: r.yaxshi },
          ].map((x) => (
            <Karta key={x.nom} style={{ flex: 1, padding: 12, borderRadius: 18 }}>
              <Matn turi="izoh">{x.nom}</Matn>
              <Matn turi="katta" rang={x.rang} style={{ marginTop: 4, fontSize: 22 }}>{x.q}</Matn>
            </Karta>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: r.iz, borderRadius: 999, padding: 4, gap: 2 }}>
          {([['yolda', tr('Yoʻlda', 'В пути')], ['keldi', tr('Yetib kelgan', 'Прибывшие')]] as Array<[Tab, string]>).map(([t, n]) => (
            <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: tab === t ? r.teskari : 'transparent' }}>
              <Matn turi="kichik" rang={tab === t ? r.teskariInk : r.ink2} style={{ fontFamily: 'Onest_600SemiBold' }}>{n}</Matn>
            </Pressable>
          ))}
        </View>

        {tab === 'keldi' ? (
          <Matn turi="kichik" style={{ textAlign: 'center', marginTop: 16 }}>
            {tr('Yetib kelgan yuklar kuzatuv ulanganda shu yerda chiqadi — tez orada.', 'Прибывшие грузы появятся здесь после подключения отслеживания — скоро.')}
          </Matn>
        ) : kartalar.length === 0 ? (
          <Karta style={{ gap: 10 }}>
            <Matn turi="sarlavha">{tr('Hali yuk yoʻq', 'Грузов пока нет')}</Matn>
            <Matn turi="kichik">
              {tr(
                'Buyurtma varaqasi suhbatning 6-qadamida tuziladi: 1688 dagi tanlovingiz, miqdor va narx. Varaqadagi tovarlar shu yerga tushadi.',
                'Лист заказа составляется на 6-м шаге чата: выбор на 1688, количество и цена. Товары из листа появятся здесь.',
              )}
            </Matn>
            <Tugma onPress={() => router.push('/suhbat')}>{tr('Suhbatga oʻtish', 'Перейти в чат')}</Tugma>
          </Karta>
        ) : (
          kartalar.map(({ qator: q, buyurtmaRaqami }) => (
            <Karta key={q.productId}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Matn turi="kichik">{buyurtmaRaqami ? `#${buyurtmaRaqami}` : tr('buyurtma raqami kiritilmagan', 'номер заказа не указан')}</Matn>
                  <Matn turi="sarlavha" qator={2} style={{ marginTop: 3 }}>{`${q.title} · ${raqam(q.miqdor)} ${tr('dona', 'шт')}`}</Matn>
                  <Matn turi="kichik" style={{ marginTop: 3 }}>
                    {`${q.jamiYuan === null ? YOQ : `¥${q.jamiYuan}`}${q.jamiSom !== null ? ` ≈ ${somda(q.jamiSom, tr('soʻm', 'сум'))}` : ''}`}
                  </Matn>
                </View>
                <TezOrada />
              </View>
              <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
                {bosqichlar.map((b, i) => (
                  <View key={b} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                      <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? 'transparent' : r.iz }} />
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: r.chiziq, backgroundColor: r.karta }} />
                      <View style={{ flex: 1, height: 3, backgroundColor: i === bosqichlar.length - 1 ? 'transparent' : r.iz }} />
                    </View>
                    <Matn turi="izoh" style={{ marginTop: 6 }}>{b}</Matn>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: r.ichki, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Matn turi="kichik">{tr('Omborga yetadi', 'Прибудет на склад')}</Matn>
                <Matn turi="raqam" style={{ fontSize: 13 }}>{YOQ}</Matn>
              </View>
            </Karta>
          ))
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push('/suhbat')}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: r.accYumshoq, borderRadius: 18, padding: 14 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color={r.accInk} />
            </View>
            <Matn turi="kichik" style={{ flex: 1 }}>
              {tr(
                'Yuk kuzatuvi kargo hamkori ulanganda ishlaydi. Ungacha buyurtma raqamini suhbatda kiriting — u shu kartada turadi.',
                'Отслеживание заработает с карго-партнёром. А пока укажите номер заказа в чате — он появится на карточке.',
              )}
            </Matn>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
