
// React Native Bundle - Version 2.0
import React from 'react';
import { View, Text, Button } from 'react-native';

function HomeScreen() {
  const handlePress = () => {
    console.log('Button pressed!');
  };
  
  return (
    <View>
      <Text>Welcome to My Amazing App</Text>
      <Text>Version: 2.0</Text>
      <Button title="Click Me" onPress={handlePress} />
    </View>
  );
}

function AboutScreen() {
  return (
    <View>
      <Text>About Our Company</Text>
      <Text>Contact: info@example.com</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View>
      <Text>User Profile</Text>
    </View>
  );
}

export { HomeScreen, AboutScreen, ProfileScreen };
