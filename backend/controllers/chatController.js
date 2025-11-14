const claudeService = require('../services/claudeService');

/**
 * Send a message to Claude and get a response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { messages, options } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      });
    }

    // Validate message format
    const validMessages = messages.every(msg =>
      msg.role && msg.content && ['user', 'assistant'].includes(msg.role)
    );

    if (!validMessages) {
      return res.status(400).json({
        error: 'Invalid message format. Each message must have role (user/assistant) and content.'
      });
    }

    const response = await claudeService.sendMessage(messages, options);

    if (response.success) {
      res.json({
        message: response.message,
        usage: response.usage
      });
    } else {
      res.status(500).json({
        error: 'Failed to get response from Claude',
        details: response.error
      });
    }
  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Stream responses from Claude
 */
exports.streamMessage = async (req, res) => {
  try {
    const { messages, options } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await claudeService.streamMessage(
      messages,
      (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);

        if (chunk.type === 'complete' || chunk.type === 'error') {
          res.end();
        }
      },
      options
    );
  } catch (error) {
    console.error('Stream controller error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
