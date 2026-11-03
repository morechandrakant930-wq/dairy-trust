
import React, { useState, useRef, useEffect } from 'react';
import './DairyAIAssistant.css';

const API_URL = 'http://localhost:5000/api/ai-assistant/chat';

const languageNames = {
    en: 'English',
    mr: 'मराठी',
    hi: 'हिंदी',
    gu: 'ગુજરાતી',
    kn: 'ಕನ್ನಡ',
};

const speechLanguages = {
    en: 'en-IN',
    mr: 'mr-IN',
    hi: 'hi-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
};

export default function DairyAIAssistant() {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [language, setLanguage] = useState(
        localStorage.getItem('dairyLanguage') || 'en'
    );

    const [listening, setListening] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);

    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const voiceEnabledRef = useRef(true);

    useEffect(() => {
        voiceEnabledRef.current = voiceEnabled;
    }, [voiceEnabled]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
        });
    }, [messages, loading]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            window.speechSynthesis?.cancel();
        };
    }, []);


    const speakText = (text) => {
        if (!voiceEnabledRef.current || !text) return;

        if (!window.speechSynthesis) {
            console.error('Speech Synthesis is not supported.');
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const speechLocales = {
            en: 'en-IN',
            mr: 'mr-IN',
            hi: 'hi-IN',
            gu: 'gu-IN',
            kn: 'kn-IN',
        };

        const selectedLocale = speechLocales[language] || 'en-IN';
        utterance.lang = selectedLocale;
        utterance.rate = 0.9;
        utterance.pitch = 1;

        const selectVoice = () => {
            const voices = window.speechSynthesis.getVoices();

            const voice =
                voices.find(v => v.lang.toLowerCase() === selectedLocale.toLowerCase()) ||
                voices.find(v => v.lang.toLowerCase().startsWith(language + '-')) ||
                voices.find(v => v.lang.toLowerCase().startsWith(language));

            if (voice) {
                utterance.voice = voice;
                console.log('Selected speech voice:', voice.name, voice.lang);
            } else {
                console.warn('No voice found for:', selectedLocale);
            }

            window.speechSynthesis.speak(utterance);
        };

        const voices = window.speechSynthesis.getVoices();

        if (voices.length > 0) {
            selectVoice();
        } else {
            window.speechSynthesis.onvoiceschanged = selectVoice;
        }
    };

    const askAI = async (userMessage) => {
        if (!userMessage.trim() || loading) return;

        const updatedMessages = [
            ...messages,
            { role: 'user', text: userMessage },
        ];

        setMessages(updatedMessages);
        setMessage('');
        setLoading(true);

        try {
            const token = localStorage.getItem('dairyToken');

            if (!token) {
                throw new Error('Please login first.');
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: userMessage,
                    language,
                    history: messages.slice(-6),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'AI request failed.');
            }

            if (!data.reply?.trim()) {
                throw new Error('AI returned an empty response.');
            }

            const aiReply = data.reply.trim();

            setMessages([
                ...updatedMessages,
                { role: 'model', text: aiReply },
            ]);

            speakText(aiReply);

        } catch (error) {
            console.error('Dairy AI Error:', error);

            setMessages([
                ...updatedMessages,
                {
                    role: 'model',
                    text: `⚠️ ${error.message || 'AI Assistant unavailable.'}`,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        askAI(message);
    };

    const startListening = () => {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                'Voice input is not supported. Please use Google Chrome.'
            );
            return;
        }

        if (loading || listening) return;

        window.speechSynthesis?.cancel();
        setSpeaking(false);

        const recognition = new SpeechRecognition();

        recognition.lang = speechLanguages[language] || 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognitionRef.current = recognition;

        let finalTranscript = '';

        recognition.onstart = () => {
            setListening(true);
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            setMessage(
                (finalTranscript + interimTranscript).trim()
            );
        };

        recognition.onerror = (event) => {
            console.error('Voice Recognition Error:', event.error);

            if (event.error === 'not-allowed') {
                alert('Please allow microphone permission.');
            } else if (event.error !== 'no-speech') {
                alert('Voice input failed. Please try again.');
            }
        };

        recognition.onend = () => {
            setListening(false);

            const spokenMessage = finalTranscript.trim();

            if (spokenMessage) {
                setMessage('');
                askAI(spokenMessage);
            }
        };

        try {
            recognition.start();
        } catch (error) {
            console.error(error);
            setListening(false);
        }
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
    };

    const changeLanguage = (e) => {
        const selected = e.target.value;

        setLanguage(selected);
        localStorage.setItem('dairyLanguage', selected);

        window.speechSynthesis?.cancel();
        setSpeaking(false);
    };

    const toggleVoice = () => {
        setVoiceEnabled((previous) => {
            if (previous) {
                window.speechSynthesis?.cancel();
                setSpeaking(false);
            }

            return !previous;
        });
    };

    return (
        <>
            <button
                className="dairy-ai-toggle"
                onClick={() => setOpen(!open)}
                type="button"
            >
                {open ? '✕' : '🤖'}
            </button>

            {open && (
                <div className="dairy-ai-box">

                    <div className="dairy-ai-header">
                        <div>
                            <h3>🤖 Dairy AI Assistant</h3>
                            <small>Text & Voice Assistant 🎙️</small>
                        </div>

                        <select
                            value={language}
                            onChange={changeLanguage}
                            disabled={loading || listening}
                        >
                            {Object.entries(languageNames).map(
                                ([code, name]) => (
                                    <option key={code} value={code}>
                                        {name}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="dairy-ai-messages">

                        {messages.length === 0 && (
                            <div className="dairy-ai-welcome">
                                <h4>नमस्कार! 👋</h4>
                                <p>
                                    मी Dairy AI Assistant आहे.
                                    तुम्ही मला बोलून किंवा लिहून प्रश्न विचारू शकता.
                                </p>
                            </div>
                        )}

                        {messages.map((item, index) => (
                            <div
                                key={index}
                                className={`dairy-ai-message ${item.role === 'user' ? 'user' : 'bot'
                                    }`}
                            >
                                {item.text}
                            </div>
                        ))}

                        {loading && (
                            <div className="dairy-ai-message bot">
                                Thinking... ⏳
                            </div>
                        )}

                        {listening && (
                            <div className="dairy-ai-message bot">
                                🎙️ ऐकत आहे... बोला.
                            </div>
                        )}

                        <div ref={messagesEndRef} />

                    </div>

                    <div className="dairy-ai-voice-controls">

                        <button
                            type="button"
                            onClick={listening ? stopListening : startListening}
                            disabled={loading}
                            className={listening ? 'voice-active' : ''}
                        >
                            {listening ? '⏹️ Stop' : '🎙️ Speak'}
                        </button>

                        <button
                            type="button"
                            onClick={toggleVoice}
                        >
                            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
                        </button>

                        {speaking && (
                            <span>🔊 Speaking...</span>
                        )}

                    </div>

                    <form
                        onSubmit={sendMessage}
                        className="dairy-ai-input"
                    >
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type or speak your message..."
                            disabled={loading || listening}
                        />

                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                        >
                            ➤
                        </button>
                    </form>

                </div>
            )}
        </>
    );
}
