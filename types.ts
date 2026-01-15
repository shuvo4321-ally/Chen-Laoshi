export enum Difficulty {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced'
}

export interface Flashcard {
  word: string;
  pinyin: string;
  meaning: string;
  tone: string;
  type: string;
  exampleSentence: string;
  exampleMeaning: string;
  pronunciationTip: string;
}

export interface GrammarPoint {
  point: string;
  explanation: string;
  examples: string[];
}

export interface ToneDrill {
  pair: string[];
  explanation: string;
}

export interface Homework {
  speakingTask: string;
  writingTask: string;
  challenge: string;
}

export interface LessonPlan {
  title: string;
  warmUpQuestions: string[];
  flashcards: Flashcard[];
  sentenceCards: { grammarNote: string; example: string; roleplayUse: string }[];
  toneDrill: ToneDrill;
  grammarPoints: GrammarPoint[];
  pronunciationGuide: string[];
  roleplayScenario: string;
  summary: string;
  homework: Homework;
}

export interface LessonSelection {
  difficulty: Difficulty;
  week: number;
  day: number;
}