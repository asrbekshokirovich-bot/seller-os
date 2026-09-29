/**
 * Sozlamalar — dizayn 3c.
 *
 * Ishlaydigani: mavzu, til, yoʻlni boshidan boshlash, maxfiylik.
 * Ulanishlar (Uzum kabineti, Telegram), ogohlantirishlar va pullik
 * reja — tez orada: shakli tayyor, tugmalar oʻchiq.
 */

import { Bell, ChevronRight, Globe, Send, Store } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SAYT } from '../../lib/api';
import { kartaSoyasi } from '../../lib/mavzu';
import { useSozlama, type MavzuTanlovi } from '../../lib/sozlamalar';
import { useSuhbat } from '../../lib/suhbat';
import type { Til } from '../../lib/til';
import { EkranSarlavhasi, Matn, Teg, TezOrada } from '../../ui/asos';

function Bolim({ nom, children }: { nom: string; children: ReactNode }) {
  const { r, mavzu } = useSozlama();
  return (
    <View style={{ gap: 8 }}>
      <Matn turi="yorliq" style={{ marginLeft: 4 }}>{nom}</Matn>
      <View style={[{ backgroundColor: r.karta, borderRadius: 18, overflow: 'hidden' }, kartaSoyasi(mavzu)]}>{children}</View>
    </View>
  );
}

function Qator({ ikon, nom, izoh, ong, oxirgi, onPress }: {
  ikon?: ReactNode; nom: string; izoh?: string; ong?: ReactNode; oxirgi?: boolean; onPress?: () => void;
}) {
  const { r } = useSozlama();
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: oxirgi ? 0 : 1, borderBottomColor: r.iz }}>
      {ikon && <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: r.ichki, alignItems: 'center', justifyContent: 'center' }}>{ikon}</View>}
      <View style={{ flex: 1 }}>
        <Matn style={{ fontFamily: 'Onest_500Medium' }}>{nom}</Matn>
        {izoh && <Matn turi="izoh">{izoh}</Matn>}
      </View>
      {ong}
    </Pressable>
  );
}

function Segment<T extends string>({ qiymat, variantlar, tanla }: { qiymat: T; variantlar: Array<[T, string]>; tanla: (v: T) => void }) {
  const { r } = useSozlama();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: r.iz, borderRadius: 999, padding: 3 }}>
      {variantlar.map(([v, n]) => (
        <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: qiymat === v }} onPress={() => tanla(v)}
          style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: qiymat === v ? r.teskari : 'transparent' }}>
          <Matn turi="kichik" rang={qiymat === v ? r.teskariInk : r.ink2} style={{ fontFamily: 'Onest_600SemiBold' }}>{n}</Matn>
        </Pressable>
      ))}
    </View>
  );
}

