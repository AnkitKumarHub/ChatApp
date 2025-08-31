import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout } from '../config/firebase';
import ProfileModal from './ProfileModal';

const ProfileDropdown = ({ onClose }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { userData } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.profile-dropdown')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="profile-dropdown absolute right-0 top-12 w-56 rounded-xl 
          bg-[#071226]/95 backdrop-blur-md border border-white/10 shadow-lg 
          shadow-black/20 overflow-hidden z-50"
      >
        {/* User Info */}
        <div className="px-4 py-3 border-b border-white/10">
          <p className="font-medium text-white">{userData?.name}</p>
          <p className="text-sm text-white/60">@{userData?.username}</p>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full px-4 py-2 text-left text-white/80 hover:bg-white/5 
              flex items-center gap-2 transition-colors"
          >
            <EditIcon fontSize="small" />
            Edit Profile
          </button>

          <div className="my-1 border-b border-white/10" />

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 
              flex items-center gap-2 transition-colors"
          >
            <LogoutIcon fontSize="small" />
            Logout
          </button>
        </div>
      </motion.div>

      <ProfileModal 
        open={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </>
  );
};

export default ProfileDropdown;

/* Test steps:
1. Click avatar in TopNavbar -> dropdown should appear
2. Click outside -> should close dropdown
3. Click Edit Profile -> should open ProfileModal
4. Click Settings -> should navigate to settings page
5. Click Logout -> should navigate to login page
*/
