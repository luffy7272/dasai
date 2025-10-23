// 文字转语音服务（修复版）
class TTSService {
  constructor() {
    this.apiUrl = 'https://xbpethd.gaodun.com/api/leftsite-tts/convert';
    this.baseUrl = 'https://xbpethd.gaodun.com'; // 基础URL用于拼接音频路径
    this.currentAudio = null;
    this.currentAudioUrl = null;
    this.loadTimeout = null; // 统一管理加载超时器
    
    // 宠物语音配置（需确保与API支持的voice标识一致，若不一致需替换）
    this.petVoices = {
      fox: 'zh-CN-XiaoxiaoNeural',
      dolphin: 'zh-CN-XiaoyuMultilingualNeural', 
      owl: 'zh-CN-YunyiMultilingualNeural'
    };
  }

  /**
   * 获取宠物对应的语音类型
   * @param {string} petType - 宠物类型 (fox, dolphin, owl)
   * @returns {string} 语音类型
   */
  getVoiceForPet(petType) {
    return this.petVoices[petType] || this.petVoices.fox;
  }

  /**
   * 封装：清理音频资源（避免内存泄漏+重复代码）
   */
  cleanupAudio() {
    // 清除超时器
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    // 停止当前音频
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    // 释放Blob URL
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    // 停止浏览器语音合成（兜底）
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 调用TTS API获取语音文件（适配新的JSON响应格式）
   * @param {string} text - 要转换的文本
   * @param {string} petType - 宠物类型
   * @returns {Promise<string>} 返回音频文件URL
   */
  async generateSpeech(text, petType = 'fox') {
    try {
      const voice = this.getVoiceForPet(petType);
      console.log('🎵 TTS API调用开始:', { text, petType, voice, apiUrl: this.apiUrl });

      const requestBody = { text, voice };
      console.log('📤 TTS请求数据:', requestBody);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 TTS API响应状态:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      // 1. 先处理HTTP错误（非200状态）
      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `HTTP ${response.status}: ${errorText || response.statusText}`;
        console.error('❌ TTS API错误响应:', errorMsg);
        throw new Error(errorMsg);
      }

      // 2. 解析JSON响应（新的响应格式）
      const jsonResponse = await response.json();
      console.log('📥 TTS API JSON响应:', jsonResponse);

      // 3. 验证响应结构和成功状态
      if (!jsonResponse.success || jsonResponse.status !== 0) {
        const errorMsg = `TTS API业务错误: ${jsonResponse.message || '未知错误'}`;
        console.error('❌ TTS API业务失败:', errorMsg);
        throw new Error(errorMsg);
      }

      // 4. 验证result数据结构
      if (!jsonResponse.result || !jsonResponse.result.audioUrl) {
        const errorMsg = 'TTS API响应缺少音频URL数据';
        console.error('❌ 响应数据不完整:', errorMsg);
        throw new Error(errorMsg);
      }

      // 5. 拼接完整的音频URL
      const audioPath = jsonResponse.result.audioUrl;
      const fullAudioUrl = this.baseUrl + audioPath;
      
      console.log('🎵 TTS音频信息:', {
        audioPath: audioPath,
        fullAudioUrl: fullAudioUrl,
        fileName: jsonResponse.result.fileName,
        size: jsonResponse.result.size,
        format: jsonResponse.result.format,
        voice: jsonResponse.result.voice
      });

      console.log('✅ TTS音频URL生成成功:', fullAudioUrl);
      return fullAudioUrl;

    } catch (error) {
      console.error('❌ TTS API调用失败:', error.message);
      throw error; // 向上传递错误，触发回退逻辑
    }
  }

  /**
   * 播放语音（核心修复：合并事件监听+避免逻辑冲突）
   * @param {string} text - 要播放的文本
   * @param {string} petType - 宠物类型
   * @param {function} onStart - 播放开始回调
   * @param {function} onEnd - 播放结束回调
   * @param {function} onError - 播放错误回调
   */
  async playText(text, petType = 'fox', onStart = null, onEnd = null, onError = null) {
    // 安全校验：文本为空直接终止
    if (!text.trim()) {
      console.warn('⚠️ 播放文本为空，跳过播放');
      onEnd?.();
      return;
    }

    try {
      console.log('🔊 TTS播放初始化:', { text: text.slice(0, 20) + '...', petType });
      
      // 1. 先停止当前所有播放（避免叠加）
      this.cleanupAudio();
      
      // 2. 触发开始回调
      onStart?.();

      // 3. 尝试调用API播放（失败则回退到浏览器合成）
      const audioUrl = await this.generateSpeech(text, petType);
      this.currentAudio = new Audio();
      this.currentAudioUrl = audioUrl;
      this.currentAudio.preload = 'auto'; // 预加载（无需crossOrigin，除非明确跨域需求）

      // 4. 绑定音频事件（合并日志+逻辑，避免重复绑定）
      // 4.1 加载成功：可播放时执行播放
      this.currentAudio.oncanplay = () => {
        console.log('✅ 音频加载完成，开始播放');
        this.currentAudio.play().catch(playErr => {
          console.error('❌ 音频播放命令失败:', playErr.message);
          this.cleanupAudio();
          this.fallbackToSpeechSynthesis(text, onStart, onEnd, onError);
        });
      };

      // 4.2 播放中事件
      this.currentAudio.onplay = () => {
        console.log('▶️ 音频正在播放');
      };

      // 4.3 播放结束：清理资源+触发回调
      this.currentAudio.onended = () => {
        console.log('⏹️ 音频播放结束');
        this.cleanupAudio();
        onEnd?.();
      };

      // 4.4 加载/播放错误：回退到浏览器合成
      this.currentAudio.onerror = (audioErr) => {
        const errorMsg = audioErr.target?.error 
          ? `代码${audioErr.target.error.code}：${this.getAudioErrorMsg(audioErr.target.error.code)}`
          : audioErr.message;
        console.error('❌ 音频加载/播放错误:', errorMsg);
        this.cleanupAudio();
        this.fallbackToSpeechSynthesis(text, onStart, onEnd, onError);
      };

      // 5. 加载超时控制（5秒未加载完成则回退）
      this.loadTimeout = setTimeout(() => {
        console.error('❌ 音频加载超时（5秒）');
        this.cleanupAudio();
        this.fallbackToSpeechSynthesis(text, onStart, onEnd, onError);
      }, 5000);

      // 6. 启动音频加载（最后执行，确保事件已绑定）
      console.log('⏳ 开始加载音频:', audioUrl);
      this.currentAudio.src = audioUrl;
      this.currentAudio.load();

    } catch (apiError) {
      // API调用失败：直接回退到浏览器语音合成
      console.error('❌ TTS API流程失败，触发回退:', apiError.message);
      this.cleanupAudio();
      this.fallbackToSpeechSynthesis(text, onStart, onEnd, onError);
    }
  }

