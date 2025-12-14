// src/components/ChatsPage.tsx
import { useNavigate } from 'react-router-dom';

const ChatsPage = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* --- LEFT SIDEBAR (Friends List) --- */}
      <div className="w-1/3 max-w-sm bg-white border-r border-gray-300 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-700">Chats</h2>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Logout</button>
        </div>

        {/* Search Bar */}
        <div className="p-2">
            <input type="text" placeholder="Search" className="w-full px-3 py-1 bg-gray-100 rounded-lg outline-none" />
        </div>

        {/* User List (Scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {/* Mock User 1 */}
          <div className="p-4 hover:bg-gray-100 cursor-pointer border-b border-gray-100">
            <div className="font-semibold text-gray-800">Alice</div>
            <div className="text-sm text-gray-500 truncate">Hey, are we playing today?</div>
          </div>
          {/* Mock User 2 */}
          <div className="p-4 hover:bg-gray-100 cursor-pointer border-b border-gray-100 bg-indigo-50">
            <div className="font-semibold text-gray-800">Bob</div>
            <div className="text-sm text-gray-500 truncate">Sent a photo.</div>
          </div>
        </div>
      </div>

      {/* --- RIGHT MAIN AREA (Chat Window) --- */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
           <h3 className="font-bold text-gray-700">Welcome, {username}</h3>
        </div>

        {/* Messages Area (Empty for now) */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex items-center justify-center">
             <div className="text-gray-400 text-center">
                 <p className="text-xl">Select a chat to start messaging</p>
             </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
                <input type="text" placeholder="Write a message..." className="flex-1 px-4 py-2 border rounded-full outline-none focus:border-indigo-500" />
                <button className="px-6 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600">Send</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatsPage;