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
import { AuthTextInput } from '../components/AuthTextInput';
import { AUTH_COPY, USER_ROLES } from '../constants/auth';
import { useSignupForm } from '../hooks/useSignupForm';

export default function SignupScreen() {
  const {
    email,
    password,
    confirmPassword,
    role,
    setEmail,
    setPassword,
    setConfirmPassword,
    setRole,
    submit,
  } = useSignupForm();

  const handleSignup = async () => {
    try {
      await submit();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to sign up.');
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
            {/* Heading */}
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#D7263D', marginBottom: 4 }}>
              Create Account
            </Text>
            <Text style={{ fontSize: 14, color: '#7A7A7A', marginBottom: 24 }}>
              {AUTH_COPY.signupSubtitle}
            </Text>

            {/* Signup Form */}
            <View style={{ width: '100%', padding: 24, borderRadius: 20 }}>
              {/* User Type Selection */}
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#1A1A1A' }}>
                I am a
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                {USER_ROLES.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setRole(option)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: role === option ? '#D7263D' : '#DADADA',
                      backgroundColor: role === option ? '#D7263D' : '#FAFAFA',
                    }}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        color: role === option ? '#FFFFFF' : '#1A1A1A',
                        fontWeight: '600',
                      }}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Email */}
              <AuthTextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              {/* Password */}
              <AuthTextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {/* Confirm Password */}
              <AuthTextInput
                placeholder="Confirm Password"
                style={{ marginBottom: 28 }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#D7263D',
                  padding: 14,
                  borderRadius: 14,
                }}
                onPress={handleSignup}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: 16,
                  }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={{ fontSize: 14, color: '#1A1A1A', marginTop: 24 }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: '#D7263D', fontWeight: '600' }}>
                Log in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
