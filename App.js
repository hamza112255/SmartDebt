import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();
import 'react-native-reanimated';
import Realm from 'realm';
Realm.flags.THROW_ON_GLOBAL_REALM = true;
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View, ActivityIndicator, Alert, Text } from 'react-native';
import * as Font from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { realm, getAllObjects, initializeRealm } from './src/realm';
import { supabase, syncPendingChanges } from './src/supabase';
import { fetchAndStoreCodeLists } from './src/supabase';

import DashboardScreen from './src/screens/dashboardScreen';
import CalendarScreen from './src/screens/calendarScreen';
import ProfileScreen from './src/screens/profileScreen';
import AddAccountScreen from './src/screens/addNewAccountScreen';
import NewContactScreen from './src/screens/addNewContactScreen';
import NewRecordScreen from './src/screens/addNewRecordScreen';
import ReportScreen from './src/screens/reportScreen';
import SettingsScreen from './src/screens/settingsScreen';
import AccountDetailScreen from './src/screens/accountDetailsScreen';
import CreateProfileScreen from './src/screens/createProfile';
import { screens } from './src/constant/screens';
import LoginScreen from './src/screens/loginScreen';
import SignupScreen from './src/screens/signupScreen';
import ImportContactsScreen from './src/screens/ImportContactsScreen';
import BiometricModal from './src/components/BiometricModal';
import PinModal from './src/components/PinModal';
import BiometricContext from './src/contexts/BiometricContext';
import ReportDetailScreen from './src/screens/ReportDetailScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import i18n from './src/i18n'; // Import i18n
import { I18nextProvider, useTranslation } from 'react-i18next'; // Import I18nextProvider
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

import { DefaultTheme as PaperDefaultTheme } from 'react-native-paper';

const MyTheme = {
  ...PaperDefaultTheme,
  dark: false,
  colors: {
    ...PaperDefaultTheme.colors,
    background: '#ffffff',
    card: '#ffffff',
    text: '#1f2937',
    border: '#e5e7eb',
    primary: '#2563eb',
    notification: '#dc2626',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: 'normal' },
    medium: { fontFamily: 'System', fontWeight: 'normal' },
    light: { fontFamily: 'System', fontWeight: 'normal' },
    thin: { fontFamily: 'System', fontWeight: 'normal' },
  },
};

const Stack = createStackNavigator();

const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ['myapp://'],
};

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let iconSize = 24;

          if (route.name === 'Reports') {
            iconName = 'assessment';
          } else if (route.name === 'Calendar') {
            iconName = 'event';
          } else if (route.name === 'Dashboard') {
            iconName = 'home';
            iconSize = 28;
          } else if (route.name === 'Notifications') {
            iconName = 'notifications';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          if (route.name === 'Dashboard') {
            return (
              <View style={{
                backgroundColor: focused ? '#2563eb' : '#f1f5f9',
                borderRadius: 50,
                width: 60,
                height: 60,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -35,
                elevation: focused ? 8 : 4,
                shadowColor: '#2563eb',
                shadowOpacity: focused ? 0.3 : 0.1,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8,
                borderWidth: 3,
                borderColor: '#ffffff',
              }}>
                <Icon
                  name={iconName}
                  size={iconSize}
                  color={focused ? '#ffffff' : '#2563eb'}
                />
              </View>
            );
          }

          return <Icon name={iconName} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 10,
          paddingTop: 10,
          height: 75,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Sora-Regular',
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      })}
    >
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('navigation.tabs.settings'),
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportScreen}
        options={{
          tabBarLabel: t('navigation.tabs.reports'),
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('navigation.tabs.home'),
          tabBarLabelStyle: {
            fontFamily: 'Sora-Bold',
            color: '#64748b',
            fontSize: 11,
            marginTop: 2,
          },
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('navigation.tabs.calendar'),
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('navigation.tabs.alerts'),
          tabBarBadge: 3,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: 10,
            fontFamily: 'Sora-Bold',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
    </Tab.Navigator>
  );
}

