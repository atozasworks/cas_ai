/**
 * ============================================================
 * AI CONVERSATIONAL DRIVING ASSISTANT
 * ============================================================
 *
 * Modular integration with OpenAI / Groq / DeepSeek.
 * Provides context-aware driving advice and safety insights.
 * ============================================================
 */

const config = require('../config');
const logger = require('../middleware/logger');

const SYSTEM_PROMPT = `You are CAS-AI, an intelligent driving safety assistant integrated into a real-time collision avoidance system. Your role:
- Provide clear, concise driving safety advice
- Explain risk alerts in plain language
- Suggest defensive driving techniques
- Answer questions about road safety
- Never encourage reckless driving
- Keep responses under 150 words for quick readability
- If given vehicle telemetry context, reference specific data points`;

function getProviderConfig() {
  const provider = config.ai.provider;
  const providers = {
    openai: {
      url: 'https://api.openai.com/v1/chat/completions',
      key: config.ai.openai.apiKey,
      model: 'gpt-4o-mini',
    },
    groq: {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: config.ai.groq.apiKey,
      model: 'llama-3.3-70b-versatile',
    },
    deepseek: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      key: config.ai.deepseek.apiKey,
      model: 'deepseek-chat',
    },
  };
  return providers[provider] || providers.groq;
}

async function chat(userMessage, drivingContext = null) {
  const providerCfg = getProviderConfig();

  if (!providerCfg.key) {
    return {
      response: generateOfflineResponse(userMessage, drivingContext),
      provider: 'offline',
    };
  }

  try {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (drivingContext) {
      messages.push({
        role: 'system',
        content: `Current driving context: Speed=${drivingContext.speed}km/h, ` +
          `Risk Level=${drivingContext.riskLevel || 'low'}, ` +
          `Nearby Vehicles=${drivingContext.nearbyCount || 0}, ` +
          `Road Type=${drivingContext.roadType || 'unknown'}`,
      });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(providerCfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerCfg.key}`,
      },
      body: JSON.stringify({
        model: providerCfg.model,
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      provider: config.ai.provider,
      model: providerCfg.model,
    };
  } catch (err) {
    logger.error('AI assistant API call failed:', err.message);
    return {
      response: generateOfflineResponse(userMessage, drivingContext),
      provider: 'offline',
      error: err.message,
    };
  }
}

function generateOfflineResponse(userMessage, context) {
  const lower = userMessage.toLowerCase();

  if (lower.includes('risk') || lower.includes('danger')) {
    if (context && context.riskLevel === 'high') {
      return 'Your current risk level is high. Reduce speed, increase following distance, and stay alert for nearby vehicles.';
    }
    return 'Monitor your surroundings, maintain safe following distance, and reduce speed in uncertain conditions.';
  }

  if (lower.includes('speed')) {
    if (context && context.speed > 100) {
      return `You are traveling at ${context.speed} km/h. Consider reducing speed, especially in areas with traffic.`;
    }
    return 'Always obey posted speed limits and adjust speed for road and weather conditions.';
  }

  if (lower.includes('brake') || lower.includes('stop')) {
    return 'When braking, apply pressure smoothly and progressively. Hard braking should be reserved for emergencies only.';
  }

  if (lower.includes('weather') || lower.includes('rain') || lower.includes('fog')) {
    return 'In poor weather: reduce speed by 30%, increase following distance to 4+ seconds, turn on headlights, and avoid sudden maneuvers.';
  }

  return 'Drive safely: maintain awareness, follow traffic rules, keep a safe following distance, and avoid distractions.';
}

module.exports = { chat, generateOfflineResponse };
