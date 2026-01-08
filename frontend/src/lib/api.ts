// API client for Splitwise AI backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://splitwise-ai-77y1.onrender.com';

export interface ChatResponse {
    response: string;
    success: boolean;
    needs_clarification?: boolean;
    data?: {
        expense_id?: number;
        settlements?: Array<{
            from_name: string;
            to_name: string;
            amount: number;
        }>;
    };
}

export interface BalanceResponse {
    total_owed_to_you: number;
    total_you_owe: number;
    net_balance: number;
    owed_to_you: Array<{ user_id: number; name: string; amount: number }>;
    you_owe: Array<{ user_id: number; name: string; amount: number }>;
}

class ApiClient {
    private baseUrl: string;
    private userId: number = 1; // Default user

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    setUserId(userId: number) {
        this.userId = userId;
    }

    // Chat endpoint
    async sendMessage(message: string): Promise<ChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/chat/${this.userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Chat API error:', error);
            return {
                response: "Sorry, I couldn't process that. Please try again.",
                success: false,
            };
        }
    }

    // Get balance
    async getBalance(): Promise<BalanceResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/users/${this.userId}/balance`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Balance API error:', error);
            return {
                total_owed_to_you: 0,
                total_you_owe: 0,
                net_balance: 0,
                owed_to_you: [],
                you_owe: [],
            };
        }
    }

    // Get history
    async getHistory(limit: number = 50): Promise<{ history: Array<Record<string, unknown>> }> {
        try {
            const response = await fetch(`${this.baseUrl}/users/${this.userId}/history?limit=${limit}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('History API error:', error);
            return { history: [] };
        }
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const api = new ApiClient();
export default api;
