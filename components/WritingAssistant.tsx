import React, { useState, useRef } from 'react';
import { checkHomework, transcribeAudio, analyzeHandwriting } from '../services/geminiService';

interface WritingAssistantProps {
  task: string;
}

const WritingAssistant: React.FC<WritingAssistantProps> = ({ task }) => {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageMimeType('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleCheck = async () => {
    if (!input.trim() && !selectedImage) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      let res;
      if (selectedImage) {
        // Extract base64 raw string (remove data:image/xxx;base64, prefix)
        const base64Data = selectedImage.split(',')[1];
        res = await analyzeHandwriting(task, base64Data, imageMimeType);
      } else {
        res = await checkHomework(task, input);
      }
      setFeedback(res);
    } catch (e) {
      console.error(e);
      setFeedback("Something went wrong checking your work. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Chrome default
          setIsLoading(true);
          try {
            const text = await transcribeAudio(blob);
            setInput((prev) => prev + text);
          } catch (e) {
            console.error("Transcription failed", e);
          } finally {
            setIsLoading(false);
            stream.getTracks().forEach(t => t.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Mic access denied", e);
      }
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-lg border border-stone-200">
      <h3 className="text-xl font-bold text-stone-800 mb-4">Writing / Speaking Assignment</h3>
      <p className="text-stone-600 mb-4 italic">{task}</p>
      
      {/* Image Preview */}
      {selectedImage && (
        <div className="relative mb-4 w-fit">
            <img src={selectedImage} alt="Handwriting Upload" className="max-h-48 rounded-lg border-2 border-stone-200 shadow-sm" />
            <button 
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-stone-800 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
      )}

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!selectedImage}
          className={`w-full p-4 border-2 rounded-xl focus:border-red-500 focus:outline-none min-h-[150px] text-lg zh-text transition-colors ${
              selectedImage ? 'bg-stone-100 border-stone-200 text-stone-400' : 'bg-white border-stone-200'
          }`}
          placeholder={selectedImage ? "Image uploaded. Text input disabled." : "Type your answer here or use the microphone..."}
        />
        
        <div className="absolute bottom-4 right-4 flex gap-2">
            {/* Upload Button */}
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700 rounded-full transition-colors"
                title="Upload Handwriting"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*"
            />

            {/* Mic Button */}
            <button
                onClick={toggleRecording}
                disabled={!!selectedImage}
                className={`p-2 rounded-full transition-colors ${
                    isRecording 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : !!selectedImage 
                            ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
                title="Dictate Answer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </button>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCheck}
          disabled={isLoading || (!input && !selectedImage)}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Thinking...' : 'Check My Work'}
        </button>
      </div>

      {feedback && (
        <div className="mt-6 p-6 bg-stone-50 rounded-xl border border-stone-200 animate-fade-in">
          <h4 className="font-bold text-stone-700 mb-2">Teacher Feedback:</h4>
          <div className="prose prose-stone whitespace-pre-wrap text-stone-600">
            {feedback}
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingAssistant;