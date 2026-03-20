const express = require('express');
const axios = require('axios');
const compression = require('compression');

const app = express();

// Оставляем сжатие только на выходе к клиенту (безопасно)
app.use(compression());

const WHITELIST = process.env.WHITELIST ? process.env.WHITELIST.split(',').map(d => d.trim()) : [];

app.get('/:protocol//:url(*)', async (req, res) => {
    // Собираем URL точно так же, как в первом (рабочем) варианте
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

        // Возвращаемся к стандартному методу запроса из первого варианта
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 Proxy-Service' },
            responseType: 'text' // Это самый стабильный вариант для HTML
        });

        res.set('Content-Type', response.headers['content-type']);
        res.send(response.data);

    } catch (error) {
        res.status(500).send(``);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable Proxy running on port ${PORT}`));
