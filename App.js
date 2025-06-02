import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // You may need to install this

import LoginScreen from './src/screens/loginScreen';
import SignupScreen from './src/screens/signupScreen';
import DashboardScreen from './src/screens/dashboardScreen';
import CalendarScreen from './src/screens/calendarScreen';
import ProfileScreen from './src/screens/profileScreen'; // You'll need to create this

import CustomDrawer from './src/components/customDrawer'; // UI only
import AddAccountScreen from './src/screens/addNewAccountScreen';
import { screens } from './src/constant/screens';
import NewContactScreen from './src/screens/addNewContactScreen';
import NewRecordScreen from './src/screens/addNewRecordScreen';
import ReportScreen from './src/screens/reportScreen';
import SettingsScreen from './src/screens/settingsScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator nested inside Drawer
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Calendar') {
            iconName = 'calendar-today';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Drawer Navigator containing the Tab Navigator
function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="MainTabs"
      drawerContent={props => <CustomDrawer {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ drawerLabel: 'Home' }}
      />
      {/* You can add other drawer-only screens here if needed */}
      <Drawer.Screen
        name={screens.Reports}
        component={ReportScreen}
        options={{ drawerLabel: 'Reports' }}
      />
      <Drawer.Screen
        name={screens.Settings}
        component={SettingsScreen}
        options={{ drawerLabel: 'Settings' }}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  // Simulated auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // You can add authentication check logic here
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
                <Stack.Screen name="AppDrawer" options={{ headerShown: false }}>
                  {props => <AppDrawer {...props} onLogout={handleLogout} />}
                </Stack.Screen>
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </PaperProvider>
  );
}