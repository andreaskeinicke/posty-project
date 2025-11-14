const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// POST /api/chat - Send message to Claude
router.post('/', chatController.sendMessage);

// POST /api/chat/stream - Stream responses from Claude
router.post('/stream', chatController.streamMessage);

module.exports = router;
