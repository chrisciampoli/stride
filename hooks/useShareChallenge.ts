import { Share } from 'react-native';
import { useCallback } from 'react';

export function useShareChallenge() {
  const shareChallenge = useCallback(
    async (challenge: { id: string; name: string; description?: string | null }) => {
      try {
        const deepLink = `strideapp://challenge/${challenge.id}/details`;
        const message = `Join my challenge "${challenge.name}" on Stride! ${deepLink}`;

        await Share.share({
          message,
          title: challenge.name,
        });
      } catch (_error) {
        // User cancelled — ignore
      }
    },
    [],
  );

  const shareRank = useCallback(
    async (challenge: { id: string; name: string }, rank: number, totalSteps: number) => {
      try {
        const deepLink = `strideapp://challenge/${challenge.id}/leaderboard`;
        const suffix =
          rank === 1
            ? '1st'
            : rank === 2
              ? '2nd'
              : rank === 3
                ? '3rd'
                : `${rank}th`;
        const message = `I'm ${suffix} place in "${challenge.name}" with ${totalSteps.toLocaleString()} steps on Stride! ${deepLink}`;

        await Share.share({
          message,
          title: `My rank in ${challenge.name}`,
        });
      } catch (_error) {
        // User cancelled — ignore
      }
    },
    [],
  );

  return { shareChallenge, shareRank };
}
