import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { parseVoiceInput } from "../utils/keywordMatch";

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

function readVoiceLang(): string {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    const lang = s.voiceLang;
    if (lang === "en-US") return "en-US";
    if (lang === "auto") return navigator.language || "th-TH";
    return "th-TH";
  } catch { return "th-TH"; }
}

type MergedVoiceData = { categoryId?: string; accountId?: string; amount?: number; description: string };

export default function Recording({ onTranscript, onVoiceInput, onVoiceEnd, startTrigger, stopTrigger, autoRestart }: RecordingProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const recognition2Ref = useRef<any>(null);
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
  // Accumulates best-matched fields from BOTH recognitions for the current phrase
  const mergedVoiceDataRef = useRef<MergedVoiceData>({ description: "" });

  useEffect(() => { onVoiceInputRef.current = onVoiceInput; }, [onVoiceInput]);
  useEffect(() => { onVoiceEndRef.current = onVoiceEnd; }, [onVoiceEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { autoRestartRef.current = autoRestart; }, [autoRestart]);

  // Stop when stopTrigger increments
  useEffect(() => {
    if (!stopTrigger || !recognitionRef.current || !isListeningRef.current) return;
    manualStopRef.current = true;
    recognitionRef.current.stop();
    try { recognition2Ref.current?.stop(); } catch {}
  }, [stopTrigger]);

  // Auto-start when startTrigger increments
  useEffect(() => {
    if (!startTrigger || !recognitionRef.current || isListeningRef.current) return;
    try {
      setTranscript("");
      hasSpeechStartedRef.current = false;
      mergedVoiceDataRef.current = { description: "" };
      setIsListening(true);
      isListeningRef.current = true;
      try { recognitionRef.current.start(); } catch (e) {
        setIsListening(false);
        isListeningRef.current = false;
      }
      try { recognition2Ref.current?.start(); } catch {}
    } catch (e) {
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [startTrigger]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // ── Shared silence-timeout helper ────────────────────────────────────────
    const resetSilenceTimer = () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (isListeningRef.current && hasSpeechStartedRef.current) {
          hasSpeechStartedRef.current = false;
          if (onVoiceEndRef.current) onVoiceEndRef.current();
        }
      }, readSilenceDelay());
    };

    // ── Primary recognition (user's chosen lang, default th-TH) ─────────────
    const primaryLang = readVoiceLang();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = primaryLang;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      hasSpeechStartedRef.current = false;
      processedResultIndicesRef.current.clear();
      mergedVoiceDataRef.current = { description: "" };
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          console.log("Final transcript:", transcriptPart);
          hasSpeechStartedRef.current = true;

          setTranscript((prev) => prev + transcriptPart + " ");
          if (onTranscriptRef.current) onTranscriptRef.current(transcriptPart);

          const voiceData = parseVoiceInput(transcriptPart);
          // Merge: primary sets description; fills fields not yet matched
          mergedVoiceDataRef.current = {
            description: transcriptPart,
            accountId:   voiceData.accountId  ?? mergedVoiceDataRef.current.accountId,
            categoryId:  voiceData.categoryId ?? mergedVoiceDataRef.current.categoryId,
            amount:      voiceData.amount     ?? mergedVoiceDataRef.current.amount,
          };
          console.log("Voice data:", mergedVoiceDataRef.current);
          if (onVoiceInputRef.current) onVoiceInputRef.current({ ...mergedVoiceDataRef.current });

          resetSilenceTimer();
        }
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = undefined;
      }

      const hadSpeech = hasSpeechStartedRef.current;
      hasSpeechStartedRef.current = false;

      if (hadSpeech && onVoiceEndRef.current) onVoiceEndRef.current();

      if (isListeningRef.current && !manualStopRef.current && autoRestartRef.current) {
        try {
          recognition.start();
          try { recognition2Ref.current?.start(); } catch {}
          return;
        } catch (e) {
          console.error("Auto-restart failed:", e);
        }
      }

      manualStopRef.current = false;

      if (isListeningRef.current) {
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

    // ── Secondary recognition (complementary lang for mixed-language input) ──
    // Disabled on iOS — running two SpeechRecognition instances competes for the same
    // SFSpeechRecognizer resource and slows down primary recognition noticeably.
    // iOS users can work around English keywords by using the "English" voice lang setting.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const secondaryLang = primaryLang === "en-US" ? "th-TH" : "en-US";
    try {
      if (isIOS) throw new Error("secondary disabled on iOS");
      const recognition2 = new SpeechRecognition();
      recognition2.continuous = true;
      recognition2.interimResults = false; // Only final results needed
      recognition2.lang = secondaryLang;

      recognition2.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) continue;
          const text = event.results[i][0].transcript;
          const data = parseVoiceInput(text);
          const prev = mergedVoiceDataRef.current;
          let changed = false;
          const next: MergedVoiceData = { ...prev };
          // Only fill fields the primary missed
          if (data.accountId  && !prev.accountId)  { next.accountId  = data.accountId;  changed = true; }
          if (data.categoryId && !prev.categoryId) { next.categoryId = data.categoryId; changed = true; }
          if (data.amount     && !prev.amount)     { next.amount     = data.amount;     changed = true; }
          if (changed) {
            mergedVoiceDataRef.current = next;
            console.log("Voice data (secondary merge):", next);
            if (onVoiceInputRef.current) onVoiceInputRef.current({ ...next });
            resetSilenceTimer();
          }
        }
      };

      recognition2.onerror = () => {}; // Silently ignore secondary errors

      recognition2.onend = () => {
        // Auto-restart secondary when primary is still listening
        if (isListeningRef.current && !manualStopRef.current) {
          try { recognition2.start(); } catch {}
        }
      };

      recognition2Ref.current = recognition2;
    } catch {
      // Secondary recognition not supported — fall back to primary only
    }

    // ── App focus/visibility handlers ────────────────────────────────────────
    const handleBlur = () => {
      if (isListeningRef.current && recognition) {
        console.log("App lost focus, stopping recording");
        manualStopRef.current = true;
        recognition.stop();
        try { recognition2Ref.current?.stop(); } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (isListeningRef.current && recognition) {
          manualStopRef.current = true;
          recognition.stop();
          try { recognition2Ref.current?.stop(); } catch {}
        }
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      manualStopRef.current = true;
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (recognition) recognition.stop();
      try { recognition2Ref.current?.stop(); } catch {}
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const handleToggleListening = () => {
    console.log("Toggle clicked, listening:", isListeningRef.current);

    if (!recognitionRef.current) {
      console.error("Speech Recognition not available");
      return;
    }

    try {
      if (isListeningRef.current) {
        console.log("User clicked stop - stopping listening");
        manualStopRef.current = true;
        recognitionRef.current.stop();
        try { recognition2Ref.current?.stop(); } catch {}
      } else {
        console.log("User clicked start - starting recognition");

        setTranscript("");
        hasSpeechStartedRef.current = false;
        mergedVoiceDataRef.current = { description: "" };

        if (speechStartTimeoutRef.current) {
          clearTimeout(speechStartTimeoutRef.current);
          speechStartTimeoutRef.current = undefined;
        }

        setIsListening(true);
        isListeningRef.current = true;

        const doStart = () => {
          try { recognitionRef.current.start(); }
          catch (e) {
            console.error("recognition.start() threw:", (e as Error).message);
            setIsListening(false);
            isListeningRef.current = false;
            return;
          }
          // Start secondary after a brief delay to avoid simultaneous mic contention on iOS
          setTimeout(() => {
            try { recognition2Ref.current?.start(); } catch {}
          }, 200);
        };

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
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

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
        title={isListening ? "Stop recording" : isSupported ? "Start recording" : "Speech Recognition not supported"}
      >
        <Mic size={24} />
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-40 animate-ping" style={{ animationDuration: "1.5s" }} />
        )}
      </button>
    </div>
  );
}
