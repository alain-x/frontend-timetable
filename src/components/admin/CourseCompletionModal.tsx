import React from 'react';

interface CourseCompletionRequest {
  id: number;
  lecturerName: string;
  lecturerEmail: string;
  courseName: string;
  courseCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  notes: string;
}

interface Props {
  request: CourseCompletionRequest;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  onApprove: (id: number, notes: string) => void;
  onReject: (id: number, notes: string) => void;
  onClose: () => void;
}

const CourseCompletionModal: React.FC<Props> = ({ request, adminNotes, setAdminNotes, onApprove, onReject, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative p-6">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-6 text-blue-600 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Review Course Completion Request
        </h3>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course:</label>
                <p className="text-gray-900 font-semibold">
                  {request.courseName} ({request.courseCode})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Date:</label>
                <p className="text-gray-900">{new Date(request.requestDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lecturer Notes:</label>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-blue-900">{request.notes}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Response Notes:</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Add your response notes (optional)"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onApprove(request.id, adminNotes)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve Completion
          </button>
          <button
            onClick={() => onReject(request.id, adminNotes)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md transition flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject Request
          </button>
          <button
            onClick={onClose}
            className="sm:w-auto px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCompletionModal;
