import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const UploadModal = ({ isOpen, onClose, onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('');

    const onDrop = useCallback((acceptedFiles) => {
        // Basic validation
        const validFiles = acceptedFiles.filter(file => {
            const type = file.type;
            return (
                type === 'application/pdf' ||
                type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                type === 'text/plain'
            );
        });

        if (validFiles.length !== acceptedFiles.length) {
            setErrorMessage("some files were ignored. Only PDF, DOCX, and TXT are supported.");
        } else {
            setErrorMessage('');
        }

        setFiles(prev => [...prev, ...validFiles]);
        setUploadStatus(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        }
    });

    const removeFile = (fileToRemove) => {
        setFiles(files.filter(file => file !== fileToRemove));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setUploadStatus(null);
        setErrorMessage('');

        try {
            const token = localStorage.getItem('sb-access-token'); // Assuming Supabase token storage key
            // If token key is different, you might need to check Auth.jsx or Context

            if (!token) {
                throw new Error("You must be logged in to upload files.");
            }

            // Upload files sequentially
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('http://localhost:8000/documents/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `Failed to upload ${file.name}`);
                }
            }

            setUploadStatus('success');
            setFiles([]);
            if (onUploadComplete) onUploadComplete();

            // Auto close after success?
            setTimeout(() => {
                onClose();
                setUploadStatus(null);
            }, 2000);

        } catch (error) {
            console.error('Upload failed:', error);
            setUploadStatus('error');
            setErrorMessage(error.message);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Upload Documents</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'}
          `}
                >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">
                        {isDragActive ? "Drop files here..." : "Drag & drop files here, or click to select"}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Supported: PDF, DOCX, TXT</p>
                </div>

                {errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        {errorMessage}
                    </div>
                )}

                {files.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <File size={16} className="text-primary-500 shrink-0" />
                                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                                </div>
                                <button onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700 ml-2">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {uploadStatus === 'success' && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
                        <CheckCircle size={16} />
                        Upload complete! Processing files...
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                        className={`px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2
                ${(files.length === 0 || uploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-700'}
            `}
                    >
                        {uploading ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            'Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
