/**
 * Kirish nuqtasi: birinchi ochilishda kirish ekrani (2a), keyin bosh sahifa.
 */

import { Redirect } from 'expo-router';
import { useSozlama } from '../lib/sozlamalar';

export default function Boshlanish() {
  const { kirdi } = useSozlama();
  return <Redirect href={kirdi ? '/bosh' : '/kirish'} />;
}
