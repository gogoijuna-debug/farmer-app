import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from '../src/context/AuthContext';
import { FarmerProfileProvider } from '../src/context/FarmerProfileContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import '../src/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <FarmerProfileProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <Stack
              initialRouteName="index"
              screenOptions={{
                headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#059669' },
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
        </FarmerProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
