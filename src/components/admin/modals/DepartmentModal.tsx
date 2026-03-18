import React, { memo } from 'react';

interface DepartmentForm {
  department_name: string;
  facultyId: number | '';
}

interface Faculty {
  id: number;
  faculty_name: string;
}

interface Props {
  isEditing: boolean;
  departmentForm: DepartmentForm;
  setDepartmentForm: React.Dispatch<React.SetStateAction<DepartmentForm>>;
  faculties: Faculty[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const DepartmentModal: React.FC<Props> = ({
  isEditing,
  departmentForm,
  setDepartmentForm,
  faculties,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md relative p-6 border border-transparent dark:border-neutral-800">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">
          {isEditing ? 'Update Department' : 'Create Department'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Department Name</label>
            <input
              type="text"
              value={departmentForm.department_name}
              onChange={(e) => setDepartmentForm({ ...departmentForm, department_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Faculty</label>
            <select
              value={departmentForm.facultyId}
              onChange={(e) => setDepartmentForm({ ...departmentForm, facultyId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            >
              <option value="" disabled>
                Select Faculty
              </option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.faculty_name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
          >
            {isEditing ? 'Update Department' : 'Create Department'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default memo(DepartmentModal);
