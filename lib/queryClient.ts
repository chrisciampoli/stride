import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

function handleError(error: Error, context: string) {
  if (__DEV__) {
    console.error(`[${context}]`, error.message);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleError(error, 'Query'),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleError(error, 'Mutation'),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
    },
    mutations: {
      retry: false,
    },
  },
});
