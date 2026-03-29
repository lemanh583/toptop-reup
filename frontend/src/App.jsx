import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Download, MonitorPlay, Mic, Loader2, CheckCircle, AlertTriangle, FolderOpen, RefreshCw, Film, Subtitles, Play, Settings, Trash2 } from 'lucide-react';

const API_BASE = window.location.port === '5173' 
  ? `http://${window.location.hostname}:8000/api` 
  : `${window.location.origin}/api`;

const STORAGE_BASE = window.location.port === '5173'
  ? `http://${window.location.hostname}:8000/storage`
  : `${window.location.origin}/storage`;

export default function App() {
  const [url, setUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('main');
  const [showLibrary, setShowLibrary] = useState(false);
  
  // 2-step state
  const [step, setStep] = useState(1); // 1=download, 2=configure
  const [downloadedVideo, setDownloadedVideo] = useState(null); // {id, path, url}
  
  // Anti-scan
  const [autoTransform, setAutoTransform] = useState(true);

  // Subtitle
  const [addSubtitle, setAddSubtitle] = useState(false);
  const [subMode, setSubMode] = useState('blackbox'); // 'blackbox' or 'overlay'
  const [subStyle, setSubStyle] = useState('outline'); // 'outline', 'shadow', 'glass'
  const [coverStyle, setCoverStyle] = useState('black'); // 'black' or 'blur'
  const [subPosition, setSubPosition] = useState('cover'); // 'cover' or 'bottom'
  const [subCoverX, setSubCoverX] = useState(10);
  const [subCoverY, setSubCoverY] = useState(75);
  const [subCoverW, setSubCoverW] = useState(80);
  const [subCoverH, setSubCoverH] = useState(12);
  const [subText, setSubText] = useState('Bí quyết làm món xào thơm lừng. Đầu tiên, phi thơm hành tỏi và xả băm. Sau đó, cho nguyên liệu đã ướp vào đảo đều tay. Thêm chút nước mắm, đường và ớt tươi. Xào trên lửa lớn để nguyên liệu săn lại và thấm gia vị. Chúc các bạn thành công!');
  const [subFontSize, setSubFontSize] = useState(12); // updated to 12 default
  const [subMarginV, setSubMarginV] = useState(20);

  // Voiceover
  const [addVoiceover, setAddVoiceover] = useState(false);
  const [script, setScript] = useState('Bí quyết làm món xào thơm lừng. Đầu tiên, phi thơm hành tỏi và xả. Sau đó, cho nguyên liệu đã ướp vào đảo đều tay.');
  const [voiceList, setVoiceList] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState(0);
  const [origVolume, setOrigVolume] = useState(0.5);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [processedVideo, setProcessedVideo] = useState(null);

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
      configs.cover_style = coverStyle;
      configs.sub_position = subPosition;
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
      
      pollTask(data.task_id, 'Xử lý Anti-scan + Subtitle', () => {
        if (!addVoiceover) {
          setProcessedVideo(`${STORAGE_BASE}/${downloadedVideo.id}_transformed.mp4`);
          setStep(3);
        }
      });
      
      // Voiceover
      if (addVoiceover && script.trim()) {
        const startVoiceover = async () => {
          try {
            const { data: voData } = await axios.post(`${API_BASE}/voiceover`, {
              video_id: downloadedVideo.id, script,
              voice: selectedVoice || undefined,
              rate: `${voiceRate >= 0 ? '+' : ''}${voiceRate}%`,
              orig_vol: origVolume,
              tts_vol: ttsVolume
            });
            if (voData.task_id) {
              pollTask(voData.task_id, 'Lồng tiếng AI', () => {
                setProcessedVideo(`${STORAGE_BASE}/${downloadedVideo.id}_voiceover.mp4`);
                setStep(3);
              });
            }
          } catch { }
        };
        
        // Đợi transform bắt đầu rồi mới queue voiceover (hoặc queue luôn nếu server handle được)
        setTimeout(startVoiceover, 2000);
      }
    } catch { alert('Lỗi xử lý!'); }
  };

  // Reset to step 1
  const handleNewVideo = () => {
    setStep(1);
    setDownloadedVideo(null);
    setProcessedVideo(null);
    setUrl('');
    setAddSubtitle(false);
    setAddVoiceover(false);
    setSubText('');
    setScript('');
  };
  
  const handleDelete = async (filename) => {
    if (!window.confirm(`Bạn có chắc muốn xóa video ${filename}?`)) return;
    try {
      await axios.delete(`${API_BASE}/files/${filename}`);
      fetchFiles();
    } catch {
      alert('Lỗi khi xóa file!');
    }
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
                    className="w-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Cookie (tùy chọn)"
                    value={cookie} onChange={e => setCookie(e.target.value)}
                  />
                  <button onClick={handleDownload} disabled={!url || loading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all">
                    <Download className="w-4 h-4" />Tải video
                  </button>
                  <button onClick={() => { setShowLibrary(!showLibrary); fetchFiles(); }}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 border border-gray-700 transition-all">
                    <FolderOpen className="w-4 h-4 text-amber-400" />Chọn từ thư viện
                  </button>
                </div>
                
                {showLibrary && (
                  <div className="mt-4 bg-gray-800/50 rounded-lg border border-gray-700 p-3 max-h-60 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">Video gốc đã tải</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {files.filter(f => f.tag === 'gốc').length === 0 && <p className="text-xs text-gray-500 italic">Chưa có video gốc nào.</p>}
                      {files.filter(f => f.tag === 'gốc').map(file => (
                        <div key={file.name} className="flex items-center justify-between bg-gray-900 border border-gray-700 p-2 rounded-lg hover:border-indigo-500 transition-colors">
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-white font-medium truncate">{file.name}</span>
                            <span className="text-[10px] text-gray-500">{file.size_mb} MB</span>
                          </div>
                          <button onClick={() => { setDownloadedVideo({ ...file, id: file.name.replace('.mp4', '') }); setStep(2); setShowLibrary(false); }}
                            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1 rounded text-[10px] font-bold transition-all uppercase">
                            Chọn video này
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">Dán URL để tải mới hoặc chọn từ thư viện để xử lý lại các video đã tải sẵn.</p>
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
                      {/* Subtitle Preview Overlay */}
                      {addSubtitle && (
                        <>
                          {/* THE BOX (Cover/Blur) */}
                          {subMode === 'blackbox' && (
                            <div 
                              className={`absolute border-2 border-amber-500/50 flex items-center justify-center pointer-events-none transition-all ${
                                coverStyle === 'blur' ? 'backdrop-blur-lg bg-white/10' : 'bg-black/80'
                              }`}
                              style={{
                                left: `${subCoverX}%`,
                                top: `${subCoverY}%`,
                                width: `${subCoverW}%`,
                                height: `${subCoverH}%`
                              }}
                            >
                              {subPosition === 'cover' && (
                                <div className="text-white font-bold text-center leading-tight whitespace-pre-wrap px-1"
                                     style={{ 
                                       fontSize: `${Math.max(10, subFontSize * 1.2)}px`,
                                       textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 10px rgba(0,0,0,1)'
                                     }}>
                                  <div className="text-[8px] opacity-50 uppercase tracking-tighter mb-0.5">[Render Example]</div>
                                  {subText || "Nội dung sub sẽ hiện ở đây"}
                                </div>
                              )}
                            </div>
                          )}

                          {/* BOTTOM TEXT PREVIEW */}
                          {subPosition === 'bottom' && (
                            <div className="absolute left-0 right-0 flex justify-center pointer-events-none"
                                 style={{ bottom: `${subMarginV}%` }}>
                              <div className="text-white font-bold text-center leading-tight whitespace-pre-wrap px-4"
                                   style={{ 
                                     fontSize: `${Math.max(10, subFontSize * 1.2)}px`,
                                     textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 5px rgba(0,0,0,1)'
                                   }}>
                                {subText || "Vị trí chữ (Bottom)"}
                              </div>
                            </div>
                          )}
                        </>
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
                                {/* Cover style: black vs blur */}
                                <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                                  <button onClick={() => setCoverStyle('black')}
                                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${coverStyle === 'black' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                    ■ Đen toàn phần
                                  </button>
                                  <button onClick={() => setCoverStyle('blur')}
                                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${coverStyle === 'blur' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                    ◉ Làm mờ (Blur)
                                  </button>
                                </div>
                                {/* Sub position: cover vs bottom */}
                                <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                                  <button onClick={() => setSubPosition('cover')}
                                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${subPosition === 'cover' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                    ↕ Sub trong vùng che
                                  </button>
                                  <button onClick={() => setSubPosition('bottom')}
                                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${subPosition === 'bottom' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                    ↓ Sub ở đáy video
                                  </button>
                                </div>
                                <p className="text-xs text-amber-400 font-medium">Kéo slider chỉnh vùng che ↓</p>
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
                              placeholder="Nhập nội dung phụ đề...&#10;Gợi ý: Tách câu bằng dấu chấm để tự căn giờ.&#10;Hoặc dùng định dạng: '2-5 | Nội dung' để chỉnh giây chính xác."
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
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                  <span>Âm video gốc</span>
                                  <span className="text-purple-400 font-mono">{Math.round(origVolume * 100)}%</span>
                                </label>
                                <input type="range" min={0} max={1} step={0.1} value={origVolume}
                                  onChange={e => setOrigVolume(Number(e.target.value))}
                                  className="w-full accent-purple-500 mt-0.5" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 flex justify-between">
                                  <span>Âm giọng đọc</span>
                                  <span className="text-purple-400 font-mono">{Math.round(ttsVolume * 100)}%</span>
                                </label>
                                <input type="range" min={0} max={2} step={0.1} value={ttsVolume}
                                  onChange={e => setTtsVolume(Number(e.target.value))}
                                  className="w-full accent-purple-500 mt-0.5" />
                              </div>
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
            
            {/* ==================== STEP 3: RESULT ==================== */}
            {step === 3 && processedVideo && (
              <section className="bg-gray-900 rounded-2xl border-2 border-green-500/30 overflow-hidden shadow-2xl shadow-green-500/10">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-600 p-2 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white leading-none">Xử lý thành công!</h2>
                        <p className="text-xs text-gray-400 mt-1">Video đã sẵn sàng để đăng tải</p>
                      </div>
                    </div>
                    <button onClick={handleNewVideo} 
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors">
                      Làm video mới →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black rounded-xl overflow-hidden shadow-inner border border-gray-800">
                      <video 
                        key={processedVideo}
                        src={processedVideo} 
                        controls 
                        autoPlay
                        className="w-full"
                        style={{ maxHeight: '500px' }}
                      />
                    </div>
                    
                    <div className="space-y-4 flex flex-col justify-center">
                      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-800">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                          <Download className="w-4 h-4 text-green-400" /> Tải về máy
                        </h3>
                        <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                          File: {processedVideo.split('/').pop()}
                        </p>
                        <a 
                          href={processedVideo} 
                          download 
                          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20"
                        >
                          TẢI VIDEO (.MP4)
                        </a>
                      </div>

                      <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-500/20">
                        <p className="text-[11px] text-amber-300 leading-relaxed italic">
                          💡 Tip: Bạn có thể click chuột phải vào video và chọn "Save video as..." nếu nút tải về không hoạt động trên trình duyệt hiện tại.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
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

        {activeTab === 'files' && (
          <section className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Thư viện Video ({files.length})</h2>
              </div>
              <button onClick={fetchFiles} disabled={loadingFiles}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-700 transition-all">
                <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} /> Làm mới danh sách
              </button>
            </div>
            
            {files.length === 0 ? (
              <div className="p-12 text-center">
                <Film className="w-12 h-12 text-gray-800 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Chưa có video nào trong bộ nhớ.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-950/50 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                    <tr>
                      <th className="px-5 py-3 border-b border-gray-800">Tên Video / ID</th>
                      <th className="px-5 py-3 border-b border-gray-800">Phân loại</th>
                      <th className="px-5 py-3 border-b border-gray-800">Dung lượng</th>
                      <th className="px-5 py-3 border-b border-gray-800 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {files.map(file => {
                      const isVoiceover = file.name.includes('_voiceover');
                      const isTransformed = file.name.includes('_transformed') && !isVoiceover;
                      const isOriginal = !isVoiceover && !isTransformed;

                      return (
                        <tr key={file.name} className="hover:bg-gray-800/30 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isOriginal ? 'bg-gray-800 text-gray-400' :
                                isTransformed ? 'bg-blue-900/30 text-blue-400' :
                                'bg-purple-900/30 text-purple-400'
                              }`}>
                                <Film className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate max-w-[200px]" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">MP4 Format</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isOriginal && <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 border border-gray-700 uppercase font-bold">Gốc</span>}
                            {isTransformed && <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-300 border border-blue-800/50 uppercase font-bold">Anti-scan + Sub</span>}
                            {isVoiceover && <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/40 text-purple-300 border border-purple-800/50 uppercase font-bold">Lồng tiếng AI</span>}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                            {file.size_mb} MB
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  if (isOriginal) {
                                    setDownloadedVideo({ ...file, id: file.name.replace('.mp4', '') });
                                    setStep(2);
                                    setActiveTab('main');
                                  } else {
                                    setProcessedVideo(`${STORAGE_BASE}/${file.name}`);
                                    setStep(3);
                                    setActiveTab('main');
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all ${
                                  isOriginal ? 'text-green-400 hover:bg-green-900/40' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                                title={isOriginal ? "Cấu hình & Xử lý" : "Xem trước"}
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(file.name)}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-all"
                                title="Xóa video"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <a href={`${STORAGE_BASE}/${file.name}`} download
                                className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all"
                                title="Tải về máy"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
