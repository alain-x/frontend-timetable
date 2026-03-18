import React, { memo } from 'react';

interface RoomForm {
  room_name: string;
  block_name: string;
  location: string;
  capacity: string | number;
}

interface Props {
  roomForm: RoomForm;
  setRoomForm: React.Dispatch<React.SetStateAction<RoomForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const CreateRoomModal: React.FC<Props> = ({ roomForm, setRoomForm, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md relative p-6 border border-transparent dark:border-neutral-800">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Create New Room</h3>
        
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Room Name</label>
            <input
              type="text"
              value={roomForm.room_name}
              onChange={(e) => setRoomForm({ ...roomForm, room_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Block Name</label>
            <input
              type="text"
              value={roomForm.block_name}
              onChange={(e) => setRoomForm({ ...roomForm, block_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Location</label>
            <input
              type="text"
              value={roomForm.location}
              onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Capacity</label>
            <input
              type="number"
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition"
          >
            Create Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default memo(CreateRoomModal);
