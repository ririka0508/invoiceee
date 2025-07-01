const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Test Server Running!</h1>');
});

const PORT = 8080;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Test server running at http://127.0.0.1:${PORT}`);
});