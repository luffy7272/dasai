import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';
import './FloatingRobot.css';

const FloatingRobot = ({ onClick, petColor = '#4A90E2' }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      className="floating-robot"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.8 
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{ 
        '--pet-color': petColor,
        '--pet-color-light': petColor + '20'
      }}
    >
      {/* 机器人主体 */}
      <div className="robot-body">
        {/* 机器人头部 */}
        <div className="robot-head">
          <div className="robot-antenna">
            <motion.div 
              className="antenna-ball"
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          {/* 机器人眼睛 */}
          <div className="robot-eyes">
            <motion.div 
              className="robot-eye left"
              animate={isHovered ? { scaleY: 0.3 } : { scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div 
              className="robot-eye right"
              animate={isHovered ? { scaleY: 0.3 } : { scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
          </div>
          
          {/* 机器人嘴巴 */}
          <motion.div 
            className="robot-mouth"
            animate={isHovered ? { 
              borderRadius: "50%",
              width: "12px",
              height: "12px"
            } : {
              borderRadius: "0",
              width: "16px", 
              height: "3px"
            }}
            transition={{ duration: 0.2 }}
          />
        </div>
        
        {/* 机器人身体 */}
        <div className="robot-torso">
          <div className="robot-screen">
            <MessageCircle size={16} />
          </div>
          <div className="robot-buttons">
            <div className="robot-button" />
            <div className="robot-button" />
          </div>
        </div>
      </div>

      {/* 悬浮效果 */}
      <motion.div 
        className="floating-effect"
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 点击提示 */}
      {isHovered && (
        <motion.div 
          className="click-hint"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Sparkles size={14} />
          <span>点击开始对话</span>
        </motion.div>
      )}

      {/* 呼吸光环 */}
      <motion.div 
        className="breathing-ring"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 装饰性粒子 */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="decorative-particle"
          style={{
            left: `${20 + i * 20}%`,
            top: `${10 + i * 15}%`
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );
};

export default FloatingRobot;