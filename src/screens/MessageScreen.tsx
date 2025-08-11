import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BridgeDemo from '../components/BridgeDemo';

const MessagesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>消息页面</Text>
      <BridgeDemo />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8f8f8'
  },
});

export default MessagesScreen;