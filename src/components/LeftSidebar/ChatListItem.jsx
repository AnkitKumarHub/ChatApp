import { motion } from 'framer-motion';
import { Avatar } from '@mui/material';
import PropTypes from 'prop-types';

const ChatListItem = ({ chat, isSelected, onClick }) => {
  const lastSeen = Date.now() - chat.userData.lastSeen;
  const isOnline = lastSeen < 60000; // Consider online if last seen < 1 minute ago
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all
        ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
        ${!chat.messageSeen && !isSelected ? 'border-l-4 border-blue-500' : ''}`}
    >
      <div className="relative">
        <Avatar 
          src={chat.userData.avatar} 
          alt={chat.userData.name}
          className="h-12 w-12"
        />
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full 
            ring-2 ring-[#071226] animate-pulse" />
        )}
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className="font-medium text-white truncate">{chat.userData.name}</h3>
          <span className="text-xs text-white/50">
            {new Date(chat.updatedAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-white/60 truncate pr-2">
            {chat.lastMessage || "Start a conversation"}
          </p>
          {!chat.messageSeen && !isSelected && chat.lastMessage && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

ChatListItem.propTypes = {
  chat: PropTypes.shape({
    userData: PropTypes.shape({
      name: PropTypes.string.isRequired,
      avatar: PropTypes.string,
      lastSeen: PropTypes.number
    }).isRequired,
    messageSeen: PropTypes.bool,
    lastMessage: PropTypes.string,
    updatedAt: PropTypes.number
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

export default ChatListItem;
