import { uploadToCloudinary } from '../utils/cloudinary';

const upload = async (file) => {
    try {
        // Validate file
        if (!file) {
            throw new Error('No file provided');
        }
        
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        // Upload to Cloudinary
        const downloadURL = await uploadToCloudinary(file);
        return downloadURL;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};

export default upload;