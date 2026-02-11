const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_URL = 'https://openrouter.ai/api/v1';

async function chatCompletion({ model, messages, temperature = 0.3, timeoutMs = 30000 }) {
  if (!OPENROUTER_API_KEY) return null; // AI features disabled

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://valle-vista-commons.up.railway.app',
        'X-Title': 'Valle Vista Commons',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chatCompletion };
