# Apple Sign-In Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add native Apple Sign-In to sign-in and sign-up screens so iOS users can authenticate with one tap.

**Architecture:** Use `expo-apple-authentication` for the native iOS auth sheet, pass the identity token to `supabase.auth.signInWithIdToken()`. Auto-create profile from Apple-provided name. Button hidden on Android.

**Tech Stack:** expo-apple-authentication, Supabase Auth (signInWithIdToken), React Native

---

### Task 1: Install expo-apple-authentication and configure entitlements

**Files:**
- Modify: `package.json` (dependency added by pnpm)
- Modify: `app.json:31` (plugins array)
- Modify: `ios/Stride/Stride.entitlements`

**Step 1: Install the package**

Run: `pnpm add expo-apple-authentication`

**Step 2: Add plugin to app.json**

Add `"expo-apple-authentication"` to the `plugins` array in `app.json` (after `"expo-router"`):

```json
"plugins": [
  "expo-router",
  "expo-apple-authentication",
  ...
]
```

**Step 3: Add Sign in with Apple entitlement**

Add to `ios/Stride/Stride.entitlements` inside the `<dict>`:

```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

**Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

### Task 2: Create useAppleAuth hook

**Files:**
- Create: `hooks/useAppleAuth.ts`

**Step 1: Create the hook**

```typescript
import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export function useAppleAuth() {
  const [isPending, setIsPending] = useState(false);

  const signIn = async () => {
    if (Platform.OS !== 'ios') return;
    setIsPending(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      // Apple only provides the name on first sign-in — save it
      if (credential.fullName) {
        const parts: string[] = [];
        if (credential.fullName.givenName) parts.push(credential.fullName.givenName);
        if (credential.fullName.familyName) parts.push(credential.fullName.familyName);
        const fullName = parts.join(' ');
        if (fullName) {
          await supabase.auth.updateUser({ data: { full_name: fullName } });
        }
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — do nothing
        return;
      }
      Alert.alert('Sign In Failed', err.message ?? 'Could not sign in with Apple.');
    } finally {
      setIsPending(false);
    }
  };

  return { signIn, isPending };
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

### Task 3: Create AppleSignInButton component

**Files:**
- Create: `components/ui/AppleSignInButton.tsx`

**Step 1: Create the component**

```tsx
import { Platform, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AppleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function AppleSignInButton({ onPress, disabled }: AppleSignInButtonProps) {
  if (Platform.OS !== 'ios') return null;

  return (
    <View className="w-full" pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.5 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={{ width: '100%', height: 56 }}
        onPress={onPress}
      />
    </View>
  );
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

### Task 4: Add Apple Sign-In to sign-in screen

**Files:**
- Modify: `app/(auth)/sign-in.tsx`

**Step 1: Add imports**

Add at top of file:
```typescript
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import { useAppleAuth } from '@/hooks/useAppleAuth';
```

**Step 2: Add hook usage**

Inside `SignInScreen` component, after `const [loading, setLoading] = useState(false);`:
```typescript
const appleAuth = useAppleAuth();
```

**Step 3: Add Apple button + divider before email form**

Insert after the subtitle `<Text>Sign in to continue your journey</Text>` and before `<View className="gap-4 mb-8">`:

```tsx
          <AppleSignInButton onPress={appleAuth.signIn} disabled={appleAuth.isPending} />

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-4 text-xs text-muted-text uppercase">or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>
```

**Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

### Task 5: Add Apple Sign-In to sign-up screen

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

**Step 1: Add imports**

Add at top of file:
```typescript
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import { useAppleAuth } from '@/hooks/useAppleAuth';
```

**Step 2: Add hook usage**

Inside `SignUpScreen` component, after `const [emailSent, setEmailSent] = useState(false);`:
```typescript
const appleAuth = useAppleAuth();
```

**Step 3: Add Apple button + divider before email form**

Insert after the subtitle `<Text>Start your fitness challenge today</Text>` and before `<View className="gap-4 mb-8">`:

```tsx
          <AppleSignInButton onPress={appleAuth.signIn} disabled={appleAuth.isPending} />

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-4 text-xs text-muted-text uppercase">or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>
```

**Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

### Task 6: Final verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: zero errors

**Step 2: Verify no regressions**

Run: `npx expo lint`

**Step 3: Manual setup reminder**

Print reminder for user:
1. Apple Developer Console: Enable "Sign in with Apple" capability on App ID `com.chrisciampoli.strideapp`
2. Supabase Dashboard: Auth > Providers > Apple — enable and save
3. Rebuild native app: `npx expo run:ios` (needed for new entitlement)
