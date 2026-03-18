import React, { useState, useEffect } from 'react';

interface SidebarProps {
  userRole?: string;
  userName?: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const getRoleLinks = (role: string) => {
  if (role === 'ADMIN') {
    return [
      { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
      { id: 'calendar', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'all-timetables', label: 'All Timetables', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { id: 'announcements', label: 'Announcements', icon: 'M13 16h-1v-4h-1m4-4V4a2 2 0 00-2-2H7a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-4m-4 0h4' },
      { id: 'swap-requests', label: 'Swap Requests', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
      { id: 'course-completion', label: 'Course Completion', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { id: 'intakes', label: 'Intakes', icon: 'M12 8c-1.657 0-3-1.567-3-3.5S10.343 1 12 1s3 1.567 3 3.5S13.657 8 12 8zm0 2c-4.418 0-8 2.686-8 6v3h16v-3c0-3.314-3.582-6-8-6z' },
      { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
      { id: 'courses', label: 'Courses', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { id: 'rooms', label: 'Rooms', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { id: 'departments', label: 'Departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { id: 'faculties', label: 'Faculties', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    ];
  }
 else if (role === 'LECTURER') {
    return [
      { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
      { id: 'my-courses', label: 'My Courses', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { id: 'calendar', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'announcements', label: 'Announcements', icon: 'M13 16h-1v-4h-1m4-4V4a2 2 0 00-2-2H7a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-4m-4 0h4' },
      { id: 'swap-requests', label: 'Swap Requests', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    ];
  } else if (role === 'CLASS_REPRESENT') {
    return [
      { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
      { id: 'calendar', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'announcements', label: 'Announcements', icon: 'M13 16h-1v-4h-1m4-4V4a2 2 0 00-2-2H7a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-4m-4 0h4' },
      { id: 'swap-requests', label: 'Swap Requests', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
      { id: 'rooms', label: 'Booking Room', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    ];
  } else if (role === 'STUDENT') {
    return [
      { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
      { id: 'calendar', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'announcements', label: 'Announcements', icon: 'M13 16h-1v-4h-1m4-4V4a2 2 0 00-2-2H7a2 2 0 00-2 2v16a2 2 0 002 2h6a2 2 0 002-2v-4m-4 0h4' },
    ];
  }
  return [
    { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
    { id: 'calendar', label: 'Timetable', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];
};

const Sidebar: React.FC<SidebarProps> = ({ userRole = 'User', userName = 'User', activeTab, setActiveTab, onLogout, isOpen, setIsOpen }) => {
  const [role, setRole] = useState(userRole);

  useEffect(() => {
    if (!userRole) {
      const storedRole = localStorage.getItem('role') || 'USER';
      setRole(storedRole);
    } else {
      setRole(userRole);
    }
  }, [userRole]);

  const navLinks = getRoleLinks(role);

  return (
    <>
      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white dark:bg-neutral-950 shadow-lg dark:shadow z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:static md:translate-x-0 md:w-64 md:max-w-none md:h-screen md:shadow-none
          flex flex-col border-l border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 transition-colors duration-300
        `}
        aria-label="Sidebar"
      >
        {/* Close button (mobile only) */}
        <button
          className="absolute top-4 right-4 md:hidden text-neutral-500 hover:text-neutral-900 text-2xl"
          onClick={() => setIsOpen(false)}
          aria-label="Close sidebar"
        >
          &times;
        </button>

        {/* User Info */}
         
        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 sm:space-y-4 py-16 px-4 ">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => { setActiveTab(link.id); setIsOpen(false); }}
              className={`w-full flex items-center px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm font-medium transition-all duration-200 space-x-2 touch-manipulation ${
                activeTab === link.id
                  ? 'bg-primary-100 text-primary-700 shadow'
                  : 'text-neutral-700 hover:text-primary-700 hover:bg-neutral-100'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
              </svg>
              <span className="truncate">{link.label}</span>
            </button>
          ))}
        </nav>
        {/* Logout Button at the bottom */}
        <div className="mt-6 sm:mt-8 px-4 mb-6">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all touch-manipulation"
          >
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="truncate">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 