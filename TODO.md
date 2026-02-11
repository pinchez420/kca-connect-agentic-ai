# TODO: Edit Profile Implementation

## Step 1: Update api.js with user profile API functions ✅
- [x] Add updateUserProfile() function
- [x] Add uploadAvatar() function

## Step 2: Update backend/main.py with profile endpoints ✅
- [x] Add PUT /user/profile endpoint
- [x] Add POST /user/avatar endpoint

## Step 3: Update AuthContext.jsx with updateUser function ✅
- [x] Add updateUser function to refresh user state

## Step 4: Update ProfileModal.jsx with edit functionality ✅
- [x] Add edit mode state management
- [x] Add form fields (Course Name, Campus Branch, Contact Number, Avatar)
- [x] Add file upload with preview
- [x] Add save/cancel functionality
- [x] Connect to backend API

## Notes
- Avatar upload endpoint is ready but requires Supabase Storage bucket "avatars" to be configured
- Profile data is stored in Supabase user_metadata
- Contact number field is included for future notifications

