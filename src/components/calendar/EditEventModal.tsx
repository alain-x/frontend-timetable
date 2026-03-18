import React, { memo } from 'react';

type Room = { id: number; room_name: string; block_name?: string; location?: string; isBooked?: boolean };

type TimetableEvent = {
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
  classRepUserId?: number;
  classRepName?: string;
  intakeId?: number;
};

interface Props {
  isOpen: boolean;
  isEdit: boolean;
  canCreateEvents: boolean;
  isLecturerUser: boolean;
  isClassRepUser: boolean;
  disableNonTimeFields: boolean;
  disableAllExceptRoom: boolean;
  form: TimetableEvent;
  lecturers: { id: number; name: string }[];
  courses: { id: number; course_name: string; course_code: string }[];
  rooms: Room[];
  faculties: { id: number; faculty_name: string }[];
  departments: { id: number; department_name: string; facultyId?: number }[];
  classReps: { id: number; name: string }[];
  intakes: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onDateChange: (field: 'start' | 'end', value: Date) => void;
}

const formatDateInput = (date: Date) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value: string, endOfDay = false) => {
  return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
};

const EditEventModal: React.FC<Props> = ({
  isOpen,
  isEdit,
  canCreateEvents,
  isLecturerUser,
  isClassRepUser,
  disableNonTimeFields,
  disableAllExceptRoom,
  form,
  lecturers,
  courses,
  rooms,
  faculties,
  departments,
  classReps,
  intakes,
  onClose,
  onSubmit,
  onDelete,
  onChange,
  onDateChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-neutral-900 dark:text-neutral-100 dark:border dark:border-neutral-700">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h3 className="text-2xl font-bold text-gray-800">
            {isEdit ? 'Edit timetable' : 'Create  New Timetable'}
          </h3>
          {(isLecturerUser || isClassRepUser) && isEdit && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-sm">Limited Mode: {isLecturerUser ? 'Time editing only' : 'Room change only'}</span>
              </div>
              <p className="text-amber-700 text-xs mt-1">
                {isLecturerUser ? 'You can only modify the start and end times.' : 'You can only change the room assignment.'} Other event details require admin permissions.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lecturer</label>
              <select
                name="lecture_name"
                value={form.lecture_name}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select Lecturer</option>
                {lecturers.map(lecturer => (
                  <option key={lecturer.id} value={lecturer.name}>
                    {lecturer.name}
                  </option>
                ))}
              </select>
              {(disableNonTimeFields || disableAllExceptRoom) ? (
                <small className="text-amber-600 mt-1 text-xs">Only admins can modify event details</small>
              ) : (
                <small className="text-gray-500 mt-1">
                   Tip: Select from existing lecturers in the system to ensure proper course assignment
                </small>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
              <select
                name="course_name"
                value={form.course_name}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.course_name}>
                    {course.course_name} ({course.course_code})
                  </option>
                ))}
              </select>
              {(disableNonTimeFields || disableAllExceptRoom) ? (
                <small className="text-amber-600 mt-1 text-xs"> Only admins can modify event details</small>
              ) : (
                <small className="text-gray-500 mt-1">Select from courses created in the database</small>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Room</label>
              <select
                name="room_name"
                value={form.room_name}
                onChange={onChange}
                disabled={isLecturerUser && isEdit}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isLecturerUser && isEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select Room</option>
                {rooms.filter(room => !room.isBooked).map(room => (
                  <option key={room.id} value={room.room_name}>
                    {room.room_name} - {room.block_name} ({room.location})
                  </option>
                ))}
              </select>
              {isLecturerUser && isEdit ? (
                <small className="text-amber-600 mt-1 text-xs"> Only admins can modify room assignments</small>
              ) : (
                <small className="text-gray-500 mt-1"></small>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Faculty</label>
              <select
                name="faculty_name"
                value={form.faculty_name}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select Faculty</option>
                {faculties.map(f => (
                  <option key={f.id} value={f.faculty_name}>
                    {f.faculty_name}
                  </option>
                ))}
              </select>
              {(disableNonTimeFields || disableAllExceptRoom) ? (
                <small className="text-amber-600 mt-1 text-xs"> Only admins can modify faculty</small>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
              <select
                name="department_name"
                value={form.department_name}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.department_name}>
                    {d.department_name}
                  </option>
                ))}
              </select>
              {(disableNonTimeFields || disableAllExceptRoom) ? (
                <small className="text-amber-600 mt-1 text-xs"> Only admins can modify department</small>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Intake</label>
              <select
                name="intakeId"
                value={(form as any).intakeId ?? ''}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="">Select Intake</option>
                {(intakes || []).map((i: any) => {
                  const id = i?.id ?? i?.intakeId ?? i?.intake_id;
                  const name = i?.name ?? i?.intakeName ?? i?.intake_name ?? 'Intake';
                  const code = i?.intakeCode ?? i?.intake_code;
                  const mode = (i?.studyMode ?? i?.study_mode ?? '').toString();
                  const label = code ? `${name} (${code})${mode ? ` - ${mode}` : ''}` : `${name}${mode ? ` - ${mode}` : ''}`;
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class Representative</label>
              <select
                name="classRepName"
                value={(form as any).classRepName ?? ''}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Select Class Rep (optional)</option>
                {(classReps || []).map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
              <select
                name="section"
                value={form.section}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value="DAY">Day Section (Morning/Afternoon)</option>
                <option value="EVENING">Evening Section (After 6 PM)</option>
              </select>
              {(disableNonTimeFields || disableAllExceptRoom) ? (
                <small className="text-amber-600 mt-1 text-xs"> Only admins can modify section assignments</small>
              ) : (
                <small className="text-gray-500 mt-1">
                  {form.section === 'DAY' ? 'Day section from 8 AM to 2 PM' : 'Evening section from 6 PM to 10 PM'}
                </small>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hours</label>
              <select
                name="hours"
                value={form.hours}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={3}>3 hours</option>
                <option value={4}>4 hours</option>
                <option value={5}>5 hours</option>
                <option value={6}>6 hours</option>
                <option value={7}>7 hours</option>
                <option value={8}>8 hours</option>
              </select>
              {(disableNonTimeFields || disableAllExceptRoom) ? (
                <small className="text-amber-600 mt-1 text-xs"> Only admins can modify hours</small>
              ) : (
                <small className="text-gray-500 mt-1">Select how many hours this event runs</small>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Event Color</label>
              <input
                type="color"
                name="color"
                value={form.color}
                onChange={onChange}
                disabled={disableNonTimeFields || disableAllExceptRoom}
                className={`w-12 h-8 p-0 border-0 bg-transparent ${
                  (disableNonTimeFields || disableAllExceptRoom) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              />
              {(disableNonTimeFields || disableAllExceptRoom) && (
                <small className="text-amber-600 mt-1 text-xs block">Only admins can modify event colors</small>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                name="start"
                value={form.start instanceof Date ? formatDateInput(form.start) : ''}
                onChange={(e) => onDateChange('start', parseDateOnly(e.target.value, false))}
                disabled={isClassRepUser && isEdit}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isClassRepUser && isEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                name="end"
                value={form.end instanceof Date ? formatDateInput(form.end) : ''}
                onChange={(e) => onDateChange('end', parseDateOnly(e.target.value, false))}
                disabled={isClassRepUser && isEdit}
                className={`w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isClassRepUser && isEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              rows={4}
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              Cancel
            </button>

            {isEdit && canCreateEvents && (
              <button
                type="button"
                onClick={onDelete}
                className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium"
              >
                Delete
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-3 bg-[#004aad] text-white rounded-xl hover:bg-[#003a8a] transition-all duration-200 font-medium shadow-lg"
            >
              {isEdit ? 'update timetable' : ' Create Timetable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default memo(EditEventModal);
