import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';
import Player from 'react-lottie-player';
import './VoiceChat.css';
import deepseekService from '../services/deepseekService';
import ttsService from '../services/ttsService';

const VoiceChat = ({
  isOpen,
  onClose,
  selectedPet,
  onSendMessage
}) => {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [currentText, setCurrentText] = useState('');
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 宠物信息配置
  const petConfig = {
    fox: {
      id: 'fox',
      name: '小狐狸',
      avatar: '🦊',
      color: '#FF6B6B',
      greeting: '你好呀！我是小狐狸，很高兴认识你！有什么想聊的吗？'
    },
    dolphin: {
      id: 'dolphin',
      name: '小海豚',
      avatar: '🐬',
      color: '#4ECDC4',
      greeting: '嗨！我是小海豚，我最喜欢和朋友们一起学习新知识啦！'
    },
    owl: {
      id: 'owl',
      name: '小猫头鹰',
      avatar: '🦉',
      color: '#45B7D1',
      greeting: '你好！我是小猫头鹰，我知道很多有趣的知识，想听听吗？'
    }
  };

  const currentPet = petConfig[selectedPet] || petConfig.fox;

  // 自动滚动到底部的函数
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentText(interimTranscript);

        if (finalTranscript) {
          setCurrentText(finalTranscript);
          handleVoiceMessage(finalTranscript);
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // 停止TTS播放
      ttsService.stopCurrentAudio();
    };
  }, []);

  // 语音播放 - 使用TTS服务
  const speakText = useCallback(async (text) => {
    if (!isSpeaking) {
      try {
        console.log('🔊 VoiceChat speakText调用:', { text, selectedPet });
        await ttsService.playText(
          text,
          selectedPet,
          () => {
            console.log('🎬 VoiceChat TTS播放开始');
            setIsSpeaking(true);
          },
          () => {
            console.log('🎬 VoiceChat TTS播放结束');
            setIsSpeaking(false);
          },
          (error) => {
            console.error('❌ VoiceChat TTS播放错误:', error);
            setIsSpeaking(false);
          }
        );
      } catch (error) {
        console.error('❌ VoiceChat TTS播放失败:', error);
        setIsSpeaking(false);
      }
    }
  }, [isSpeaking, selectedPet]);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && selectedPet && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: '你好！我是你的AI宠物伙伴，很高兴见到你！',
        sender: 'pet',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      speakText(welcomeMessage.text);
    }
  }, [isOpen, selectedPet, messages.length, speakText]);

  // 监听messages变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 处理语音消息
  const handleVoiceMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setCurrentText('');

    const userMessage = {
      id: Date.now(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await onSendMessage(text, selectedPet);

      const petMessage = {
        id: Date.now() + 1,
        text: response || '哇，这个问题很有趣呢！让我想想怎么回答你...',
        sender: 'pet',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, petMessage]);

      // 语音播放回复
      speakText(petMessage.text);

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: '哎呀，我现在有点累了，稍后再聊好吗？',
        sender: 'pet',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      speakText(errorMessage.text);
    }

    setIsProcessing(false);
  }, [onSendMessage, selectedPet, speakText]);

  // 开始/停止语音识别
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setCurrentText('');
    }
  };

  // 停止语音播放


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="voice-chat-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="voice-chat-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ '--pet-color': currentPet.color }}
        >
          {/* 头部控制区 */}
          <div className="voice-chat-header">
            <div className="pet-info">
              <span className="pet-avatar" style={{ width: '50px', height: '50px', borderRadius: '50%' }}>
                <img style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} src={currentPet.id == 'fox' ? "/狐狸.png" : currentPet.id == 'owl' ? "/猫头鹰.png" : "/海豚.png"} alt={currentPet.name} />
              </span>
            </div>
            <div className="controls">
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 对话显示区 */}
          <div className="messages-container" ref={messagesContainerRef}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className={`message ${message.sender}`}
                initial={{ opacity: 0, x: message.sender === 'user' ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="message-content">
                  {message.text}
                </div>
              </motion.div>
            ))}

            {/* 实时语音转文字显示 */}
            {currentText && (
              <motion.div
                className="message user interim"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="message-content">
                  {currentText}
                  <span className="typing-cursor">|</span>
                </div>
              </motion.div>
            )}

            {/* AI思考加载动画 */}
            {/* {} */}
            {isProcessing && <div className="thinking-text">
              AI正在思考中...
            </div>}
          </div>

          {/* 语音控制区 */}
          <div className="voice-controls">
            <motion.button
              className={`voice-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              {isListening && (
                <motion.div
                  className="listening-pulse"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
            <div className="voice-hint">
              {isListening ? '正在聆听...' : '点击开始语音对话'}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceChat;