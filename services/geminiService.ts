import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { LessonPlan, Difficulty } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const LESSON_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    warmUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          pinyin: { type: Type.STRING },
          meaning: { type: Type.STRING },
          tone: { type: Type.STRING },
          type: { type: Type.STRING },
          exampleSentence: { type: Type.STRING, description: "Example sentence using the word, in Chinese characters only." },
          exampleMeaning: { type: Type.STRING, description: "English translation of the example sentence." },
          pronunciationTip: { type: Type.STRING },
        },
        required: ["word", "pinyin", "meaning", "tone", "type", "exampleSentence", "exampleMeaning", "pronunciationTip"]
      }
    },
    sentenceCards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          grammarNote: { type: Type.STRING },
          example: { type: Type.STRING },
          roleplayUse: { type: Type.STRING },
        },
        required: ["grammarNote", "example", "roleplayUse"]
      }
    },
    toneDrill: {
      type: Type.OBJECT,
      properties: {
        pair: { type: Type.ARRAY, items: { type: Type.STRING } },
        explanation: { type: Type.STRING }
      },
      required: ["pair", "explanation"]
    },
    grammarPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point: { type: Type.STRING },
          explanation: { type: Type.STRING },
          examples: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["point", "explanation", "examples"]
      }
    },
    pronunciationGuide: { type: Type.ARRAY, items: { type: Type.STRING } },
    roleplayScenario: { type: Type.STRING },
    summary: { type: Type.STRING },
    homework: {
      type: Type.OBJECT,
      properties: {
        speakingTask: { type: Type.STRING },
        writingTask: { type: Type.STRING },
        challenge: { type: Type.STRING }
      },
      required: ["speakingTask", "writingTask", "challenge"]
    }
  },
  required: ["title", "warmUpQuestions", "flashcards", "sentenceCards", "toneDrill", "grammarPoints", "pronunciationGuide", "roleplayScenario", "summary", "homework"]
};

export const generateLesson = async (difficulty: Difficulty, week: number, day: number): Promise<LessonPlan> => {
  const prompt = `
    You are Chen Laoshi, an expert Chinese tutor.
    Generate a complete, self-contained lesson plan for:
    Level: ${difficulty}
    Week: ${week}
    Day: ${day}
    
    Adhere strictly to the curriculum progression:
    - Beginner (Weeks 1-4): Basics, pinyin, numbers, daily objects.
    - Intermediate (Weeks 5-8): Routines, shopping, directions, time.
    - Advanced (Weeks 9-12): Opinions, comparisons, idioms, stories.
    
    Day ${day} difficulty rules:
    - Day 1-2: Foundational/Moderate
    - Day 3-5: Increasing vocabulary and grammar complexity
    - Day 6-7: Fast-paced, advanced practice
    
    For Flashcards:
    - exampleSentence: MUST be Chinese characters ONLY. No Pinyin, No English.
    - exampleMeaning: English translation of the sentence.

    Return the response as a valid JSON object matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: LESSON_SCHEMA,
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No text generated");
    return JSON.parse(text) as LessonPlan;
  } catch (error) {
    console.error("Lesson generation error:", error);
    throw error;
  }
};

export const generateTTS = async (text: string): Promise<string> => {
  if (!text || !text.trim()) {
    throw new Error("Text for TTS is empty");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ text: text }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData && p.inlineData.data);

    if (!audioPart || !audioPart.inlineData?.data) {
        console.warn("TTS Response candidates:", JSON.stringify(response.candidates, null, 2));
        throw new Error("No audio data generated.");
    }
    return audioPart.inlineData.data;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};

export const checkHomework = async (task: string, submission: string): Promise<string> => {
    const prompt = `
    You are Chen Laoshi. The student has submitted writing homework.
    Task: ${task}
    Student Submission: "${submission}"
    
    Provide feedback in the following format:
    1. **Quote**: Quote their text.
    2. **Errors**: Mark errors with [错误].
    3. **Explanation**: Explain the reason. **(YOU MUST PROVIDE THIS EXPLANATION IN BOTH CHINESE AND ENGLISH)**.
    4. **Correction**: Provide a corrected version.
    5. **Practice**: Give 2 practice sentences using the corrected grammar/vocab.
    
    Keep the tone encouraging but strict on accuracy. Ensure the English translation of the feedback is clear for a learner.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    
    return response.text || "Could not generate feedback.";
};

export const analyzeHandwriting = async (task: string, imageBase64: string, mimeType: string): Promise<string> => {
  const prompt = `
    You are Chen Laoshi. The student has uploaded a handwritten image for the assignment: "${task}".
    
    Please provide feedback in this structure:
    1. **Transcription**: Write out the Chinese characters you see in the image.
    2. **Correction**: Point out any grammar, vocabulary, or stroke order mistakes if visible. **(PROVIDE EXPLANATION IN BOTH CHINESE AND ENGLISH)**
    3. **Handwriting Feedback**: Comment on legibility and style. **(PROVIDE EXPLANATION IN BOTH CHINESE AND ENGLISH)**
    4. **Corrected Version**: Provide the corrected text.
    5. **Encouragement**: A brief positive note in Chinese with an English translation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          { text: prompt }
        ]
      }
    });
    return response.text || "Could not analyze handwriting.";
  } catch (error) {
    console.error("Handwriting analysis error:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioBlob);
    const base64Data = await base64Promise;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type,
              data: base64Data,
            },
          },
          { text: "Transcribe this Chinese audio exactly as spoken. Return only the Chinese characters." },
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};