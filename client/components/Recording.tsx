import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

interface RecordingProps {
  onTranscript?: (text: string) => void;
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
    <div ref={containerRef} className="relative">
      <button
        onClick={handleStop}
        className={`flex items-center justify-center w-14 h-14 rounded-full font-bold text-white text-sm transition-all ${
          isListening
            ? "bg-red-500 hover:bg-red-600 shadow-lg"
            : "bg-slate-400 hover:bg-slate-500"
        }`}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Mic size={20} />
          <span className="text-xs">REC</span>
        </div>
      </button>

      {/* Sound wave pulse animations */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" style={{ animationDuration: "1.5s" }} />
        </>
      )}
    </div>
  );
}
