import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { register, isLoading } = useAuth();

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [dob, setDob] = useState<string>('2001-05-15');
  const [city, setCity] = useState<string>('Mumbai');
  const [gender, setGender] = useState<string>('Female');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate Age (Must be >= 18)
  const validateAge = (dobString: string): boolean => {
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 18;
    } catch {
      return false;
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !dob.trim()) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (!validateAge(dob)) {
      setErrorMessage('You must be at least 18 years old to join Nearby Friends and Live Connect.');
      return;
    }

    setErrorMessage('');
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        dob: dob.trim(),
        city: city.trim() || 'Mumbai',
        gender,
        bio: 'Excited to discover nearby friends and chat on Live Connect!',
        avatar:
          gender === 'Female'
            ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500'
            : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500',
        interests: ['Music', 'Travel', 'Live Connect', 'Coffee'],
      });
    } catch (e: any) {
      setErrorMessage(e.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.scrollContent}
      testID="signup-screen"
    >
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandLogoWrap}>
          <Ionicons name="shield-checkmark" size={32} color={THEME.colors.brandPrimary} />
        </View>
        <Text style={styles.brandTitle} testID="signup-brand-title">Join Nearby Friends</Text>
        <Text style={styles.brandSubtitle}>Age-gated 18+ verified social community</Text>
      </View>

      {/* Signup Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Create Your Account</Text>
        <Text style={styles.cardSub}>
          Enter your details and date of birth for age verification.
        </Text>

        {errorMessage ? (
          <View style={styles.errorBanner} testID="signup-error-banner">
            <Ionicons name="alert-circle" size={16} color={THEME.colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Full Name */}
        <Text style={styles.fieldLabel}>Full Name *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={18} color={THEME.colors.onSurfaceTertiary} />
          <TextInput
            testID="signup-name-input"
            style={styles.textInput}
            placeholder="e.g. Alex Rivera"
            placeholderTextColor={THEME.colors.tabInactive}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <Text style={styles.fieldLabel}>Email Address *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={18} color={THEME.colors.onSurfaceTertiary} />
          <TextInput
            testID="signup-email-input"
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
        <Text style={styles.fieldLabel}>Password *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color={THEME.colors.onSurfaceTertiary} />
          <TextInput
            testID="signup-password-input"
            style={styles.textInput}
            placeholder="At least 6 characters"
            placeholderTextColor={THEME.colors.tabInactive}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* DOB (YYYY-MM-DD) Age-Gate */}
        <View style={styles.dobHeaderRow}>
          <Text style={styles.fieldLabel}>Date of Birth (YYYY-MM-DD) *</Text>
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>18+ Mandatory</Text>
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={18} color={THEME.colors.brandPrimary} />
          <TextInput
            testID="signup-dob-input"
            style={styles.textInput}
            placeholder="YYYY-MM-DD (e.g. 2001-05-15)"
            placeholderTextColor={THEME.colors.tabInactive}
            value={dob}
            onChangeText={setDob}
          />
        </View>

        {/* City & Gender Row */}
        <View style={styles.rowInputs}>
          <View style={styles.halfCol}>
            <Text style={styles.fieldLabel}>City</Text>
            <View style={styles.inputContainer}>
              <TextInput
                testID="signup-city-input"
                style={styles.textInput}
                placeholder="City"
                placeholderTextColor={THEME.colors.tabInactive}
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>

          <View style={styles.halfCol}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.inputContainer}>
              <TextInput
                testID="signup-gender-input"
                style={styles.textInput}
                placeholder="Gender"
                placeholderTextColor={THEME.colors.tabInactive}
                value={gender}
                onChangeText={setGender}
              />
            </View>
          </View>
        </View>

        {/* Submit Register */}
        <Pressable
          testID="signup-submit-button"
          style={[styles.signupBtn, isLoading && styles.signupBtnDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signupBtnText}>Verify Age & Register</Text>
          )}
        </Pressable>

        {/* Footer link to Login */}
        <View style={styles.loginFooter}>
          <Text style={styles.loginFooterText}>Already have an account?</Text>
          <Pressable testID="go-to-login-btn" onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}> Sign In</Text>
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
    marginBottom: THEME.spacing.lg,
  },
  brandLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.xs,
  },
  brandTitle: {
    fontSize: THEME.typography.scale.xl,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  brandSubtitle: {
    fontSize: 12,
    color: THEME.colors.onSurfaceTertiary,
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeading: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '800',
    color: THEME.colors.onSurface,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
    marginBottom: THEME.spacing.md,
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
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.onSurface,
    marginBottom: 4,
  },
  dobHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ageBadge: {
    backgroundColor: THEME.colors.brandTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageBadgeText: {
    color: THEME.colors.onBrandTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
    marginBottom: THEME.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.onSurface,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  signupBtn: {
    backgroundColor: THEME.colors.brandPrimary,
    paddingVertical: 13,
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
  signupBtnDisabled: {
    opacity: 0.6,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  loginFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },
  loginFooterText: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
  },
  loginLink: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.brandPrimary,
  },
});