  /**
   * 音频错误代码转文字说明（增强调试体验）
   * @param {number} errorCode - 音频错误代码（1-4）
   * @returns {string} 错误说明
   */
  getAudioErrorMsg(errorCode) {
    const errorMap = {
      1: '音频加载被中止（用户或代码中断）',
      2: '网络错误（加载超时/跨域/资源不存在）',
      3: '音频解码错误（格式不支持/文件损坏）',
      4: '音频源不支持（无效URL/非音频格式）'
    };
    return errorMap[errorCode] || '未知错误';
  }

  /**
   * 回退到浏览器内置语音合成（兜底方案）
   * @param {string} text - 要播放的文本
   * @param {function} onStart - 播放开始回调
   * @param {function} onEnd - 播放结束回调
   * @param {function} onError - 播放错误回调
   */
  fallbackToSpeechSynthesis(text, onStart = null, onEnd = null, onError = null) {
    console.log('🔄 回退到浏览器内置语音合成');
    if (!('speechSynthesis' in window)) {
      const err = new Error('浏览器不支持语音合成，播放完全失败');
      console.error('❌ 兜底方案无效:', err.message);
      onError?.(err);
      onEnd?.();
      return;
    }

    try {
      // 先停止现有合成
      window.speechSynthesis.cancel();

      // 配置合成参数（适配中文）
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9; // 语速（0.1-10）
      utterance.pitch = 1.1; // 音调（0-2）
      utterance.volume = 0.8; // 音量（0-1）

      // 绑定合成事件
      utterance.onstart = () => {
        console.log('▶️ 浏览器语音合成开始');
        onStart?.();
      };
      utterance.onend = () => {
        console.log('⏹️ 浏览器语音合成结束');
        onEnd?.();
      };
      utterance.onerror = (synthErr) => {
        const err = new Error(`语音合成错误：${synthErr.error}`);
        console.error('❌ 浏览器语音合成失败:', err.message);
        onError?.(err);
        onEnd?.();
      };

      // 启动合成（需确保在用户交互内调用）
      window.speechSynthesis.speak(utterance);

    } catch (synthErr) {
      const err = new Error(`语音合成回退失败：${synthErr.message}`);
      console.error('❌ 兜底方案执行失败:', err.message);
      onError?.(err);
      onEnd?.();
    }
  }

  /**
   * 停止当前播放的音频（外部调用接口）
   */
  stopCurrentAudio() {
    console.log('🛑 手动停止当前音频');
    this.cleanupAudio();
  }

  /**
   * 检查是否正在播放
   * @returns {boolean} 是否播放中
   */
  isPlaying() {
    // 检查音频播放状态 + 浏览器合成状态
    const audioPlaying = this.currentAudio && !this.currentAudio.paused;
    const synthPlaying = 'speechSynthesis' in window && window.speechSynthesis.speaking;
    return audioPlaying || synthPlaying;
  }

  /**
   * 测试TTS API连接（调试工具）
   * @returns {Promise<boolean>} API是否可用
   */
  async testAPI() {
    try {
      console.log('🧪 开始TTS API测试:', { apiUrl: this.apiUrl });
      const testParams = {
        text: 'API测试音频',
        voice: this.petVoices.fox
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testParams)
      });

      console.log('🧪 API测试响应状态:', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '无法读取错误内容');
        console.error('🧪 API测试失败:', `HTTP ${response.status} - ${errorText}`);
        return false;
      }

      // 解析JSON响应
      const jsonResponse = await response.json();
      console.log('🧪 API测试JSON响应:', jsonResponse);

      // 验证响应结构
      const isValid = jsonResponse.success && 
                     jsonResponse.status === 0 && 
                     jsonResponse.result && 
                     jsonResponse.result.audioUrl;
      
      if (isValid) {
        const fullAudioUrl = this.baseUrl + jsonResponse.result.audioUrl;
        console.log('🧪 API测试成功:', {
          audioUrl: fullAudioUrl,
          fileName: jsonResponse.result.fileName,
          size: jsonResponse.result.size,
          format: jsonResponse.result.format
        });
      } else {
        console.error('🧪 API测试失败: 响应数据结构不正确');
      }

      return isValid;

    } catch (testErr) {
      console.error('🧪 API测试异常:', testErr.message);
      return false;
    }
  }
}

// 创建单例实例（确保全局唯一）
const ttsService = new TTSService();

export default ttsService;