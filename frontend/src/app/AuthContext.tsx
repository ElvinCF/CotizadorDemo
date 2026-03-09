import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "vendedor" | "admin";

interface AuthState {
    isAuthenticated: boolean;
    role: Role | null;
    username: string | null;
}

interface AuthContextType extends AuthState {
    login: (username: string, pin: string) => boolean;
    logout: () => void;
}

const defaultState: AuthState = {
    isAuthenticated: false,
    role: null,
    username: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<AuthState>(defaultState);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Attempt to load from localStorage on mount
        const stored = localStorage.getItem("auth_session");
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as AuthState;
                if (parsed.isAuthenticated) {
                    setAuth(parsed);
                }
            } catch (e) {
                console.error("Failed to parse auth_session", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const login = (username: string, pin: string): boolean => {
        // Hardcoded simple authentication
        // vendedor: 1234
        // admin: 123456
        const userLower = username.trim().toLowerCase();

        // Check if the pin is structurally valid (4-6 digits)
        if (!/^\d{4,6}$/.test(pin)) {
            return false;
        }

        let nextAuth: AuthState | null = null;
        if (userLower === "vendedor" && pin === "1234") {
            nextAuth = { isAuthenticated: true, role: "vendedor", username: "Vendedor Test" };
        } else if (userLower === "admin" && pin === "123456") {
            nextAuth = { isAuthenticated: true, role: "admin", username: "Admin Principal" };
        }

        if (nextAuth) {
            setAuth(nextAuth);
            localStorage.setItem("auth_session", JSON.stringify(nextAuth));
            return true;
        }

        return false;
    };

    const logout = () => {
        setAuth(defaultState);
        localStorage.removeItem("auth_session");
    };

    if (!isLoaded) {
        return null; // or a tiny loader
    }

    return (
        <AuthContext.Provider value={{ ...auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
