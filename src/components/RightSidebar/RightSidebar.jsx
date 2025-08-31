import { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { AppContext } from '../../context/AppContext';
import { motion } from 'framer-motion';
import { Avatar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InfoIcon from '@mui/icons-material/Info';

const RightSidebar = ({ chat, onClose }) => {
  const { messages } = useContext(AppContext);
  const [mediaFiles, setMediaFiles] = useState([]);

  useEffect(() => {
    // console.log('RightSidebar chat data:', chat);
    console.log('RightSidebar userData:', chat?.userData);
    console.log('RightSidebar createdAt:', chat?.userData?.createdAt);
    const images = messages
      .filter(msg => msg.image)
      .map(msg => msg.image);
    setMediaFiles(images);
  }, [messages, chat]);

  if (!chat) return null;

  const isOnline = chat.userData?.lastSeen ? (Date.now() - chat.userData.lastSeen <= 70000) : false;

  const getFormattedDate = (createdAt) => {
    if (!createdAt) return new Date().toLocaleDateString();
    
    if (typeof createdAt === 'number') {
      return new Date(createdAt).toLocaleDateString();
    }
    
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      return new Date(createdAt.toDate()).toLocaleDateString();
    }
    
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString();
    }
    
    return new Date().toLocaleDateString();
  };

  const joinedDate = getFormattedDate(chat.userData?.createdAt);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-white/10">
        <h3 className="text-lg font-semibold">Profile</h3>
        <IconButton 
          onClick={onClose} 
          className="text-gray-400 hover:text-white transition-colors"
          sx={{ 
            color: '#94A3B8', // Light gray color
            '&:hover': {
              backgroundColor: 'rgba(148, 163, 184, 0.1)', // Light hover effect
              color: '#F8FAFC' // Lighter color on hover
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </div>

      {/* Profile Info */}
      <div className="p-6 text-center space-y-4">
        <div className="relative inline-block">
          <Avatar 
            src={chat.userData.avatar} 
            alt={chat.userData.username}
            sx={{ width: 96, height: 96 }}
            className="ring-2 ring-indigo-500"
          />
          {isOnline && (
            <FiberManualRecordIcon 
              className="absolute bottom-0 right-0 text-green-500"
              sx={{ fontSize: 20 }}
            />
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-bold">{chat.userData.username}</h2>
          <p className="text-gray-400 text-sm mt-1">{chat.userData.bio || "No bio set"}</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <CalendarTodayIcon sx={{ fontSize: 16 }} />
          <span>Joined {joinedDate}</span>
        </div>
      </div>

      {/* Shared Media */}
      {mediaFiles.length > 0 && (
        <div className="p-6 border-t border-white/10">
          <h4 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <InfoIcon sx={{ fontSize: 16 }} />
            Shared Media
          </h4>
          <ImageList cols={3} gap={8}>
            {mediaFiles.map((url, index) => (
              <ImageListItem 
                key={index}
                className="cursor-pointer hover:opacity-80 transition"
                onClick={() => window.open(url)}
              >
                <img
                  src={url}
                  alt="Shared media"
                  loading="lazy"
                  className="rounded-lg object-cover aspect-square"
                />
              </ImageListItem>
            ))}
          </ImageList>
        </div>
      )}
    </motion.div>
  );
};

RightSidebar.propTypes = {
  chat: PropTypes.shape({
    userData: PropTypes.shape({
      avatar: PropTypes.string,
      username: PropTypes.string,
      bio: PropTypes.string,
      lastSeen: PropTypes.number,
      createdAt: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.shape({
          toDate: PropTypes.func
        }),
        PropTypes.shape({
          seconds: PropTypes.number,
          nanoseconds: PropTypes.number
        })
      ])
    })
  }),
  onClose: PropTypes.func
};

export default RightSidebar;
