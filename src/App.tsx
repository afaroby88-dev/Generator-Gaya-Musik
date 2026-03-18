import { useState, useRef } from 'react';
import { 
  Music, 
  Mic2, 
  Settings2, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Image as ImageIcon,
  FileText,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { OPTIONS } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface GeneratedResult {
  style: string;
  image_prompt: string;
  formattedLyrics: string;
}

export default function App() {
  const [lyrics, setLyrics] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({
    genres: [],
    instruments: [],
    moods: [],
    vocals: [],
    tempos: []
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const toggleOption = (category: string, option: string) => {
    setSelected(prev => {
      const current = prev[category];
      if (current.includes(option)) {
        return { ...prev, [category]: current.filter(o => o !== option) };
      }
      return { ...prev, [category]: [...current, option] };
    });
  };

  const generate = async () => {
    if (!lyrics.trim()) {
      alert("Masukkan lirik lagu Anda!");
      return;
    }

    setLoading(true);
    setResult(null);
    setCoverUrl(null);

    const systemInstruction = `Anda adalah Music Producer AI profesional.
    Analisis lirik dan pilihan user. Buatlah JSON dengan field:
    1. "style": Prompt teknik musik Suno/Udio (Inggris).
    2. "image_prompt": Deskripsi visual artistik untuk cover album berasio 16:9 berdasarkan mood dan genre (Inggris). Jangan sertakan teks di dalam gambar.
    3. "formattedLyrics": Lirik dengan tag struktur [Verse], [Chorus], dll.`;

    const userPrompt = `Lirik: "${lyrics}". 
    Genre: ${selected.genres.join(', ')}. 
    Instrumen: ${selected.instruments.join(', ')}. 
    Mood: ${selected.moods.join(', ')}. 
    Vokal: ${selected.vocals.join(', ')}. 
    Tempo: ${selected.tempos.join(', ')}.`;

    try {
      // Step 1: Generate Prompt & Lyrics
      const textResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              style: { type: Type.STRING },
              image_prompt: { type: Type.STRING },
              formattedLyrics: { type: Type.STRING }
            },
            required: ["style", "image_prompt", "formattedLyrics"]
          }
        }
      });

      const data = JSON.parse(textResponse.text || '{}') as GeneratedResult;
      setResult(data);

      // Step 2: Generate Cover Image
      const imagePrompt = `Cinematic 16:9 aspect ratio album cover, ${data.image_prompt}, high quality, artistic, professional photography or digital art, no text, no watermark.`;
      
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: imagePrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setCoverUrl(`data:image/png;base64,${imagePart.inlineData.data}`);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat membuat komposisi.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4"
          >
            Music Prompt Architect
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg"
          >
            Optimalkan lirik, style, dan cover album untuk Suno & Udio
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-8">
            <section className="bg-[#1e293b] border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-blue-400">
                <FileText className="w-6 h-6" />
                Lirik Lagu
              </h2>
              <textarea 
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="w-full h-56 bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none placeholder:text-slate-600"
                placeholder="Masukkan lirik Anda di sini..."
              />
            </section>

            <section className="bg-[#1e293b] border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-purple-400">
                <Settings2 className="w-6 h-6" />
                Kustomisasi Style
              </h2>
              <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {Object.entries(OPTIONS).map(([key, opts]) => (
                  <div key={key}>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      {key === 'genres' && <Music className="w-3 h-3" />}
                      {key === 'vocals' && <Mic2 className="w-3 h-3" />}
                      {key}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opts.map(opt => (
                        <button
                          key={opt}
                          onClick={() => toggleOption(key, opt)}
                          className={`px-4 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                            selected[key].includes(opt)
                              ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/20'
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Actions & Results */}
          <div className="lg:col-span-5 space-y-8">
            <div className="sticky top-8 space-y-8">
              <button 
                onClick={generate}
                disabled={loading}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative z-10 flex items-center justify-center gap-3 text-lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Meramu Komposisi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      <span>Bangun Komposisi & Cover</span>
                    </>
                  )}
                </div>
                <motion.div 
                  className="absolute inset-0 bg-white/20"
                  initial={false}
                  animate={loading ? { x: ['-100%', '100%'] } : { x: '-100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              </button>

              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Cover Section */}
                    <div className="bg-[#1e293b] border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                      <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Album Cover (16:9)
                      </h3>
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 group">
                        {coverUrl ? (
                          <img 
                            src={coverUrl} 
                            alt="Album Cover" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 italic">
                            <Loader2 className="w-8 h-8 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Style Prompt Section */}
                    <div className="bg-[#1e293b] border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Style Prompt
                        </h3>
                        <button 
                          onClick={() => copyToClipboard(result.style, 'style')}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          {copied === 'style' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="p-4 bg-slate-900/80 rounded-xl text-sm font-mono border border-slate-700 leading-relaxed">
                        {result.style}
                      </div>
                    </div>

                    {/* Lyrics Section */}
                    <div className="bg-[#1e293b] border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Struktur Lirik Optimal
                        </h3>
                        <button 
                          onClick={() => copyToClipboard(result.formattedLyrics, 'lyrics')}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          {copied === 'lyrics' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-900/80 rounded-xl text-xs font-sans border border-slate-700 h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                        {result.formattedLyrics}
                      </pre>
                    </div>
                  </motion.div>
                ) : !loading && (
                  <div className="h-64 flex flex-center items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 italic text-center px-8">
                    Hasil komposisi dan cover akan muncul di sini setelah Anda menekan tombol di atas.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 z-50"
          >
            <Check className="w-5 h-5" />
            Teks disalin ke clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
