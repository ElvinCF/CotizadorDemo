import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
    const { isAuthenticated, login, role } = useAuth();
    const location = useLocation();

    const [username, setUsername] = useState("");
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);

    // If already authenticated, redirect to their dashboard or intended destination
    if (isAuthenticated) {
        const from = location.state?.from?.pathname;
        if (from && from !== "/login") {
            return <Navigate to={from} replace />;
        }
        return <Navigate to={role === "admin" ? "/admin" : "/vendedor"} replace />;
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate 4-6 digits constraint visually before submitting to context
        if (!/^\d{4,6}$/.test(pin)) {
            setError("El PIN debe tener entre 4 y 6 dígitos numéricos.");
            return;
        }

        const success = login(username, pin);
        if (!success) {
            setError("Usuario o PIN incorrectos.");
        } else {
            // Let the re-render handle redirect based on the updated context
        }
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Only allow numbers
        if (val === "" || /^\d+$/.test(val)) {
            // Limit to max 6 chars
            if (val.length <= 6) {
                setPin(val);
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2>Inicio de Sesión</h2>
                    <p>Accede con tu usuario y PIN asignado.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username">Usuario</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ej. vendedor o admin"
                            required
                            autoFocus
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="pin">PIN de Seguridad (4 a 6 dígitos)</label>
                        <input
                            id="pin"
                            type="password"
                            inputMode="numeric"
                            pattern="\d{4,6}"
                            value={pin}
                            onChange={handlePinChange}
                            placeholder="••••"
                            required
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.submitBtn}>
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
}
