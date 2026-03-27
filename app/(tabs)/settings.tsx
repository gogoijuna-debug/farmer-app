import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, useColorScheme, ScrollView, Platform, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, LogOut, Globe, Moon, User } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/Colors';
import { useFarmerProfile } from '../../src/context/FarmerProfileContext';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];
  const { profile } = useFarmerProfile();
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.1.0-pro';

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
            await AsyncStorage.removeItem('farmer-profile');
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('appearance')}</Text>
          </View>
          <View style={[styles.optionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.option}>
              <View>
                <Text style={[styles.optionText, { color: theme.text }]}>{t('system_theme')}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 }}>Current: {colorScheme}</Text>
              </View>
              <Moon size={20} color={theme.textSecondary} />
            </View>
          </View>
        </View>

        {/* Logout Section */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colorScheme === 'dark' ? '#EF444420' : '#FEE2E2', borderColor: '#EF444450' }]} 
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Sanjivani Vet Care v{appVersion}</Text>
      </ScrollView>
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
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, borderWidth: 1, gap: 10, marginTop: 8 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
  footerText: { marginTop: 40, textAlign: 'center', fontSize: 12, fontWeight: '700', opacity: 0.6 }
});
