import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider } from '@/src/context/AuthContext';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <KeyboardProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="live-connect/index" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </KeyboardProvider>
  );
}
