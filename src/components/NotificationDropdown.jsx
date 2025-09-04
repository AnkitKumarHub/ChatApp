import { useState } from 'react';
import { motion,  } from 'framer-motion';
import { Avatar } from '@mui/material';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayRemove, 
  getDoc,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-toastify';

const NotificationDropdown = ({ notifications, onClose, userData }) => {
  const [processingIds, setProcessingIds] = useState({});

  const handleAcceptRequest = async (notification) => {
    if (processingIds[notification.from]) return;
    
    try {
      setProcessingIds(prev => ({ ...prev, [notification.from]: true }));
      
      // Get sender's data
      const senderDoc = await getDoc(doc(db, 'users', notification.from));
      if (!senderDoc.exists()) {
        throw new Error('Sender not found');
      }

      // Add each other as friends
      const userRef = doc(db, 'users', userData.id);
      const senderRef = doc(db, 'users', notification.from);

      await Promise.all([
        // Add sender to current user's friends
        updateDoc(userRef, {
          friends: [...(userData.friends || []), notification.from],
          notifications: arrayRemove(notification)
        }),
        // Add current user to sender's friends
        updateDoc(senderRef, {
          friends: [...(senderDoc.data().friends || []), userData.id]
        })
      ]);

      // Delete the friend request document
      const requestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', notification.from),
        where('recipientId', '==', userData.id),
        where('status', '==', 'pending')
      );
      const requestDocs = await getDocs(requestQuery);
      await Promise.all(requestDocs.docs.map(doc => deleteDoc(doc.ref)));

      toast.success('Friend request accepted!', {
        position: "top-right",
        theme: "dark"
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request', {
        position: "top-right",
        theme: "dark"
      });
    } finally {
      setProcessingIds(prev => ({ ...prev, [notification.from]: false }));
    }
  };

  const handleRejectRequest = async (notification) => {
    if (processingIds[notification.from]) return;
    
    try {
      setProcessingIds(prev => ({ ...prev, [notification.from]: true }));

      // Remove notification
      const userRef = doc(db, 'users', userData.id);
      await updateDoc(userRef, {
        notifications: arrayRemove(notification)
      });

      // Delete the friend request document
      const requestQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', notification.from),
        where('recipientId', '==', userData.id),
        where('status', '==', 'pending')
      );
      const requestDocs = await getDocs(requestQuery);
      await Promise.all(requestDocs.docs.map(doc => deleteDoc(doc.ref)));

      toast.info('Friend request rejected', {
        position: "top-right",
        theme: "dark"
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request', {
        position: "top-right",
        theme: "dark"
      });
    } finally {
      setProcessingIds(prev => ({ ...prev, [notification.from]: false }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute top-16 right-0 w-80 max-h-[32rem] bg-[#0f172a] rounded-xl 
                 shadow-2xl border border-white/10 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-[#1e293b]">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <motion.div
              key={notification.timestamp}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <Avatar
                  src={notification.senderAvatar}
                  alt={notification.fromName}
                  className="w-12 h-12 ring-2 ring-cyan-400/30"
                  imgProps={{
                    onError: (e) => {
                      e.target.src = '/public/default-avatar.png';
                    },
                  }}
                />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-semibold">{notification.fromName}</span>
                    {' sent you a friend request'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={processingIds[notification.from]}
                  onClick={() => handleAcceptRequest(notification)}
                  className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500
                           text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-400/20
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {processingIds[notification.from] ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Accept'
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={processingIds[notification.from]}
                  onClick={() => handleRejectRequest(notification)}
                  className="flex-1 py-2 px-4 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium
                           hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {processingIds[notification.from] ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Reject'
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <svg
              className="w-16 h-16 mb-4 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-lg font-medium">No new notifications</p>
            <p className="text-sm opacity-60 mt-1">You're all caught up!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationDropdown;
