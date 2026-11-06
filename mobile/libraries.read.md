# PrepPros Mobile Libraries

The mobile app is built with React Native, Expo, and TypeScript. The installed libraries are grouped below by their role.

## Application dependencies

| Library | Purpose |
| --- | --- |
| `expo` | Cross-platform mobile runtime and development tools |
| `react` | UI component model |
| `react-native` | Native mobile UI framework |
| `expo-router` | File-based navigation |
| `@react-navigation/native` | Navigation primitives |
| `@react-navigation/bottom-tabs` | Bottom tab navigation |
| `@react-navigation/elements` | Navigation UI elements |
| `@gluestack-ui/themed` | Prebuilt customizable UI components |
| `@gluestack-ui/config` | gluestack UI theme and component configuration |
| `nativewind` | Tailwind-style styling for React Native |
| `lucide-react-native` | Consistent icon system |
| `react-native-gesture-handler` | Native gesture handling |
| `react-native-reanimated` | Smooth UI animations |
| `react-native-worklets` | Worklet runtime used by Reanimated |
| `react-native-calendars` | Daily, weekly, and monthly calendar UI |
| `@shopify/flash-list` | Performant lists and grids |
| `expo-image` | Cached image loading and rendering |
| `@gorhom/bottom-sheet` | Bottom sheets and modal dialogs |
| `react-native-svg` | SVG rendering |
| `react-native-safe-area-context` | Safe-area handling |
| `react-native-screens` | Native navigation screen optimization |
| `react-native-web` | React Native web support |
| `react-native-webview` | Embedded web content |
| `react-native-vector-icons` | Icon fonts |
| `@expo/vector-icons` | Expo icon sets |
| `react-native-animatable` | Declarative animations |
| `react-native-circular-progress` | Circular progress indicators |
| `react-native-typewriter-effect` | Typewriter text animation |
| `expo-blur` | Blur effects |
| `expo-font` | Custom font loading |
| `expo-haptics` | Haptic feedback |
| `expo-status-bar` | Status bar controls |
| `expo-splash-screen` | Splash screen controls |
| `expo-symbols` | Native symbols |
| `expo-system-ui` | System UI configuration |
| `expo-linking` | Deep links and URL handling |
| `expo-constants` | App and device constants |
| `expo-web-browser` | Opening web pages in the system browser |

## State, data, forms, and networking

| Library | Purpose |
| --- | --- |
| `@tanstack/react-query` | Server-state caching and synchronization |
| `zustand` | Lightweight client-state management |
| `react-hook-form` | Form state management |
| `zod` | Runtime schema validation |
| `axios` | Centralized HTTP client |
| `@react-native-async-storage/async-storage` | Persistent non-sensitive local storage |
| `expo-secure-store` | Secure token and credential storage |

## Notifications and monitoring

| Library | Purpose |
| --- | --- |
| `expo-notifications` | Local and push notifications |
| `@sentry/react-native` | Crash and error monitoring |

## Testing and development

| Library | Purpose |
| --- | --- |
| `jest` | JavaScript and TypeScript test runner |
| `jest-expo` | Expo preset for Jest |
| `@testing-library/react-native` | Component and interaction testing |
| `@types/jest` | TypeScript types for Jest |
| `typescript` | Static type checking |
| `eslint` | Code linting |
| `eslint-config-expo` | Expo ESLint rules |
| `@babel/core` | JavaScript and TypeScript transformation |
| `tailwindcss` | Tailwind CSS configuration |
| `prettier-plugin-tailwindcss` | Tailwind class sorting |

## Native configuration

The Expo plugins for notifications and Sentry are enabled in [`app.json`](./app.json). Run the app from this directory:

```bash
npm install
npm start
```

Run validation with:

```bash
npm run lint
npm test -- --runInBand
```

Maestro is an external CLI-based E2E testing tool and is not installed as an npm dependency in this file.

## Local development troubleshooting

Run commands from the `mobile` directory. If the shell prompt already ends in
`mobile %`, do not run `cd mobile` again.

Node 22 LTS (22.13.0 or newer, but below Node 24) is recommended for this
Expo SDK. Start Expo Go explicitly with:

```bash
cd /Users/sampath/Desktop/PrepPros/mobile
npx expo start -c --go
```

The `ExpoAsset` and `ExponentConstants` errors occur when an old native iOS
binary is used with this project. Rebuild the native app after adding native
Expo packages:

```bash
cd /Users/sampath/Desktop/PrepPros/mobile
npx expo prebuild -p ios
npx expo run:ios
```
