import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { login } from '../services/authService';
import { validateLogin } from '../validators/authValidators';

export function useLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      setIdentifier('');
      setPassword('');
    }, []),
  );

  const submit = async () => {
    const validationError = validateLogin(identifier, password);
    if (validationError) throw new Error(validationError);
    await login({ identifier, password });
    router.replace('/(tabs)/homepage');
  };

  return { identifier, password, setIdentifier, setPassword, submit };
}
