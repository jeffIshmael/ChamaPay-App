import { serverUrl } from '@/constants/serverUrl';
import { useAuth } from '@/contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Shield,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface SeedPhraseModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SeedPhraseModal({ visible, onClose }: SeedPhraseModalProps) {
  const [step, setStep] = useState<'auth' | 'display'>('auth');
  const [authMethod, setAuthMethod] = useState<'biometric' | 'password'>('biometric');
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  const { token } = useAuth();

  useEffect(() => {
    if (visible) {
      checkBiometricSupport();
      setStep('auth');
      setPassword('');
      setSeedPhrase('');
      setShowSeedPhrase(false);
      setError('');
      setCopied(false);
    }
  }, [visible]);



  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(compatible && enrolled);
      
      if (compatible && enrolled) {
        setAuthMethod('biometric');
      } else {
        setAuthMethod('password');
      }
    } catch (error) {
      console.error('Biometric check error:', error);
      setBiometricSupported(false);
      setAuthMethod('password');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view your seed phrase',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        await fetchSeedPhrase();
      } else {
        // If authentication failed, allow fallback to password
        setError('Biometric authentication failed. Please use password instead.');
        setAuthMethod('password');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      setError('Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify password with backend
      const response = await fetch(`${serverUrl}/auth/get-mnemonic`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSeedPhrase(data.mnemonic);
        setStep('display');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (error) {
      console.error('Password auth error:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeedPhrase = async () => {
    // For biometric auth, we need a temporary password prompt
    Alert.prompt(
      'Enter Password',
      'Please enter your account password to decrypt your seed phrase',
      async (enteredPassword) => {
        if (!enteredPassword) {
          setError('Password is required');
          return;
        }

        try {
          const response = await fetch(`${serverUrl}/auth/get-mnemonic`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: enteredPassword }),
          });

          const data = await response.json();

          if (response.ok) {
            setSeedPhrase(data.mnemonic);
            setStep('display');
          } else {
            setError(data.error || 'Failed to fetch seed phrase');
          }
        } catch (error) {
          console.error('Fetch seed phrase error:', error);
          setError('Failed to fetch seed phrase');
        }
      },
      'secure-text'
    );
  };

  const handleCopySeedPhrase = async () => {
    try {
      await Clipboard.setStringAsync(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy seed phrase');
    }
  };

  const handleClose = () => {
    setSeedPhrase('');
    setShowSeedPhrase(false);
    setPassword('');
    setError('');
    setCopied(false);
    onClose();
  };

  const seedWords = seedPhrase.split(' ');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-900">
            {step === 'auth' ? 'Authenticate' : 'Seed Phrase'}
          </Text>
          <TouchableOpacity onPress={handleClose} className="p-1">
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {step === 'auth' ? (
          /* Authentication Step */
          <View className="flex-1 p-6">
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-4">
                <Shield size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2">
                Security Verification Required
              </Text>
              <Text className="text-gray-600 text-center">
                To protect your wallet, please authenticate before viewing your seed phrase
              </Text>
            </View>

            {error && (
              <View className="bg-red-50 p-3 rounded-lg mb-4">
                <Text className="text-red-600 text-sm text-center">{error}</Text>
              </View>
            )}

            {authMethod === 'biometric' && biometricSupported ? (
              <View className="gap-4">
                <TouchableOpacity
                  onPress={handleBiometricAuth}
                  disabled={loading}
                  className="bg-emerald-600 p-4 rounded-lg items-center flex-row justify-center active:bg-emerald-700"
                >
                  <Fingerprint size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-medium">
                    {loading ? 'Authenticating...' : 'Use Biometric/PIN'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setAuthMethod('password')}
                  className="p-3 items-center"
                >
                  <Text className="text-emerald-600 font-medium">Use Password Instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-4">
                <View>
                  <Text className="text-gray-700 font-medium mb-2">Enter Password</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3">
                    <Lock size={18} color="#9ca3af" />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900"
                      placeholder="Your account password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handlePasswordAuth}
                  disabled={loading}
                  className={`p-4 rounded-lg items-center ${
                    loading ? 'bg-gray-300' : 'bg-emerald-600 active:bg-emerald-700'
                  }`}
                >
                  <Text className="text-white font-medium">
                    {loading ? 'Verifying...' : 'Authenticate'}
                  </Text>
                </TouchableOpacity>

                {biometricSupported && (
                  <TouchableOpacity
                    onPress={() => setAuthMethod('biometric')}
                    className="p-3 items-center"
                  >
                    <Text className="text-emerald-600 font-medium">Use Biometric Instead</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Seed Phrase Display Step */
          <View className="flex-1 p-6">
            <View className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
              <Text className="text-red-800 font-medium mb-2">🔐 Security Warning</Text>
              <Text className="text-red-700 text-sm">
                • Never share your seed phrase with anyone{'\n'}
                • Store it offline in a secure location{'\n'}
                • Anyone with this phrase can access your wallet
              </Text>
            </View>

            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-gray-900">
                  Your Seed Phrase
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSeedPhrase(!showSeedPhrase)}
                  className="p-2"
                >
                  {showSeedPhrase ? (
                    <EyeOff size={20} color="#6b7280" />
                  ) : (
                    <Eye size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>

              {showSeedPhrase ? (
                <View className="bg-gray-50 p-4 rounded-lg">
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {seedWords.map((word, index) => (
                      <View key={index} className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                        <Text className="text-gray-900 font-mono text-sm">
                          {index + 1}. {word}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    onPress={handleCopySeedPhrase}
                    className="flex-row items-center justify-center p-3 bg-emerald-600 rounded-lg active:bg-emerald-700"
                  >
                    {copied ? (
                      <Check size={16} color="white" style={{ marginRight: 8 }} />
                    ) : (
                      <Copy size={16} color="white" style={{ marginRight: 8 }} />
                    )}
                    <Text className="text-white font-medium">
                      {copied ? 'Copied!' : 'Copy Seed Phrase'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="bg-gray-50 p-8 rounded-lg items-center">
                  <EyeOff size={32} color="#9ca3af" />
                  <Text className="text-gray-500 mt-2">Tap the eye icon to reveal</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
