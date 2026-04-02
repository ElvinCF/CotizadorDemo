import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { ThemeProvider } from "./app/theme";
import { AuthProvider } from "./app/AuthContext";
import { MAP_BACKGROUND_IMAGE } from "./app/assets";
import "./styles/globals.css";
import "./styles/layout.css";
import "./App.css";

let mapImageWarmupStarted = false;

function App() {
  useEffect(() => {
    if (mapImageWarmupStarted) return;
    mapImageWarmupStarted = true;

    const warmup = () => {
      const prefetchLink = document.createElement("link");
      prefetchLink.rel = "prefetch";
      prefetchLink.as = "image";
      prefetchLink.href = MAP_BACKGROUND_IMAGE;
      document.head.appendChild(prefetchLink);

      const img = new Image();
      img.decoding = "async";
      img.src = MAP_BACKGROUND_IMAGE;
    };

    const timeoutId = setTimeout(() => warmup(), 240);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
