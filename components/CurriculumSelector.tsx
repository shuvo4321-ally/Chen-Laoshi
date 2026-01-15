import React, { useState } from 'react';
import { Difficulty, LessonSelection } from '../types';

interface CurriculumSelectorProps {
  onSelect: (selection: LessonSelection) => void;
}

const CurriculumSelector: React.FC<CurriculumSelectorProps> = ({ onSelect }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.Beginner);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const difficultyMap = {
    [Difficulty.Beginner]: { weeks: [1, 2, 3, 4], color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    [Difficulty.Intermediate]: { weeks: [5, 6, 7, 8], color: 'bg-amber-100 text-amber-800 border-amber-300' },
    [Difficulty.Advanced]: { weeks: [9, 10, 11, 12], color: 'bg-rose-100 text-rose-800 border-rose-300' },
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-8 text-stone-800 font-serif">Select Your Lesson</h2>
      
      {/* Difficulty Tabs */}
      <div className="flex justify-center gap-4 mb-8">
        {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map((key) => {
          const diff = Difficulty[key];
          const isActive = selectedDifficulty === diff;
          return (
            <button
              key={diff}
              onClick={() => {
                setSelectedDifficulty(diff);
                setSelectedWeek(difficultyMap[diff].weeks[0]);
              }}
              className={`px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                isActive 
                  ? 'bg-red-700 text-white shadow-lg' 
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {diff}
            </button>
          );
        })}
      </div>

      {/* Weeks & Days */}
      <div className={`p-6 rounded-xl border-2 ${difficultyMap[selectedDifficulty].color}`}>
        <div className="mb-6">
          <label className="block text-sm font-bold uppercase tracking-wide mb-2 opacity-80">Week</label>
          <div className="flex gap-2 flex-wrap">
            {difficultyMap[selectedDifficulty].weeks.map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`w-12 h-12 rounded-lg font-bold flex items-center justify-center border-2 transition-colors ${
                  selectedWeek === week
                    ? 'bg-white border-current shadow-md scale-110'
                    : 'bg-transparent border-transparent hover:bg-white/50'
                }`}
              >
                {week}
              </button>
            ))}
          </div>
        </div>

        <div>
           <label className="block text-sm font-bold uppercase tracking-wide mb-2 opacity-80">Day</label>
           <div className="grid grid-cols-7 gap-2">
             {[1, 2, 3, 4, 5, 6, 7].map((day) => (
               <button
                 key={day}
                 onClick={() => onSelect({ difficulty: selectedDifficulty, week: selectedWeek, day })}
                 className="group relative flex flex-col items-center justify-center p-3 bg-white rounded-lg border-2 border-transparent hover:border-current shadow-sm hover:shadow-md transition-all"
               >
                 <span className="text-xl font-bold mb-1">{day}</span>
                 <span className="text-[10px] uppercase font-bold opacity-60">
                   {day === 7 ? 'Challenge' : 'Lesson'}
                 </span>
               </button>
             ))}
           </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-stone-500 text-sm italic">
        "A journey of a thousand miles begins with a single step." - Laozi
      </div>
    </div>
  );
};

export default CurriculumSelector;
