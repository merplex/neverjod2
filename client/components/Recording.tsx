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
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const speechStartTimeoutRef = useRef<NodeJS.Timeout>();
  const hasSpeechStartedRef = useRef(false);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.log("Speech Recognition not supported");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => {
      hasSpeechStartedRef.current = false;

      // Set 4-second timeout for initial speech detection
      speechStartTimeoutRef.current = setTimeout(() => {
        // If no speech detected within 4 seconds, reset and restart listening
        if (!hasSpeechStartedRef.current && recognitionRef.current) {
          recognitionRef.current.abort();
          recognitionRef.current.start();
        }
      }, 4000);
    };

    recognitionRef.current.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
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
            onVoiceInput(voiceData);
          }
        } else {
          interim += transcriptPart;
        }
      }
    };

    recognitionRef.current.onend = () => {
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

    recognitionRef.current.onerror = (event: any) => {
      console.log("Speech recognition error:", event.error);
    };

    // Don't start automatically - wait for user to click the button
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onVoiceInput, onVoiceEnd]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      console.warn("Speech Recognition not available");
      return;
    }

    if (isListeningRef.current) {
      // Stop listening
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
    } else {
      // Start listening
      setTranscript("");
      hasSpeechStartedRef.current = false;
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
    }
  };

  // Update ref when state changes
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  return (
    <div ref={containerRef}>
      <button
        onClick={handleToggleListening}
        className={`relative p-2 hover:bg-slate-200 rounded-lg transition-colors ${
          isListening ? "text-red-500" : "text-slate-600"
        } hover:text-slate-900`}
        title={isListening ? "Stop recording" : "Start recording"}
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
