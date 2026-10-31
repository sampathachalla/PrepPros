// app/index.tsx
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  return <Redirect href="/auth/login" />;
}