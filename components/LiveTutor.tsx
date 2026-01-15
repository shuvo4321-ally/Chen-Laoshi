import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { LessonPlan } from '../types';
import { pinyin } from 'pinyin-pro';

interface LiveTutorProps {
  lesson: LessonPlan;
  onExit: () => void;
}

const LiveTutor: React.FC<LiveTutorProps> = ({ lesson, onExit }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string>('');
  const [translation, setTranslation] = useState<string>('');
  
  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null); 
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Visualizer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Auto-translate effect
  useEffect(() => {
    if (!subtitle || !subtitle.trim()) {
        setTranslation('');
        return;
    }
    
    const timer = setTimeout(async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Translate this Chinese text to English. Return ONLY the English translation, concise and clear. Text: "${subtitle}"`
            });
            if (response.text) {
                setTranslation(response.text);
            }
        } catch (e) {
            console.debug("Translation error", e);
        }
    }, 800);

    return () => clearTimeout(timer);
  }, [subtitle]);

  const startSession = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Setup Output Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // 2. Setup Input Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      inputStreamRef.current = stream;

      // 3. Setup Visualizer Analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // 4. Connect Gemini Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {}, 
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: { parts: [{ text: `
            You are Chen Laoshi.
            Current Lesson: ${lesson.title}
            Vocabulary: ${lesson.flashcards.map(f => f.word).join(', ')}
            Scenario: ${lesson.roleplayScenario}
            
            ROLE:
            - Speak clearly.
            - Correct pronunciation gently.
            - Wait for the user to respond.
            - If they struggle, slow down and use English hints.
            - Start by introducing the roleplay scenario in simple Chinese.
          ` }]},
        },
        callbacks: {
            onopen: async () => {
                setIsConnected(true);
                
                // IMPORTANT: Use a separate AudioContext for input processing to match 16kHz requirement
                // and avoid sample rate mismatches or resource locks.
                if (inputAudioContextRef.current) {
                    await inputAudioContextRef.current.close();
                }
                const inputContext = new AudioContext({ sampleRate: 16000 });
                inputAudioContextRef.current = inputContext;

                const source = inputContext.createMediaStreamSource(stream);
                const processor = inputContext.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Downsample/Convert to PCM Int16
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = inputData[i] * 32768;
                    }
                    
                    let binary = '';
                    const bytes = new Uint8Array(pcmData.buffer);
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);

                    sessionPromise.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64
                            }
                        });
                    });
                };

                source.connect(processor);
                processor.connect(inputContext.destination); 
                
                sourceRef.current = source as any;
                processorRef.current = processor;
            },
            onmessage: async (msg: LiveServerMessage) => {
                // Accumulate subtitle text
                if (msg.serverContent?.outputTranscription?.text) {
                     setSubtitle(prev => prev + msg.serverContent!.outputTranscription!.text);
                }
                
                // Handle interruptions
                if (msg.serverContent?.interrupted) {
                    setSubtitle('');
                    setTranslation('');
                    nextStartTimeRef.current = 0;
                    for (const source of activeSourcesRef.current) {
                        try { source.stop(); } catch(e) {}
                    }
                    activeSourcesRef.current.clear();
                    setIsSpeaking(false);
                }

                // Handle Audio Output
                const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    setIsSpeaking(true);
                    
                    // Decode PCM
                    const binaryString = atob(base64Audio);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const int16 = new Int16Array(bytes.buffer);
                    const float32 = new Float32Array(int16.length);
                    for(let i=0; i<int16.length; i++) {
                        float32[i] = int16[i] / 32768.0;
                    }
                    
                    const buffer = audioContext.createBuffer(1, float32.length, 24000);
                    buffer.getChannelData(0).set(float32);
                    
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    if (analyserRef.current) source.connect(analyserRef.current);
                    
                    const currentTime = audioContext.currentTime;
                    const startTime = Math.max(nextStartTimeRef.current, currentTime);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + buffer.duration;
                    
                    activeSourcesRef.current.add(source);
                    source.onended = () => {
                        activeSourcesRef.current.delete(source);
                        if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
                    };
                }
            },
            onclose: () => {
                setIsConnected(false);
            },
            onerror: (err) => {
                console.error("Gemini Live Error:", err);
                setError("Connection failed. Please check permissions and network.");
                setIsConnected(false);
                cleanup(); // Ensure we cleanup on error too
            }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      setError("Failed to initialize audio session");
      cleanup();
    }
  };

  const cleanup = () => {
      // 1. Stop Microphone Stream
      if (inputStreamRef.current) {
          inputStreamRef.current.getTracks().forEach(t => t.stop());
          inputStreamRef.current = null;
      }
      
      // 2. Disconnect Audio Nodes
      if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
      }
      if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
      }
      
      // 3. Close Audio Contexts
      if (inputAudioContextRef.current) {
          inputAudioContextRef.current.close();
          inputAudioContextRef.current = null;
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
      
      // 4. Close Session
      if (sessionRef.current) {
          sessionRef.current.then((s: any) => s.close());
          sessionRef.current = null;
      }
      
      activeSourcesRef.current.clear();
      setIsConnected(false);
  };

  const stopSession = () => {
      cleanup();
      onExit();
  };
  
  // Visualizer Effect
  useEffect(() => {
    if (!isConnected || !analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const draw = () => {
      if (!ctx) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
    
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isConnected]);

  // Subtitle Pinyin conversion
  const pinyinSubtitle = subtitle ? pinyin(subtitle, { toneType: 'mark' }) : '';

  return (
    <div className="fixed inset-0 bg-stone-900 z-50 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">陈老师 Live</h2>
        <p className="text-stone-400">{isConnected ? "Listening..." : "Ready to start"}</p>
      </div>

      <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
         {/* Simple Avatar Representation */}
         <div className={`w-48 h-48 rounded-full border-4 ${isSpeaking ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'border-stone-600'} flex items-center justify-center bg-stone-800 transition-all duration-300`}>
            <span className="text-6xl text-stone-200">陈</span>
         </div>
      </div>
      
      {/* Subtitles Container */}
      <div className="min-h-[120px] w-full max-w-2xl flex flex-col items-center justify-center text-center mb-4 transition-all">
         {subtitle && (
             <div className="animate-fade-in">
                 {/* Pinyin */}
                 <p className="text-yellow-400 text-xl font-bold mb-1 drop-shadow-md">{pinyinSubtitle}</p>
                 {/* Chinese Characters Removed as per user request */}
                 {/* <p className="text-white text-3xl font-serif mb-2">{subtitle}</p> */}
                 
                 {/* English Translation */}
                 {translation && (
                    <p className="text-stone-400 text-lg italic border-t border-stone-700 pt-2 mt-1">{translation}</p>
                 )}
             </div>
         )}
      </div>

      <canvas ref={canvasRef} width={400} height={60} className="mb-8 w-full max-w-md h-16 rounded-lg bg-stone-800/50" />

      {error && <div className="text-red-400 mb-4 font-bold bg-red-900/20 px-4 py-2 rounded border border-red-900">{error}</div>}

      <div className="flex gap-4">
        {!isConnected ? (
           <button 
             onClick={startSession}
             className="px-8 py-4 bg-green-600 rounded-full font-bold text-white text-lg hover:bg-green-500 shadow-lg flex items-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             Start Call
           </button>
        ) : (
           <button 
             onClick={() => cleanup()}
             className="px-8 py-4 bg-red-600 rounded-full font-bold text-white text-lg hover:bg-red-500 shadow-lg"
           >
             End Call
           </button>
        )}
        <button onClick={stopSession} className="px-8 py-4 bg-stone-700 rounded-full font-bold text-white text-lg hover:bg-stone-600">
           Close
        </button>
      </div>
      
      <div className="mt-8 p-4 bg-stone-800 rounded-lg max-w-md w-full">
         <h4 className="text-stone-400 text-sm font-bold uppercase mb-2">Scenario Hint</h4>
         <p className="text-white text-sm">{lesson.roleplayScenario}</p>
      </div>
    </div>
  );
};

export default LiveTutor;