# Stride

A social fitness challenge app built with Expo, React Native, and Supabase.

## Tech Stack
- **Framework:** Expo SDK 54 + Expo Router v6
- **UI:** React Native + NativeWind (Tailwind CSS)
- **Backend:** Supabase (Auth, Database, RLS)
- **State:** Zustand + TanStack React Query
- **Language:** TypeScript

## Getting Started
1. `pnpm install`
2. Copy `.env.local.example` to `.env.local` and fill in Supabase credentials
3. `npx expo start`

## EAS Build Commands
```bash
npx eas build --platform ios --profile development          # Device build
npx eas build --platform ios --profile development-simulator # Simulator build
npx eas build --platform ios --profile preview               # TestFlight
npx eas build --platform all --profile production            # Production
```
