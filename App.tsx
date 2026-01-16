
import React, { useState, useRef } from 'react';
import Header from './components/Header';
import ResultCard from './components/ResultCard';
import { analyzeContent } from './geminiService';
import { AnalysisResult, HistoryItem } from './types';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOpen(true);
        setError(null);
        setResult(null); // Clear previous result for a fresh scan
      }
    } catch (err) {
      setError("Camera access denied. Please enable permissions to scan physical media.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      // Visual Feedback: Flash effect
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
        
        // Auto-trigger analysis for "Instant Scan" experience
        handleAnalyze(imageData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
        setError(null);
        handleAnalyze(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (overrideImage?: string) => {
    const textToAnalyze = inputText;
    const imageToAnalyze = overrideImage || capturedImage;
    
    if (!textToAnalyze.trim() && !imageToAnalyze) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeContent(textToAnalyze, imageToAnalyze || undefined);
      setResult(analysisResult);
      
      const newHistoryItem: HistoryItem = {
        ...analysisResult,
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputText: imageToAnalyze 
          ? "[Visual Analysis]" 
          : textToAnalyze.slice(0, 100) + (textToAnalyze.length > 100 ? '...' : ''),
      };
      
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
    } catch (err: any) {
      setError(err.message || 'Verification engine encountered an error. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setInputText('');
    setCapturedImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const examplePrompts = [
    "Verify if NASA discovered liquid water cities on Mars in 2024.",
    "Fact-check the viral claim about a new gold-backed currency launched by BRICS.",
    "Is it true that a major volcanic eruption happened in Hawaii this morning?",
    "Check the authenticity of the latest central bank announcement about CBDC testing."
  ];

  return (
    <div className="min-h-screen text-slate-100 pb-20">
      <Header onScanClick={startCamera} />
      
      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Real-time Verification Active
          </div>
          <h2 className="text-4xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Expose Deception <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">Instantly</span>
          </h2>
          <p className="text-slate-400 max-w-2xl text-lg md:text-xl font-medium leading-relaxed">
            Verify headlines, screenshots, and social posts. Scan fragments using your camera for a pro-grade veracity report powered by Google Search grounding.
          </p>
        </div>

        {/* Input Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="glass rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group border border-white/5 hover:border-white/10 transition-all duration-500">
              <div className="p-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-40 group-hover:opacity-80 transition-opacity"></div>
              <div className="p-4 md:p-8">
                <div className="relative">
                  {capturedImage ? (
                    <div className="w-full h-80 relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 group/img">
                      <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                        <button 
                          onClick={() => { setCapturedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; setResult(null); }}
                          className="px-8 py-3 bg-white text-slate-950 font-black rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <i className="fas fa-trash-alt text-rose-600"></i>
                          Clear Media
                        </button>
                      </div>
                      <div className="absolute top-4 left-4 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                        Visual Scan Active
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste suspicious text or news fragment here..."
                        className="w-full h-56 md:h-72 p-8 bg-black/20 border border-white/5 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all resize-none text-white text-xl font-medium leading-relaxed placeholder:text-slate-600 outline-none"
                      />
                      <div className="absolute top-6 right-6 opacity-10 pointer-events-none">
                        <i className="fas fa-search-nodes text-4xl text-white"></i>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-2xl shadow-sm hover:bg-white/10 hover:border-indigo-500/30 hover:text-white transition-all flex items-center gap-2 group"
                        title="Upload Screenshot"
                      >
                        <i className="fas fa-paperclip group-hover:rotate-12 transition-transform"></i>
                        Upload
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button 
                        onClick={startCamera}
                        className="px-5 py-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold rounded-2xl shadow-sm hover:bg-indigo-600/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-all flex items-center gap-2 group"
                        title="Scan with Camera"
                      >
                        <i className="fas fa-camera group-hover:scale-110 transition-transform"></i>
                        Camera
                      </button>
                      <button 
                        onClick={clearAll}
                        className="p-2.5 text-slate-600 hover:text-rose-500 transition-colors"
                        title="Reset"
                      >
                        <i className="fas fa-redo-alt"></i>
                      </button>
                    </div>

                    <button
                      onClick={() => handleAnalyze()}
                      disabled={isAnalyzing || (!inputText.trim() && !capturedImage)}
                      className={`w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-4 rounded-2xl font-black text-lg text-white shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all ${
                        isAnalyzing || (!inputText.trim() && !capturedImage)
                          ? 'bg-white/5 cursor-not-allowed shadow-none text-slate-600' 
                          : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)]'
                      }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <i className="fas fa-atom animate-spin"></i>
                          Scanning...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-shield-check"></i>
                          Verify Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-300 flex items-center gap-4 animate-fade-in shadow-xl">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <p className="text-sm font-bold leading-tight">{error}</p>
              </div>
            )}

            {result && <ResultCard result={result} />}
            {isAnalyzing && !result && (
              <div className="mt-12 p-12 glass rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-6 border border-indigo-500/20 animate-pulse">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <div>
                  <h3 className="text-xl font-black text-white mb-2">Engaging Search Grounding...</h3>
                  <p className="text-slate-400 text-sm max-w-sm">Comparing input against verified news databases and visual manipulation markers.</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                <i className="fas fa-bolt text-amber-500"></i>
                Sample Inquiries
              </h3>
              <div className="space-y-3">
                {examplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setCapturedImage(null); setInputText(p); setResult(null); }}
                    className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 hover:border-indigo-500/30 hover:text-white transition-all hover:translate-x-1"
                  >
                    "{p.slice(0, 60)}..."
                  </button>
                ))}
              </div>
            </div>

            {history.length > 0 && (
              <div className="glass p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                  <i className="fas fa-history text-slate-500"></i>
                  Recent Scans
                </h3>
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="group cursor-default border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-xs text-slate-300 font-bold truncate flex-1">{item.inputText}</p>
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 ${
                          item.verdict === 'Real' ? 'bg-emerald-500/20 text-emerald-400' :
                          item.verdict === 'Fake' ? 'bg-rose-500/20 text-rose-400' :
                          item.verdict === 'Mixed Context' ? 'bg-indigo-500/20 text-indigo-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {item.verdict}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.confidence}% Match
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fullscreen Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in">
          <div className="relative w-full max-w-4xl bg-black rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(99,102,241,0.25)] border border-white/10">
            {/* Flash Effect Overlay */}
            {isFlashing && <div className="absolute inset-0 z-[110] bg-white animate-pulse"></div>}
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto aspect-video object-cover"
            />
            
            {/* Camera UI Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20">
               <div className="w-full h-full border border-white/20 rounded-2xl relative">
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-white/10"></div>
                  <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/10"></div>
               </div>
            </div>

            <div className="absolute top-8 left-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.5)]">
                <i className="fas fa-expand text-xl"></i>
              </div>
              <div>
                <h4 className="text-white font-black tracking-tight leading-none">Scanning...</h4>
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Ready for Capture</p>
              </div>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-8 pointer-events-auto">
              <div className="flex items-center gap-6">
                <button 
                  onClick={stopCamera}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all group"
                >
                  <i className="fas fa-times text-xl group-hover:rotate-90 transition-transform"></i>
                </button>
                <button 
                  onClick={capturePhoto}
                  className="w-24 h-24 rounded-full bg-white p-2 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
                  title="Capture & Search"
                >
                  <div className="w-full h-full rounded-full border-4 border-slate-950 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-600 shadow-[inset_0_0_15px_rgba(0,0,0,0.4)] group-hover:bg-indigo-500 transition-colors"></div>
                  </div>
                </button>
                <div className="w-16 h-16 opacity-0"></div>
              </div>
              <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Center the text or image to analyze</p>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <footer className="py-20 bg-black border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <i className="fas fa-shield-halved"></i>
              </div>
              <h1 className="text-white font-black text-xl tracking-tight">VeriTruth AI</h1>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {['Safety Protocols', 'Source Credibility', 'API Access', 'Contact'].map(item => (
                <a key={item} href="#" className="text-xs font-black text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-[0.2em]">{item}</a>
              ))}
            </div>
          </div>
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-slate-500 text-xs font-medium italic">Advanced neural patterns for truth detection.</p>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">© 2024 VeriTruth AI • Fact Verification Engine</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
