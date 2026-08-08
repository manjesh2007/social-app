import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import UserCard from '../components/UserCard';
import api from '../api/api';

export default function NearbyScreen() {
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sentRequests, setSentRequests] = useState({});

  const styles = createStyles(theme);

  const ensureLocationAndFetch = useCallback(async () => {
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to find friends near you.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await api.put('/users/location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const res = await api.get('/users/nearby?radiusKm=25');
      setUsers(res.data.users);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load nearby users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    ensureLocationAndFetch();
  }, [ensureLocationAndFetch]);

  const onRefresh = () => {
    setRefreshing(true);
    ensureLocationAndFetch();
  };

  const sendFriendRequest = async (userId) => {
    setSentRequests((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.post(`/friends/request/${userId}`);
    } catch (err) {
      setSentRequests((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>People Nearby</Text>
      <Text style={styles.subheader}>Distances are approximate to protect everyone's privacy</Text>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={ensureLocationAndFetch}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            actionLabel={sentRequests[item.id] ? 'Sent' : 'Add'}
            actionDisabled={!!sentRequests[item.id]}
            onAction={() => sendFriendRequest(item.id)}
          />
        )}
        ListEmptyComponent={
          !error && (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No one nearby yet. Check back soon!</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    header: { fontSize: 24, fontWeight: '700', color: theme.text, paddingHorizontal: 16, paddingTop: 16 },
    subheader: { fontSize: 13, color: theme.textSecondary, paddingHorizontal: 16, marginTop: 4 },
    errorBox: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      padding: 14,
    },
    errorText: { color: theme.text, fontSize: 13 },
    retryText: { color: theme.primary, fontWeight: '700', marginTop: 8, fontSize: 13 },
    emptyText: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' },
  });
