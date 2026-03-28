import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Download, MonitorPlay, Mic, Loader2, CheckCircle, AlertTriangle, FolderOpen, RefreshCw, Film, Subtitles, Play, Settings } from 'lucide-react';

const API_BASE = window.location.port === '5173' 
  ? "http://localhost:8000/api" 
  : `${window.location.origin}/api`;

const STORAGE_BASE = window.location.port === '5173'
  ? "http://localhost:8000/storage"
  : `${window.location.origin}/storage`;

export default function App() {
  const [url, setUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('main');
  
  // 2-step state
  const [step, setStep] = useState(1); // 1=download, 2=configure
  const [downloadedVideo, setDownloadedVideo] = useState(null); // {id, path, url}
  
  // Anti-scan
  const [autoTransform, setAutoTransform] = useState(true);

  // Subtitle
  const [addSubtitle, setAddSubtitle] = useState(false);
  const [subMode, setSubMode] = useState('blackbox'); // 'blackbox' or 'overlay'
  const [subStyle, setSubStyle] = useState('outline'); // 'outline', 'shadow', 'glass'
  const [subCoverX, setSubCoverX] = useState(10);
  const [subCoverY, setSubCoverY] = useState(75);
  const [subCoverW, setSubCoverW] = useState(80);
  const [subText, setSubText] = useState('Bí quyết làm món xào thơm lừng. Đầu tiên, phi thơm hành tỏi và xả băm. Sau đó, cho nguyên liệu đã ướp vào đảo đều tay. Thêm chút nước mắm, đường và ớt tươi. Xào trên lửa lớn để nguyên liệu săn lại và thấm gia vị. Chúc các bạn thành công!');
  const [subFontSize, setSubFontSize] = useState(12); // updated to 12 default
  const [subMarginV, setSubMarginV] = useState(20);

  // Voiceover
  const [addVoiceover, setAddVoiceover] = useState(false);
  const [script, setScript] = useState('Bí quyết làm món xào thơm lừng. Đầu tiên, phi thơm hành tỏi và xả. Sau đó, cho nguyên liệu đã ướp vào đảo đều tay.');
  const [voiceList, setVoiceList] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState(0);

  // Files
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/voiceover/voices`)
      .then(res => setVoiceList(res.data.voices || []))
      .catch(() => setVoiceList([]));
  }, []);

  const fetchFiles = useCallback(() => {
    setLoadingFiles(true);
    axios.get(`${API_BASE.replace('/api', '')}/api/files`)
      .then(res => setFiles(res.data.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoadingFiles(false));
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Poll task
  const pollTask = useCallback((taskId, title, onSuccess) => {
    setTasks(prev => [{ id: taskId, title, status: 'QUEUED', meta: {} }, ...prev]);
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/download/status/${taskId}`);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: data.state, meta: data.meta } : t));
        if (data.state === 'SUCCESS' || data.state === 'FAILURE') {
          clearInterval(interval);
          fetchFiles();
          if (data.state === 'SUCCESS' && onSuccess) onSuccess(data.meta);
        }
      } catch { }
    }, 2000);
  }, [fetchFiles]);

  // STEP 1: Download only
  const handleDownload = async () => {
    if (!url) return;
    try {
      const { data } = await axios.post(`${API_BASE}/download`, {
        url, cookie: cookie || undefined,
        auto_transform: false,
        transform_configs: {}
      });
      
      const taskList = data.tasks || [{ id: data.task_id, name: 'Tải Video' }];
      taskList.forEach(t => {
        pollTask(t.id, t.name, (meta) => {
          // On download success → show video preview
          const videoId = meta?.video_id;
          if (videoId) {
            setDownloadedVideo({
              id: videoId,
              url: `${STORAGE_BASE}/${videoId}.mp4`
            });
            setStep(2);
          }
        });
      });
      
    } catch { alert('Lỗi gọi API!'); }
  };

  // STEP 2: Process (transform + sub + voiceover)
  const handleProcess = async () => {
    if (!downloadedVideo) return;
    
    const configs = {};
    
    // Anti-scan
    if (autoTransform) {
      Object.assign(configs, {
        hflip: true, speed_shift: true, md5_pad: true,
        dynamic_noise: true, color_shift: true,
        edge_crop: true, unsharp_mask: true
      });
    }
    
    // Subtitle
    if (addSubtitle) {
      configs.sub_mode = subMode;
      if (subMode === 'blackbox') {
        configs.sub_cover_x = subCoverX;
        configs.sub_cover_y = subCoverY;
        configs.sub_cover_w = subCoverW;
        configs.sub_cover_h = subCoverH;
      } else {
        configs.sub_style = subStyle;
      }
      if (subText.trim()) configs.new_subtitle_text = subText;
      configs.sub_font_size = subFontSize;
      configs.sub_margin_v = subMarginV;
    }

    try {
      const { data } = await axios.post(`${API_BASE}/transform`, {
        video_id: downloadedVideo.id,
        transform_configs: configs
      });
      pollTask(data.task_id, 'Xử lý Anti-scan + Subtitle');
      
      // Voiceover
      if (addVoiceover && script.trim()) {
        setTimeout(async () => {
          try {
            const { data: voData } = await axios.post(`${API_BASE}/voiceover`, {
              video_id: downloadedVideo.id, script,
              voice: selectedVoice || undefined,
              rate: `${voiceRate >= 0 ? '+' : ''}${voiceRate}%`
            });
            if (voData.task_id) pollTask(voData.task_id, 'Lồng tiếng AI');
          } catch { }
        }, 15000);
      }
    } catch { alert('Lỗi xử lý!'); }
  };

  // Reset to step 1
  const handleNewVideo = () => {
    setStep(1);
    setDownloadedVideo(null);
    setUrl('');
    setAddSubtitle(false);
    setAddVoiceover(false);
    setSubText('');
    setScript('');
  };

  const viVoices = voiceList.filter(v => v.includes('vi-VN'));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MonitorPlay className="w-7 h-7 text-indigo-400" />
            <h1 className="text-lg font-bold text-white">Auto-Reup TikTok/Douyin</h1>
          </div>
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            <button onClick={() => setActiveTab('main')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'main' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Play className="w-4 h-4 inline mr-1" />Xử lý
            </button>
            <button onClick={() => { setActiveTab('files'); fetchFiles(); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <FolderOpen className="w-4 h-4 inline mr-1" />Files ({files.length})
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-4">

        {/* ==================== MAIN TAB ==================== */}
        {activeTab === 'main' && (
          <>
            {/* STEP 1: Download */}
            {step === 1 && (
              <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">BƯỚC 1</span>
                  <h2 className="text-sm font-bold text-white">Tải video gốc</h2>
                </div>
                <div className="flex gap-3">
                  <input type="text" 
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Dán URL TikTok / Douyin..."
                    value={url} onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDownload()}
                  />
                  <input type="text" 
                    className="w-56 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Cookie (tùy chọn)"
                    value={cookie} onChange={e => setCookie(e.target.value)}
                  />
                  <button onClick={handleDownload} disabled={!url}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all">
                    <Download className="w-4 h-4" />Tải video
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Sau khi tải xong, video sẽ hiện lên để bạn xem và cấu hình phụ đề</p>
              </section>
            )}

            {/* STEP 2: Video Preview + Configure */}
            {step === 2 && downloadedVideo && (
              <>
                <section className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">BƯỚC 2</span>
                      <h2 className="text-sm font-bold text-white">Xem video & cấu hình xử lý</h2>
                    </div>
                    <button onClick={handleNewVideo} className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1 rounded-lg">
                      ← Tải video khác
                    </button>
                  </div>

                  {/* Video Player with Subtitle Overlay */}
                  <div className="flex gap-5">
                    {/* Video + overlay */}
                    <div className="relative w-[300px] flex-shrink-0 bg-black rounded-lg overflow-hidden">
                      <video 
                        src={downloadedVideo.url} 
                        controls 
                        className="w-full"
                        style={{ maxHeight: '500px' }}
                      />
                      {/* Subtitle cover overlay */}
                      {addSubtitle && subMode === 'blackbox' && (
                        <div 
                          className="absolute border-2 border-amber-500 bg-black/70 flex items-center justify-center text-amber-400 text-[10px] pointer-events-none"
                          style={{
                            left: `${subCoverX}%`,
                            top: `${subCoverY}%`,
                            width: `${subCoverW}%`,
                            height: `${subCoverH}%`
                          }}
                        >
                          ▓ vùng che sub
                        </div>
                      )}
                    </div>

                    {/* Config panels */}
                    <div className="flex-1 space-y-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
                      
                      {/* Anti-Scan */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            <Film className="w-4 h-4 text-blue-400" />Anti-Scan
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-400">AUTO</span>
                            <input type="checkbox" checked={autoTransform} onChange={e => setAutoTransform(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 bg-gray-700 border-gray-600" />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">7 bộ lọc chống quét bản quyền</p>
                      </div>

                      {/* Subtitle */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            <Subtitles className="w-4 h-4 text-amber-400" />Phụ đề
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-400">BẬT</span>
                            <input type="checkbox" checked={addSubtitle} onChange={e => setAddSubtitle(e.target.checked)}
                              className="w-4 h-4 rounded text-amber-600 bg-gray-700 border-gray-600" />
                          </label>
                        </div>

                        {addSubtitle && (
                          <div className="space-y-3">
                            <div className="flex bg-gray-900 rounded-lg p-1 gap-1">
                              <button onClick={() => setSubMode('blackbox')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${subMode === 'blackbox' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Che sub cũ (nền đen)
                              </button>
                              <button onClick={() => setSubMode('overlay')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${subMode === 'overlay' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Sub nổi (không nền)
                              </button>
                            </div>

                            {subMode === 'blackbox' ? (
                              <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-amber-400 font-medium">Kéo slider chỉnh vùng che trực tiếp trên video ←</p>
                                {[
                                  ['X (trái)', subCoverX, setSubCoverX, 0, 50],
                                  ['Y (trên)', subCoverY, setSubCoverY, 30, 95],
                                  ['Rộng', subCoverW, setSubCoverW, 20, 100],
                                  ['Cao', subCoverH, setSubCoverH, 3, 40],
                                ].map(([label, val, setter, min, max]) => (
                                  <div key={label}>
                                    <label className="text-xs text-gray-400 flex justify-between">
                                      <span>{label}</span>
                                      <span className="text-amber-400 font-mono">{val}%</span>
                                    </label>
                                    <input type="range" min={min} max={max} value={val}
                                      onChange={e => setter(Number(e.target.value))}
                                      className="w-full accent-amber-500 mt-0.5" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-gray-900/50 rounded-lg p-3">
                                <label className="text-xs text-gray-400 block mb-1">Hiệu ứng chữ nổi</label>
                                <select value={subStyle} onChange={e => setSubStyle(e.target.value)}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                                  <option value="outline">Viền đen dày (Đề xuất)</option>
                                  <option value="shadow">Đổ bóng đậm</option>
                                  <option value="glass">Hộp nền mờ</option>
                                </select>
                              </div>
                            )}

                            <textarea
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              rows={2}
                              placeholder="Nhập nội dung phụ đề mới (tách câu bằng dấu chấm)..."
                              value={subText} onChange={e => setSubText(e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-400">Cỡ chữ</label>
                                <input type="number" min={10} max={40} value={subFontSize}
                                  onChange={e => setSubFontSize(Number(e.target.value))}
                                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white mt-1" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400">Margin dưới (px)</label>
                                <input type="number" min={0} max={100} value={subMarginV}
                                  onChange={e => setSubMarginV(Number(e.target.value))}
                                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white mt-1" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Voiceover */}
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            <Mic className="w-4 h-4 text-purple-400" />Lồng tiếng AI
                          </span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-400">BẬT</span>
                            <input type="checkbox" checked={addVoiceover} onChange={e => setAddVoiceover(e.target.checked)}
                              className="w-4 h-4 rounded text-purple-600 bg-gray-700 border-gray-600" />
                          </label>
                        </div>

                        {addVoiceover && (
                          <div className="space-y-3">
                            <textarea
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              rows={2} placeholder="Nhập script lồng tiếng..."
                              value={script} onChange={e => setScript(e.target.value)}
                            />
                            <div>
                              <label className="text-xs text-gray-400">Giọng đọc</label>
                              <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white mt-1">
                                <option value="">Mặc định (vi-VN-HoaiMyNeural)</option>
                                {viVoices.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 flex justify-between">
                                <span>Tốc độ</span>
                                <span className="text-purple-400 font-mono">{voiceRate >= 0 ? '+' : ''}{voiceRate}%</span>
                              </label>
                              <input type="range" min={-30} max={30} step={5} value={voiceRate}
                                onChange={e => setVoiceRate(Number(e.target.value))}
                                className="w-full accent-purple-500 mt-0.5" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Process button */}
                      <button onClick={handleProcess}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all">
                        <Settings className="w-4 h-4" />Bắt đầu xử lý (Anti-scan{addSubtitle ? ' + Sub' : ''}{addVoiceover ? ' + TTS' : ''})
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Task Progress */}
            {tasks.length > 0 && (
              <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800">
                  <h2 className="text-sm font-bold text-white">Tiến trình ({tasks.length} jobs)</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {tasks.map(task => (
                    <div key={task.id} className="p-3 flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {task.status === 'PROGRESS' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                        {task.status === 'SUCCESS' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {task.status === 'FAILURE' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {task.status === 'QUEUED' && <div className="w-4 h-4 rounded-full border-2 border-gray-600 border-dashed animate-pulse" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{task.title}</span>
                        <span className="text-xs text-gray-500 ml-2 font-mono">{task.id.slice(0, 8)}</span>
                        <p className="text-xs text-gray-400">{task.meta?.status || 'Đang đợi...'}</p>
                        {task.status === 'PROGRESS' && (
                          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${task.meta?.progress || 0}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ==================== FILES TAB ==================== */}
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
                  <div key={file.name} className="p-3 flex items-center gap-4 hover:bg-gray-800/50">
                    <Film className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.size_mb} MB</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      file.tag === 'anti-scan' ? 'bg-blue-900/50 text-blue-300' :
                      file.tag === 'voiceover' ? 'bg-purple-900/50 text-purple-300' :
                      'bg-green-900/50 text-green-300'
                    }`}>{file.tag}</span>
                    <a href={`${STORAGE_BASE}/${file.name}`} download
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg">
                      Tải về
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
