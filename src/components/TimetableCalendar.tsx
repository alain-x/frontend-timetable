import type { FC } from 'react';
import { useEffect, useMemo, useState, useDeferredValue, memo, lazy, Suspense, useRef } from 'react';
import './TimetableCalendar.css';

const EditEventModal = lazy(() => import('./calendar/EditEventModal'));
const EventDetailsModal = lazy(() => import('./calendar/EventDetailsModal'));

interface TimetableEvent {
  id?: number;
  description?: string;
  start: Date;
  end: Date;
  color?: string;
  room_name?: string;
  lecture_name: string;
  course_name: string;
  faculty_name: string;
  department_name: string;
  notes: string;
  section: string;
  hours: number;
  status: string;
  recurrence: string;
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
  intakeId?: number;
  [key: string]: any;
}

interface TimetableCalendarProps {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
  isAdmin?: boolean; // Legacy prop - now using role-based permissions
  lecturerId?: number; // Optional lecturer ID to filter events for specific lecturer
  refreshToken?: number | string; // When this changes, refetch events
}

const defaultEvent: TimetableEvent = {
  description: '',
  start: new Date(),
  end: new Date(),
  color: '#3174ad',
  room_name: '',
  lecture_name: '',
  course_name: '',
  faculty_name: '',
  department_name: '',
  notes: '',
  section: 'DAY',
  hours: 1,
  status: 'scheduled',
  recurrence: 'NONE',
};

