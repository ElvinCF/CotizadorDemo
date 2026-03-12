import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "vendedor" | "admin";

interface AuthState {
    isAuthenticated: boolean;
    role: Role | null;
    username: string | null;
}

interface AuthContextType extends AuthState {
    login: (username: string, pin: string) => Promise<boolean>;
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

    const login = async (username: string, pin: string): Promise<boolean> => {
        // Validacion cliente: 4-6 digitos (backend puede ser más laxo o estricto)
        if (!/^\d{4,6}$/.test(pin)) {
            return false;
        }

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, pin })
            });

            if (!res.ok) {
                // Return false y el LoginPage capturará el error general para mostrar
                return false;
            }

            const data = await res.json();
            
            if (data?.success && data?.user) {
                 const nextAuth = {
                     isAuthenticated: true,
                     role: data.user.role as Role,
                     username: data.user.nombre || data.user.username
                 };
                 setAuth(nextAuth);
                 localStorage.setItem("auth_session", JSON.stringify(nextAuth));
                 return true;
            }
            return false;

        } catch(error) {
            console.error("Error at Login", error);
            return false;
        }
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
