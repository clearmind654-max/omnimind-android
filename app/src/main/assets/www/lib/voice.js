/**
 * OmniMind Full-Duplex Native Voice Controller
 */

export class VoiceController {
    constructor(onStateChange = () => {}) {
        this.state = 'IDLE'; // IDLE, LISTENING, THINKING, SPEAKING
        this.onStateChange = onStateChange;
        this.currentLanguage = 'en-US';
    }

    setState(newState) {
        this.state = newState;
        this.onStateChange(this.state);
    }

    startListening() {
        this.setState('LISTENING');
        if (window.AndroidNative && typeof window.AndroidNative.startSpeechToText === 'function') {
            window.AndroidNative.startSpeechToText();
        }
    }

    speak(text, languageCode = 'en') {
        this.setState('SPEAKING');
        if (window.AndroidNative && typeof window.AndroidNative.speakNativeText === 'function') {
            window.AndroidNative.speakNativeText(text, languageCode);
        } else if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageCode;
            utterance.onend = () => this.setState('IDLE');
            window.speechSynthesis.speak(utterance);
        } else {
            setTimeout(() => this.setState('IDLE'), 2000);
        }
    }

    stopSpeaking() {
        if (window.AndroidNative && typeof window.AndroidNative.stopNativeSpeech === 'function') {
            window.AndroidNative.stopNativeSpeech();
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.setState('IDLE');
    }
}
