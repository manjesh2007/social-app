import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState<string>('alex@example.com');
  const [password, setPassword] = useState<string>('Password123!');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password');
      return;
    }
    setErrorMessage('');
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      setErrorMessage(e.message || 'Login failed. Please check your credentials.');
    }
  };

  const autofillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.scrollContent}
      testID="login-screen"
    >
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandLogoWrap}>
          <Ionicons name="people" size={36} color={THEME.colors.brandPrimary} />
        </View>
        <Text style={styles.brandTitle} testID="login-brand-title">Nearby Friends</Text>
        <Text style={styles.brandSubtitle}>Social connection & Live Video matching</Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Welcome Back</Text>
        <Text style={styles.cardSub}>Sign in to discover nearby friends & start Live Connect</Text>

        {errorMessage ? (
          <View style={styles.errorBanner} testID="login-error-banner">
            <Ionicons name="alert-circle" size={16} color={THEME.colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Email */}
        <Text style={styles.fieldLabel}>Email Address</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={18} color={THEME.colors.onSurfaceTertiary} />
          <TextInput
            testID="login-email-input"
            style={styles.textInput}
            placeholder="you@example.com"
            placeholderTextColor={THEME.colors.tabInactive}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password */}
        <Text style={styles.fieldLabel}>Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color={THEME.colors.onSurfaceTertiary} />
          <TextInput
            testID="login-password-input"
            style={styles.textInput}
            placeholder="Enter password"
            placeholderTextColor={THEME.colors.tabInactive}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable
            testID="toggle-password-visibility-btn"
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={THEME.colors.onSurfaceTertiary}
            />
          </Pressable>
        </View>

        {/* Login Button */}
        <Pressable
          testID="login-submit-button"
          style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </Pressable>

        {/* Quick Demo Credentials Autofill */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Switcher:</Text>
          <View style={styles.demoPillsRow}>
            <Pressable
              testID="demo-user-alex-btn"
              style={styles.demoPill}
              onPress={() => autofillDemo('alex@example.com')}
            >
              <Text style={styles.demoPillText}>Alex (Mumbai)</Text>
            </Pressable>
            <Pressable
              testID="demo-user-priya-btn"
              style={styles.demoPill}
              onPress={() => autofillDemo('priya@example.com')}
            >
              <Text style={styles.demoPillText}>Priya (Pune)</Text>
            </Pressable>
            <Pressable
              testID="demo-user-sam-btn"
              style={styles.demoPill}
              onPress={() => autofillDemo('sam@example.com')}
            >
              <Text style={styles.demoPillText}>Sam (Bangalore)</Text>
            </Pressable>
          </View>
        </View>

        {/* Go to Signup */}
        <View style={styles.signupFooter}>
          <Text style={styles.signupFooterText}>New to Nearby Friends?</Text>
          <Pressable testID="go-to-signup-btn" onPress={() => router.push('/auth/signup')}>
            <Text style={styles.signupLink}> Create Account (18+)</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  brandLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.sm,
  },
  brandTitle: {
    fontSize: THEME.typography.scale['2xl'],
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeading: {
    fontSize: THEME.typography.scale.xl,
    fontWeight: '800',
    color: THEME.colors.onSurface,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
    marginBottom: THEME.spacing.lg,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: THEME.radius.sm,
    marginBottom: THEME.spacing.md,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.onSurface,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.onSurface,
  },
  loginBtn: {
    backgroundColor: THEME.colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: THEME.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
    shadowColor: THEME.colors.brandPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  demoSection: {
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  demoPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoPill: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.onSurfaceSecondary,
  },
  signupFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.lg,
  },
  signupFooterText: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.brandPrimary,
  },
});
