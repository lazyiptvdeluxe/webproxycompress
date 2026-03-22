const express = require('express');
const axios = require('axios');
const compression = require('compression');   // ← НОВОЕ

const app = express();

// Включаем сжатие (gzip) для ВСЕХ ответов
app.use(compression({
    threshold: 512,        // сжимаем только если > 512 байт
    level: 6               // баланс скорость/сжатие (можно 9 для максимального)
}));

// Читаем список разрешенных доменов
const WHITELIST = process.env.WHITELIST ? process.env.WHITELIST.split(',').map(d => d.trim()) : [];

app.get('/:protocol//:url(*)', async (req, res) => {
    const targetUrl = `${req.params.protocol}//${req.params.url}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    try {
        const parsedUrl = new URL(targetUrl);
        const targetHostname = parsedUrl.hostname;

        const isAllowed = WHITELIST.some(allowedDomain => 
            targetHostname === allowedDomain || targetHostname.endsWith(`.${allowedDomain}`)
        );

        if (!isAllowed) {
            return res.status(403).send('E');
        }

        // Запрашиваем сжатые данные от целевого сервера
        const response = await axios.get(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Encoding': 'gzip, deflate, br'   // ← НОВОЕ
            },
            responseType: 'text'
        });

        res.set('Content-Type', response.headers['content-type']);
        
        // compression middleware автоматически добавит Content-Encoding: gzip
        res.send(response.data);

    } catch (error) {
        res.status(500).send(`E`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT} with gzip compression`));
