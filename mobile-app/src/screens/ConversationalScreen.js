import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import conversationalAI from '../services/conversationalAI';
import audioService from '../services/audioService';

export default function ConversationalScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [sessionActive, setSessionActive] = useState(false);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const cameraRef = useRef(null);
  const scrollRef = useRef(null);
  const lastQuestion = useRef(null);

  const quickQuestions = [
    'Do you see a car nearby?',
    'What is in front of me?',
    'Is there anyone around?',
    'Can you read any text?',
    'What color is this?',
    'How far is the nearest obstacle?'
  ];

  useEffect(() => {
    audioService.speak('Conversational Vision Assistant. Capture a scene and ask questions about it.');
  }, []);

  async function startSession() {
    if (!cameraRef.current) return;

    try {
      setIsProcessing(true);
      setErrorState(null);
      audioService.speak('Capturing scene');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: true
      });

      await conversationalAI.startSession(photo.base64);

      setSessionActive(true);
      setConversation([]);
      setRetryCount(0);
      audioService.speak('Session started. Ask me anything about this scene.');

    } catch (error) {
      console.error('Session start error:', error);
      setErrorState('camera_capture_failed');

      Alert.alert(
        'Camera Error',
        'Failed to capture scene. Please check camera permissions and try again.',
        [
          { text: 'Retry', onPress: startSession },
          { text: 'Cancel', style: 'cancel' }
        ]
      );

      audioService.speak('Failed to start session. Check camera permissions.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function askQuestion(questionText, isRetry = false) {
    if (!sessionActive || isProcessing) return;

    try {
      setIsProcessing(true);
      setErrorState(null);
      lastQuestion.current = questionText;

      if (!isRetry) {
        audioService.speak('Processing question');
      }

      const result = await Promise.race([
        conversationalAI.ask(questionText),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        )
      ]);

      const newConversation = [
        ...conversation,
        {
          type: 'question',
          text: result.question,
          timestamp: result.timestamp
        },
        {
          type: 'answer',
          text: result.answer,
          timestamp: result.timestamp
        }
      ];

      setConversation(newConversation);
      setQuestion('');
      setRetryCount(0);

      audioService.speak(result.answer);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Question error:', error);

      const isNetworkError = error.message?.includes('network') ||
                            error.message?.includes('timeout') ||
                            error.message?.includes('fetch');

      if (isNetworkError && retryCount < 2) {
        setRetryCount(prev => prev + 1);

        Alert.alert(
          'Connection Issue',
          'Failed to process your question. Would you like to retry?',
          [
            { text: 'Retry', onPress: () => askQuestion(questionText, true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );

        audioService.speak('Network error. Tap retry to try again.');
      } else {
        setErrorState('api_failed');
        setRetryCount(0);

        Alert.alert(
          'Processing Failed',
          'Unable to process your question. Please try again or restart the session.',
          [
            { text: 'OK', style: 'default' }
          ]
        );

        audioService.speak('Failed to process question. Please try again.');
      }

    } finally {
      setIsProcessing(false);
    }
  }

  function endSession() {
    conversationalAI.endSession();
    setSessionActive(false);
    setConversation([]);
    audioService.speak('Session ended');
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera access required</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                sessionActive && styles.captureButtonActive
              ]}
              onPress={sessionActive ? endSession : startSession}
              disabled={isProcessing}
            >
              <Text style={styles.captureButtonText}>
                {isProcessing ? 'Processing...' : sessionActive ? 'End Session' : 'Start Session'}
              </Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>

      <View style={styles.conversationContainer}>
        <ScrollView
          ref={scrollRef}
          style={styles.conversationScroll}
          contentContainerStyle={styles.conversationContent}
        >
          {conversation.length === 0 ? (
            <Text style={styles.placeholderText}>
              {sessionActive
                ? 'Ask me anything about the scene'
                : 'Capture a scene to start asking questions'}
            </Text>
          ) : (
            conversation.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageContainer,
                  msg.type === 'question' ? styles.questionContainer : styles.answerContainer
                ]}
              >
                <Text style={styles.messageLabel}>
                  {msg.type === 'question' ? 'You' : 'AI'}
                </Text>
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {sessionActive && (
          <>
            <View style={styles.quickQuestionsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {quickQuestions.map((q, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickButton}
                    onPress={() => askQuestion(q)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.quickButtonText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask a question..."
                placeholderTextColor="#999999"
                editable={!isProcessing}
                onSubmitEditing={() => question && askQuestion(question)}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!question || isProcessing) && styles.sendButtonDisabled
                ]}
                onPress={() => question && askQuestion(question)}
                disabled={!question || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Ask</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  cameraContainer: {
    height: 250
  },
  camera: {
    flex: 1
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  captureButtonActive: {
    backgroundColor: '#FF3B30'
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  conversationScroll: {
    flex: 1
  },
  conversationContent: {
    padding: 16
  },
  placeholderText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 40
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%'
  },
  questionContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF'
  },
  answerContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5'
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666666'
  },
  messageText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22
  },
  quickQuestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingVertical: 12
  },
  quickButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 4
  },
  quickButtonText: {
    fontSize: 14,
    color: '#007AFF'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 12
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  permissionText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
