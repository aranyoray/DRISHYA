import axios from 'axios';
import { API_CONFIG } from '../constants/config';

const CONVERSATION_TIMEOUT = 15000;
const MAX_CONVERSATION_HISTORY = 10;

class ConversationalAIService {
  constructor() {
    this.conversationHistory = [];
    this.currentImage = null;
    this.sessionStartTime = null;
  }

  async startSession(imageBase64) {
    this.currentImage = imageBase64;
    this.sessionStartTime = Date.now();
    this.conversationHistory = [];

    const systemPrompt = {
      role: 'system',
      content: 'You are a helpful vision assistant for a visually impaired person. Provide concise, directional, and actionable responses. Include specific positions using clock directions (e.g., 10 o\'clock) and estimated distances in feet when relevant. Be brief but informative.'
    };

    this.conversationHistory.push(systemPrompt);

    return {
      success: true,
      sessionId: this.sessionStartTime
    };
  }

  async ask(question) {
    if (!this.currentImage) {
      throw new Error('No active vision session. Capture an image first.');
    }

    try {
      const userMessage = {
        role: 'user',
        content: [
          { type: 'text', text: question },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${this.currentImage}` }
          }
        ]
      };

      const messages = [...this.conversationHistory, userMessage];

      const response = await axios.post(
        API_CONFIG.OPENAI_API_URL,
        {
          model: API_CONFIG.OPENAI_MODEL,
          messages: messages,
          max_tokens: 300,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`
          },
          timeout: CONVERSATION_TIMEOUT
        }
      );

      const answer = response.data.choices[0].message.content;

      this.conversationHistory.push(
        { role: 'user', content: question },
        { role: 'assistant', content: answer }
      );

      if (this.conversationHistory.length > MAX_CONVERSATION_HISTORY) {
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
        ];
      }

      return {
        question,
        answer,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('[ConversationalAI] Query failed:', error.message);

      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      }

      throw new Error('Failed to process question');
    }
  }

  async quickQuery(imageBase64, question) {
    const tempImage = this.currentImage;
    await this.startSession(imageBase64);

    try {
      const result = await this.ask(question);
      return result.answer;
    } finally {
      this.currentImage = tempImage;
    }
  }

  updateImage(imageBase64) {
    this.currentImage = imageBase64;
    return { success: true };
  }

  getConversationHistory() {
    return this.conversationHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content[0].text,
        timestamp: msg.timestamp
      }));
  }

  clearHistory() {
    const systemPrompt = this.conversationHistory[0];
    this.conversationHistory = [systemPrompt];
    return { success: true };
  }

  endSession() {
    const duration = Date.now() - this.sessionStartTime;
    const messageCount = this.conversationHistory.length - 1;

    this.conversationHistory = [];
    this.currentImage = null;
    this.sessionStartTime = null;

    return {
      duration,
      messageCount,
      success: true
    };
  }

  isSessionActive() {
    return this.currentImage !== null && this.sessionStartTime !== null;
  }
}

export default new ConversationalAIService();
