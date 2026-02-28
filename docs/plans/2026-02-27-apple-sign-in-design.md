# Apple Sign-In Design

## Summary
Add native Apple Sign-In to the sign-in and sign-up screens using `expo-apple-authentication` + Supabase `signInWithIdToken`. iOS only. Auto-creates profile from Apple-provided name on first sign-in.

## Approach
Native iOS authentication sheet (Option A). No browser redirect, no OAuth callback handling. The Apple button is hidden on Android via `Platform.OS` check.

## Auth Flow
1. User taps "Continue with Apple"
2. `expo-apple-authentication` presents native iOS sheet
3. Apple returns `identityToken` + `fullName` (name only on first sign-in)
4. Call `supabase.auth.signInWithIdToken({ provider: 'apple', token })`
5. Supabase validates token with Apple, creates/returns session
6. If `fullName` present, call `supabase.auth.updateUser({ data: { full_name } })`
7. AuthGate detects session, routes to `/(tabs)`
8. Existing DB trigger auto-creates profile row

## Files

### Create
- `hooks/useAppleAuth.ts` — Hook wrapping Apple auth + Supabase flow
- `components/ui/AppleSignInButton.tsx` — Native Apple button (iOS only)

### Modify
- `app/(auth)/sign-in.tsx` — Add Apple button + "or" divider above email form
- `app/(auth)/sign-up.tsx` — Add Apple button + "or" divider above email form
- `ios/Stride/Stride.entitlements` — Add `com.apple.developer.applesignin`
- `app.json` — Add `expo-apple-authentication` plugin

## Error Handling
- User cancels (`ERR_REQUEST_CANCELED`): silently ignored
- No identity token: Alert with retry suggestion
- Supabase error: Alert with error message

## Manual Setup Required
1. Apple Developer Console: Enable "Sign in with Apple" on App ID
2. Supabase Dashboard: Enable Apple provider (Auth > Providers > Apple)
