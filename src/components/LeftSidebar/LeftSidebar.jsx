import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import PropTypes from 'prop-types';
import { Avatar } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SearchIcon from '@mui/icons-material/Search';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../config/firebase';
import './LeftSidebar.css';

const LeftSidebar = ({ onChatSelect }) => {
  const { chatData, userData, chatUser, setChatUser, setMessagesId } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsData, setFriendsData] = useState([]);

  // Fetch friends data when userData changes or friends list updates
  useEffect(() => {
    if (!userData?.id) {
      // console.log('LeftSidebar: No user data yet');
      return;
    }

    // console.log('LeftSidebar: Setting up friends and messages listener for user', userData.id);

    // Listen to current user's document for friends list changes
    const userDocRef = doc(db, 'users', userData.id);
    const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
      if (!docSnap.exists()) {
        // console.log('LeftSidebar: User document not found');
        return;
      }

      const userData = docSnap.data();
      const friendIds = userData.friends || [];
      // console.log('LeftSidebar: Found friend IDs:', friendIds);

      // Get all friends' data
      const friendsQuery = query(
        collection(db, 'users'),
        where('id', 'in', friendIds.length > 0 ? friendIds : ['dummy'])
      );

      const friendsSnapshot = await getDocs(friendsQuery);
      const friendsData = friendsSnapshot.docs.map(doc => ({
        userData: { ...doc.data(), uid: doc.id },
        lastMessage: { text: null, timestamp: null },
        unreadCount: 0
      }));

      // For each friend, find and listen to their chat document
      for (const friend of friendsData) {
        const chatId = [userData.id, friend.userData.uid].sort().join('_');
        const messagesDocRef = doc(db, 'messages', chatId);
        
        // Listen for changes in the chat document
        onSnapshot(messagesDocRef, (chatDoc) => {
          if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            setFriendsData(currentData => {
              return currentData.map(item => {
                if (item.userData.uid === friend.userData.uid) {
                  return {
                    ...item,
                    lastMessage: chatData.lastMessage,
                    unreadCount: chatData.unreadCount?.[userData.id] || 0
                  };
                }
                return item;
              });
            });
          }
        });
      }

      // console.log('LeftSidebar: Fetched friends data:', friendsData);
      setFriendsData(friendsData);
    });

    return () => {
      // console.log('LeftSidebar: Cleaning up friends listener');
      unsubscribeUser();
    };
  }, [userData?.id]);

  // Combine and sort both chat data and friends data
  const allChats = [...chatData, ...friendsData].filter((chat, index, self) => {
    // Remove duplicates based on user ID
    return index === self.findIndex((c) => c.userData.uid === chat.userData.uid);
  });

  const sortedChats = allChats.sort((a, b) => {
    // First prioritize chats with unread messages
    if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
    if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
    
    // Then sort by last message timestamp
    const aTimestamp = a.lastMessage?.timestamp?.seconds || a.userData.lastSeen || 0;
    const bTimestamp = b.lastMessage?.timestamp?.seconds || b.userData.lastSeen || 0;
    return bTimestamp - aTimestamp;
  });

  const filteredChats = sortedChats.filter(chat => {
    const searchName = chat.userData.displayName || chat.userData.name || '';
    return searchName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleChatClick = async (chat) => {
    try {
      // console.log('Starting chat with:', chat);
      
      const currentUserId = userData.id;
      const selectedUserId = chat.userData.uid;
      
      if (!currentUserId || !selectedUserId) {
        console.error('Missing user IDs:', { currentUserId, selectedUserId });
        return;
      }

      setChatUser(chat.userData);

      // Generate a consistent chat ID based on both user IDs
      const chatId = [currentUserId, selectedUserId].sort().join('_');
      // console.log('Generated chat ID:', chatId);
      setMessagesId(chatId);

      // Get or create the messages document
      const messagesDocRef = doc(db, 'messages', chatId);
      const messagesDoc = await getDoc(messagesDocRef);

      if (!messagesDoc.exists()) {
        // console.log('Creating new messages document');
        // Initialize chat document with metadata
        await setDoc(messagesDocRef, { 
          participants: [currentUserId, selectedUserId],
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [currentUserId]: 0,
            [selectedUserId]: 0
          }
        });
        
        // Create messages subcollection
        const messagesCollectionRef = collection(db, 'messages', chatId, 'messagesList');
        await addDoc(messagesCollectionRef, {
          system: true,
          text: 'Chat created',
          createdAt: new Date(),
          id: Date.now().toString()
        });
      } else {
        // Reset unread count for current user when opening chat
        const chatData = messagesDoc.data();
        const unreadCount = { ...chatData.unreadCount };
        unreadCount[currentUserId] = 0; // Reset count for current user

        await updateDoc(messagesDocRef, {
          unreadCount
        });
      }

      // Initialize or update the chats array if needed
      const userRef = doc(db, 'users', currentUserId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.chats || !Array.isArray(userData.chats)) {
          // Initialize chats array if it doesn't exist
          await updateDoc(userRef, { chats: [selectedUserId] });
        } else if (!userData.chats.includes(selectedUserId)) {
          // Add new chat if not already present
          await updateDoc(userRef, {
            chats: arrayUnion(selectedUserId)
          });
        }
      }

      // Navigate to the chat route with chatId
      const chatRoute = `/chat/${chatId}`;
      onChatSelect(chat);
      
      // console.log('Chat setup completed with route:', chatRoute);
    } catch (error) {
      console.error('Error in handleChatClick:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full w-full"
    >
      <div className="sticky top-0 z-10 p-6 bg-[#0f172a] border-b border-[#1e293b]">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search friends..."
            className="w-full py-4 pl-12 pr-4 bg-[#1e293b] text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#38bdf8] transition-all duration-300 placeholder-[#94a3b8] text-[15px] shadow-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="chat-list flex-1 overflow-y-auto space-y-3 px-4 py-3 scrollbar-thin scrollbar-thumb-[#1e293b] scrollbar-track-transparent">
        <AnimatePresence>
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <ChatListItem
                key={chat.userData.uid}
                chat={chat}
                isSelected={chatUser?.uid === chat.userData.uid}
                onClick={() => handleChatClick(chat)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-12 text-[#94a3b8]"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2 
                }}
              >
                <svg className="w-24 h-24 mb-6 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[15px] font-medium"
              >
                No friends found
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ChatListItem = ({ chat, isSelected, onClick }) => {
  
  console.log('ChatListItem:', { 
    userId: chat.userData.uid,
    name: chat.userData.name || chat.userData.displayName,
    unreadCount: chat.unreadCount
  });

  const hasUnreadMessages = chat.unreadCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center p-5 rounded-2xl cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'bg-[#1e293b] shadow-lg' 
          : hasUnreadMessages 
            ? 'bg-[#1e293b]/80 hover:bg-[#1e293b]' 
            : 'hover:bg-[#1e293b]/50'
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Avatar 
            src={chat.userData.photoURL || chat.userData.avatar}
            alt={chat.userData.displayName || chat.userData.name}
            className={`w-14 h-14 ${
              hasUnreadMessages 
                ? 'ring-2 ring-[#38bdf8]' 
                : 'ring-2 ring-[#38bdf8]/20'
            }`}
            imgProps={{
              onError: (e) => {
                // console.log('Avatar load error for user:', chat.userData.uid);
                e.target.src = '/default-avatar.png';
              }
            }}
          />
        </motion.div>
      </div>
      <div className="ml-4 flex-1">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium text-[15px] ${
            hasUnreadMessages ? 'text-[#38bdf8]' : 'text-[#f8fafc]'
          }`}>
            {chat.userData.name || chat.userData.displayName || 'Unknown User'}
          </h3>
          <span className={`text-xs ${
            hasUnreadMessages ? 'text-[#38bdf8]' : 'text-[#94a3b8]'
          }`}>
            {chat.lastMessage && chat.lastMessage.timestamp && (() => {
              const now = new Date();
              const messageDate = chat.lastMessage.timestamp.toDate();
              const diffInSeconds = Math.floor((now - messageDate) / 1000);
              
              if (diffInSeconds < 60) return 'Just now';
              if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
              if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
              return messageDate.toLocaleDateString();
            })()}
          </span>
        </div>
        {chat.lastMessage && (
          <p className={`text-sm truncate mt-1.5 ${
            hasUnreadMessages ? 'text-[#94a3b8] font-medium' : 'text-[#94a3b8]'
          }`}>
            {chat.lastMessage.text}
          </p>
        )}
      </div>
      {hasUnreadMessages && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-3 bg-[#38bdf8] text-white text-xs font-semibold rounded-full min-w-[1.5rem] h-6 px-2 flex items-center justify-center shadow-lg"
        >
          {chat.unreadCount}
        </motion.div>
      )}
    </motion.div>
  );
};

LeftSidebar.propTypes = {
  onChatSelect: PropTypes.func.isRequired
};

ChatListItem.propTypes = {
  chat: PropTypes.shape({
    userData: PropTypes.shape({
      uid: PropTypes.string.isRequired,
      displayName: PropTypes.string,
      name: PropTypes.string,  // Added name as alternative to displayName
      photoURL: PropTypes.string,
      avatar: PropTypes.string, // Added avatar as alternative to photoURL
      lastSeen: PropTypes.number,
      isOnline: PropTypes.bool,
      status: PropTypes.string
    }).isRequired,
    lastMessage: PropTypes.shape({
      text: PropTypes.string,
      timestamp: PropTypes.object
    }),
    unreadCount: PropTypes.number
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

export default LeftSidebar;
