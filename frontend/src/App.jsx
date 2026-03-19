import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, MonitorPlay, Mic, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = "http://localhost:8000/api";

export default function App() {
  const [url, setUrl] = useState('');
  const [script, setScript] = useState('');
  const [tasks, setTasks] = useState([]);

  // Hàm mở WebSocket
  const startTracking = (taskId, type) => {
    setTasks(prev => [{ id: taskId, type, status: 'QUEUED', meta: {}, url: '' }, ...prev]);
    
    // Download route: ws://localhost:8000/api/download/ws/status/...
    // Transform route: ws://localhost:8000/api/transform/ws/status/... (Tương tự cho các api khác, tạm dùng chung route nếu muốn, hoặc viết cụ thể)
    // Để tiện lợi, backend Phase 1 đã mở cổng WS tại download. Phase 2/3 không viết WS endpoint riêng mà reuse? 
    // Wait, bài toán Phase 4: ta gọi endpoint của chức năng nào thì frontend mở ws của chức năng đó.
    // Dùng download ws port tạm cho mọi task:
    const ws = new WebSocket(`ws://localhost:8000/api/${type}/ws/status/${taskId}`);
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: data.state, meta: data.meta } : t
      ));
    };
  };

  const handleDownload = async () => {
    if(!url) return;
    try {
      const { data } = await axios.post(`${API_BASE}/download`, { url });
      startTracking(data.task_id, 'download');
      setUrl('');
    } catch (e) { alert('Lỗi gọi API Download!'); }
  };

  const handleTransform = async (videoId) => {
    try {
      const { data } = await axios.post(`${API_BASE}/transform`, { video_id: videoId });
      startTracking(data.task_id, 'download'); // reuse ws
    } catch (e) { alert('Lỗi gọi API Transform!'); }
  };

  const handleVoiceover = async (videoId) => {
    if(!script) return alert("Nhập script!");
    try {
      const { data } = await axios.post(`${API_BASE}/voiceover`, { video_id: videoId, script });
      startTracking(data.task_id, 'download'); // reuse ws
    } catch (e) { alert('Lỗi gọi API Voiceover!'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex items-center space-x-3 mb-8">
          <MonitorPlay className="w-10 h-10 text-indigo-600" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Auto-Reup TikTok Admin</h1>
        </header>

        {/* Form Controls */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Tạo Job Tải Mới</h2>
            <div className="flex gap-3">
              <input 
                type="text" 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập URL TikTok (VD: https://www.tiktok.com/@user/video/123)"
                value={url} onChange={e => setUrl(e.target.value)}
              />
              <button 
                onClick={handleDownload}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center justify-center transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Tải Video (No-Watermark)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Script Lồng Tiếng (AI Voiceover)</h2>
            <textarea 
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} 
              placeholder="Gõ nội dung cần lồng tiếng (Dành cho chức năng Transform Voiceover)"
              value={script} onChange={e => setScript(e.target.value)}
            />
          </div>
        </section>

        {/* Task Tracking Table */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Tiến trình xử lý (Jobs)</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Chưa có job nào chạy.</div>
            ) : tasks.map(task => (
              <div key={task.id} className="p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      ID: {task.id.slice(0,8)}...
                    </span>
                    <h3 className="text-md font-semibold text-gray-900 mt-2 flex items-center gap-2">
                       Trạng thái: {task.status} 
                       {task.status === 'PROGRESS' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                       {task.status === 'SUCCESS' && <CheckCircle className="w-5 h-5 text-green-500" />}
                       {task.status === 'FAILURE' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {task.meta?.status || "Đang kết nối..."}
                    </p>
                  </div>
                  
                  {/* Hành động follow-up nếu File đã xong */}
                  {task.status === 'SUCCESS' && task.meta?.video_id && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleTransform(task.meta.video_id)}
                        className="text-xs bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm"
                      >
                        Chạy Anti-Scan (MD5)
                      </button>
                      <button 
                        onClick={() => handleVoiceover(task.meta.video_id)}
                        className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center transition-all shadow-sm"
                      >
                        <Mic className="w-3 h-3 mr-1" /> Ghép Giọng AI
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {task.status === 'PROGRESS' && (
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${task.meta?.progress || 0}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
