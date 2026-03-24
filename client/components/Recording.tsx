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
    }
  };

  // Listen for any button clicks to stop recording
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if clicked element is a button or inside a button
      if (target.tagName === "BUTTON" || target.closest("button")) {
        if (isListening) {
          handleStop();
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [isListening]);

  return (
    <div ref={containerRef} className="fixed top-6 right-6 z-50">
      <button
        onClick={handleStop}
        className={`flex items-center justify-center w-16 h-16 rounded-full font-bold text-white text-sm transition-all ${
          isListening
            ? "bg-red-500 hover:bg-red-600 shadow-2xl"
            : "bg-slate-400 hover:bg-slate-500"
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <Mic size={24} />
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
