const HTTP = require('http');
const URL = require('url').URL;
const PORT = 3000;

const SERVER = HTTP.createServer((req, res) => {
  let method = req.method;
  let path = req.url;
  let params = new URL(path, `http://localhost:${PORT}`).searchParams;

  const generateRandomNumber = (max) => Math.floor((Math.random() * max) + 1);

  if (path === '/favicon.ico') {
    res.statusCode = 404;
    res.end();
  }

  else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.write(`${method} ${path}\n`);
    
    for (let roll = 0; roll < Number(params.get('rolls')); roll += 1) {
      res.write(`${generateRandomNumber(Number(params.get('sides')))}\n`);
    }
    res.end();
  }
});

SERVER.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});