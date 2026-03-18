import { Suspense, lazy } from 'react';
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ToastContainer, { useToasts } from './components/ToastContainer';

// Route-level code splitting: lazy-load heavy pages/dashboards
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const LecturerDashboard = lazy(() => import('./components/LecturerDashboard'));
const ClassRepDashboard = lazy(() => import('./components/ClassRepDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));

function App() {
  const { toasts, removeToast, showSuccess, showError } = useToasts();

  // Enhanced message handler that also shows toasts
  const handleMessage = (msg: { type: 'success' | 'error'; text: string } | null) => {
    if (msg) {
      if (msg.type === 'success') {
        showSuccess('Success', msg.text);
      } else {
        showError('Error', msg.text);
      }
    }
  };

  // Helper to check if user is authenticated
  const isAuthenticated = () => !!localStorage.getItem('token');

  // Helper to get user role
  const getUserRole = () => {
    const role = localStorage.getItem('role');
    console.log('Current user role from localStorage:', role);
    return role;
  };

  // Helper to get appropriate dashboard based on role
  const getDashboardComponent = () => {
    const role = getUserRole();
    console.log('User role:', role); // Debug log
    
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        console.log('Routing to AdminDashboard');
        return <AdminDashboard setMessage={handleMessage} />;
      case 'LECTURER':
        console.log('Routing to LecturerDashboard');
        return <LecturerDashboard setMessage={handleMessage} />;
      case 'CLASSREP':
      case 'CLASS_REPRESENT':
      case 'CLASS_REPRESENTATIVE':
        console.log('Routing to ClassRepDashboard');
        return <ClassRepDashboard setMessage={handleMessage} />;
      case 'USER':
      case 'STAFF':
      case 'STUDENT':
      case null:
      case undefined:
        console.log('Routing to StudentDashboard (default)');
        return <StudentDashboard setMessage={handleMessage} />;
      default:
        console.warn('Unknown role:', role, '- defaulting to StudentDashboard');
        return <StudentDashboard setMessage={handleMessage} />;
    }
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        {/* Lazy routes. Null fallback keeps UI unchanged during loading */}
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login setMessage={handleMessage} />} />
            <Route path="/register" element={<Register setMessage={handleMessage} />} />
            <Route path="/dashboard" element={isAuthenticated() ? getDashboardComponent() : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App
