import Tone from "tone";
import { AudioWorkletNode } from "standardized-audio-context";
import { getContext, Synth } from "tone";

import byteStepProcessor from "worklet-loader!./byteStepProcessor.js";
import frequencyArrayProcessor from "worklet-loader!./frequencyArrayProcessor.js";

const _ = {
    async resampleAudioBuffer(audioBuffer, targetSampleRate) {
        const sourceSampleRate = audioBuffer.sampleRate;
        const ratio = sourceSampleRate / targetSampleRate;
        const newLength = Math.round(audioBuffer.length / ratio);
        const numberOfChannels = audioBuffer.numberOfChannels;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: targetSampleRate,
        });

        let newBuffer = audioCtx.createBuffer(numberOfChannels, newLength, targetSampleRate);

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const oldData = audioBuffer.getChannelData(channel);
            const newData = newBuffer.getChannelData(channel);

            for (let i = 0; i < newLength; i++) {
                const nearestSampleIndex = Math.round(i * ratio);
                newData[i] = oldData[nearestSampleIndex];
            }
        }

        return newBuffer;
    },

    async decodeAndResampleAudio(arrayBuffer, targetSampleRate = 44100) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: targetSampleRate,
        });

        try {
            let audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            if (audioBuffer.sampleRate !== targetSampleRate) {
                console.log(`Resampling from ${audioBuffer.sampleRate} to ${targetSampleRate}`);
            }

            return audioBuffer;
        } catch (error) {
            console.error('Error decoding audio data:', error);
        }
    },

    audioContext: null,

    async loadSample(url = './Ab4.mp3') {
        const response = await fetch(url);
        let arrayBuffer = await response.arrayBuffer();

        const audioBuffer = await _.decodeAndResampleAudio(arrayBuffer);

        return audioBuffer;
    },

    addBufferToWorklet(s) {
        console.log(s)
        _.compoNode.port.postMessage({
            command: 'addBuffer',
            buffer: {
                channelData: [
                    s.getChannelData(0),
                    s.numberOfChannels != 2 ? s.getChannelData(0) : s.getChannelData(1)
                ]
            }
        });
    }
}

const audioContext = new getContext().rawContext;
_.audioContext = audioContext;

async function startAudio() {
    await audioContext.audioWorklet.addModule(byteStepProcessor);
    await audioContext.audioWorklet.addModule(frequencyArrayProcessor);

    const s1 = await _.loadSample('./0.wav');
    const s2 = await _.loadSample('./Ab5.mp3');

    _.compoNode = new AudioWorkletNode(audioContext, 'byteStepProcessor', {
        processorOptions: {
            sampleRate: audioContext.sampleRate,
            originalSampleRate: s1.sampleRate,
        },
    });

    _.freqArrayNode = new AudioWorkletNode(audioContext, 'frequency-array-processor', {
        processorOptions: {
            sampleRate: audioContext.sampleRate,
        },
    });

    audioContext.resume();

    _.addBufferToWorklet(s1);
    _.addBufferToWorklet(s2);
X
    // Harmonic series for testing
    const frequencyArray = [
        { frequency: 220, magnitude: 0.5 },
        { frequency: 440, magnitude: 0.25 },
        { frequency: 880, magnitude: 0.125 },
        { frequency: 1760, magnitude: 0.0625 }
        // Add more harmonic frequencies as needed
    ];

    _.freqArrayNode.port.postMessage({
        command: 'setFrequencies',
        frequencyArray
    });

    _.compoNode.connect(audioContext.destination);
    _.freqArrayNode.connect(audioContext.destination);
}

const button = document.createElement("button");
button.innerHTML = "Start Audio Worklet";
button.addEventListener("click", startAudio);
document.body.appendChild(button);
startAudio();


!!!!