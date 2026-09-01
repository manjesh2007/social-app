import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { THEME } from '@/src/theme';

export default function Index() {
  const { user, token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (token && user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [token, user, isLoading]);

  return (
    <View style={styles.container} testID="app-entry-loading-view">
      <ActivityIndicator size="large" color={THEME.colors.brandPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
