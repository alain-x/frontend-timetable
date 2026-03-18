import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TimetableCalendar from './TimetableCalendar';
import NotificationPanel from './NotificationPanel';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import StudentAnnouncements from './StudentAnnouncements';

interface StudentDashboardProps {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

interface Notification {
  id: number;
  type: 'booking' | 'request' | 'conflict' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  userId?: number;
  roomId?: number;
  timetableId?: number;
}

interface Timetable {
  id: number;
  course_name: string;
  faculty_name: string;
  department_name: string;
  lecture_name: string;
  room_name: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  color: string;
  recurrence: string;
  notes: string;
  section: string;
  hours: number;
  status: string;
  // Relationship fields
  courseId?: number;
  courseCode?: string;
  lecturerId?: number;
  lecturerName?: string;
  roomId?: number;
  roomBlock?: string;
  roomLocation?: string;
  facultyId?: number;
  departmentId?: number;
  classRepUserId?: number;
  classRepName?: string;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ setMessage }) => {

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  // Status filter: all | scheduled | ended
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'ended'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);



  // Role guard: ensure only students (USER role) can access this dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('role') || '').toUpperCase();
    if (!token || !['USER', 'STUDENT', 'STAFF'].includes(role)) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    fetchNotifications();
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }
      
      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error('JSON parsing error for timetables:', jsonError);
        setTimetables([]);
        return;
      }
      
      if (res.ok) {
        const raw: Timetable[] = (data.data || []) as Timetable[];
        // Normalize status on the client: if end date is before today (e.g., yesterday), mark as Ended
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const normalized = raw.map((t) => {
          const end = new Date(t.endDateTime);
          end.setHours(0, 0, 0, 0);
          const derivedStatus = end < today ? 'Ended' : 'scheduled';
          return { ...t, status: derivedStatus };
        });
        setTimetables(normalized);
      } else {
        console.warn('Failed to fetch timetables:', data.message);
        setTimetables([]);
      }
    } catch (err) {
      console.error('Error fetching timetables:', err);
      setTimetables([]);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }
      
      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error('JSON parsing error for notifications:', jsonError);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      
      if (res.ok) {
        // Handle different response structures
        let notificationsData = [];
        if (Array.isArray(data)) {
          notificationsData = data;
        } else if (data && Array.isArray(data.data)) {
          notificationsData = data.data;
        } else if (data && Array.isArray(data.notifications)) {
          notificationsData = data.notifications;
        }
        
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter((n: Notification) => !n.isRead).length);
      } else {
        console.warn('Failed to fetch notifications:', data.message);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
      // Don't show error message for notifications as it's not critical
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    const isAdmin = localStorage.getItem('role') === 'ADMIN';
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      let res;
      if (isAdmin) {
        res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}/dismiss`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setMessage({ type: 'success', text: isAdmin ? 'Notification deleted successfully' : 'Notification dismissed' });
      } else {
        setMessage({ type: 'error', text: isAdmin ? 'Failed to delete notification' : 'Failed to dismiss notification' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: isAdmin ? 'Error deleting notification' : 'Error dismissing notification' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const renderOverviewTab = () => (
    <div className="card bg-white dark:bg-neutral-900">
      <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Dashboard Overview</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Welcome to your student dashboard</p>
      </div>
      <div className="p-3 sm:p-6">
        {/* Stats Cards - Full width on mobile, 2 columns on tablet, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
         
          
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm">Today's Classes</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{timetables.filter(t => {
                  const today = new Date().toDateString();
                  const classDate = new Date(t.startDateTime).toDateString();
                  return today === classDate;
                }).length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm">Upcoming</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{timetables.filter(t => {
                  const now = new Date();
                  const classTime = new Date(t.startDateTime);
                  return classTime > now;
                }).length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm">Completed</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{timetables.filter(t => {
                  const now = new Date();
                  const classTime = new Date(t.endDateTime);
                  return classTime < now;
                }).length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Bottom sections - Stack on mobile, side by side on larger screens */}
        <div className="mt-4 sm:mt-6 lg:mt-8 space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
            <h4 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3 sm:mb-4">Today's Schedule</h4>
            <div className="space-y-2 sm:space-y-3">
              {timetables.filter(t => {
                const today = new Date().toDateString();
                const classDate = new Date(t.startDateTime).toDateString();
                return today === classDate;
              }).slice(0, 5).map((timetable) => (
                <div key={timetable.id} className="flex items-center justify-between p-2 sm:p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm sm:text-base truncate">{timetable.course_name}</p>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 truncate">
                      {new Date(timetable.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(timetable.endDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 flex-shrink-0">{timetable.room_name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
            <h4 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3 sm:mb-4">Recent Notifications</h4>
            <div className="space-y-2 sm:space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map(notification => (
                  <div key={notification.id} className={`p-2 sm:p-3 rounded-lg ${
                    !notification.isRead ? 'bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-800' : 'bg-neutral-50 dark:bg-neutral-800'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{notification.title}</h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          notification.type === 'booking' ? 'bg-success-500' :
                          notification.type === 'request' ? 'bg-primary-500' :
                          notification.type === 'conflict' ? 'bg-danger-500' :
                          'bg-neutral-500'
                        }`}></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 p-1"
                          title="Delete notification"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm text-center py-4">No recent notifications</p>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-3 sm:p-4 lg:p-6 xl:col-span-1">
            <h4 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3 sm:mb-4">Quick Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => setActiveTab('calendar')}
                className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-medium text-sm sm:text-base">View Calendar</p>
                <p className="text-xs sm:text-sm opacity-75">Check your schedule</p>
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalendarTab = () => (
    <div className="card bg-white dark:bg-neutral-900">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Class Schedule</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">View your complete timetable and class information</p>
      </div>
      <div className="p-6">
        {/* Status Filter */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400 mr-2">Status:</span>
          <button
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              statusFilter === 'scheduled'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
            onClick={() => setStatusFilter('scheduled')}
          >
            Scheduled
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              statusFilter === 'ended'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
            onClick={() => setStatusFilter('ended')}
          >
            Ended
          </button>
        </div>

        {/* Filtered list summary (quick view) */}
        <div className="mb-6 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2 text-sm">Classes ({statusFilter})</h4>
          <div className="space-y-2 max-h-56 overflow-auto">
            {timetables
              .map((t) => ({ ...t, status: new Date(t.endDateTime) < new Date() ? 'Ended' : 'Scheduled' }))
              .filter((t) =>
                statusFilter === 'all' ? true : statusFilter === 'ended' ? t.status === 'Ended' : t.status === 'Scheduled'
              )
              .slice(0, 10)
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm bg-white dark:bg-neutral-900 rounded-md px-3 py-2 border border-neutral-200 dark:border-neutral-700">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{t.course_name}</p>
                    <p className="text-neutral-600 dark:text-neutral-400 truncate">
                      {new Date(t.startDateTime).toLocaleDateString()} - {new Date(t.endDateTime).toLocaleDateString()} • {t.room_name || 'No Room'}
                    </p>
                  </div>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    t.status === 'Ended' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            {timetables
              .map((t) => ({ ...t, status: new Date(t.endDateTime) < new Date() ? 'Ended' : 'Scheduled' }))
              .filter((t) =>
                statusFilter === 'all' ? true : statusFilter === 'ended' ? t.status === 'Ended' : t.status === 'Scheduled'
              ).length === 0 && (
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">No classes found.</p>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px]">
            <TimetableCalendar 
              setMessage={setMessage} 
              isAdmin={false}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors duration-300">
      {/* Navigation */}
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        setMessage={setMessage}
        onLogout={handleLogout}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
      <div className="flex flex-1">
        {/* Sidebar - Positioned absolutely on mobile, in flex container on desktop */}
        <div className="hidden md:block">
          <Sidebar 
            userRole="STUDENT"
            userName="Student"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
        </div>
        {/* Mobile Sidebar - Positioned absolutely */}
        <div className="md:hidden">
          <Sidebar 
            userRole="STUDENT"
            userName="Student"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
        </div>
        {/* Main Content - Always takes full width on mobile */}
        <main className="flex-1 w-full max-w-7xl mx-auto pl-0 pr-4 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 dashboard-content">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab==='overview' ? 'bg-[#004aad] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200'}`}>Overview</button>
            <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab==='calendar' ? 'bg-[#004aad] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200'}`}>Calendar</button>
            <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab==='announcements' ? 'bg-[#004aad] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200'}`}>Announcements</button>
          </div>
          {/* Tab Content */}
          <div className="space-y-4 sm:space-y-6">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'calendar' && renderCalendarTab()}
            {activeTab === 'announcements' && <StudentAnnouncements />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;