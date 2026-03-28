import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, ActivityIndicator, Image
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { db } from '../../src/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { Stethoscope, MessageCircle, User } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'users', id as string), (snap) => {
      if (snap.exists()) setDoctor({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    getDoc(doc(db, 'settings', 'global')).then(snap => {
      if (snap.exists()) setWhatsappNumber(snap.data().whatsapp || '');
    });
    return () => unsub();
  }, [id]);

  const handleConsult = () => {
    if (!whatsappNumber) return;
    const msg = encodeURIComponent(
      `Hello ${doctor?.displayName},\nI would like to consult with you regarding my livestock health issue.`
    );
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${msg}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${whatsappNumber}?text=${msg}`);
    });
  };

  if (loading) return <View style={[s.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  if (!doctor) return <View style={[s.center, { backgroundColor: theme.background }]}><Text style={[s.err, { color: theme.textSecondary }]}>{t('item_not_found')}</Text></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.background }]} contentContainerStyle={s.content}>
      <Stack.Screen options={{ 
        headerShown: true,
        title: doctor.displayName || t('doctor_profile'),
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text
      }} />
      
      <View style={[s.hero, { backgroundColor: theme.tint + '10' }]}>
        {doctor.imageUrl ? (
          <Image source={{ uri: doctor.imageUrl }} style={s.heroImage} resizeMode="cover" />
        ) : (
          <User size={80} color={theme.tint} />
        )}
      </View>

      <View style={s.body}>
        <View style={s.infoCard}>
          <Text style={[s.name, { color: theme.text }]}>{doctor.displayName}</Text>
          <View style={s.qualRow}>
            <Stethoscope size={16} color={theme.tint} />
            <Text style={[s.qual, { color: theme.textSecondary }]}>{doctor.qualification || t('veterinary_expert')}</Text>
          </View>
        </View>

        <View style={[s.channelCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[s.channelLabel, { color: theme.textSecondary }]}>{t('response_channel')}</Text>
          <Text style={[s.channelValue, { color: theme.text }]}>{t('whatsapp_response')}</Text>
        </View>

        {doctor.bio && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>{t('experience_summary')}</Text>
            <Text style={[s.bio, { color: theme.text }]}>{doctor.bio}</Text>
          </View>
        )}

        <TouchableOpacity style={[s.btn, { backgroundColor: theme.tint }]} onPress={handleConsult}>
          <MessageCircle size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.btnText}>{t('consult_doctor')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 16, fontWeight: '700' },
  hero: { width: '100%', height: 320, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
  body: { padding: 24, gap: 24 },
  infoCard: { gap: 8 },
  name: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  qualRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qual: { fontSize: 16, fontWeight: '600' },
  channelCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  channelLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  channelValue: { fontSize: 15, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  bio: { fontSize: 16, lineHeight: 26, fontWeight: '500' },
  btn: {
    height: 60, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    marginTop: 10
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
});