function App({ currentLanguage }) {
  const { t } = useTranslation();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);
  const navigationRef = useRef(null);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [needsPinAuth, setNeedsPinAuth] = useState(false);
  const [storedPin, setStoredPin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [language, setLanguage] = useState(currentLanguage); // Default language
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  console.log('sync logs', realm.objects('SyncLog'))
  console.log('accounts', realm.objects('Account'))
  console.log('transactions', realm.objects('Transaction'))
  //clear Transaction from realm
  // realm.write(() => {
  //   realm.delete(realm.objects('SyncLog'));
  // });

  const updateBiometricState = (enabled) => {
    setIsBiometricEnabled(enabled);
    if (enabled && isBiometricEnrolled) {
      setNeedsAuth(true);
    } else {
      setNeedsAuth(false);
    }
  };

  const updatePinState = (enabled, pinCode = null) => {
    setIsPinEnabled(enabled);
    if (pinCode) {
      setStoredPin(pinCode);
    }
    if (enabled && (pinCode || storedPin)) {
      setNeedsPinAuth(!isAuthenticated);
    } else {
      setNeedsPinAuth(false);
    }
  };

  const handlePinAuthenticated = (pin) => {
    try {
      if (isPinEnabled && storedPin) {
        if (pin === storedPin) {
          setNeedsPinAuth(false);
          setIsAuthenticated(true);
          SecureStore.setItemAsync('lastAuthTime', Date.now().toString());
        } else {
          Alert.alert(t('pin.incorrectTitle'), t('pin.incorrectMessage'));
        }
      } else {
        const users = getAllObjects('User');
        if (users.length > 0) {
          realm.write(() => {
            users[0].pinEnabled = true;
            users[0].pinCode = pin;
            users[0].updatedOn = new Date();
          });
          setStoredPin(pin);
          setIsPinEnabled(true);
          setNeedsPinAuth(false);
          setIsAuthenticated(true);
          SecureStore.setItemAsync('lastAuthTime', Date.now().toString());
        } else {
          throw new Error('No user found to update PIN');
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), `${t('pin.authFailed')} ${error.message}`);
    }
  };

  const handleEmergencyReset = async () => {
    Alert.alert(
        t('pin.resetTitle'),
        t('pin.resetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'),
          style: 'destructive',
          onPress: async () => {
            setIsPinEnabled(false);
            setNeedsPinAuth(false);
            setStoredPin(null);
            setIsAuthenticated(false);

            const users = getAllObjects('User');
            if (users.length > 0) {
              realm.write(() => {
                users[0].pinEnabled = false;
                users[0].pinCode = '';
                users[0].updatedOn = new Date();
              });
            }

            await SecureStore.deleteItemAsync('pinEnabled');
            await SecureStore.deleteItemAsync('pinCode');
            Alert.alert(t('common.success'), t('pin.disabledMessage'));
          },
        },
      ]
    );
  };

  useEffect(() => {
    async function initializeApp() {
      try {
        const fontLoadPromise = Font.loadAsync({
          'Sora-Regular': require('./assets/fonts/Sora-Regular.ttf'),
          'Sora-SemiBold': require('./assets/fonts/Sora-SemiBold.ttf'),
          'Sora-Bold': require('./assets/fonts/Sora-Bold.ttf'),
        });

        const realmInitPromise = initializeRealm();
        await Promise.all([fontLoadPromise, realmInitPromise]);
        setFontsLoaded(true);

        const users = getAllObjects('User');
        const hasUser = users.length > 0;
        setHasUser(hasUser);

        const [
          pinEnabled,
          pinCode,
          biometricSupported,
          biometricEnrolled,
          biometricEnabled
        ] = await Promise.all([
          SecureStore.getItemAsync('pinEnabled'),
          SecureStore.getItemAsync('pinCode'),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          SecureStore.getItemAsync('biometricEnabled')
        ]);

        setIsPinEnabled(pinEnabled === 'true');
        setStoredPin(pinCode);
        setNeedsPinAuth(pinEnabled === 'true' && !isAuthenticated);

        setIsBiometricSupported(biometricSupported);
        setIsBiometricEnrolled(biometricEnrolled);
        setIsBiometricEnabled(biometricEnabled === 'true');

        if (biometricSupported && biometricEnrolled && biometricEnabled === 'true') {
          setNeedsAuth(true);
        }

        await fetchAndStoreCodeLists();

        setInitialRoute(hasUser ? 'MainTabs' : screens.CreateProfile);
      } catch (error) {
        setInitialRoute('MainTabs');
        setFontsLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }

    initializeApp();
  }, []);

  useEffect(() => {
    async function checkAuthTimeout() {
      if (!((isBiometricEnrolled && isBiometricEnabled) || (isPinEnabled && storedPin))) {
        return;
      }

      const lastAuthTime = await SecureStore.getItemAsync('lastAuthTime');
      const currentTime = Date.now();
      const thirtySeconds = 30 * 1000;

      if (!lastAuthTime || currentTime - parseInt(lastAuthTime) > thirtySeconds) {
        if (isBiometricEnrolled && isBiometricEnabled) {
          setNeedsAuth(true);
        }
        if (isPinEnabled && storedPin && !isAuthenticated) {
          setNeedsPinAuth(true);
        }
      }
    }

    const interval = setInterval(checkAuthTimeout, 5000);
    return () => clearInterval(interval);
  }, [isBiometricEnrolled, isBiometricEnabled, isPinEnabled, storedPin, isAuthenticated]);

  useEffect(() => {
    if (hasUser && initialRoute !== 'MainTabs') {
      setInitialRoute('MainTabs');
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }, [hasUser, initialRoute]);

  const handleAuthenticated = () => {
    setNeedsAuth(false);
    setIsAuthenticated(true);
    SecureStore.setItemAsync('lastAuthTime', Date.now().toString());
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // useEffect(() => {
  //   const checkConnectivityAndSync = async () => {
  //     const netInfoState = await NetInfo.fetch();
  //     console.log('netInfoState', netInfoState);
  //     if (netInfoState.isConnected) {
  //       try {
  //         const users = realm.objects('User');
  //         const syncLogs = realm.objects('SyncLog');
          
  //         if (users.length > 0 && users[0].userType === 'paid' && syncLogs.length > 0) {
  //           setSyncMessage('Preparing to sync...');
  //           setSyncProgress(0);
            
  //           const onProgress = ({ current, total, tableName }) => {
  //             const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  //             setSyncProgress(percentage);
  //             setSyncMessage(`Syncing ${tableName || 'records'} (${current}/${total})`);
  //           };
            
  //           const result = await syncPendingChanges(users[0].id, onProgress);
            
  //           if (result.total > 0) {
  //             setSyncMessage('Sync complete!');
  //             setSyncProgress(100);
  //           } else {
  //             setSyncMessage('Everything is up to date');
  //           }
  //         }
  //       } catch (error) {
  //         console.error('Sync error:', error);
  //         setSyncMessage('Sync failed');
  //       }
  //     }
  //   };

  //   checkConnectivityAndSync();
    
  //   const unsubscribe = NetInfo.addEventListener(checkConnectivityAndSync);
    
  //   return () => {
  //     unsubscribe();
  //   };
  // }, []);

  if (isLoading || !fontsLoaded || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <StatusBar
              barStyle="light-content"
              backgroundColor={'#2563eb'}
              hidden={false}
              translucent={true}
            />
            <BiometricContext.Provider value={{ updateBiometricState, updatePinState }}>
              <NavigationContainer theme={MyTheme} linking={linking} fallback={<ActivityIndicator />}>
                <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
                  <Stack.Screen name={screens.Login} component={LoginScreen} />
                  <Stack.Screen name={screens.Signup} component={SignupScreen} />
                  <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                  <Stack.Screen name="MainTabs" component={MainTabs} />
                  <Stack.Screen name={screens.CreateProfile} component={CreateProfileScreen} />
                  <Stack.Screen
                    name={screens.NewAccount}
                    component={AddAccountScreen}
                    options={{ presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name={screens.ImportContacts}
                    component={ImportContactsScreen}
                    options={{ presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name={screens.NewContact}
                    component={NewContactScreen}
                    options={{ presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name={screens.NewRecord}
                    component={NewRecordScreen}
                    options={{ presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name={screens.Reports}
                    component={ReportScreen}
                  />
                  <Stack.Screen
                    name={screens.Settings}
                    component={SettingsScreen}
                  />
                  <Stack.Screen
                    name={screens.AccountDetails}
                    component={AccountDetailScreen}
                    options={({ route }) => ({
                      headerTitle: route.params?.accountName || t('screens.accountDetails')
                    })}
                  />
                  <Stack.Screen
                    name={screens.ReportDetail}
                    component={ReportDetailScreen}
                  />
                  <Stack.Screen
                    name="PremiumScreen"
                    component={PremiumScreen}
                  />
                </Stack.Navigator>
              </NavigationContainer>
              <BiometricModal visible={needsAuth} onAuthenticated={handleAuthenticated} />
              <PinModal
                visible={needsPinAuth}
                onAuthenticated={handlePinAuthenticated}
                onCancel={() => {
                  if (!isPinEnabled) {
                    setNeedsPinAuth(false);
                  }
                }}
                title={isPinEnabled && storedPin ? 'Enter your PIN' : 'Create a new PIN'}
                showCancel={!isPinEnabled || !storedPin}
                onEmergencyReset={isPinEnabled && storedPin ? handleEmergencyReset : null}
                isPinCreationFlow={!isPinEnabled || !storedPin}
              />
              {syncProgress > 0 && (
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: '#2563eb',
                  padding: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#ffffff' }}>{syncMessage}</Text>
                  <View style={{
                    width: '100%',
                    height: 4,
                    backgroundColor: '#ffffff',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      width: `${syncProgress}%`,
                      height: 4,
                      backgroundColor: '#2563eb',
                    }} />
                  </View>
                </View>
              )}
            </BiometricContext.Provider>
          </SafeAreaView>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

function AppWrapper() {
  const [languageInitialized, setLanguageInitialized] = useState(false);
  
  // Add language state that can be updated from child components
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const users = getAllObjects('User');
        if (users.length > 0) {
          const userLanguage = users[0].language;
          if (userLanguage && userLanguage !== i18n.language) {
            await i18n.changeLanguage(userLanguage);
            setCurrentLanguage(userLanguage);
          }
        }
      } catch (error) {
        console.log('Error initializing language:', error);
      } finally {
        setLanguageInitialized(true);
      }
    };

    initializeLanguage();

    // Add listener for language changes
    i18n.on('languageChanged', (lng) => {
      setCurrentLanguage(lng);
    });

    return () => {
      i18n.off('languageChanged');
    };
  }, []);

  if (!languageInitialized) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <App currentLanguage={currentLanguage} />
    </I18nextProvider>
  );
}

export default AppWrapper;