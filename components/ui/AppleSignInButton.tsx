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
