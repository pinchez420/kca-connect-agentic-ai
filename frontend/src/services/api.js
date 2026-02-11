const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const chatWithAgent = async (message, token, history = []) => {
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ message, history }),
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("Error communicating with backend:", error);
        return "Sorry, I'm having trouble connecting to the server.";
    }
};

export const chatWithAgentStream = async (message, token, onChunk, onComplete, onError, history = [], abortSignal = null, onAbort = null) => {
    try {
        const historyParam = history.length > 0 ? `&history=${encodeURIComponent(JSON.stringify(history))}` : "";
        
        const response = await fetch(`${API_URL}/chat/stream?message=${encodeURIComponent(message)}${historyParam}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            signal: abortSignal
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let doneReceived = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    
                    if (data === "[DONE]") {
                        doneReceived = true;
                        if (onComplete) onComplete();
                        return;
                    }
                    if (data.startsWith("ERROR:")) {
                        if (onError) onError(data.slice(6));
                        return;
                    }
                    if (onChunk) onChunk(data);
                }
            }
        }
        
        if (onComplete && !doneReceived) {
            onComplete();
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            if (onAbort) onAbort();
            return;
        }
        console.error("Error in streaming:", error);
        if (onError) onError("Sorry, I'm having trouble connecting to the server.");
    }
};

// ============ Chat History API ============

export const getChats = async (token, limit = 50, offset = 0, savedOnly = false) => {
    try {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            saved_only: savedOnly.toString()
        });
        
        const response = await fetch(`${API_URL}/chats?${params}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch chats: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching chats:", error);
        return { chats: [], total: 0 };
    }
};

export const getChat = async (token, chatId) => {
    try {
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch chat");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching chat:", error);
        return null;
    }
};

export const createChat = async (token, messages, title = null) => {
    try {
        const response = await fetch(`${API_URL}/chats`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ messages, title }),
        });

        if (!response.ok) {
            throw new Error("Failed to create chat");
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating chat:", error);
        return null;
    }
};

export const updateChat = async (token, chatId, data) => {
    try {
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error("Failed to update chat");
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating chat:", error);
        return null;
    }
};

export const deleteChat = async (token, chatId) => {
    try {
        const response = await fetch(`${API_URL}/chats/${chatId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to delete chat");
        }

        return true;
    } catch (error) {
        console.error("Error deleting chat:", error);
        return false;
    }
};

export const toggleSaveChat = async (token, chatId) => {
    try {
        const response = await fetch(`${API_URL}/chats/${chatId}/save`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to toggle save status");
        }

        return await response.json();
    } catch (error) {
        console.error("Error toggling save status:", error);
        return null;
    }
};

export const getSavedChats = async (token, limit = 50, offset = 0) => {
    return getChats(token, limit, offset, true);
};

export const autoSaveChat = async (token, messages, title = null, chatId = null) => {
    try {
        const response = await fetch(`${API_URL}/auto-save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ messages, title, chat_id: chatId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to auto-save chat");
        }

        return await response.json();
    } catch (error) {
        console.error("Error in auto-save:", error);
        throw error;
    }
};

// ============ User Profile API ============

export const updateUserProfile = async (token, profileData) => {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to update profile");
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
};

export const uploadAvatar = async (token, file) => {
    try {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await fetch(`${API_URL}/user/avatar`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to upload avatar");
        }

        return await response.json();
    } catch (error) {
        console.error("Error uploading avatar:", error);
        throw error;
    }
};
