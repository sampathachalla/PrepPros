import { useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import { getAuthUser } from '@/app/auth/store/authSession';

/** Opens the app where the person left off: signed in goes to the calendar, otherwise to login. */
export default function IndexScreen() {
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    getAuthUser().then((user) => setTarget(user?.accessToken ? '/(tabs)/chat' : '/auth/login'));
  }, []);

  return target ? <Redirect href={target} /> : null;
}
