import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { login } from '../services/authService';
import { validateLogin } from '../validators/authValidators';

export function useLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

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
  };

  return { identifier, password, setIdentifier, setPassword, submit };
}
