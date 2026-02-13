import React, { useState, useEffect } from 'react';
import { updateUserProfile, uploadAvatar } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const ProfileModal = ({ isOpen, onClose, onAvatarUpdate }) => {
  const { user, updateUser: refreshUserFromContext } = useAuth();
  
  // Use the callback if provided, otherwise fallback to context
  const updateUser = refreshUserFromContext;
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  
  // Sync currentUser with context user
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    course_name: '',
    campus_branch: '',
    contact_number: '',
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Initialize form data when user changes
  useEffect(() => {
    if (currentUser) {
      const metadata = currentUser.user_metadata || {};
      setFormData({
        full_name: metadata.full_name || metadata.name || '',
        course_name: metadata.course_name || '',
        campus_branch: metadata.campus_branch || '',
        contact_number: metadata.contact_number || '',
      });
    }
  }, [currentUser]);

  // Get auth token from Supabase session
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  if (!isOpen || !currentUser) return null;

  const userEmail = currentUser.email || 'student@kca.ac.ke';
  const userName = formData.full_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || 'KCA Student';
  
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const campusBranchOptions = [
    { value: '', label: 'Select Campus' },
    { value: 'main', label: 'Main' },
    { value: 'kitengela', label: 'Kitengela' },
    { value: 'town', label: 'Town' },
    { value: 'western', label: 'Western' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset form to original values
    const metadata = currentUser?.user_metadata || {};
    setFormData({
      full_name: metadata.full_name || metadata.name || '',
      course_name: metadata.course_name || '',
      campus_branch: metadata.campus_branch || '',
      contact_number: metadata.contact_number || '',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get fresh auth token from Supabase session
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }
      
      // Update profile data
      const profileData = {
        full_name: formData.full_name,
        course_name: formData.course_name,
        campus_branch: formData.campus_branch,
        contact_number: formData.contact_number,
      };

      await updateUserProfile(token, profileData);

      // Upload avatar if selected
      if (avatarFile) {
        await uploadAvatar(token, avatarFile);
      }

      // Update local state with new avatar URL (from preview or metadata)
      const newAvatarUrl = avatarPreview || currentUser?.user_metadata?.avatar_url;
      if (newAvatarUrl) {
        setCurrentUser(prev => ({
          ...prev,
          user_metadata: {
            ...prev?.user_metadata,
            avatar_url: newAvatarUrl
          }
        }));
        
        // Call the callback to update avatar in parent component
        if (onAvatarUpdate) {
          onAvatarUpdate(newAvatarUrl);
        }
      }

      // Refresh user data from context
      await refreshUserFromContext();
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditing(false);
        setSuccess(null);
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl bg-bg-secondary border border-border-primary shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-text-primary">My Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                {avatarPreview || currentUser?.user_metadata?.avatar_url ? (
                  <img 
                    src={avatarPreview || currentUser.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-28 h-28 rounded-full object-cover border-4 border-indigo-200 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowFullAvatar(true)}
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full premium-gradient-bg flex items-center justify-center text-white font-bold text-2xl shadow-md">
                    {initials}
                  </div>
                )}
                
                {isEditing && (
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              
              {isEditing && (avatarPreview || currentUser?.user_metadata?.avatar_url) && (
                <button
                  onClick={handleRemoveAvatar}
                  className="mt-2 text-xs text-red-500 hover:text-red-600"
                >
                  Remove photo
                </button>
              )}
              
              {isEditing && avatarFile && (
                <p className="mt-1 text-xs text-text-secondary truncate max-w-24">
                  {avatarFile.name}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isEditing ? (
                <>
                  {/* Edit Mode Fields */}
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Email</label>
                    <div className="w-full p-3 rounded-lg bg-bg-primary border border-border-primary text-text-secondary break-all">
                      {userEmail}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Course Name</label>
                    <input
                      type="text"
                      name="course_name"
                      value={formData.course_name}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Bachelor of Science in Computer Science"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Campus Branch</label>
                    <select
                      name="campus_branch"
                      value={formData.campus_branch}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {campusBranchOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Contact Number</label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleInputChange}
                      className="w-full p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., +254 700 000 000"
                    />
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Full Name</label>
                    <div className="p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary">
                      {userName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Email</label>
                    <div className="p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary break-all">
                      {userEmail}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Course Name</label>
                    <div className="p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary">
                      {currentUser?.user_metadata?.course_name || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Campus Branch</label>
                    <div className="p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary">
                      {currentUser?.user_metadata?.campus_branch || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-text-secondary mb-1">Contact Number</label>
                    <div className="p-3 rounded-lg bg-bg-primary border border-border-primary text-text-primary">
                      {currentUser?.user_metadata?.contact_number || '-'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-primary">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-border-primary text-text-primary hover:bg-bg-primary"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border-primary text-text-primary hover:bg-bg-primary"
              >
                Close
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
              >
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Full Size Avatar Lightbox */}
      {showFullAvatar && (avatarPreview || currentUser?.user_metadata?.avatar_url) && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setShowFullAvatar(false)}
        >
          <img 
            src={avatarPreview || currentUser.user_metadata.avatar_url} 
            alt="Full Profile" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setShowFullAvatar(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileModal;

