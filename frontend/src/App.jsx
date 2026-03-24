import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, MonitorPlay, Mic, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = "http://localhost:8000/api";

export default function App() {
  const [url, setUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [script, setScript] = useState('');
  const [tasks, setTasks] = useState([]);
  
  // Phase 6 & 7 States
  const [autoTransform, setAutoTransform] = useState(false);
  const [transformConfig, setTransformConfig] = useState({
    hflip: false,
    speed_shift: false,
    md5_pad: false,
    dynamic_noise: false,
    color_shift: false,
    edge_crop: false,
    unsharp_mask: false,
    hide_old_sub: false,
    new_subtitle_text: ''
  });

  // Phase 9: Voiceover states
  const [voiceList, setVoiceList] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState('+0%');

  // Fetch available voices on mount
  useEffect(() => {
    axios.get(`${API_BASE}/voiceover/voices`)
      .then(res => setVoiceList(res.data.voices || []))
      .catch(() => setVoiceList(['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural', 'en-US-AriaNeural']));
  }, []);

  // Hàm mở WebSocket
  const startTracking = (taskId, title) => {
    setTasks(prev => [{ id: taskId, title, status: 'QUEUED', meta: {}, url: '' }, ...prev]);
    
    // Download route: ws://localhost:8000/api/download/ws/status/...
    // Transform route: ws://localhost:8000/api/transform/ws/status/... (Tương tự cho các api khác, tạm dùng chung route nếu muốn, hoặc viết cụ thể)
    // Để tiện lợi, backend Phase 1 đã mở cổng WS tại download. Phase 2/3 không viết WS endpoint riêng mà reuse? 
    // Wait, bài toán Phase 4: ta gọi endpoint của chức năng nào thì frontend mở ws của chức năng đó.
    // Dùng download ws port tạm cho mọi task:
    const ws = new WebSocket(`ws://localhost:8000/api/download/ws/status/${taskId}`);
    
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
      // Determine if transform is requested
      const shouldTransform = autoTransform || Object.values(transformConfig).some(v => v);
      const payloadConfig = autoTransform 
        ? { hflip: true, speed_shift: true, md5_pad: true, dynamic_noise: true, color_shift: true, edge_crop: true, unsharp_mask: true } 
        : transformConfig;

      const { data } = await axios.post(`${API_BASE}/download`, { 
        url, 
        cookie,
        auto_transform: shouldTransform,
        transform_configs: {
          ...payloadConfig,
          hide_old_sub: transformConfig.hide_old_sub,
          new_subtitle_text: transformConfig.new_subtitle_text || undefined
        }
      });
      
      // Handle array of tasks returned from chain
      if (data.tasks) {
        data.tasks.forEach(t => startTracking(t.id, t.name));
      } else if (data.task_id) {
        startTracking(data.task_id, 'Tải luồng Video gốc');
      }
      
      setUrl('');
    } catch (e) { alert('Lỗi gọi API Download!'); }
  };

  const handleTransform = async (videoId) => {
    try {
      const payloadConfig = autoTransform 
        ? { hflip: true, speed_shift: true, md5_pad: true, dynamic_noise: true, color_shift: true, edge_crop: true, unsharp_mask: true } 
        : transformConfig;
      const { data } = await axios.post(`${API_BASE}/transform`, { 
        video_id: videoId,
        transform_configs: payloadConfig
      });
      startTracking(data.task_id, 'Anti-scan thủ công'); // reuse ws
    } catch (e) { alert('Lỗi gọi API Transform!'); }
  };

  const handleVoiceover = async (videoId) => {
    if(!script) return alert("Nhập script!");
    try {
      const { data } = await axios.post(`${API_BASE}/voiceover`, { 
        video_id: videoId, 
        script,
        voice: selectedVoice || undefined,
        rate: voiceRate
      });
      startTracking(data.task_id, 'Ghép Giọng AI');
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
                placeholder="Nhập URL TikTok (VD: https://v.douyin...)"
                value={url} onChange={e => setUrl(e.target.value)}
              />
              <input 
                type="text" 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cookie TikTok/Douyin (Tuỳ chọn/Bắt buộc với Douyin)"
                value={cookie} onChange={e => setCookie(e.target.value)}
              />
              <button 
                onClick={handleDownload}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center justify-center transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Tải Video
              </button>
            </div>
            
            {/* Anti-Scan Configs */}
            <div className="mt-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="checkbox" 
                  id="autoTransform"
                  checked={autoTransform}
                  onChange={(e) => setAutoTransform(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="autoTransform" className="text-sm font-bold text-indigo-900 cursor-pointer">
                  [AUTO] Chạy Anti-Scan hạng nặng (Bao gồm 7 bộ lọc nâng cao)
                </label>
              </div>
              
              {!autoTransform && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 ml-6 border-t border-indigo-100/50 pt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.hflip} onChange={e => setTransformConfig({...transformConfig, hflip: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Lật ngang Hình ảnh (H-Flip)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.speed_shift} onChange={e => setTransformConfig({...transformConfig, speed_shift: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Đổi Tốc độ Ngẫu nhiên (±5%)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.md5_pad} onChange={e => setTransformConfig({...transformConfig, md5_pad: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Chèn 24 Bytes đổi MD5
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.dynamic_noise} onChange={e => setTransformConfig({...transformConfig, dynamic_noise: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Phủ Nhiễu Động (Micro-Noise 1%)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.color_shift} onChange={e => setTransformConfig({...transformConfig, color_shift: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Đổi Hệ Màu (Sáng/Tương phản)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.edge_crop} onChange={e => setTransformConfig({...transformConfig, edge_crop: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Cắt Viền Trống (Phóng to 2%)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-700">
                    <input type="checkbox" checked={transformConfig.unsharp_mask} onChange={e => setTransformConfig({...transformConfig, unsharp_mask: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Làm sắc cạnh (Unsharp Mask)
                  </label>
                </div>
              )}
            </div>

            {/* Phase 9: Subtitle Config */}
            <div className="mt-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <h3 className="text-sm font-bold text-amber-900 mb-3">Phụ đề / Subtitle</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-amber-700">
                  <input type="checkbox" checked={transformConfig.hide_old_sub} onChange={e => setTransformConfig({...transformConfig, hide_old_sub: e.target.checked})} className="rounded text-amber-600 focus:ring-amber-500" />
                  Che Sub cũ (Phủ dải đen 15% dưới cùng)
                </label>
                <textarea
                  className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  placeholder="Nhập phụ đề mới (text thuần, tự chia thời gian). Để trống nếu không cần."
                  value={transformConfig.new_subtitle_text}
                  onChange={e => setTransformConfig({...transformConfig, new_subtitle_text: e.target.value})}
                />
              </div>
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
            <div className="flex gap-4 items-center mt-1">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Giọng đọc</label>
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Mặc định (vi-VN-HoaiMyNeural)</option>
                  {voiceList.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="w-40">
                <label className="text-xs text-gray-500 mb-1 block">Tốc độ: {voiceRate}</label>
                <input
                  type="range" min={-30} max={30} step={5}
                  value={parseInt(voiceRate)}
                  onChange={e => setVoiceRate(`${e.target.value >= 0 ? '+' : ''}${e.target.value}%`)}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      JobID: {task.id.slice(0,8)}...
                    </span>
                    <h3 className="text-md font-semibold text-gray-900 mt-2 flex items-center gap-2">
                       {task.title}: {task.status} 
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
