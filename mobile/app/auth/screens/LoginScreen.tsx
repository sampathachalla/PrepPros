import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { AuthTextInput } from '../components/AuthTextInput';
import { TypewriterText } from '../components/TypewriterText';
import { AUTH_COPY } from '../constants/auth';
import { useLoginForm } from '../hooks/useLoginForm';

export default function LoginScreen() {
  const { identifier, password, setIdentifier, setPassword, submit } = useLoginForm();

  const handleLogin = async () => {
    try {
      await submit();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to log in.');
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FAFAFA' }}>
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
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#D7263D', marginBottom: 4 }}>
              {AUTH_COPY.appName}
            </Text>

            {/* Typewriter Slogan */}
            <View style={{ height: 24, marginBottom: 20 }}>
              <TypewriterText
                text={AUTH_COPY.tagline}
                speed={120}
                style={{
                  fontSize: 14,
                  color: '#7A7A7A',
                }}
              />
            </View>

            {/* Login Form */}
            <View style={{ width: '100%', padding: 24, borderRadius: 20 }}>
              <AuthTextInput
                placeholder="Email or username"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
              <AuthTextInput
                placeholder="Password"
                style={{ marginBottom: 8 }}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* 🔐 Forgot Password Link */}
              <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => { /* TODO: Link to forgot password screen */ }}>
                  <Text style={{ fontSize: 13, color: '#D7263D', fontWeight: '500' }}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#D7263D',
                  padding: 14,
                  borderRadius: 14,
                }}
                onPress={handleLogin} // ✅ Added handler here
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: 16,
                  }}
                >
                  Log In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <Text style={{ color: '#7A7A7A', marginVertical: 24 }}>or continue with</Text>

            {/* Google Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 50,
                borderColor: '#DADADA',
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
              <FontAwesome name="google" size={20} color="#D7263D" />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#2E2E2E' }}>
                Sign in with Google
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text style={{ fontSize: 14, color: '#1A1A1A' }}>
              Don’t have an account?{' '}
              <Link href="/auth/signup" style={{ color: '#FF6F00', fontWeight: '600' }}>
                Sign up
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
