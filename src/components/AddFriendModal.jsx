import { useState, useContext, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';
import { getAllUsersExcept, getPendingMap, sendFriendRequest } from '../services/friends';
import { IconButton, Avatar } from '@mui/material';
import PropTypes from 'prop-types';


const AddFriendModal = ({ open, onClose }) => {
  const { userData } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [requestSending, setRequestSending] = useState({});
  const [pendingRequests, setPendingRequests] = useState({});

  // Load users + pending requests + existing friends
  useEffect(() => {
    // console.log('AddFriendModal - Effect triggered', { 
    //   open, 
    //   hasUserData: !!userData,
    //   userId: userData?.id,
    //   userEmail: userData?.email 
    // });
    
    if (!open) {
      // console.log('AddFriendModal - Modal is closed, skipping fetch');
      return;
    }

    if (!userData?.id) {
      // console.log('AddFriendModal - No user ID found in userData:', userData);
      return;
    }
    
    let cancelled = false;

    const fetchUsers = async () => {
      // console.log('AddFriendModal - Starting data fetch for user:', userData.id);
      setLoading(true);
      
      try {
        // console.log('AddFriendModal - Fetching users and pending requests...');
        
        const [allUsers, pendingMap] = await Promise.all([
          getAllUsersExcept(userData.id),
          getPendingMap(userData.id),
        ]);

        if (cancelled) {
          // console.log('AddFriendModal - Operation cancelled');
          return;
        }

        // console.log('AddFriendModal - Raw data:', {
        //   allUsersCount: allUsers.length,
        //   sampleUsers: allUsers.slice(0,3),
        //   pendingRequestsCount: Object.keys(pendingMap).length
        // });

        // Filter: exclude friends and pending (both directions)
        const availableUsers = allUsers.filter(user => {
          // Skip invalid users
          if (!user?.id || !user?.email) {
            // console.log('Skipping invalid user:', user);
            return false;
          }

          const isNotMe = user.id !== userData.id;
          const isNotFriend = !userData.friends?.includes(user.id);
          const isNotPending = !pendingMap[user.id];
          
          // console.log(`Filtering user ${user.email}:`, {
          //   isNotMe,
          //   isNotFriend,
          //   isNotPending
          // });
          
          return isNotMe && isNotFriend && isNotPending;
        });

        // console.log('AddFriendModal - Final available users:', {
        //   count: availableUsers.length,
        //   users: availableUsers.map(u => ({ id: u.id, email: u.email }))
        // });

        setPendingRequests(pendingMap);
        setUsers(availableUsers);
      } catch (err) {
        // console.error('AddFriendModal - Error fetching users:', err);
        setUsers([]); 
      } finally {
        if (!cancelled) {
          setLoading(false);
          // console.log('AddFriendModal - Finished loading');
        }
      }
    };

    fetchUsers();
    return () => { 
      cancelled = true;
      // console.log('AddFriendModal - Cleanup triggered');
    };
  }, [open, userData?.id]); // Only depend on open state and user ID

  //  Filter search results
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q)
    );
  }, [searchQuery, users]);

  //  Send Friend Request
  const handleSendRequest = async (recipientId) => {
    setRequestSending(prev => ({...prev, [recipientId]: true}));
    try {
      // console.log('Sending friend request with data:', {
      //   sender: {
      //     uid: userData.id,
      //     name: userData.displayName || userData.name || userData.username,
      //     avatar: userData.photoURL || userData.avatar
      //   },
      //   recipientId
      // });

      await sendFriendRequest({
        sender: { 
          uid: userData.id,
          name: userData.displayName || userData.name || userData.username,
          avatar: userData.photoURL || userData.avatar
        },
        recipientId
      });

      // Update UI to show success state
      setPendingRequests(prev => ({ ...prev, [recipientId]: true }));
      
      // Remove user from the list with animation
      setUsers(prev => prev.filter(u => u.id !== recipientId));
      
      // Show success toast
      toast.success('Friend request sent successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark"
      });

    } catch (err) {
      console.error('sendFriendRequest error', err);
      toast.error('Failed to send friend request', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark"
      });
    } finally {
      setRequestSending(prev => ({...prev, [recipientId]: false}));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4 py-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#0f172a] rounded-2xl shadow-2xl 
                     border border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                Add Friends
              </h2>
              <IconButton
                onClick={onClose}
                className="text-white/80 hover:text-red-400 hover:bg-red-400/10 
                          transition-all duration-200"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <CloseIcon className="text-xl" />
              </IconButton>
            </div>

            {/* Search */}
            <div className="relative p-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-12 px-5 pr-12 rounded-xl bg-[#1e293b] border border-white/10 
                           text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 
                           focus:ring-1 focus:ring-cyan-400 transition-all"
              />
              <SearchIcon className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>

            {/* User List */}
            <div className="px-6 pb-6 max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1e293b]">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-slate-400"
                >
                  <div className="animate-spin h-8 w-8 border-4 border-cyan-400 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-lg font-medium">Loading users...</p>
                  <p className="text-sm opacity-60 mt-1">This may take a moment</p>
                </motion.div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl 
                             bg-white/5 hover:bg-white/10 transition-colors mb-3"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={user.photoURL || user.avatar}
                        alt={user.displayName || user.username}
                        className="w-12 h-12 ring-2 ring-cyan-400/30"
                      />
                      <h3 className="text-white font-medium capitalize">
                        {user.displayName || user.username || user.email?.split('@')[0]}
                      </h3>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSendRequest(user.id)}
                      disabled={requestSending[user.id] || pendingRequests[user.id]}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${pendingRequests[user.id]
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-400 to-indigo-400 text-white hover:shadow-lg hover:shadow-cyan-400/20'
                        }`}
                    >
                      {requestSending[user.id] ? (
                        // Loading spinner while sending request
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : pendingRequests[user.id] ? (
                        // Checkmark icon when request is sent
                        <motion.svg 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-5 h-5 text-emerald-400" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2.5} 
                            d="M5 13l4 4L19 7" 
                          />
                        </motion.svg>
                      ) : (
                        // Plus icon for sending new request
                        <motion.svg 
                          whileHover={{ rotate: 90 }}
                          transition={{ duration: 0.2 }}
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                          />
                        </motion.svg>
                      )}
                    </motion.button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <p className="text-lg font-medium">No new users available</p>
                  <p className="text-sm opacity-60">Try searching with a different name/email</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

AddFriendModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AddFriendModal;
