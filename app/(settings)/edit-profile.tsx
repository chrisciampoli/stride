import { useState } from 'react';
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateProfile } from '@/hooks/mutations/useUpdateProfile';
import { uploadAvatar, deleteAvatar } from '@/lib/storage';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const profileEditSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  bio: z.string().max(160, 'Bio must be under 160 characters').optional().or(z.literal('')),
  location: z.string().max(50, 'Location is too long').optional().or(z.literal('')),
});

type ProfileEditForm = z.infer<typeof profileEditSchema>;

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileEditForm>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
    },
  });

  const pickImage = async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', `Please allow access to your ${useCamera ? 'camera' : 'photo library'}.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
      setAvatarRemoved(false);
    }
  };

  const showAvatarOptions = () => {
    if (Platform.OS === 'ios') {
      const options = ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, destructiveButtonIndex: 2 },
        (index) => {
          if (index === 0) pickImage(true);
          else if (index === 1) pickImage(false);
          else if (index === 2) {
            setAvatarUri(null);
            setAvatarChanged(true);
            setAvatarRemoved(true);
          }
        },
      );
    } else {
      Alert.alert('Change Photo', '', [
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        { text: 'Remove Photo', style: 'destructive', onPress: () => {
          setAvatarUri(null);
          setAvatarChanged(true);
          setAvatarRemoved(true);
        }},
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const onSubmit = async (data: ProfileEditForm) => {
    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarChanged && user) {
        if (avatarRemoved) {
          await deleteAvatar(user.id);
          avatarUrl = null;
        } else if (avatarUri) {
          avatarUrl = await uploadAvatar(user.id, avatarUri, 'image/jpeg');
        }
      }

      await updateProfile({
        full_name: data.fullName,
        bio: data.bio || null,
        location: data.location || null,
        avatar_url: avatarUrl,
      });

      router.back();
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={['top']}>
      <ScreenHeader
        title="Edit Profile"
        rightIcon={
          <Text className="text-primary font-bold text-sm">
            {isPending ? '...' : 'Save'}
          </Text>
        }
        onRightPress={handleSubmit(onSubmit)}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <Pressable onPress={showAvatarOptions} className="items-center mb-8">
            <View className="relative">
              <Avatar
                uri={avatarUri}
                initials={profile?.full_name?.charAt(0) ?? '?'}
                size="xl"
                border="primary"
              />
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center">
                <Camera size={16} color={Colors.white} />
              </View>
            </View>
            <Text className="text-sm text-primary font-semibold mt-2">
              Change Photo
            </Text>
          </Pressable>

          {/* Form */}
          <View className="gap-4 mb-8">
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Your name"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  error={errors.fullName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="bio"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Bio"
                  placeholder="Tell us about yourself"
                  value={value}
                  onChangeText={onChange}
                  multiline
                  error={errors.bio?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Location"
                  placeholder="City, State"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  error={errors.location?.message}
                />
              )}
            />
          </View>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