export default function Sozlama() {
  const { r, tr, mavzu, tanlov, mavzuniTanla, til, tilniTanla } = useSozlama();
  // Profil kartasi ikkala mavzuda ham qorongʻi (dizayn 3c): yorugʻda teskari rang, tungida karta.
  const profilFon = mavzu === 'yorug' ? { backgroundColor: r.teskari } : [{ backgroundColor: r.karta }, kartaSoyasi(mavzu)];
  const profilInk = mavzu === 'yorug' ? r.teskariInk : r.ink;
  const s = useSuhbat();
  const joy = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: r.bg, paddingTop: joy.top }}>
      <EkranSarlavhasi>{tr('Sozlamalar', 'Настройки')}</EkranSarlavhasi>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 18 }}>
        <View style={[{ borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, profilFon]}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: r.acc, alignItems: 'center', justifyContent: 'center' }}>
            <Matn turi="raqam" rang={r.accInk}>{tr('M', 'Г')}</Matn>
          </View>
          <View style={{ flex: 1 }}>
            <Matn turi="sarlavha" rang={profilInk}>{tr('Mehmon', 'Гость')}</Matn>
            <Matn turi="izoh" rang={profilInk} style={{ opacity: 0.7 }}>{tr('Suhbat shu telefonga bogʻlangan · kirish tez orada', 'Чат привязан к телефону · вход скоро')}</Matn>
          </View>
          <View style={{ backgroundColor: r.acc, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Matn turi="izoh" rang={r.accInk} style={{ fontFamily: 'Onest_700Bold' }}>{tr('Bepul', 'Бесплатно')}</Matn>
          </View>
        </View>

        <Bolim nom={tr('Ulanishlar', 'Подключения')}>
          <Qator ikon={<Store size={17} color={r.acc} />} nom={tr('Uzum Seller kabineti', 'Кабинет Uzum Seller')} izoh={tr('sotuv va qoldiq raqamlari uchun', 'для продаж и остатков')} ong={<TezOrada />} />
          <Qator
            ikon={<Globe size={17} color={r.acc} />}
            nom={tr('Chrome kengaytmasi', 'Расширение Chrome')}
            izoh={tr('Uzum sahifasida “Xitoydan top”', '«Найти в Китае» на Uzum')}
            ong={<Teg turi="yaxshi">{tr('Doʻkonda', 'В магазине')}</Teg>}
          />
          <Qator ikon={<Send size={17} color={r.acc} />} nom={tr('Telegram bildirishnoma', 'Уведомления Telegram')} ong={<TezOrada />} oxirgi />
        </Bolim>

        <Bolim nom={tr('Ogohlantirishlar', 'Оповещения')}>
          {[tr('Qoldiq tugashi', 'Заканчивается остаток'), tr('Raqobatchi narxi', 'Цена конкурента'), tr('Haftalik hisobot', 'Недельный отчёт')].map((n, i, a) => (
            <Qator key={n} ikon={<Bell size={17} color={r.ink2} />} nom={n} izoh={tr('tez orada', 'скоро')} oxirgi={i === a.length - 1}
              ong={<Switch value={false} disabled trackColor={{ false: r.iz, true: r.acc }} />} />
          ))}
        </Bolim>

        <Bolim nom={tr('Ilova', 'Приложение')}>
          <Qator nom={tr('Mavzu', 'Тема')} ong={
            <Segment<MavzuTanlovi> qiymat={tanlov} tanla={mavzuniTanla}
              variantlar={[['yorug', tr('Yorugʻ', 'Светлая')], ['tungi', tr('Tungi', 'Тёмная')], ['tizim', tr('Tizim', 'Система')]]} />
          } />
          <Qator nom={tr('Til', 'Язык')} oxirgi ong={
            <Segment<Til> qiymat={til} tanla={tilniTanla} variantlar={[['uz', 'Oʻzbekcha'], ['ru', 'Русский']]} />
          } />
        </Bolim>

        <Bolim nom={tr('Obuna', 'Подписка')}>
          <Qator nom={tr('Bepul', 'Бесплатный')} izoh={tr('joriy reja', 'текущий тариф')} ong={<Teg turi="acc">{tr('joriy', 'текущий')}</Teg>} />
          <Qator nom="Pro · Biznes" izoh={tr('Toʻlov (Payme, Click) hali ulanmagan', 'Оплата (Payme, Click) ещё не подключена')} ong={<TezOrada />} oxirgi />
        </Bolim>

        <Bolim nom={tr('Suhbat', 'Чат')}>
          <Qator nom={tr('Yoʻlni boshidan boshlash', 'Начать путь заново')} izoh={tr('Tarix saqlanadi', 'История сохраняется')}
            onPress={s.band ? undefined : s.boshdan} ong={<ChevronRight size={18} color={r.ink2} />} />
          {SAYT !== '' && (
            <Qator nom={tr('Maxfiylik siyosati', 'Политика конфиденциальности')} oxirgi
              onPress={() => void Linking.openURL(`${SAYT}/maxfiylik`)} ong={<ChevronRight size={18} color={r.ink2} />} />
          )}
        </Bolim>

        <Matn turi="izoh" style={{ textAlign: 'center' }}>{tr('ZumSavdo · 0.1.0 · raqamlarni kod beradi, qaror sizniki', 'ZumSavdo · 0.1.0 · цифры даёт код, решение за вами')}</Matn>
      </ScrollView>
    </View>
  );
}
