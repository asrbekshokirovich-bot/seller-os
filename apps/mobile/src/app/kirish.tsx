/**
 * Kirish — dizayn 2a.
 *
 * SMS va Telegram orqali kirish hali YOʻQ (backendda login yoʻq,
 * SMS provayderi tanlanmagan). Ular dizayndagidek turadi, lekin
 * "tez orada" deb belgilangan va bosilmaydi (nazoratchi qarori 2).
 * Ishlaydigan yoʻl — "Mehmon sifatida boshlash": anonim sessiya,
 * suhbat shu telefonga bogʻlanadi.
 */

import { router } from 'expo-router';
import { ArrowRight, Phone, Send } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SAYT } from '../lib/api';
import { kartaSoyasi, SHRIFT } from '../lib/mavzu';
import { useSozlama } from '../lib/sozlamalar';
import { Matn, TezOrada, Tugma } from '../ui/asos';

export default function Kirish() {
  const { r, tr, mavzu, kirishniBelgila } = useSozlama();
  const joy = useSafeAreaInsets();

  const boshla = () => {
    kirishniBelgila();
    router.replace('/bosh');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: r.bg }} contentContainerStyle={{ flexGrow: 1, paddingBottom: joy.bottom + 16 }}>
      <View style={{ flexGrow: 1, minHeight: 360, backgroundColor: r.acc, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingTop: joy.top + 16, paddingHorizontal: 22, paddingBottom: 28, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: SHRIFT.sarlavhaQalin, fontSize: 17, color: r.acc }}>Z</Text>
          </View>
          <Text style={{ fontFamily: SHRIFT.sarlavha, fontSize: 17, letterSpacing: -0.5, color: '#FFFFFF' }}>ZumSavdo</Text>
        </View>
        <View style={{ marginTop: 40 }}>
          <Text style={{ fontFamily: SHRIFT.sarlavha, fontSize: 30, lineHeight: 34, letterSpacing: -1.2, color: '#FFFFFF' }}>
            {tr('Uzumʼda nima sotishni suhbatda topamiz.', 'Найдём в чате, что продавать на Uzum.')}
          </Text>
          <Text style={{ marginTop: 14, fontFamily: SHRIFT.matn, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.88)' }}>
            {tr(
              'Nisha tanlash, Xitoydan topish, buyurtma va rasmiylashtirish — hammasi bitta suhbatda. Raqamlarni kod beradi, qaror sizniki.',
              'Выбор ниши, поиск в Китае, заказ и оформление — всё в одном чате. Цифры даёт код, решение за вами.',
            )}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
        <View style={[{ backgroundColor: r.karta, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.7 }, kartaSoyasi(mavzu)]}>
          <Phone size={18} color={r.ink2} />
          <View style={{ flex: 1 }}>
            <Matn turi="izoh">{tr('Telefon raqam', 'Номер телефона')}</Matn>
            <Matn turi="raqam" rang={r.ink2} style={{ fontSize: 16, marginTop: 2 }}>+998 •• ••• •• ••</Matn>
          </View>
          <TezOrada />
        </View>

        <Tugma ochiq={false} ikon={<ArrowRight size={16} color={r.accInk} />}>{tr('SMS kod olish — tez orada', 'Код по SMS — скоро')}</Tugma>
        <Tugma turi="teskari" ochiq={false} ikon={<Send size={16} color={r.teskariInk} />}>{tr('Telegram orqali — tez orada', 'Через Telegram — скоро')}</Tugma>

        <View style={{ height: 1, backgroundColor: r.chiziq, marginVertical: 6 }} />

        <Tugma onPress={boshla}>{tr('Mehmon sifatida boshlash', 'Начать как гость')}</Tugma>
        <Matn turi="kichik" style={{ textAlign: 'center' }}>
          {tr(
            'Roʻyxatdan oʻtish shart emas. Suhbat shu telefonga bogʻlanadi; ism va raqam soʻralmaydi.',
            'Регистрация не нужна. Чат привязан к этому телефону; имя и номер не спрашиваются.',
          )}
        </Matn>
        {SAYT !== '' && (
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${SAYT}/maxfiylik`)} style={{ alignSelf: 'center', padding: 6 }}>
            <Matn turi="izoh" rang={r.acc}>{tr('Maxfiylik siyosati', 'Политика конфиденциальности')}</Matn>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
