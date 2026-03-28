import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert, Animated, Platform,
  Modal, ScrollView, Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { db } from '../../src/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFarmerProfile } from '../../src/context/FarmerProfileContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureNotification } from '../../src/lib/notifications';
import { 
  ShoppingBag, 
  Stethoscope, 
  Clock, 
  CheckCircle, 
  MessageCircle, 
  User,
  ShieldCheck,
  Pill,
  Share2,
  X,
  MapPin,
  Phone
} from 'lucide-react-native';
import { Colors } from '../../src/constants/Colors';
import { useRouter } from 'expo-router';
import { Image } from 'react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import InlineNotice from '../../src/components/InlineNotice';
import NotificationBell from '../../src/components/NotificationBell';

const Shimmer = ({ width, height, style }: any) => {
  const { resolvedTheme } = useAppTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => {
      loop.stop();
      animatedValue.stopAnimation();
    };
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ width, height, backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#E2E8F0', opacity }, style]} />;
};

interface PrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  description?: string;
}

interface Order {
  id: string;
  issue: string;
  status: string;
  type: string;
  createdAt: any;
  doctorNotes?: string;
  prescription?: PrescriptionItem[];
  rxList?: any[]; // Backward compatibility
  assignedDoctorName?: string;
  assignedDoctorQuals?: string;
  animalType?: string;
  breed?: string;
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { profile } = useFarmerProfile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Orders' | 'Consultations'>('Orders');
  const [viewingRx, setViewingRx] = useState<Order | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [clinicBrand, setClinicBrand] = useState({
    clinicName: 'Sanjivani Vet Care',
    tagline: 'Excellence in Veterinary Logistics',
    phone: '+91 94350 00000',
  });
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingOrder = (order: Order) => {
    Alert.alert(
      t('cancel_request'),
      order.issue,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('cancel_request'),
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'appointments', order.id), {
                status: 'Cancelled',
                cancelledAt: serverTimestamp(),
                cancelledBy: 'farmer',
              });
              setNotice({ type: 'success', message: t('request_cancelled') });
            } catch (error) {
              setNotice({ type: 'error', message: t('generic_error') });
            }
          }
        }
      ]
    );
  };

  const sharePrescription = (order: Order) => {
    let text = `*SANJIVANI VET CARE - Medical Protocol*\n\nRegarding: ${order.issue}\n`;
    const meds = order.prescription || order.rxList;
    if (meds && meds.length > 0) {
      text += `\n*Prescribed Medications:*\n`;
      meds.forEach((m, i) => {
        text += `${i + 1}. ${m.name || m.medicineName} (${m.dosage || ''}) - ${m.frequency || ''} for ${m.duration || ''}\n`;
      });
    }
    const message = encodeURIComponent(text);
    Linking.openURL(`https://wa.me/?text=${message}`);
  };

  useEffect(() => {
    if (!profile?.phone) return;
    const merged = new Map<string, Order>();

    const loadClinicBrand = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (!settingsSnap.exists()) return;
        const data = settingsSnap.data();
        setClinicBrand({
          clinicName: data.clinicName || 'Sanjivani Vet Care',
          tagline: data.tagline || 'Excellence in Veterinary Logistics',
          phone: data.whatsapp || data.phone || '+91 94350 00000',
        });
      } catch {
        // Keep defaults when settings are unavailable.
      }
    };
    loadClinicBrand();

    const applySnapshot = (snap: any) => {
      snap.docs.forEach((d: any) => {
        merged.set(d.id, { id: d.id, ...d.data() } as Order);

        // Emit farmer-side notifications for current state; eventKey dedupe prevents repeats.
        const data = d.data();
        const newStatus: string = data.status || '';
        const recipientId: string = profile?.deviceId || '';

        if (recipientId) {
          const isConsultation = (data.type || '').toLowerCase() !== 'order';

          if (newStatus === 'InProgress' || newStatus === 'Accepted') {
            ensureNotification({
              recipientType: 'farmer',
              recipientId,
              eventType: 'appointment_accepted',
              entityType: 'appointment',
              entityId: d.id,
              eventKey: `appointment_accepted:${d.id}:${newStatus}`,
              title: isConsultation ? 'Consultation accepted 👨‍⚕️' : 'Order confirmed ✅',
              body: isConsultation
                ? 'A doctor has accepted your consultation request.'
                : 'Your order is being processed by the clinic.',
              deepLink: '/orders',
              priority: 'normal',
            });
          } else if (newStatus === 'Completed') {
            const hasPrescription =
              (data.prescription && data.prescription.length > 0) ||
              (data.rxList && data.rxList.length > 0);

            if (hasPrescription && isConsultation) {
              ensureNotification({
                recipientType: 'farmer',
                recipientId,
                eventType: 'prescription_ready',
                entityType: 'appointment',
                entityId: d.id,
                eventKey: `prescription_ready:${d.id}`,
                title: 'Prescription ready 💊',
                body: 'Your prescription has been prepared. Tap Activity to view.',
                deepLink: '/orders',
                priority: 'critical',
              });
            } else {
              ensureNotification({
                recipientType: 'farmer',
                recipientId,
                eventType: isConsultation ? 'consultation_completed' : 'order_completed',
                entityType: 'appointment',
                entityId: d.id,
                eventKey: `${isConsultation ? 'consultation' : 'order'}_completed:${d.id}`,
                title: isConsultation ? 'Consultation completed' : 'Order fulfilled 🎉',
                body: isConsultation
                  ? 'Your consultation has been resolved by the clinic.'
                  : 'Your order has been fulfilled and is ready for pickup.',
                deepLink: '/orders',
                priority: 'normal',
              });
            }
          } else if (newStatus === 'Cancelled') {
            ensureNotification({
              recipientType: 'farmer',
              recipientId,
              eventType: 'request_cancelled',
              entityType: 'appointment',
              entityId: d.id,
              eventKey: `cancelled:${d.id}`,
              title: 'Request cancelled',
              body: 'Your request has been cancelled by the clinic.',
              deepLink: '/orders',
              priority: 'normal',
            });
          }
        }
      });

      const sorted = Array.from(merged.values()).sort((a, b) => {
        const aSec = a.createdAt?.seconds || 0;
        const bSec = b.createdAt?.seconds || 0;
        return bSec - aSec;
      });

      setOrders(sorted);
      setLoading(false);
      setRefreshing(false);
    };

    const handleError = (err: any) => {
      console.error(err);
      setNotice({ type: 'error', message: t('generic_error') });
      setLoading(false);
      setRefreshing(false);
    };

    const unsubs: Array<() => void> = [];

    // Primary identity key
    unsubs.push(
      onSnapshot(
        query(collection(db, 'appointments'), where('phoneNumber', '==', profile.phone)),
        { next: applySnapshot, error: handleError }
      )
    );

    // Legacy records fallback (older records may not have normalized phone fields)
    if (profile?.name) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'appointments'), where('farmerName', '==', profile.name)),
          { next: applySnapshot, error: handleError }
        )
      );
    }

    if (profile?.deviceId) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'appointments'), where('farmerId', '==', profile.deviceId)),
          { next: applySnapshot, error: handleError }
        )
      );
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      unsubs.forEach((u) => u());
    };
  }, [profile?.phone, profile?.name, profile?.deviceId, t]);

  const onRefresh = () => {
    setRefreshing(true);
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    // Safety fallback so pull-to-refresh always resolves even if listener callback does not fire.
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
    }, 1800);
  };

  const getNormalizedType = (order: Order): 'Order' | 'Consultation' => {
    const type = (order.type || '').toLowerCase();
    if (type === 'order') return 'Order';
    if (type === 'consultation' || type === 'visit' || !type) return 'Consultation';
    if ((order.issue || '').toLowerCase().includes('order')) return 'Order';
    return 'Consultation';
  };

  const filteredData = orders.filter((o) =>
    activeTab === 'Orders' ? getNormalizedType(o) === 'Order' : getNormalizedType(o) === 'Consultation'
  );

  const renderItem = ({ item }: { item: Order }) => {
    const isPending = item.status === 'Pending';
    const isConsult = getNormalizedType(item) === 'Consultation';
    const hasPrescription = (item.prescription && item.prescription.length > 0) || (item.rxList && item.rxList.length > 0);
    const statusHint = item.status === 'Pending'
      ? t('pending_status_hint')
      : item.status === 'Cancelled'
      ? t('cancelled_status_hint')
      : t('completed_status_hint');

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: isPending ? '#F59E0B' : '#059669' }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: isConsult ? theme.tint + '15' : '#F0FDF4' }]}>
            {isConsult
              ? <Stethoscope size={22} color={theme.tint} />
              : <ShoppingBag size={22} color="#059669" />
            }
          </View>
          <View style={styles.cardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.issue}</Text>
              {item.animalType && (
                <View style={{ backgroundColor: theme.tint + '10', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 8, fontWeight: '900', color: theme.tint, textTransform: 'uppercase' }}>{item.animalType}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
              {item.breed ? `${item.breed} • ` : ''}
              {item.createdAt?.seconds
                ? new Date(item.createdAt.seconds * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Just now'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isPending ? '#FEF3C7' : '#D1FAE5' }]}>
            {isPending
              ? <Clock size={12} color="#B45309" />
              : <CheckCircle size={12} color="#059669" />
            }
            <Text style={[styles.badgeText, { color: isPending ? '#B45309' : '#059669' }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.statusHint, { color: theme.textSecondary }]}>{statusHint}</Text>

        {item.doctorNotes && (
          <View style={[styles.notesContainer, { backgroundColor: theme.tint + '08', borderColor: theme.tint + '20' }]}>
            <View style={styles.notesHeader}>
              <MessageCircle size={14} color={theme.tint} />
              <Text style={[styles.notesTitle, { color: theme.tint }]}>{t('followup_notes')}</Text>
            </View>
            <Text style={[styles.notesText, { color: theme.text }]}>{item.doctorNotes}</Text>
          </View>
        )}

        {item.prescription && item.prescription.length > 0 && (
          <TouchableOpacity 
            style={[styles.rxButton, { backgroundColor: theme.tint }]}
            onPress={() => setViewingRx(item)}
          >
            <Pill size={14} color="white" />
            <Text style={styles.rxButtonText}>{t('prescription_label')}</Text>
          </TouchableOpacity>
        )}

        {item.type === 'Order' && item.status === 'Pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelPendingOrder(item)}
          >
            <Text style={styles.cancelButtonText}>{t('cancel_request')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const SkeletonItem = () => (
    <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Shimmer width={48} height={48} style={{ borderRadius: 16, marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <Shimmer width="60%" height={14} style={{ marginBottom: 6 }} />
          <Shimmer width="40%" height={10} />
        </View>
        <Shimmer width={60} height={24} style={{ borderRadius: 12 }} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Modal
        visible={!!viewingRx}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setViewingRx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}> 
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}> 
              <Text style={[styles.modalHeaderTitle, { color: theme.textSecondary }]}>{t('prescription_label').toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setViewingRx(null)} style={[styles.closeButton, { backgroundColor: theme.background }]}> 
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Branded Header */}
              <View style={[styles.rxBranding, { borderBottomColor: theme.tint }]}> 
                <View>
                  <Text style={[styles.rxBrandingTitle, { color: theme.tint }]}>{clinicBrand.clinicName.toUpperCase()}</Text>
                  <Text style={[styles.rxBrandingSub, { color: theme.textSecondary }]}>{clinicBrand.tagline}</Text>
                </View>
                <View style={styles.rxBrandingRight}>
                   <Phone size={10} color={theme.tint} />
                   <Text style={[styles.rxContact, { color: theme.textSecondary }]}>{clinicBrand.phone}</Text>
                </View>
              </View>

              {/* Patient & Doctor */}
              <View style={[styles.rxInfoGrid, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                <View style={styles.rxInfoCol}>
                  <Text style={[styles.rxInfoLabel, { color: theme.textSecondary }]}>Client Identity</Text>
                  <Text style={[styles.rxInfoValue, { color: theme.text }]}>{profile?.name}</Text>
                </View>
                <View style={[styles.rxInfoCol, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.rxInfoLabel, { color: theme.textSecondary }]}>Physician</Text>
                  <Text style={[styles.rxInfoValue, { color: theme.tint }]}>Dr. {viewingRx?.assignedDoctorName || 'Sanjivani Expert'}</Text>
                  <Text style={[styles.rxDoctorQuals, { color: theme.textSecondary }]}>{viewingRx?.assignedDoctorQuals || 'Veterinary Surgeon'}</Text>
                </View>
              </View>

              {/* Rx Box */}
              <Text style={[styles.rxSymbol, { color: theme.text, borderBottomColor: theme.border }]}>Rx</Text>

              {/* Medications */}
              <View style={styles.medsContainer}>
                {(viewingRx?.prescription || viewingRx?.rxList)?.map((med, idx) => (
                  <View key={med.id || idx} style={[styles.medItem, { borderTopColor: theme.border }, idx === 0 && { borderTopWidth: 0 }]}>
                    <View style={styles.medMain}>
                      <Text style={[styles.medName, { color: theme.text }]}>{med.name || med.medicineName}</Text>
                      <Text style={[styles.medMeta, { color: theme.textSecondary }]}>{med.dosage || ''} • {med.frequency || ''}</Text>
                    </View>
                    <View style={styles.medRight}>
                      <Text style={[styles.medDuration, { color: theme.text }]}>{med.duration || ''}</Text>
                    </View>
                    {med.description && (
                      <View style={styles.medDescRow}>
                        <Text style={[styles.medDesc, { color: theme.tint }]}>"{med.description}"</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View style={[styles.rxFooter, { borderTopColor: theme.border }]}> 
                 <View style={[styles.sealContainer, { backgroundColor: theme.tint + '10', borderColor: theme.tint + '25' }]}> 
                    <ShieldCheck size={32} color={theme.tint} />
                    <View>
                      <Text style={[styles.sealTitle, { color: theme.tint }]}>Digital Seal of Care</Text>
                      <Text style={[styles.sealSub, { color: theme.textSecondary }]}>Verified Professional Protocol</Text>
                    </View>
                 </View>
                 <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>*This is a computer-generated protocol following tele-consultation analysis.</Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, { backgroundColor: theme.card, borderTopColor: theme.border }]}> 
               <TouchableOpacity 
                 style={[styles.shareButton, { backgroundColor: theme.tint }]} 
                 onPress={() => viewingRx && sharePrescription(viewingRx)}
               >
                 <Share2 size={16} color="white" />
                 <Text style={styles.shareButtonText}>{t('share_whatsapp')}</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Branding Header */}
      <View style={{ backgroundColor: theme.tint }}>
        <View style={[styles.header, { backgroundColor: 'transparent', paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.brandingWrapper}>
            <View style={[styles.logoContainer, { backgroundColor: '#ffffff26' }]}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
            </View>
            <View style={styles.brandingText}>
              <View style={styles.titleRow}>
                <Text style={[styles.brandingTitleMain, { color: '#ffffff' }]}>Sanjivani</Text>
                <Text style={[styles.brandingTitleSub, { color: '#E2E8F0' }]}> Activity</Text>
              </View>
              <Text style={[styles.brandingSubtitle, { color: '#F1F5F9' }]}>Your history &amp; feedback</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <NotificationBell />
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={[styles.avatarButton, { backgroundColor: '#ffffff22', borderColor: '#ffffff50' }]} 
              onPress={() => router.push('/(tabs)/settings')}
            >
              {profile?.name ? (
                <Text style={[styles.avatarText, { color: '#ffffff' }]}>{profile.name.charAt(0).toUpperCase()}</Text>
              ) : (
                <User size={22} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[
          { key: 'Orders', label: t('orders'), icon: ShoppingBag },
          { key: 'Consultations', label: t('consultations'), icon: Stethoscope }
        ].map(tab => (
          <TouchableOpacity 
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: theme.tint + '10' }]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <tab.icon size={18} color={activeTab === tab.key ? theme.tint : theme.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? theme.tint : theme.textSecondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {notice && (
        <View style={styles.noticeWrap}>
          <InlineNotice type={notice.type} message={notice.message} />
        </View>
      )}

      <FlatList
        data={(loading ? [1, 2, 3] : filteredData) as any}
        renderItem={loading ? SkeletonItem : renderItem}
        keyExtractor={(item: any) => item.id || item.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ShoppingBag size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{activeTab === 'Orders' ? t('no_orders_yet') : t('no_consultations_yet')}</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>{t('orders_description')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandingWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', padding: 6, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '100%', height: '100%' },
  brandingText: { justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  brandingTitleMain: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  brandingTitleSub: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  brandingSubtitle: { fontSize: 11, fontWeight: '700', marginTop: -2, opacity: 0.8 },
  avatarButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: 16, fontWeight: '900' },
  list: { padding: 20, paddingBottom: 100 },
  tabs: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  noticeWrap: { marginHorizontal: 20, marginTop: 12 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    borderRadius: 24,
    padding: 16, 
    marginBottom: 16,
    borderLeftWidth: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  statusHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15, 
    fontWeight: '800', 
    marginBottom: 2,
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 11, 
    fontWeight: '600', 
    opacity: 0.7,
  },
  badge: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10, 
    fontWeight: '900', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },
  notesContainer: {
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  rxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rxButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  empty: {
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18, 
    fontWeight: '900', 
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13, 
    fontWeight: '600', 
    marginTop: 8, 
    opacity: 0.6, 
    textAlign: 'center', 
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 24,
    paddingBottom: 120,
  },
  rxBranding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 4,
    borderBottomColor: '#10b981',
    paddingBottom: 20,
    marginBottom: 24,
  },
  rxBrandingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  rxBrandingSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  rxBrandingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rxContact: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  rxInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  rxInfoCol: {
    flex: 1,
  },
  rxInfoLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rxInfoValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
  },
  rxDoctorQuals: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  rxSymbol: {
    fontSize: 32,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    color: '#1e293b',
    fontStyle: 'italic',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
  },
  medsContainer: {
    marginBottom: 30,
  },
  medItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  medMain: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  medMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  medRight: {
    alignItems: 'flex-end',
  },
  medDuration: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
  },
  medDescRow: {
    width: '100%',
    marginTop: 6,
  },
  medDesc: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    fontStyle: 'italic',
  },
  rxFooter: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sealContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sealTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sealSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#15803d',
  },
  disclaimer: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94a3b8',
    lineHeight: 12,
  },
  modalActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  shareButton: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
