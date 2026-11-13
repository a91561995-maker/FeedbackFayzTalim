require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const { BOT_TOKEN, CHAT_ID } = process.env;

// Предупреждение в консоли, если переменные не заданы
if (!BOT_TOKEN || !CHAT_ID) {
  console.warn('⚠️ ВНИМАНИЕ: В окружении не заданы BOT_TOKEN или CHAT_ID!');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Экранирование спецсимволов для HTML-разметки Telegram
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
}

app.post('/api/feedback', async (req, res) => {
  try {
    const { childName, rating, category, lang, comment } = req.body;

    if (!childName || !childName.trim() || !rating) {
      return res.status(400).json({ ok: false, error: 'Заполните имя ребенка и оценку.' });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Ошибка конфигурации сервера: не настроены параметры Telegram в переменных окружения.' 
      });
    }

    const stars = '⭐'.repeat(Number(rating)) + '☆'.repeat(5 - Number(rating));
    const safeName = escapeHtml(childName.trim());
    const safeCategory = escapeHtml(category || 'Отзыв');
    const safeComment = comment && comment.trim()
      ? escapeHtml(comment.trim())
      : '<i>Без комментария / Izoh yozilmagan</i>';

    const message = [
      `🎓 <b>Новый отзыв после презентации — FAYZ TA’LIM</b>`,
      ``,
      `👶 <b>Ребенок / Bola:</b> ${safeName}`,
      `📊 <b>Оценка дня / Baho:</b> ${stars} (${rating}/5)`,
      `🏷 <b>Тип / Turi:</b> ${safeCategory}`,
      `🌐 <b>Язык формы / Til:</b> ${escapeHtml(lang || 'UZ')}`,
      `💬 <b>Сообщение / Xabar:</b>\n${safeComment}`
    ].join('\n');

    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      console.error('❌ Ошибка Telegram API:', tgData);
      
      let errorDesc = 'Ошибка отправки в Telegram.';
      if (tgData.error_code === 400 && tgData.description.includes('chat not found')) {
        errorDesc = 'Чат не найден. Убедитесь, что вы написали боту /start или добавили его в группу как администратора, а также верно указали CHAT_ID.';
      } else if (tgData.error_code === 401) {
        errorDesc = 'Неверный BOT_TOKEN. Проверьте токен от BotFather.';
      }

      return res.status(502).json({ ok: false, error: errorDesc });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера.' });
  }
});

// Адаптация для локального запуска и для Vercel Serverless
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
  });
}

module.exports = app;