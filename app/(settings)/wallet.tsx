import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, ArrowDownRight, ArrowUpRight, Wallet, ExternalLink } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useWallet } from '@/hooks/useWallet';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';
import { useStripeConnectAccount } from '@/hooks/useStripeConnectAccount';
import { useCashout } from '@/hooks/mutations/useCashout';
import { useConnectOnboarding } from '@/hooks/mutations/useConnectOnboarding';
import { formatDollars } from '@/lib/format';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { WalletTransactionType } from '@/types';

const TX_LABELS: Record<WalletTransactionType, string> = {
  prize_won: 'Prize Won',
  entry_fee: 'Entry Fee',
  cashout: 'Cash Out',
  refund: 'Refund',
  cashout_reversal: 'Cashout Reversed',
};

const TX_ICONS: Record<WalletTransactionType, typeof ArrowUpRight> = {
  prize_won: ArrowDownRight,
  entry_fee: ArrowUpRight,
  cashout: ArrowUpRight,
  refund: ArrowDownRight,
  cashout_reversal: ArrowDownRight,
};

export default function WalletScreen() {
  const { data: wallet, isPending: walletLoading, isError: walletError, refetch: refetchWallet } = useWallet();
  const { data: transactions = [], isPending: txLoading, isError: txError, refetch: refetchTx } = useWalletTransactions();
  const { data: connectAccount } = useStripeConnectAccount();
  const cashout = useCashout();
  const connectOnboarding = useConnectOnboarding();
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const balance = wallet?.balance_cents ?? 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchTx()]);
    setRefreshing(false);
  };

  const handleCashout = () => {
    const amountDollars = parseFloat(cashoutAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    const amountCents = Math.round(amountDollars * 100);
    if (amountCents > balance) {
      Alert.alert('Insufficient Balance', `You only have ${formatDollars(balance)} available.`);
      return;
    }

    Alert.alert(
      'Transfer to Bank',
      `Transfer ${formatDollars(amountCents)} to your bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: () => {
            cashout.mutate(amountCents, {
              onSuccess: () => {
                setCashoutAmount('');
                Alert.alert('Transfer Initiated', 'Your funds are on the way to your bank.');
              },
              onError: (error) => {
                Alert.alert('Transfer Failed', error.message);
              },
            });
          },
        },
      ],
    );
  };

  const handleSetupConnect = () => {
    connectOnboarding.mutate(undefined, {
      onError: (error) => {
        Alert.alert('Setup Failed', error.message);
      },
    });
  };

  if (walletLoading || txLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Wallet" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (walletError || txError) {
    return (
      <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
        <ScreenHeader title="Wallet" />
        <ErrorState
          message="Could not load wallet data"
          onRetry={() => { refetchWallet(); refetchTx(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader title="Wallet" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Balance Hero */}
        <View className="px-6 mb-4">
          <Card variant="dark" className="p-6">
            <View className="flex-row items-center mb-2">
              <Wallet size={16} color="#ffffff80" />
              <Text className="text-xs text-white/60 uppercase font-bold tracking-wider ml-2">
                Available Balance
              </Text>
            </View>
            <Text className="text-4xl font-bold text-white mb-1">
              {formatDollars(balance)}
            </Text>
            <Text className="text-xs text-white/50">
              {transactions.length} transactions
            </Text>
          </Card>
        </View>

        {/* Cash Out Section */}
        <View className="px-6 mb-6">
          {connectAccount?.payouts_enabled ? (
            <View>
              <Text className="text-xs font-bold text-muted-text uppercase tracking-wider mb-2">
                Transfer to Bank
              </Text>
              <View className="flex-row gap-3">
                <TextInput
                  className="flex-1 h-12 bg-white border border-border rounded-xl px-4 text-base text-neutral-dark"
                  placeholder="$0.00"
                  placeholderTextColor={Colors.mutedText}
                  keyboardType="decimal-pad"
                  value={cashoutAmount}
                  onChangeText={setCashoutAmount}
                />
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleCashout}
                  disabled={cashout.isPending || !cashoutAmount}
                >
                  {cashout.isPending ? 'Sending...' : 'Transfer'}
                </Button>
              </View>
            </View>
          ) : (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <ExternalLink size={16} color="#B45309" />
                <Text className="text-sm font-bold text-amber-800 ml-2">
                  Set Up Bank Transfers
                </Text>
              </View>
              <Text className="text-xs text-amber-700 mb-3">
                Connect your bank account to withdraw your winnings. Powered by Stripe.
              </Text>
              <Button
                variant="primary"
                size="sm"
                onPress={handleSetupConnect}
                disabled={connectOnboarding.isPending}
              >
                {connectOnboarding.isPending ? 'Setting up...' : 'Set Up Now'}
              </Button>
            </View>
          )}
        </View>

        {/* Transaction History */}
        <View className="px-6 mb-4">
          <Text className="text-lg font-bold text-neutral-dark mb-3">
            Transaction History
          </Text>
          {transactions.length === 0 ? (
            <View className="items-center py-8">
              <DollarSign size={32} color={Colors.border} />
              <Text className="text-sm text-muted-text mt-2 text-center">
                Nothing here yet. Win a prize pool{'\n'}challenge and your earnings show up here.
              </Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.amount_cents > 0;
              const Icon = TX_ICONS[tx.type] ?? DollarSign;

              return (
                <View key={tx.id} className="flex-row items-center py-3 border-b border-border">
                  <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                    isCredit ? 'bg-green-100' : 'bg-red-50'
                  }`}>
                    <Icon size={14} color={isCredit ? '#078818' : '#ef4444'} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-neutral-dark">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </Text>
                    <Text className="text-[10px] text-muted-text">
                      {tx.description ?? new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : ''}{formatDollars(Math.abs(tx.amount_cents))}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
