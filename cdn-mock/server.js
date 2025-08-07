const express = require('express');
const path = require('path');
const app = express();

const PORT = 3000;

// 设置静态文件托管目录
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`CDN静态资源服务器已启动: http://localhost:${PORT}`);
});
