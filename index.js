const express = require('express');
const axios = require('axios');
const compression = require('compression');

const app = express();

// Сжатие ВКЛЮЧЕНО (экономит трафик Render -> Android)
// Но оно применяется только к ответу, который уходит в приложение
app.use(compression());

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
            return res.status(403).send('');
        }

        // Используем самый простой axios запрос (как в 1-м варианте)
        // Не добавляем Accept-Encoding вручную, чтобы не спровоцировать "br" (Brotli)
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 Proxy-Service' },
            responseType: 'text' 
        });

        // Пробрасываем только Content-Type
        res.set('Content-Type', response.headers['content-type']);
        
        // Express + compression сами решат, сжимать ли данные для OkHttp
        res.send(response.data);

    } catch (error) {
        res.status(500).send(`Proxy Error: ${error.message}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable Proxy with Compression running`));
