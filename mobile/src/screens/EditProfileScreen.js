import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interestsText, setInterestsText] = useState((user?.interests || []).join(', '));
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [saving, setSaving] = useState(false);

  const styles = createStyles(theme);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.length) {
      // In production, upload this to your storage/CDN and use the returned URL.
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const interests = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.put('/users/profile', { name, bio, interests, photoUrl });
      setUser(res.data.user);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <TouchableOpacity style={styles.photoWrap} onPress={pickImage}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(name || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.photoLabel}>Change photo</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.textSecondary} />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people a bit about yourself..."
        placeholderTextColor={theme.textSecondary}
        multiline
        maxLength={300}
      />

      <Text style={styles.label}>Interests (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={interestsText}
        onChangeText={setInterestsText}
        placeholder="hiking, board games, coffee"
        placeholderTextColor={theme.textSecondary}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={theme.primaryText} /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    photoWrap: { alignItems: 'center', marginBottom: 24 },
    avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.inputBackground },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 32, fontWeight: '700', color: theme.primary },
    photoLabel: { color: theme.primary, fontWeight: '700', fontSize: 13, marginTop: 10 },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: theme.text,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    saveButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 28,
    },
    saveButtonText: { color: theme.primaryText, fontSize: 16, fontWeight: '700' },
  });
