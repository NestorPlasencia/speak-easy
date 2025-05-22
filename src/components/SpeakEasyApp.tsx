// src/components/SpeakEasyApp.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import useSpeechSynthesis from '@/hooks/useSpeechSynthesis';
import useMediaRecorder from '@/hooks/useMediaRecorder';
import { segmentSentences, blobToBase64 } from '@/lib/textUtils';
import { generateSentences as generateSentencesFlow } from '@/ai/flows/generate-sentences';
import { improvePronunciation as improvePronunciationFlow, type ImprovePronunciationOutput } from '@/ai/flows/improve-pronunciation';
import { SpeakEasyLogo } from '@/components/icons/SpeakEasyLogo';
import {
  Volume2, Mic, Square, PlayCircle, ChevronLeft, ChevronRight, Wand2, ScanText, Activity, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';

type WordHighlight = {
  word: string;
  type: 'default' | 'correct' | 'incorrect' | 'current';
};

export default function SpeakEasyApp() {
  const { toast } = useToast();

  // Text and Sentence Management
  const [inputText, setInputText] = useState<string>('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [isLoadingSentences, setIsLoadingSentences] = useState<boolean>(false);

  // Speech Synthesis (TTS)
  const {
    speak,
    cancel: cancelSpeech,
    speaking: isSpeakingTTS,
    supported: ttsSupported,
    voices: ttsVoices,
    selectedVoiceURI: currentVoiceURI,
    setSelectedVoiceURI,
  } = useSpeechSynthesis();
  const [currentSpokenWordIndex, setCurrentSpokenWordIndex] = useState<number>(-1);

  // Media Recording
  const {
    startRecording,
    stopRecording,
    audioBlob,
    audioUrl,
    isRecording,
    error: recorderError,
    resetRecording,
    mediaRecorderRef
  } = useMediaRecorder('audio/wav');

  // Pronunciation Feedback
  const [feedback, setFeedback] = useState<ImprovePronunciationOutput | null>(null);
  const [isLoadingAiFeedback, setIsLoadingAiFeedback] = useState<boolean>(false);

  // App State
  const [appError, setAppError] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const currentSentence = sentences[currentSentenceIndex] || '';
  const currentSentenceWords = currentSentence.split(/\s+/);

  useEffect(() => {
    if (recorderError) {
      toast({ title: "Recording Error", description: recorderError, variant: "destructive" });
    }
  }, [recorderError, toast]);

  useEffect(() => {
    setFeedback(null);
    resetRecording();
  }, [currentSentenceIndex, sentences, resetRecording]);
  
  const handleGenerateSentences = async () => {
    setIsLoadingSentences(true);
    setAppError(null);
    try {
      const result = await generateSentencesFlow({ topic: "common daily phrases", sentenceCount: 5 });
      if (result.sentences && result.sentences.length > 0) {
        const newText = result.sentences.join(' ');
        setInputText(newText);
        handleProcessText(newText);
        toast({ title: "Sentences Generated", description: "New sentences loaded for practice." });
      } else {
        setAppError("Could not generate sentences. The result was empty.");
      }
    } catch (error) {
      console.error("Error generating sentences:", error);
      setAppError("Failed to generate sentences. Please try again.");
      toast({ title: "Error", description: "Failed to generate sentences.", variant: "destructive" });
    }
    setIsLoadingSentences(false);
  };

  const handleProcessText = useCallback((textToProcess: string = inputText) => {
    if (!textToProcess.trim()) {
      setSentences([]);
      setCurrentSentenceIndex(0);
      setFeedback(null);
      resetRecording();
      toast({ title: "Text Cleared", description: "Practice area reset.", variant: "default" });
      return;
    }
    const segmented = segmentSentences(textToProcess);
    if (segmented.length === 0 && textToProcess.trim().length > 0) {
        setSentences([textToProcess.trim()]);
    } else {
        setSentences(segmented);
    }
    setCurrentSentenceIndex(0);
    setFeedback(null);
    resetRecording();
    if (segmented.length > 0 || textToProcess.trim().length > 0) {
      toast({ title: "Text Processed", description: `Found ${segmented.length > 0 ? segmented.length : 1} sentence(s).` });
    }
  }, [inputText, resetRecording, toast]);

  const navigateSentence = (direction: 'next' | 'prev') => {
    cancelSpeech();
    if (isRecording) stopRecording();

    setCurrentSentenceIndex(prev => {
      const newIndex = direction === 'next' ? prev + 1 : prev - 1;
      if (newIndex >= 0 && newIndex < sentences.length) {
        return newIndex;
      }
      return prev;
    });
  };

  const handleListen = () => {
    if (!currentSentence) return;
    if (isSpeakingTTS) {
      cancelSpeech();
      setCurrentSpokenWordIndex(-1);
      return;
    }
    
    setCurrentSpokenWordIndex(-1);
    speak(
      currentSentence,
      currentVoiceURI,
      (event: SpeechSynthesisEvent) => {
        if (event.name === 'word') {
           let cumulativeLength = 0;
           for (let i = 0; i < currentSentenceWords.length; i++) {
             cumulativeLength += currentSentenceWords[i].length + 1;
             if (event.charIndex < cumulativeLength) {
               setCurrentSpokenWordIndex(i);
               break;
             }
           }
        }
      },
      () => {
        setCurrentSpokenWordIndex(-1);
      }
    );
  };

  const handleListenWord = (wordToSpeak: string) => {
    if (!currentSentence || !ttsSupported) return;
    
    if (isSpeakingTTS) {
      cancelSpeech();
    }
    setCurrentSpokenWordIndex(-1); 
    speak(wordToSpeak, currentVoiceURI);
  };
  
  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
      toast({ title: "Recording Stopped" });
    } else {
      resetRecording();
      setFeedback(null);
      startRecording().then(() => {
        toast({ title: "Recording Started" });
      }).catch(e => {
        toast({ title: "Recording Error", description: e.message, variant: "destructive" });
      });
    }
  };

  const handleAnalyzePronunciation = async () => {
    if (!audioBlob || !currentSentence) {
      toast({ title: "Cannot Analyze", description: "Please record your voice first for the current sentence.", variant: "destructive" });
      return;
    }
    setIsLoadingAiFeedback(true);
    setAppError(null);
    setFeedback(null);
    try {
      const audioDataUri = await blobToBase64(audioBlob);
      const result = await improvePronunciationFlow({ sentence: currentSentence, userRecording: audioDataUri });
      setFeedback(result);
      toast({ title: "Analysis Complete", description: "Pronunciation feedback is ready.", icon: <CheckCircle2 className="h-4 w-4" /> });
    } catch (error) {
      console.error("Error analyzing pronunciation:", error);
      setAppError("Failed to analyze pronunciation. Please try again.");
      toast({ title: "Analysis Error", description: "Could not get pronunciation feedback.", variant: "destructive" });
    }
    setIsLoadingAiFeedback(false);
  };

  const getHighlightedSentence = (): WordHighlight[] => {
    if (!currentSentence) return [];
    const words = currentSentenceWords;

    if (isSpeakingTTS && currentSpokenWordIndex !== -1) {
        return words.map((word, index) => ({
            word,
            type: index === currentSpokenWordIndex ? 'current' : 'default',
        }));
    }

    if (!feedback) {
      return words.map(word => ({ word, type: 'default' }));
    }

    const correctSet = new Set(feedback.correctWords.map(w => w.toLowerCase()));
    const incorrectSet = new Set(feedback.incorrectWords.map(w => w.toLowerCase()));

    return words.map(word => {
      const lowerWord = word.toLowerCase().replace(/[.,!?]/g, '');
      if (correctSet.has(lowerWord)) return { word, type: 'correct' };
      if (incorrectSet.has(lowerWord)) return { word, type: 'incorrect' };
      return { word, type: 'default' };
    });
  };
  
  const highlightedWords = getHighlightedSentence();

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background text-foreground">
      <header className="mb-8">
        <SpeakEasyLogo />
      </header>

      <main className="w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Input Your Text</CardTitle>
            <CardDescription>Paste the text you want to practice, or generate sample sentences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="text-base"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => handleProcessText()} className="w-full sm:w-auto" disabled={isLoadingSentences || isLoadingAiFeedback}>
                <ScanText className="mr-2 h-4 w-4" /> Process Text
              </Button>
              <Button onClick={handleGenerateSentences} className="w-full sm:w-auto" disabled={isLoadingSentences || isLoadingAiFeedback}>
                {isLoadingSentences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate Sentences
              </Button>
            </div>
          </CardContent>
        </Card>

        {sentences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Practice Sentence</CardTitle>
              <CardDescription>
                Sentence {currentSentenceIndex + 1} of {sentences.length}.
                {ttsSupported && ttsVoices.length > 0 && (
                  <div className="mt-2">
                    <Select value={currentVoiceURI} onValueChange={setSelectedVoiceURI}>
                      <SelectTrigger className="w-full sm:w-[280px] text-sm h-9">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {ttsVoices.map(voice => (
                          <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl p-4 border rounded-md min-h-[6rem] flex flex-wrap items-center justify-center text-center bg-card-foreground/5">
                {highlightedWords.map((item, index) => (
                  <span 
                    key={index} 
                    className={`
                      inline-block break-words cursor-pointer hover:opacity-75 focus:outline-none focus:ring-1 focus:ring-primary rounded
                      ${item.type === 'correct' ? 'text-[hsl(var(--correct-word-foreground))] bg-[hsl(var(--correct-word-background)/0.3)] px-1' : ''}
                      ${item.type === 'incorrect' ? 'text-[hsl(var(--incorrect-word-foreground))] bg-[hsl(var(--incorrect-word-background)/0.3)] px-1 line-through' : ''}
                      ${item.type === 'current' ? 'bg-[hsl(var(--current-word-highlight))] px-1 font-bold' : ''}
                      mr-1 my-0.5 px-0.5
                    `}
                    onClick={() => handleListenWord(item.word)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleListenWord(item.word); }}}
                    role="button"
                    tabIndex={0}
                    aria-label={`Listen to word: ${item.word}`}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <Button onClick={() => navigateSentence('prev')} disabled={currentSentenceIndex === 0 || isLoadingAiFeedback || isRecording}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button onClick={() => navigateSentence('next')} disabled={currentSentenceIndex === sentences.length - 1 || isLoadingAiFeedback || isRecording}>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={handleListen} disabled={!currentSentence || isRecording} className="w-full sm:w-auto">
                {isSpeakingTTS && currentSpokenWordIndex !== -1 ? <Square className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {isSpeakingTTS && currentSpokenWordIndex !== -1 ? 'Stop Listening' : 'Listen to Sentence'}
              </Button>
              <Button onClick={handleRecordToggle} variant={isRecording ? "destructive" : "default"} className="w-full sm:w-auto" disabled={isSpeakingTTS && currentSpokenWordIndex !== -1}>
                {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isRecording ? 'Stop Recording' : 'Record Voice'}
              </Button>
            </CardFooter>
            {isRecording && (
                <div className="p-4">
                    <Progress value={undefined} className="w-full animate-pulse" />
                    <p className="text-sm text-center text-muted-foreground mt-2">Recording in progress...</p>
                </div>
            )}
          </Card>
        )}

        {(audioUrl || feedback || isLoadingAiFeedback || appError) && (
          <Card>
            <CardHeader>
              <CardTitle>3. Your Recording & Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {audioUrl && (
                <div className="space-y-2">
                  <p className="font-medium">Your Last Recording:</p>
                  <audio ref={audioPlayerRef} src={audioUrl} controls className="w-full" />
                </div>
              )}

              {audioBlob && !feedback && !isLoadingAiFeedback && (
                <Button onClick={handleAnalyzePronunciation} className="w-full" disabled={isRecording}>
                  <Activity className="mr-2 h-4 w-4" /> Analyze Pronunciation
                </Button>
              )}

              {isLoadingAiFeedback && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                  <p>Analyzing your speech...</p>
                </div>
              )}
              
              {appError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{appError}</AlertDescription>
                </Alert>
              )}

              {feedback && !isLoadingAiFeedback && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-lg">Pronunciation Feedback:</h4>
                  <p className="text-sm p-3 bg-accent/20 rounded-md border border-accent">{feedback.feedback}</p>
                  
                  <div>
                    <h5 className="font-medium">Correctly Pronounced Words:</h5>
                    {feedback.correctWords.length > 0 ? (
                      <p className="text-sm text-green-700 dark:text-green-400">{feedback.correctWords.join(', ')}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">None identified.</p>
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium">Words to Practice:</h5>
                     {feedback.incorrectWords.length > 0 ? (
                      <p className="text-sm text-orange-700 dark:text-orange-400">{feedback.incorrectWords.join(', ')}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Great job, no major mispronunciations identified by the AI!</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
         {!ttsSupported && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Browser Compatibility</AlertTitle>
                <AlertDescription>
                Your browser does not support Text-to-Speech (SpeechSynthesis API). Some features may not be available.
                </AlertDescription>
            </Alert>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SpeakEasy. Practice makes perfect.</p>
      </footer>
    </div>
  );
}

