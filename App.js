import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
import { getAllObjects } from './src/realm';
import ImportContactsScreen from './src/screens/ImportContactsScreen';
import BiometricModal from './src/components/BiometricModal';

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

  useEffect(() => {
    async function initializeApp() {
      console.log('Initializing app...');
      try {
        await Font.loadAsync({
          'Sora-Regular': require('./assets/fonts/Sora-Regular.ttf'),
          'Sora-Bold': require('./assets/fonts/Sora-Bold.ttf'),
          'Sora-SemiBold': require('./assets/fonts/Sora-SemiBold.ttf'),
          'Sora-ExtraBold': require('./assets/fonts/Sora-ExtraBold.ttf'),
          'Sora-Light': require('./assets/fonts/Sora-Light.ttf'),
          'Sora-ExtraLight': require('./assets/fonts/Sora-ExtraLight.ttf'),
        });
        setFontsLoaded(true);
        console.log('Fonts loaded');
      } catch (error) {
        console.error('Error loading fonts:', error);
      }

      try {
        const users = getAllObjects('User');
        setHasUser(users.length > 0);
        if (users.length > 0) {
          const user = users[0];
          const biometricEnabled = user.biometricEnabled ?? false;
          console.log('User found, biometricEnabled:', biometricEnabled);
          setIsBiometricEnabled(biometricEnabled);

          const compatible = await LocalAuthentication.hasHardwareAsync();
          setIsBiometricSupported(compatible);
          console.log('Biometric hardware available:', compatible);

          if (compatible) {
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricEnrolled(enrolled);
            console.log('Biometric enrolled:', enrolled);

            if (biometricEnabled && enrolled) {
              console.log('Setting needsAuth to true due to biometricEnabled and enrolled');
              setNeedsAuth(true);
            }
          }
        } else {
          console.log('No user found, setting initial route to CreateProfile');
          setInitialRoute(screens.CreateProfile);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    }

    initializeApp();
  }, []);

  useEffect(() => {
    async function checkAuthTimeout() {
      if (!isBiometricEnrolled || !isBiometricEnabled) {
        console.log('Skipping auth timeout check: biometric not enrolled or disabled');
        return;
      }

      const lastAuthTime = await SecureStore.getItemAsync('lastAuthTime');
      const currentTime = Date.now();
      const thirtySeconds = 30 * 1000;

      if (!lastAuthTime || currentTime - parseInt(lastAuthTime) > thirtySeconds) {
        console.log('Auth timeout exceeded, requiring re-authentication');
        setNeedsAuth(true);
      } else {
        console.log('Auth still valid:', currentTime - parseInt(lastAuthTime), 'ms since last auth');
      }
    }

    const interval = setInterval(checkAuthTimeout, 5000);
    return () => clearInterval(interval);
  }, [isBiometricEnrolled, isBiometricEnabled]);

  useEffect(() => {
    if (hasUser && initialRoute !== 'MainTabs') {
      console.log('Setting initial route to MainTabs');
      setInitialRoute('MainTabs');
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }, [hasUser, initialRoute]);

  const handleAuthenticated = () => {
    console.log('Authentication successful, resetting needsAuth');
    setNeedsAuth(false);
  };

  if (!fontsLoaded || !initialRoute) {
    console.log('Waiting for fonts or initial route...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  console.log('Rendering app, needsAuth:', needsAuth, 'isBiometricSupported:', isBiometricSupported, 'isBiometricEnrolled:', isBiometricEnrolled);

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <StatusBar
              barStyle="light-content"
              backgroundColor={'#2563eb'}
              hidden={false}
              translucent={true}
            />
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
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}