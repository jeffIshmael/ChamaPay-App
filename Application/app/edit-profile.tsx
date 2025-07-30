import { serverUrl } from '@/constants/serverUrl';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Mail, Phone, Save, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
        name: user.name || '',
        email: user.email || '',
        phoneNo: user.phoneNo?.toString() || '',
        profileImageUrl: user.profileImageUrl || '',
      });
    }
  }, [user]);

  // Default avatar URLs based on user's initials or id
  const getDefaultAvatar = () => {
    const initials = (user?.name || user?.email || 'U')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    // Using a service like DiceBear Avatars for consistent default avatars
    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=10b981&textColor=ffffff`;
  };

  const getCurrentProfileImage = () => {
    return formData.profileImageUrl || user?.profileImageUrl || getDefaultAvatar();
  };

  const validateForm = () => {
    const newErrors = { name: '', email: '', phoneNo: '' };
    let isValid = true;

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Validate phone number (optional)
    if (formData.phoneNo && formData.phoneNo.trim()) {
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(formData.phoneNo.replace(/\D/g, ''))) {
        newErrors.phoneNo = 'Please enter a valid phone number';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
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
      // Request permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
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
      // For demo purposes, we'll use a placeholder service
      // In production, you'd upload to your own server or cloud storage
      const base64Image = imageAsset.base64;
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, we'll store the local URI
      // In production, this would be the URL returned from your upload service
      const imageUrl = imageAsset.uri;
      
      setFormData(prev => ({ ...prev, profileImageUrl: imageUrl }));
      
      Alert.alert('Success', 'Profile image updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
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
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNo: formData.phoneNo ? parseInt(formData.phoneNo.replace(/\D/g, '')) : null,
        profileImageUrl: formData.profileImageUrl || null,
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
    return (
      formData.name !== (user?.name || '') ||
      formData.email !== (user?.email || '') ||
      formData.phoneNo !== (user?.phoneNo?.toString() || '') ||
      formData.profileImageUrl !== (user?.profileImageUrl || '')
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-2">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">
            Edit Profile
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Profile Image Section */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Profile Picture
          </Text>
          
          <View className="items-center">
            <View className="relative">
              <Image
                source={{ uri: getCurrentProfileImage() }}
                className="w-24 h-24 rounded-full"
                style={{ backgroundColor: '#f3f4f6' }}
              />
              {imageUploading && (
                <View className="absolute inset-0 bg-black bg-opacity-50 rounded-full items-center justify-center">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </View>
            
            <TouchableOpacity
              onPress={showImageOptions}
              disabled={imageUploading}
              className="mt-3 px-4 py-2 bg-emerald-600 rounded-lg flex-row items-center active:bg-emerald-700"
            >
              <Camera size={16} color="white" style={{ marginRight: 6 }} />
              <Text className="text-white font-medium">
                {imageUploading ? 'Uploading...' : 'Change Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Form */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Profile Information
          </Text>

          {/* Name Field */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Full Name</Text>
            <View className={`flex-row items-center border rounded-lg px-4 py-3 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}>
              <User size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="Enter your full name"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, name: text }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                autoCapitalize="words"
              />
            </View>
            {errors.name ? (
              <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
            ) : null}
          </View>

          {/* Email Field */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Email Address</Text>
            <View className={`flex-row items-center border rounded-lg px-4 py-3 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}>
              <Mail size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="Enter your email address"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, email: text }));
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email ? (
              <Text className="text-red-500 text-sm mt-1">{errors.email}</Text>
            ) : null}
          </View>

          {/* Phone Number Field */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Phone Number (Optional)</Text>
            <View className={`flex-row items-center border rounded-lg px-4 py-3 ${
              errors.phoneNo ? 'border-red-300' : 'border-gray-300'
            }`}>
              <Phone size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="Enter your phone number"
                value={formData.phoneNo}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, phoneNo: text }));
                  if (errors.phoneNo) setErrors(prev => ({ ...prev, phoneNo: '' }));
                }}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phoneNo ? (
              <Text className="text-red-500 text-sm mt-1">{errors.phoneNo}</Text>
            ) : null}
          </View>

          <View className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <Text className="text-blue-800 text-sm">
              💡 Your wallet address and other security information cannot be changed for security reasons.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button - Fixed at bottom */}
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !hasChanges()}
          className={`w-full py-4 rounded-lg flex-row items-center justify-center ${
            loading || !hasChanges()
              ? 'bg-gray-300'
              : 'bg-emerald-600 active:bg-emerald-700'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save size={16} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-medium text-lg">
                Save Changes
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 