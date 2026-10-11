import React, { useEffect, useRef, useState } from 'react';

const RecordingVisualizerLive = ({ barsCount = 16 }) => {
    const [levels, setLevels] = useState(Array(barsCount).fill(0));
    const analyserRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        let audioCtx, analyser, source, dataArray;

        async function setup() {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;

            draw();
        }

        function draw() {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const sliceSize = Math.floor(dataArray.length / barsCount);
            const newLevels = Array.from({ length: barsCount }, (_, i) => {
                const start = i * sliceSize;
                const end = start + sliceSize;
                const avg =
                    dataArray.slice(start, end).reduce((a, b) => a + b, 0) / sliceSize;
                return avg / 255;
            });

            setLevels(newLevels);
        }

        setup();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (audioCtx) audioCtx.close();
        };
    }, [barsCount]);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                height: 24,
            }}
        >
            {levels.map((lvl, i) => (
                <div
                    key={i}
                    style={{
                        width: 3,
                        height: `${Math.max(0.2, lvl) * 100}%`,
                        background: "var(--zencom-primary-color)",
                        borderRadius: 2,
                        transition: "height 0.1s linear",
                    }}
                />
            ))}
        </div>
    );
};

export default RecordingVisualizerLive;
