import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { parseVoiceInput } from "../utils/keywordMatch";

interface RecordingProps {
  onTranscript?: (text: string) => void;
  onVoiceInput?: (data: { categoryId?: string; accountId?: string; amount?: number; description: string }) => void;
  onVoiceEnd?: () => void;
  startTrigger?: number;
}

export default function Recording({ onTranscript, onVoiceInput, onVoiceEnd, startTrigger }: RecordingProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const speechStartTimeoutRef = useRef<NodeJS.Timeout>();
  const hasSpeechStartedRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout>();
  const onVoiceInputRef = useRef(onVoiceInput);
  const onVoiceEndRef = useRef(onVoiceEnd);
  const onTranscriptRef = useRef(onTranscript);

  // Keep refs up-to-date without re-initializing recognition
  useEffect(() => { onVoiceInputRef.current = onVoiceInput; }, [onVoiceInput]);
  useEffect(() => { onVoiceEndRef.current = onVoiceEnd; }, [onVoiceEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Auto-start when trigger increments (e.g. when category page becomes active)
  useEffect(() => {
    if (!startTrigger || !recognitionRef.current || isListeningRef.current) return;
    try {
      setTranscript("");
      hasSpeechStartedRef.current = false;
      setIsListening(true);
      isListeningRef.current = true;
      recognitionRef.current.start();
    } catch (e) {
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [startTrigger]);

  useEffect(() => {
    // Initialize Web Speech API with multiple fallbacks
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      console.warn("Your browser doesn't support Web Speech API");
      console.warn("Supported browsers: Chrome, Edge, Safari, Firefox");
      setIsSupported(false);
      return;
    }

    console.log("Speech Recognition API found");
    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "th-TH";

    recognition.onstart = () => {
      console.log("Speech recognition started - waiting for speech");
      hasSpeechStartedRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          console.log("Final transcript:", transcriptPart);
          // Mark that speech has started
          hasSpeechStartedRef.current = true;

          setTranscript((prev) => prev + transcriptPart + " ");
          if (onTranscriptRef.current) {
            onTranscriptRef.current(transcriptPart);
          }

          // Parse voice input for category, account, and amount — always call
          const voiceData = parseVoiceInput(transcriptPart);
          if (onVoiceInputRef.current) {
            console.log("Voice data:", voiceData);
            onVoiceInputRef.current(voiceData);
          }

          // Auto-stop after 2 seconds of silence (user finished speaking)
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              console.log("No speech detected for 2 seconds, finishing recording");
              recognitionRef.current.stop();
            }
          }, 2000);
        } else {
          interim += transcriptPart;
        }
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");

      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = undefined;
      }

      // Call onVoiceEnd callback when speech ends (if speech was detected)
      if (hasSpeechStartedRef.current && onVoiceEndRef.current) {
        console.log("Calling onVoiceEnd callback");
        onVoiceEndRef.current();
      }

      // Reset state to match reality - listening has stopped
      if (isListeningRef.current) {
        console.log("Syncing UI state - recognition ended");
        setIsListening(false);
        isListeningRef.current = false;
      }

      hasSpeechStartedRef.current = false;
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;

    // Handle app focus/blur - stop recording when user switches away
    const handleBlur = () => {
      if (isListeningRef.current && recognition) {
        console.log("App lost focus, stopping recording");
        recognition.stop();
      }
    };

    window.addEventListener("blur", handleBlur);

    // Cleanup
    return () => {
      window.removeEventListener("blur", handleBlur);
      if (recognition) {
        recognition.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []); // init once only

  const handleToggleListening = () => {
    console.log("Toggle clicked, listening:", isListeningRef.current);

    if (!recognitionRef.current) {
      console.error("Speech Recognition not available");
      return;
    }

    try {
      if (isListeningRef.current) {
        // Stop listening
        console.log("User clicked stop - stopping listening");
        recognitionRef.current.stop();
        // Don't update state here - let onend handler do it
      } else {
        // Start listening
        console.log("User clicked start - starting recognition");

        // Reset state
        setTranscript("");
        hasSpeechStartedRef.current = false;

        // Clear any pending timeout
        if (speechStartTimeoutRef.current) {
          clearTimeout(speechStartTimeoutRef.current);
          speechStartTimeoutRef.current = undefined;
        }

        // Update state before starting (this is what the user sees)
        setIsListening(true);
        isListeningRef.current = true;

        // Start recognition
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error("Error toggling recognition:", (error as Error).message);
      // Sync state if there was an error
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  // Update ref when state changes
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  if (!isSupported) {
    return (
      <div ref={containerRef} title="Speech Recognition not supported in this browser">
        <button
          disabled
          className="relative p-2 rounded-lg transition-colors text-slate-300 cursor-not-allowed"
          title="Speech Recognition not supported. Try Chrome, Edge, Safari, or Firefox"
        >
          <Mic size={24} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <button
        onClick={handleToggleListening}
        disabled={!isSupported}
        className={`relative p-2 hover:bg-slate-200 rounded-lg transition-colors ${
          isListening ? "text-red-500" : "text-slate-600"
        } hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50`}
        title={
          isListening
            ? "Stop recording"
            : isSupported
            ? "Start recording"
            : "Speech Recognition not supported"
        }
      >
        <Mic size={24} />

        {/* Sound wave pulse animation - shows when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-40 animate-ping" style={{ animationDuration: "1.5s" }} />
        )}
      </button>
    </div>
  );
}
