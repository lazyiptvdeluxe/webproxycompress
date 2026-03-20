const express = require('express');
const axios = require('axios');
const compression = require('compression');

const app = express();

// 1. Включаем Gzip/Brotli сжатие (уменьшает размер текста в 3-5 раз)
app.use(compression());

// Читаем список разрешенных доменов из переменной окружения
const WHITELIST = process.env.WHITELIST ? process.env.WHITELIST.split(',').map(d => d.trim()) : [];

app.get('/:protocol//:url(*)', async (req, res) => {
    // Формируем полный целевой URL, включая query-параметры (?param=1)
    const targetUrl = `${req.params.protocol}//${req.params.url}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    try {
        const parsedUrl = new URL(targetUrl);
        const targetHostname = parsedUrl.hostname;

        // Проверка: разрешен ли домен (включая проверку поддоменов)
        const isAllowed = WHITELIST.some(allowedDomain => 
            targetHostname === allowedDomain || targetHostname.endsWith(`.${allowedDomain}`)
        );

        if (!isAllowed) {
            return res.status(403).send('');
        }

        // 2. Делаем запрос к целевому ресурсу
        const response = await axios.get(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 Proxy-Service',
                'Accept-Encoding': 'gzip, deflate, br' // Запрашиваем сжатый контент у источника
            },
            responseType: 'arraybuffer', // Работаем с буфером для корректной передачи любых данных
            maxContentLength: 10 * 1024 * 1024, // Ограничение 10 МБ, чтобы не качать гигантов
            timeout: 10000 // Таймаут 10 секунд
        });

        // Пробрасываем оригинальный Content-Type (html, json, xml и т.д.)
        const contentType = response.headers['content-type'];
        res.set('Content-Type', contentType);
        
        // Отправляем полученные данные
        res.send(response.data);

    } catch (error) {
        if (error.response) {
            // Если целевой сайт вернул ошибку (напр. 404), пробрасываем её статус
            res.status(error.response.status).send(``);
        } else {
            res.status(500).send(``);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy (No-Cache) running on port ${PORT}`));
