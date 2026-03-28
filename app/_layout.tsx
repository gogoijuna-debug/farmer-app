import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { FarmerProfileProvider } from '../src/context/FarmerProfileContext';
import { ThemePreferenceProvider, useAppTheme } from '../src/context/ThemeContext';
import { NotificationsProvider } from '../src/context/NotificationsContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import '../src/i18n';

function RootNavigator() {
  const { resolvedTheme, theme, loading } = useAppTheme();
  const isDark = resolvedTheme === 'dark';

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            backgroundColor: theme.card,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: '900',
            color: theme.text,
            letterSpacing: -0.4,
          }}
        >
          Sanjivani Vet Care
        </Text>
        <Text
          style={{
            marginTop: 6,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: '600',
            color: theme.textSecondary,
          }}
        >
          Preparing your app preferences
        </Text>

        <ActivityIndicator size="small" color={theme.tint} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#1E293B' : '#059669' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '900' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ headerBackTitle: 'Back' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FarmerProfileProvider>
          <ThemePreferenceProvider>
            <NotificationsProvider>
              <RootNavigator />
            </NotificationsProvider>
          </ThemePreferenceProvider>
        </FarmerProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
