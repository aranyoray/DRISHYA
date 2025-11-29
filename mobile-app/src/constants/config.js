// Configuration constants for DRISHYA Vision Assist AI

export const API_CONFIG = {
  // OpenAI Vision API (you'll need to add your API key)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-api-key-here',
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  OPENAI_MODEL: 'gpt-4o', // GPT-4 with vision capabilities
};

export const CAMERA_CONFIG = {
  // Camera capture settings
  CAPTURE_INTERVAL: 2000, // Capture every 2 seconds for real-time analysis
  IMAGE_QUALITY: 0.8,
  IMAGE_MAX_WIDTH: 1280,
  IMAGE_MAX_HEIGHT: 720,
};

export const AUDIO_CONFIG = {
  // Text-to-Speech settings
  DEFAULT_LANGUAGE: 'en-US',
  DEFAULT_PITCH: 1.0,
  DEFAULT_RATE: 1.0,
  VOICE_OPTIONS: ['default', 'enhanced'],
};

export const LIDAR_CONFIG = {
  // Distance thresholds in meters
  DANGER_DISTANCE: 0.5, // Very close obstacle
  WARNING_DISTANCE: 1.5, // Approaching obstacle
  SAFE_DISTANCE: 3.0, // Comfortable distance
  SCAN_INTERVAL: 500, // Scan every 500ms
};

export const FEATURES = {
  SCENE_DESCRIPTION: {
    enabled: true,
    prompt: 'Describe this scene in detail for a visually impaired person. Include: objects, people, their positions, actions, facial expressions, and any potential obstacles or hazards. Be concise but informative.',
  },
  OBSTACLE_DETECTION: {
    enabled: true,
    prompt: 'Identify any obstacles, hazards, or objects in the path. Describe their position (left, right, center, near, far) and type.',
  },
  FACIAL_RECOGNITION: {
    enabled: true,
    prompt: 'Describe any people visible: their position, approximate age, gender if apparent, facial expressions, and what they appear to be doing.',
  },
  TEXT_READING: {
    enabled: true,
    prompt: 'Read any visible text, signs, labels, or written content in the image.',
  },
  NAVIGATION_ASSIST: {
    enabled: true,
    prompt: 'Provide navigation guidance: identify the path ahead, any turns, steps, curbs, or changes in elevation.',
  },
};

export const HAPTIC_PATTERNS = {
  OBSTACLE_NEAR: {
    pattern: [0, 100, 100, 100, 100, 100],
    repeat: true
  },
  OBSTACLE_WARNING: {
    pattern: [0, 200, 200],
    repeat: false
  },
  SUCCESS: {
    pattern: [0, 50],
    repeat: false
  },
};
