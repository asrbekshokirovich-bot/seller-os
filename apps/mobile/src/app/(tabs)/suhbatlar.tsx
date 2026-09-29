/**
 * Suhbatlar roʻyxati — dizayn 3a.
 *
 * Bugun tizimda BITTA sessiya = BITTA suhbat. Roʻyxat shakli tayyor
 * (qidiruv, filtr, qadam chizigʻi), unda hozircha bitta haqiqiy
 * suhbat turadi. Bir nechta parallel savdo va arxiv — tez orada.
 */

import { router } from 'expo-router';
import { MessageCircle, Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { oxirgiJumla, savdoNomi } from '../../lib/holat';
import { kartaSoyasi, SHRIFT } from '../../lib/mavzu';
import { QADAMLAR } from '../../lib/qadamlar';
import { useSozlama } from '../../lib/sozlamalar';
import { useSuhbat } from '../../lib/suhbat';
import { bosqichTegi, EkranSarlavhasi, Matn, Teg } from '../../ui/asos';

type Filtr = 'hammasi' | 'faol' | 'arxiv';

export default function Suhbatlar() {
  const { r, tr, mavzu } = useSozlama();
  const s = useSuhbat();
  const joy = useSafeAreaInsets();
  const [qidiruv, setQidiruv] = useState('');
  const [filtr, setFiltr] = useState<Filtr>('hammasi');

  const boshlangan = s.xabarlar.length > 0;
  const nom = savdoNomi(s.xabarlar) ?? tr('Yangi savdo', 'Новая сделка');
  const jumla = oxirgiJumla(s.xabarlar) ?? tr('Hali boshlanmagan', 'Ещё не начата');
  const q = qidiruv.trim().toLowerCase();
  const mos = boshlangan && filtr !== 'arxiv' && (q === '' || `${nom} ${jumla}`.toLowerCase().includes(q));
  const teg = bosqichTegi(s.qadam, tr);

  function yangiSavdo() {
    if (!boshlangan) { router.push('/suhbat'); return; }
    const matn = tr(
      'Hozircha bitta savdo yuritiladi: yangisi joriy yoʻlni boshidan boshlaydi (tarix saqlanadi). Bir nechta parallel savdo — tez orada.',
      'Пока ведётся одна сделка: новая начнёт текущий путь заново (история сохранится). Несколько сделок — скоро.',
    );
    const bosh = () => { s.boshdan(); router.push('/suhbat'); };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(matn)) bosh();
      return;
    }
    Alert.alert(tr('Yangi savdo', 'Новая сделка'), matn, [
      { text: tr('Bekor', 'Отмена'), style: 'cancel' },
      { text: tr('Boshidan boshlash', 'Начать заново'), onPress: bosh },
    ]);
  }

  const filtrlar: Array<[Filtr, string]> = [['hammasi', tr('Hammasi', 'Все')], ['faol', tr('Faol', 'Активные')], ['arxiv', tr('Arxiv', 'Архив')]];

  return (
    <View style={{ flex: 1, backgroundColor: r.bg, paddingTop: joy.top }}>
      <EkranSarlavhasi>{tr('Suhbatlar', 'Чаты')}</EkranSarlavhasi>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, gap: 10 }}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: r.karta, borderRadius: 999, paddingHorizontal: 16 }, kartaSoyasi(mavzu)]}>
          <Search size={18} color={r.ink2} />
          <TextInput
            value={qidiruv}
            onChangeText={setQidiruv}
            placeholder={tr('Suhbatlardan qidirish', 'Поиск по чатам')}
            placeholderTextColor={r.ink2}
            style={{ flex: 1, minHeight: 44, fontFamily: SHRIFT.matn, fontSize: 14, color: r.ink }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: r.iz, borderRadius: 999, padding: 4, gap: 2 }}>
          {filtrlar.map(([f, n]) => (
            <Pressable key={f} accessibilityRole="tab" accessibilityState={{ selected: filtr === f }} onPress={() => setFiltr(f)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: filtr === f ? r.teskari : 'transparent' }}>
              <Matn turi="kichik" rang={filtr === f ? r.teskariInk : r.ink2} style={{ fontFamily: 'Onest_600SemiBold' }}>{n}</Matn>
            </Pressable>
          ))}
        </View>

        {mos && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/suhbat')}>
            <View style={[{ backgroundColor: r.karta, borderRadius: 18, padding: 14, gap: 10 }, kartaSoyasi(mavzu), { boxShadow: `0 0 0 2px ${r.acc}` }]}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: r.accYumshoq, alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={18} color={r.acc} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Matn qator={1} style={{ flex: 1, fontFamily: 'Onest_600SemiBold' }}>{nom}</Matn>
                    <Teg turi={teg.turi}>{teg.t}</Teg>
                  </View>
                  <Matn turi="izoh" qator={1} style={{ marginTop: 2 }}>{jumla}</Matn>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {QADAMLAR.map((qd) => (
                  <View key={qd.n} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: qd.n <= s.qadam ? r.acc : r.iz, opacity: qd.qurilgan ? 1 : 0.5 }} />
                ))}
              </View>
            </View>
          </Pressable>
        )}

        {!mos && (
          <Matn turi="kichik" style={{ textAlign: 'center', marginTop: 20 }}>
            {filtr === 'arxiv'
              ? tr('Arxiv tez orada — tugagan savdolar shu yerda saqlanadi.', 'Архив скоро — завершённые сделки будут здесь.')
              : !boshlangan
                ? tr('Hali suhbat yoʻq. Pastdagi + tugmasi bilan boshlang.', 'Чатов пока нет. Начните кнопкой + внизу.')
                : tr('Hech narsa topilmadi.', 'Ничего не найдено.')}
          </Matn>
        )}

        <Matn turi="izoh" style={{ marginTop: 6 }}>
          {tr(
            `${QADAMLAR.length} qadam: ${QADAMLAR.slice(0, 7).map((x) => x.nom.toLowerCase()).join(' · ')} · …`,
            `${QADAMLAR.length} шагов пути — от знакомства до отчёта.`,
          )}
        </Matn>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('Yangi savdo', 'Новая сделка')}
        onPress={yangiSavdo}
        style={{ position: 'absolute', right: 18, bottom: 16, width: 56, height: 56, borderRadius: 18, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(210,85,45,0.35)' }}
      >
        <Plus size={24} color={r.accInk} />
      </Pressable>
    </View>
  );
}
