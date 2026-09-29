/**
 * Pastki menyu — dizayn 2b/3a–3c: qorongʻi "tabletka" (yorugʻda teskari rang, tungida karta), faol boʻlim aksent
 * rangida nomi bilan, qolganlari faqat ikonka.
 */

import { House, MessageCircle, SlidersHorizontal, Truck, type LucideIcon } from 'lucide-react-native';
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import type { Ref } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { kartaSoyasi, SHRIFT } from '../../lib/mavzu';
import { useSozlama } from '../../lib/sozlamalar';

type MenyuTugmasiProps = TabTriggerSlotProps & { Ikon: LucideIcon; nom: string; ref?: Ref<View> };

function MenyuTugmasi({ Ikon, nom, isFocused, ...props }: MenyuTugmasiProps) {
  const { r } = useSozlama();
  // Menyu ikkala mavzuda ham qorongʻi — faol boʻlmagan ikonka och rangda.
  const sokin = 'rgba(255,255,255,0.62)';
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={nom}
      accessibilityState={{ selected: isFocused }}
      style={{
        flex: isFocused ? 2 : 1,
        height: 48,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        backgroundColor: isFocused ? r.acc : 'transparent',
      }}
    >
      <Ikon size={isFocused ? 18 : 20} color={isFocused ? r.accInk : sokin} />
      {isFocused && <Text numberOfLines={1} style={{ fontFamily: SHRIFT.matnYarim, fontSize: 13, color: r.accInk }}>{nom}</Text>}
    </Pressable>
  );
}

export default function MenyuLayout() {
  const { r, tr, mavzu } = useSozlama();
  const pastki = useSafeAreaInsets().bottom;
  return (
    <Tabs style={{ flex: 1, backgroundColor: r.bg }}>
      <TabSlot />
      {/* TabList `Tabs` ning BEVOSITA bolasi boʻlishi shart — oʻralsa navigator ekran topmaydi. */}
      <TabList style={[{ flexDirection: 'row', gap: 4, padding: 5, borderRadius: 999, marginHorizontal: 14, marginTop: 6, marginBottom: Math.max(pastki, 12) }, mavzu === 'yorug' ? { backgroundColor: r.teskari } : [{ backgroundColor: r.karta }, kartaSoyasi(mavzu)]]}>
        <TabTrigger name="bosh" href="/bosh" asChild>
          <MenyuTugmasi Ikon={House} nom={tr('Bosh', 'Главная')} />
        </TabTrigger>
        <TabTrigger name="suhbatlar" href="/suhbatlar" asChild>
          <MenyuTugmasi Ikon={MessageCircle} nom={tr('Suhbat', 'Чат')} />
        </TabTrigger>
        <TabTrigger name="yuklar" href="/yuklar" asChild>
          <MenyuTugmasi Ikon={Truck} nom={tr('Yuklar', 'Грузы')} />
        </TabTrigger>
        <TabTrigger name="sozlama" href="/sozlama" asChild>
          <MenyuTugmasi Ikon={SlidersHorizontal} nom={tr('Sozlama', 'Настройки')} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
