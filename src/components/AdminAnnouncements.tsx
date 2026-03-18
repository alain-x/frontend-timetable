import React from 'react';
import LecturerAnnouncements from './LecturerAnnouncements';

// For now, reuse the LecturerAnnouncements component for admin announcements.
// In the future, we can extend this for admin-specific features if needed.

export default function AdminAnnouncements() {
  return <LecturerAnnouncements />;
}
