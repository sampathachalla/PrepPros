import { useState, useCallback, useEffect } from 'react';
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
import { Link, useFocusEffect, useRouter } from 'expo-router'; // ✅ only use useRouter here
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';

// ✅ Smooth continuous typewriter effect
type TypewriterTextProps = {
  text: string;
  speed?: number;
  style?: any;
};

function TypewriterText({ text, speed = 100, style }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const loop = () => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, i));
        i++;
        if (i > text.length) {
          i = 0;
        }
      }, speed);
      return interval;
    };

    const interval = loop();
    return () => clearInterval(interval);
  }, [text, speed]);

  return <Text style={style}>{displayedText}</Text>;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); // ✅ useRouter hook only

  useFocusEffect(
    useCallback(() => {
      setEmail('');
      setPassword('');
    }, [])
  );

  // ✅ Dummy Login Logic
  const handleLogin = async () => {
    if (email === 'sampath' && password === 'sam2001') {
      const user = { id: 'u123456', username: 'sampath' };
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      router.replace('/(tabs)/homepage'); // ✅ use correct path with folder alias
    } else {
      alert('Invalid credentials');
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
              Zytrix
            </Text>

            {/* Typewriter Slogan */}
            <View style={{ height: 24, marginBottom: 20 }}>
              <TypewriterText
                text="Your fitness, your way"
                speed={120}
                style={{
                  fontSize: 14,
                  color: '#7A7A7A',
                }}
              />
            </View>

            {/* Login Form */}
            <View style={{ width: '100%', padding: 24, borderRadius: 20 }}>
              <TextInput
                placeholder="Email or username"
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
              <TextInput
                placeholder="Password"
                style={{
                  borderBottomWidth: 1,
                  borderColor: '#DADADA',
                  marginBottom: 8,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#1A1A1A',
                }}
                placeholderTextColor="#7A7A7A"
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