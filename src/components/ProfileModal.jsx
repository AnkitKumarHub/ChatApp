import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { IconButton, Avatar, CircularProgress } from '@mui/material';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const ProfileModal = ({ open, onClose }) => {
  const { userData, setUserData } = useContext(AppContext);
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    bio: userData?.bio || '',
    avatar: userData?.avatar,
    password: '',
    confirmPassword: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form data when modal opens or userData changes
  useEffect(() => {
    if (open && userData) {
      setFormData({
        name: userData.name || '',
        bio: userData.bio || '',
        avatar: userData.avatar,
        password: '',
        confirmPassword: ''
      });
      setAvatarFile(null);
    }
  }, [open, userData]);

  const uploadImageToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload image');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      setFormData(prev => ({
        ...prev,
        avatar: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSubmitting) {
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (formData.bio.length > 250) {
      toast.error('Bio must be less than 250 characters');
      return;
    }

    // Password validation
    if (formData.password) {
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    setIsSubmitting(true);
    try {
      let updatedAvatarUrl = formData.avatar;

      if (avatarFile) {
        try {
          updatedAvatarUrl = await uploadImageToCloudinary(avatarFile);
        } catch (error) {
          toast.error(error.message || 'Failed to upload image');
          setLoading(false);
          setIsSubmitting(false);
          return;
        }
      }

      // Update Firebase user profile
      const updatedUserData = {
        name: formData.name,
        bio: formData.bio,
        avatar: updatedAvatarUrl
      };

      await updateDoc(doc(db, "users", userData.id), updatedUserData);

      // Update password if provided
      if (formData.password) {
        const user = auth.currentUser;
        if (user) {
          await updatePassword(user, formData.password);
        }
      }

      // Update local context with new data
      setUserData(prevData => ({
        ...prevData,
        ...updatedUserData
      }));

      toast.success('Profile updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div 
          className="fixed inset-0 z-50" 
          onClick={(e) => {
            // console.log('Outer container clicked');
            e.stopPropagation();
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              // console.log('Backdrop clicked', e.target === e.currentTarget);
              if (e.target === e.currentTarget) {
                onClose();
              }
              e.stopPropagation();
            }}
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-[#0a1929] rounded-2xl p-6
                  border border-[#1e4976] shadow-xl"
                onClick={(e) => {
                  // console.log('Modal content area clicked');
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  // console.log('Modal content area mousedown');
                  e.stopPropagation();
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#f8fafc]">Edit Profile</h2>
                  <IconButton 
                    onClick={onClose} 
                    size="small" 
                    sx={{
                      color: '#94A3B8',
                      '&:hover': {
                        backgroundColor: 'rgba(30, 73, 118, 0.5)',
                        color: '#60A5FA',
                      },
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <Avatar
                    src={formData.avatar || null}
                    alt={formData.name}
                    sx={{ 
                      width: 100, 
                      height: 100,
                      bgcolor: formData.avatar ? 'transparent' : '#60A5FA',
                      fontSize: '2.5rem',
                      fontWeight: 'medium'
                    }}
                    className="ring-2 ring-[#1e4976]"
                  >
                    {!formData.avatar && formData.name ? formData.name.charAt(0).toUpperCase() : null}
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-[#0a1929]/80 
                    opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full
                    ring-2 ring-[#1e4976] hover:ring-[#60A5FA]">
                    <CloudUploadIcon sx={{ color: '#94A3B8' }} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-[#94A3B8]">Click to change avatar</p>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#0a1929] border border-[#1e4976] 
                    text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]
                    transition-colors"
                  placeholder="Your name"
                  required
                />
              </div>

              {/* Bio Input */}
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#0a1929] border border-[#1e4976] 
                    text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]
                    resize-none h-24 transition-colors"
                  placeholder="Tell us about yourself"
                  maxLength={250}
                />
                <p className="text-sm text-[#94A3B8] mt-1">
                  {formData.bio.length}/250 characters
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#0a1929] border border-[#1e4976] 
                    text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]
                    transition-colors"
                  placeholder="Enter new password (optional)"
                />
              </div>

              {/* Confirm Password Input */}
              {formData.password && (
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg bg-[#0a1929] border border-[#1e4976] 
                      text-[#f8fafc] placeholder-[#64748b] focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]
                      transition-colors"
                    placeholder="Confirm your new password"
                    required={formData.password.length > 0}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isSubmitting}
                className="w-full py-3 rounded-lg bg-[#1e4976] hover:bg-[#60A5FA]
                  text-[#f8fafc] font-medium
                  focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:ring-offset-2 
                  focus:ring-offset-[#0a1929] transition-all duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed 
                  flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ color: '#f8fafc' }} />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

ProfileModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default ProfileModal;

/* Test steps:
1. Click avatar in TopNavbar -> ProfileDropdown -> Edit Profile
2. Try submitting empty name -> should show error
3. Enter bio > 250 chars -> should show error
4. Upload new avatar -> should show preview
5. Submit form -> should show loading state
6. Success/error toasts should appear
*/
