import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { getDb } from './src/data/db';
import type { RootStackParamList } from './src/navigation';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Warm the SQLite connection (opens + seeds on first launch) so the first
  // scan doesn't pay the 526-row seed cost mid-result.
  useEffect(() => {
    getDb().catch((e) => console.warn('DB init failed:', e));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Capture">
          <Stack.Screen
            name="Capture"
            component={CaptureScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{
              title: 'Kết quả',
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
