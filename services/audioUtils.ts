export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Float32 audio data (from Web Audio API) to Int16 PCM (for Gemini)
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Convert Int16 PCM (from Gemini) to Float32 (for Web Audio API playback)
export function int16ToFloat32(int16Data: Int16Array): Float32Array {
  const float32 = new Float32Array(int16Data.length);
  for (let i = 0; i < int16Data.length; i++) {
    float32[i] = int16Data[i] / 32768.0;
  }
  return float32;
}

// Helper to decode base64 string directly to AudioBuffer
export async function decodeAudioData(
  base64String: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const arrayBuffer = base64ToArrayBuffer(base64String);
  // Gemini returns raw PCM 16-bit, 24kHz, 1 channel usually for Flash TTS/Live
  // But standard decodeAudioData expects file headers (wav/mp3).
  // For RAW PCM, we must manually construct the buffer.
  
  // Note: Live API output is typically 24kHz.
  // TTS API output is typically 24kHz.
  
  const int16 = new Int16Array(arrayBuffer);
  const float32 = int16ToFloat32(int16);
  
  const buffer = audioContext.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);
  
  return buffer;
}
