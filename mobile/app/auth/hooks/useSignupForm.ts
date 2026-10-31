import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { signup } from '../services/authService';
import type { UserRole } from '../types/auth';
import { validateSignup } from '../validators/authValidators';

export function useSignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Member');
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
    await signup(credentials);
    router.replace('/(tabs)/homepage');
  };

  return {
    email,
    password,
    confirmPassword,
    role,
    setEmail,
    setPassword,
    setConfirmPassword,
    setRole,
    submit,
  };
}
