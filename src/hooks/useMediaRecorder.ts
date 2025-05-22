
// src/hooks/useMediaRecorder.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMediaRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isRecording: boolean;
  error: string | null;
  resetRecording: () => void;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
}

const useMediaRecorder = (mimeType: string = 'audio/webm'): UseMediaRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioUrlRef = useRef<string | null>(null); // Added ref for stable reset

  const requestMediaPermissions = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Media devices API not supported in this browser.');
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Please allow access in your browser settings.');
        } else {
          setError(`Error accessing microphone: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred while accessing the microphone.');
      }
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    const stream = await requestMediaPermissions();
    if (!stream) return;

    try {
      if (typeof MediaRecorder === 'undefined') {
        setError('MediaRecorder API not supported in this browser.');
        return;
      }
      
      let options = { mimeType };
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`${mimeType} is not supported. Trying default.`);
        options = {} as any; 
        if (MediaRecorder.isTypeSupported('audio/wav')) {
            options = { mimeType: 'audio/wav' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
             options = { mimeType: 'audio/ogg; codecs=opus' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const newAudioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        setAudioBlob(newAudioBlob);
        const newAudioUrl = URL.createObjectURL(newAudioBlob);
        setAudioUrl(newAudioUrl);
        currentAudioUrlRef.current = newAudioUrl; // Update ref
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError(`Recording error: ${(event as any).error?.message || 'Unknown recording error'}`);
        setIsRecording(false);
         stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
        console.error('Failed to start recording:', err);
        if (err instanceof Error) {
             setError(`Failed to start recording: ${err.message}`);
        } else {
            setError('An unknown error occurred while starting recording.');
        }
        setIsRecording(false);
    }
  }, [requestMediaPermissions, mimeType]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);
  
  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    if (currentAudioUrlRef.current) { // Use ref for revoking
      URL.revokeObjectURL(currentAudioUrlRef.current);
    }
    setAudioUrl(null); // Clear state
    currentAudioUrlRef.current = null; // Clear ref
    setError(null);
    audioChunksRef.current = [];
  }, []); // Empty dependency array makes it stable

  useEffect(() => {
    // This effect handles cleanup if the component unmounts with an active audioUrl state,
    // or if audioUrl changes for reasons outside of resetRecording's control.
    // It uses the audioUrl state directly, as it's cleaning up based on that state's lifecycle.
    let urlToRevokeFromState: string | null = null;
    if (audioUrl) {
        urlToRevokeFromState = audioUrl;
    }
    return () => {
      if (urlToRevokeFromState) {
        // Check if this URL is still the one in the ref, to avoid double-revocation
        // if resetRecording was already called. However, revoking multiple times is usually safe.
        URL.revokeObjectURL(urlToRevokeFromState);
      }
    };
  }, [audioUrl]); // This effect still depends on audioUrl state for its own cleanup logic

  return { startRecording, stopRecording, audioBlob, audioUrl, isRecording, error, resetRecording, mediaRecorderRef };
};

export default useMediaRecorder;
