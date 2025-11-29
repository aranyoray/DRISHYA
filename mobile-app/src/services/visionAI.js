import axios from 'axios';
import { API_CONFIG, FEATURES } from '../constants/config';

/**
 * Vision AI Service
 * Handles image analysis using OpenAI's GPT-4 Vision API
 */

class VisionAIService {
  constructor() {
    this.apiKey = API_CONFIG.OPENAI_API_KEY;
    this.apiUrl = API_CONFIG.OPENAI_API_URL;
    this.model = API_CONFIG.OPENAI_MODEL;
  }

  /**
   * Analyze an image with a specific prompt
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<string>} - AI description
   */
  async analyzeImage(imageBase64, prompt) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 15000, // 15 second timeout
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Vision AI Error:', error);
      throw new Error('Failed to analyze image: ' + error.message);
    }
  }

  /**
   * Get complete scene description
   */
  async describeScene(imageBase64) {
    return this.analyzeImage(imageBase64, FEATURES.SCENE_DESCRIPTION.prompt);
  }

  /**
   * Detect obstacles in the scene
   */
  async detectObstacles(imageBase64) {
    return this.analyzeImage(imageBase64, FEATURES.OBSTACLE_DETECTION.prompt);
  }

  /**
   * Recognize and describe people
   */
  async recognizePeople(imageBase64) {
    return this.analyzeImage(imageBase64, FEATURES.FACIAL_RECOGNITION.prompt);
  }

  /**
   * Read text from the image
   */
  async readText(imageBase64) {
    return this.analyzeImage(imageBase64, FEATURES.TEXT_READING.prompt);
  }

  /**
   * Provide navigation assistance
   */
  async getNavigationGuidance(imageBase64) {
    return this.analyzeImage(imageBase64, FEATURES.NAVIGATION_ASSIST.prompt);
  }

  /**
   * Comprehensive analysis combining multiple features
   */
  async comprehensiveAnalysis(imageBase64) {
    const combinedPrompt = `
      Provide a comprehensive description for a visually impaired person:
      1. Overall scene description
      2. Any people present (position, expression, activity)
      3. Obstacles or hazards in the path
      4. Any visible text or signs
      5. Navigation guidance (path ahead, turns, steps)

      Be concise, clear, and prioritize safety-critical information.
    `;

    return this.analyzeImage(imageBase64, combinedPrompt);
  }
}

export default new VisionAIService();
