import axios from 'axios';
import { API_CONFIG } from '../constants/config';
import audioService from './audioService';

const DETECTION_THRESHOLDS = {
  CRITICAL: 0.5,
  WARNING: 1.5,
  SAFE: 3.0
};

const OBSTACLE_TYPES = {
  VEHICLE: { priority: 'critical', vibrationPattern: [0, 200, 100, 200] },
  PERSON: { priority: 'high', vibrationPattern: [0, 150, 100, 150] },
  FURNITURE: { priority: 'medium', vibrationPattern: [0, 100] },
  STAIRS: { priority: 'critical', vibrationPattern: [0, 200, 100, 200, 100, 200] },
  CURB: { priority: 'high', vibrationPattern: [0, 150, 100, 150] },
  WALL: { priority: 'medium', vibrationPattern: [0, 100] },
  TRAFFIC_SIGNAL: { priority: 'critical', vibrationPattern: [0, 300] },
  WARNING_SIGN: { priority: 'critical', vibrationPattern: [0, 250, 100, 250] }
};

class ObstacleDetectionService {
  constructor() {
    this.lastDetection = null;
    this.detectionHistory = [];
    this.lowLightMode = false;
    this.priorityMode = false;
  }

  async detectObstacles(imageBase64, options = {}) {
    const {
      lowLight = false,
      priorityOnly = false,
      includeDistance = true
    } = options;

    try {
      const prompt = this.buildDetectionPrompt(lowLight, priorityOnly);

      const response = await axios.post(
        API_CONFIG.OPENAI_API_URL,
        {
          model: API_CONFIG.OPENAI_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }],
          max_tokens: 400,
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`
          },
          timeout: 12000
        }
      );

      const rawResponse = response.data.choices[0].message.content;
      const obstacles = this.parseObstacleResponse(rawResponse);

      this.lastDetection = {
        timestamp: Date.now(),
        obstacles,
        lowLight,
        priorityOnly
      };

      this.updateDetectionHistory(obstacles);

      return obstacles;

    } catch (error) {
      console.error('[ObstacleDetection] Detection failed:', error.message);
      throw new Error('Obstacle detection failed');
    }
  }

  buildDetectionPrompt(lowLight, priorityOnly) {
    let prompt = 'Analyze this image for obstacles. Return JSON array with format: [{"type": "vehicle/person/stairs/curb/furniture/wall/traffic_signal/warning_sign", "position": "left/center/right", "distance": "near/medium/far", "description": "brief description"}].';

    if (lowLight) {
      prompt += ' Image may be low-light or obscured. Focus on shapes, movement patterns, and high-contrast elements. Enhance detection sensitivity.';
    }

    if (priorityOnly) {
      prompt += ' PRIORITY MODE: Only report critical obstacles (vehicles, stairs, curbs, traffic signals, warning signs). Ignore furniture and minor objects.';
    }

    prompt += ' Be concise. Return only valid JSON array.';

    return prompt;
  }

  parseObstacleResponse(rawResponse) {
    try {
      const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const obstacles = JSON.parse(jsonMatch[0]);
      return obstacles.map(obs => ({
        type: obs.type || 'unknown',
        position: obs.position || 'unknown',
        distance: obs.distance || 'unknown',
        description: obs.description || '',
        priority: this.getObstaclePriority(obs.type),
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error('[ObstacleDetection] Parse error:', error.message);
      return [];
    }
  }

  getObstaclePriority(type) {
    const obstacleType = OBSTACLE_TYPES[type.toUpperCase()];
    return obstacleType ? obstacleType.priority : 'medium';
  }

  async announceObstacles(obstacles) {
    if (!obstacles || obstacles.length === 0) {
      return;
    }

    const criticalObstacles = obstacles.filter(o => o.priority === 'critical');
    const highObstacles = obstacles.filter(o => o.priority === 'high');

    if (criticalObstacles.length > 0) {
      const announcement = this.buildAnnouncement(criticalObstacles[0]);
      await audioService.speak(announcement, { priority: 'high', interrupt: true });
      this.triggerHapticWarning(criticalObstacles[0]);
    } else if (highObstacles.length > 0) {
      const announcement = this.buildAnnouncement(highObstacles[0]);
      await audioService.speak(announcement, { priority: 'high' });
      this.triggerHapticWarning(highObstacles[0]);
    }
  }

  buildAnnouncement(obstacle) {
    const directionMap = {
      left: 'on your left',
      right: 'on your right',
      center: 'directly ahead'
    };

    const distanceMap = {
      near: 'very close',
      medium: 'approaching',
      far: 'in the distance'
    };

    const direction = directionMap[obstacle.position] || obstacle.position;
    const distance = distanceMap[obstacle.distance] || obstacle.distance;

    if (obstacle.priority === 'critical') {
      return `Warning! ${obstacle.type} ${direction}, ${distance}`;
    }

    return `${obstacle.type} detected ${direction}, ${distance}`;
  }

  triggerHapticWarning(obstacle) {
    const obstacleType = OBSTACLE_TYPES[obstacle.type.toUpperCase()];
    if (obstacleType && obstacleType.vibrationPattern) {
      audioService.hapticCustomPattern(obstacleType.vibrationPattern);
    } else {
      audioService.hapticWarning(1.0);
    }
  }

  updateDetectionHistory(obstacles) {
    this.detectionHistory.push({
      timestamp: Date.now(),
      count: obstacles.length,
      critical: obstacles.filter(o => o.priority === 'critical').length
    });

    if (this.detectionHistory.length > 100) {
      this.detectionHistory.shift();
    }
  }

  setLowLightMode(enabled) {
    this.lowLightMode = enabled;
  }

  setPriorityMode(enabled) {
    this.priorityMode = enabled;
  }

  getDetectionStats() {
    const totalDetections = this.detectionHistory.reduce((sum, d) => sum + d.count, 0);
    const criticalDetections = this.detectionHistory.reduce((sum, d) => sum + d.critical, 0);

    return {
      total: totalDetections,
      critical: criticalDetections,
      average: this.detectionHistory.length > 0
        ? totalDetections / this.detectionHistory.length
        : 0
    };
  }
}

export default new ObstacleDetectionService();
