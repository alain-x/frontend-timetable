import React, { memo } from 'react';

interface CourseForm {
  course_name: string;
  course_code: string;
  course_credit: number;
  facultyId: string;
  departmentId: string;
}

interface Faculty {
  id: number;
  faculty_name: string;
}

interface Department {
  id: number;
  department_name: string;
}

interface Course {
  id: number;
  course_name: string;
  course_code: string;
  course_credit: number;
  facultyId?: number;
  departmentId?: number;
}

interface Props {
  editingCourse: Course | null;
  courseForm: CourseForm;
  setCourseForm: React.Dispatch<React.SetStateAction<CourseForm>>;
  faculties: Faculty[];
  departments: Department[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const CourseModal: React.FC<Props> = ({
  editingCourse,
  courseForm,
  setCourseForm,
  faculties,
  departments,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl relative p-4 sm:p-6 border border-transparent dark:border-neutral-800">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>

        <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">
          {editingCourse ? 'Update Course' : 'Create New Course'}
        </h3>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Course Name</label>
            <input
              type="text"
              value={courseForm.course_name}
              onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Course Code</label>
            <input
              type="text"
              value={courseForm.course_code}
              onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Course Credit</label>
              <input
                type="number"
                value={courseForm.course_credit}
                onChange={(e) => setCourseForm({ ...courseForm, course_credit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min={1}
                max={30}
                required
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Enter credit hours (1-30)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Faculty</label>
              <select
                value={courseForm.facultyId}
                onChange={(e) => setCourseForm({ ...courseForm, facultyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Faculty</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.faculty_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Department</label>
            <select
              value={courseForm.departmentId}
              onChange={(e) => {
                const selectedId = e.target.value;
                setCourseForm({
                  ...courseForm,
                  departmentId: selectedId,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.department_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 rounded-md hover:bg-gray-400 dark:hover:bg-neutral-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              {editingCourse ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default memo(CourseModal);
