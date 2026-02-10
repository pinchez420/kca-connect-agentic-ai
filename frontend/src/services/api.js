const API_URL = "http://127.0.0.1:8000";

export const chatWithAgent = async (message) => {
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
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
