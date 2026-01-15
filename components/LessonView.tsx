import React, { useEffect, useState } from 'react';
import { LessonSelection, LessonPlan } from '../types';
import { generateLesson } from '../services/geminiService';
import FlashcardDeck from './FlashcardDeck';
import WritingAssistant from './WritingAssistant';
import LiveTutor from './LiveTutor';

interface LessonViewProps {
  selection: LessonSelection;
  onBack: () => void;
}

const LessonView: React.FC<LessonViewProps> = ({ selection, onBack }) => {
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLiveTutor, setShowLiveTutor] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await generateLesson(selection.difficulty, selection.week, selection.day);
        setLesson(data);
      } catch (e) {
        setError("Failed to generate lesson. Please check your API key and try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLesson();
  }, [selection]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center animate-pulse">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-2xl font-bold text-stone-700">Chen Laoshi is preparing your lesson...</h2>
        <p className="text-stone-500">Generating personalized curriculum for {selection.difficulty}, Week {selection.week}, Day {selection.day}</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Oops!</h2>
        <p className="text-stone-600 mb-6">{error || "Something went wrong."}</p>
        <button onClick={onBack} className="px-6 py-2 bg-stone-800 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {showLiveTutor && <LiveTutor lesson={lesson} onExit={() => setShowLiveTutor(false)} />}
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-800 font-bold">← Back</button>
        <div className="text-right">
            <h1 className="text-3xl font-bold text-stone-900">{lesson.title}</h1>
            <p className="text-stone-500">{selection.difficulty} • Week {selection.week} • Day {selection.day}</p>
        </div>
      </div>

      {/* 1. Warm Up */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-stone-800 mb-4 border-l-4 border-red-600 pl-3">1. Warm Up Review</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
           <ul className="list-disc list-inside space-y-2 text-stone-700">
             {lesson.warmUpQuestions.map((q, i) => <li key={i}>{q}</li>)}
           </ul>
        </div>
      </section>

      {/* 2. Flashcards */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-stone-800 mb-4 border-l-4 border-red-600 pl-3">2. Vocabulary Deck</h2>
        <FlashcardDeck cards={lesson.flashcards} />
      </section>

      {/* 3. Grammar */}
      <section className="mb-12 grid gap-6 md:grid-cols-2">
         <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4 border-l-4 border-red-600 pl-3">3. Grammar Focus</h2>
            {lesson.grammarPoints.map((gp, i) => (
                <div key={i} className="bg-amber-50 p-6 rounded-xl border border-amber-100 mb-4">
                    <h3 className="font-bold text-amber-900 mb-2">{gp.point}</h3>
                    <p className="text-stone-700 mb-4 text-sm">{gp.explanation}</p>
                    <div className="bg-white p-3 rounded-lg text-sm text-stone-600">
                        {gp.examples.map((ex, j) => <p key={j} className="mb-1 last:mb-0 zh-text">{ex}</p>)}
                    </div>
                </div>
            ))}
         </div>
         <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4 border-l-4 border-red-600 pl-3">4. Tone Drill</h2>
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 h-full">
                <p className="text-indigo-900 font-bold mb-2">Pairs:</p>
                <div className="flex gap-4 mb-4">
                   {lesson.toneDrill.pair.map((word, i) => (
                       <div key={i} className="bg-white px-4 py-2 rounded-lg shadow-sm font-bold zh-text text-lg">{word}</div>
                   ))}
                </div>
                <p className="text-sm text-stone-600">{lesson.toneDrill.explanation}</p>
            </div>
         </div>
      </section>

      {/* 5. Live Roleplay */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-stone-800 mb-4 border-l-4 border-red-600 pl-3">5. Live Conversation</h2>
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-8 text-center text-white shadow-xl">
           <h3 className="text-2xl font-bold mb-2">Practice with Chen Laoshi</h3>
           <p className="text-stone-300 mb-6 max-w-lg mx-auto">
             Enter a real-time voice call to practice the roleplay scenario. 
             Chen Laoshi will correct your pronunciation and guide the conversation.
           </p>
           <button 
             onClick={() => setShowLiveTutor(true)}
             className="px-8 py-4 bg-red-600 rounded-full font-bold text-lg hover:bg-red-500 transition-transform transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 mx-auto"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             Start Live Session
           </button>
        </div>
      </section>

      {/* 6. Homework */}
      <section className="mb-12">
         <h2 className="text-xl font-bold text-stone-800 mb-4 border-l-4 border-red-600 pl-3">6. Homework & Writing</h2>
         <WritingAssistant task={lesson.homework.writingTask} />
      </section>
      
      <div className="text-center text-stone-400 text-sm pb-8">
        Lesson Content Generated by Gemini 3.0 Pro • Speech by Gemini 2.5 Flash
      </div>
    </div>
  );
};

export default LessonView;
