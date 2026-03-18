import React, { useEffect, useMemo, useState } from 'react';

interface RoleItem { id?: number; role?: string }
interface Announcement {
  id: number;
  title: string;
  message: string;
  roles: (string | RoleItem)[];
  createdAt: string;
  createdBy: string;
}

const StudentAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetch('http://localhost:8091/api/announcements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const data = await res.json();
      // Only show announcements intended for students (or for all)
      const all = (data.data || []) as Announcement[];
      const filtered = all
        .filter(a => {
          const roles = Array.isArray(a.roles) ? a.roles : [];
          const roleStrings = roles
            .map(r => (typeof r === 'string' ? r : (r?.role || '')))
            .map(r => r.trim().toUpperCase());
          // If no roles provided, treat as ALL (backend may default)
          if (roleStrings.length === 0) return true;
          return roleStrings.includes('STUDENT') || roleStrings.includes('ALL');
        })
        // Sort newest first by createdAt
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnnouncements(filtered);
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

  return (
    <div className="max-w-6xl mx-auto mt-6 px-3 md:px-0">
      <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 dark:border-neutral-700"> 
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-neutral-100">Announcements</h2>
          </div>
        </div>

        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 dark:text-neutral-300">Announcement History</h3>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/3 dark:bg-neutral-800" />
              <div className="h-16 bg-slate-100 rounded dark:bg-neutral-800" />
              <div className="h-4 bg-slate-100 rounded w-1/2 dark:bg-neutral-800" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
              {error}
            </div>
          ) : visibleAnnouncements.length === 0 ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm px-4 py-6 text-center dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300">
              No announcements yet.
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
  );
};

export default StudentAnnouncements;
