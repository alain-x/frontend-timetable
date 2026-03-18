import type { FC } from 'react';
import { useEffect, useState, useRef, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TimetableCalendar from './TimetableCalendar';
import NotificationPanel from './NotificationPanel';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import AdminAnnouncements from './AdminAnnouncements';

// Lazy-loaded subcomponents to trim initial bundle
const EditRoomModal = lazy(() => import('./admin/EditRoomModal'));
const CreateFacultyModal = lazy(() => import('./admin/CreateFacultyModal'));
const EditFacultyModal = lazy(() => import('./admin/EditFacultyModal'));
const CourseCompletionModal = lazy(() => import('./admin/CourseCompletionModal'));
const AllTimetablesTab = lazy(() => import('./admin/tabs/AllTimetablesTab'));
const CourseModal = lazy(() => import('./admin/modals/CourseModal'));
const CreateRoomModal = lazy(() => import('./admin/modals/CreateRoomModal'));
const DepartmentModal = lazy(() => import('./admin/modals/DepartmentModal'));
const EditUserModal = lazy(() => import('./admin/modals/EditUserModal'));

interface DashboardProps {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface Intake {
  id: number;
  name: string;
  intakeCode: string;
  programName: string;
  studyMode: string;
  campus: string;
  departmentId?: number;
  status?: string;
  startDate?: string;
  expectedEndDate?: string;
}

interface Course {
  id: number;
  name: string;
  faculty: string;
  department: string;
  status: string;
  course_name: string;
  course_code: string;
  course_credit: number;
  facultyId?: number;
  facultyName?: string;
  departmentId?: number;
  departmentName?: string;
  departmentIds?: number[];
  departmentNames?: string[];
  // Some endpoints return a denormalized list of departments per course. This can be
  // an array of Department objects, strings (names), or numeric IDs. Keep it flexible.
  departments?: (Department | string | number)[];
}

interface Room {
  id: number;
  room_name: string;
  block_name: string;
  location: string;
  capacity: number;
  isBooked: boolean;
  bookedByClassRepName?: string;
}

interface Department {
  id: number;
  department_name: string;
  faculty: string;
  facultyId?: number;
  facultyName?: string;
}

interface Faculty {
  id: number;
  faculty_name: string;
}

interface IntakeCourseCompletionRow {
  courseId: number;
  courseName: string;
  courseCode: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
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

interface CourseCompletionRequest {
  id: number;
  lecturerName: string;
  lecturerEmail: string;
  courseName: string;
  courseCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  notes: string;
  adminNotes?: string;
  responseDate?: string;
}

interface CourseForm {
  course_name: string;
  course_code: string;
  course_credit: number;
  facultyId: string;
  departmentId: string;
}

const Dashboard: FC<DashboardProps> = ({ setMessage }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [intakesLoading, setIntakesLoading] = useState(false);
  const [showCreateIntakeModal, setShowCreateIntakeModal] = useState(false);
  const [editingIntake, setEditingIntake] = useState<Intake | null>(null);
  const [intakeForm, setIntakeForm] = useState({
    name: '',
    intakeCode: '',
    programName: '',
    studyMode: 'DAY',
    campus: '',
    departmentId: '',
    startDate: '',
    expectedEndDate: ''
  });
  const [selectedIntakeForProgress, setSelectedIntakeForProgress] = useState<Intake | null>(null);
  const [intakeProgress, setIntakeProgress] = useState<IntakeCourseCompletionRow[]>([]);
  const [intakeProgressLoading, setIntakeProgressLoading] = useState(false);
  const [intakeProgressSearch, setIntakeProgressSearch] = useState('');
  const [intakeProgressStatusFilter, setIntakeProgressStatusFilter] = useState<'all' | 'completed' | 'not_completed'>('all');
  const [intakeProgressSort, setIntakeProgressSort] = useState<'course_asc' | 'course_desc' | 'completed_at_desc'>('course_asc');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseCompletionRequests, setCourseCompletionRequests] = useState<CourseCompletionRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<SwapRequest | null>(null);
  const [showCourseCompletionModal, setShowCourseCompletionModal] = useState(false);
  const [selectedCompletionRequest, setSelectedCompletionRequest] = useState<CourseCompletionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
  const [showCreateFacultyModal, setShowCreateFacultyModal] = useState(false);
  const [showEditFacultyModal, setShowEditFacultyModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [currentFacultyId, setCurrentFacultyId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'LECTURER'
  });
  const [courseForm, setCourseForm] = useState<CourseForm>({
    course_name: '',
    course_code: '',
    course_credit: 10,
    facultyId: '',
    departmentId: ''
  });
  const [roomForm, setRoomForm] = useState({
    room_name: '',
    block_name: '',
    location: '',
    capacity: ''
  });
  const [departmentForm, setDepartmentForm] = useState({
    department_name: '',
    facultyId: ''
  });
  const [facultyForm, setFacultyForm] = useState({
    faculty_name: ''
  });

  const usersImportCsvRef = useRef<HTMLInputElement>(null);
  const usersImportXlsxRef = useRef<HTMLInputElement>(null);
  // Prevent double-triggered delete actions causing conflicting toasts
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const isAdmin = localStorage.getItem('role') === 'ADMIN';
  const currentUserId = localStorage.getItem('userId');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dismissedTimetableIds, setDismissedTimetableIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('dismissedTimetableIds');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Role guard: only allow ADMIN with valid token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'ADMIN') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const persistDismissed = (ids: number[]) => {
    setDismissedTimetableIds(ids);
    try { localStorage.setItem('dismissedTimetableIds', JSON.stringify(ids)); } catch {}
  };

  const filteredIntakeProgress = useMemo(() => {
    const term = intakeProgressSearch.trim().toLowerCase();
    let rows = intakeProgress;

    if (intakeProgressStatusFilter === 'completed') {
      rows = rows.filter((r) => Boolean(r.completed));
    } else if (intakeProgressStatusFilter === 'not_completed') {
      rows = rows.filter((r) => !Boolean(r.completed));
    }

    if (term) {
      rows = rows.filter((r) => {
        const n = (r.courseName || '').toLowerCase();
        const c = (r.courseCode || '').toLowerCase();
        return n.includes(term) || c.includes(term);
      });
    }

    const copy = [...rows];
    copy.sort((a, b) => {
      if (intakeProgressSort === 'course_desc') {
        return (b.courseName || '').localeCompare(a.courseName || '');
      }
      if (intakeProgressSort === 'completed_at_desc') {
        const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return tb - ta;
      }
      return (a.courseName || '').localeCompare(b.courseName || '');
    });
    return copy;
  }, [intakeProgress, intakeProgressSearch, intakeProgressStatusFilter, intakeProgressSort]);

  const openCreateIntakeModal = () => {
    setEditingIntake(null);
    setIntakeForm({
      name: '',
      intakeCode: '',
      programName: '',
      studyMode: 'DAY',
      campus: '',
      departmentId: '',
      startDate: '',
      expectedEndDate: ''
    });
    setShowCreateIntakeModal(true);
  };

  const openEditIntakeModal = (intake: Intake) => {
    setEditingIntake(intake);
    setIntakeForm({
      name: intake.name || '',
      intakeCode: intake.intakeCode || '',
      programName: intake.programName || '',
      studyMode: (intake.studyMode || 'DAY') as any,
      campus: intake.campus || '',
      departmentId: intake.departmentId != null ? String(intake.departmentId) : '',
      startDate: intake.startDate || '',
      expectedEndDate: intake.expectedEndDate || ''
    });
    setShowCreateIntakeModal(true);
  };

  const fetchIntakeProgress = async (intakeId: number) => {
    setIntakeProgressLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/intakes/${intakeId}/course-completions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        setIntakeProgress([]);
        return;
      }
      const payload = await res.json().catch(() => null);
      const list: any[] = payload?.data || payload || [];
      setIntakeProgress(Array.isArray(list) ? (list as IntakeCourseCompletionRow[]) : []);
    } catch {
      setIntakeProgress([]);
    } finally {
      setIntakeProgressLoading(false);
    }
  };

  const handleToggleCourseCompletion = async (intakeId: number, courseId: number, completed: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/intakes/${intakeId}/course-completions/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ type: 'error', text: (payload && (payload.message || payload.error)) || 'Failed to update completion' });
        return;
      }
      setMessage({ type: 'success', text: completed ? 'Marked completed' : 'Marked not completed' });
      await fetchIntakeProgress(intakeId);
      await fetchTimetables();
      try {
        window.dispatchEvent(new Event('timetables:invalidate'));
      } catch {}
    } catch {
      setMessage({ type: 'error', text: 'Failed to update completion' });
    }
  };

  const renderIntakesTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Intakes</h2>
          <p className="text-sm text-gray-500">Manage cohorts and track course completion progress</p>
        </div>
        <button
          onClick={openCreateIntakeModal}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          Create Intake
        </button>
      </div>

      <div className="p-4">
        {intakesLoading ? (
          <div className="text-sm text-gray-500">Loading intakes...</div>
        ) : intakes.length === 0 ? (
          <div className="text-sm text-gray-500">No intakes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Study Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {intakes.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{i.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{i.intakeCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{i.programName}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{i.studyMode}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{i.campus}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        i.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {i.status || 'ONGOING'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => openEditIntakeModal(i)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            setSelectedIntakeForProgress(i);
                            await fetchIntakeProgress(i.id);
                          }}
                          className="px-2 py-1 bg-slate-700 text-white rounded text-xs hover:bg-slate-800"
                        >
                          Progress
                        </button>
                        <button
                          onClick={() => handleDeleteIntake(i)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedIntakeForProgress && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                Progress: {selectedIntakeForProgress.name}
              </h3>
              <button
                onClick={() => fetchIntakeProgress(selectedIntakeForProgress.id)}
                className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 transition text-sm"
              >
                Refresh
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
              <input
                value={intakeProgressSearch}
                onChange={(e) => setIntakeProgressSearch(e.target.value)}
                placeholder="Search course name/code..."
                className="w-full sm:w-72 px-3 py-2 border rounded text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={intakeProgressStatusFilter}
                  onChange={(e) => setIntakeProgressStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border rounded text-sm"
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="not_completed">Not completed</option>
                </select>
                <select
                  value={intakeProgressSort}
                  onChange={(e) => setIntakeProgressSort(e.target.value as any)}
                  className="px-3 py-2 border rounded text-sm"
                >
                  <option value="course_asc">Sort: Course A-Z</option>
                  <option value="course_desc">Sort: Course Z-A</option>
                  <option value="completed_at_desc">Sort: Completed newest</option>
                </select>
              </div>
            </div>
            {intakeProgressLoading ? (
              <div className="text-sm text-gray-500">Loading progress...</div>
            ) : filteredIntakeProgress.length === 0 ? (
              <div className="text-sm text-gray-500">No courses found for this intake yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredIntakeProgress.map((r) => (
                      <tr key={r.courseId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{r.courseName}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{r.courseCode}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(r.completed)}
                              onChange={(e) => {
                                if (!selectedIntakeForProgress) return;
                                handleToggleCourseCompletion(selectedIntakeForProgress.id, r.courseId, e.target.checked);
                              }}
                            />
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              r.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {r.completed ? 'YES' : 'NO'}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                          {r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 whitespace-normal break-words max-w-md">
                          {r.notes || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const handleSaveIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const body = {
        name: intakeForm.name,
        intakeCode: intakeForm.intakeCode,
        programName: intakeForm.programName,
        studyMode: intakeForm.studyMode,
        campus: intakeForm.campus,
        departmentId: intakeForm.departmentId ? Number(intakeForm.departmentId) : undefined,
        startDate: intakeForm.startDate || undefined,
        expectedEndDate: intakeForm.expectedEndDate || undefined,
      };

      const url = editingIntake
        ? `https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/intakes/${editingIntake.id}`
        : 'https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/intakes';
      const method = editingIntake ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ type: 'error', text: (data && (data.message || data.error)) || 'Failed to save intake' });
        return;
      }

      setMessage({ type: 'success', text: (data && data.message) ? data.message : (editingIntake ? 'Intake updated' : 'Intake created') });
      setShowCreateIntakeModal(false);
      setEditingIntake(null);
      await fetchIntakes();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save intake' });
    }
  };

  const handleDeleteIntake = async (intake: Intake) => {
    if (!window.confirm(`Delete intake "${intake.name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/intakes/${intake.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ type: 'error', text: (data && (data.message || data.error)) || 'Failed to delete intake' });
        return;
      }
      setMessage({ type: 'success', text: (data && data.message) ? data.message : 'Intake deleted' });
      if (selectedIntakeForProgress && selectedIntakeForProgress.id === intake.id) {
        setSelectedIntakeForProgress(null);
        setIntakeProgress([]);
      }
      fetchIntakes();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete intake' });
    }
  };

  const fetchIntakes = async () => {
    setIntakesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/intakes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        setIntakes([]);
        return;
      }
      const payload = await response.json();
      const list: any[] = Array.isArray(payload) ? payload : (payload.data || []);
      setIntakes(list as Intake[]);
    } catch {
      setIntakes([]);
    } finally {
      setIntakesLoading(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportUsers = async (format: 'csv' | 'xlsx') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/users/export/${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (!res.ok) {
        let msg = `Failed to export users (${format.toUpperCase()})`;
        try {
          const data = await res.json();
          msg = (data && (data.message || data.error)) || msg;
        } catch {}
        setMessage({ type: 'error', text: msg });
        return;
      }
      const blob = await res.blob();
      triggerDownload(blob, format === 'csv' ? 'users.csv' : 'users.xlsx');
      setMessage({ type: 'success', text: `Users exported (${format.toUpperCase()})` });
    } catch {
      setMessage({ type: 'error', text: `Failed to export users (${format.toUpperCase()})` });
    }
  };

  const handleImportUsers = async (format: 'csv' | 'xlsx', file: File) => {
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/users/import/${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: form,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ type: 'error', text: (data && (data.message || data.error)) || `Failed to import users (${format.toUpperCase()})` });
        return;
      }

      setMessage({ type: 'success', text: (data && data.message) ? data.message : `Users imported (${format.toUpperCase()})` });
      fetchUsers();
    } catch {
      setMessage({ type: 'error', text: `Failed to import users (${format.toUpperCase()})` });
    }
  };

  // Delete a course completion request (admin only)
  const handleDeleteCourseCompletionRequest = async (requestId: number) => {
    if (!window.confirm('Delete this course completion request?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/course-completion-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Course completion request deleted' });
        fetchCourseCompletionRequests();
      } else {
        let msg = 'Failed to delete course completion request';
        try {
          const data = await response.json();
          msg = (data && (data.message || data.error)) || msg;
        } catch {}
        setMessage({ type: 'error', text: msg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete course completion request' });
    }
  };

  const handleDismissTimetable = (timetableId: number) => {
    if (!timetableId) return;
    const updated = Array.from(new Set([...dismissedTimetableIds, timetableId]));
    persistDismissed(updated);
    setMessage({ type: 'success', text: 'Timetable dismissed on your dashboard' });
  };

  const handleDeleteTimetable = async (timetableId: number) => {
    if (!window.confirm('Delete this timetable entry for all users?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables/${timetableId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { 
        fetchTimetables();
      } else {
        let msg = 'Failed to delete timetable';
        try { const data = await res.json(); msg = data?.message || msg; } catch {}
        setMessage({ type: 'error', text: msg });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to delete timetable' });
    }
  };

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

  // Avoid double-running in React StrictMode (dev) which mounts effects twice
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchAllData();
  }, []);

  // Keep room status fresh across tabs and on focus
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'rooms:invalidate') {
        fetchRooms();
      }
    };
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchRooms();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  const fetchAllData = async () => {
    // Fetch non-dependent data in parallel (excluding swap-requests to avoid backend noise on failures)
    await Promise.all([
      fetchTimetables(),
      fetchNotifications(),
      fetchUsers(),
      fetchRooms(),
      fetchCourseCompletionRequests(),
      fetchIntakes()
    ]);

    // Faculties and Departments are needed before Courses so that names map correctly
    await fetchFaculties();
    await fetchDepartments();
    await fetchCourses();

    // Always fetch swap requests for Admin management
    fetchSwapRequests();
  };

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/timetables', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTimetables(data.data || []);
      } else {
        console.error('Failed to fetch timetables');
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
    } finally {
      setLoading(false);
    }
  };

  const swapWarnedRef = useRef(false);
  const fetchSwapRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/swap-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        setSwapRequests([]);
        return;
      }
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        setSwapRequests([]);
        return;
      }
      const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setSwapRequests(items);
    } catch (error) {
      setSwapRequests([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []); // Only on mount

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
      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
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
        (n: Notification, i: number, arr: Notification[]) => arr.findIndex((x: Notification) => x.id === n.id) === i
      );
      setNotifications(uniqueNotifications);
      setUnreadCount(uniqueNotifications.filter((n: Notification) => !n.isRead).length);
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Dismiss notification handler
  const handleDismissNotification = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        setUnreadCount(updated.filter(n => !n.isRead).length);
        return updated;
      });
      setMessage({ type: 'success', text: 'Notification dismissed' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to dismiss notification' });
    }
  };

  // Delete notification handler (system-wide)
  const handleDeleteNotification = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => {
        const updated = prev.filter(n => n.id !== notificationId);
        setUnreadCount(updated.filter(n => !n.isRead).length);
        return updated;
      });
      setMessage({ type: 'success', text: 'Notification deleted for all users' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete notification' });
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Some backends serialize boolean getters like isBooked() as `booked` instead of `isBooked`.
        // Normalize here so the UI status and actions render correctly.
        const list: any[] = Array.isArray(data) ? data : (data?.data || []);
        const normalized = list.map((r: any) => ({
          ...r,
          isBooked: (r?.isBooked ?? r?.booked ?? r?.is_booked ?? false),
          bookedByClassRepName: (r?.bookedByClassRepName ?? r?.booked_by_class_rep_name ?? r?.classRepName ?? r?.class_rep_name ?? undefined),
        }));
        setRooms(normalized);
      } else {
        console.error('Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/faculties', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const payload = await response.json();
        const list: any[] = Array.isArray(payload) ? payload : (payload.data || []);
        const normalized = list.map((f: any) => ({
          ...f,
          id: f.id ?? f.facultyId ?? f.faculty_id,
          faculty_name: f.faculty_name ?? f.name
        }));
        setFaculties(normalized);
      } else {
        console.error('Failed to fetch faculties');
      }
    } catch (error) {
      console.error('Error fetching faculties:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const payload = await response.json();
        const list: any[] = Array.isArray(payload) ? payload : (payload.data || []);
        const normalized = list.map((d: any) => {
          const facultyId = d.facultyId ?? d.faculty_id ?? (d.faculty && typeof d.faculty === 'object' ? d.faculty.id : undefined);
          const facultyObj = facultyId != null ? faculties.find((f: any) => Number(f.id) === Number(facultyId)) : undefined;
          const facultyName = (
            facultyObj?.faculty_name ||
            (d.faculty && typeof d.faculty === 'object' ? (d.faculty.faculty_name || d.faculty.name) : undefined) ||
            d.facultyName ||
            (typeof d.faculty === 'string' ? d.faculty : undefined)
          );
          return {
            ...d,
            id: d.id ?? d.departmentId ?? d.department_id,
            department_name: d.department_name ?? d.name,
            facultyId,
            facultyName
          } as Department;
        });
        setDepartments(normalized);
        // Cache departments for offline/fallback usage
        try { localStorage.setItem('departments', JSON.stringify(normalized)); } catch {}
      } else {
        console.error('Failed to fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCourses = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const payload = await response.json();
      console.log('Raw courses data:', payload); // Debug log
      
      const list: Course[] = Array.isArray(payload) ? payload : (payload.data || []);
      // Prepare a local departments list with cache fallback
      let depList: any[] = departments;
      if (!Array.isArray(depList) || depList.length === 0) {
        try {
          const cached = localStorage.getItem('departments');
          if (cached) depList = JSON.parse(cached);
        } catch {}
      }
      // Ensure departments are available if we need to map IDs -> names
      const needsDepartments = (!depList || depList.length === 0) && list.some((course: any) =>
        Array.isArray(course?.departmentIds) ||
        Array.isArray((course as any)?.department_ids) ||
        (Array.isArray(course?.departments) && course.departments.some((d: any) => typeof d === 'number' || (d && typeof d === 'object' && ('id' in d))))
      );
      if (needsDepartments) {
        try {
          await fetchDepartments();
          // refresh depList after fetch
          try {
            const cached = localStorage.getItem('departments');
            if (cached) depList = JSON.parse(cached);
          } catch {}
        } catch (e) {
          console.warn('Departments fetch on-demand failed, continuing without it');
        }
      }
      
      const coursesWithDetails = await Promise.all(list.map(async (course: any) => {
        // Normalize common id variants early
        const normalizedId = course.id ?? course.courseId ?? course.course_id;
        // Faculty name: resolve from id, nested object, or string fields
        const facultyIdFromCourse = (course && (course.facultyId ?? (course.faculty && typeof course.faculty === 'object' ? course.faculty.id : undefined)));
        const facultyFromId = facultyIdFromCourse != null
          ? faculties.find((f: any) => Number(f.id) === Number(facultyIdFromCourse))
          : undefined;
        const facultyName = (
          facultyFromId?.faculty_name ||
          (course.faculty && typeof course.faculty === 'object' ? (course.faculty.faculty_name || course.faculty.name) : undefined) ||
          course.facultyName ||
          (typeof course.faculty === 'string' ? course.faculty : undefined) ||
          'N/A'
        );

        // Department names - try multiple possible sources
        let departmentNames: string[] = [];

        // Case 1: precomputed departmentNames exists
        if (Array.isArray(course.departmentNames)) {
          departmentNames = course.departmentNames.filter(Boolean);
        }
        // Case 1b: snake_case variant department_names
        else if (Array.isArray((course as any).department_names)) {
          departmentNames = ((course as any).department_names as any[]).filter(Boolean);
        }
        // Case 2: departments array exists (can be objects, strings, or IDs)
        else if (Array.isArray(course.departments)) {
          departmentNames = course.departments
            .map((d: any) => {
              if (d && typeof d === 'object') return d.department_name || d.name;
              // if it's an ID or string, try lookup
              const idNum = Number(d);
              if (!Number.isNaN(idNum) && depList && depList.length) {
                const found = depList.find((dep: any) => Number(dep.id) === idNum);
                return found?.department_name || (found as any)?.name;
              }
              return d; // fallback to raw string
            })
            .filter(Boolean) as string[];
        }
        // Case 3: departmentIds array exists - look up names
        else if (Array.isArray(course.departmentIds) && depList && depList.length > 0) {
          departmentNames = course.departmentIds
            .map((id: any) => {
              const idNum = Number(id);
              if (Number.isNaN(idNum)) return undefined;
              const found = depList.find((d: any) => Number(d.id) === idNum);
              return found?.department_name || (found as any)?.name;
            })
            .filter(Boolean) as string[];
        }
        // Case 4: department_ids (snake_case) array
        else if (Array.isArray((course as any).department_ids) && depList && depList.length > 0) {
          const ids = (course as any).department_ids as any[];
          departmentNames = ids
            .map((id: any) => {
              const idNum = Number(id);
              if (Number.isNaN(idNum)) return undefined;
              const found = depList.find((d: any) => Number(d.id) === idNum);
              return found?.department_name || (found as any)?.name;
            })
            .filter(Boolean) as string[];
        }
        // Case 5: join table courseDepartments
        else if (Array.isArray((course as any).courseDepartments)) {
          departmentNames = (course as any).courseDepartments
            .map((cd: any) => cd?.department?.department_name || cd?.departmentName || cd?.department?.name)
            .filter(Boolean);
        }
        // Case 6: single departmentId or department_id
        else if ((course as any).departmentId != null || (course as any).department_id != null) {
          const idVal = (course as any).departmentId ?? (course as any).department_id;
          const idNum = Number(idVal);
          if (!Number.isNaN(idNum) && depList && depList.length) {
            const found = depList.find((d: any) => Number(d.id) === idNum);
            if (found?.department_name) departmentNames = [found.department_name];
          }
        }
        // Case 7: single department object or string
        else if (course.department && typeof course.department === 'object') {
          departmentNames = [course.department.department_name || course.department.name].filter(Boolean);
        } else if (typeof course.department === 'string') {
          departmentNames = [course.department].filter(Boolean);
        }
        // Case 8: stringified list fields
        if (departmentNames.length === 0) {
          const str = (course as any).departmentName || (course as any).departmentsString || (course as any).department_names_string || (course as any).departmentNamesString;
          if (typeof str === 'string' && str.trim().length) {
            departmentNames = str.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        // Final fallback: call helper to fetch departments by course if still empty
        if (departmentNames.length === 0 && normalizedId != null && token) {
          try {
            const resolved = await fetchCourseDepartmentsNames(Number(normalizedId), token);
            if (Array.isArray(resolved) && resolved.length > 0) {
              departmentNames = resolved;
            }
          } catch (e) {
            // ignore and keep fallback
          }
        }

        const courseResult = { 
          ...course,
          id: normalizedId ?? course.id, 
          facultyName,
          // Keep empty when unknown; avoid storing 'N/A' in state so UI can retry/resolve later
          departmentNames
        };
        // cache per-course resolved department names
        try {
          if (Array.isArray(departmentNames) && departmentNames.length && (normalizedId != null)) {
            localStorage.setItem(`course:${normalizedId}:departmentNames`, JSON.stringify(departmentNames));
          }
        } catch {}
        return courseResult;
      }));

      // Hydrate missing department names using departmentIds or course detail endpoint
      const tokenStr = localStorage.getItem('token');
      const hydrated = await Promise.all(coursesWithDetails.map(async (c: any) => {
        // If already has names, keep
        if (Array.isArray(c.departmentNames) && c.departmentNames.length > 0) return c;
        // Try cache
        try {
          if (c.id != null) {
            const cached = localStorage.getItem(`course:${c.id}:departmentNames`);
            if (cached) {
              const arr = JSON.parse(cached);
              if (Array.isArray(arr) && arr.length) return { ...c, departmentNames: arr };
            }
          }
        } catch {}
        // Try lookup via departmentIds
        if (Array.isArray(c.departmentIds) && depList && depList.length > 0) {
          const fromIds = c.departmentIds
            .map((id: any) => {
              const idNum = Number(id);
              if (Number.isNaN(idNum)) return undefined;
              const found = depList.find((d: any) => Number(d.id) === idNum);
              return found?.department_name || (found as any)?.name;
            })
            .filter(Boolean);
          if (fromIds.length > 0) return { ...c, departmentNames: fromIds };
        }
        // Fallback to API detail
        if (tokenStr && c.id != null) {
          try {
            const names = await fetchCourseDepartmentsNames(Number(c.id), tokenStr);
            if (Array.isArray(names) && names.length > 0) {
              try { localStorage.setItem(`course:${c.id}:departmentNames`, JSON.stringify(names)); } catch {}
              return { ...c, departmentNames: names };
            }
          } catch {}
        }
        return c;
      }));

      setCourses(hydrated);
    } else {
      console.error('Failed to fetch courses');
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
  }
};

// Resolve department names using ONLY the course detail endpoint to avoid hitting non-existent URLs
const fetchCourseDepartmentsNames = async (courseId: number, token: string): Promise<string[]> => {
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } as any;
  const url = `https://digital-timetable-backend-production-49c7.up.railway.app/api/courses/${courseId}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const payload = await res.json();
    // Direct CourseDto
    const direct = payload?.departmentNames ?? payload?.department_names;
    if (Array.isArray(direct) && direct.length) return direct.filter(Boolean);
    // Wrapped
    const wrapped = payload?.data;
    const wrappedNames = wrapped?.departmentNames ?? wrapped?.department_names;
    if (Array.isArray(wrappedNames) && wrappedNames.length) return wrappedNames.filter(Boolean);
    // As a last resort, if departments array exists
    const deps = payload?.departments ?? wrapped?.departments ?? [];
    if (Array.isArray(deps)) {
      const names = deps
        .map((d: any) => d?.department_name || d?.name)
        .filter(Boolean);
      if (names.length) return names;
    }
    return [];
  } catch {
    return [];
  }
};

const [editingCourse, setEditingCourse] = useState<Course | null>(null);

const handleEditCourse = (course: Course) => {
  setEditingCourse(course);
  setCourseForm({
    course_name: course.course_name,
    course_code: course.course_code,
    course_credit: course.course_credit,
    facultyId: course.facultyId?.toString() || '',
    departmentId: (course as any).departmentId?.toString() || (Array.isArray((course as any).departmentIds) ? (course as any).departmentIds[0]?.toString() : '') || ''
  });
  setShowCreateCourseModal(true);
};

const handleCourseSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const courseData = {
      course_name: courseForm.course_name,
      course_code: courseForm.course_code,
      course_credit: courseForm.course_credit,
      facultyId: Number(courseForm.facultyId),
      departmentId: courseForm.departmentId ? Number(courseForm.departmentId) : undefined
    };

    // Add debug log
    console.log('Submitting course data:', courseData);

    let response;
    if (editingCourse) {
      response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });
    } else {
      response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });
    }

    let responseData: any = null;
    let responseText: string | null = null;
    try {
      responseData = await response.json();
    } catch {
      try {
        responseText = await response.text();
      } catch {
        responseText = null;
      }
    }
    console.log('API Response:', responseData ?? responseText); // Debug log

    if (response.ok) {
      setMessage({
        type: 'success',
        text: editingCourse ? 'Course updated successfully' : 'Course created successfully'
      });
      setShowCreateCourseModal(false);
      setEditingCourse(null);
      setCourseForm({
        course_name: '',
        course_code: '',
        course_credit: 10,
        facultyId: '',
        departmentId: ''
      });
      fetchCourses();
    } else {
      const statusMsg = response.status ? ` (HTTP ${response.status})` : '';
      const backendMsg =
        (responseData && (responseData.message || responseData.error)) ||
        (typeof responseText === 'string' && responseText.trim() ? responseText.trim() : null);
      const fallbackMsg = response.status === 403
        ? 'Not authorized to create/update course. Please login as ADMIN.'
        : (editingCourse ? 'Failed to update course' : 'Failed to create course');
      setMessage({
        type: 'error',
        text: `${(backendMsg || fallbackMsg)}${statusMsg}`
      });
    }
  } catch (error) {
    console.error('Error submitting course:', error); // Debug log
    setMessage({
      type: 'error',
      text: editingCourse ? 'Failed to update course' : 'Failed to create course'
    });
  }
};

  const fetchCourseCompletionRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/course-completion-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCourseCompletionRequests(data.data || []);
      } else {
        console.error('Failed to fetch course completion requests');
      }
    } catch (error) {
      console.error('Error fetching course completion requests:', error);
    }
  };

  const handleSwapRequestAction = async (swapRequestId: number, action: 'approve' | 'reject', notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('adminNotes', notes || '');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/swap-requests/${swapRequestId}/${action === 'approve' ? 'admin-approve' : 'admin-reject'}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Swap request ${action}ed successfully` });
        fetchSwapRequests();
        setShowSwapModal(false);
        setSelectedSwapRequest(null);
        setAdminNotes('');
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || `Failed to ${action} swap request` });
      }
    } catch (error) {
      console.error(`Error ${action}ing swap request:`, error);
      setMessage({ type: 'error', text: `Failed to ${action} swap request` });
    }
  };

  // Course Completion Request Management Functions
  const openCourseCompletionModal = (request: CourseCompletionRequest) => {
    setSelectedCompletionRequest(request);
    setAdminNotes('');
    setShowCourseCompletionModal(true);
  };

  const handleCourseCompletionAction = async (requestId: number, action: 'approve' | 'reject', notes?: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/admin/course-completion-requests/${requestId}/${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ adminNotes: notes || '' })
    });
    
    if (response.ok) {
      setMessage({ type: 'success', text: `Course completion request ${action}ed successfully` });
      // Refresh both admin and lecturer data
      await Promise.all([
        fetchCourseCompletionRequests(),
        fetchCourses() // This will ensure the course status is updated
      ]);
      setShowCourseCompletionModal(false);
      setSelectedCompletionRequest(null);
      setAdminNotes('');
    } else {
      const errorData = await response.json();
      setMessage({ type: 'error', text: errorData.message || `Failed to ${action} course completion request` });
    }
  } catch (error) {
    console.error(`Error ${action}ing course completion request:`, error);
    setMessage({ type: 'error', text: `Failed to ${action} course completion request` });
  }
};

  const openSwapModal = (swapRequest: SwapRequest) => {
    setSelectedSwapRequest(swapRequest);
    setShowSwapModal(true);
  };

  const handleUserAction = async (userId: number, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let method = 'POST';
      
      if (action === 'delete') {
        endpoint = `https://digital-timetable-backend-production-49c7.up.railway.app/api/users/${userId}`;
        method = 'DELETE';
      } else {
        // Use unified toggle endpoint for activate/deactivate
        endpoint = `https://digital-timetable-backend-production-49c7.up.railway.app/api/users/${userId}/toggle-status`;
        method = 'POST';
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const pastTense = action === 'activate' ? 'activated' : (action === 'deactivate' ? 'deactivated' : 'deleted');
        setMessage({ type: 'success', text: `User ${pastTense} successfully` });
        fetchUsers();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || `Failed to ${action} user` });
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      setMessage({ type: 'error', text: `Failed to ${action} user` });
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'User created successfully' });
        setShowCreateUserModal(false);
        setUserForm({ name: '', email: '', phoneNumber: '', password: '', role: 'LECTURER' });
        fetchUsers();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to create user' });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage({ type: 'error', text: 'Failed to create user' });
    }
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'User updated successfully' });
        setShowEditUserModal(false);
        setEditingUser(null);
        setUserForm({ name: '', email: '', phoneNumber: '', password: '', role: 'LECTURER' });
        fetchUsers();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update user' });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: 'Failed to update user' });
    }
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: '',
      role: user.role
    });
    setShowEditUserModal(true);
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_name: courseForm.course_name,
          course_code: courseForm.course_code,
          course_credit: courseForm.course_credit,
          facultyId: Number(courseForm.facultyId),
          departmentId: courseForm.departmentId ? Number(courseForm.departmentId) : undefined
        })
      });
      if (response.ok) {
        setShowCreateCourseModal(false);
        setCourseForm({ course_name: '', course_code: '', course_credit: 10, facultyId: '', departmentId: '' });
        fetchCourses();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to create course' });
      }
    } catch (error) {
      console.error('Error creating course:', error);
      setMessage({ type: 'error', text: 'Failed to create course' });
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/rooms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...roomForm,
          capacity: parseInt(roomForm.capacity)
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Room created successfully' });
        setShowCreateRoomModal(false);
        setRoomForm({ room_name: '', block_name: '', location: '', capacity: '' });
        fetchRooms();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to create room' });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setMessage({ type: 'error', text: 'Failed to create room' });
    }
  };

  const openEditRoomModal = (room: Room) => {
    setEditingRoom(room);
    setCurrentRoomId(room.id);
    setRoomForm({
      room_name: room.room_name,
      block_name: room.block_name,
      location: room.location,
      capacity: room.capacity.toString()
    });
    setShowEditRoomModal(true);
  };

  const updateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/rooms/${editingRoom.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...roomForm,
          capacity: parseInt(roomForm.capacity)
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Room updated successfully' });
        setShowEditRoomModal(false);
        setEditingRoom(null);
        setCurrentRoomId(null);
        setRoomForm({ room_name: '', block_name: '', location: '', capacity: '' });
        fetchRooms();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to update room' });
      }
    } catch (error) {
      console.error('Error updating room:', error);
      setMessage({ type: 'error', text: 'Failed to update room' });
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Room deleted successfully' });
        fetchRooms();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete room' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete room' });
    }
  };

  const handleUnbookRoom = async (roomId: number) => {
    if (!window.confirm('Mark this room as available?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/rooms/${roomId}/unbook`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Room marked as available' });
        // let other tabs know
        try { localStorage.setItem('rooms:invalidate', Date.now().toString()); } catch {}
        fetchRooms();
      } else {
        let msg = 'Failed to mark room as available';
        try { const data = await res.json(); msg = data?.message || msg; } catch {}
        setMessage({ type: 'error', text: msg });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to mark room as available' });
    }
  };

  const createDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/departments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          department_name: departmentForm.department_name,
          facultyId: departmentForm.facultyId
        })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Department created successfully' });
        setShowCreateDepartmentModal(false);
        setDepartmentForm({ department_name: '', facultyId: '' });
        fetchDepartments();
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'Failed to create department' });
      }
    } catch (error) {
      console.error('Error creating department:', error);
      setMessage({ type: 'error', text: 'Failed to create department' });
    }
  };

  const createFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Frontend validation
    if (!facultyForm.faculty_name.trim()) {
      setMessage({ type: 'error', text: 'Faculty name is required' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/faculties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          faculty_name: facultyForm.faculty_name.trim()
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Faculty created successfully' });
        setShowCreateFacultyModal(false);
        setFacultyForm({ faculty_name: '' });
        fetchFaculties();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Invalid response from server' }));
        setMessage({ type: 'error', text: errorData.message || 'Failed to create faculty' });
      }
    } catch (error) {
      console.error('Error creating faculty:', error);
      setMessage({ type: 'error', text: 'Failed to create faculty' });
    }
  };

  const openEditFacultyModal = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setCurrentFacultyId(faculty.id);
    setFacultyForm({
      faculty_name: faculty.faculty_name
    });
    setShowEditFacultyModal(true);
  };

  const updateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;
    
    // Frontend validation
    if (!facultyForm.faculty_name.trim()) {
      setMessage({ type: 'error', text: 'Faculty name is required' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/faculties/${editingFaculty.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          faculty_name: facultyForm.faculty_name.trim()
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Faculty updated successfully' });
        setShowEditFacultyModal(false);
        setEditingFaculty(null);
        setCurrentFacultyId(null);
        setFacultyForm({ faculty_name: '' });
        fetchFaculties();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Invalid response from server' }));
        setMessage({ type: 'error', text: errorData.message || 'Failed to update faculty' });
      }
    } catch (error) {
      console.error('Error updating faculty:', error);
      setMessage({ type: 'error', text: 'Failed to update faculty' });
    }
  };

  const handleDeleteFaculty = async (facultyId: number) => {
    if (!window.confirm('Are you sure you want to delete this faculty?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/faculties/${facultyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Faculty deleted successfully' });
        fetchFaculties();
      } else {
        // Get the error message from the response
        const errorMessage = await response.text();
        setMessage({ type: 'error', text: errorMessage || 'Failed to delete faculty' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete faculty' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const renderRoomsTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Room Management</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-200">Manage all rooms in the system</p>
        </div>
        <button
          onClick={() => setShowCreateRoomModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Room
        </button>
      </div>
      
      {rooms.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Room Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Block</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Booked By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              {rooms.map(room => (
                <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-neutral-100">
                    {room.room_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">
                    {room.block_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">
                    {room.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">
                    {room.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      room.isBooked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {room.isBooked ? 'is booked' : 'Available'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-neutral-300">
                    {room.isBooked ? (room.bookedByClassRepName || 'Unknown') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {room.isBooked && (
                      <button
                        onClick={() => handleUnbookRoom(room.id)}
                        className="text-green-700 hover:text-green-900 transition"
                        title="Mark room as available"
                      >
                        <p>Mark Available</p>
                      </button>
                    )}
                    <button
                      onClick={() => openEditRoomModal(room)}
                      className="text-blue-600 hover:text-blue-900 transition"
                    >
                     <p>Edit</p>
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="text-red-600 hover:text-red-900 transition"
                    >
                      <p>Delete</p>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
           
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Found</h3>
           
        </div>
      )}
    </div>
  );

  const renderFacultiesTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Faculty Management</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-200">Manage all faculties in the system</p>
        </div>
        <button
          onClick={() => setShowCreateFacultyModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Faculty
        </button>
      </div>
      
      {faculties.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Faculty Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              {faculties.map(faculty => (
                <tr key={faculty.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-neutral-100">
                    {faculty.faculty_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditFacultyModal(faculty)}
                      className="text-blue-600 hover:text-blue-900 transition"
                    >
                      <p>Edit</p>
                    </button>
                    <button
                      onClick={() => handleDeleteFaculty(faculty.id)}
                      className="text-red-600 hover:text-red-900 transition"
                    >
                      <p>Delete</p>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
           
          <h3 className="text-lg   text-gray-900 mb-2">No Faculties Found</h3>
                      
        </div>
      )}
    </div>
  );

  const renderOverviewTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Dashboard Overview</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-200">Welcome to your administrator dashboard</p>
      </div>
      <div className="p-4">
        {/* Stats Cards - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#004aad] text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm">Total Timetables</p>
                <p className="text-lg sm:text-xl font-bold">{timetables.length}</p>
              </div>
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm">Active Users</p>
                <p className="text-lg sm:text-xl font-bold">{users.filter(u => u.active).length}</p>
              </div>
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm">Available Rooms</p>
                <p className="text-lg sm:text-xl font-bold">{rooms.filter(r => !r.isBooked).length}</p>
              </div>
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          
          <div className="bg-[#004aad] text-white rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm">Total Courses</p>
                <p className="text-lg sm:text-xl font-bold">{courses.length}</p>
              </div>
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-orange-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Bottom sections - Responsive layout */}
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left flex items-start"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Add New User</p>
                  <p className="text-xs opacity-75">Create user accounts</p>
                </div>
              </button>
              <button
                onClick={() => setShowCreateCourseModal(true)}
                className="w-full p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left flex items-start"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Create Course</p>
                  <p className="text-xs opacity-75">Add new courses</p>
                </div>
              </button>
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="w-full p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left flex items-start"
              >
                <svg className="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-medium text-sm">Add Room</p>
                  <p className="text-xs opacity-75">Create new rooms</p>
                </div>
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-base font-semibold text-gray-900 mb-3">Pending Requests</h4>
            <div className="space-y-2">
              {swapRequests.filter(r => r.status === 'PENDING').length > 0 ? (
                swapRequests.filter(r => r.status === 'PENDING').slice(0, 3).map(request => (
                  <div key={request.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {request.requestorName} → {request.targetUserName}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{request.reason}</p>
                      </div>
                      <button
                        onClick={() => openSwapModal(request)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded ml-2 flex-shrink-0 hover:bg-blue-700 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-xs text-center py-4">No pending requests</p>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow p-4 border border-transparent dark:border-neutral-800">
            <h4 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-3">Recent Activity</h4>
            <div className="space-y-2">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map(notification => (
                  <div key={notification.id} className={`p-2 rounded-lg ${
                    !notification.isRead ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60' : 'bg-gray-50 dark:bg-neutral-800'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium text-gray-900 dark:text-neutral-100 truncate">{notification.title}</h4>
                        <p className="text-xs text-gray-600 dark:text-neutral-300 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-400 dark:text-neutral-400 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          notification.type === 'booking' ? 'bg-green-500' :
                          notification.type === 'request' ? 'bg-blue-500' :
                          notification.type === 'conflict' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete notification"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-neutral-400 text-xs text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimetablesTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">All Timetables</h2>
        <button
          onClick={fetchTimetables}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading timetables...</p>
        </div>
      ) : timetables.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lecturer</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {timetables.map(timetable => (
                    <tr key={timetable.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{timetable.course_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{timetable.faculty_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{timetable.department_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{timetable.lecture_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{timetable.room_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{new Date(timetable.startDateTime).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{new Date(timetable.endDateTime).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{timetable.section}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          timetable.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {timetable.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No timetables found.</p>
        </div>
      )}
    </div>
  );

  const renderSwapRequestsTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
      <h2 className="text-xl font-bold p-4 border-b text-gray-800 dark:text-neutral-100">All Swap Requests</h2>
      
      {swapRequests.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {swapRequests.map(request => (
            <div key={request.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex-1 mb-2 sm:mb-0">
                  <h3 className="font-semibold text-sm sm:text-base mb-1">
                    From: {request.requestorName} → To: {request.targetUserName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-600">Original: {request.originalTimetableInfo}</p>
                      <p className="text-gray-600">Proposed: {request.proposedTimetableInfo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Reason: {request.reason}</p>
                      <p className="text-gray-600">Requested: {new Date(request.requestDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      request.status === 'ADMIN_APPROVED' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'ADMIN_REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-auto mt-2 sm:mt-0">
                  {request.status === 'PENDING' && (
                    <button
                      onClick={() => openSwapModal(request)}
                      className="w-full sm:w-auto px-3 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No swap requests found.</p>
        </div>
      )}
    </div>
  );

  const renderUsersTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">All Users</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={usersImportCsvRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportUsers('csv', file);
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={usersImportXlsxRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportUsers('xlsx', file);
              e.currentTarget.value = '';
            }}
          />

          <button
            onClick={() => usersImportCsvRef.current?.click()}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-sm"
          >
            Import CSV
          </button>
          <button
            onClick={() => usersImportXlsxRef.current?.click()}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-sm"
          >
            Import XLSX
          </button>
          <button
            onClick={() => handleExportUsers('csv')}
            className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 transition text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExportUsers('xlsx')}
            className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800 transition text-sm"
          >
            Export XLSX
          </button>
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
          >
            Create User
          </button>
        </div>
      </div>
      
      {users.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{user.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{user.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{user.phoneNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'LECTURER' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'CLASS_REPRESENT' ? 'bg-green-100 text-green-800' :
                          user.role === 'STAFF' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          {!user.active && (
                            <button
                              onClick={() => handleUserAction(user.id, 'activate')}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Activate
                            </button>
                          )}
                          {user.active && (
                            <button
                              onClick={() => handleUserAction(user.id, 'deactivate')}
                              className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No users found.</p>
        </div>
      )}
    </div>
  );

  const renderCoursesTab = () => (
  <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b">
      <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">All Courses</h2>
      <button
        onClick={() => setShowCreateCourseModal(true)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
      >
        Create Course
      </button>
    </div>
    
    {courses.length > 0 ? (
      <div className="overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Code</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map(course => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{course.course_name || course.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{course.course_code || course.courseCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{course.course_credit || course.credits || course.credit}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{course.facultyName || course.faculty || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-normal break-words text-sm text-gray-800 max-w-xs sm:max-w-md">
                      {(() => {
                        // 1) Prefer hydrated names from state
                        const byNames = Array.isArray((course as any).departmentNames)
                          ? (course as any).departmentNames.filter(Boolean)
                          : (Array.isArray((course as any).department_names) ? (course as any).department_names.filter(Boolean) : []);
                        if (byNames.length > 0) return byNames.join(', ');

                        // 2) Map IDs to names using loaded departments list
                        const idsSource = (course as any).departmentIds || (course as any).department_ids;
                        const byIds = Array.isArray(idsSource) && Array.isArray(departments)
                          ? idsSource
                              .map((id: any) => {
                                const idNum = Number(id);
                                if (Number.isNaN(idNum)) return undefined;
                                const found = departments.find(d => Number(d.id) === idNum);
                                return found?.department_name || (found as any)?.name;
                              })
                              .filter(Boolean)
                          : [];
                        if ((byIds as string[]).length > 0) return (byIds as string[]).join(', ');

                        // 3) Use departments array from course (objects/strings/ids)
                        if (Array.isArray((course as any).departments)) {
                          const arr = (course as any).departments
                            .map((d: any) => {
                              if (d && typeof d === 'object') return d.department_name || d.name;
                              const idNum = Number(d);
                              if (!Number.isNaN(idNum) && Array.isArray(departments)) {
                                const found = departments.find(dep => Number(dep.id) === idNum);
                                return found?.department_name || (found as any)?.name;
                              }
                              return typeof d === 'string' ? d : undefined;
                            })
                            .filter(Boolean);
                          if (arr.length > 0) return arr.join(', ');
                        }

                        // 4) Join-table style
                        if (Array.isArray((course as any).courseDepartments)) {
                          const arr = (course as any).courseDepartments
                            .map((cd: any) => cd?.department?.department_name || cd?.departmentName || cd?.department?.name)
                            .filter(Boolean);
                          if (arr.length > 0) return arr.join(', ');
                        }

                        // 5) Single fields or object
                        if (typeof (course as any).department === 'object' && (course as any).department !== null) {
                          const obj = (course as any).department;
                          const n = obj?.department_name || obj?.name;
                          if (n) return n;
                        }
                        const single =
                          (course as any).departmentName ||
                          (course as any).department_name ||
                          (course as any).departmentNamesString ||
                          (course as any).department; // may be a string
                        if (single) return single as string;
                        return 'N/A';
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm flex gap-2 items-center">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded transition"
                        title="Edit Course"
                      >
                        <p>Edit</p>
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={deletingCourseId === course.id}
                        className={`p-1 rounded transition ${deletingCourseId === course.id ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                        title="Delete Course"
                        aria-disabled={deletingCourseId === course.id}
                      >
                        <p>{deletingCourseId === course.id ? 'Deleting…' : 'Delete'}</p>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No courses found.</p>
      </div>
    )}
  </div>
);



  const renderDepartmentsTab = () => (
  <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b">
      <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">All Departments</h2>
      <button
        onClick={() => {
          setCurrentDepartmentId(null); // Set to null for create mode
          setDepartmentForm({
            department_name: '',
            facultyId: ''
          });
          setShowCreateDepartmentModal(true);
        }}
        className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
      >
        Create Department
      </button>
    </div>
    
    {departments.length > 0 ? (
      <div className="overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departments.map(department => {
                  const faculty = faculties.find(f => f.id === department.facultyId);
                  return (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{department.department_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {faculty ? faculty.faculty_name : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setCurrentDepartmentId(department.id); // Set the ID for update mode
                              setDepartmentForm({
                                department_name: department.department_name,
                                facultyId: department.facultyId?.toString() || ''
                              });
                              setShowCreateDepartmentModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!department.id) {
                                setMessage({ type: 'error', text: 'Invalid department ID' });
                                return;
                              }
                              
                              if (window.confirm('Are you sure you want to delete this department?')) {
                                try {
                                  const token = localStorage.getItem('token');
                                  console.log('Deleting department:', { departmentId: department.id, departmentName: department.department_name });
                                  
                                  const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/departments/${department.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                    },
                                  });
                                  
                                  if (response.ok) {
                                    setMessage({ type: 'success', text: 'Department deleted successfully' });
                                    fetchDepartments();
                                  } else {
                                    // Robustly handle JSON or plain text error responses
                                    let errorMessage = 'Failed to delete department';
                                    try {
                                      const raw = await response.text();
                                      try {
                                        const parsed = JSON.parse(raw);
                                        errorMessage = parsed?.message || parsed?.error || raw || errorMessage;
                                        console.error('Delete department error:', { status: response.status, error: parsed, departmentId: department.id });
                                      } catch {
                                        errorMessage = raw || errorMessage;
                                        console.error('Delete department error (text):', { status: response.status, error: raw, departmentId: department.id });
                                      }
                                    } catch (parseErr) {
                                      console.error('Delete department error (parse failure):', { status: response.status, error: parseErr, departmentId: department.id });
                                    }
                                    setMessage({ type: 'error', text: errorMessage });
                                  }
                                } catch (error) {
                                  console.error('Delete department exception:', { error, departmentId: department.id });
                                  setMessage({ type: 'error', text: 'Failed to delete department' });
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No departments found.</p>
      </div>
    )}
  </div>
);

const [currentDepartmentId, setCurrentDepartmentId] = useState(null);
const handleDepartmentSubmit = async (e) => {
  e.preventDefault();
  
  // Frontend validation
  if (!departmentForm.department_name.trim()) {
    setMessage({ type: 'error', text: 'Department name is required' });
    return;
  }
  
  if (!departmentForm.facultyId || departmentForm.facultyId === '') {
    setMessage({ type: 'error', text: 'Please select a faculty' });
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    let response;
    
    // Prepare payload with proper data types
    const payload = {
      department_name: departmentForm.department_name.trim(),
      facultyId: parseInt(departmentForm.facultyId, 10)
    };
    
    if (currentDepartmentId) {
      // Update existing department
      console.log('Updating department:', { currentDepartmentId, payload });
      response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/departments/${currentDepartmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } else {
      // Create new department
      response = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (response.ok) {
      setMessage({
        type: 'success',
        text: currentDepartmentId ? 'Department updated successfully' : 'Department created successfully'
      });
      setShowCreateDepartmentModal(false);
      setDepartmentForm({ department_name: '', facultyId: '' });
      setCurrentDepartmentId(null);
      fetchDepartments();
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Invalid response from server' }));
      console.error('Department API error:', { status: response.status, errorData, currentDepartmentId, payload });
      setMessage({
        type: 'error',
        text: errorData.message || (currentDepartmentId ? 'Failed to update department' : 'Failed to create department')
      });
    }
  } catch (error) {
    console.error('Department submit error:', { error, currentDepartmentId, payload: { department_name: departmentForm.department_name, facultyId: departmentForm.facultyId } });
    setMessage({
      type: 'error',
      text: currentDepartmentId ? 'Failed to update department' : 'Failed to create department'
    });
  }
};



  const renderCalendarTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow overflow-hidden">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <TimetableCalendar setMessage={setMessage} isAdmin={true} />
        </div>
      </div>
    </div>
  );

  const renderCourseCompletionTab = () => (
    <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Course Completion Requests</h3> 
          </div> 
        </div>
      </div>
      
      {courseCompletionRequests.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {courseCompletionRequests.map(request => (
            <div key={request.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                <div className="flex-1 mb-4 lg:mb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {request.courseName} ({request.courseCode})
                      </h4>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{request.lecturerName}</span>
                        <span className="mx-2">•</span>
                        <span>{request.lecturerEmail}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l-.5 3.5M18 7l-.5 3.5M8 7l-.5 3.5m10 0L17 14H7l-.5-3.5M17 14v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v5" />
                        </svg>
                        <span className="font-medium">Request Date:</span>
                      </div>
                      <p className="text-gray-900 ml-5">{new Date(request.requestDate).toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-gray-600 mb-1">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">Lecturer Notes:</span>
                      </div>
                      <p className="text-gray-900 ml-5">{request.notes}</p>
                    </div>
                  </div>
                  
                  {request.adminNotes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center text-blue-700 mb-1">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium text-sm">Admin Notes:</span>
                      </div>
                      <p className="text-blue-900 text-sm ml-5">{request.adminNotes}</p>
                    </div>
                  )}
                </div>
                
                <div className="w-full lg:w-auto flex items-center gap-2">
                  {request.status === 'PENDING' && (
                    <button
                      onClick={() => openCourseCompletionModal(request)}
                      className="w-full lg:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Review
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCourseCompletionRequest(request.id)}
                    className="w-full lg:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                    title="Delete request"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12"> 
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Course Completion Requests</h3> 
          
        </div>
      )}
    </div>
  );

   
  

  const handleDeleteCourse = async (courseId: number) => {
    // Re-entrancy guard to prevent double toasts from rapid clicks
    if (deletingCourseId !== null) return;
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    setDeletingCourseId(courseId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://digital-timetable-backend-production-49c7.up.railway.app/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) { 
        fetchCourses();
      } else {
        let msg = 'Failed to delete course';
        try {
          const data = await response.json();
          msg = (data && (data.message || data.error)) || msg;
        } catch {}
        setMessage({ type: 'error', text: msg });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete course' });
    } finally {
      setDeletingCourseId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors duration-300">
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        setMessage={setMessage}
        onLogout={handleLogout}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
      {/* Flex row for desktop: Sidebar and main content side by side */}
      <div className="flex flex-1 w-full">
        <Sidebar 
          userRole="ADMIN"
          userName="Administrator"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 transition-all duration-300">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'calendar' && renderCalendarTab()}
          {activeTab === 'announcements' && <AdminAnnouncements />}
          {activeTab === 'swap-requests' && renderSwapRequestsTab()}
          {activeTab === 'course-completion' && renderCourseCompletionTab()}
          {activeTab === 'all-timetables' && (
            <Suspense fallback={null}>
              <AllTimetablesTab
                timetables={timetables}
                dismissedTimetableIds={dismissedTimetableIds}
                onRefresh={fetchTimetables}
                onDelete={handleDeleteTimetable}
                onDismiss={handleDismissTimetable}
              />
            </Suspense>
          )}
          {activeTab === 'intakes' && renderIntakesTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'courses' && renderCoursesTab()}
          {activeTab === 'rooms' && renderRoomsTab()}
          {activeTab === 'departments' && renderDepartmentsTab()}
          {activeTab === 'faculties' && renderFacultiesTab()}
        </main>
      </div>
      {/* Keep all existing modals */}
      {/* Swap Request Modal */}
      {showSwapModal && selectedSwapRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative p-6">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowSwapModal(false)}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-blue-600">Review Swap Request</h3>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From:</label>
                <p className="text-gray-900">{selectedSwapRequest.requestorName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
                <p className="text-gray-900">{selectedSwapRequest.targetUserName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Schedule:</label>
                <p className="text-gray-900">{selectedSwapRequest.originalTimetableInfo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Schedule:</label>
                <p className="text-gray-900">{selectedSwapRequest.proposedTimetableInfo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason:</label>
                <p className="text-gray-900">{selectedSwapRequest.reason}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  rows={3}
                  placeholder="Add admin notes (optional)"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleSwapRequestAction(selectedSwapRequest.id, 'approve', adminNotes)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition"
              >
                Approve
              </button>
              <button
                onClick={() => handleSwapRequestAction(selectedSwapRequest.id, 'reject', adminNotes)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative p-6 dark:bg-neutral-900 dark:text-neutral-100 dark:border dark:border-neutral-700">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowCreateUserModal(false)}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-blue-600">Create New User</h3>
            
            <form onSubmit={createUser} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Name</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={userForm.phoneNumber}
                  onChange={(e) => setUserForm({...userForm, phoneNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Password</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="LECTURER">Lecturer</option> 
                  <option value="CLASS_REPRESENT">Class Representative</option>
                  <option value="USER">User</option>
                </select>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
              >
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <Suspense fallback={null}>
          <EditUserModal
            userForm={userForm}
            setUserForm={setUserForm}
            onSubmit={updateUser}
            onClose={() => setShowEditUserModal(false)}
          />
        </Suspense>
      )}

      {/* Create/Edit Intake Modal */}
      {showCreateIntakeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl relative p-4 sm:p-6 dark:bg-neutral-900 dark:text-neutral-100 dark:border dark:border-neutral-700 max-h-[90vh] overflow-hidden">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowCreateIntakeModal(false)}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-blue-600">{editingIntake ? 'Edit Intake' : 'Create Intake'}</h3>

            <div className="overflow-y-auto pr-1 max-h-[calc(90vh-110px)]">
              <form onSubmit={handleSaveIntake} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Name</label>
                <input
                  type="text"
                  value={intakeForm.name}
                  onChange={(e) => setIntakeForm({ ...intakeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Intake Code</label>
                <input
                  type="text"
                  value={intakeForm.intakeCode}
                  onChange={(e) => setIntakeForm({ ...intakeForm, intakeCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Program Name</label>
                <input
                  type="text"
                  value={intakeForm.programName}
                  onChange={(e) => setIntakeForm({ ...intakeForm, programName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Study Mode</label>
                <select
                  value={intakeForm.studyMode}
                  onChange={(e) => setIntakeForm({ ...intakeForm, studyMode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="DAY">DAY</option>
                  <option value="EVENING">EVENING</option>
                  <option value="WEEKEND">WEEKEND</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Campus</label>
                <input
                  type="text"
                  value={intakeForm.campus}
                  onChange={(e) => setIntakeForm({ ...intakeForm, campus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Department</label>
                <select
                  value={intakeForm.departmentId}
                  onChange={(e) => setIntakeForm({ ...intakeForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={intakeForm.startDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Expected End Date</label>
                  <input
                    type="date"
                    value={intakeForm.expectedEndDate}
                    onChange={(e) => setIntakeForm({ ...intakeForm, expectedEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
              >
                {editingIntake ? 'Update Intake' : 'Create Intake'}
              </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Course Modal */}
      {showCreateCourseModal && (
        <Suspense fallback={null}>
          <CourseModal
            editingCourse={editingCourse}
            courseForm={courseForm}
            setCourseForm={setCourseForm}
            faculties={faculties}
            departments={departments}
            onSubmit={handleCourseSubmit}
            onClose={() => {
              setShowCreateCourseModal(false);
              setEditingCourse(null);
              setCourseForm({
                course_name: '',
                course_code: '',
                course_credit: 10,
                facultyId: '',
                departmentId: ''
              });
            }}
          />
        </Suspense>
      )}
      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <Suspense fallback={null}>
          <CreateRoomModal
            roomForm={roomForm}
            setRoomForm={setRoomForm}
            onSubmit={createRoom}
            onClose={() => setShowCreateRoomModal(false)}
          />
        </Suspense>
      )}
      {/* Create Department Modal */}
      {showCreateDepartmentModal && (
        <Suspense fallback={null}>
          <DepartmentModal
            isEditing={!!currentDepartmentId}
            departmentForm={departmentForm}
            setDepartmentForm={setDepartmentForm}
            faculties={faculties}
            onSubmit={handleDepartmentSubmit}
            onClose={() => setShowCreateDepartmentModal(false)}
          />
        </Suspense>
      )}

      {/* Create Faculty Modal */}
      {showCreateFacultyModal && (
        <Suspense fallback={null}>
          <CreateFacultyModal
            facultyForm={facultyForm}
            setFacultyForm={setFacultyForm}
            onSubmit={createFaculty}
            onClose={() => setShowCreateFacultyModal(false)}
          />
        </Suspense>
      )}

      {/* Edit Room Modal */}
      {showEditRoomModal && editingRoom && (
        <Suspense fallback={null}>
          <EditRoomModal
            roomForm={roomForm}
            setRoomForm={setRoomForm}
            onSubmit={updateRoom}
            onClose={() => {
              setShowEditRoomModal(false);
              setEditingRoom(null);
              setCurrentRoomId(null);
              setRoomForm({ room_name: '', block_name: '', location: '', capacity: '' });
            }}
          />
        </Suspense>
      )}

      {/* Edit Faculty Modal */}
      {showEditFacultyModal && editingFaculty && (
        <Suspense fallback={null}>
          <EditFacultyModal
            facultyForm={facultyForm}
            setFacultyForm={setFacultyForm}
            onSubmit={updateFaculty}
            onClose={() => {
              setShowEditFacultyModal(false);
              setEditingFaculty(null);
              setCurrentFacultyId(null);
              setFacultyForm({ faculty_name: '' });
            }}
          />
        </Suspense>
      )}

      {/* Course Completion Approval Modal */}
      {showCourseCompletionModal && selectedCompletionRequest && (
        <Suspense fallback={null}>
          <CourseCompletionModal
            request={selectedCompletionRequest}
            adminNotes={adminNotes}
            setAdminNotes={setAdminNotes}
            onApprove={(id, notes) => handleCourseCompletionAction(id, 'approve', notes)}
            onReject={(id, notes) => handleCourseCompletionAction(id, 'reject', notes)}
            onClose={() => setShowCourseCompletionModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Dashboard;