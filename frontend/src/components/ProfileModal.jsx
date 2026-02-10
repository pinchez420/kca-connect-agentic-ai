import React from 'react';

const ProfileModal = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  const userEmail = user?.email || 'student@kca.ac.ke';
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'KCA Student';
  
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

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
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex items-center justify-center">
              <div className="w-28 h-28 rounded-full premium-gradient-bg flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {initials}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              
              
              
                          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-primary">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border-primary text-text-primary hover:bg-bg-primary"
          >
            Close
          </button>
          <button
            className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
            disabled
            title="Editing not enabled yet"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
