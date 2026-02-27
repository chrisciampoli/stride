import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { Alert } from 'react-native';

function handleError(error: Error, context: string) {
  if (__DEV__) {
    console.error(`[${context}]`, error.message);
  }
}

function handleMutationError(error: Error) {
  Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleError(error, 'Query'),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleMutationError(error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});
