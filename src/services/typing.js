import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const updateTypingStatus = async (chatId, userId, isTyping) => {
  try {
    const chatRef = doc(db, 'messages', chatId);
    await updateDoc(chatRef, {
      [`typing.${userId}`]: isTyping ? Date.now() : null
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
};
