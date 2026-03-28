import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Download, MonitorPlay, Mic, Loader2, CheckCircle, AlertTriangle, FolderOpen, RefreshCw, Film, Subtitles } from 'lucide-react';

// Auto-detect API base — works for localhost dev and Cloudflare Tunnel
const API_BASE = window.location.port === '5173' 
  ? "http://localhost:8000/api" 
  : `${window.location.origin}/api`;

const STORAGE_BASE = window.location.port === '5173'
  ? "http://localhost:8000/storage"
  : `${window.location.origin}/storage`;

export default function App() {
  const [url, setUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [script, setScript] = useState('');
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('download'); // download | files
  
  // Anti-scan
  const [autoTransform, setAutoTransform] = useState(true);
  const [transformConfig, setTransformConfig] = useState({
    hflip: false, speed_shift: false, md5_pad: false,
    dynamic_noise: false, color_shift: false,
    edge_crop: false, unsharp_mask: false
  });

  // Subtitle
  const [addSubtitle, setAddSubtitle] = useState(false);
  const [hideOldSub, setHideOldSub] = useState(true);
  const [subCoverY, setSubCoverY] = useState(80);
  const [subCoverH, setSubCoverH] = useState(20);
  const [subText, setSubText] = useState('');
  const [subFontSize, setSubFontSize] = useState(18);
  const [subMarginV, setSubMarginV] = useState(20);

  // Voiceover
  const [addVoiceover, setAddVoiceover] = useState(false);
  const [voiceList, setVoiceList] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState(0);

  // Files
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Fetch voices
  useEffect(() => {
    axios.get(`${API_BASE}/voiceover/voices`)
      .then(res => setVoiceList(res.data.voices || []))
      .catch(() => setVoiceList(['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural']));
  }, []);

  // Fetch files
  const fetchFiles = useCallback(() => {
    setLoadingFiles(true);
    axios.get(`${API_BASE.replace('/api', '')}/api/files`)
      .then(res => setFiles(res.data.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoadingFiles(false));
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Poll task status via REST
  const pollTask = useCallback((taskId, title) => {
    setTasks(prev => [{ id: taskId, title, status: 'QUEUED', meta: {} }, ...prev]);
    
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/download/status/${taskId}`);
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: data.state, meta: data.meta } : t
        ));
        if (data.state === 'SUCCESS' || data.state === 'FAILURE') {
          clearInterval(interval);
          fetchFiles(); // Refresh file list
        }
      } catch { /* retry */ }
    }, 2000);
  }, [fetchFiles]);

  // Handle download submission
  const handleDownload = async () => {
    if (!url) return;
    try {
      const configs = {};
      
      // Anti-scan
      if (autoTransform) {
        Object.assign(configs, {
          hflip: true, speed_shift: true, md5_pad: true,
          dynamic_noise: true, color_shift: true,
          edge_crop: true, unsharp_mask: true
        });
      } else {
        Object.assign(configs, transformConfig);
      }
      
      // Subtitle
      if (addSubtitle) {
        if (hideOldSub) {
          configs.hide_old_sub = true;
          configs.sub_cover_y = subCoverY;
          configs.sub_cover_h = subCoverH;
        }
        if (subText.trim()) {
          configs.new_subtitle_text = subText;
        }
        configs.sub_font_size = subFontSize;
        configs.sub_margin_v = subMarginV;
      }

      const shouldTransform = autoTransform || Object.values(transformConfig).some(v => v) || addSubtitle;

      const { data } = await axios.post(`${API_BASE}/download`, {
        url, cookie: cookie || undefined,
        auto_transform: shouldTransform,
        transform_configs: configs
      });

      if (data.tasks) {
        data.tasks.forEach(t => pollTask(t.id, t.name));
      } else if (data.task_id) {
        pollTask(data.task_id, 'Tải Video');
      }
      
      // Handle voiceover as chained task
      if (addVoiceover && script.trim()) {
        // Extract video_id from URL
        const modalMatch = url.match(/modal_id=(\d+)/);
        const videoMatch = url.match(/\/video\/(\d+)/);
        const videoId = modalMatch?.[1] || videoMatch?.[1];
        
        if (videoId) {
          // Delay voiceover until download+transform finishes
          setTimeout(async () => {
            try {
              const { data: voData } = await axios.post(`${API_BASE}/voiceover`, {
                video_id: videoId, script,
                voice: selectedVoice || undefined,
                rate: `${voiceRate >= 0 ? '+' : ''}${voiceRate}%`
              });
              if (voData.task_id) pollTask(voData.task_id, 'Lồng tiếng AI');
            } catch { /* ignore */ }
          }, 15000); // Wait 15s for previous tasks
        }
      }
      
      setUrl('');
    } catch { alert('Lỗi gọi API!'); }
  };

  // Handle standalone voiceover
  const handleVoiceover = async (videoId) => {
    if (!script) return alert("Nhập script lồng tiếng!");
    try {
      const { data } = await axios.post(`${API_BASE}/voiceover`, {
        video_id: videoId, script,
        voice: selectedVoice || undefined,
        rate: `${voiceRate >= 0 ? '+' : ''}${voiceRate}%`
      });
      pollTask(data.task_id, 'Ghép Giọng AI');
    } catch { alert('Lỗi Voiceover!'); }
  };

  // Handle standalone transform
  const handleTransform = async (videoId) => {
    try {
      const configs = autoTransform 
        ? { hflip: true, speed_shift: true, md5_pad: true, dynamic_noise: true, color_shift: true, edge_crop: true, unsharp_mask: true }
        : transformConfig;
      const { data } = await axios.post(`${API_BASE}/transform`, {
        video_id: videoId, transform_configs: configs
      });
      pollTask(data.task_id, 'Anti-scan');
    } catch { alert('Lỗi Transform!'); }
  };

  const viVoices = voiceList.filter(v => v.includes('vi-VN'));
  const otherVoices = voiceList.filter(v => !v.includes('vi-VN'));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Auto-Reup TikTok/Douyin</h1>
          </div>
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('download')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'download' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Download className="w-4 h-4 inline mr-1.5" />Tải & Xử lý
            </button>
            <button 
              onClick={() => { setActiveTab('files'); fetchFiles(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <FolderOpen className="w-4 h-4 inline mr-1.5" />Files ({files.length})
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* ======================== TAB: DOWNLOAD ======================== */}
        {activeTab === 'download' && (
          <>
            {/* URL Input */}
            <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">📥 Tải Video Mới</h2>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Dán URL TikTok / Douyin..."
                  value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDownload()}
                />
                <input 
                  type="text" 
                  className="w-64 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cookie (tùy chọn)"
                  value={cookie} onChange={e => setCookie(e.target.value)}
                />
                <button 
                  onClick={handleDownload}
                  disabled={!url}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />Tải & Xử lý
                </button>
              </div>
            </section>

            {/* 3-Column Config */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Col 1: Anti-Scan */}
              <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Film className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Anti-Scan</h3>
                  <label className="ml-auto flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-400">AUTO</span>
                    <input type="checkbox" checked={autoTransform} onChange={e => setAutoTransform(e.target.checked)} 
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-gray-700 border-gray-600" />
                  </label>
                </div>
                
                {!autoTransform && (
                  <div className="space-y-2">
                    {[
                      ['hflip', 'Lật ngang (H-Flip)'],
                      ['speed_shift', 'Đổi tốc độ ±5%'],
                      ['md5_pad', 'Đổi MD5 hash'],
                      ['dynamic_noise', 'Nhiễu động 1%'],
                      ['color_shift', 'Đổi hệ màu'],
                      ['edge_crop', 'Cắt viền 2%'],
                      ['unsharp_mask', 'Làm sắc cạnh']
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={transformConfig[key]} 
                          onChange={e => setTransformConfig({...transformConfig, [key]: e.target.checked})}
                          className="rounded text-indigo-600 focus:ring-indigo-500 bg-gray-700 border-gray-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
                {autoTransform && <p className="text-xs text-gray-500">Tự động bật 7 bộ lọc chống quét bản quyền</p>}
              </section>

              {/* Col 2: Subtitle */}
              <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Subtitles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Phụ đề</h3>
                  <label className="ml-auto flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-400">BẬT</span>
                    <input type="checkbox" checked={addSubtitle} onChange={e => setAddSubtitle(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-gray-700 border-gray-600" />
                  </label>
                </div>

                {addSubtitle && (
                  <div className="space-y-3">
                    {/* Che sub cũ */}
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={hideOldSub} onChange={e => setHideOldSub(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 bg-gray-700 border-gray-600" />
                      Che sub cũ (phủ đen)
                    </label>
                    
                    {hideOldSub && (
                      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                        <div>
                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Vị trí Y (từ trên)</span>
                            <span className="text-amber-400 font-mono">{subCoverY}%</span>
                          </label>
                          <input type="range" min={50} max={95} value={subCoverY} 
                            onChange={e => setSubCoverY(Number(e.target.value))}
                            className="w-full accent-amber-500 mt-1" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Chiều cao vùng che</span>
                            <span className="text-amber-400 font-mono">{subCoverH}%</span>
                          </label>
                          <input type="range" min={5} max={50} value={subCoverH} 
                            onChange={e => setSubCoverH(Number(e.target.value))}
                            className="w-full accent-amber-500 mt-1" />
                        </div>
                        {/* Visual preview */}
                        <div className="bg-gray-700 rounded h-28 relative overflow-hidden border border-gray-600">
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">Video</div>
                          <div 
                            className="absolute left-0 right-0 bg-black/80 border-t border-amber-500/50 flex items-center justify-center text-amber-400 text-[10px]"
                            style={{ top: `${subCoverY}%`, height: `${subCoverH}%` }}
                          >
                            ▓ che sub ({subCoverY}%-{Math.min(subCoverY + subCoverH, 100)}%)
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nội dung sub mới */}
                    <textarea
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      rows={3}
                      placeholder="Nhập nội dung phụ đề mới. Mỗi câu cách bởi dấu chấm (.) sẽ tự chia thời gian."
                      value={subText} onChange={e => setSubText(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Cỡ chữ</label>
                        <input type="number" min={10} max={40} value={subFontSize}
                          onChange={e => setSubFontSize(Number(e.target.value))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Margin dưới (px)</label>
                        <input type="number" min={0} max={100} value={subMarginV}
                          onChange={e => setSubMarginV(Number(e.target.value))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white mt-1" />
                      </div>
                    </div>
                  </div>
                )}
                {!addSubtitle && <p className="text-xs text-gray-500">Bật để che sub Trung / chèn sub Việt</p>}
              </section>

              {/* Col 3: Voiceover */}
              <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Mic className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Lồng tiếng AI</h3>
                  <label className="ml-auto flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-400">BẬT</span>
                    <input type="checkbox" checked={addVoiceover} onChange={e => setAddVoiceover(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-gray-700 border-gray-600" />
                  </label>
                </div>

                {addVoiceover && (
                  <div className="space-y-3">
                    <textarea
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Nhập script lồng tiếng (nội dung sẽ được đọc bằng AI)..."
                      value={script} onChange={e => setScript(e.target.value)}
                    />
                    
                    <div>
                      <label className="text-xs text-gray-400">Giọng đọc</label>
                      <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">Mặc định (vi-VN-HoaiMyNeural)</option>
                        {viVoices.length > 0 && <optgroup label="🇻🇳 Tiếng Việt">
                          {viVoices.map(v => <option key={v} value={v}>{v}</option>)}
                        </optgroup>}
                        {otherVoices.length > 0 && <optgroup label="🌐 Khác">
                          {otherVoices.slice(0, 20).map(v => <option key={v} value={v}>{v}</option>)}
                        </optgroup>}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-400 flex justify-between">
                        <span>Tốc độ đọc</span>
                        <span className="text-purple-400 font-mono">{voiceRate >= 0 ? '+' : ''}{voiceRate}%</span>
                      </label>
                      <input type="range" min={-30} max={30} step={5} value={voiceRate}
                        onChange={e => setVoiceRate(Number(e.target.value))}
                        className="w-full accent-purple-500 mt-1" />
                    </div>
                  </div>
                )}
                {!addVoiceover && <p className="text-xs text-gray-500">Bật để thêm giọng đọc AI vào video</p>}
              </section>
            </div>

            {/* Task Progress */}
            <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Tiến trình ({tasks.length} jobs)</h2>
              </div>
              
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Chưa có job nào. Dán URL rồi bấm "Tải & Xử lý"</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {tasks.map(task => (
                    <div key={task.id} className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {task.status === 'PROGRESS' && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                        {task.status === 'SUCCESS' && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {task.status === 'FAILURE' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                        {task.status === 'QUEUED' && <div className="w-5 h-5 rounded-full border-2 border-gray-600 border-dashed animate-pulse" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{task.title}</span>
                          <span className="text-xs text-gray-500 font-mono">{task.id.slice(0, 8)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{task.meta?.status || 'Đang đợi...'}</p>
                        {task.status === 'PROGRESS' && (
                          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${task.meta?.progress || 0}%` }} />
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons for completed tasks */}
                      {task.status === 'SUCCESS' && task.meta?.video_id && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleTransform(task.meta.video_id)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-gray-700">
                            🛡️ Anti-Scan
                          </button>
                          <button onClick={() => handleVoiceover(task.meta.video_id)}
                            className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-800">
                            🎙️ Voiceover
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ======================== TAB: FILES ======================== */}
        {activeTab === 'files' && (
          <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">📁 Video trong Storage ({files.length})</h2>
              <button onClick={fetchFiles} disabled={loadingFiles}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 border border-gray-700">
                <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />Làm mới
              </button>
            </div>

            {files.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Chưa có video nào.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {files.map(file => (
                  <div key={file.name} className="p-4 flex items-center gap-4 hover:bg-gray-800/50">
                    <Film className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.size_mb} MB</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      file.tag === 'anti-scan' ? 'bg-blue-900/50 text-blue-300 border border-blue-800' :
                      file.tag === 'voiceover' ? 'bg-purple-900/50 text-purple-300 border border-purple-800' :
                      'bg-green-900/50 text-green-300 border border-green-800'
                    }`}>
                      {file.tag}
                    </span>
                    <a href={`${STORAGE_BASE}/${file.name}`} download
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg">
                      <Download className="w-3 h-3 inline mr-1" />Tải về
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
