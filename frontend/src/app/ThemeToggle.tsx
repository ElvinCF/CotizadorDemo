import { useTheme } from "./theme";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span aria-hidden="true" className={isDark ? "theme-toggle__icon" : "theme-toggle__icon theme-toggle__icon--active"}>
        {"\u2600"}
      </span>
      <span aria-hidden="true" className={isDark ? "theme-toggle__icon theme-toggle__icon--active" : "theme-toggle__icon"}>
        {"\u{1F319}"}
      </span>
    </button>
  );
};

export default ThemeToggle;
