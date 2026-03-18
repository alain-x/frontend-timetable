import React from 'react';

interface FacultyForm { faculty_name: string }

interface Props {
  facultyForm: FacultyForm;
  setFacultyForm: React.Dispatch<React.SetStateAction<FacultyForm>>;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  onClose: () => void;
}

const CreateFacultyModal: React.FC<Props> = ({ facultyForm, setFacultyForm, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md relative p-6 border border-transparent dark:border-neutral-800">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Create New Faculty</h3>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Faculty Name</label>
            <input
              type="text"
              value={facultyForm.faculty_name}
              onChange={(e) => setFacultyForm({ ...facultyForm, faculty_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
          >
            Create Faculty
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateFacultyModal;
