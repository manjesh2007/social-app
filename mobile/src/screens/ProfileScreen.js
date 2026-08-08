import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { theme, preference, setThemePreference, activeMode } = useTheme();
  const { user, logout } = useAuth();
  const styles = createStyles(theme);
  const initials = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={styles.header}>
        {user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {!!user?.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bio}>{user.bio}</Text>
        </View>
      )}

      {!!user?.interests?.length && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.tags}>
            {user.interests.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeRow}>
          <ThemeOption label="Light" value="light" current={preference} onPress={setThemePreference} theme={theme} />
          <ThemeOption label="Dark" value="dark" current={preference} onPress={setThemePreference} theme={theme} />
          <ThemeOption label="System" value="system" current={preference} onPress={setThemePreference} theme={theme} />
        </View>
        <Text style={styles.themeHint}>Currently using {activeMode} mode</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ThemeOption({ label, value, current, onPress, theme }) {
  const active = current === value;
  return (
    <TouchableOpacity
      onPress={() => onPress(value)}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: active ? theme.primary : theme.inputBackground,
      }}
    >
      <Text style={{ color: active ? theme.primaryText : theme.textSecondary, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { alignItems: 'center', paddingVertical: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.inputBackground },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 36, fontWeight: '700', color: theme.primary },
    name: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 12 },
    email: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    editButton: {
      marginTop: 16,
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    editButtonText: { color: theme.primaryText, fontWeight: '700', fontSize: 13 },
    section: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
    bio: { fontSize: 15, color: theme.text, lineHeight: 21 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: theme.inputBackground, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    tagText: { fontSize: 12, color: theme.text, fontWeight: '600' },
    themeRow: { flexDirection: 'row' },
    themeHint: { fontSize: 12, color: theme.textSecondary, marginTop: 10, textAlign: 'center' },
    logoutButton: {
      marginTop: 28,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.danger,
    },
    logoutText: { color: theme.danger, fontWeight: '700', fontSize: 15 },
  });
