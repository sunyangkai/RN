
// React Native Bundle - Version 1.0
import React from 'react';
import { View, Text } from 'react-native';

function HomeScreen() {
  return (
    <View>
      <Text>Welcome to My App</Text>
      <Text>Version: 1.0</Text>
    </View>
  );
}

function AboutScreen() {
  return (
    <View>
      <Text>About Page</Text>
    </View>
  );
}

export { HomeScreen, AboutScreen };