const TimetableCalendar: FC<TimetableCalendarProps> = ({ setMessage, isAdmin = false, lecturerId, refreshToken }) => {
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimetableEvent | null>(null);
  const [form, setForm] = useState<TimetableEvent>(defaultEvent);
  const [isEdit, setIsEdit] = useState(false);
  const [sectionView, setSectionView] = useState<'DAY' | 'EVENING'>('DAY');
  const [view, setView] = useState<'calendar' | 'list' | 'timeline'>('calendar');
  // Read-only details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [rooms, setRooms] = useState<{ id: number; room_name: string; block_name: string; location: string }[]>([]);
  const [lecturers, setLecturers] = useState<{ id: number; name: string }[]>([]);
  const [classReps, setClassReps] = useState<{ id: number; name: string }[]>([]);
  const [faculties, setFaculties] = useState<{ id: number; faculty_name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; department_name: string; facultyId?: number }[]>([]);
  const [courses, setCourses] = useState<{ id: number; course_name: string; course_code: string; facultyId?: number; departmentId?: number }[]>([]);
  const [intakes, setIntakes] = useState<any[]>([]);
  
  // Check user permissions for calendar management
  const userRole = localStorage.getItem('role');
  const isAdminUser = userRole === 'ADMIN';
  const isLecturerUser = userRole === 'LECTURER';
  // Support both legacy and current class rep role strings
  const isClassRepUser = userRole === 'CLASSREP' || userRole === 'CLASS_REPRESENT';
  const canCreateEvents = isAdminUser; // Only admins can create timetables/events
  const canEditEvents = isAdminUser || isLecturerUser || isClassRepUser; // Admins, lecturers, and class reps can edit
  const disableNonTimeFields = isLecturerUser && isEdit; // lecturers can't change non-time fields
  const disableAllExceptRoom = isClassRepUser && isEdit; // class reps can only change room
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'evening'>('all');
  // Remove showFilters state and toggle button
  // Remove showDebug state, button, and debug UI
  // Always render the filter section

  // Refetch events when dependencies change
  useEffect(() => {
    fetchEvents();
  }, [lecturerId, refreshToken]);

  useEffect(() => {
    const onInvalidate = () => {
      fetchEvents();
    };
    window.addEventListener('timetables:invalidate', onInvalidate);
    return () => {
      window.removeEventListener('timetables:invalidate', onInvalidate);
    };
  }, [lecturerId, refreshToken]);

  // Fetch lookup data once on mount (rooms, lecturers, faculties, departments, courses)
  useEffect(() => {
    fetchRooms();
    fetchLecturers();
    fetchClassReps();
    fetchFaculties();
    fetchDepartments();
    fetchCourses();
    fetchIntakes();
  }, []);

  // Small helper to avoid hanging requests
  const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }) => {
    const { timeoutMs = 15000, ...rest } = init || {};
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...rest, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  const fetchIntakes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/intakes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      const payload = await res.json().catch(() => null);
      const list: any[] = Array.isArray(payload) ? payload : (payload?.data || []);
      setIntakes(Array.isArray(list) ? list : []);
    } catch (err) {
      setIntakes([]);
    }
  };

  const fetchClassReps = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Authentication failed. Please log in again.' });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }

      const payload = await res.json().catch(() => null);
      const list: any[] = Array.isArray(payload) ? payload : (payload?.data || []);
      const reps = (Array.isArray(list) ? list : [])
        .filter((u: any) => u?.role === 'CLASS_REPRESENT')
        .map((u: any) => ({ id: u.id, name: u.name }));
      setClassReps(reps);
    } catch {
      setClassReps([]);
    }
  };

  // Fetch events from backend
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      // Use lecturer-specific endpoint if lecturerId is provided
      const endpoint = lecturerId 
        ? `https://digital-timetable-backend-production-49c7.up.railway.app/api/lecturer/my-timetables?lecturerId=${lecturerId}`
        : 'https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables';
      
      const res = await fetchWithTimeout(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 15000,
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
        // Handle backend response format with Response wrapper
        const timetables = data.data || [];

        const backendItemToEvent = (item: any) => ({
          id: item.id,
          description: item.description,
          start: item.startDateTime ? new Date(item.startDateTime) : new Date(),
          end: item.endDateTime ? new Date(item.endDateTime) : new Date(),
          color: item.color || getRandomColor(),
          room_name: item.room_name,
          lecture_name: item.lecture_name,
          course_name: item.course_name,
          faculty_name: item.faculty_name,
          department_name: item.department_name,
          notes: item.notes,
          section: item.section,
          hours: item.hours,
          status: item.status,
          recurrence: item.recurrence,
          courseId: item.courseId,
          courseCode: item.courseCode,
          lecturerId: item.lecturerId,
          lecturerName: item.lecturerName,
          roomId: item.roomId,
          roomBlock: item.roomBlock,
          roomLocation: item.roomLocation,
          facultyId: item.facultyId,
          departmentId: item.departmentId,
          classRepUserId: item.classRepUserId,
          classRepName: item.classRepName,
          intakeId: item.intakeId,
          startKey: (() => {
            const d = item.startDateTime ? new Date(item.startDateTime) : new Date();
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          })(),
          startDisplay: (() => {
            const d = item.startDateTime ? new Date(item.startDateTime) : new Date();
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
          })(),
          endDisplay: (() => {
            const d = item.endDateTime ? new Date(item.endDateTime) : new Date();
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
          })(),
          ...item,
        });

        const processedEvents = timetables.map((item: any) => backendItemToEvent(item));
        
        // Normalize status on the client: if end date is before today (e.g., yesterday), mark as Ended
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const normalized = processedEvents.map((e: any) => {
          const end = new Date(e.end);
          end.setHours(0, 0, 0, 0);
          const derivedStatus = end < today ? 'Ended' : 'scheduled';
          return { ...e, status: derivedStatus };
        });
        setEvents(normalized);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch timetable events' });
        setEvents([]);
      }
    } catch (err) {
      console.error('Fetch events error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch timetable events. Please check your connection.' });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Watchdog: if loading takes too long, auto-clear and notify user
  const loadingTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (loading) {
      if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = window.setTimeout(() => {
        setLoading(false);
        setMessage({ type: 'error', text: 'Timetable is taking too long to load. Please try again.' });
      }, 20000); // 20s watchdog
    } else if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    return () => {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [loading, setMessage]);

  // Fetch faculties from backend
  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/faculties', {
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
        console.error('JSON parsing error for faculties:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }

      const list: any[] = Array.isArray(data) ? data : (data?.data || []);
      const normalized = list.map((f: any) => ({
        id: f.id ?? f.facultyId ?? f.faculty_id,
        faculty_name: f.faculty_name ?? f.name,
      }));
      setFaculties(normalized);
    } catch (err) {
      console.error('Fetch faculties error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch faculties. Please check your connection.' });
    }
  };

  // Fetch departments from backend
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/departments', {
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
        console.error('JSON parsing error for departments:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }

      const list: any[] = Array.isArray(data) ? data : (data?.data || []);
      const normalized = list.map((d: any) => {
        const facultyId = d.facultyId ?? d.faculty_id ?? (d.faculty && typeof d.faculty === 'object' ? d.faculty.id : undefined);
        return {
          id: d.id ?? d.departmentId ?? d.department_id,
          department_name: d.department_name ?? d.name,
          facultyId,
        } as { id: number; department_name: string; facultyId?: number };
      });
      setDepartments(normalized);
    } catch (err) {
      console.error('Fetch departments error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch departments. Please check your connection.' });
    }
  };

  // Fetch courses from backend
  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/courses', {
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
        console.error('JSON parsing error for courses:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }

      const list: any[] = Array.isArray(data) ? data : (data?.data || []);
      const normalized = list.map((c: any) => ({
        id: c.id ?? c.courseId ?? c.course_id,
        course_name: c.course_name ?? c.name,
        course_code: c.course_code ?? c.code,
        facultyId: c.facultyId ?? c.faculty_id,
        departmentId: c.departmentId ?? c.department_id,
      }));
      setCourses(normalized);
    } catch (err) {
      console.error('Fetch courses error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch courses. Please check your connection.' });
    }
  };

  const getRandomColor = () => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Helpers: date-only formatting for display
  const formatDateDisplay = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fetch rooms from backend
  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/rooms', {
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
        console.error('JSON parsing error for rooms:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }
      
      if (res.ok) {
        // Handle Response wrapper structure
        const roomsData = data.data || [];
        if (Array.isArray(roomsData)) {
          setRooms(
            roomsData.map((room: any) => ({
              id: room.id ?? room.roomId ?? room.room_id,
              room_name: room.room_name ?? room.name,
              block_name: room.block_name,
              location: room.location,
              isBooked: Boolean(room.isBooked ?? room.booked ?? room.is_booked),
            }))
          );
        } else {
          setRooms([]);
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to fetch rooms' });
      }
    } catch (err) {
      console.error('Fetch rooms error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch rooms. Please check your connection.' });
    }
  };

  // Fetch lecturers from backend
  const fetchLecturers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/users', {
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
        console.error('JSON parsing error for lecturers:', jsonError);
        setMessage({ type: 'error', text: 'Invalid response from server. Please try again.' });
        return;
      }
      
      if (Array.isArray(data)) {
        setLecturers(data.filter((u: any) => u.role === 'LECTURER').map((u: any) => ({ id: u.id, name: u.name })));
      }
    } catch (err) {
      console.error('Fetch lecturers error:', err);
      setMessage({ type: 'error', text: 'Failed to fetch lecturers. Please check your connection.' });
    }
  };

  // Removed duplicate initial fetch (now handled above)

  const handleSelectEvent = (event: TimetableEvent) => {
    if (canEditEvents) {
      // Open edit modal for admins/lecturers
      setEditingEvent(event);
      setForm(event);
      setIsEdit(true);
      setModalOpen(true);
    } else {
      // Open read-only details modal for view-only users
      setSelectedEvent(event);
      setDetailsOpen(true);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.target.name === 'lecture_name') {
      // When lecturer is selected, also set the lecturerId
      const selectedLecturer = lecturers.find(lecturer => lecturer.name === e.target.value);
      setForm({ 
        ...form, 
        lecture_name: e.target.value,
        lecturerId: selectedLecturer?.id || null
      });
    } else if (e.target.name === 'intakeId') {
      const raw = e.target.value;
      const id = raw ? Number(raw) : undefined;
      setForm({
        ...form,
        intakeId: id && Number.isFinite(id) ? id : undefined,
      } as any);
    } else if (e.target.name === 'course_name') {
      const selectedCourse = courses.find(c => c.course_name === e.target.value);
      const autoFaculty = faculties.find(f => f.id === selectedCourse?.facultyId);
      const autoDept = departments.find(d => d.id === selectedCourse?.departmentId);
      setForm({
        ...form,
        course_name: e.target.value,
        courseId: selectedCourse?.id,
        courseCode: selectedCourse?.course_code,
        faculty_name: autoFaculty?.faculty_name || form.faculty_name,
        facultyId: autoFaculty?.id ?? form.facultyId,
        department_name: autoDept?.department_name || form.department_name,
        departmentId: autoDept?.id ?? form.departmentId,
      } as any);
    } else if (e.target.name === 'faculty_name') {
      const selectedFaculty = faculties.find(f => f.faculty_name === e.target.value);
      setForm({
        ...form,
        faculty_name: e.target.value,
        facultyId: selectedFaculty?.id,
        // reset department when faculty changes
        department_name: '',
        departmentId: undefined,
      });
    } else if (e.target.name === 'department_name') {
      const selectedDept = departments.find(d => d.department_name === e.target.value);
      setForm({
        ...form,
        department_name: e.target.value,
        departmentId: selectedDept?.id,
      });
    } else if (e.target.name === 'room_name') {
      // Keep room_name and sync roomId from rooms list
      const selectedRoom = rooms.find(r => r.room_name === e.target.value);
      setForm({
        ...form,
        room_name: e.target.value,
        roomId: selectedRoom?.id,
      });
    } else if (e.target.name === 'hours') {
      // Ensure hours is stored as a number
      const value = Number(e.target.value);
      setForm({ ...form, hours: isNaN(value) ? 1 : value });
    } else if (e.target.name === 'classRepName') {
      const selectedRep = classReps.find(r => r.name === e.target.value);
      setForm({
        ...form,
        classRepName: e.target.value,
        classRepUserId: selectedRep?.id,
      } as any);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      // Validate required fields
      if (!form.lecture_name || !form.lecturerId) {
        setMessage({ type: 'error', text: 'Lecturer is required to create a timetable.' });
        return;
      }

      const intakeId = (form as any).intakeId as number | undefined;
      if (!intakeId) {
        setMessage({ type: 'error', text: 'Intake is required to create a timetable.' });
        return;
      }

      const sectionStr = (form.section || '').toString().toUpperCase();
      if (!sectionStr) {
        setMessage({ type: 'error', text: 'Section (DAY/EVENING) is required to create a timetable.' });
        return;
      }

      const selectedIntake = (intakes || []).find((i: any) => Number(i?.id ?? i?.intakeId ?? i?.intake_id) === Number(intakeId));
      const intakeMode = (selectedIntake?.studyMode ?? selectedIntake?.study_mode ?? '').toString().toUpperCase();
      if (intakeMode && intakeMode !== sectionStr) {
        setMessage({ type: 'error', text: `Selected intake is ${intakeMode}. Please choose section ${intakeMode}.` });
        return;
      }

      // Format dates properly for the backend
      const formatDateForBackend = (date: Date) => {
        // Convert to local timezone and format without timezone info
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const hours = String(localDate.getHours()).padStart(2, '0');
        const minutes = String(localDate.getMinutes()).padStart(2, '0');
        const seconds = String(localDate.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      // Exclude raw 'start' and 'end' fields from payload; backend expects startDateTime/endDateTime
      const { start: _startCreate, end: _endCreate, ...restCreate } = form as any;
      const eventData = {
        ...restCreate,
        startDateTime: formatDateForBackend(form.start),
        endDateTime: formatDateForBackend(form.end),
      };
      // Optimistic create: insert a temporary event immediately
      const tempId = -Date.now();
      const optimisticEvent: TimetableEvent = {
        ...form,
        id: tempId,
        status: 'scheduled',
      };
      setEvents((prev) => [optimisticEvent, ...prev]);
      setModalOpen(false);
      setMessage({ type: 'success', text: 'Timetable created!' });

      // Fire request with timeout and reconcile in background
      (async () => {
        try {
          const res = await fetchWithTimeout('https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(eventData),
            timeoutMs: 8000,
          });

          if (res.ok) {
            const data = await res.json().catch(() => null);
            const item = (data && (data.data || data)) as any;
            if (item) {
              const realized: TimetableEvent = {
                ...optimisticEvent,
                ...item,
                id: item.id,
                start: item.startDateTime ? new Date(item.startDateTime) : optimisticEvent.start,
                end: item.endDateTime ? new Date(item.endDateTime) : optimisticEvent.end,
              };
              setEvents((prev) => prev.map((e) => (e.id === tempId ? realized : e)));
              fetchRooms();
            } else {
              // If response missing body, just refetch in background
              fetchEvents();
            }
          } else {
            // Rollback on failure
            const errorData = await res.json().catch(() => ({} as any));
            setEvents((prev) => prev.filter((e) => e.id !== tempId));
            setMessage({ type: 'error', text: errorData.message || 'Failed to create timetable.' });
          }
        } catch (err) {
          // Network/timeout -> rollback
          setEvents((prev) => prev.filter((e) => e.id !== tempId));
          setMessage({ type: 'error', text: 'Network issue while creating timetable.' });
        }
      })();
    } catch (err) {
      console.error(' Create Timetable error:', err);
      setMessage({ type: 'error', text: 'Failed to  Create Timetable. Please try again.' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.id) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }

      // Format dates properly for the backend
      const formatDateForBackend = (date: Date) => {
        // Convert to local timezone and format without timezone info
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const hours = String(localDate.getHours()).padStart(2, '0');
        const minutes = String(localDate.getMinutes()).padStart(2, '0');
        const seconds = String(localDate.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      // Exclude raw 'start' and 'end' fields from payload; backend expects startDateTime/endDateTime only
      const { start: _startUpdate, end: _endUpdate, ...restUpdate } = form as any;
      const eventData = {
        ...restUpdate,
        startDateTime: formatDateForBackend(form.start),
        endDateTime: formatDateForBackend(form.end),
      };
      // Optimistic update: apply immediately and close
      const prevEvents = events;
      const optimisticUpdated: TimetableEvent = { ...form };
      setEvents((cur) => cur.map((e) => (e.id === editingEvent.id ? { ...e, ...optimisticUpdated } : e)));
      setModalOpen(false);
      setMessage({ type: 'success', text: 'Event updated!' });

      // Fire request with timeout and reconcile; rollback on failure
      (async () => {
        try {
          const res = await fetchWithTimeout(`https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables/${editingEvent.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(eventData),
            timeoutMs: 8000,
          });
          if (res.ok) {
            const data = await res.json().catch(() => null);
            const updatedRaw = (data && (data.data || data)) as any;
            const finalized: TimetableEvent = {
              ...optimisticUpdated,
              ...(updatedRaw || {}),
              start: updatedRaw?.startDateTime ? new Date(updatedRaw.startDateTime) : optimisticUpdated.start,
              end: updatedRaw?.endDateTime ? new Date(updatedRaw.endDateTime) : optimisticUpdated.end,
            } as TimetableEvent;
            setEvents((cur) => cur.map((e) => (e.id === editingEvent.id ? { ...e, ...finalized } : e)));
            fetchRooms();
          } else {
            const errorData = await res.json().catch(() => ({} as any));
            setEvents(prevEvents);
            setMessage({ type: 'error', text: errorData.message || 'Failed to update timetable.' });
          }
        } catch (_) {
          setEvents(prevEvents);
          setMessage({ type: 'error', text: 'Network issue while updating event.' });
        }
      })();
    } catch (err) {
      console.error('update timetable error:', err);
      setMessage({ type: 'error', text: 'Failed to update timetable. Please try again.' });
    }
  };

  const handleDelete = async () => {
    if (!editingEvent?.id) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'No authentication token found. Please log in again.' });
        return;
      }
      // Optimistic remove immediately
      const prevEvents = events;
      setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id));
      setModalOpen(false); 

      // Fire request with timeout and rollback on failure
      (async () => {
        try {
          const res = await fetchWithTimeout(`https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables/${editingEvent.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            timeoutMs: 8000,
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({} as any));
            setEvents(prevEvents);
            setMessage({ type: 'error', text: errorData.message || 'Failed to delete event.' });
          }
        } catch (_) {
          setEvents(prevEvents);
          setMessage({ type: 'error', text: 'Network issue while deleting event.' });
        }
      })();
    } catch (err) {
      console.error('Delete event error:', err);
      setMessage({ type: 'error', text: 'Failed to delete event. Please try again.' });
    }
  };

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredEvents = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const byTime = (section?: string) =>
      timeFilter === 'all' ||
      (timeFilter === 'day' && section === 'DAY') ||
      (timeFilter === 'evening' && section === 'EVENING');

    return events.filter((event) => {
      const statusStr = ((event as any).status ?? '').toString().toLowerCase();
      if (statusStr === 'completed' || statusStr === 'deleted') return false;
      const matchesSearch =
        !term ||
        (event.lecture_name && event.lecture_name.toLowerCase().includes(term)) ||
        (event.course_name && event.course_name.toLowerCase().includes(term)) ||
        (event.room_name && event.room_name.toLowerCase().includes(term));
      return matchesSearch && byTime(event.section);
    });
  }, [events, deferredSearch, timeFilter]);

  // Index events by date for O(1) day lookup in calendar
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimetableEvent[]>();
    for (const e of filteredEvents) {
      const key = (e as any).startKey ?? (() => {
        const d = new Date(e.start);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })();
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [filteredEvents]);

  const getEventsForDate = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate.get(key) || [];
  };

  const getWeekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  const getMonthDays = useMemo(() => {
    const days: Date[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl dark:shadow-none border border-transparent dark:border-neutral-800 p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#004aad] dark:text-neutral-100">
                Timetable
              </h1>
              <p className="text-gray-600 dark:text-neutral-300 mt-1">Manage and view your academic schedule</p>
            </div>
            
            {/*  Create Timetable Button or Permission Message */}
            <div className="flex flex-col items-end gap-2">
              {canCreateEvents ? (
                <button
                  onClick={() => {
                    setForm(defaultEvent);
                    setIsEdit(false);
                    setModalOpen(true);
                  }}
                  className="px-6 py-3 bg-[#004aad] text-white rounded-xl hover:bg-[#003a8a] transition-all duration-200 font-medium shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                   Create Timetable
                </button>
              ) : isLecturerUser ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm">
                  <div className="flex items-center gap-2 text-amber-800"> 
                    <span className="font-medium text-sm">Lecturer Access</span>
                  </div>
                  <p className="text-amber-700 text-xs mt-1">  Only update Date.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm">
                  <div className="flex items-center gap-2 text-blue-800">
                    <span className="font-medium text-sm">View Only Access</span>
                  </div> 
                </div>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center mt-6">
            <div className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-1">
              {['calendar', 'list', 'timeline'].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v as 'calendar' | 'list' | 'timeline')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    view === v
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters - always visible */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl dark:shadow-none border border-transparent dark:border-neutral-800 p-6 mb-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by lecture, course, or room..."
                  className="w-full p-3 pl-10 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-400"
                />
                <svg className="w-5 h-5 absolute left-3 top-3 text-gray-400 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">Time Filter</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as 'all' | 'day' | 'evening')}
                className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="all">All Times</option>
                <option value="day">Day Only</option>
                <option value="evening">Evening Only</option>
              </select>
            </div>
 
          </div>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl dark:shadow-none border border-transparent dark:border-neutral-800 overflow-hidden">
            {/* Calendar Header */}
            <div className="bg-[#004aad] text-white dark:bg-[#003366] p-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <h2 className="text-2xl font-bold">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 dark:text-neutral-300 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {getMonthDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[140px] p-2 border border-gray-100 dark:border-neutral-700 rounded-lg transition-all duration-200 hover:shadow-md ${
                        !isCurrentMonth ? 'bg-gray-50 dark:bg-neutral-900 text-gray-400 dark:text-neutral-600' : 'bg-white dark:bg-neutral-800'
                      } ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-900' : ''}`}
                    >
                      <div className="text-sm font-medium mb-2 flex justify-between items-center">
                        <span>{day.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded-full">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {dayEvents.slice(0, 4).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            onClick={() => handleSelectEvent(event)}
                            className={`text-xs p-1.5 rounded transition-all duration-200 border border-white/20 dark:border-neutral-700 ${
                              canCreateEvents 
                                ? 'cursor-pointer hover:scale-105' 
                                : 'cursor-default opacity-80'
                            }`}
                            style={{ backgroundColor: event.color || '#3B82F6', color: 'white', borderColor: 'inherit' }}
                            title={canCreateEvents 
                              ? ` Lecturer Name: ${event.lecture_name} - ${event.course_name} - ${event.room_name} (Click to edit)` 
                              : `Lecturer Name: ${event.lecture_name} - ${event.course_name} - ${event.room_name} ${new Date(event.end).toLocaleDateString('en-GB')}`
}
                          >
                            <div className="font-medium truncate text-[10px] leading-tight">
                              {event.lecture_name}
                            </div>
                            <div className="text-[10px] font-semibold truncate">
                              {event.course_name}
                            </div>
                            <div className="text-[8px] opacity-90 truncate">
                              {(event.room_name || 'No Room') + ' ' + formatDateDisplay(new Date(event.start)) + ' - ' + formatDateDisplay(new Date(event.end))}
                            </div>
                          </div>
                        ))}
                        
                        {dayEvents.length > 4 && (
                          <div className="text-xs text-gray-500 text-center bg-gray-100 rounded px-1 py-0.5">
                            +{dayEvents.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center dark:bg-neutral-900 dark:text-neutral-200 dark:border dark:border-neutral-800">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Found</h3>
                <p className="text-gray-500">Try adjusting your filters or add  New Timetables.</p>
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <div
                  key={event.id || index}
                  className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 dark:bg-neutral-900 dark:text-neutral-100 dark:border dark:border-neutral-800"
                  onClick={() => handleSelectEvent(event)}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: event.color || '#3B82F6' }}
                        ></div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-neutral-100">{event.lecture_name}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          event.section === 'DAY' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {event.section}
                        </span>
                      </div>
                      
                      <p className="text-lg text-gray-600 mb-2">{event.course_name}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {event.room_name || 'No Room'}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {event.faculty_name}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateDisplay(new Date(event.start))} - {formatDateDisplay(new Date(event.end))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        event.status === 'scheduled' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.status}
                      </span>
                      
                      <div className="text-sm text-gray-500">
                        {event.hours}h
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Timeline View */}
        {view === 'timeline' && (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl dark:shadow-none border border-transparent dark:border-neutral-800 p-6">
            <div className="space-y-6">
              {filteredEvents
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map((event, index) => (
                  <div key={event.id || index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full mb-2"
                        style={{ backgroundColor: event.color || '#3B82F6' }}
                      ></div>
                      {index < filteredEvents.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-200"></div>
                      )}
                    </div>
                    
                    <div
                      className="flex-1 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                      onClick={() => handleSelectEvent(event)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{event.lecture_name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          event.section === 'DAY' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {event.section}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{event.course_name}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>{event.room_name}</span>
                        <span>{event.faculty_name}</span>
                        <span>{`${formatDateDisplay(new Date(event.start))} - ${formatDateDisplay(new Date(event.end))}`}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Modal for editing/creating events (lazy-loaded) */}
        <Suspense fallback={null}>
          <EditEventModal
            isOpen={Boolean(modalOpen && (canCreateEvents || ((isLecturerUser || isClassRepUser) && isEdit)))}
            isEdit={isEdit}
            canCreateEvents={canCreateEvents}
            isLecturerUser={isLecturerUser}
            isClassRepUser={isClassRepUser}
            disableNonTimeFields={disableNonTimeFields}
            disableAllExceptRoom={disableAllExceptRoom}
            form={form}
            lecturers={lecturers}
            courses={courses}
            rooms={rooms}
            faculties={faculties}
            departments={departments}
            classReps={classReps}
            intakes={intakes}
            onClose={() => setModalOpen(false)}
            onSubmit={isEdit ? handleUpdate : handleCreate}
            onDelete={handleDelete}
            onChange={handleFormChange}
            onDateChange={(field, value) => setForm({ ...form, [field]: value })}
          />
        </Suspense>

        {/* Read-only Event Details Modal - Visible for all roles when detailsOpen (lazy-loaded) */}
        <Suspense fallback={null}>
          <EventDetailsModal
            isOpen={Boolean(detailsOpen && selectedEvent)}
            event={selectedEvent}
            onClose={() => setDetailsOpen(false)}
          />
        </Suspense>
      </div>
    </div>
  );
};

export default memo(TimetableCalendar);