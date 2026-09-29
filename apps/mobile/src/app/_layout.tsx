/**
 * Ilova ildizi: shriftlar, sozlamalar, suhbat holati, navigatsiya.
 *
 * Ekranlar (dizayn raqamlari bilan):
 *   /kirish          2a  kirish
 *   /(tabs)/bosh     2b  bosh sahifa
 *   /(tabs)/suhbatlar 3a suhbatlar roʻyxati
 *   /(tabs)/yuklar   3b  yuklar
 *   /(tabs)/sozlama  3c  sozlamalar
 *   /suhbat          1a–1f  suhbat (hamma qadam shu yerda)
 */

import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { Unbounded_600SemiBold, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SozlamalarProvider, useSozlama } from '../lib/sozlamalar';
import { SuhbatProvider } from '../lib/suhbat';

function Ichki() {
  const { r, mavzu, tayyor } = useSozlama();
  if (!tayyor) return <View style={{ flex: 1, backgroundColor: r.bg }} />;
  return (
    <>
      <StatusBar style={mavzu === 'yorug' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: r.bg } }} />
    </>
  );
}

export default function Ildiz() {
  const [shrift] = useFonts({
    Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold,
    Unbounded_600SemiBold, Unbounded_700Bold,
  });
  return (
    <SafeAreaProvider>
      <SozlamalarProvider>
        <SuhbatProvider>
          {shrift ? <Ichki /> : <View style={{ flex: 1, backgroundColor: '#13100C' }} />}
        </SuhbatProvider>
      </SozlamalarProvider>
    </SafeAreaProvider>
  );
}
