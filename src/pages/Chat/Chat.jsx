import { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircularProgress } from '@mui/material';
import { AppContext } from '../../context/AppContext';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import TopNavbar from '../../components/TopNavbar';
import LeftSidebar from '../../components/LeftSidebar/LeftSidebar';
import ChatBox from '../../components/ChatBox/ChatBox';
import RightSidebar from '../../components/RightSidebar/RightSidebar';
import WelcomeScreen from '../../components/WelcomeScreen';
import AddFriendModal from '../../components/AddFriendModal';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Chat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chatData, userData, messagesId, setMessagesId, setChatUser } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [messages, setMessages] = useState([]);

  // Handle chat ID from URL
  useEffect(() => {
    if (chatId && userData) {
      const loadChatFromId = async () => {
        try {
          const chatDocRef = doc(db, 'messages', chatId);
          const chatDoc = await getDoc(chatDocRef);
          
          if (!chatDoc.exists()) {
            toast.error("Chat not found");
            navigate('/chat');
            return;
          }

          const chatData = chatDoc.data();
          if (!chatData.participants.includes(userData.id)) {
            toast.error("You don't have access to this chat");
            navigate('/chat');
            return;
          }

          // Get the other participant's data
          const otherUserId = chatData.participants.find(id => id !== userData.id);
          const userDocRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const otherUserData = userDoc.data();
            setSelectedChat({
              userData: {
                ...otherUserData,
                uid: otherUserId,
                avatar: otherUserData.avatar || '',
              }
            });
            setChatUser(otherUserData);
            setMessagesId(chatId);
            setShowRightSidebar(true);
          }
        } catch (error) {
          console.error('Error loading chat:', error);
          toast.error('Error loading chat');
          navigate('/chat');
        }
      };

      loadChatFromId();
    }
  }, [chatId, userData, navigate, setChatUser, setMessagesId]);

  // Listen to real-time messages
  useEffect(() => {
    if (!messagesId) {
      // console.log('No messagesId available yet');
      return;
    }

    // console.log('Setting up message listener for chat:', messagesId);

    const messagesRef = doc(db, 'messages', messagesId);
    const unsubscribe = onSnapshot(messagesRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // console.log('Received message update:', data);
        setMessages(data.messages || []);
      } else {
        // console.log('No messages document found');
        setMessages([]);
      }
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return () => {
      // console.log('Cleaning up message listener');
      unsubscribe();
    };
  }, [messagesId]);

  useEffect(() => {
    if (chatData && userData) {
      setLoading(false);
    }
  }, [chatData, userData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#071226]">
        <CircularProgress className="text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <TopNavbar />
      
      <div className="h-screen pt-16 bg-[#0f172a] text-white">
        <div 
          className={`h-full grid transition-all duration-300 ${
            showRightSidebar 
              ? 'grid-cols-[380px_1fr_300px] md:grid-cols-[380px_1fr_300px]'
              : 'grid-cols-[380px_1fr_0] md:grid-cols-[380px_1fr_0]'
          }`}
        >
          {/* Left Sidebar */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative bg-[#0f172a] border-r border-[#1e293b]"
          >
            <LeftSidebar 
              onChatSelect={(chat) => {
                setSelectedChat(chat);
                setShowRightSidebar(true);
                // Navigate to chat with proper ID
                const chatId = [userData.id, chat.userData.uid].sort().join('_');
                navigate(`/chat/${chatId}`);
              }} 
            />
          </motion.div>

          {/* Main Chat Area */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full bg-[#0f172a]"
          >
            {selectedChat ? (
                <ChatBox 
                  chat={{
                    ...selectedChat,
                    userData: selectedChat.userData ? {
                      ...selectedChat.userData,
                      avatar: selectedChat.userData.photoURL || selectedChat.userData.avatar || ''
                    } : {}
                  }}
                  messages={messages || []}
                  messagesId={messagesId}
                />
            ) : (
              <WelcomeScreen onFindFriends={() => setShowAddFriend(true)} />
            )}
          </motion.div>

          {/* Right Sidebar - Profile Panel */}
          <AnimatePresence>
            {showRightSidebar && (
              <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="bg-[#0f172a] border-l border-[#1e293b]"
              >
                {/* console.log('Selected chat before RightSidebar:', selectedChat) */}
                <RightSidebar 
                  chat={selectedChat ? {
                    ...selectedChat,
                    userData: {
                      ...selectedChat.userData,
                      createdAt: selectedChat.userData?.createdAt || Date.now()
                    }
                  } : null} 
                  onClose={() => setShowRightSidebar(false)} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AddFriendModal 
        open={showAddFriend} 
        onClose={() => setShowAddFriend(false)} 
      />
    </>
  );
}

export default Chat
