/**
 * Bosh sahifa — dizayn 2b.
 *
 * PUL HOLATI hozir BOʻSH: sotuv raqamlari Uzum kabineti ulangandan
 * keyin keladi (tez orada). Dizayndagi "16,4 mln" oʻrnida chiziqcha —
 * raqam oʻylab topilmaydi (QOIDALAR.md, 4-boʻlim). Karta shakli esa
 * tayyor: maʼlumot ulanganda faqat qiymatlar toʻladi.
 *
 * FAOL SAVDO — haqiqiy suhbat holatidan (qadam, tanlangan tovar).
 * BAZA — `/bazamiz` dan jonli son, olinmasa chiziqcha.
 */

import { router } from 'expo-router';
import { Bell, MessageCircle, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bazamizOl } from '../../lib/api';
import { raqam, YOQ } from '../../lib/format';
import { savdoNomi } from '../../lib/holat';
import { kartaSoyasi } from '../../lib/mavzu';
import { qadamNomi } from '../../lib/qadamlar';
import { useSozlama } from '../../lib/sozlamalar';
import { useSuhbat } from '../../lib/suhbat';
import type { BazamizJavobi } from '../../lib/turlar';
import { bosqichTegi, DumaloqTugma, Karta, Matn, Teg, TezOrada } from '../../ui/asos';

function salom(tr: (uz: string, ru: string) => string): string {
  const soat = new Date().getHours();
  if (soat < 11) return tr('Xayrli tong,', 'Доброе утро,');
  if (soat < 18) return tr('Xayrli kun,', 'Добрый день,');
  return tr('Xayrli kech,', 'Добрый вечер,');
}

export default function Bosh() {
  const { r, tr, mavzu } = useSozlama();
  const s = useSuhbat();
  const joy = useSafeAreaInsets();
  const [baza, setBaza] = useState<BazamizJavobi | null | undefined>(undefined);

  useEffect(() => { void bazamizOl().then(setBaza); }, []);

  const boshlangan = s.xabarlar.length > 0;
  const nom = savdoNomi(s.xabarlar);
  const teg = bosqichTegi(s.qadam, tr);
  const b = baza?.bazamiz ?? null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: r.bg }} contentContainerStyle={{ paddingTop: joy.top + 14, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Matn turi="kichik">{salom(tr)}</Matn>
          <Matn turi="katta">{tr('Mehmon', 'Гость')}</Matn>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <DumaloqTugma yorliq={tr('Bildirishnomalar — tez orada', 'Уведомления — скоро')}>
            <Bell size={18} color={r.ink2} />
          </DumaloqTugma>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Sozlamalar', 'Настройки')} onPress={() => router.push('/sozlama')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center' }}>
            <Matn turi="raqam" rang={r.accInk}>{tr('M', 'Г')}</Matn>
          </Pressable>
        </View>
      </View>

      <Karta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Matn turi="yorliq">{tr('Pul holati', 'Деньги')}</Matn>
          <TezOrada />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
          <Matn turi="katta" rang={r.acc} style={{ fontSize: 34 }}>{YOQ}</Matn>
          <Matn turi="kichik">{tr('mln kelib tushdi', 'млн поступило')}</Matn>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
          {[3, 3, 1].map((f, i) => <View key={i} style={{ flex: f, height: 8, borderRadius: 999, backgroundColor: r.iz }} />)}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          {[tr('Tushdi', 'Поступило'), tr('Omborda', 'На складе'), tr('Yoʻlda', 'В пути')].map((n) => (
            <View key={n}>
              <Matn turi="izoh">{n}</Matn>
              <Matn turi="raqam">{YOQ}</Matn>
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: r.chiziq, marginVertical: 12 }} />
        <Matn turi="kichik">
          {tr(
            'Sotuv va pul raqamlari Uzum kabinetingiz ulanganda shu yerda chiqadi. Hozircha raqam yoʻq — taxmin koʻrsatmaymiz.',
            'Цифры продаж появятся здесь после подключения кабинета Uzum. Пока данных нет — оценки не показываем.',
          )}
        </Matn>
      </Karta>

      <Pressable accessibilityRole="button" onPress={() => router.push('/suhbat')}>
        <Karta style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
          <Matn style={{ fontFamily: 'Onest_600SemiBold' }}>{boshlangan ? tr('Suhbatni davom ettirish', 'Продолжить чат') : tr('Yangi savdo boshlash', 'Начать новую сделку')}</Matn>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} color={r.accInk} />
          </View>
        </Karta>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
        <Matn turi="sarlavha">{tr('Faol savdolar', 'Активные сделки')}</Matn>
        <Matn turi="kichik">{boshlangan ? tr('1 ta', '1') : tr('hali yoʻq', 'пока нет')}</Matn>
      </View>

      {boshlangan ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/suhbat')}>
          <View style={[{ backgroundColor: r.karta, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, kartaSoyasi(mavzu)]}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: r.accYumshoq, alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color={r.acc} />
            </View>
            <View style={{ flex: 1 }}>
              <Matn qator={1} style={{ fontFamily: 'Onest_600SemiBold' }}>{nom ?? tr('Yangi savdo', 'Новая сделка')}</Matn>
              <Matn turi="izoh" qator={1}>{tr(`${s.qadam}-qadam · ${qadamNomi(s.qadam)}`, `Шаг ${s.qadam} · ${qadamNomi(s.qadam)}`)}</Matn>
            </View>
            <Teg turi={teg.turi}>{teg.t}</Teg>
          </View>
        </Pressable>
      ) : (
        <Matn turi="kichik">{tr('Suhbatni boshlang — yoʻnalish va tovarni birga tanlaymiz.', 'Начните чат — вместе выберем направление и товар.')}</Matn>
      )}

      <Karta style={{ marginTop: 4, paddingVertical: 12 }}>
        <Matn turi="yorliq">{tr('Uzum bazasi', 'База Uzum')}</Matn>
        <Matn turi="raqam" style={{ marginTop: 6, fontSize: 16 }}>
          {baza === undefined ? tr('Yuklanmoqda…', 'Загрузка…') : `${raqam(b?.tovar)} ${tr('tovar', 'товаров')} · ${raqam(b?.dokon)} ${tr('doʻkon', 'магазинов')}`}
        </Matn>
        <Matn turi="izoh" style={{ marginTop: 2 }}>
          {baza === undefined ? ' ' : b?.olchandi ? tr(`oʻlchandi: ${b.olchandi}`, `измерено: ${b.olchandi}`) : tr('Raqam hozir olinmadi', 'Цифра сейчас не получена')}
        </Matn>
      </Karta>
    </ScrollView>
  );
}
