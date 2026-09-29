# Chen Laoshi - AI Chinese Tutor

Master Chinese with AI. An adaptive Chinese language tutor that uses Gemini Live for real-time spoken conversation and Gemini for dynamic curriculum generation.

## Features

- **Curriculum selector**: generate lessons for any level or topic, without a fixed syllabus
- **Lessons** built on demand
- **Flashcard deck** for vocabulary review
- **Live tutor**: talk to the tutor and get real-time pronunciation feedback (needs microphone access)
- **Writing assistant** for practicing written Chinese

## Tech stack

React, TypeScript, Vite, Gemini (Gemini Live for voice, Gemini for lessons)

## Getting started

Prerequisites: Node.js and a [Gemini API key](https://aistudio.google.com/apikey).

1. Install dependencies: `npm install`
2. Create `.env.local` and set `GEMINI_API_KEY=your-key`
3. Start the app: `npm run dev`

Allow microphone access in your browser to use the live tutor.