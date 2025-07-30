import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // 使用 expo 图标库

import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/MessageScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const renderTabBarIcon = (routeName: string) => 
    ({ focused, color, size }: {focused: boolean; color: string; size: number}) => {
    let iconName = 'ios-home';

    switch (routeName) {
        case '首页':
        iconName = focused ? 'home' : 'home-outline';
        break;
        case '设置':
        iconName = focused ? 'settings' : 'settings-outline';
        break;
        case '个人资料':
        iconName = focused ? 'person' : 'person-outline';
        break;
        default:
        iconName = focused ? 'home' : 'home-outline';
    }

    return <Ionicons name={iconName as any} size={size} color={color} />;
}

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: renderTabBarIcon(route.name),
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="首页" component={HomeScreen} />
      <Tab.Screen name="设置" component={SettingsScreen} />
      <Tab.Screen name="个人资料" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;