import { motion } from 'framer-motion';
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const WelcomeScreen = ({ onFindFriends }) => {
  const { userData } = useContext(AppContext);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-4"
    >
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Welcome, {userData?.name || 'Friend'} 👋
      </h1>
      
      <p className="text-white/60 mb-8 max-w-md">
        Start a conversation or search for new friends
      </p>

      <button
        onClick={onFindFriends}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-medium text-white
          hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
      >
        Find Friends
      </button>
    </motion.div>
  );
};

export default WelcomeScreen;


