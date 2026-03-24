import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { parseVoiceInput } from "../utils/keywordMatch";

interface RecordingProps {
  onTranscript?: (text: string) => void;
  onVoiceInput?: (data: { categoryId?: string; accountId?: string; amount?: number; description: string }) => void;
}

export default function Recording({ onTranscript }: RecordingProps) {
  const [isListening, setIsListening] = useState(true);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(true);

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
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognitionRef.current.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
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
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current.onerror = (event: any) => {
      console.log("Speech recognition error:", event.error);
    };

    // Start listening on mount
    recognitionRef.current.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  // Update ref when state changes
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Listen for any button clicks to stop recording
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest("button");

      // Don't stop if clicking the recording button itself
      if (button === containerRef.current?.querySelector("button")) {
        return;
      }

      // Check if clicked element is a button or inside a button
      if (target.tagName === "BUTTON" || button) {
        if (isListeningRef.current) {
          handleStop();
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  return (
    <div ref={containerRef}>
      <button
        onClick={handleStop}
        className={`relative p-2 hover:bg-slate-200 rounded-lg transition-colors ${
          isListening ? "text-red-500" : "text-slate-600"
        } hover:text-slate-900`}
      >
        <Mic size={24} />

        {/* Sound wave pulse animation - small version */}
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-40 animate-ping" style={{ animationDuration: "1.5s" }} />
        )}
      </button>
    </div>
  );
}
