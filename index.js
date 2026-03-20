const express = require('express');
const axios = require('axios');
const compression = require('compression');

const app = express();

// Настраиваем сжатие более строго для совместимости с Android 15
app.use(compression({
    level: 6,           // Средний уровень сжатия (баланс скорости и размера)
    threshold: 1024,    // Не сжимать ответы меньше 1 КБ
    filter: (req, res) => {
        // Сжимаем только текст, html и json
        const contentType = res.getHeader('Content-Type');
        if (contentType && (contentType.includes('text') || contentType.includes('json'))) {
            return true;
        }
        return false;
    }
}));

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

        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 Proxy-Service' },
            responseType: 'text'
        });

        // Важно: берем только тип контента, не копируем все заголовки подряд
        res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');
        
        // Отправляем данные. Middleware 'compression' перехватит их и сожмет.
        res.send(response.data);

    } catch (error) {
        res.status(500).send(``);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy with safe compression running`));
