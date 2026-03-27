import { Redirect } from 'expo-router';
import { useFarmerProfile } from '../src/context/FarmerProfileContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { hasOnboarded, loading } = useFarmerProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (hasOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}

