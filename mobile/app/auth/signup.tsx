import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<'Trainer' | 'Member'>('Member');

  useFocusEffect(
    useCallback(() => {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setUserType('Member');
    }, [])
  );

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
              Join the Zytrix community today
            </Text>

            {/* Signup Form */}
            <View style={{ width: '100%', padding: 24, borderRadius: 20 }}>
              {/* User Type Selection */}
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#1A1A1A' }}>
                I am a
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                {['Trainer', 'Member'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => setUserType(role as 'Trainer' | 'Member')}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: userType === role ? '#D7263D' : '#DADADA',
                      backgroundColor: userType === role ? '#D7263D' : '#FAFAFA',
                    }}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        color: userType === role ? '#FFFFFF' : '#1A1A1A',
                        fontWeight: '600',
                      }}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Email */}
              <TextInput
                placeholder="Email"
                style={{
                  borderBottomWidth: 1,
                  borderColor: '#DADADA',
                  marginBottom: 20,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1A1A1A',
                }}
                placeholderTextColor="#7A7A7A"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              {/* Password */}
              <TextInput
                placeholder="Password"
                style={{
                  borderBottomWidth: 1,
                  borderColor: '#DADADA',
                  marginBottom: 20,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1A1A1A',
                }}
                placeholderTextColor="#7A7A7A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {/* Confirm Password */}
              <TextInput
                placeholder="Confirm Password"
                style={{
                  borderBottomWidth: 1,
                  borderColor: '#DADADA',
                  marginBottom: 28,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1A1A1A',
                }}
                placeholderTextColor="#7A7A7A"
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