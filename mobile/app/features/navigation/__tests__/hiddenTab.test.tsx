import React from 'react';
import { Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { HIDDEN_TAB_OPTIONS } from '../constants/navigation';

function ChatPage() {
  return <Text>Chat page</Text>;
}

function MealPrepPage() {
  return <Text>Meal prep page</Text>;
}

describe('HIDDEN_TAB_OPTIONS', () => {
  it('leaves the page reachable, and the way back open', async () => {
    await renderRouter(
      {
        '(tabs)/_layout': () => (
          <Tabs>
            <Tabs.Screen name="chat" />
            <Tabs.Screen name="meal-prep" options={HIDDEN_TAB_OPTIONS} />
          </Tabs>
        ),
        '(tabs)/chat': ChatPage,
        '(tabs)/meal-prep': MealPrepPage,
      },
      { initialUrl: '/chat' },
    );

    await act(async () => {
      router.navigate('/(tabs)/meal-prep');
    });
    expect(screen).toHavePathname('/meal-prep');
    expect(screen.getByText('Meal prep page')).toBeTruthy();

    await act(async () => {
      router.navigate('/(tabs)/chat');
    });
    expect(screen).toHavePathname('/chat');
  });
});
