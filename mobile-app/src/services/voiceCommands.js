import * as Speech from 'expo-speech';
import audioService from './audioService';
import conversationalAI from './conversationalAI';
import obstacleDetection from './obstacleDetection';
import emotionDetection from './emotionDetection';

const VOICE_COMMANDS = {
  WHAT_DO_YOU_SEE: ['what do you see', 'describe scene', 'tell me what you see'],
  OBSTACLES: ['any obstacles', 'whats ahead', 'check obstacles', 'what is in front'],
  HELP: ['help', 'what can you do', 'commands'],
  READ_TEXT: ['read text', 'read sign', 'what does it say'],
  PEOPLE: ['who is there', 'any people', 'describe person'],
  DISTANCE: ['how far', 'distance', 'how close'],
  EMOTION: ['what emotion', 'how do they feel', 'facial expression'],
  LOCATION: ['where am i', 'location', 'what building']
};

class VoiceCommandsService {
  constructor() {
    this.isListening = false;
    this.currentImage = null;
    this.recognitionTimeout = null;
  }

  async initialize() {
    try {
      console.log('[VoiceCommands] Service initialized');
      return true;
    } catch (error) {
      console.error('[VoiceCommands] Init error:', error.message);
      return false;
    }
  }

  async startListening() {
    try {
      this.isListening = true;
      audioService.speak('Listening for command');

      this.recognitionTimeout = setTimeout(() => {
        this.stopListening();
      }, 5000);

      return { success: true };

    } catch (error) {
      console.error('[VoiceCommands] Start listening error:', error.message);
      return { success: false };
    }
  }

  stopListening() {
    this.isListening = false;

    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
  }

  async processVoiceInput(text) {
    if (!text) return;

    const normalizedText = text.toLowerCase().trim();
    const command = this.matchCommand(normalizedText);

    if (command) {
      await this.executeCommand(command, normalizedText);
    } else {
      if (conversationalAI.isSessionActive()) {
        const result = await conversationalAI.ask(text);
        audioService.speak(result.answer);
      } else {
        audioService.speak('Command not recognized. Say help for available commands.');
      }
    }
  }

  matchCommand(text) {
    for (const [command, patterns] of Object.entries(VOICE_COMMANDS)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          return command;
        }
      }
    }
    return null;
  }

  async executeCommand(command, originalText) {
    try {
      switch (command) {
        case 'WHAT_DO_YOU_SEE':
          await this.handleDescribeScene();
          break;

        case 'OBSTACLES':
          await this.handleCheckObstacles();
          break;

        case 'HELP':
          this.handleHelp();
          break;

        case 'READ_TEXT':
          await this.handleReadText();
          break;

        case 'PEOPLE':
          await this.handleDescribePeople();
          break;

        case 'DISTANCE':
          await this.handleCheckDistance();
          break;

        case 'EMOTION':
          await this.handleCheckEmotion();
          break;

        case 'LOCATION':
          await this.handleGetLocation();
          break;

        default:
          audioService.speak('Command not implemented yet');
      }

    } catch (error) {
      console.error('[VoiceCommands] Execute error:', error.message);
      audioService.speak('Failed to execute command');
    }
  }

  async handleDescribeScene() {
    if (!this.currentImage) {
      audioService.speak('No image available. Please capture a scene first.');
      return;
    }

    audioService.speak('Analyzing scene');
    const result = await conversationalAI.quickQuery(
      this.currentImage,
      'Describe this scene in detail for a visually impaired person'
    );
    audioService.speak(result);
  }

  async handleCheckObstacles() {
    if (!this.currentImage) {
      audioService.speak('No image available. Please capture a scene first.');
      return;
    }

    audioService.speak('Checking for obstacles');
    const obstacles = await obstacleDetection.detectObstacles(this.currentImage, {
      lowLight: false,
      priorityOnly: false
    });

    if (obstacles.length === 0) {
      audioService.speak('No obstacles detected. Path appears clear.');
    } else {
      await obstacleDetection.announceObstacles(obstacles);
    }
  }

  handleHelp() {
    const helpText = `Available commands:
      What do you see - Describe the scene.
      Any obstacles - Check for obstacles.
      Read text - Read visible text.
      Who is there - Describe people.
      How far - Check distance.
      What emotion - Detect facial expression.
      Where am I - Get location.`;

    audioService.speak(helpText);
  }

  async handleReadText() {
    if (!this.currentImage) {
      audioService.speak('No image available. Please capture a scene first.');
      return;
    }

    audioService.speak('Reading text');
    const result = await conversationalAI.quickQuery(
      this.currentImage,
      'Read all visible text, signs, and labels in this image'
    );
    audioService.speak(result);
  }

  async handleDescribePeople() {
    if (!this.currentImage) {
      audioService.speak('No image available. Please capture a scene first.');
      return;
    }

    audioService.speak('Analyzing people');
    const result = await conversationalAI.quickQuery(
      this.currentImage,
      'Describe any people visible: their position, appearance, and what they are doing'
    );
    audioService.speak(result);
  }

  async handleCheckDistance() {
    if (!this.currentImage) {
      audioService.speak('No image available. Please capture a scene first.');
      return;
    }

    audioService.speak('Measuring distance');
    const result = await conversationalAI.quickQuery(
      this.currentImage,
      'Estimate the distance to the nearest object or obstacle directly ahead in feet'
    );
    audioService.speak(result);
  }

  async handleCheckEmotion() {
    if (!this.currentImage) {
      audioService.speak('No image available. Please capture a scene first.');
      return;
    }

    audioService.speak('Detecting emotion');
    const emotion = await emotionDetection.detectEmotion(this.currentImage);

    if (emotion) {
      const emotionInfo = emotionDetection.getEmotionInfo(emotion.emotion);
      audioService.speak(
        `The person appears ${emotionInfo.label} with ${Math.round(emotion.confidence * 100)} percent confidence`
      );
    } else {
      audioService.speak('Could not detect emotion');
    }
  }

  async handleGetLocation() {
    audioService.speak('Getting location. This feature requires GPS and indoor beacons.');
  }

  setCurrentImage(imageBase64) {
    this.currentImage = imageBase64;
  }

  getListeningStatus() {
    return this.isListening;
  }
}

export default new VoiceCommandsService();
