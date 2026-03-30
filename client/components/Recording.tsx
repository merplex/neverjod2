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

// iOS only — reads user's chosen language from Settings
function readVoiceLang(): string {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    const lang = s.voiceLang;
    if (lang === "en-US") return "en-US";
    if (lang === "auto") return navigator.language || "th-TH";
    return "th-TH";
  } catch { return "th-TH"; }
}

const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

// iOS: accumulate fields across multiple final results (SFSpeechRecognizer splits sentences)
type MergedVoiceData = { categoryId?: string; accountId?: string; amount?: number; description: string };

export default function Recording({ onTranscript, onVoiceInput, onVoiceEnd, startTrigger, stopTrigger, autoRestart }: RecordingProps) {
  const [isListening, setIsListening] = useState(false);
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
  // iOS only — accumulates best-matched fields across multiple final results
  const iosMergedRef = useRef<MergedVoiceData>({ description: "" });

  useEffect(() => { onVoiceInputRef.current = onVoiceInput; }, [onVoiceInput]);
  useEffect(() => { onVoiceEndRef.current = onVoiceEnd; }, [onVoiceEnd]);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { autoRestartRef.current = autoRestart; }, [autoRestart]);

  // Stop when stopTrigger increments
  useEffect(() => {
    if (!stopTrigger || !recognitionRef.current || !isListeningRef.current) return;
    manualStopRef.current = true;
    recognitionRef.current.stop();
  }, [stopTrigger]);

  // Auto-start when startTrigger increments
  useEffect(() => {
    if (!startTrigger || !recognitionRef.current || isListeningRef.current) return;
    try {
      hasSpeechStartedRef.current = false;
      iosMergedRef.current = { description: "" };
      setIsListening(true);
      isListeningRef.current = true;
      try { recognitionRef.current.start(); } catch {
        setIsListening(false);
        isListeningRef.current = false;
      }
    } catch {
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

    // extended=true adds 2s extra when a number was just detected (large numbers take longer to say)
    const resetSilenceTimer = (extended = false) => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      const delay = readSilenceDelay() + (extended ? 2000 : 0);
      silenceTimeoutRef.current = setTimeout(() => {
        if (isListeningRef.current && hasSpeechStartedRef.current) {
          hasSpeechStartedRef.current = false;
          if (onVoiceEndRef.current) onVoiceEndRef.current();
        }
      }, delay);
    };

    // ── Language ─────────────────────────────────────────────────────────────
    // iOS: user can pick language in Settings (th-TH / en-US / auto)
    // Android: always th-TH — Chrome Android handles mixed-language in a single session
    const lang = isIOSDevice ? readVoiceLang() : "th-TH";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      console.log("[voice] started, platform:", isIOSDevice ? "iOS" : "Android");
      hasSpeechStartedRef.current = false;
      iosMergedRef.current = { description: "" };
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const isFinal = event.results[i].isFinal;
        const transcriptPart = event.results[i][0].transcript;

        if (isIOSDevice) {
          // ── iOS Early Exit: process interim results too ──
          // Parse interim to accumulate keywords as soon as they appear
          hasSpeechStartedRef.current = true;
          const voiceData = parseVoiceInput(transcriptPart);

          const merged: MergedVoiceData = {
            description: transcriptPart,
            accountId:   voiceData.accountId  ?? iosMergedRef.current.accountId,
            categoryId:  voiceData.categoryId ?? iosMergedRef.current.categoryId,
            amount:      voiceData.amount     ?? iosMergedRef.current.amount,
          };
          iosMergedRef.current = merged;

          if (onTranscriptRef.current) onTranscriptRef.current(transcriptPart);
          if (onVoiceInputRef.current) onVoiceInputRef.current({ ...merged });

          // Early exit: all 3 keywords found → stop immediately, no need to wait for isFinal
          if (merged.categoryId && merged.accountId && merged.amount) {
            console.log("[voice] iOS early exit — all keywords found:", merged);
            manualStopRef.current = true;
            recognition.stop();
            if (onVoiceEndRef.current) onVoiceEndRef.current();
            return;
          }

          if (isFinal) {
            console.log("[voice] iOS final:", transcriptPart);
            resetSilenceTimer(!!merged.amount);
          }
        } else {
          // ── Android: unchanged — process final results only ──
          if (!isFinal) continue;
          console.log("[voice] final:", transcriptPart);
          hasSpeechStartedRef.current = true;
          if (onTranscriptRef.current) onTranscriptRef.current(transcriptPart);
          const voiceData = parseVoiceInput(transcriptPart);
          console.log("[voice] Android data:", voiceData);
          if (onVoiceInputRef.current) onVoiceInputRef.current(voiceData);
          resetSilenceTimer(!!voiceData.amount);
        }
      }
    };

    recognition.onend = () => {
      console.log("[voice] ended");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = undefined;
      }

      const hadSpeech = hasSpeechStartedRef.current;
      hasSpeechStartedRef.current = false;

      if (hadSpeech && onVoiceEndRef.current) onVoiceEndRef.current();

      if (isListeningRef.current && !manualStopRef.current && autoRestartRef.current) {
        try { recognition.start(); return; } catch (e) {
          console.error("[voice] auto-restart failed:", e);
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
      console.error("[voice] error:", event.error);
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;

    const handleBlur = () => {
      if (isListeningRef.current && recognition) {
        manualStopRef.current = true;
        recognition.stop();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isListeningRef.current && recognition) {
        manualStopRef.current = true;
        recognition.stop();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      manualStopRef.current = true;
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (recognition) recognition.stop();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;

    try {
      if (isListeningRef.current) {
        manualStopRef.current = true;
        recognitionRef.current.stop();
      } else {
        hasSpeechStartedRef.current = false;
        iosMergedRef.current = { description: "" };

        if (speechStartTimeoutRef.current) {
          clearTimeout(speechStartTimeoutRef.current);
          speechStartTimeoutRef.current = undefined;
        }

        setIsListening(true);
        isListeningRef.current = true;

        const doStart = () => {
          try { recognitionRef.current.start(); } catch (e) {
            console.error("[voice] start failed:", (e as Error).message);
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        if (isIOSDevice) {
          // iOS: call start() directly — getUserMedia breaks gesture context in WKWebView
          doStart();
        } else {
          // Android: pre-grant mic permission before starting recognition
          if (navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => { stream.getTracks().forEach(t => t.stop()); doStart(); })
              .catch(err => {
                console.error("[voice] mic denied:", err.name);
                setIsListening(false);
                isListeningRef.current = false;
              });
          } else {
            doStart();
          }
        }
      }
    } catch (error) {
      console.error("[voice] toggle error:", (error as Error).message);
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  if (!isSupported) {
    return (
      <div ref={containerRef}>
        <button disabled className="relative p-2 rounded-lg text-slate-300 cursor-not-allowed">
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
        title={isListening ? "Stop recording" : "Start recording"}
      >
        <Mic size={24} />
        {isListening && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500 opacity-40 animate-ping" style={{ animationDuration: "1.5s" }} />
        )}
      </button>
    </div>
  );
}
