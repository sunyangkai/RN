// 测试用的新版本bundle
const React = require('react');
const { View, Text, Button } = require('react-native');

function App() {
  return (
    <View>
      <Text>Hello World</Text>
      <Text>Version 2.0</Text>
      <Button title="Click me" onPress={() => alert('Hello!')} />
    </View>
  );
}

module.exports = App;