import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import Achievements from './pages/Achievements';
import Statistics from './pages/Statistics';
import GeminiAIPage from './pages/GeminiAIPage';


function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
          <div className="min-h-screen bg-[#F9FAFB] dark:bg-darkTheme-primary text-gray-800 dark:text-darkTheme-text transition-colors duration-300">
            <Routes>
              {/* Authentication Routes */}
              <Route path="/login" element={
                <>
                  <Navbar />
                  <Login />
                </>
              } />
              <Route path="/signup" element={
                <>
                  <Navbar />
                  <Signup />
                </>
              } />
              <Route path="/forgot-password" element={
                <>
                  <Navbar />
                  <ForgotPassword />
                </>
              } />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/ai-assistant" element={<GeminiAIPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
