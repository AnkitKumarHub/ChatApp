import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const TypingIndicator = ({ isTyping, className }) => {
  if (!isTyping) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.div
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="flex space-x-1"
      >
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <div className="w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: "0.2s" }}></div>
        <div className="w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: "0.4s" }}></div>
      </motion.div>
      <span className="text-sm text-[#94a3b8]">typing...</span>
    </div>
  );
};

TypingIndicator.propTypes = {
  isTyping: PropTypes.bool.isRequired,
  className: PropTypes.string
};

export default TypingIndicator;
