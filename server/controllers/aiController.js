const aiAssistant = require('../services/aiAssistantService');
const { asyncHandler } = require('../middleware/errorHandler');

exports.chatWithAssistant = asyncHandler(async (req, res) => {
  const { message, drivingContext } = req.body;

  const result = await aiAssistant.chat(message, drivingContext);

  res.json({
    success: true,
    reply: result.response,
    provider: result.provider,
    model: result.model,
  });
});
