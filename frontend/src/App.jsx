import { AuthProvider, useAuth } from "./lib/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { MainApp } from "./components/MainApp";
import "./App.css";

function Gate() {
  const { token } = useAuth();
  return token ? <MainApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
