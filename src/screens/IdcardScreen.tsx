import React from 'react';
import { View, Text, StyleSheet, Image  } from 'react-native';

const IdcardScreen = () => {
  return (
    <View style={styles.container}>
        <View style={styles.stepContainer}>
          <Image resizeMode="contain"  style={styles.step} source={require('../assets/icons/step1.png')} />
          <View style={styles.process} />
          <Image resizeMode="contain"  style={styles.step} source={require('../assets/icons/step2.png')} />
          <View style={styles.process} />
          <Image resizeMode="contain"  style={styles.step} source={require('../assets/icons/step3.png')} />
          <View style={styles.process} />
        </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    width: '100%',
    height: '100%'
  },
  stepContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  process: {
    height: 6,
    borderRadius: 40,
    backgroundColor: '#1A5C4F',
    width: '16%',
  },
  processComplete: {
    height: 6,
    borderRadius: 40,
    backgroundColor: '#FAFAFC',
    width: '16%',
  },
  step: {
    width: 24,
    height: 24,
  }
});

export default IdcardScreen;