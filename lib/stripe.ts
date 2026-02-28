import Constants from 'expo-constants';

const publishableKey =
  Constants.expoConfig?.extra?.stripePublishableKey ??
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  '';

if (!publishableKey) {
  console.warn('Stripe publishable key is not set. Payment features will not work.');
}

export const stripePublishableKey = publishableKey;
