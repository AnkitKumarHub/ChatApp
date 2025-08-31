
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut} from 'firebase/auth'
import { collection, doc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore'
import { toast } from "react-toastify";



const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const signup = async (username, email, password, firstName, lastName, avatarUrl = "") => {
    try {
        // First check if username exists
        const usersRef = collection(db,'users')
        const q = query(usersRef, where("username", "==", username.toLowerCase()))
        const querySnapshot = await getDocs(q)
        if(querySnapshot.docs.length > 0){
            toast.error("Username already taken")
            return { error: "USERNAME_TAKEN" };
        }

        
        const res = await createUserWithEmailAndPassword(auth, email, password)
        const user = res.user

        const timestamp = Date.now();
        
        
        await setDoc(doc(db, "users", user.uid), {
            // Required fields
            id: user.uid,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            name: `${firstName} ${lastName}`.trim(),
            
            // Profile fields
            avatar: avatarUrl || null,
            bio: "Hey, There I am using chat app",
            
            // Status & preferences
            isOnline: true,
            lastSeen: timestamp,
            notifications: [], 
            
            // Social connections
            friends: [], 
            friendRequests: {
                sent: [], 
                received: [], 
            },
            
            // Metadata
            createdAt: timestamp,
            updatedAt: timestamp,
            
            // Chat preferences 
            status: "available", 
            theme: "dark", 
            language: "en", 
        });

       
        await setDoc(doc(db, "chats", user.uid), {
            chatsData: [],
            lastMessageAt: timestamp
        });

        return { success: true, user: res.user };
    } catch (error) {
        console.error("Signup error:", error);
        toast.error(error.code.split('/')[1].split('-').join(" "))
        return { error: error.code };
    }
}

const login = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
        console.error(error)
        toast.error(error.code.split('/')[1].split('-').join(" "))
    }
}

const logout = () => {
    signOut(auth)
}

const resetPass = async (email) => {
    if (!email) {
        toast.error("Enter your email")
        return null
    }
    try {
        const userRef = collection(db, "users")
        const q = query(userRef, where("email", "==", email))
        const querySnap = await getDocs(q)
        if (!querySnap.empty) {
            await sendPasswordResetEmail(auth,email)
            toast.success("Reset Email Sent")
        }
        else {
            toast.error("Email doesn't exists")
        }
    } catch (error) {
        console.error(error)
        toast.error(error.message)
    }
   
}

export { auth, db, login, signup, logout, resetPass};