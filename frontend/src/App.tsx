import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { ThemeProvider } from "./app/theme";
import { AuthProvider } from "./app/AuthContext";
import "./styles/globals.css";
import "./styles/layout.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
