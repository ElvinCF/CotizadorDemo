import { RouterProvider } from "react-router-dom";
import { appRouter } from "./app/router";
import { ThemeProvider } from "./app/theme";
import "./styles/globals.css";
import "./styles/layout.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={appRouter} />
    </ThemeProvider>
  );
}

export default App;
