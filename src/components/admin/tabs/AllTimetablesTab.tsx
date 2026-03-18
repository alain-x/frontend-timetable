import React, { memo } from 'react';

interface Timetable {
  id: number;
  course_name: string;
  lecture_name?: string;
  lecturerName?: string;
  section?: string;
  startDateTime: string;
  endDateTime: string;
}

interface Props {
  timetables: Timetable[];
  dismissedTimetableIds: number[];
  onRefresh: () => void;
  onDelete: (id: number) => void;
  onDismiss: (id: number) => void;
}

const AllTimetablesTab: React.FC<Props> = ({ timetables, dismissedTimetableIds, onRefresh, onDelete, onDismiss }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const getStatus = (endStr: string) => {
    const end = new Date(endStr);
    if (isSameDate(end, yesterday)) return 'To Be End';
    if (end.getTime() < now.getTime()) return 'Ended';
    return 'In Progress';
  };

  const formatDateTime = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString();
  };

  const visible = timetables.filter((tt) => !dismissedTimetableIds.includes(tt.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">All Timetables</h2>
          <p className="text-sm text-neutral-500">All courses scheduled in the timetable</p>
        </div>
        <button onClick={onRefresh} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Refresh</button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Course</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Lecturer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Section</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date to start</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date to end</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-800">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">No timetable entries found.</td>
              </tr>
            )}
            {visible.map((tt) => {
              const status = getStatus(tt.endDateTime);
              const badgeClass =
                status === 'In Progress'
                  ? 'bg-green-100 text-green-700'
                  : status === 'Ended'
                  ? 'bg-neutral-100 text-neutral-700'
                  : 'bg-yellow-100 text-yellow-700';
              return (
                <tr key={tt.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{tt.course_name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{tt.lecture_name || tt.lecturerName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{tt.section || '-'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{formatDateTime(tt.startDateTime)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">{formatDateTime(tt.endDateTime)}</td>
                  <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>{status}</span></td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => onDelete(tt.id)}
                      className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
                      title="Delete timetable"
                    >Delete</button>
                    <button
                      onClick={() => onDismiss(tt.id)}
                      className="px-2 py-1 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition"
                      title="Dismiss from your dashboard"
                    >Dismiss</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(AllTimetablesTab);
