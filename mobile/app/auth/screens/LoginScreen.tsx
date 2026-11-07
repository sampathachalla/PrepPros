import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { AuthSubmitButton } from '../components/AuthSubmitButton';
import { AuthTextInput } from '../components/AuthTextInput';
import { TypewriterText } from '../components/TypewriterText';
import { AppTheme, Brand } from '../../../constants/Colors';
import { authStyles } from '../../../constants/theme';
import { AUTH_COPY } from '../constants/auth';
import { useLoginForm } from '../hooks/useLoginForm';

const LOGO_ASPECT = 663 / 244;

export default function LoginScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const logoWidth = Math.min(windowWidth - 48, 420);
  const logoHeight = logoWidth / LOGO_ASPECT;

  const { identifier, password, setIdentifier, setPassword, submit, isSubmitting } = useLoginForm();

  const handleLogin = async () => {
    try {
      await submit();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to log in.');
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
            {/* Branding */}
            <Image
              source={require('../../../assets/preppros-logo.png')}
              style={{ width: logoWidth, height: logoHeight, marginBottom: 8 }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={AUTH_COPY.appName}
            />

            {/* Typewriter Slogan */}
            <View style={{ height: 24, marginBottom: 20 }}>
              <TypewriterText
                text={AUTH_COPY.tagline}
                speed={120}
                style={{
                  fontSize: 14,
                  color: AppTheme.textMuted,
                }}
              />
            </View>

            {/* Login Form */}
            <View style={{ width: '100%', padding: 24, borderRadius: 20 }}>
              <AuthTextInput
                placeholder="Email"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSubmitting}
              />
              <AuthTextInput
                placeholder="Password"
                style={{ marginBottom: 8 }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isSubmitting}
              />

              {/* 🔐 Forgot Password Link */}
              <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => { /* TODO: Link to forgot password screen */ }}>
                  <Text style={{ fontSize: 13, ...authStyles.link, fontWeight: '500' }}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <AuthSubmitButton
                label="Log In"
                loadingLabel="Logging you in…"
                isLoading={isSubmitting}
                onPress={handleLogin}
              />
            </View>

            {/* Divider */}
            <Text style={{ color: AppTheme.textMuted, marginVertical: 24 }}>or continue with</Text>

            {/* Google Button */}
            <TouchableOpacity
              style={{
                backgroundColor: AppTheme.surface,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 50,
                borderColor: AppTheme.border,
                borderWidth: 1,
                marginBottom: 24,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              onPress={() => {
                // TODO: Handle Google login
              }}
            >
              <FontAwesome name="google" size={20} color={Brand.babyBlue} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: AppTheme.text }}>
                Sign in with Google
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text style={{ fontSize: 14, color: AppTheme.text }}>
              Don’t have an account?{' '}
              <Link href="/auth/signup" style={{ ...authStyles.link, fontWeight: '600' }}>
                Sign up
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
