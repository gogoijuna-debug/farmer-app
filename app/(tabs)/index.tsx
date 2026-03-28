import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { db } from '../../src/lib/firebase';
import { collection, query, onSnapshot, doc, getDoc, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { useFarmerProfile } from '../../src/context/FarmerProfileContext';
import { useAuth } from '../../src/context/AuthContext';
import { useAppTheme } from '../../src/context/ThemeContext';
import InlineNotice from '../../src/components/InlineNotice';
import { 
  Package, 
  Stethoscope, 
  ChevronRight, 
  Search,
  X,
  Send,
  ShoppingBag,
  Settings,
  User 
} from 'lucide-react-native';

const Shimmer = ({ width, height, style }: any) => {
  const { resolvedTheme } = useAppTheme();
  const animatedValue = new Animated.Value(0);
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ width, height, backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#E2E8F0', opacity }, style]} />;
};

interface InventoryItem {
  id: string;
  name: string;
  category: "Medicine" | "Feed";
  stock: number;
  unit: string;
  price: number;
  mrp?: number;
  discountPercentage?: number;
  description?: string;
  imageUrl?: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useFarmerProfile();
  const { loading: authLoading } = useAuth();
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Medicine" | "Feed">("All");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      if (docSnap.exists()) setWhatsappNumber(docSnap.data().whatsapp || "");
    };
    fetchSettings();

    const unsubInventory = onSnapshot(collection(db, "inventory"), (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
      setItems(arr);
      setLoading(false);
    });

    const unsubDoctors = onSnapshot(
      query(collection(db, "users"), where("role", "==", "doctor"), where("active", "==", true)),
      (snap) => {
        setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      () => {
        // Keep the app usable if the directory read is restricted.
        setDoctors([]);
      }
    );

    return () => { unsubInventory(); unsubDoctors(); };
  }, [authLoading]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let result = items;
    if (selectedCategory !== "All") result = result.filter(i => i.category === selectedCategory);
    if (debouncedSearchQuery) {
      result = result.filter(i => i.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
    }
    setFilteredItems(result);
  }, [debouncedSearchQuery, selectedCategory, items]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleConsultationSubmit = async () => {
    if (!issueDescription.trim()) {
      setNotice({ type: 'error', message: t('issue_required') });
      return;
    }
    if (!selectedDoc) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "appointments"), {
        farmerId: profile?.deviceId || profile?.phone || "unknown",
        farmerName: profile?.name || "Farmer",
        phoneNumber: profile?.phone || "N/A",
        issue: issueDescription,
        status: "Pending",
        type: "Consultation",
        village: profile?.village || "",
        assignedDoctorId: selectedDoc.id,
        assignedDoctorName: selectedDoc.displayName || "Doctor",
        assignedDoctorQuals: selectedDoc.qualification || "",
        isDirectRequest: true,
        createdAt: serverTimestamp()
      });
      if (whatsappNumber) {
        const msg = encodeURIComponent(`Sanjivani Consultation Request:\n\n*Physician:* Dr. ${selectedDoc.displayName}\n*Farmer:* ${profile?.name}\n*Village:* ${profile?.village}\n*Animal Issue:* ${issueDescription}`);
        Linking.openURL(`whatsapp://send?phone=${whatsappNumber}&text=${msg}`).catch(() => {
          Linking.openURL(`https://wa.me/${whatsappNumber}?text=${msg}`);
        });
      }
      setIsModalVisible(false);
      setIssueDescription("");
      setSelectedDoc(null);
      setNotice({ type: 'success', message: t('consultation_sent') });
    } catch (e) {
      setNotice({ type: 'error', message: t('generic_error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderItem = async (item: InventoryItem) => {
    if (item.stock <= 0) {
      setNotice({ type: 'error', message: t('out_of_stock') });
      return;
    }
    try {
      await addDoc(collection(db, "appointments"), {
        farmerId: profile?.deviceId || profile?.phone || "unknown",
        farmerName: profile?.name || "Farmer",
        phoneNumber: profile?.phone || "N/A",
        issue: `Order Request: ${item.name}`,
        status: "Pending",
        type: "Order",
        itemRef: item.id,
        village: profile?.village || "",
        createdAt: serverTimestamp()
      });
      if (whatsappNumber) {
        const msg = encodeURIComponent(`Sanjivani Order:\n\nItem: ${item.name}\nQuantity: 1 ${item.unit}\nPrice: ₹${item.price}\nFarmer: ${profile?.name}\nVillage: ${profile?.village}`);
        Linking.openURL(`whatsapp://send?phone=${whatsappNumber}&text=${msg}`).catch(() => {
          Linking.openURL(`https://wa.me/${whatsappNumber}?text=${msg}`);
        });
      }
      setNotice({ type: 'success', message: t('order_request_sent') });
    } catch (e) {
      setNotice({ type: 'error', message: t('generic_error') });
    }
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity activeOpacity={0.9} style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => router.push(`/item/${item.id}` as any)}>
      <View style={[styles.itemImageContainer, { backgroundColor: theme.background }]}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" /> : (
          <View style={styles.itemIcon}><Package size={28} color={theme.textSecondary} /></View>
        )}
        <View style={[styles.itemBadge, { backgroundColor: theme.card + 'D0', borderColor: theme.border, borderWidth: 1 }]}><Text style={[styles.itemBadgeText, { color: theme.text }]}>{t(item.category.toLowerCase())}</Text></View>
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={[styles.itemPrice, { color: theme.tint }]}>₹{item.price}</Text>
            {item.mrp && item.mrp > item.price && (
              <Text style={[styles.itemMrp, { color: theme.textSecondary }]}>₹{item.mrp}</Text>
            )}
            {item.discountPercentage && item.discountPercentage > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: theme.tint + '15' }]}>
                <Text style={[styles.discountText, { color: theme.tint }]}>
                  {item.discountPercentage}% {t('discount')}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.itemUnit, { color: theme.textSecondary }]}>/ {item.unit}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.stockBadge, { backgroundColor: item.stock <= 5 ? '#FEE2E2' : theme.background }]}>
            <Text style={[styles.stockText, { color: item.stock <= 5 ? '#EF4444' : theme.textSecondary }]}>{item.stock} {item.unit} {t('left')}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.orderButton,
              { backgroundColor: item.stock <= 0 ? '#E2E8F0' : theme.tint + '10', borderColor: item.stock <= 0 ? '#CBD5E1' : theme.tint + '30' }
            ]}
            onPress={() => handleOrderItem(item)}
            disabled={item.stock <= 0}
          >
            <ShoppingBag size={14} color={item.stock <= 0 ? '#64748B' : theme.tint} style={{ marginRight: 4 }} />
            <Text style={[styles.orderButtonText, { color: item.stock <= 0 ? '#64748B' : theme.tint }]}>{item.stock <= 0 ? t('out_of_stock') : t('order_whatsapp')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        stickyHeaderIndices={[0]} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Sticky Elite Header Hub */}
        <View style={{ backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          {/* Main Branding Row */}
          <View style={[styles.header, { backgroundColor: 'transparent', paddingTop: Math.max(insets.top, 20) }]}>
            <View style={styles.brandingWrapper}>
              <View style={[styles.logoContainer, { backgroundColor: theme.tint + '10' }]}>
                <Image 
                  source={require('../../assets/logo.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain" 
                />
              </View>
              <View style={styles.brandingText}>
                <View style={styles.titleRow}>
                  <Text style={[styles.brandingTitleMain, { color: theme.text }]}>Sanjivani</Text>
                  <Text style={[styles.brandingTitleSub, { color: theme.tint }]}> Vet Care</Text>
                </View>
                <Text style={[styles.brandingSubtitle, { color: theme.textSecondary }]}>Your livestock care partner</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={[styles.avatarButton, { backgroundColor: theme.tint + '15', borderColor: theme.tint + '30' }]} 
              onPress={() => router.push('/(tabs)/settings')}
            >
              {profile?.name ? (
                <Text style={[styles.avatarText, { color: theme.tint }]}>{profile.name.charAt(0).toUpperCase()}</Text>
              ) : (
                <User size={22} color={theme.tint} />
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar - Slimmed */}
          <View style={styles.stickyBar}>
            <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}>
              <Search size={20} color={theme.textSecondary} style={{ marginLeft: 16 }} />
              <TextInput 
                style={[styles.searchInput, { color: theme.text }]} 
                placeholder={t('search_placeholder')} 
                placeholderTextColor={theme.textSecondary} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
            </View>
          </View>
        </View>

        {notice && (
          <View style={styles.noticeWrap}>
            <InlineNotice type={notice.type} message={notice.message} />
          </View>
        )}

        {/* Meet Experts Carousel */}
        {doctors.length > 0 && (
          <View style={styles.doctorsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('consult_live_experts')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctorsScroll}>
              {doctors.map(doc => (
                <View key={doc.id} style={[styles.doctorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.doctorImageContainer}>
                    {doc.imageUrl ? <Image source={{ uri: doc.imageUrl }} style={styles.doctorImage} /> : <View style={styles.doctorIconPlaceholder}><User size={32} color={theme.textSecondary} /></View>}
                  </View>
                  <Text style={[styles.doctorName, { color: theme.text }]} numberOfLines={1}>{doc.displayName || "Doctor"}</Text>
                  <Text style={[styles.doctorQual, { color: theme.textSecondary }]} numberOfLines={1}>{doc.qualification || "Veterinary"}</Text>
                  
                  <View style={styles.doctorCardActions}>
                    <TouchableOpacity 
                      style={[styles.doctorConsultBtn, { backgroundColor: theme.tint }]}
                      onPress={() => {
                        setSelectedDoc(doc);
                        setIsModalVisible(true);
                      }}
                    >
                      <Stethoscope size={14} color="white" />
                      <Text style={styles.doctorConsultBtnText}>{t('consult_cta')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.doctorProfileBtnMinor, { borderColor: theme.border }]}
                      onPress={() => router.push({ pathname: '/doctor/[id]', params: { id: doc.id } } as any)}
                    >
                      <Text style={[styles.doctorProfileBtnTextMinor, { color: theme.textSecondary }]}>{t('info_cta')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Catalog Section With Contextual Filters */}
        <View style={styles.catalogHeader}>
          <View style={styles.catalogTitleWrapper}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {selectedCategory === "All" ? t('product_catalog') : t(selectedCategory.toLowerCase())}
            </Text>
            <View style={[styles.titleDot, { backgroundColor: theme.tint }]} />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogTabs}>
            {["All", "Medicine", "Feed"].map((cat) => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setSelectedCategory(cat as any)} 
                style={[
                  styles.catTab, 
                  { 
                    backgroundColor: selectedCategory === cat ? theme.tint : theme.card,
                    borderColor: selectedCategory === cat ? theme.tint : theme.border 
                  }
                ]}
              >
                <Text style={[styles.catTabText, { color: selectedCategory === cat ? '#fff' : theme.textSecondary }]}>
                  {cat === "All" ? t('all') : t(cat.toLowerCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listContainer}>
          {loading ? [1, 2, 3].map(i => <View key={i} style={[styles.itemCard, { backgroundColor: theme.card, height: 100, marginBottom: 16 }]} />) : 
            filteredItems.length > 0 ? filteredItems.map(item => <View key={item.id}>{renderItem({ item })}</View>) : (
              <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Package size={36} color={theme.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>{t('search_empty_title')}</Text>
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>{t('search_empty_description')}</Text>
                {(searchQuery || selectedCategory !== 'All') && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    style={[styles.browseAllButton, { backgroundColor: theme.tint + '12' }]}
                  >
                    <Text style={[styles.browseAllText, { color: theme.tint }]}>{t('browse_all')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
        </View>
      </ScrollView>

      {/* Consultation Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>START CONSULT</Text>
                <Text style={[styles.modalDocName, { color: theme.tint }]}>with Dr. {selectedDoc?.displayName}</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); setSelectedDoc(null); }}><X size={24} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{t('describe_issue')}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} multiline numberOfLines={4} placeholder={t('describe_issue_placeholder')} placeholderTextColor={theme.textSecondary} value={issueDescription} onChangeText={setIssueDescription} textAlignVertical="top" />
            <TouchableOpacity style={[styles.modalSubmitButton, { backgroundColor: theme.tint }, !issueDescription.trim() && { backgroundColor: theme.textSecondary + '50' }]} onPress={handleConsultationSubmit} disabled={!issueDescription.trim() || isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <><Text style={styles.modalSubmitText}>{t('send_to_whatsapp')}</Text><Send size={18} color="#fff" style={{ marginLeft: 8 }} /></>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
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
  stickyBar: { paddingHorizontal: 20, paddingBottom: 16 },
  noticeWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 50 },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, fontWeight: '600' },
  heroButton: { margin: 20, marginVertical: 10, borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center', elevation: 6 },
  heroIconCircle: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTextContainer: { flex: 1, marginLeft: 16 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 16, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  catalogHeader: { paddingHorizontal: 20, marginTop: 20, marginBottom: 10, gap: 16 },
  catalogTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  catalogTabs: { gap: 8, paddingRight: 20 },
  catTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, minWidth: 80, alignItems: 'center' },
  catTabText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  doctorsSection: { marginBottom: 10 },
  doctorsScroll: { paddingHorizontal: 20, gap: 16 },
  doctorCard: { width: 180, borderRadius: 28, padding: 16, alignItems: 'center', borderWidth: 1, elevation: 4 },
  doctorImageContainer: { width: 80, height: 80, borderRadius: 32, overflow: 'hidden', marginBottom: 12 },
  doctorImage: { width: '100%', height: '100%' },
  doctorIconPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doctorName: { fontSize: 13, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  doctorQual: { fontSize: 9, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', marginBottom: 14, opacity: 0.6 },
  doctorCardActions: { flexDirection: 'row', gap: 6, width: '100%' },
  doctorConsultBtn: { flex: 1.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14 },
  doctorConsultBtnText: { color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  doctorProfileBtnMinor: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  doctorProfileBtnTextMinor: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  modalDocName: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  itemCard: { borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, elevation: 3 },
  itemImageContainer: { width: '100%', height: 180, position: 'relative' },
  itemImage: { width: '100%', height: '100%' },
  itemIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  itemBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  itemInfo: { padding: 16 },
  itemName: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, flex: 1 },
  itemPrice: { fontSize: 20, fontWeight: '900' },
  itemMrp: { fontSize: 13, textDecorationLine: 'line-through', marginLeft: 6, fontWeight: '500' },
  discountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  discountText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemUnit: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  stockText: { fontSize: 11, fontWeight: '800' },
  orderButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  orderButtonText: { fontWeight: '900', textTransform: 'uppercase' },
  listContainer: { padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalSubtitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderRadius: 20, padding: 20, height: 120, fontSize: 15, fontWeight: '500', borderWidth: 1, marginBottom: 24 },
  modalSubmitButton: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' }
  ,
  emptyState: { borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyStateTitle: { fontSize: 18, fontWeight: '900' },
  emptyStateText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  browseAllButton: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  browseAllText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }
});
