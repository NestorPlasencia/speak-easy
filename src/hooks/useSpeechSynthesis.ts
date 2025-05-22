// src/hooks/useSpeechSynthesis.ts
"use client";

import { useState, useEffect, useCallback } from 'react';

interface SpeechSynthesisVoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string, voiceURI?: string, onBoundary?: (event: SpeechSynthesisEvent) => void, onEnd?: () => void) => void;
  cancel: () => void;
  speaking: boolean;
  supported: boolean;
  voices: SpeechSynthesisVoiceOption[];
  selectedVoiceURI: string | undefined;
  setSelectedVoiceURI: (voiceURI: string) => void;
}

const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [voices, setVoices] = useState<SpeechSynthesisVoiceOption[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | undefined>(undefined);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        const englishVoices = availableVoices
          .filter(voice => voice.lang.startsWith('en'))
          .map(voice => ({ name: voice.name, lang: voice.lang, voiceURI: voice.voiceURI }));
        setVoices(englishVoices);
        if (englishVoices.length > 0 && !selectedVoiceURI) {
          // Prefer a default US English voice if available
          const defaultUSVoice = englishVoices.find(v => v.lang === 'en-US' && v.name.includes('Google') || v.name.includes('Default') || v.name.includes('Microsoft David'));
          setSelectedVoiceURI(defaultUSVoice ? defaultUSVoice.voiceURI : englishVoices[0].voiceURI);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices; // Ensure voices are loaded when they change

      // Cleanup on unmount
      return () => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        window.speechSynthesis.onvoiceschanged = null;
        if (currentUtterance) {
            currentUtterance.onend = null;
            currentUtterance.onerror = null;
            currentUtterance.onboundary = null;
        }
      };
    } else {
      setSupported(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // selectedVoiceURI removed from deps to avoid re-running when it's set

  const speak = useCallback((text: string, voiceURI?: string, onBoundary?: (event: SpeechSynthesisEvent) => void, onEnd?: () => void) => {
    if (!supported || speaking) return;

    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voiceToUse = voiceURI || selectedVoiceURI;
    const selectedVoice = voices.find(v => v.voiceURI === voiceToUse);

    if (selectedVoice) {
      const actualVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice.voiceURI);
      if (actualVoice) {
        utterance.voice = actualVoice;
      }
    }
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      setCurrentUtterance(null);
      if (onEnd) onEnd();
    };
    utterance.onerror = (event) => {
      console.error('SpeechSynthesis Error:', event);
      setSpeaking(false);
      setCurrentUtterance(null);
      if (onEnd) onEnd(); // also call onEnd on error
    };
    if (onBoundary) {
        utterance.onboundary = onBoundary;
    }

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  }, [supported, speaking, voices, selectedVoiceURI]);

  const cancel = useCallback(() => {
    if (!supported || !speaking) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    if (currentUtterance) {
        currentUtterance.onend = null; // Clean up listeners
        currentUtterance.onerror = null;
        currentUtterance.onboundary = null;
    }
    setCurrentUtterance(null);
  }, [supported, speaking, currentUtterance]);

  return { speak, cancel, speaking, supported, voices, selectedVoiceURI, setSelectedVoiceURI };
};

export default useSpeechSynthesis;
