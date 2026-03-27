import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFarmerProfile } from '../src/context/FarmerProfileContext';
import { User, Phone, MapPin } from 'lucide-react-native';
import { Colors } from '../src/constants/Colors';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];
  const { saveProfile } = useFarmerProfile();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [isRegistering, setIsRegistering] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) { setError(t('phone_error')); return; }
    
    if (isRegistering) {
      if (!name.trim()) { setError(t('name_error')); return; }
      if (!village.trim()) { setError(t('village_error')); return; }
    }

    setSaving(true);
    setError('');
    try {
      await saveProfile(isRegistering ? name.trim() : "", phone.trim(), isRegistering ? village.trim() : "");
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.message === 'USER_NOT_FOUND') {
        setError(t('phone_not_found'));
      } else {
        setError(t('generic_error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = isRegistering ? (!name || !phone || !village || saving) : (!phone || saving);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.iconContainer, { backgroundColor: theme.card, shadowColor: theme.text }]}>
          <Image source={require('../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{isRegistering ? t('onboarding_title') : t('sign_in')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('tagline')}</Text>

        <View style={styles.form}>
          {isRegistering && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('name_label')}</Text>
              <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <User size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: theme.text }]} placeholder={t('name_placeholder')} placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} autoCapitalize="words" />
              </View>
            </>
          )}

          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('phone_label')}</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Phone size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput style={[styles.input, { color: theme.text }]} placeholder={t('phone_placeholder')} placeholderTextColor={theme.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
          </View>

          {isRegistering && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('village_label')}</Text>
              <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <MapPin size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput style={[styles.input, { color: theme.text }]} placeholder={t('village_placeholder')} placeholderTextColor={theme.textSecondary} value={village} onChangeText={setVillage} autoCapitalize="words" />
              </View>
            </>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.tint }, isDisabled && styles.btnDisabled]} onPress={handleStart} disabled={isDisabled}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isRegistering ? t('get_started') : t('sign_in')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleContainer} onPress={() => { setIsRegistering(!isRegistering); setError(''); }}>
            <Text style={[styles.toggleText, { color: theme.textSecondary }]}>
              {isRegistering ? t('already_member') : t('new_here')}
              <Text style={{ color: theme.tint, fontWeight: '900' }}> {isRegistering ? t('sign_in') : t('register_now')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: '90%',
    height: '90%',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 36,
  },
  form: {
    width: '100%',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleContainer: { marginTop: 24, padding: 12, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' }
});
