import React, { useEffect, useMemo, useState } from 'react';

interface Announcement {
  id: number;
  title: string;
  message: string;
  roles: string[];
  createdAt: string;
  createdBy: string;
}

// Roles selection removed: announcements now broadcast to all by default.

const LecturerAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  // Roles removed from create form; backend defaults to ALL.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Per-user dismissed announcements (local-only dismiss)
  const userKey =
    (typeof localStorage !== 'undefined' && (localStorage.getItem('userId') || localStorage.getItem('currentUserId') || localStorage.getItem('username') || localStorage.getItem('role'))) ||
    'anonymous';
  const storageKey = `dismissed_announcements_${userKey}`;
  const [dismissed, setDismissed] = useState<number[]>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://digital-timetable-backend-production.up.railway.app/api/announcements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const data = await res.json();
      setAnnouncements(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Persist dismisses when changed
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(dismissed));
      }
    } catch {}
  }, [dismissed, storageKey]);

  const visibleAnnouncements = useMemo(
    () => announcements.filter(a => !dismissed.includes(a.id)),
    [announcements, dismissed]
  );

  const dismiss = (id: number) => {
    setDismissed(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  // No role selection handler required.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      if (!title.trim() || !message.trim()) {
        setError('Please fill all fields.');
        setLoading(false);
        return;
      }
      const res = await fetch('https://digital-timetable-backend-production.up.railway.app/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // Send without roles; backend will default to ALL (system-wide broadcast)
        body: JSON.stringify({ title, message }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create announcement');
      }
      setTitle('');
      setMessage('');
      setSuccess('Announcement sent!');
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Error creating announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-6 px-3 md:px-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Create Announcement */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 dark:border-neutral-700"> 
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-neutral-100">Create Announcement</h2> 
            </div>
          </div>
          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3">{success}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder=""
                />
              </div>
              {/* Notify Roles removed: announcements broadcast to all users by default */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Posting...' : 'Post Announcement'}
                </button> 
              </div>
            </form>
          </div>
        </div>

        {/* Right: Announcement History */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 dark:border-neutral-700">
             
            <div>
              <h3 className="text-xl font-bold text-slate-900">Announcement History</h3> 
            </div>
          </div>
          <div className="px-6 py-5">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-20 bg-slate-100 rounded" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
              </div>
            ) : visibleAnnouncements.length === 0 ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm px-4 py-6 text-center dark:bg-neutral-800 dark:text-neutral-400">
                No announcements.
              </div>
            ) : (
              <ul className="space-y-4">
                {visibleAnnouncements.map(a => (
                  <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-slate-900 dark:text-neutral-100">{a.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-neutral-400">{new Date(a.createdAt).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => dismiss(a.id)}
                          className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300"
                          aria-label="Dismiss announcement"
                          title="Dismiss"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-700 whitespace-pre-line dark:text-neutral-200">{a.message}</p>
                    <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">By: {a.createdBy}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerAnnouncements;
