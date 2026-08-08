import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import UserCard from '../components/UserCard';
import api from '../api/api';

export default function FriendRequestsScreen() {
  const { theme } = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const styles = createStyles(theme);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/friends/requests');
      setRequests(res.data.requests);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const respond = async (requestId, action) => {
    setRespondingId(requestId);
    try {
      await api.post(`/friends/respond/${requestId}`, { action });
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } finally {
      setRespondingId(null);
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
      <Text style={styles.header}>Friend Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchRequests();
            }}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.requestRow}>
            <UserCard user={item.from} />
            <View style={styles.actions}>
              <ActionButton
                label="Accept"
                color={theme.success}
                onPress={() => respond(item._id, 'accept')}
                disabled={respondingId === item._id}
              />
              <ActionButton
                label="Decline"
                color={theme.danger}
                onPress={() => respond(item._id, 'decline')}
                disabled={respondingId === item._id}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No pending friend requests</Text>
          </View>
        }
      />
    </View>
  );
}

function ActionButton({ label, color, onPress, disabled }) {
  return (
    <View style={{ flex: 1, marginHorizontal: 4 }}>
      <Text
        onPress={disabled ? undefined : onPress}
        style={{
          textAlign: 'center',
          paddingVertical: 10,
          borderRadius: 10,
          color: '#fff',
          fontWeight: '700',
          fontSize: 13,
          backgroundColor: color,
          opacity: disabled ? 0.6 : 1,
          overflow: 'hidden',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    header: { fontSize: 24, fontWeight: '700', color: theme.text, paddingHorizontal: 16, paddingTop: 16 },
    requestRow: { marginBottom: 4 },
    actions: { flexDirection: 'row', marginTop: -6, marginBottom: 14 },
    emptyText: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' },
  });
