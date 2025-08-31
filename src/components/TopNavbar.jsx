import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Avatar, IconButton } from '@mui/material';
import AddFriendModal from './AddFriendModal';
import ProfileDropdown from './ProfileDropdown';
import NotificationDropdown from './NotificationDropdown';
import { AppContext } from '../context/AppContext';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

// ✅ Reusable Navbar Icon Button
const NavButton = ({ icon, onClick, badge }) => (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
    <button
      onClick={onClick}
      className="w-11 h-11 flex items-center justify-center 
                 rounded-xl bg-[#1e293b]/80 hover:bg-[#1e293b] 
                 text-slate-300 hover:text-cyan-400 transition-all shadow-md"
    >
      {icon}
      {badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center 
                     bg-cyan-400 text-white text-xs font-bold rounded-full"
        >
          {badge}
        </motion.span>
      )}
    </button>
  </motion.div>
);

// ✅ Animated Search Bar
const SearchBar = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 260, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        className="relative"
      >
        <input
          type="text"
          placeholder="Search users..."
          className="w-full h-10 px-4 rounded-xl bg-[#1e293b] border border-cyan-400/20 
                     text-sm text-white placeholder-slate-400 
                     focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          autoFocus
        />
      </motion.div>
    )}
  </AnimatePresence>
);

const TopNavbar = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const { userData } = useContext(AppContext);

  // ✅ Subscribe to notifications and friend requests
  useEffect(() => {
    if (!userData?.id) {
      // console.log('No user data yet, skipping notification setup');
      return;
    }
    
    // console.log('Setting up notification listeners for user:', userData.id);    // Listen for friend requests
    const friendRequestsUnsubscribe = onSnapshot(
      query(
        collection(db, "friendRequests"),
        where("recipientId", "==", userData.id),
        where("status", "==", "pending")
      ),
      (snapshot) => {
        console.log('Friend requests updated:', snapshot.docs.length);
        const newRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'friendRequest',
          timestamp: doc.data().createdAt?.toDate() || new Date()
        }));
        setNotifications(prev => [...prev, ...newRequests]);
      },
      (error) => {
        console.error('Error in friend requests listener:', error);
      }
    );

    // Listen for user document updates (notifications array)
    const userDocUnsubscribe = onSnapshot(
      doc(db, "users", userData.id),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          console.log('User doc updated, notifications:', userData.notifications?.length);
          if (Array.isArray(userData.notifications)) {
            setNotifications(userData.notifications);
          }
        }
      },
      (error) => {
        console.error('Error in user doc listener:', error);
      }
    );

    // Cleanup both listeners
    return () => {
      console.log('Cleaning up notification listeners');
      friendRequestsUnsubscribe();
      userDocUnsubscribe();
    };
  }, [userData?.id]);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0f172a] border-b border-[#1e293b] px-6 
                    flex items-center justify-between shadow-lg z-50">
      {/* Logo */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent"
      >
        ChatApp
      </motion.h1>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <SearchBar visible={showSearch} />

          {/* Buttons */}
        <NavButton icon={<SearchIcon />} onClick={() => setShowSearch(!showSearch)} />
        <NavButton icon={<AddIcon />} onClick={() => setShowAddFriend(true)} />
        
        {/* Notification Button & Dropdown */}
        <div className="relative">
          <NavButton
            icon={<NotificationsIcon />}
            onClick={() => setShowNotifications(!showNotifications)}
            badge={notifications.length}
          />
          
          {/* Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                
                {/* Dropdown */}
                <NotificationDropdown
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                  userData={userData}
                />
              </>
            )}
          </AnimatePresence>
        </div>        {/* Profile Avatar */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Avatar
            src={userData?.avatar || null}
            alt={userData?.name || "User"}
            onClick={() => setShowProfile(!showProfile)}
            className="cursor-pointer w-10 h-10 ring-2 ring-cyan-400/20 hover:ring-cyan-400"
            sx={{
              bgcolor: userData?.avatar ? 'transparent' : '#60A5FA',
              color: 'white',
            }}
          >
            {!userData?.avatar && userData?.name ? userData.name.charAt(0).toUpperCase() : null}
          </Avatar>
        </motion.div>

        {/* Profile Menu */}
        <AnimatePresence>
          {showProfile && <ProfileDropdown onClose={() => setShowProfile(false)} />}
        </AnimatePresence>
      </div>

      {/* Add Friend Modal */}
      <AddFriendModal open={showAddFriend} onClose={() => setShowAddFriend(false)} />
    </nav>
  );
};

export default TopNavbar;
