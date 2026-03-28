import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, ActivityIndicator, Alert, Image, useColorScheme
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { db } from '../../src/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useFarmerProfile } from '../../src/context/FarmerProfileContext';
import { Package, ShoppingBag, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { Colors } from '../../src/constants/Colors';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];
  const { profile } = useFarmerProfile();
  
  const [item, setItem] = useState<any>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'inventory', id as string), (snap) => {
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    getDoc(doc(db, 'settings', 'global')).then(snap => {
      if (snap.exists()) setWhatsappNumber(snap.data().whatsapp || '');
    });
    return () => unsub();
  }, [id]);

  const handleOrder = async () => {
    if (!item) return;
    setOrdering(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        farmerName: profile?.name || 'Unknown Farmer',
        phoneNumber: profile?.phone || 'N/A',
        issue: `Order: ${item.name} (${item.category}) - ₹${item.price}`,
        price: Number(item.price),
        status: 'Pending',
        type: 'Order',
        itemRef: item.id,
        createdAt: serverTimestamp(),
        village: profile?.village || "",
      });
      if (whatsappNumber) {
        const msg = encodeURIComponent(
          `Sanjivani Order:\nItem: ${item.name}\nCategory: ${item.category}\nPrice: ₹${item.price}\nFarmer: ${profile?.name}\nPhone: ${profile?.phone}`
        );
        const url = `whatsapp://send?phone=${whatsappNumber}&text=${msg}`;
        const ok = await Linking.canOpenURL(url);
        await Linking.openURL(ok ? url : `https://wa.me/${whatsappNumber}?text=${msg}`);
      }
      setOrdered(true);
    } catch (err) {
      Alert.alert(t('generic_error'));
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <View style={[s.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  if (!item) return <View style={[s.center, { backgroundColor: theme.background }]}><Text style={[s.err, { color: theme.textSecondary }]}>{t('item_not_found')}</Text></View>;

  const isMedicine = item.category === 'Medicine';
  const isLow = (item.stock || 0) <= 5;

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.background }]} contentContainerStyle={s.content}>
      <Stack.Screen options={{ 
        title: t('product_details'),
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text
      }} />
      
      <View style={[s.hero, { backgroundColor: isMedicine ? theme.tint + '10' : '#FEF9C320' }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={s.heroImage} resizeMode="cover" />
        ) : (
          <Package size={72} color={isMedicine ? theme.tint : '#CA8A04'} />
        )}
      </View>

      <View style={s.body}>
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: isMedicine ? theme.tint + '15' : '#FEF3C750' }]}>
            <Text style={[s.badgeText, { color: isMedicine ? theme.tint : '#B45309' }]}>
              {item.category}
            </Text>
          </View>
          {isLow && (
            <View style={s.lowBadge}>
              <AlertTriangle size={12} color="#EF4444" />
              <Text style={s.lowText}>{t('low_stock')}</Text>
            </View>
          )}
        </View>

        <Text style={[s.name, { color: theme.text }]}>{item.name}</Text>
        {item.description ? <Text style={[s.desc, { color: theme.textSecondary }]}>{item.description}</Text> : null}

        <View style={[s.statsRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={s.priceWrapper}>
            <View style={s.stat}>
              <Text style={[s.statLabel, { color: theme.textSecondary }]}>{t('price')}</Text>
              <Text style={[s.statValue, { color: theme.tint }]}>₹{item.price}</Text>
            </View>
            {item.mrp && item.mrp > item.price && (
              <View style={s.mrpBadgeWrapper}>
                 <Text style={[s.mrpText, { color: theme.textSecondary }]}>₹{item.mrp}</Text>
                 <View style={[s.discountBadgeMinor, { backgroundColor: theme.tint + '15' }]}>
                    <Text style={[s.discountTextMinor, { color: theme.tint }]}>-{item.discountPercentage}%</Text>
                 </View>
              </View>
            )}
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.stat}>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>{t('stock')}</Text>
            <Text style={[s.statValue, { color: theme.text }, isLow && { color: '#EF4444' }]}>{item.stock} {item.unit}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.stat}>
            <Text style={[s.statLabel, { color: theme.textSecondary }]}>{t('unit_label')}</Text>
            <Text style={[s.statValue, { color: theme.text }]}>{item.unit}</Text>
          </View>
        </View>

        {ordered ? (
          <View style={[s.successBox, { backgroundColor: theme.tint + '15' }]}>
            <CheckCircle size={24} color={theme.tint} />
            <Text style={[s.successText, { color: theme.tint }]}>{t('order_placed')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn, { backgroundColor: theme.tint }, ordering && s.btnLoading]} onPress={handleOrder} disabled={ordering}>
            {ordering
              ? <ActivityIndicator color="#fff" />
              : <>
                  <ShoppingBag size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.btnText}>{t('order_via_whatsapp')}</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { fontWeight: '700', fontSize: 16 },
  hero: { width: '100%', height: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  body: { padding: 24, gap: 16 },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  lowBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  lowText: { color: '#EF4444', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  name: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  desc: { fontSize: 15, fontWeight: '500', lineHeight: 24 },
  statsRow: { flexDirection: 'row', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1 },
  priceWrapper: { flex: 1.2 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  mrpBadgeWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  mrpText: { fontSize: 12, textDecorationLine: 'line-through', fontWeight: '600', opacity: 0.6 },
  discountBadgeMinor: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  discountTextMinor: { fontSize: 10, fontWeight: '800' },
  divider: { width: 1, height: 40 },
  btn: {
    height: 60, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  btnLoading: { backgroundColor: '#94A3B8', shadowOpacity: 0, elevation: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 18 },
  successText: { fontWeight: '800', fontSize: 14 },
});
