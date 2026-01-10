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

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user_id: number;
    name: string;
    role: string;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;
    public userId: number | null = null;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
            const storedId = localStorage.getItem('userId');
            this.userId = storedId ? parseInt(storedId) : null;
        }
    }

    setAuth(token: string, userId: number) {
        this.token = token;
        this.userId = userId;
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
            localStorage.setItem('userId', userId.toString());
        }
    }

    logout() {
        this.token = null;
        this.userId = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
        }
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // --- Auth ---
    async login(email: string, password: string): Promise<AuthResponse> {
        const formData = new URLSearchParams();
        formData.append('username', email); // OAuth2 expects 'username'
        formData.append('password', password);

        const response = await fetch(`${this.baseUrl}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (!response.ok) throw new Error('Login failed');
        return await response.json();
    }

    async register(name: string, email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${this.baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) throw new Error('Registration failed');
        return await response.json();
    }

    // --- Chat ---
    async sendMessage(message: string): Promise<ChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, { // Removed user_id from path
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ message }),
            });

            if (response.status === 401) {
                this.logout();
                window.location.href = '/login';
                throw new Error('Unauthorized');
            }

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

    // --- Data ---
    async getUsers(): Promise<Array<{ id: number; name: string; email: string; role: string; created_at: string }>> {
        const response = await fetch(`${this.baseUrl}/users`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    }

    async getBalance(): Promise<BalanceResponse> {
        if (!this.userId) return { total_owed_to_you: 0, total_you_owe: 0, net_balance: 0, owed_to_you: [], you_owe: [] };

        try {
            const response = await fetch(`${this.baseUrl}/users/${this.userId}/balance`, {
                headers: this.getHeaders()
            });
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
        if (!this.userId) return { history: [] };

        try {
            const response = await fetch(`${this.baseUrl}/users/${this.userId}/history?limit=${limit}`, {
                headers: this.getHeaders()
            });
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
