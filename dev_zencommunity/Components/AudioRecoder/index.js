import React, { useState, useRef, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Icon, HStack, Text, Flex } from '@chakra-ui/react';
import { SlControlPause } from "react-icons/sl";
import { IoCloseCircleSharp, IoMicOutline, IoPlayOutline } from 'react-icons/io5';
import RecordingVisualizerLive from './RecordingVisualizerLive';
import RecordingVisualizerPlayback from './RecordingVisualizerPlayback';

function AudioAttachButton({ onAttachmentReady }) {
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioKey, setAudioKey] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const mimeRef = useRef(null);
    const audioRef = useRef(null);
    const audioUrlRef = useRef(null);

    const onAudioLoadedMetadata = () => {
        try {
            if (audioRef.current) {
                const audioDuration = audioRef.current.duration;

                if (isFinite(audioDuration) && audioDuration > 0) {
                    setDuration(audioDuration);
                } else {
                    console.warn('Invalid audio duration:', audioDuration);
                    setDuration(0);
                }
            }
        } catch (err) {
            console.error('Error loading audio metadata:', err);
            setDuration(0);
        }
    };

    const onAudioTimeUpdate = () => {
        try {
            if (audioRef.current) {
                const current = audioRef.current.currentTime;
                const dur = audioRef.current.duration;

                if (isFinite(current) && current >= 0) {
                    setCurrentTime(current);
                }

                if (isFinite(dur) && dur > 0 && duration !== dur) {
                    setDuration(dur);
                }
            }
        } catch (err) {
            console.error('Error updating audio time:', err);
        }
    };

    const onAudioEnded = () => {
        try {
            setIsPlaying(false);
            setCurrentTime(0);
        } catch (err) {
            console.error('Error handling audio end:', err);
        }
    };

    const onAudioError = (e) => {
        try {
            console.error('Audio playback error:', e);
            console.error('Audio error details:', {
                error: e.target?.error,
                code: e.target?.error?.code,
                message: e.target?.error?.message
            });
            setError('Audio playback failed');
            setIsPlaying(false);
            setDuration(0);
            setCurrentTime(0);
        } catch (err) {
            console.error('Error handling audio error:', err);
        }
    };

    const formatTime = (seconds) => {
        try {
            // Handle invalid values
            if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
                return '0:00';
            }

            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);

            // Handle very large numbers
            if (mins > 999) return '∞';

            return `${mins}:${secs.toString().padStart(2, '0')}`;
        } catch (err) {
            console.error('Error formatting time:', err);
            return '0:00';
        }
    };

    const playAudio = async () => {
        try {
            if (!audioBlob) return;

            cleanupAudioUrl();

            if (typeof URL === 'undefined' || !URL.createObjectURL) {
                setError('Audio playback not supported');
                return;
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            audioUrlRef.current = audioUrl;

            if (audioRef.current) {
                // Reset audio element
                audioRef.current.currentTime = 0;
                audioRef.current.src = audioUrl;

                // Wait for the audio to load before playing
                audioRef.current.addEventListener('loadeddata', () => { }, { once: true });

                audioRef.current.load();

                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (playError) {
                    console.error('Play failed:', playError);
                    setError('Could not play audio - ' + playError.message);
                }
            }
        } catch (err) {
            console.error('Error playing audio:', err);
            setError('Could not play audio');
        }
    };

    const checkBrowserSupport = () => {
        try {
            console.error('=== BROWSER SUPPORT CHECK ===');
            console.error('navigator:', typeof navigator !== 'undefined' && !!navigator);
            console.error('navigator.mediaDevices:', typeof navigator !== 'undefined' && !!navigator.mediaDevices);
            console.error('MediaRecorder:', typeof MediaRecorder !== 'undefined');
            console.error('Location protocol:', typeof window !== 'undefined' ? window.location?.protocol : 'undefined');
            console.error('Is secure context:', typeof window !== 'undefined' ? window.isSecureContext : 'undefined');
        } catch (err) {
            console.error('Error checking browser support:', err);
        }
    };

    const getMediaDevices = () => {
        try {
            if (typeof navigator === 'undefined') return null;

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            }

            const legacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (legacyGetUserMedia) {
                return (constraints) => {
                    return new Promise((resolve, reject) => {
                        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
                    });
                };
            }
            return null;
        } catch (err) {
            console.error('Error getting media devices:', err);
            return null;
        }
    };

    const getMimeType = () => {
        try {
            if (typeof MediaRecorder === 'undefined') return null;
            const candidates = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg; codecs=opus'
            ];
            for (const m of candidates) {
                if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
                    return m;
                }
            }
            return null;
        } catch (err) {
            console.error('Error getting MIME type:', err);
            return null;
        }
    };

    // Audio cleanup
    const cleanupAudioUrl = () => {
        try {
            if (audioUrlRef.current && typeof URL !== 'undefined' && URL.revokeObjectURL) {
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
            }
        } catch (err) {
            console.error('Error cleaning up audio URL:', err);
        }
    };

    const startRecording = async () => {
        try {
            // Clear any previous recording
            if (audioBlob) {
                setAudioBlob(null);
                cleanupAudioUrl();
            }

            setError(null);

            const getUserMedia = getMediaDevices();

            if (!getUserMedia) {
                const msg = 'Recording not supported in this browser. Please use HTTPS or a modern browser.';
                setError(msg);
                return;
            }

            const stream = await getUserMedia({ audio: true });
            streamRef.current = stream;

            const mime = getMimeType();
            mimeRef.current = mime;
            const recOpts = mime ? { mimeType: mime } : undefined;

            const rec = new MediaRecorder(stream, recOpts);
            mediaRecorderRef.current = rec;
            chunksRef.current = [];

            rec.ondataavailable = (e) => {
                try {
                    if (e.data && e.data.size > 0) {
                        chunksRef.current.push(e.data);
                    }
                } catch (err) {
                    console.error('Error handling data available:', err);
                }
            };

            rec.onstop = () => {
                try {
                    handleStop();
                } catch (err) {
                    console.error('Error in onstop handler:', err);
                }
            };

            rec.onerror = (e) => {
                try {
                    console.error('⚠ MediaRecorder error:', e);
                    const msg = 'Recording error occurred';
                    setError(msg);
                    setRecording(false);
                } catch (err) {
                    console.error('Error handling recorder error:', err);
                }
            };

            rec.start();
            setRecording(true);

        } catch (err) {
            console.error('⚠ Error in startRecording:', err);
            const msg = err?.message || 'Could not start recording';
            setError(msg);
            setRecording(false);
        }
    };

    const stopRecording = () => {
        try {
            const rec = mediaRecorderRef.current;

            if (rec && rec.state !== 'inactive') {
                rec.stop();
            }

            if (streamRef.current && streamRef.current.getTracks) {
                streamRef.current.getTracks().forEach((track) => {
                    try {
                        if (track && typeof track.stop === 'function') {
                            track.stop();
                        }
                    } catch (err) {
                        console.error('Error stopping track:', err);
                    }
                });
            }
            setRecording(false);
        } catch (err) {
            console.error('Error in stopRecording:', err);
            setRecording(false);
        }
    };

    const handleStop = () => {
        try {
            if (!chunksRef.current || chunksRef.current.length === 0) {
                console.warn('No audio data recorded');
                const msg = 'No audio data was recorded';
                setError(msg);
                return;
            }

            const blob = new Blob(chunksRef.current, {
                type: mimeRef.current || 'audio/webm'
            });
            setAudioBlob(blob);
            
            // Force a new audio element by incrementing the key
            setAudioKey(prev => prev + 1);

            const filename = `audio_${Date.now()}.webm`;
            let file;

            try {
                file = new File([blob], filename, { type: blob.type });
            } catch {
                file = blob;
                file.name = filename;
            }

            if (typeof onAttachmentReady === 'function') {
                onAttachmentReady(file);
            }

            // Cleanup for next recording
            chunksRef.current = [];
            mediaRecorderRef.current = null;
            streamRef.current = null;
            mimeRef.current = null;
        } catch (err) {
            console.error('Error in handleStop:', err);
            setError('Error processing recording');
        }
    };

    const pauseAudio = () => {
        try {
            if (audioRef.current && typeof audioRef.current.pause === 'function') {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        } catch (err) {
            console.error('Error pausing audio:', err);
        }
    };

    const onClick = async () => {
        try {
            checkBrowserSupport();

            if (recording) {
                stopRecording();
            } else {
                await startRecording();
            }
        } catch (err) {
            console.error('Error in onClick:', err);
            setError('Button click error');
        }
    };

    const handleClearSavedAudio = () => {
        try {
            setAudioBlob(null);
            cleanupAudioUrl();
            setError(null);
            setIsPlaying(false);
            setDuration(0);
            setCurrentTime(0);
            setAudioKey(prev => prev + 1);
        } catch (err) {
            console.error('Error clearing saved audio:', err);
        }
    }

    useEffect(() => {
        return () => {
            try {
                cleanupAudioUrl();
                if (streamRef.current && streamRef.current.getTracks) {
                    streamRef.current.getTracks().forEach((track) => {
                        if (track && typeof track.stop === 'function') {
                            track.stop();
                        }
                    });
                }
            } catch (err) {
                console.error('Error in cleanup:', err);
            }
        };
    }, []);

    return (
        <Flex gap={2}>
            {!audioBlob && (
                <Button
                    onClick={onClick}
                    aria-label={recording ? 'Stop recording' : 'Record audio'}
                    background={recording ? 'red' : 'transparent'}
                    padding={recording ? '0 8px' : '0px'}
                    border={'none'}
                    outline={'none'}
                    minWidth={"20px"}
                    height={"24px"}
                    isDisabled={!!error}
                >
                    <Icon size="sm" as={IoMicOutline} color={recording ? 'white' : 'var(--zencom-font-color)'} />
                </Button>
            )}

            {recording && <RecordingVisualizerLive barsCount={30} stream={streamRef?.current} />}

            {audioBlob && (
                <HStack gap="2" align="center" border="1px solid var(--zencom-border-color)" borderRadius="4px" p={1} position="relative">
                    <Button
                        onClick={isPlaying ? pauseAudio : playAudio}
                        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                        background='var(--zencom-primary-color)'
                        padding='4px'
                        size="xs"
                    >
                        {isPlaying ? <SlControlPause color='#fff' /> : <IoPlayOutline color='#fff' />}
                    </Button>

                    <Text fontSize="xs" color="gray.600" >
                        {formatTime(currentTime)}
                    </Text>

                    <RecordingVisualizerPlayback
                        key={audioKey}
                        audioElement={audioRef.current}
                        audioBlob={audioBlob}
                        barsCount={30}
                    />

                    <Text fontSize="xs" color="gray.600">
                        {formatTime(duration)}
                    </Text>

                    <Text fontSize="xs" color="gray.600">
                        {isFinite(duration) && duration > 0 ? Math.round((currentTime / duration) * 100) : 0}%
                    </Text>

                    <Button
                        size="xs"
                        aria-label={__('Stop audio', 'zencommunity')}
                        onClick={handleClearSavedAudio}
                        background='transparent'
                        padding='0px'
                        minW="auto"
                        position="absolute"
                        top="-18px"
                        right="-8px"
                    >
                        <Icon as={IoCloseCircleSharp} color={'red'} />
                    </Button>
                </HStack>
            )}

            <audio
                key={audioKey}
                ref={audioRef}
                onEnded={onAudioEnded}
                onError={onAudioError}
                onLoadedMetadata={onAudioLoadedMetadata}
                onTimeUpdate={onAudioTimeUpdate}
                onLoadStart={() => console.error('Audio load started')}
                onCanPlay={() => console.error('Audio can play')}
                onLoadedData={() => console.error('Audio data loaded')}
                style={{ display: 'none' }}
                preload="metadata"
            />
        </Flex>
    );
}

export default AudioAttachButton;
