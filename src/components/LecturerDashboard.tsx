import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TimetableCalendar from './TimetableCalendar';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import LecturerAnnouncements from './LecturerAnnouncements';

interface LecturerDashboardProps {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ setMessage }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  // Calendar refresh token to force TimetableCalendar to refetch
  const [calendarRefreshToken, setCalendarRefreshToken] = useState<number>(0);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapForm, setSwapForm] = useState({
    originalTimetableId: '',
    targetUserId: '',
    proposedTimetableId: '',
    reason: ''
  });
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [allTimetables, setAllTimetables] = useState<any[]>([]);
  const [lecturerTimetables, setLecturerTimetables] = useState<any[]>([]);
  const [allLecturers, setAllLecturers] = useState<any[]>([]);
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedCourseForCompletion, setSelectedCourseForCompletion] = useState<any>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [courseCompletionRequests, setCourseCompletionRequests] = useState<any[]>([]);
  const [myCoursesLoading, setMyCoursesLoading] = useState(false);
  const [myCoursesError, setMyCoursesError] = useState<string | null>(null);

  // Role guard: only allow LECTURER with valid token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'LECTURER') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Fetch data functions
  const fetchLecturerTimetablesAndAllTimetables = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Fetch lecturer's timetables
      const timetableRes = await fetch('http://localhost:8091/api/lecturer/my-timetables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      let timetables: any[] = [];
      if (timetableRes.ok) {
        const data = await timetableRes.json();
        timetables = data.data || [];
        setLecturerTimetables(timetables);
      }

      // Fetch all timetables
      const allTimetablesRes = await fetch('http://localhost:8091/api/timetables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      let allTimetables: any[] = [];
      if (allTimetablesRes.ok) {
        const data = await allTimetablesRes.json();
        allTimetables = data.data || [];
        setAllTimetables(allTimetables);
      }

      // Fetch all rooms
      const roomRes = await fetch('http://localhost:8091/api/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      let rooms: any[] = [];
      if (roomRes.ok) {
        const data = await roomRes.json();
        rooms = data.data || [];
        const usedRoomIds = new Set((timetables || []).map((t: any) => t.roomId));
        const availableRooms = rooms.filter((room: any) => !room.booked && !room.isBooked && !usedRoomIds.has(room.id));
        setAvailableClasses(availableRooms);
      }

      // Fetch all lecturers
      const lecturersRes = await fetch('http://localhost:8091/api/users/lecturers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (lecturersRes.ok) {
        const data = await lecturersRes.json();
        setAllLecturers(data.data || []);
      }

    } catch (err) {
      console.error('Fetch lecturer timetables or available rooms error:', err);
    }
  };

  useEffect(() => {
    if (showSwapModal) fetchLecturerTimetablesAndAllTimetables();
  }, [showSwapModal]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setCurrentUserId(parseInt(userId));
    }
    fetchTimetables();
    fetchSwapRequests();
    fetchNotifications();
    fetchMyCourses();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const fetchTimetables = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:8091/api/lecturer/my-timetables', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Timetables fetched:', data.data || []);
      }
    } catch (err) {
      console.error('Fetch timetables error:', err);
    }
  };

  const fetchSwapRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:8091/api/swap-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSwapRequests(data.data || []);
      }
    } catch (err) {
      console.error('Fetch swap requests error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:8091/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const notifications = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
        setUnreadCount(notifications.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const fetchMyCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:8091/api/lecturer/my-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const courses = Array.isArray(data?.data) ? data.data : [];
        
        const completionRes = await fetch('http://localhost:8091/api/lecturer/course-completion-requests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (completionRes.ok) {
          const completionData = await completionRes.json();
          const approvedRequests = (completionData.data || []).filter((r: any) => r.status === 'APPROVED');
          
          const updatedCourses = courses.map((course: any) => {
            const approvedRequest = approvedRequests.find((r: any) => r.courseId === course.id);
            return approvedRequest ? { ...course, status: 'COMPLETED' } : course;
          });
          
          setMyCourses(updatedCourses);
        } else {
          setMyCourses(courses);
        }
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        setMessage({ type: 'error', text: errorData.message || 'Failed to fetch courses' });
      }
    } catch (err) {
      console.error('Fetch my courses error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch courses. Please check your connection.' });
    }
  };

  const fetchCourseCompletionRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:8091/api/lecturer/course-completion-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCourseCompletionRequests(data.data || []);
      }
    } catch (err) {
      console.error('Fetch course completion requests error:', err);
    }
  };

  const requestCourseCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token || !selectedCourseForCompletion) {
        throw new Error('Missing token or selected course');
      }

      let courseCode = '';
      if (selectedCourseForCompletion.courseCode && selectedCourseForCompletion.courseCode.trim() !== '') {
        courseCode = selectedCourseForCompletion.courseCode.trim();
      }
      else if (selectedCourseForCompletion.code && selectedCourseForCompletion.code.trim() !== '') {
        courseCode = selectedCourseForCompletion.code.trim();
      }
      else if (selectedCourseForCompletion.course_name) {
        courseCode = `${selectedCourseForCompletion.course_name.substring(0, 3).toUpperCase()}-${selectedCourseForCompletion.id}`;
      }
      else {
        throw new Error('Could not determine course code. Please contact support.');
      }

      const requestData = {
        courseId: selectedCourseForCompletion.id,
        courseName: selectedCourseForCompletion.course_name,
        courseCode: courseCode,
        notes: completionNotes,
      };

      const res = await fetch('http://localhost:8091/api/lecturer/course-completion-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to submit request');
      }

      setMessage({ type: 'success', text: 'Request submitted successfully' });
      setShowCompletionModal(false);
      setSelectedCourseForCompletion(null);
      setCompletionNotes('');
      fetchCourseCompletionRequests();
    } catch (err) {
      console.error('Request course completion error:', err);
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Failed to submit request' 
      });
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Lecturer Dashboard</h1>
            <p className="text-gray-600 dark:text-neutral-300 mt-1">Welcome back! Here's your overview</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm">My Courses</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{myCourses.length}</p>
            </div>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        
        <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs sm:text-sm">Active Courses</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{myCourses.filter(c => c.status === 'ACTIVE').length}</p>
            </div>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6 ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs sm:text-sm">Swap Requests</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{swapRequests.length}</p>
            </div>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        </div>
        
        <div className="bg-[#004aad] text-white rounded-lg p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs sm:text-sm">Notifications</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold">{unreadCount}</p>
            </div>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 17H6l5 5v-5z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMyCoursesTab = () => {
    if (myCoursesLoading) {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-neutral-300">Loading your courses...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (myCoursesError) {
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-red-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">Error Loading Courses</h3>
                <p className="text-gray-600 dark:text-neutral-300 mb-4">{myCoursesError}</p>
                <button
                  onClick={() => {
                    setMyCoursesError(null);
                    setMyCoursesLoading(true);
                    setMyCourses([]);
                    setActiveTab('my-courses');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">My Courses</h2>
              <p className="text-gray-600 dark:text-neutral-300 mt-1">Manage your assigned courses and request completion</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {myCourses.length} Active Courses
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Courses</p>
                <p className="text-3xl font-bold">{myCourses.length}</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#004aad] text-white rounded-lg p-6 hover:bg-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Courses</p>
                <p className="text-3xl font-bold">{myCourses.filter(c => c.status === 'ACTIVE').length}</p>
              </div>
              <div className="bg-[#004aad] bg-opacity-30 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#004aad] rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Completion Requests</p>
                <p className="text-3xl font-bold">{courseCompletionRequests.length}</p>
              </div>
              <div className="bg-[#004aad] rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Current Assignments</h3>
            <p className="text-sm text-gray-600 dark:text-neutral-300 mt-1">Courses currently assigned to you</p>
          </div>
          <div className="p-6">
            {myCourses.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-neutral-100">No courses assigned</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">You don't have any courses assigned yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map((course) => (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{course.course_name}</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><span className="font-medium">Faculty:</span> {course.faculty_name}</p>
                          <p><span className="font-medium">Department:</span> {course.department_name}</p>
                          <p><span className="font-medium">Room:</span> {course.room_name}</p>
                          <p><span className="font-medium">Section:</span> {course.section}</p>
                        </div>
                        <div className="mt-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            course.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            course.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {course.status || 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={() => {
                          setSelectedCourseForCompletion(course);
                          setShowCompletionModal(true);
                        }}
                        disabled={course.status === 'COMPLETED'}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${
                          course.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {course.status === 'COMPLETED' ? 'Completed' : 'Request Completion'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {courseCompletionRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Completion Requests</h3>
              <p className="text-sm text-gray-600 mt-1">Track your course completion requests</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {courseCompletionRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{request.courseName}</h4>
                        <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                        <p className="text-xs text-gray-500 mt-2">Requested: {new Date(request.requestDate).toLocaleDateString()}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCompletionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Course Completion</h3>
              <form onSubmit={requestCourseCompletion}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedCourseForCompletion?.course_name}
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    value={selectedCourseForCompletion?.courseCode || ''}
                    onChange={e => setSelectedCourseForCompletion({
                      ...selectedCourseForCompletion,
                      courseCode: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter course code"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Completion Notes</label>
                  <textarea
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Provide details about course completion..."
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompletionModal(false);
                      setSelectedCourseForCompletion(null);
                      setCompletionNotes('');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCalendarTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Timetable</h2>
        <p className="text-gray-600">View and manage your teaching schedule</p>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <TimetableCalendar 
            setMessage={setMessage}
            lecturerId={currentUserId || undefined}
            refreshToken={calendarRefreshToken}
          />
        </div>
      </div>
    </div>
  );

  

  const handleCloseSwapModal = () => {
    setShowSwapModal(false);
  };

  const handleSwapFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSwapForm({ ...swapForm, [e.target.name]: e.target.value });
  };

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapSubmitting(true);
    setSwapError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const requestorId = localStorage.getItem('userId');
      if (!requestorId || isNaN(Number(requestorId))) throw new Error('User ID not found. Please log in again.');
      
      if (!swapForm.originalTimetableId || !swapForm.targetUserId || !swapForm.proposedTimetableId || 
          isNaN(Number(swapForm.originalTimetableId)) || isNaN(Number(swapForm.targetUserId)) || isNaN(Number(swapForm.proposedTimetableId))) {
        setSwapError('Please select all required fields for the swap request.');
        setSwapSubmitting(false);
        return;
      }
      
      const payload = {
        requestorId: Number(requestorId),
        originalTimetableId: Number(swapForm.originalTimetableId),
        targetUserId: Number(swapForm.targetUserId),
        proposedTimetableId: Number(swapForm.proposedTimetableId),
        reason: swapForm.reason || ''
      };
      
      const res = await fetch('http://localhost:8091/api/swap-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create swap request');
      }
      
      setShowSwapModal(false);
      setSwapForm({ originalTimetableId: '', targetUserId: '', proposedTimetableId: '', reason: '' });
      fetchSwapRequests();
      setMessage({ type: 'success', text: 'Swap request created successfully!' });
    } catch (err: any) {
      setSwapError(err.message);
    } finally {
      setSwapSubmitting(false);
    }
  };

  const [swapActionLoading, setSwapActionLoading] = useState<string | null>(null);
  const [swapActionError, setSwapActionError] = useState<string | null>(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const handleApproveSwap = async (id: string) => {
    setSwapActionLoading(id + '-approve');
    setSwapActionError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await fetch(`http://localhost:8091/api/swap-requests/${id}/approve?notes=`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to approve swap request');
      }
      fetchSwapRequests();
      setMessage({ type: 'success', text: 'Swap request approved!' });
      // Trigger calendar refresh so timetable reflects changes immediately
      setCalendarRefreshToken((v) => v + 1);
    } catch (err: any) {
      setSwapActionError(err.message);
    } finally {
      setSwapActionLoading(null);
    }
  };

  const handleRejectSwap = async (id: string) => {
    setSwapActionLoading(id + '-reject');
    setSwapActionError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await fetch(`http://localhost:8091/api/swap-requests/${id}/reject?notes=`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to reject swap request');
      }
      fetchSwapRequests();
      setMessage({ type: 'success', text: 'Swap request rejected.' });
      // In case backend adjusts tentative slots, refresh calendar
      setCalendarRefreshToken((v) => v + 1);
    } catch (err: any) {
      setSwapActionError(err.message);
    } finally {
      setSwapActionLoading(null);
    }
  };

  const handleCancelSwap = async (id: string) => {
    setSwapActionLoading(id + '-cancel');
    setSwapActionError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const res = await fetch(`http://localhost:8091/api/swap-requests/${id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to cancel swap request');
      }
      fetchSwapRequests();
      setMessage({ type: 'success', text: 'Swap request cancelled.' });
      // Ensure calendar is up to date after cancellation
      setCalendarRefreshToken((v) => v + 1);
    } catch (err: any) {
      setSwapActionError(err.message);
    } finally {
      setSwapActionLoading(null);
    }
  };

  const renderSwapRequestsTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Swap Requests</h2>
          <p className="text-gray-600">Manage your class swap requests</p>
        </div>
        <div className="mt-2 sm:mt-0">
          <button
            onClick={() => setShowSwapModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Swap Request
          </button>
        </div>
      </div>

      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
          <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-lg w-full max-w-3xl mx-auto p-4 sm:p-6 relative border border-gray-200 dark:border-neutral-700">
            <div className="mb-6">
              <h4 className="text-base sm:text-lg font-semibold mb-2">Room Assignments Overview</h4>
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-full text-xs sm:text-sm border border-gray-200 dark:border-neutral-700 rounded">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-neutral-800">
                      <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left">Room</th>
                      <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left">Status</th>
                      <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left">Assigned Course</th>
                      <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allRoomMap: Record<string, any> = {};
                      availableClasses.forEach((room: any) => {
                        allRoomMap[room.id] = room;
                      });
                      lecturerTimetables.forEach((tt: any) => {
                        if (!allRoomMap[tt.roomId]) {
                          allRoomMap[tt.roomId] = {
                            id: tt.roomId,
                            roomName: tt.roomName || tt.room || `Room #${tt.roomId}`,
                            block: tt.block,
                            location: tt.location,
                            capacity: tt.capacity,
                          };
                        }
                      });
                      const allRooms = Object.values(allRoomMap).sort((a: any, b: any) => {
                        const nameA = (a.roomName || a.name || '').toLowerCase();
                        const nameB = (b.roomName || b.name || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                      });
                      return allRooms.map((room: any) => {
                        const assigned = lecturerTimetables.find((tt: any) => tt.roomId === room.id);
                        return (
                          <tr key={room.id} className={assigned ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                            <td className="px-2 py-1.5 sm:px-3 sm:py-2 align-top">
                              {room.roomName || room.name || `Room #${room.id}`}
                              <div className="text-[11px] sm:text-xs text-gray-500 dark:text-neutral-400">
                                {room.block && <span>Block: {room.block}. </span>}
                                {room.location && <span>Location: {room.location}. </span>}
                                {room.capacity && <span>Capacity: {room.capacity} students.</span>}
                              </div>
                              {assigned && <span className="ml-2 text-green-700 bg-green-100 dark:bg-green-900/30 rounded px-2 py-0.5 text-[11px] sm:text-xs">Assigned</span>}
                            </td>
                            <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                              {assigned ? 'Assigned' : 'Available'}
                            </td>
                            <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                              {assigned ? assigned.course_name || '-' : '-'}
                            </td>
                            <td className="px-2 py-1.5 sm:px-3 sm:py-2">
                              {assigned ? assigned.section || assigned.sectionName || '-' : '-'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleSubmitSwap} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium text-sm">Your Class</label>
                <select
                  name="originalTimetableId"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800"
                  value={swapForm.originalTimetableId}
                  onChange={handleSwapFormChange}
                  required
                >
                  <option value="">Select Your Class</option>
                  {lecturerTimetables.map(tt => (
                    <option key={tt.id} value={tt.id}>
                      {tt.course_name} - {tt.title || tt.lecture_name} ({new Date(tt.startDateTime).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium text-sm">Target Lecturer</label>
                <select
                  name="targetUserId"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800"
                  value={swapForm.targetUserId}
                  onChange={handleSwapFormChange}
                  required
                >
                  <option value="">Select Lecturer</option>
                  {allLecturers.filter(u => u.id !== Number(currentUserId)).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium text-sm">Target Class</label>
                <select
                  name="proposedTimetableId"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800"
                  value={swapForm.proposedTimetableId}
                  onChange={handleSwapFormChange}
                  required
                >
                  <option value="">Select Class</option>
                  {allTimetables
                    .filter(tt =>
                      tt.lecturerId === Number(swapForm.targetUserId) &&
                      tt.roomId &&
                      !tt.isBooked
                    )
                    .map(tt => (
                      <option key={tt.id} value={tt.id}>
                        {tt.course_name} - {tt.title || tt.lecture_name} ({new Date(tt.startDateTime).toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium text-sm">Reason</label>
                <textarea
                  name="reason"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800"
                  value={swapForm.reason}
                  onChange={handleSwapFormChange}
                  rows={3}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 bg-gray-100 dark:bg-neutral-800 dark:text-neutral-200 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700"
                  onClick={handleCloseSwapModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary rounded-lg px-4 py-2 disabled:opacity-50"
                  disabled={swapSubmitting}
                >
                  {swapSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>

            {swapError && <div className="mt-4 text-red-600 text-sm">{swapError}</div>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-bold p-4 border-b text-gray-800">All Swap Requests</h2>
        {swapRequests.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {swapRequests.map((request) => {
              const originalInfo = request.originalTimetableInfo || request.originalClass || '-';
              const proposedInfo = request.proposedTimetableInfo || request.requestedClass || '-';
              const requestedOn = request.requestDate || request.createdAt;
              const statusClass =
                request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                request.status === 'ADMIN_APPROVED' ? 'bg-blue-100 text-blue-800' :
                request.status === 'ADMIN_REJECTED' ? 'bg-red-100 text-red-800' :
                request.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                'bg-gray-100 text-gray-800';

              return (
                <div key={request.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <h3 className="font-semibold text-sm sm:text-base mb-1">
                        From: {request.requestorName || request.requestorEmail || `User ${request.requestorId}`} → To: {request.targetUserName || request.targetUserEmail || `User ${request.targetUserId}`}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div>
                          <p className="text-gray-600">Original: {originalInfo}</p>
                          <p className="text-gray-600">Proposed: {proposedInfo}</p>
                        </div>
                        <div>
                          {request.reason && <p className="text-gray-600">Reason: {request.reason}</p>}
                          {requestedOn && <p className="text-gray-600">Requested: {new Date(requestedOn).toLocaleDateString()}</p>}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                      {request.status === 'PENDING' && (
                        <button
                          onClick={() => { setSelectedRequest(request); setShowRequestDetails(true); }}
                          className="w-full sm:w-auto px-3 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No swap requests found.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        setMessage={setMessage}
        onLogout={handleLogout}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
      
      <div className="flex flex-1">
        <Sidebar 
          userRole="LECTURER"
          userName="Lecturer"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6">
          <div className="space-y-4 sm:space-y-6">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'my-courses' && renderMyCoursesTab()}
            {activeTab === 'calendar' && renderCalendarTab()}
            {activeTab === 'announcements' && <LecturerAnnouncements />}
            {activeTab === 'swap-requests' && renderSwapRequestsTab()}
          </div>
        </main>
      </div>

      {showRequestDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg max-w-xl w-full p-6 border border-transparent dark:border-neutral-800">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold mb-0 text-blue-600">Review Swap Request</h3>
              <button
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-300"
                onClick={() => { setShowRequestDetails(false); setSelectedRequest(null); }}
                aria-label="Close details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">From:</label>
                <p className="text-gray-900 dark:text-neutral-100">{selectedRequest.requestorName || selectedRequest.requestorEmail || `User ${selectedRequest.requestorId}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">To:</label>
                <p className="text-gray-900 dark:text-neutral-100">{selectedRequest.targetUserName || selectedRequest.targetUserEmail || `User ${selectedRequest.targetUserId}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Original Schedule:</label>
                <p className="text-gray-900 dark:text-neutral-100">{selectedRequest.originalTimetableInfo || selectedRequest.originalClass || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Proposed Schedule:</label>
                <p className="text-gray-900 dark:text-neutral-100">{selectedRequest.proposedTimetableInfo || selectedRequest.requestedClass || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Reason:</label>
                <p className="text-gray-900 dark:text-neutral-100">{selectedRequest.reason || '-'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                {selectedRequest?.status === 'PENDING' && selectedRequest && (
                  <>
                    {currentUserId && selectedRequest.targetUserId === Number(currentUserId) && (
                      <>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                          onClick={() => handleApproveSwap(selectedRequest.id)}
                          disabled={swapActionLoading === selectedRequest.id + '-approve'}
                        >
                          {swapActionLoading === selectedRequest.id + '-approve' ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                          onClick={() => handleRejectSwap(selectedRequest.id)}
                          disabled={swapActionLoading === selectedRequest.id + '-reject'}
                        >
                          {swapActionLoading === selectedRequest.id + '-reject' ? 'Rejecting...' : 'Reject'}
                        </button>
                      </>
                    )}
                    {currentUserId && selectedRequest.requestorId === Number(currentUserId) && (
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
                        onClick={() => handleCancelSwap(selectedRequest.id)}
                        disabled={swapActionLoading === selectedRequest.id + '-cancel'}
                      >
                        {swapActionLoading === selectedRequest.id + '-cancel' ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    )}
                  </>
                )}
                {swapActionError && <div className="text-red-600 text-xs self-center">{swapActionError}</div>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-200 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700"
                  onClick={() => { setShowRequestDetails(false); setSelectedRequest(null); }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerDashboard;