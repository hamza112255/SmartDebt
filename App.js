import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View, ActivityIndicator, Alert } from 'react-native';
import * as Font from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { realm, getAllObjects, initializeRealm } from './src/realm';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
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
          tabBarLabel: 'Settings',
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
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
          tabBarLabel: 'Calendar',
          tabBarLabelStyle: { fontFamily: 'Sora-Regular' },
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Alerts',
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

export default function App() {
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
          Alert.alert('Incorrect PIN', 'Please try again.');
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
      Alert.alert('Error', `Failed to authenticate PIN: ${error.message}`);
    }
  };

  const handleEmergencyReset = async () => {
    Alert.alert(
      'Emergency Reset',
      'This will disable PIN protection and clear the PIN. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
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
            Alert.alert('Success', 'PIN protection has been disabled');
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

        setInitialRoute(hasUser ? 'MainTabs' : screens.CreateProfile);
      } catch (error) {
        setInitialRoute('MainTabs');
        setFontsLoaded(true);
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

  if (!fontsLoaded || !initialRoute) {
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
              <NavigationContainer ref={navigationRef}>
                <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
                  <Stack.Screen name={screens.Login} component={LoginScreen} />
                  <Stack.Screen name={screens.Signup} component={SignupScreen} />
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
                      headerTitle: route.params?.accountName || 'Account Details'
                    })}
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
            </BiometricContext.Provider>
          </SafeAreaView>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}