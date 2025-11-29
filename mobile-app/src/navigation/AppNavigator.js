import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import EnhancedCameraScreen from '../screens/EnhancedCameraScreen';
import ConversationalScreen from '../screens/ConversationalScreen';
import EmotionAnalyticsScreen from '../screens/EmotionAnalyticsScreen';
import HardwareConnectionScreen from '../screens/HardwareConnectionScreen';
import ClinicalTrialScreen from '../screens/ClinicalTrialScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tab.Screen
        name="Vision"
        component={EnhancedCameraScreen}
        options={{
          tabBarLabel: 'Vision',
          tabBarAccessibilityLabel: 'Vision Assist camera tab',
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ConversationalScreen}
        options={{
          tabBarLabel: 'Ask AI',
          tabBarAccessibilityLabel: 'Conversational AI tab',
        }}
      />
      <Tab.Screen
        name="Emotions"
        component={EmotionAnalyticsScreen}
        options={{
          tabBarLabel: 'Emotions',
          tabBarAccessibilityLabel: 'Emotion analytics tab',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Hardware" component={HardwareConnectionScreen} />
        <Stack.Screen name="ClinicalTrial" component={ClinicalTrialScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
