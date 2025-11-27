import { BrowserRouter, Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import FileTest from "./pages/FileTest";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />

        {/* TEMPORARY TEST ROUTE */}
        <Route path="/file-test" element={<FileTest />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
