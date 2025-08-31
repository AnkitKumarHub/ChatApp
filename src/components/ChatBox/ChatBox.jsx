import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import './ChatBox.css';
import assets from '../../assets/assets';
import { CircularProgress, IconButton, ClickAwayListener } from '@mui/material';
import { debounce } from 'lodash';
import { AppContext } from '../../context/AppContext';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import CloseIcon from '@mui/icons-material/Close';
import EmojiPicker from 'emoji-picker-react';




import { 
  arrayUnion, 
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from 'react-toastify';
import upload from '../../lib/upload';
import { updateTypingStatus } from '../../services/typing';
import TypingIndicator from './TypingIndicator';

const MESSAGES_PER_PAGE = 50;

const ChatBox = ({ chat, messages: propMessages, messagesId }) => {
  console.log('ChatBox Props:', { chat, propMessages, messagesId });
  
  const { userData, chatVisible, setChatVisible } = useContext(AppContext);
  const [messages, setMessages] = useState(propMessages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [lastMessageRef, setLastMessageRef] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const scrollEnd = useRef();
  const chatContainerRef = useRef();
  const isLoadingMore = useRef(false);

  const onEmojiClick = (emojiObject) => {
    setInput(prevInput => prevInput + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const sendMessage = async () => {
    try {
      if (input.trim() && messagesId) {
        setInput(""); 
        const messageData = {
          sId: userData.id,
          text: input.trim(),
          createdAt: new Date(),
          id: Date.now().toString()
        };

        // Add message to the messages subcollection
        const messagesRef = collection(db, "messages", messagesId, "messagesList");
        await addDoc(messagesRef, messageData);

        // Get the chat document
        const chatDocRef = doc(db, "messages", messagesId);
        const chatDoc = await getDoc(chatDocRef);
        const chatData = chatDoc.data();
        
        // Update unread count for recipient
        const recipientId = chat.userData.id;
        const unreadCount = chatData.unreadCount || {};
        unreadCount[recipientId] = (unreadCount[recipientId] || 0) + 1;

        // Update last message and unread count in main chat document
        await updateDoc(chatDocRef, {
          lastMessage: input.trim(),
          lastMessageAt: new Date(),
          unreadCount
        });

        const userIDs = [chat.userData.id, userData.id];

        // Update chat metadata for both users
        for (const id of userIDs) {
          const userChatsRef = doc(db, "chats", id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data();
            const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
            if (chatIndex !== -1) {
              userChatsData.chatsData[chatIndex].lastMessage = input;
              userChatsData.chatsData[chatIndex].updatedAt = Date.now();
              if (userChatsData.chatsData[chatIndex].rId === userData.id) {
                userChatsData.chatsData[chatIndex].messageSeen = false;
              }
              await updateDoc(userChatsRef, {
                chatsData: userChatsData.chatsData,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.message);
    }
  }

  const convertTimestamp = (timestamp) => {
    let date = timestamp.toDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    if (hour > 12) {
      date = hour - 12 + ':' + minute + " PM";
    }
    else {
      date = hour + ':' + minute + " AM";
    }
    return date;
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const sendImage = async () => {
    if (!selectedImage || !messagesId) return;

    try {
      setLoading(true);
      const fileUrl = await upload(selectedImage);

      // Add message to the messages subcollection
      const messageData = {
        sId: userData.id,
        image: fileUrl,
        createdAt: new Date(),
        id: Date.now().toString()
      };

      const messagesRef = collection(db, "messages", messagesId, "messagesList");
      await addDoc(messagesRef, messageData);

      // Update last message in main chat document
      await updateDoc(doc(db, "messages", messagesId), {
        lastMessage: "Image",
        lastMessageAt: new Date()
      });

      // Update chat metadata for both users
      const userIDs = [chat.userData.id, userData.id];
      for (const id of userIDs) {
        const userChatsRef = doc(db, "chats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chatsData.findIndex((c) => c.messageId === messagesId);
          if (chatIndex !== -1) {
            userChatsData.chatsData[chatIndex].lastMessage = "Image";
            userChatsData.chatsData[chatIndex].updatedAt = Date.now();
            await updateDoc(userChatsRef, {
              chatsData: userChatsData.chatsData,
            });
          }
        }
      }

      // Clear the preview
      setSelectedImage(null);
      setImagePreview(null);
      
      toast.success('Image sent successfully');
    } catch (error) {
      console.error('Error sending image:', error);
      toast.error('Failed to send image. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    // Auto-scroll to bottom for new messages or initial load
    const container = chatContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      const isInitialLoad = messages.length > 0 && container.scrollTop === 0;
      const isNewMessage = messages.length > 0 && messages[messages.length - 1]?.sId === userData.id;
      
      if (isNearBottom || isInitialLoad || isNewMessage) {
        scrollEnd.current?.scrollIntoView({ 
          behavior: isInitialLoad ? "auto" : "smooth",
          block: "end"
        });
      }
    }
  }, [messages, userData.id]);

  // Ensure scroll to bottom on initial chat load
  useEffect(() => {
    if (chat) {
      setTimeout(() => {
        scrollEnd.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [chat]);

  const loadMoreMessages = useCallback(async () => {
    if (!messagesId || isLoadingMore.current || !hasMore) return;

    try {
      console.log('Starting to load more messages...');
      isLoadingMore.current = true;
      setLoading(true);

      const messagesRef = collection(db, "messages", messagesId, "messagesList");
      const q = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastMessageRef),
        limit(MESSAGES_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      console.log(`Fetched ${snapshot.docs.length} more messages`);

      const newMessages = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Update hasMore based on fetched messages count
      if (newMessages.length < MESSAGES_PER_PAGE) {
        console.log('No more messages to load');
        setHasMore(false);
      }

      if (newMessages.length > 0) {
        // Store current scroll position and height
        const container = chatContainerRef.current;
        const prevHeight = container.scrollHeight;
        const prevScroll = container.scrollTop;

        setLastMessageRef(snapshot.docs[snapshot.docs.length - 1]);
        
        // Update messages state
        setMessages(prev => {
          const updatedMessages = [...newMessages.reverse(), ...prev];
          console.log(`Total messages after update: ${updatedMessages.length}`);
          return updatedMessages;
        });

        // Restore scroll position after DOM update
        requestAnimationFrame(() => {
          if (container) {
            const newHeight = container.scrollHeight;
            const heightDiff = newHeight - prevHeight;
            container.scrollTop = prevScroll + heightDiff;
            console.log('Scroll position restored', {
              previousHeight: prevHeight,
              newHeight,
              heightDiff,
              newScrollTop: prevScroll + heightDiff
            });
          }
        });
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
      toast.error("Error loading messages");
    } finally {
      isLoadingMore.current = false;
      setLoading(false);
    }
  }, [messagesId, lastMessageRef, hasMore]);

  const handleScroll = useCallback(
    debounce((e) => {
      const element = e.target;
      const scrollPercentage = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
      
      // Load more when scrolled to top 20% of the container
      if (scrollPercentage <= 20 && hasMore && !loading && !isLoadingMore.current) {
        console.log('Loading more messages...', {
          scrollTop: element.scrollTop,
          scrollHeight: element.scrollHeight,
          scrollPercentage
        });
        
        const scrollHeightBeforeLoad = element.scrollHeight;
        const scrollTopBeforeLoad = element.scrollTop;
        
        loadMoreMessages().then(() => {
          // Maintain scroll position after loading more messages
          requestAnimationFrame(() => {
            const newScrollHeight = element.scrollHeight;
            const scrollDiff = newScrollHeight - scrollHeightBeforeLoad;
            element.scrollTop = scrollTopBeforeLoad + scrollDiff;
          });
        });
      }
    }, 200),
    [loadMoreMessages, hasMore, loading]
  );

  // Cleanup typing status when component unmounts
  useEffect(() => {
    return () => {
      if (messagesId && userData.id) {
        updateTypingStatus(messagesId, userData.id, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messagesId, userData.id]);

  // Listen for typing status changes
  useEffect(() => {
    if (messagesId && chat?.userData?.id) {
      const messagesDocRef = doc(db, "messages", messagesId);
      
      const unsubscribe = onSnapshot(messagesDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const typingData = data.typing || {};
          const otherUserTyping = typingData[chat.userData.id];
          
          if (otherUserTyping) {
            const timeSinceTyping = Date.now() - otherUserTyping;
            setIsTyping(timeSinceTyping < 3000);
          } else {
            setIsTyping(false);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [messagesId, chat?.userData?.id]);

  useEffect(() => {
    console.log('Setting up message listener with messagesId:', messagesId);
    if (messagesId && chat?.userData?.id) {
      // First verify if the current user is a participant
      const messagesDocRef = doc(db, "messages", messagesId);
      getDoc(messagesDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const chatData = docSnap.data();
          if (!chatData.participants.includes(userData.id)) {
            console.error("User is not a participant in this chat");
            toast.error("You don't have access to this chat");
            return;
          }
          
          // Listen to new messages
          const messagesRef = collection(db, "messages", messagesId, "messagesList");
          const q = query(
            messagesRef, 
            orderBy("createdAt", "desc"), 
            limit(MESSAGES_PER_PAGE)
          );
          
          // Set initial hasMore state
          getDocs(q).then(initialSnapshot => {
            setHasMore(initialSnapshot.docs.length === MESSAGES_PER_PAGE);
          });
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('Message snapshot:', snapshot.docs.length, 'messages');
            const newMessages = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id
              };
            });

            if (newMessages.length > 0) {
              setLastMessageRef(snapshot.docs[snapshot.docs.length - 1]);
              // Sort messages by timestamp in ascending order for display
              setMessages(newMessages.reverse());
              
              // Scroll to bottom on initial load
              requestAnimationFrame(() => {
                scrollEnd.current?.scrollIntoView({ behavior: 'auto' });
              });
            }
          }, (error) => {
            console.error('Error in message listener:', error);
            toast.error("Error loading messages");
          });

          return () => {
            console.log('Cleaning up message listener');
            unsubscribe();
          };
        }
      });
    }
  }, [messagesId, chat?.userData?.id, userData.id]);

  return chat ? (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden relative bg-[#0a1929]">
      {/* Chat Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-[#132f4c] border-b border-[#1e4976] z-10">
        <img 
          src={chat.userData?.avatar || assets.profile_img} 
          alt="" 
          className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-400/30"
        />
        <div className="flex-1">
          <p className="font-medium text-gray-100">{chat.userData?.name || "Unknown"}</p>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            {chat.userData?.lastSeen && Date.now() - chat.userData.lastSeen <= 70000 ? (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-green-400">Online</span>
              </>
            ) : "Offline"}
          </p>
        </div>
        <IconButton 
          onClick={() => {
            setChatVisible(false);
            window.location.href = '/chat';
          }}
          className="text-gray-300 hover:text-blue-400 transition-all duration-200 rounded-full"
          sx={{
            color: '#94A3B8',
            '&:hover': {
              backgroundColor: 'rgba(30, 73, 118, 0.5)',
              color: '#60A5FA',
            },
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </IconButton>
      </div>
      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto bg-[#0a1929] chat-messages-container" 
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#1e4976 #0a1929',
          msOverflowStyle: 'none'
        }}
      >
        <div className="min-h-full flex flex-col">
          {loading && (
            <div className="flex justify-center py-4">
              <CircularProgress size={24} className="text-blue-400" />
            </div>
          )}
          
          <div className="flex-1"></div> {/* Spacer to push messages to bottom */}
          
          <div className="flex flex-col space-y-4 px-4 py-6">
            {messages.map((msg, index) => {
              console.log('Rendering message:', msg);
              return (
                <div 
                  key={msg.id || index} 
                  className={`flex items-end gap-2 message-appear ${msg.sId === userData.id ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex-shrink-0 mb-1">
                    <img 
                      src={msg.sId === userData.id ? userData.avatar : chat.userData?.avatar || assets.profile_img} 
                      alt="" 
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-400/30"
                    />
                  </div>
                  <div 
                    className={`
                      max-w-[70%] rounded-2xl p-3
                      ${msg.sId === userData.id 
                        ? 'bg-blue-500/90 text-white backdrop-blur-sm' 
                        : 'bg-[#132f4c] text-gray-100'
                      }
                    `}
                  >
                    {msg.image ? (
                      <img 
                        className='max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-1 shadow-sm' 
                        src={msg.image} 
                        alt="" 
                        onClick={() => window.open(msg.image)}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                    )}
                    <p className={`text-xs mt-1 ${msg.sId === userData.id ? 'text-blue-100' : 'text-gray-400'}`}>
                      {convertTimestamp(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={scrollEnd}>
            <TypingIndicator 
              isTyping={isTyping} 
              className="px-4 py-2"
            />
          </div>
        </div>
      </div>
      {/* Message Input Area */}
      <div className="flex-shrink-0 bg-[#132f4c] border-t border-[#1e4976] p-2 sm:p-3">
        {imagePreview && (
          <div className="mb-3 relative max-w-4xl mx-auto">
            <div className="relative rounded-lg overflow-hidden bg-[#0a1929] p-2">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-[200px] rounded-lg object-contain mx-auto"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <IconButton
                  onClick={cancelImageUpload}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgb(239, 68, 68)',
                    },
                    padding: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={sendImage}
                  size="small"
                  disabled={loading}
                  sx={{
                    backgroundColor: 'rgba(37, 99, 235, 0.9)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgb(37, 99, 235)',
                    },
                    '&.Mui-disabled': {
                      backgroundColor: 'rgba(37, 99, 235, 0.5)',
                      color: 'rgba(255,255,255,0.8)',
                    },
                    padding: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} thickness={5} sx={{ color: 'white' }} />
                  ) : (
                    <SendIcon fontSize="small" />
                  )}
                </IconButton>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 sm:gap-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-1">
            <input
              type="file"
              id="image-upload"
              className="hidden"
              accept="image/png, image/jpeg"
              onChange={handleImageSelect}
            />
            <label htmlFor="image-upload">
              <IconButton 
                className="text-gray-300 hover:text-blue-400 transition-all duration-200 p-1.5 hover:bg-[#1e4976]/50 rounded-full"
                sx={{
                  color: '#94A3B8',
                  '&:hover': {
                    backgroundColor: 'rgba(30, 73, 118, 0.5)',
                    color: '#60A5FA',
                  }
                }}
                component="span"
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </IconButton>
            </label>

            <div className="relative">
              <IconButton 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                sx={{
                  color: '#94A3B8',
                  '&:hover': {
                    backgroundColor: 'rgba(30, 73, 118, 0.5)',
                    color: '#60A5FA',
                  }
                }}
                className="text-gray-300 hover:text-blue-400 transition-all duration-200 p-1.5 hover:bg-[#1e4976]/50 rounded-full"
              >
                <EmojiEmotionsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </IconButton>
              {showEmojiPicker && (
                <ClickAwayListener onClickAway={() => setShowEmojiPicker(false)}>
                  <div className="absolute bottom-full mb-2 left-0 z-50 shadow-xl">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme="dark"
                      width={280}
                      height={350}
                    />
                  </div>
                </ClickAwayListener>
              )}
            </div>
          </div>

          <div className="flex-1 relative mx-1">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Handle typing status
                if (messagesId) {
                  updateTypingStatus(messagesId, userData.id, true);
                  // Clear previous timeout
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  // Set new timeout
                  typingTimeoutRef.current = setTimeout(() => {
                    updateTypingStatus(messagesId, userData.id, false);
                  }, 3000);
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#0a1929] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-shadow placeholder-gray-400 border border-[#1e4976] text-sm sm:text-base"
            />
          </div>

          <IconButton 
            onClick={sendMessage}
            disabled={!input.trim()}
            sx={{
              color: input.trim() ? '#94A3B8' : '#4B5563',
              '&:hover': input.trim() ? {
                backgroundColor: 'rgba(30, 73, 118, 0.5)',
                color: '#60A5FA',
              } : {},
              '&.Mui-disabled': {
                color: '#4B5563',
              }
            }}
            className="p-1.5 rounded-full transition-all duration-200 min-w-[40px]"
          >
            <SendIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </IconButton>
        </div>
        {loading && (
          <div className="text-xs text-gray-500 mt-1 ml-2 flex items-center">
            <CircularProgress size={12} className="mr-2" />
            Sending...
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className={`chat-welcome ${chatVisible ? "" : "hidden"} bg-[#0a1929]`}>
      <img 
        src={assets.logo_icon} 
        alt="" 
        className="w-24 h-24 opacity-60 hover:opacity-80 transition-opacity duration-300"
      />
      <p className="text-gray-400 font-light text-xl">Chat anytime, anywhere</p>
    </div>
  );
}

ChatBox.propTypes = {
  chat: PropTypes.shape({
    userData: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      avatar: PropTypes.string,
      lastSeen: PropTypes.number,
    }),
  }),
  messages: PropTypes.array,
  messagesId: PropTypes.string,
};

export default ChatBox;
