import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from './src/screens/loginScreen';
import SignupScreen from './src/screens/signupScreen';
import DashboardScreen from './src/screens/dashboardScreen';
import CalendarScreen from './src/screens/calendarScreen';
import ProfileScreen from './src/screens/profileScreen';
import AddAccountScreen from './src/screens/addNewAccountScreen';
import NewContactScreen from './src/screens/addNewContactScreen';
import NewRecordScreen from './src/screens/addNewRecordScreen';
import ReportScreen from './src/screens/reportScreen';
import SettingsScreen from './src/screens/settingsScreen';
import AccountDetailScreen from './src/screens/accountDetailsScreen';
import { screens } from './src/constant/screens';

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
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      })}
    >
      <Tab.Screen
        name="Reports"
        component={ReportScreen}
        options={{
          tabBarLabel: 'Reports',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendar',
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarLabelStyle: {
            color: '#64748b',
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          },
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
            fontWeight: 'bold',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Authentication check logic here
  }, []);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

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
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name={screens.Login}>
                  {props => <LoginScreen {...props} onLogin={handleLogin} />}
                </Stack.Screen>
                <Stack.Screen name={screens.Signup} component={SignupScreen} />
                <Stack.Screen
                  name={screens.NewAccount}
                  component={AddAccountScreen}
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
                <Stack.Screen name={screens.AccountDetails} component={AccountDetailScreen} />
                <Stack.Screen name="MainTabs" component={MainTabs} />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}