import React, { useState } from 'react';
import CurriculumSelector from './components/CurriculumSelector';
import LessonView from './components/LessonView';
import { LessonSelection } from './types';

function App() {
  const [currentSelection, setCurrentSelection] = useState<LessonSelection | null>(null);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold font-serif">陈</div>
            <h1 className="font-bold text-xl tracking-tight">Chen Laoshi <span className="text-stone-400 font-normal text-sm ml-1">AI Tutor</span></h1>
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Powered by Gemini</span>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        {!currentSelection ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="text-center mb-10 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 mb-4 font-serif">Master Chinese with AI</h2>
              <p className="text-lg text-stone-600 leading-relaxed">
                Experience a flashcard-driven system powered by 
                <span className="font-bold text-red-600"> Gemini Live</span>. 
                Adaptive lessons, real-time pronunciation correction, and infinite curriculum.
              </p>
            </div>
            <CurriculumSelector onSelect={setCurrentSelection} />
          </div>
        ) : (
          <LessonView 
            selection={currentSelection} 
            onBack={() => setCurrentSelection(null)} 
          />
        )}
      </main>
    </div>
  );
}

export default App;