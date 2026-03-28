import { Tabs, Redirect } from 'expo-router';
import { Home, ShoppingBag, Settings, ClipboardList } from 'lucide-react-native';
import { useFarmerProfile } from '../../src/context/FarmerProfileContext';
import { View, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { loading, hasOnboarded } = useFarmerProfile();
  const { theme } = useAppTheme();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: t('home_tab'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarLabel: t('activity_tab'),
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
