import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { AuthTextInput } from '../components/AuthTextInput';
import { AppTheme } from '../../../constants/Colors';
import { authStyles } from '../../../constants/theme';
import { AUTH_COPY } from '../constants/auth';
import { useSignupForm } from '../hooks/useSignupForm';

const LOGO_ASPECT = 711 / 292;

export default function SignupScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const logoWidth = Math.min(windowWidth - 48, 420);
  const logoHeight = logoWidth / LOGO_ASPECT;

  const {
    email,
    password,
    confirmPassword,
    setEmail,
    setPassword,
    setConfirmPassword,
    submit,
    isSubmitting,
  } = useSignupForm();

  const handleSignup = async () => {
    try {
      await submit();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to sign up.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" style={authStyles.screen}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center items-center px-6 py-12">
            <Image
              source={require('../../../assets/preppros-logo.png')}
              style={{ width: logoWidth, height: logoHeight, marginBottom: 8 }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={AUTH_COPY.appName}
            />

            {/* Heading */}
            <Text style={{ fontSize: 36, fontWeight: '800', color: AppTheme.text, marginBottom: 4 }}>
              Create Account
            </Text>
            <Text style={{ fontSize: 14, color: AppTheme.textMuted, marginBottom: 24 }}>
              {AUTH_COPY.signupSubtitle}
            </Text>

            {/* Signup Form */}
            <View style={{ width: '100%', padding: 24, borderRadius: 20 }}>
              {/* Email */}
              <AuthTextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSubmitting}
              />
              {/* Password */}
              <AuthTextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isSubmitting}
              />
              {/* Confirm Password */}
              <AuthTextInput
                placeholder="Confirm Password"
                style={{ marginBottom: 28 }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!isSubmitting}
              />

              {/* Submit Button */}
              <AuthSubmitButton
                label="Sign Up"
                loadingLabel="Creating your account…"
                isLoading={isSubmitting}
                onPress={handleSignup}
              />
            </View>

            {/* Footer */}
            <Text style={{ fontSize: 14, color: AppTheme.text, marginTop: 24 }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ ...authStyles.link, fontWeight: '600' }}>
                Log in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
