import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Mic, Square, Play, Pause, Save, Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const App = () => {
  const [appState, setAppState] = useState('idle'); // idle, recording, processing, result, saved
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (appState === 'recording' && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [appState, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setRecordingBlob(blob);
        processAudio(blob);
      };

      mediaRecorderRef.current.start();
      setAppState('recording');
      setIsPaused(false);
      setTimer(0);
      setError(null);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
      console.error(err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (blob) => {
    setAppState('processing');
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');

    try {
      // Using /process-audio to get both transcript and RAG response
      const response = await axios.post(`${API_BASE_URL}/process-audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Defaulting to transcript for editing, but we could also show the rag_response
      setTranscript(response.data.transcript || '');
      setAppState('result');
    } catch (err) {
      setError('Failed to process audio. Please try again.');
      setAppState('idle');
      console.error(err);
    }
  };

  const handleSave = () => {
    setAppState('saved');
    // In a real app, this would send the edited transcript back to the server
    setTimeout(() => setAppState('result'), 3000); // Back to result after showing saved
  };

  const reset = () => {
    setAppState('idle');
    setTranscript('');
    setTimer(0);
    setError(null);
  };

  return (
    <div className="container fade-in">
      <header>
        <h1>MedScribe PoC</h1>
        <p className="subtitle">Intelligent Medical Transcription & Analysis</p>
      </header>

      <main className="glass-card">
        {/* Error Banner */}
        {error && (
          <div className="error-banner" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {appState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={40} color="var(--accent-primary)" />
              </div>
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Ready to Record</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Start your consultation. We'll handle the transcription and analysis.</p>
            <button className="btn btn-primary" onClick={startRecording}>
              <Mic size={20} /> Start Recording
            </button>
          </div>
        )}

        {appState === 'recording' && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="pulse" />
              <span style={{ fontSize: '3rem', fontWeight: '700', fontFamily: 'monospace' }}>{formatTime(timer)}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: '600', letterSpacing: '0.1em' }}>
                {isPaused ? 'RECORDING PAUSED' : 'RECORDING LIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              {isPaused ? (
                <button className="btn btn-secondary" onClick={resumeRecording}>
                  <Play size={20} /> Resume
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={pauseRecording}>
                  <Pause size={20} /> Pause
                </button>
              )}
              <button className="btn btn-primary" style={{ background: 'var(--error)', color: '#fff' }} onClick={stopRecording}>
                <Square size={20} /> Stop & Process
              </button>
            </div>
          </div>
        )}

        {appState === 'processing' && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="loader" style={{ marginBottom: '2rem' }} />
            <h2>Processing Consultation</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Transcribing audio and generating clinical summary...</p>
          </div>
        )}

        {(appState === 'result' || appState === 'saved') && (
          <div className="editor-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 color="var(--success)" size={24} />
                <h3 style={{ fontSize: '1.5rem' }}>Transcription Result</h3>
              </div>
              <button className="btn btn-secondary" onClick={reset}>
                <RotateCcw size={18} /> New Recording
              </button>
            </div>
            
            <textarea 
              className="editor"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcription content will appear here..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
              {appState === 'saved' && (
                <span className="fade-in" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                  <CheckCircle2 size={18} /> Saved successfully
                </span>
              )}
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={appState === 'saved'}
              >
                <Save size={20} /> Confirm & Save
              </button>
            </div>
          </div>
        )}
      </main>
      
      <footer style={{ marginTop: 'auto', padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        &copy; 2026 MedScribe AI. Professional Proof of Concept.
      </footer>
    </div>
  );
};

export default App;
