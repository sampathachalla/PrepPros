import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { signup } from '../services/authService';
import type { UserRole } from '../types/auth';
import { validateSignup } from '../validators/authValidators';

export function useSignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('Member');
    }, []),
  );

  const submit = async () => {
    const credentials = { email, password, confirmPassword, role };
    const validationError = validateSignup(credentials);
    if (validationError) throw new Error(validationError);
    setIsSubmitting(true);
    let emailConfirmationRequired: boolean;
    try {
      ({ emailConfirmationRequired } = await signup(credentials));
    } finally {
      setIsSubmitting(false);
    }
    if (emailConfirmationRequired) {
      Alert.alert('Check your email', `Open the link we sent to ${email.trim()}, then log in here.`, [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
      return;
    }
    router.replace('/(tabs)/chat');
  };

  return {
    email,
    password,
    confirmPassword,
    setEmail,
    setPassword,
    setConfirmPassword,
    submit,
    isSubmitting,
  };
}
