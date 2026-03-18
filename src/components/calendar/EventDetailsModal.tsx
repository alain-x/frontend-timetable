import React, { memo } from 'react';

type TimetableEvent = {
  lecture_name: string;
  course_name: string;
  room_name?: string;
  faculty_name?: string;
  department_name?: string;
  hours?: number;
  status?: string;
  section: 'DAY' | 'EVENING' | string;
  color?: string;
  start: Date | string;
  end: Date | string;
  notes?: string;
};

interface Props {
  isOpen: boolean;
  event: TimetableEvent | null;
  onClose: () => void;
}

const formatDateDisplay = (date: Date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const EventDetailsModal: React.FC<Props> = ({ isOpen, event, onClose }) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 dark:text-neutral-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-transparent dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-neutral-800 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-neutral-100">Details</h3>
            <p className="text-gray-500 dark:text-neutral-400 mt-1 text-sm">View information about this course</p>
          </div>
          <button
            aria-label="Close details"
            onClick={onClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-100 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Top summary */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: event.color || '#3B82F6' }}></div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xl font-semibold text-gray-800 dark:text-neutral-100 mr-2">{event.lecture_name}</h4>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${event.section === 'DAY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {event.section}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${event.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {event.status}
                </span>
              </div>
              <div className="text-gray-600 dark:text-neutral-300">{event.course_name}</div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Lecturer</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.lecture_name || '—'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Course</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.course_name || '—'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Room</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.room_name || 'No Room'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Faculty</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.faculty_name || '—'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Department</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.department_name || '—'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Hours</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.hours ?? '—'}h</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">Start Date</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{formatDateDisplay(new Date(event.start))}</div>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 dark:text-neutral-400">End Date</div>
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-100">{formatDateDisplay(new Date(event.end))}</div>
            </div>
          </div>

          {/* Notes */}
          {(event.notes && event.notes.trim().length > 0) ? (
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">Notes</div>
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 text-sm text-gray-700 dark:text-neutral-200 whitespace-pre-wrap">{event.notes}</div>
            </div>
          ) : null}

          {/* Footer Actions */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(EventDetailsModal);
