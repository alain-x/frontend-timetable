import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TimetableCalendar from './TimetableCalendar';
import NotificationPanel from './NotificationPanel';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import ClassRepAnnouncements from './ClassRepAnnouncements';

interface ClassRepDashboardProps {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
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

interface SwapRequest {
  id: number;
  requestorId: number;
  requestorName: string;
  targetUserId: number;
  targetUserName: string;
  originalTimetableId: number;
  originalTimetableInfo: string;
  proposedTimetableId: number;
  proposedTimetableInfo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADMIN_APPROVED' | 'ADMIN_REJECTED' | 'CANCELLED' | 'EXPIRED';
  reason: string;
  adminNotes: string;
  requestDate: string;
  responseDate: string;
  createdAt: string;
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

interface Room {
  id: number;
  name: string;
  capacity: number;
  status: string;
  bookedByClassRepName?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

const ClassRepDashboard: React.FC<ClassRepDashboardProps> = ({ setMessage }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<SwapRequest | null>(null);
  const [showCreateSwapModal, setShowCreateSwapModal] = useState(false);
  // In the swapForm state, keep only timetable and user fields
  const [swapForm, setSwapForm] = useState({
    originalTimetableId: '',
    targetUserId: '',
    proposedTimetableId: '',
    reason: ''
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomBookingModal, setShowRoomBookingModal] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [showRoomRequestModal, setShowRoomRequestModal] = useState(false);
  const [roomRequestForm, setRoomRequestForm] = useState({ timetableId: '', roomId: '', reason: '' });
  const notificationRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Role guard: only allow CLASSREP with valid token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('role') || '').toUpperCase();
    const allowed = ['CLASSREP', 'CLASS_REPRESENT', 'CLASS_REPRESENTATIVE'];
    if (!token || !allowed.includes(role)) {
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
    fetchTimetables();
    fetchSwapRequests();
    fetchNotifications();
    fetchRooms();
    fetchUsers();
  }, []);

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('http://localhost:8091/api/timetables', {
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
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }
      
      if (res.ok) {
        setTimetables(data.data || []);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch timetables' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch timetables' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSwapRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('http://localhost:8091/api/swap-requests', {
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
        console.error('JSON parsing error for swap requests:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }
      
      if (res.ok) {
        const requests = data.data || [];
        setSwapRequests(requests);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch swap requests' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch swap requests' });
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

      const res = await fetch('http://localhost:8091/api/notifications', {
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
        let notificationsData = [];
        if (Array.isArray(data)) {
          notificationsData = data;
        } else if (data && Array.isArray(data.data)) {
          notificationsData = data.data;
        } else if (data && Array.isArray(data.notifications)) {
          notificationsData = data.notifications;
        }
        // Remove duplicates by id
        const uniqueNotifications = notificationsData.filter(
          (n, i, arr) => arr.findIndex(x => x.id === n.id) === i
        );
        setNotifications(uniqueNotifications);
        setUnreadCount(uniqueNotifications.filter((n: Notification) => !n.isRead).length);
      } else {
        console.warn('Failed to fetch notifications:', data.message);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      // Fetch only available rooms from backend
      const res = await fetch('http://localhost:8091/api/rooms/available', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }
      let data: any;
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error('JSON parsing error for rooms:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }

      if (res.ok) {
        // API returns { status, message, data } per RoomController
        const dtoRooms = Array.isArray(data) ? data : (data?.data || []);
        const mapped = dtoRooms.map((r: any) => ({
          id: r.id,
          name: r.room_name || r.name,
          capacity: r.capacity ?? 0,
          status: r.isBooked ? 'BOOKED' : 'AVAILABLE',
          bookedByClassRepName: r.bookedByClassRepName ?? r.booked_by_class_rep_name ?? undefined,
        }));
        setRooms(mapped);
      } else {
        setMessage({ type: 'error', text: (data && data.message) || 'Failed to fetch rooms' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch rooms' });
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('http://localhost:8091/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleSwapRequestAction = async (swapRequestId: number, action: 'approve' | 'reject' | 'cancel', notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch(`http://localhost:8091/api/swap-requests/${swapRequestId}/${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Swap request ${action}ed successfully` });
        fetchSwapRequests();
        setShowSwapModal(false);
        setSelectedSwapRequest(null);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || `Failed to ${action} swap request` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to ${action} swap request` });
    }
  };

  const createSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all fields before sending
    if (
      !swapForm.originalTimetableId ||
      !swapForm.targetUserId ||
      !swapForm.proposedTimetableId ||
      isNaN(Number(swapForm.originalTimetableId)) ||
      isNaN(Number(swapForm.targetUserId)) ||
      isNaN(Number(swapForm.proposedTimetableId))
    ) {
      setMessage({ type: 'error', text: 'Please select all required fields for the swap request.' });
      return;
    }
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const requestorId = localStorage.getItem('userId');
      if (!requestorId || isNaN(Number(requestorId))) {
        setMessage({ type: 'error', text: 'User ID not found. Please log in again.' });
        return;
      }
      const payload = {
        requestorId: Number(requestorId),
        originalTimetableId: swapForm.originalTimetableId ? Number(swapForm.originalTimetableId) : '',
        targetUserId: swapForm.targetUserId ? Number(swapForm.targetUserId) : '',
        proposedTimetableId: swapForm.proposedTimetableId ? Number(swapForm.proposedTimetableId) : '',
        reason: swapForm.reason || ''
      };

      console.log('Submitting swap request payload:', payload);
      const res = await fetch('http://localhost:8091/api/swap-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Swap request created successfully' });
        fetchSwapRequests();
        setShowCreateSwapModal(false);
        setSwapForm({ originalTimetableId: '', targetUserId: '', proposedTimetableId: '', reason: '' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to create swap request' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create swap request' });
    }
  };

  const openSwapModal = (swapRequest: SwapRequest) => {
    setSelectedSwapRequest(swapRequest);
    setShowSwapModal(true);
  };

  const bookRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimetable || !selectedRoom) {
      setMessage({ type: 'error', text: 'Please select both timetable and room' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch(
        `http://localhost:8091/api/rooms/${selectedRoom}/book?timetableId=${selectedTimetable.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        setShowRoomBookingModal(false);
        setSelectedTimetable(null);
        setSelectedRoom(null);
        fetchTimetables();
        fetchRooms();
        // Notify other tabs (e.g., Admin Dashboard) to refresh room status immediately
        try { localStorage.setItem('rooms:invalidate', String(Date.now())); } catch {}
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to book room' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to book room' });
    }
  };

  const requestRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomRequestForm.timetableId || !roomRequestForm.roomId) {
      setMessage({ type: 'error', text: 'Please select both timetable and room' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }
      const res = await fetch('http://localhost:8091/api/rooms/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timetableId: roomRequestForm.timetableId,
          roomId: roomRequestForm.roomId,
          reason: roomRequestForm.reason,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Room request submitted successfully' });
        setShowRoomRequestModal(false);
        setRoomRequestForm({ timetableId: '', roomId: '', reason: '' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to request room' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to request room' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const handleDeleteNotification = async (notificationId: number) => {
    const isAdmin = localStorage.getItem('role') === 'ADMIN';
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      let res;
      if (isAdmin) {
        res = await fetch(`http://localhost:8091/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await fetch(`http://localhost:8091/api/notifications/${notificationId}/dismiss`, {
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

  const renderOverviewTab = () => (
    <div className="card">
      <div className="p-4 sm:p-6 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Dashboard Overview</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Welcome to your class representative dashboard</p>
      </div>
      <div className="p-3 sm:p-6">
        {/* Stats Cards - Full width on mobile, 2 columns on tablet, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm">Total Classes</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{timetables.length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm">Active Classes</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{timetables.filter(t => t.status === 'ongoing').length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm">Pending Requests</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{swapRequests.filter(r => r.status === 'PENDING').length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm">Available Rooms</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{rooms.filter(r => r.status === 'AVAILABLE').length}</p>
              </div>
              <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Bottom sections - Stack on mobile, side by side on larger screens */}
        <div className="mt-4 sm:mt-6 lg:mt-8 space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
            <h4 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4">Recent Activities</h4>
            <div className="space-y-2 sm:space-y-3">
              {timetables.slice(0, 5).map((timetable) => (
                <div key={timetable.id} className="flex items-center justify-between p-2 sm:p-3 bg-neutral-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 text-sm sm:text-base truncate">{timetable.course_name}</p>
                    <p className="text-xs sm:text-sm text-neutral-600 truncate">{timetable.lecture_name}</p>
                  </div>
                  <span className={`badge text-xs sm:text-sm ml-2 flex-shrink-0 ${
                    timetable.status === 'scheduled' ? 'badge-success' :
                    timetable.status === 'ongoing' ? 'badge-warning' :
                    'badge-neutral'
                  }`}>
                    {timetable.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
            <h4 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4">Recent Notifications</h4>
            <div className="space-y-2 sm:space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map(notification => (
                  <div key={notification.id} className={`p-2 sm:p-3 rounded-lg ${
                    !notification.isRead ? 'bg-primary-50 border border-primary-200' : 'bg-neutral-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-neutral-900 truncate">{notification.title}</h4>
                        <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-neutral-400 mt-1">
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
                          className="text-red-500 hover:text-red-700 p-1"
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
                <p className="text-neutral-500 text-xs sm:text-sm text-center py-4">No recent notifications</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6 xl:col-span-1">
            <h4 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => setShowCreateSwapModal(true)}
                className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left flex items-start"
                aria-label="Create swap request"
                title="Create swap request"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Create Swap Request</p>
                  <p className="text-xs opacity-75">Request schedule changes</p>
                </div>
              </button>

              <button
                onClick={() => setShowRoomBookingModal(true)}
                className="w-full p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left flex items-start"
                aria-label="Book a room"
                title="Book a room"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Book Room</p>
                  <p className="text-xs opacity-75">Reserve classroom space</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className="w-full p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left flex items-start"
                aria-label="View calendar"
                title="View calendar"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium text-sm">View Calendar</p>
                  <p className="text-xs opacity-75">Check class schedules</p>
                </div>
              </button>

              <button
                onClick={() => setShowRoomRequestModal(true)}
                className="w-full p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-left flex items-start"
                aria-label="Request room"
                title="Request room"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg> 
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimetableTab = () => (
    <div className="card">
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Class Timetables</h3>
            <p className="text-sm text-neutral-600">Manage and view class schedules</p>
          </div>
          <button
            onClick={() => setShowRoomBookingModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Book Room
          </button>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading timetables...</p>
          </div>
        ) : timetables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Course</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Lecturer</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Room</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Section</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timetables.map((timetable) => (
                  <tr key={timetable.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-neutral-900">{timetable.course_name}</p>
                        <p className="text-sm text-neutral-600">{timetable.faculty_name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-700">{timetable.lecture_name}</td>
                    <td className="py-3 px-4 text-neutral-700">{timetable.room_name}</td>
                    <td className="py-3 px-4 border-b">{new Date(timetable.startDateTime).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-neutral-700">{timetable.section}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${timetable.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                        {timetable.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedTimetable(timetable);
                          setShowRoomBookingModal(true);
                        }}
                        className="btn-outline text-sm px-3 py-1"
                      >
                        Book Room
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-neutral-500">No timetables found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSwapRequestsTab = () => (
    <div className="card">
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Swap Requests</h3>
            <p className="text-sm text-neutral-600">Manage schedule swap requests</p>
          </div>
          <button
            onClick={() => setShowCreateSwapModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Request
          </button>
        </div>
      </div>
      <div className="p-6">
        {swapRequests.length > 0 ? (
          <div className="space-y-4">
            {swapRequests.map((request) => (
              <div key={request.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-neutral-900">
                        {request.requestorName} → {request.targetUserName}
                      </h4>
                      <span className={`badge ${
                        request.status === 'PENDING' ? 'badge-warning' :
                        request.status === 'APPROVED' ? 'badge-success' :
                        request.status === 'REJECTED' ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">
                      <strong>Original:</strong> {request.originalTimetableInfo}
                    </p>
                    <p className="text-sm text-neutral-600 mb-2">
                      <strong>Proposed:</strong> {request.proposedTimetableInfo}
                    </p>
                    <p className="text-sm text-neutral-600">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                     
                    <button
                      onClick={() => openSwapModal(request)}
                      className="btn-outline text-sm px-3 py-1"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-neutral-500">No swap requests found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCalendarTab = () => (
    <div className="card">
      <div className="p-6 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900">Class Calendar</h3>
        <p className="text-sm text-neutral-600">View and manage class schedules</p>
      </div>
      <div className="p-6">
        {/* Responsive wrapper for TimetableCalendar */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px]">
            <TimetableCalendar setMessage={setMessage} isAdmin={false} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoomsTab = () => (
    <div className="card">
      <div className="p-6 border-b border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-900">All Rooms</h3>
        <p className="text-sm text-neutral-600">View and book available rooms</p>
      </div>
      <div className="p-6">
        {rooms.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">No rooms available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div key={room.id} className="bg-white rounded-lg shadow-md p-6 border border-neutral-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-neutral-900 mb-2">{room.name}</h4>
                  <p className="text-sm text-neutral-600 mb-1">Capacity: {room.capacity}</p>
                  <p className="text-sm text-neutral-600 mb-1">Status: {room.status}</p>
                </div>
                <button
                  className="btn-primary mt-4"
                  onClick={() => {
                    setSelectedRoom(room.id);
                    setShowRoomBookingModal(true);
                  }}
                >
                  Book Room
                </button>
              </div>
            ))}
          </div>
        )}
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
            userRole="CLASS_REPRESENT"
            userName="Class Representative"
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
            userRole="CLASS_REPRESENT"
            userName="Class Representative"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
        </div>
        {/* Main Content - Always takes full width on mobile */}
        <main className="flex-1 w-full max-w-7xl mx-auto pl-0 pr-4 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 dashboard-content">
          {/* Tab Content */}
          <div className="space-y-4 sm:space-y-6">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'calendar' && renderCalendarTab()}
            {activeTab === 'swap-requests' && renderSwapRequestsTab()}
            {activeTab === 'rooms' && renderRoomsTab()}
            {activeTab === 'announcements' && <ClassRepAnnouncements />}
          </div>
        </main>
      </div>

      {/* Create Swap Request Modal */}
      {showCreateSwapModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Swap Request (Class Only)</h2>
            <form onSubmit={createSwapRequest} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Your Class</label>
                <select
                  className="input w-full"
                  value={swapForm.originalTimetableId}
                  onChange={e => setSwapForm(f => ({ ...f, originalTimetableId: e.target.value }))}
                  required
                >
                  <option value="">select</option>
                  {timetables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.course_name} - {t.lecture_name} ({new Date(t.startDateTime).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Target User</label>
                <select
                  className="input w-full"
                  value={swapForm.targetUserId}
                  onChange={e => setSwapForm(f => ({ ...f, targetUserId: e.target.value }))}
                  required
                >
                  <option value="">select</option>
                  {users
                    .filter(u => {
                      const r = (u as any).role ? String((u as any).role).toUpperCase() : '';
                      return ['LECTURER', 'CLASSREP', 'CLASS_REPRESENT', 'CLASS_REPRESENTATIVE'].includes(r);
                    })
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Target Class</label>
                <select
                  className="input w-full"
                  value={swapForm.proposedTimetableId}
                  onChange={e => setSwapForm(f => ({ ...f, proposedTimetableId: e.target.value }))}
                  required
                >
                  <option value="">select</option>
                  {timetables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.course_name} - {t.lecture_name} ({new Date(t.startDateTime).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Reason</label>
                <textarea
                  className="input w-full"
                  value={swapForm.reason}
                  onChange={e => setSwapForm(f => ({ ...f, reason: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  className="btn-outline w-full sm:w-auto"
                  onClick={() => setShowCreateSwapModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  disabled={
                    !swapForm.originalTimetableId ||
                    !swapForm.targetUserId ||
                    !swapForm.proposedTimetableId ||
                    isNaN(Number(swapForm.originalTimetableId)) ||
                    isNaN(Number(swapForm.targetUserId)) ||
                    isNaN(Number(swapForm.proposedTimetableId))
                  }
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Request Details Modal */}
      {showSwapModal && selectedSwapRequest && (
        <div className="modal-overlay">
          <div className="modal-content p-8">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 text-2xl"
              onClick={() => setShowSwapModal(false)}
            >
              &times;
            </button>
            <h3 className="text-2xl font-bold mb-6 text-[#004aad]">Swap Request Details</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1 text-neutral-700">From:</label>
                <p className="text-neutral-900">{selectedSwapRequest.requestorName}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-neutral-700">To:</label>
                <p className="text-neutral-900">{selectedSwapRequest.targetUserName}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-neutral-700">Original Schedule:</label>
                <p className="text-neutral-900">{selectedSwapRequest.originalTimetableInfo}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-neutral-700">Proposed Schedule:</label>
                <p className="text-neutral-900">{selectedSwapRequest.proposedTimetableInfo}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-neutral-700">Reason:</label>
                <p className="text-neutral-900">{selectedSwapRequest.reason}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-neutral-700">Status:</label>
                <span className={`badge ${
                  selectedSwapRequest.status === 'PENDING' ? 'badge-warning' :
                  selectedSwapRequest.status === 'APPROVED' ? 'badge-success' :
                  selectedSwapRequest.status === 'REJECTED' ? 'badge-danger' : 'badge-neutral'
                }`}>
                  {selectedSwapRequest.status}
                </span>
              </div>
            </div>
            
            
          </div>
        </div>
      )}

      {/* Room Booking Modal */}
      {showRoomBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content p-8">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 text-2xl"
              onClick={() => setShowRoomBookingModal(false)}
            >
              &times;
            </button>
            <h3 className="text-2xl font-bold mb-6 text-[#004aad]">Book Room</h3>
            
            <form onSubmit={bookRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-neutral-700">Timetable</label>
                <select
                  value={selectedTimetable?.id || ''}
                  onChange={(e) => {
                    const timetable = timetables.find(t => t.id === Number(e.target.value));
                    setSelectedTimetable(timetable || null);
                  }}
                  className="input"
                  required
                >
                  <option value="">Select a timetable</option>
                  {timetables.map((timetable) => (
                    <option key={timetable.id} value={timetable.id}>
                      {timetable.course_name} - {timetable.lecture_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-neutral-700">Room</label>
                <select
                  value={selectedRoom || ''}
                  onChange={(e) => setSelectedRoom(Number(e.target.value))}
                  className="input"
                  required
                >
                  <option value="">Select a room</option>
                  {rooms.filter(room => room.status === 'AVAILABLE').map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Capacity: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Book Room
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRepDashboard; 