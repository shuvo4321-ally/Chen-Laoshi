import React, { useState } from 'react';
import { Flashcard } from '../types';
import { generateTTS } from '../services/geminiService';
import { arrayBufferToBase64, decodeAudioData } from '../services/audioUtils';

interface FlashcardDeckProps {
  cards: Flashcard[];
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentCard = cards[currentIndex];

  const playAudio = async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64 = await generateTTS(text);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await decodeAudioData(base64, audioContext);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="w-full max-w-md mx-auto perspective-1000">
      <div className="relative w-full aspect-[4/5] bg-transparent">
        <div
          className={`relative w-full h-full text-center transition-transform duration-700 transform-style-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white border-4 border-stone-200 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8">
             
             {/* Speaker Button (Top Right) */}
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 playAudio(currentCard.word);
               }}
               className="absolute top-6 right-6 p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
               title="Pronounce Word"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               </svg>
             </button>

             <span className="text-sm font-bold text-red-600 uppercase tracking-widest mb-4">{currentCard.type}</span>
             <h2 className="text-6xl font-bold text-stone-900 zh-text mb-2">{currentCard.word}</h2>
             <p className="text-2xl text-stone-500 mb-8">{currentCard.pinyin}</p>
             <div className="mt-auto text-stone-400 text-sm">Tap to flip</div>
          </div>

          {/* Back */}
          <div 
            className="absolute w-full h-full backface-hidden bg-stone-900 text-stone-100 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 rotate-y-180"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
             <h3 className="text-3xl font-bold text-red-400 mb-2">{currentCard.meaning}</h3>
             <p className="text-lg text-stone-400 mb-6 italic">{currentCard.tone}</p>
             
             <div className="w-full bg-stone-800 p-4 rounded-xl mb-4">
               <p className="text-sm text-stone-400 mb-1">Example:</p>
               <p className="text-lg zh-text text-white mb-2">{currentCard.exampleSentence}</p>
               <p className="text-sm text-stone-400 italic">{currentCard.exampleMeaning}</p>
             </div>
             
             <div className="w-full bg-stone-800 p-4 rounded-xl mb-6">
                <p className="text-sm text-stone-400 mb-1">Tip:</p>
                <p className="text-sm text-stone-300">{currentCard.pronunciationTip}</p>
             </div>

             <button
               onClick={(e) => {
                 e.stopPropagation();
                 playAudio(`${currentCard.word}. ${currentCard.exampleSentence}`);
               }}
               className={`p-4 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-red-600 hover:bg-red-500'} text-white transition-colors`}
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               </svg>
             </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8 px-4">
        <button 
          onClick={handlePrev} 
          className="px-6 py-3 bg-stone-200 rounded-full font-bold text-stone-600 hover:bg-stone-300 transition-colors"
        >
          Previous
        </button>
        <span className="self-center font-bold text-stone-400">{currentIndex + 1} / {cards.length}</span>
        <button 
          onClick={handleNext} 
          className="px-6 py-3 bg-red-600 rounded-full font-bold text-white hover:bg-red-700 transition-colors shadow-lg"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default FlashcardDeck;