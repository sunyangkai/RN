const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 启用CORS
app.use(cors());

// 静态文件服务 - 指向build目录
app.use(express.static(path.join(__dirname, 'build')));

// 明确的路由处理
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'manifest.json'));
});

app.get('/bundles/:version/:file', (req, res) => {
  const { version, file } = req.params;
  res.sendFile(path.join(__dirname, 'build', 'bundles', version, file));
});

app.get('/patches/:file', (req, res) => {
  const { file } = req.params;
  res.sendFile(path.join(__dirname, 'build', 'patches', file));
});

app.listen(PORT, () => {
  console.log(`🌐 测试服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 静态文件目录: ${path.join(__dirname, 'build')}`);
  console.log('');
  console.log('可用路径:');
  console.log(`  GET /manifest.json`);
  console.log(`  GET /bundles/:version/:file`);
  console.log(`  GET /patches/:file`);
});