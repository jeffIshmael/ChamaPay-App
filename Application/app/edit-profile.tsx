import { serverUrl } from '@/constants/serverUrl';
import { useAuth } from '@/Contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Camera, Edit3, Mail, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ToastAndroid
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNo: '',
    profileImageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phoneNo: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.userName || '',
        email: user.email || '',
        phoneNo: user.phoneNo?.toString() || '',
        profileImageUrl: user.profileImageUrl || '',
      });
    }
  }, [user]);

  const getDefaultAvatar = () => {
    const initials = (user?.userName || user?.email || 'U')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=10b981&textColor=ffffff`;
  };

  const getCurrentProfileImage = () => {
    return formData.profileImageUrl || user?.profileImageUrl || getDefaultAvatar();
  };

  const validateForm = () => {
    const newErrors = { name: '', email: '', phoneNo: '' };
    let isValid = true;

    if (formData.phoneNo && formData.phoneNo.trim()) {
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(formData.phoneNo.replace(/\D/g, ''))) {
        newErrors.phoneNo = 'Please enter a valid phone number (10-15 digits)';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (imageAsset: any) => {
    setImageUploading(true);
    try {
      // Create FormData for multipart upload
      const formData = new FormData();

      // Extract filename and type from URI
      const uriParts = imageAsset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: imageAsset.uri,
        name: `profile_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      const response = await fetch(`${serverUrl}/user/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it automatically for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state with new image URL
        setFormData(prev => ({ ...prev, profileImageUrl: data.profileImageUrl }));

        // Refresh user data to get updated profile
        await refreshUser?.();
        ToastAndroid.show('Profile image updated successfully!', ToastAndroid.SHORT);
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to upload image. Please try again.'
      );
    } finally {
      setImageUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        phoneNo: formData.phoneNo && formData.phoneNo.trim()
          ? parseInt(formData.phoneNo.replace(/\D/g, ''))
          : null,
      };

      const response = await fetch(`${serverUrl}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              refreshUser?.();
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return formData.phoneNo !== (user?.phoneNo?.toString() || '');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      {/* Header */}
      <View
        className="bg-downy-800 px-6 pb-8 pt-4 rounded-b-md"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <Edit3 size={20} color="white" />
            <Text className="text-xl font-bold text-white">
              Edit Profile
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1 -mt-8" showsVerticalScrollIndicator={false}>
        <View className="px-6">
          {/* Profile Image Section */}
          <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <View className="flex-row items-center gap-3 mb-6">
              <View>
                <Text className="text-lg font-bold text-gray-900">Profile Picture</Text>
                <Text className="text-gray-600 text-sm">Update your profile photo</Text>
              </View>
            </View>

            <View className="items-center">
              <View className="relative">
                <Image
                  source={{ uri: getCurrentProfileImage() }}
                  className="w-28 h-28 rounded-full border-4 border-gray-100"
                />
                {imageUploading && (
                  <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                    <ActivityIndicator color="white" size="large" />
                  </View>
                )}
                <View className="absolute -bottom-2 -right-2 w-8 h-8 bg-downy-600 rounded-full items-center justify-center border-2 border-white">
                  <Camera size={14} color="white" />
                </View>
              </View>

              <TouchableOpacity
                onPress={showImageOptions}
                disabled={imageUploading}
                className={`mt-6 px-6 py-3 rounded-xl flex-row items-center ${imageUploading
                  ? 'bg-gray-300'
                  : 'bg-downy-700 opacity-95'
                  }`}
                activeOpacity={0.8}
              >
                <Camera size={18} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-base">
                  {imageUploading ? 'Uploading...' : 'Change Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Form */}
          <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <View className="flex-row items-center gap-3 mb-6">
              <View>
                <Text className="text-lg font-bold text-gray-900">Profile Information</Text>
                <Text className="text-gray-600 text-sm">Update your personal details</Text>
              </View>
            </View>

            {/* Name Field - Read Only */}
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Text className="text-gray-900 font-semibold text-base">User Name</Text>
                <View className="bg-gray-100 px-2 py-1 rounded-md">
                  <Text className="text-gray-600 text-xs font-medium">Read Only</Text>
                </View>
              </View>
              <View className="flex-row items-center border-2 border-gray-200 bg-gray-100 rounded-xl px-4 py-4">
                <User size={20} color="#9ca3af" />
                <Text className="flex-1 ml-3 text-gray-500 text-base">
                  {formData.name || user?.userName || "No name set"}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mt-2">
                Username cannot be changed for security reasons
              </Text>
            </View>

            {/* Email Field - Read Only */}
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <Text className="text-gray-900 font-semibold text-base">Email Address</Text>
                <View className="bg-gray-100 px-2 py-1 rounded-md">
                  <Text className="text-gray-600 text-xs font-medium">Read Only</Text>
                </View>
              </View>
              <View className="flex-row items-center border-2 border-gray-200 bg-gray-100 rounded-xl px-4 py-4">
                <Mail size={20} color="#9ca3af" />
                <Text className="flex-1 ml-3 text-gray-500 text-base">
                  {formData.email || user?.email || "No email set"}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mt-2">
                Email cannot be changed for security reasons
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}