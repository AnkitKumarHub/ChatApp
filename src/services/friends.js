import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function getAllUsersExcept(uid) {
  try {
    // console.log('getAllUsersExcept - Fetching users, excluding:', uid);
    
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    // Map and filter users
    const users = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          username: data.username,
          displayName: data.name,
          photoURL: data.avatar,
          ...data
        };
      })
      .filter(user => {
        const isValid = user.id && (user.email || user.username);
        const isNotCurrentUser = user.id !== uid;
        
        // console.log(`User ${user.email}:`, { 
        //   isValid, 
        //   isNotCurrentUser,
        // });
        
        return isValid && isNotCurrentUser;
      });

    // console.log('getAllUsersExcept - Found valid users:', {
    //   total: querySnapshot.size,
    //   filtered: users.length,
    //   sample: users.slice(0, 2).map(u => ({ id: u.id, email: u.email }))
    // });

    return users;
  } catch (error) {
    console.error('getAllUsersExcept error:', error);
    throw error; // Let the caller handle the error
  }
}

export async function getPendingMap(uid) {
  const sentSnap = await getDocs(query(
    collection(db,'friendRequests'), 
    where('senderId','==', uid), 
    where('status','==','pending')
  ));
  const recvSnap = await getDocs(query(
    collection(db,'friendRequests'), 
    where('recipientId','==', uid), 
    where('status','==','pending')
  ));
  const map = {};
  sentSnap.forEach(d => { const data = d.data(); map[data.recipientId] = true; });
  recvSnap.forEach(d => { const data = d.data(); map[data.senderId] = true; });
  return map;
}

export async function sendFriendRequest({ sender, recipientId }) {
  // Validate input parameters
  if (!sender?.uid) {
    console.error('Invalid sender data:', sender);
    throw new Error('Sender ID is required');
  }
  if (!recipientId) {
    throw new Error('Recipient ID is required');
  }

  // console.log('Creating friend request with data:', {
  //   senderId: sender.uid,
  //   senderName: sender.name,
  //   recipientId
  // });

  // Create the friend request document
  const friendRequestData = {
    senderId: sender.uid,
    senderName: sender.name,
    senderPhoto: sender.avatar || null, 
    recipientId,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

 
  const docRef = await addDoc(collection(db, 'friendRequests'), friendRequestData);
  // console.log('Friend request created with ID:', docRef.id);

  // Update recipient's notifications
  const recipientRef = doc(db, 'users', recipientId);
  const notificationData = {
    type: 'friendRequest',
    from: sender.uid,
    fromName: sender.name,
    timestamp: Date.now(),
    senderAvatar: sender.avatar || null,
  };

  await updateDoc(recipientRef, {
    notifications: arrayUnion(notificationData),
  });
}
