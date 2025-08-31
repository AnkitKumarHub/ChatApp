import { useState } from "react";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PersonIcon from "@mui/icons-material/Person";
import { signup, login, resetPass } from "../../config/firebase";
import { toast } from 'react-toastify';

const uploadToCloudinary = async (file) => {
  const cloudinaryData = new FormData();
  cloudinaryData.append('file', file);
  cloudinaryData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: cloudinaryData,
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to upload avatar');
  }

  if (!data.secure_url) {
    throw new Error('No URL received from Cloudinary');
  }

  return data.secure_url;
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar: null,
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please upload a valid image file.");
      return;
    }
    setAvatarError("");
    setFormData((prev) => ({ ...prev, avatar: file }));
    setAvatarPreview(URL.createObjectURL(file));
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match!");
          setIsLoading(false);
          return;
        }

        let avatarUrl = "";
        if (formData.avatar) {
          avatarUrl = await uploadToCloudinary(formData.avatar);
        }

        const result = await signup(
          formData.username,
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName,
          avatarUrl
        );

        if (result?.error) {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin((prev) => !prev);
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      avatar: null,
    });
    setAvatarPreview(null);
    setAvatarError("");
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute w-[500px] h-[500px] bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-3xl opacity-30 top-[-100px] left-[-150px]" />
      <div className="absolute w-[400px] h-[400px] bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-3xl opacity-30 bottom-[-120px] right-[-150px]" />

      {/* Glassmorphic Card */}
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-8">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {isLogin ? "Sign in to your account" : "Create an account"}
        </h2>

        {/* Avatar (signup only) */}
        {!isLogin && (
          <div className="relative w-32 h-32 mx-auto mb-6">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-32 h-32 rounded-full object-cover border border-gray-600 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border border-gray-600 bg-gradient-to-b from-gray-700 to-gray-600 shadow-md flex items-center justify-center">
                <PersonIcon style={{ fontSize: "3rem" }} className="text-white" />
              </div>
            )}

            <label
              htmlFor="avatarInput"
              className="absolute bottom-1 right-1 p-2 bg-black/60 rounded-full cursor-pointer hover:bg-black/80 transition"
            >
              <CameraAltIcon className="text-white" fontSize="small" />
              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>

            {avatarError && (
              <p className="text-red-400 text-xs mt-2 text-center">{avatarError}</p>
            )}
          </div>
        )}

        {/* Single reusable form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="flex gap-2">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="First Name"
                className="w-1/2 px-4 py-2 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Last Name"
                className="w-1/2 px-4 py-2 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          )}

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email address"
            required
            className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          {!isLogin && (
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Username"
              required
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          )}

          {/* Password with toggle */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Password"
              required
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </button>
          </div>

          {!isLogin && (
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm Password"
              required
              className="w-full px-4 py-2 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold transition
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-lg'}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isLogin ? "Signing In..." : "Creating Account..."}
              </div>
            ) : (
              isLogin ? "Sign In" : "Sign Up"
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
          <p>
            {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={toggleForm}
              className="text-indigo-400 hover:underline transition"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>

          {/* Forgot password */}
          {isLogin && (
            <p>
              Forgot Password?{" "}
              <button
                type="button"
                onClick={() => resetPass(formData.email)}
                className="text-red-400 hover:underline transition"
              >
                Click here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
