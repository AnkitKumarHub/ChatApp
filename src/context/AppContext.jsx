import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { createContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';

export const AppContext = createContext()

const AppContextProvider = (props) => {

    const [userData, setUserData] = useState(null);
    const [chatData, setChatData] = useState(null);
    const [messagesId, setMessagesId] = useState(null);
    const [messages, setMessages] = useState([])
    const [chatUser, setChatUser] = useState(null);
    const [chatVisible,setChatVisible] = useState(false);
    const navigate = useNavigate();

    const loadUserData = async (uid) => {
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            setUserData(userData);
            if (userData.avatar && userData.name) {
                navigate('/chat');
            }
            else {
                navigate('/profile')
            }
            await updateDoc(userRef, {
                lastSeen: Date.now()
            })
            setInterval(async () => {
                if (auth.chatUser) {
                    await updateDoc(userRef, {
                        lastSeen: Date.now()
                    })
                }
            }, 60000);
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (userData) {
            const chatRef = doc(db, 'chats', userData.id)
            const unSub = onSnapshot(chatRef, async (res) => {
                const data = res.data();
                if (!data || !Array.isArray(data.chatsData)) {
                    // If no data or chatsData is not an array, set empty array
                    setChatData([]);
                    return;
                }
                const chatItems = data.chatsData;
                const tempData = [];
                for (const item of chatItems) {
                    if (!item || !item.rId) continue; // Skip invalid items
                    const userRef = doc(db, "users", item.rId);
                    const userSnap = await getDoc(userRef);
                    const userData = userSnap.data();
                    if (userData) {
                        tempData.push({ ...item, userData });
                    }
                }
                setChatData(tempData.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
            })

            return () => {
                unSub();
            }
        }
    }, [userData])



    useEffect(() => {
        if (userData) {
            const interval = setInterval(async () => {
                try {
                    const chatRef = doc(db, 'chats', userData.id);
                    const snapshot = await getDoc(chatRef);
                    const data = snapshot.data();
                    
                    if (!data || !Array.isArray(data.chatsData)) {
                        setChatData([]);
                        return;
                    }
                    
                    const chatItems = data.chatsData;
                    const tempData = [];
                    
                    for (const item of chatItems) {
                        if (!item || !item.rId) continue;
                        const userRef = doc(db, "users", item.rId);
                        const userSnap = await getDoc(userRef);
                        const userData = userSnap.data();
                        if (userData) {
                            tempData.push({ ...item, userData });
                        }
                    }
                    
                    setChatData(tempData.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
                } catch (error) {
                    console.error('Error fetching chat data:', error);
                }
            }, 10000);

            // Cleanup interval on unmount
            return () => clearInterval(interval);
        }
    }, [userData])

    const value = {
        userData,setUserData,
        loadUserData,
        chatData,
        messagesId,
        setMessagesId,
        chatUser, setChatUser,
        chatVisible,setChatVisible,
        messages,setMessages
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )

}

AppContextProvider.propTypes = {
    children: PropTypes.node.isRequired
};

export default AppContextProvider;