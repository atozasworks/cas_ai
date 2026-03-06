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

/**
 * Analyze map and location with Groq AI to produce a short, correct popup recommendation.
 * Supports zone context (school, hospital, junction) for driving-friendly messages.
 * @param {Object} ctx - { ownVehicle, closestVehicle, decision, roadType, trafficDensity, zoneType, zoneLabel }
 * @returns {Promise<string>} One short sentence for the driver.
 */
async function analyzeMapAndLocationForPopup(ctx) {
  const providerCfg = getProviderConfig();
  const {
    ownVehicle = {}, closestVehicle = {}, decision = {},
    roadType = 'unknown', trafficDensity = 'unknown',
    zoneType = null, zoneLabel = null,
  } = ctx;

  const fallback = () => {
    if (zoneLabel) return `${zoneLabel} — Reduce speed and drive carefully.`;
    const dir = decision.escapePath?.safestDirection;
    const dirLabel = dir ? (dir === 'left' ? 'Left' : dir === 'right' ? 'Right' : dir === 'front' ? 'Ahead' : 'Behind') : '';
    if (decision.actionLabel) return `${decision.actionLabel}${dirLabel ? ` — move toward ${dirLabel} side.` : ''}`;
    return dirLabel ? `Move your vehicle to the ${dirLabel} side to stay safe.` : 'Reduce speed and stay alert.';
  };

  if (!providerCfg.key) return fallback();

  const zoneLine = (zoneType && zoneLabel) ? `- Current zone: ${zoneLabel}. Mention this in your message.` : '';
  const userContent = [
    'Map and location context for a real-time collision avoidance popup:',
    `- Your vehicle: speed ${ownVehicle.speed ?? 0} km/h, heading ${ownVehicle.heading ?? 0}°.`,
    `- Nearby vehicle: ${closestVehicle.distance != null ? `${Math.round(closestVehicle.distance)} m` : 'close'}, direction: ${closestVehicle.direction ?? 'nearby'}.`,
    `- Recommended action: ${decision.actionLabel ?? 'maintain_speed'}. Safest direction: ${decision.escapePath?.safestDirection ?? 'unknown'}.`,
    `- Road: ${roadType}, traffic: ${trafficDensity}.`,
    zoneLine,
    'Reply with exactly ONE short sentence (under 100 characters) telling the driver what to do. If there is a zone (school/hospital/junction), start with that (e.g. "School zone — reduce speed."). Be specific. No quotes, no preamble.',
  ].filter(Boolean).join('\n');

  const systemPrompt = 'You are a driving safety assistant. Given real-time map and location data (and optional zone: school, hospital, junction), output only one brief, clear, driving-friendly instruction. No explanation, no bullet points.';

  try {
    const response = await fetch(providerCfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerCfg.key}`,
      },
      body: JSON.stringify({
        model: providerCfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 120,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq API returned ${response.status}`);

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    if (text.length > 0 && text.length <= 200) return text;
    return fallback();
  } catch (err) {
    logger.warn('AI popup analysis failed, using fallback:', err.message);
    return fallback();
  }
}

/**
 * Get a driving-friendly AI message for zone-only alert (school, hospital, junction).
 * Map and GPS are analyzed to produce the correct message.
 * @param {Object} ctx - { zoneType, zoneLabel, speed, roadType, trafficDensity }
 * @returns {Promise<string>}
 */
async function getZoneAlertMessage(ctx) {
  const providerCfg = getProviderConfig();
  const { zoneType, zoneLabel, speed = 0, roadType = 'unknown', trafficDensity = 'unknown' } = ctx;

  const fallback = () => {
    if (zoneType === 'school') return 'School zone — Reduce speed and watch for children.';
    if (zoneType === 'hospital') return 'Hospital zone — Drive quietly and yield to ambulances.';
    if (zoneType === 'junction') return 'Junction ahead — Slow down and check both sides.';
    return `${zoneLabel || 'Caution'} — Reduce speed and drive carefully.`;
  };

  if (!providerCfg.key || !zoneLabel) return fallback();

  const userContent = [
    `Driver is entering/near: ${zoneLabel}. GPS and map context:`,
    `- Speed: ${speed} km/h. Road: ${roadType}. Traffic: ${trafficDensity}.`,
    'Reply with exactly ONE short, driving-friendly sentence (under 80 characters) for a popup. Start with the zone name (e.g. "School zone — reduce speed."). No quotes.',
  ].join('\n');

  const systemPrompt = 'You are a driving safety assistant. Output only one brief, friendly message for the driver. No explanation.';

  try {
    const response = await fetch(providerCfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerCfg.key}`,
      },
      body: JSON.stringify({
        model: providerCfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    if (text.length > 0 && text.length <= 200) return text;
    return fallback();
  } catch (err) {
    logger.warn('AI zone message failed:', err.message);
    return fallback();
  }
}

module.exports = { chat, generateOfflineResponse, analyzeMapAndLocationForPopup, getZoneAlertMessage };
