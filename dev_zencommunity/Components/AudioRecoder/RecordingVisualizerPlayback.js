import React, { useEffect, useRef, useState } from "react";

const RecordingVisualizerPlayback = ({audioElement, audioBlob, barsCount = 32}) => {
    const [peaks, setPeaks] = useState(Array(barsCount).fill(0));
    const [levels, setLevels] = useState(Array(barsCount).fill(0));
    const rafRef = useRef();
    const ctxRef = useRef();
    const analyserRef = useRef();
    const sourceRef = useRef();

    useEffect(() => {
        if (!audioBlob) return;

        const generatePeaks = async () => {
            try {
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                const channel = audioBuffer.getChannelData(0);

                const samplesPerBar = Math.floor(channel.length / barsCount);
                const newPeaks = Array.from({ length: barsCount }, (_, i) => {
                    let max = 0;
                    const start = i * samplesPerBar;
                    const end = start + samplesPerBar;
                    for (let j = start; j < end; j++) {
                        max = Math.max(max, Math.abs(channel[j]));
                    }
                    return max; // 0–1
                });

                setPeaks(newPeaks);
                await audioCtx.close();
            } catch (error) {
                console.error('Error generating peaks:', error);
            }
        };

        generatePeaks();
    }, [audioBlob, barsCount]);

    useEffect(() => {
        if (!audioElement) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            ctxRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaElementSource(audioElement);
            sourceRef.current = source;
            
            source.connect(analyser);
            analyser.connect(audioCtx.destination);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const draw = () => {
                rafRef.current = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);
                const slice = Math.floor(dataArray.length / barsCount);
                const newLevels = Array.from({ length: barsCount }, (_, i) => {
                    const seg = dataArray.slice(i * slice, (i + 1) * slice);
                    const avg = seg.reduce((a, b) => a + b, 0) / slice;
                    return avg / 255;
                });
                setLevels(newLevels);
            };

            draw();

        } catch (error) {
            console.warn('Could not connect to Web Audio API:', error);
        }

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            
            if (sourceRef.current) {
                try {
                    sourceRef.current.disconnect();
                } catch (e) {
                    console.warn('Could not disconnect source:', e);
                }
                sourceRef.current = null;
            }
            
            if (ctxRef.current) {
                try {
                    ctxRef.current.close();
                } catch (e) {
                    console.warn('Could not close context:', e);
                }
                ctxRef.current = null;
            }
        };
    }, [audioElement, barsCount]);

    const isPlaying = audioElement?.currentTime > 0 && !audioElement?.paused;
    const barsToRender = isPlaying ? levels : peaks;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 24 }}>
            {barsToRender.map((val, i) => (
                <div
                    key={i}
                    style={{
                        width: 3,
                        height: `${Math.max(0.1, val) * 100}%`,
                        background: "var(--zencom-primary-color)",
                        borderRadius: 2,
                        transition: "height 0.1s linear"
                    }}
                />
            ))}
        </div>
    );
};

export default RecordingVisualizerPlayback;
