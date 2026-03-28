import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, LogOut, Globe, Moon, User } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFarmerProfile } from '../../src/context/FarmerProfileContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { ThemePreference, useAppTheme } from '../../src/context/ThemeContext';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, clearProfile } = useFarmerProfile();
  const { theme, preference, resolvedTheme, setPreference } = useAppTheme();
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.1.0-pro';
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [village, setVillage] = useState(profile?.village || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const openEditProfile = () => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setVillage(profile?.village || '');
    setIsEditVisible(true);
  };

  const handleProfileSave = async () => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (!name.trim()) {
      Alert.alert(t('name_error'));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      Alert.alert(t('phone_error'));
      return;
    }
    if (!village.trim()) {
      Alert.alert(t('village_error'));
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), phone: digitsOnly, village: village.trim() });
      setIsEditVisible(false);
      Alert.alert(t('profile_saved'));
    } catch (error: any) {
      if (error?.message === 'PHONE_ALREADY_REGISTERED') {
        Alert.alert(t('duplicate_phone_error'));
      } else {
        Alert.alert(t('generic_error'));
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng);
    await AsyncStorage.setItem('user-language', lng);
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('logout_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('logout'), 
          style: 'destructive',
          onPress: async () => {
            await clearProfile();
            await signOut(auth);
            router.replace('/onboarding' as any);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Premium Branding Header */}
      <View style={[styles.header, { backgroundColor: theme.card, paddingTop: Math.max(insets.top, 20) }]}>
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
              <Text style={[styles.brandingTitleSub, { color: theme.tint }]}> Settings</Text>
            </View>
            <Text style={[styles.brandingSubtitle, { color: theme.textSecondary }]}>App Identity & Preferences</Text>
          </View>
        </View>
        
        <View style={[styles.avatarButton, { backgroundColor: theme.tint + '15', borderColor: theme.tint + '30' }]}>
          {profile?.name ? (
            <Text style={[styles.avatarText, { color: theme.tint }]}>{profile.name.charAt(0).toUpperCase()}</Text>
          ) : (
            <User size={22} color={theme.tint} />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color={theme.tint} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('profile')}</Text>
          </View>

          <View style={[styles.optionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <View style={styles.profileRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: theme.text }]}>{profile?.name || '-'}</Text>
                <Text style={[styles.profileMeta, { color: theme.textSecondary }]}>{profile?.phone || '-'}</Text>
                <Text style={[styles.profileMeta, { color: theme.textSecondary }]}>{profile?.village || '-'}</Text>
              </View>
              <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: theme.tint + '12' }]} onPress={openEditProfile}>
                <Text style={[styles.editProfileButtonText, { color: theme.tint }]}>{t('edit_profile')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={18} color={theme.tint} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('language')}</Text>
          </View>
          
          <View style={[styles.optionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.option, i18n.language === 'as' && { backgroundColor: theme.tint + '10' }, { borderBottomColor: theme.border }]} 
              onPress={() => changeLanguage('as')}
            >
              <Text style={[styles.optionText, { color: theme.text }, i18n.language === 'as' && { color: theme.tint, fontWeight: '900' }]}>অসমীয়া (Assamese)</Text>
              {i18n.language === 'as' && <Check size={20} color={theme.tint} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.option, i18n.language === 'en' && { backgroundColor: theme.tint + '10' }, { borderBottomWidth: 0 }]} 
              onPress={() => changeLanguage('en')}
            >
              <Text style={[styles.optionText, { color: theme.text }, i18n.language === 'en' && { color: theme.tint, fontWeight: '900' }]}>English</Text>
              {i18n.language === 'en' && <Check size={20} color={theme.tint} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Moon size={18} color={theme.tint} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('theme')}</Text>
          </View>
          <View style={[styles.optionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.option, { borderBottomWidth: 0 }]}> 
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: theme.text }]}>{t('appearance')}</Text>
                <Text style={[styles.optionSubText, { color: theme.textSecondary }]}>
                  {t('current_theme', {
                    theme: resolvedTheme === 'dark' ? t('dark_theme') : t('light_theme')
                  })}
                </Text>
                <Text style={[styles.optionSubText, { color: theme.textSecondary }]}>{t('theme_help')}</Text>
              </View>
              <View style={[styles.themeSegment, { backgroundColor: theme.background, borderColor: theme.border }]}> 
                {([
                  { key: 'system', label: t('use_device_theme') },
                  { key: 'light', label: t('light_theme') },
                  { key: 'dark', label: t('dark_theme') },
                ] as Array<{ key: ThemePreference; label: string }>).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setPreference(option.key)}
                    style={[
                      styles.themeSegmentButton,
                      preference === option.key && { backgroundColor: theme.tint }
                    ]}
                  >
                    <Text style={[
                      styles.themeSegmentText,
                      { color: preference === option.key ? '#fff' : theme.textSecondary }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Logout Section */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: resolvedTheme === 'dark' ? '#EF444420' : '#FEE2E2', borderColor: '#EF444450' }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Sanjivani Vet Care v{appVersion}</Text>
      </ScrollView>

      <Modal visible={isEditVisible} animationType="slide" transparent onRequestClose={() => setIsEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('edit_profile')}</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{t('update_profile')}</Text>

            <TextInput value={name} onChangeText={setName} placeholder={t('name_placeholder')} placeholderTextColor={theme.textSecondary} style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
            <TextInput value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))} placeholder={t('phone_placeholder')} placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />
            <TextInput value={village} onChangeText={setVillage} placeholder={t('village_placeholder')} placeholderTextColor={theme.textSecondary} style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalSecondaryButton, { borderColor: theme.border }]} onPress={() => setIsEditVisible(false)}>
                <Text style={[styles.modalSecondaryText, { color: theme.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimaryButton, { backgroundColor: theme.tint }]} onPress={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>{t('save_changes')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  content: { padding: 24, paddingBottom: 60 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  optionsContainer: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  optionText: { fontSize: 16, fontWeight: '600' },
  optionSubText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 },
  themeSegment: { flex: 1.4, borderRadius: 16, borderWidth: 1, padding: 4, gap: 4 },
  themeSegmentButton: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  themeSegmentText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  profileRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 20 },
  profileName: { fontSize: 18, fontWeight: '900' },
  profileMeta: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  editProfileButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  editProfileButtonText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, borderWidth: 1, gap: 10, marginTop: 8 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
  footerText: { marginTop: 40, textAlign: 'center', fontSize: 12, fontWeight: '700', opacity: 0.6 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSubtitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  modalInput: { height: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalSecondaryButton: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  modalPrimaryButton: { flex: 1.2, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '900', textTransform: 'uppercase' }
});
