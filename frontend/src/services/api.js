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

export const chatWithAgentStream = async (message, token, onChunk, onComplete, onError, history = []) => {
    try {
        const historyParam = history.length > 0 ? `&history=${encodeURIComponent(JSON.stringify(history))}` : "";
        const response = await fetch(`${API_URL}/chat/stream?message=${encodeURIComponent(message)}${historyParam}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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

        if (onComplete) onComplete();
    } catch (error) {
        console.error("Error in streaming:", error);
        if (onError) onError("Sorry, I'm having trouble connecting to the server.");
    }
};
