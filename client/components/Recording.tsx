import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { parseVoiceInput } from "../utils/keywordMatch";
import { muteBeep, unmuteBeep } from "../utils/audioHelper";

interface RecordingProps {
  onTranscript?: (text: string) => void;
  onVoiceInput?: (data: { categoryId?: string; accountId?: string; amount?: number; description: string }) => void;
  onVoiceEnd?: () => void;
  startTrigger?: number;
  stopTrigger?: number;
  autoRestart?: boolean;
}

function readSilenceDelay(): number {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    return typeof s.voiceInputDelay === "number" ? s.voiceInputDelay * 1000 : 3500;
  } catch { return 3500; }
}


export default function Recording({ onTranscript, onVoiceInput, onVoiceEnd, startTrigger, stopTrigger, autoRestart }: RecordingProps) {
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
  const autoRestartRef = useRef(autoRestart);
  const manualStopRef = useRef(false);
  const processedResultIndicesRef = useRef<Set<number>>(new Set());

  // Keep refs up-to-date without re-initializing recognition
  useEffect(() => { onVoiceInputRef.current = onVoiceInput; }, [onVoiceInput]);
  useEffect(() => { onVoiceEndRef.current = onVoiceEnd; }, [onVoiceEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { autoRestartRef.current = autoRestart; }, [autoRestart]);

  // Stop when stopTrigger increments (e.g. when all 3 detected)
  useEffect(() => {
    if (!stopTrigger || !recognitionRef.current || !isListeningRef.current) return;
    manualStopRef.current = true;
    recognitionRef.current.stop();
  }, [stopTrigger]);

  // Auto-start when trigger increments (e.g. when category page becomes active)
  useEffect(() => {
    if (!startTrigger || !recognitionRef.current || isListeningRef.current) return;
    try {
      setTranscript("");
      hasSpeechStartedRef.current = false;
      setIsListening(true);
      isListeningRef.current = true;
      muteBeep().catch(() => {}); // fire-and-forget — don't block start
      try { recognitionRef.current.start(); }
      catch (e) {
        setIsListening(false);
        isListeningRef.current = false;
      }
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
      processedResultIndicesRef.current.clear();
      unmuteBeep(); // restore volume after recognition has started
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

          // After silence delay, call onVoiceEnd without stopping recognition
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current && hasSpeechStartedRef.current) {
              hasSpeechStartedRef.current = false;
              if (onVoiceEndRef.current) onVoiceEndRef.current();
            }
          }, readSilenceDelay());
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

      const hadSpeech = hasSpeechStartedRef.current;
      hasSpeechStartedRef.current = false;

      // Call onVoiceEnd callback when speech ends (if speech was detected)
      if (hadSpeech && onVoiceEndRef.current) {
        console.log("Calling onVoiceEnd callback");
        onVoiceEndRef.current();
      }

      // Auto-restart if: was listening, not manually stopped, autoRestart enabled
      if (isListeningRef.current && !manualStopRef.current && autoRestartRef.current) {
        muteBeep().catch(() => {}); // fire-and-forget
        try {
          recognition.start();
          return; // keep isListening = true, don't reset UI
        } catch (e) {
          console.error("Auto-restart failed:", e);
        }
      }

      manualStopRef.current = false;

      // Reset state to match reality - listening has stopped
      if (isListeningRef.current) {
        console.log("Syncing UI state - recognition ended");
        setIsListening(false);
        isListeningRef.current = false;
      }
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
        unmuteBeep(); // restore volume before stopping (in case muteBeep was called but onstart not yet fired)
        recognition.stop();
      }
    };

    window.addEventListener("blur", handleBlur);

    // Cleanup — prevent auto-restart after unmount
    return () => {
      manualStopRef.current = true;
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
        // Stop listening — mark as manual so auto-restart won't trigger
        console.log("User clicked stop - stopping listening");
        manualStopRef.current = true;
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

        const doStart = () => {
          muteBeep().catch(() => {});
          try { recognitionRef.current.start(); }
          catch (e) {
            console.error("recognition.start() threw:", (e as Error).message);
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        // On iOS native, SpeechRecognition handles mic permission itself.
        // getUserMedia async breaks the gesture context on iOS WKWebView.
        // On Android Capacitor, getUserMedia is needed to pre-grant mic before recognition.start().
        const isIOSNative = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
          !(window as any).MSStream;
        if (!isIOSNative && navigator.mediaDevices?.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => { stream.getTracks().forEach(t => t.stop()); doStart(); })
            .catch(err => {
              console.error("Mic permission denied:", err.name);
              setIsListening(false);
              isListeningRef.current = false;
            });
        } else {
          doStart();
        }
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
    <div ref={containerRef} className="relative z-10">
      <button
        onClick={handleToggleListening}
        disabled={!isSupported}
        className={`relative p-2 rounded-lg transition-colors focus:outline-none focus:bg-transparent ${
          isListening ? "text-red-500 bg-red-50" : "text-slate-600 active:bg-slate-200"
        } disabled:cursor-not-allowed disabled:opacity-50`}
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
