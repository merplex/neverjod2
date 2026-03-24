import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { parseVoiceInput } from "../utils/keywordMatch";

interface RecordingProps {
  onTranscript?: (text: string) => void;
  onVoiceInput?: (data: { categoryId?: string; accountId?: string; amount?: number; description: string }) => void;
  onVoiceEnd?: () => void;
}

export default function Recording({ onTranscript, onVoiceInput, onVoiceEnd }: RecordingProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const speechStartTimeoutRef = useRef<NodeJS.Timeout>();
  const hasSpeechStartedRef = useRef(false);

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
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Speech recognition started");
      hasSpeechStartedRef.current = false;

      // Set 4-second timeout for initial speech detection
      speechStartTimeoutRef.current = setTimeout(() => {
        // If no speech detected within 4 seconds, reset and restart listening
        if (!hasSpeechStartedRef.current && recognition) {
          console.log("No speech detected, restarting...");
          recognition.abort();
          setTimeout(() => recognition.start(), 100);
        }
      }, 4000);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          console.log("Final transcript:", transcriptPart);
          // Mark that speech has started
          hasSpeechStartedRef.current = true;

          // Clear the initial 4-second timeout when speech is detected
          if (speechStartTimeoutRef.current) {
            clearTimeout(speechStartTimeoutRef.current);
            speechStartTimeoutRef.current = undefined;
          }

          setTranscript((prev) => prev + transcriptPart + " ");
          if (onTranscript) {
            onTranscript(transcriptPart);
          }

          // Parse voice input for category, account, and amount
          const voiceData = parseVoiceInput(transcriptPart);
          if (onVoiceInput && (voiceData.categoryId || voiceData.accountId || voiceData.amount)) {
            console.log("Voice data detected:", voiceData);
            onVoiceInput(voiceData);
          }
        } else {
          interim += transcriptPart;
        }
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      // Call onVoiceEnd when speech ends
      if (hasSpeechStartedRef.current && onVoiceEnd) {
        onVoiceEnd();
      }

      // Clear timeout on end
      if (speechStartTimeoutRef.current) {
        clearTimeout(speechStartTimeoutRef.current);
      }

      hasSpeechStartedRef.current = false;
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [onVoiceInput, onVoiceEnd]);

  const handleToggleListening = () => {
    console.log("Toggle clicked, recognition available:", !!recognitionRef.current);

    if (!recognitionRef.current) {
      console.error("Speech Recognition not available");
      return;
    }

    if (isListeningRef.current) {
      // Stop listening
      console.log("Stopping listening...");
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
    } else {
      // Start listening
      console.log("Starting listening...");
      setTranscript("");
      hasSpeechStartedRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
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
