# ChatApp - Real-time Chat Application

A modern real-time chat application built with React, Vite, Firebase, and Tailwind CSS. Connect with friends, share messages, and communicate seamlessly in a secure environment.

## Features

- 🔐 User Authentication with Firebase
- 💬 Real-time messaging
- 👥 Add and manage friends
- 🖼️ Profile customization with image upload
- 🔔 Real-time notifications
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Backend:** Firebase
- **Image Upload:** Cloudinary
- **Authentication:** Firebase Auth

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/AnkitKumarHub/ChatApp.git
   cd chat-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables with your own values:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Key Features Explained

- **Real-time Chat:** Instant messaging with real-time updates using Firebase Realtime Database
- **Friend Management:** Add friends and manage your friend list
- **Profile Customization:** Upload profile pictures and update user information
- **Notifications:** Get instant notifications for new messages and friend requests
- **Secure Authentication:** User authentication handled by Firebase Auth
- **Responsive Design:** Works seamlessly on desktop and mobile devices

## Project Structure

```
src/
├── components/     # Reusable UI components
├── context/       # React context for state management
├── pages/         # Main application pages
├── services/      # Firebase and API services
├── config/        # Configuration files
└── utils/         # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

