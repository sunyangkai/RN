import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, TouchableOpacity  } from 'react-native';
import { navigate } from '../service/navivation';

const HomeScreen = () => {
  const goNetProcecss = () => {
    navigate('我的', {})
  }
  console.log('sdf123213sad');
  return (
    <View style={styles.container}>
       <ImageBackground 
         source={require('../assets/imgs/bg.png')}
         style={styles.background}
         resizeMode="contain" 
        >
          <Text style={styles.hello}>¡Hola, amigo!</Text>
          <Text style={styles.limit}>Su límite es</Text>
          <Text style={styles.num}>$ 4,000,000</Text>
          <TouchableOpacity onPress={goNetProcecss}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>Solicitar ahora tests实施</Text>
            </View>
          </TouchableOpacity>
        </ImageBackground >
        <Image resizeMode="contain"  style={styles.women} source={require('../assets/imgs/women.png')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    width: '100%',
    height: '100%'
  },
  background: {
    backgroundColor: '#1a5c4f',
    width: '100%', 
    aspectRatio: 375 / 392,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    paddingTop: 108,
  },
  hello: {
    fontSize: 24,
    fontWeight: 900,
    color: '#fff',
    paddingLeft: 24,
    lineHeight: 28,
  },
  limit: {
    fontSize: 14,
    fontWeight: 400,
    color: '#fff',
    opacity: 0.5,
    marginTop: 40,
    marginBottom: 10,
    paddingLeft: 24,
    lineHeight: 20,
  },
  num: {
    fontSize: 32,
    fontWeight: 700,
    paddingLeft: 24,
    color: '#fff',
    lineHeight: 42,
  },
  button: {
    height: 56,
    marginRight: 24,
    marginLeft: 24,
    marginTop: 56,
    borderColor: '#fff',
    borderWidth: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 80,
    zIndex:100,
    position: 'relative',
    backgroundColor: '#1a5c4f'
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
  },
  women: {
    width: '50%',
    aspectRatio: 2 / 3,
    position: 'absolute',
    right: 0,
    bottom: 214,
  }
});

export default HomeScreen;