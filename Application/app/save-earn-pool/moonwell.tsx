import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calculator, Info, ChevronDown, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { buildDailyHistory } from '../../components/DailyEarningsStatement';
import { TabButton } from '../../components/ui/TabButton';
import { StatusBar } from 'expo-status-bar';
import MoonwellDepositModal from '../../components/MoonwellDepositModal';
import MoonwellWithdrawModal from '../../components/MoonwellWithdrawModal';
import { useAuth } from '@/Contexts/AuthContext';
import { getMoonwellRates, getMoonwellPositions } from '../../lib/moonwellService';
import { getTheUserTx } from '../../lib/walletServices';
import { useEffect } from 'react';
import axios from 'axios';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { useExchangeRateStore } from '@/store/useExchangeRateStore';
import { formatCurrency } from '@/Utils/pretiumUtils';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
// Remove static constants since we fetch them dynamically

export default function MoonwellDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  
  const { currency } = useCurrencyStore();
  const { fetchRate, rates } = useExchangeRateStore();
  
  useEffect(() => {
    fetchRate('KES');
  }, []);
  
  const currentExchangeRate = rates['KES']?.data?.exchangeRate?.buying_rate || 132;
  const isKES = currency === 'KES';
  
  const displayAmount = (usdcAmount: number) => {
    if (isKES) {
      return formatCurrency(usdcAmount * currentExchangeRate);
    }
    return usdcAmount.toFixed(2);
  };
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'statements' | 'simulator'>('statements');

  // Simulator state
  const [simAmount, setSimAmount] = useState('1000');
  const [simPeriod, setSimPeriod] = useState(12);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Real-time State
  const [realApy, setRealApy] = useState(0);
  const [realBalance, setRealBalance] = useState(0);
  const [statements, setStatements] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Moonwell APY
    getMoonwellRates().then((result) => {
      if (result && result.success && result.data && result.data.length > 0) {
        setRealApy(result.data[0].baseSupplyApy);
      }
    });

    // Fetch user Balance
    if (user?.smartAddress) {
      getMoonwellPositions(user.smartAddress).then((data) => {
        if (data && data.suppliedAmountDecimal) {
          setRealBalance(parseFloat(data.suppliedAmountDecimal));
        }
      });
    }

    // Fetch Statements from Backend Payments
    if (token) {
      getTheUserTx(token).then((res) => {
        if (res && res.transactions) {
          const mwTxs = res.transactions.filter((tx: any) => tx.receiver === 'Moonwell' || tx.description?.includes('Moonwell'));
          setStatements(mwTxs);
        }
      });
    }
  }, [user?.smartAddress, token]);

  const APY = realApy || 4.3; 
  const MOCK_USER_BALANCE = realBalance;

  const history = buildDailyHistory(MOCK_USER_BALANCE, APY, 7);
  
  const amountNum = parseFloat(simAmount) || 0;
  const projectedYield = amountNum * (Math.pow(1 + APY / 100, simPeriod / 12) - 1);
  const totalProjected = amountNum + projectedYield;

  const handleDeposit = () => {
    setShowDepositModal(true);
  };

  const handleWithdraw = () => {
    setShowWithdrawModal(true);
  };

  const renderPeriodText = (months: number) => {
    if (months < 12) return `${months} Month${months > 1 ? 's' : ''}`;
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    return `${months} Months (${yrs} Yr${yrs > 1 ? 's' : ''}${mos > 0 ? ` ${mos} Mo` : ''})`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      
      {/* Header */}
      <View
        className="bg-downy-800 rounded-b-3xl px-6 pb-6 flex-row items-center justify-between shadow-sm z-10"
        style={{ paddingTop: insets.top + 10 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Pool Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        
        {/* Hero Card */}
        <View className="px-5 mb-6">
          <View
            className="bg-blue-50 rounded-md p-6 shadow-md border border-blue-200"
          >
            {/* Logo and Title */}
            <View className="flex-row items-center justify-center mb-6 border-b border-blue-100 pb-4">
              <Image 
                source={require('@/assets/images/moonwell_logo.png')} 
                className="w-8 h-8 mr-2 rounded-full bg-white" 
                resizeMode="contain" 
              />
              <Text className="text-blue-900 text-lg font-bold tracking-tight">Moonwell Pool</Text>
            </View>

            {/* Top: APY and Total Supplied */}
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-blue-800/70 text-xs font-semibold mb-0.5 uppercase tracking-wider">Total Supplied</Text>
                <Text style={{ fontFamily: monoFont }} className="text-blue-900 font-bold text-lg">$15.3M</Text>
              </View>
              <View className="items-end">
                <Text className="text-blue-800/70 text-xs font-semibold mb-0.5 uppercase tracking-wider">Current APY</Text>
                <Text style={{ fontFamily: monoFont }} className="text-emerald-700 font-bold text-lg">{APY.toFixed(2)}%</Text>
              </View>
            </View>

            {/* Middle: Invested Balance */}
            <View className="items-center mb-6">
              <Text className="text-blue-800/70 text-sm font-medium mb-2">Your Investment</Text>
              <Text style={{ fontFamily: monoFont }} className="text-blue-900 text-5xl font-extrabold tracking-tight">
                {displayAmount(MOCK_USER_BALANCE)}
                <Text className="text-2xl text-blue-900/50 font-bold"> {isKES ? 'KES' : 'USDC'}</Text>
              </Text>
              <View className=" px-3 py-1 rounded-full mt-3 ">
                <Text className="text-emerald-600 font-bold text-xs">+ $ 0.00 Total Yield</Text>
              </View>
            </View>

            {/* Bottom: Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleDeposit}
                activeOpacity={0.8}
                className="flex-1 bg-blue-600 py-3.5 rounded-2xl items-center shadow-sm"
              >
                <Text className="text-white font-bold text-[15px]">Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={MOCK_USER_BALANCE === 0}
                activeOpacity={0.8}
                className={`flex-1 py-3.5 rounded-2xl items-center border border-blue-200 shadow-sm ${MOCK_USER_BALANCE === 0 ? 'bg-gray-50 opacity-50' : 'bg-white'}`}
              >
                <Text className="text-blue-700 font-bold text-[15px]">Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="px-6 mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3">How it works</Text>
          <View className=" ml-2 ">
            <View className="flex-row items-center mb-3">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3" />
              <Text className="text-gray-700 font-medium text-sm flex-1">Deposit directly from your account {isKES && "or M-pesa"}.</Text>
            </View>
            <View className="flex-row items-center mb-3">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3" />
              <Text className="text-gray-700 font-medium text-sm flex-1">Earn variable interest.</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3" />
              <Text className="text-gray-700 font-medium text-sm flex-1">Withdraw your principal & yield anytime</Text>
            </View>
          </View>
        </View>

        <View className="px-5 mb-5">
          <View className="flex-row bg-gray-100 rounded-lg px-1 py-2 mb-4">
            <TabButton
              label="Statements"
              value="statements"
              isActive={activeTab === 'statements'}
              onPress={() => setActiveTab('statements')}
              icon={<FileText size={16} color={activeTab === 'statements' ? '#0f766e' : '#4b5563'} />}
            />
            <TabButton
              label="Yield Simulator"
              value="simulator"
              isActive={activeTab === 'simulator'}
              onPress={() => setActiveTab('simulator')}
              icon={<Calculator size={16} color={activeTab === 'simulator' ? '#0f766e' : '#4b5563'} />}
            />
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === 'statements' ? (
          <View className="px-5 pb-6">
            {/* <Text className="text-gray-800 font-bold text-lg mb-4">Recent Activity</Text> */}
            {statements.length > 0 ? statements.map((tx: any, idx) => (
              <View key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3 flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-900 font-bold mb-1">{tx.description || 'Deposit'}</Text>
                  <Text className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>
                <View className="items-end">
                  <Text style={{ fontFamily: monoFont }} className="text-emerald-600 font-bold text-base">+{displayAmount(Number(tx.amount))} {isKES ? 'KES' : 'USDC'}</Text>
                </View>
              </View>
            )) : (
              <View className="bg-white rounded-2xl p-6 items-center shadow-sm border border-gray-100">
                <FileText size={32} color="#9ca3af" className="mb-3" />
                <Text className="text-gray-500 font-medium">No statements yet.</Text>
              </View>
            )}
          </View>
        ) : (
          <View className="px-5 pb-6">
            <View className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Calculator size={18} color="#10b981" />
                  <Text className="text-lg font-bold text-gray-900 ml-2">
                    Yield Simulator
                  </Text>
                </View>
                <View className="bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                  <Text className="text-emerald-700 font-bold text-xs">{APY.toFixed(2)}% APY</Text>
                </View>
              </View>

              {/* Amount Input */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-500 mb-2">I want to save ({isKES ? 'KES' : 'USDC'})</Text>
                <View className="bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-4">
                  <Text className="text-gray-500 font-bold text-lg">{isKES ? 'KSh' : '$'}</Text>
                  <TextInput
                    value={simAmount}
                    onChangeText={setSimAmount}
                    keyboardType="numeric"
                    className="flex-1 py-3 px-2 text-lg font-bold text-gray-900"
                    placeholder="1000"
                  />
                </View>
              </View>

              {/* Period Selector (Dropdown trigger) */}
              <View className="mb-5 relative">
                <Text className="text-xs font-semibold text-gray-500 mb-2">Over a period of</Text>
                <TouchableOpacity
                  onPress={() => setShowDropdown(true)}
                  activeOpacity={0.7}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
                >
                  <Text className="text-base font-bold text-gray-900">
                    {renderPeriodText(simPeriod)}
                  </Text>
                  <ChevronDown size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Results */}
              <View className="bg-downy-50 rounded-2xl p-4 border border-downy-100">
                <View className="flex-row justify-between items-end mb-3">
                  <Text className="text-sm font-medium text-downy-900">Projected Interest</Text>
                  <Text style={{ fontFamily: monoFont }} className="text-lg font-extrabold text-emerald-600">
                    +{isKES ? 'KSh ' : '$'}{isKES ? formatCurrency(projectedYield) : projectedYield.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-end pt-3 border-t border-downy-200">
                  <Text className="text-sm font-bold text-downy-900">Total Balance</Text>
                  <Text style={{ fontFamily: monoFont }} className="text-lg font-extrabold text-downy-900">
                    {isKES ? 'KSh ' : '$'}{isKES ? formatCurrency(totalProjected) : totalProjected.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mt-4">
                <Info size={12} color="#9ca3af" />
                <Text className="text-[10px] text-gray-400 ml-1.5 flex-1">
                  Projections are estimates based on the current variable rate of {APY.toFixed(2)}% APY and are not guaranteed.
                </Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Dropdown Modal for Period Selection */}
      <Modal visible={showDropdown} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowDropdown(false)} 
          />
          <View className="bg-white rounded-t-3xl max-h-[60%] w-full shadow-2xl">
            <View className="p-5 border-b border-gray-100 flex-row justify-between items-center bg-white rounded-t-3xl">
              <Text className="text-lg font-bold text-gray-900">Select Period</Text>
              <TouchableOpacity onPress={() => setShowDropdown(false)} className="px-2 py-1">
                <Text className="text-downy-700 font-bold text-base">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="px-4 py-2" showsVerticalScrollIndicator={false}>
              {Array.from({ length: 36 }, (_, i) => i + 1).map((months) => (
                <TouchableOpacity
                  key={months}
                  onPress={() => {
                    setSimPeriod(months);
                    setShowDropdown(false);
                  }}
                  className={`py-4 px-4 rounded-xl mb-1 flex-row justify-between items-center ${simPeriod === months ? 'bg-downy-50' : ''}`}
                >
                  <Text className={`text-base ${simPeriod === months ? 'font-bold text-downy-800' : 'text-gray-700 font-medium'}`}>
                    {renderPeriodText(months)}
                  </Text>
                  {simPeriod === months && <View className="w-2.5 h-2.5 rounded-full bg-downy-600" />}
                </TouchableOpacity>
              ))}
              <View className="h-10" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MoonwellDepositModal
        visible={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={(data) => {
          setShowDepositModal(false);
          // Handle success (e.g. reload balance or show toast)
        }}
      />

      <MoonwellWithdrawModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        availableBalance={MOCK_USER_BALANCE}
        onSuccess={(data) => {
          setShowWithdrawModal(false);
          // Handle success (e.g. reload balance or show toast)
        }}
      />
    </View>
  );
}
