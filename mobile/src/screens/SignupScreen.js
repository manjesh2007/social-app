import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // YYYY-MM-DD
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError('');
    if (!name || !email || !password || !dateOfBirth) {
      setError('Please fill in every field');
      return;
    }
    setLoading(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, dateOfBirth });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>✨</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>This app is for adults 18 and older, focused on real friendships.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} placeholder="Jordan Lee" placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Date of birth</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />
          <Text style={styles.hint}>You must be 18 or older to use this app.</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.primaryText} /> : <Text style={styles.buttonText}>Sign Up</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 28 },
    logo: { fontSize: 44, marginBottom: 8 },
    title: { fontSize: 24, fontWeight: '700', color: theme.text, textAlign: 'center' },
    subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 8 },
    form: { width: '100%' },
    label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.text,
    },
    hint: { fontSize: 12, color: theme.textSecondary, marginTop: 6 },
    error: { color: theme.danger, marginTop: 12, fontSize: 13 },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 24,
    },
    buttonText: { color: theme.primaryText, fontSize: 16, fontWeight: '700' },
    linkWrap: { marginTop: 18, alignItems: 'center' },
    link: { color: theme.textSecondary, fontSize: 14 },
    linkBold: { color: theme.primary, fontWeight: '700' },
  });
