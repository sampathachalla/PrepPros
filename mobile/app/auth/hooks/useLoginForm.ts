import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ApiError } from '@/app/shared/services/apiClient';
import { login, resendConfirmation } from '../services/authService';
import { validateLogin } from '../validators/authValidators';

const EMAIL_NOT_CONFIRMED = 403;

function offerConfirmationEmail(identifier: string, message: string) {
  Alert.alert('Confirm your email', message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Resend email',
      onPress: () =>
        resendConfirmation(identifier)
          .then(() => Alert.alert('Email sent', 'Open the link in it, then log in. Check your spam folder too.'))
          .catch((error: Error) => Alert.alert('Email not sent', error.message)),
    },
  ]);
}

export function useLoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);
    try {
      await login({ identifier, password });
    } catch (error) {
      if (error instanceof ApiError && error.status === EMAIL_NOT_CONFIRMED) {
        offerConfirmationEmail(identifier, error.message);
        return;
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
    router.replace('/(tabs)/chat');
  };

  return { identifier, password, setIdentifier, setPassword, submit, isSubmitting };
}
