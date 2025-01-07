// Import the necessary dependencies
import composition from "./composition";
import {WorkBuffer} from './WorkBuffer';

// Declare an empty object that could potentially be used for storing miscellaneous data
const _ = {};

// Define the ByteStepProcessor class that extends AudioWorkletProcessor
class ByteStepProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        // Initialize phase, sample rate, and other properties
        this.phase = 0;
        this.sampleRate = options.processorOptions.sampleRate || 44100;
        this.originalSampleRate = options.processorOptions.originalSampleRate || 44100;
        this.isPlaying = false;
        this.pos = 0;
        this.delta = 0;
        this.roundCount = 0;

        // Initialize buffer arrays
        this.workBuffer = []; // Buffer to hold processed audio data
        this.freshBuffers = []; // Buffer to store newly received audio data

        // Handle messages received from the node
        this.port.onmessage = (event) => {
            if (event.data.command === 'addBuffer') {
                // Create a new WorkBuffer from the received audio data and log it
                const newBuffer = new WorkBuffer(event.data.buffer);
                this.freshBuffers.push(newBuffer);
                //console.log('newBuffer: ', newBuffer);

                // Check if it's the right time to process the buffers
                if (this.isPlaying) {
                    // Process the audio data if the processor is playing
                } else if (this.freshBuffers.length % 2 == 0) {
                    // Merge and equalize two buffers when enough data has accumulated
                    const sample1 = this.freshBuffers.shift();
                    const sample2 = this.freshBuffers.shift();
                    const c = composition.arrangement.equal(sample1, sample2);

                    console.log(c.s1.getLength(), c.s2.getLength());
                    this.workBuffer.push(c.s1, c.s2);
                    console.log('workBuffer: ', this.workBuffer);
                    this.isPlaying = true;
                }
            }
        }
    }

    // Define any parameter descriptors for automation if necessary
    static get parameterDescriptors() {
        return [];
    }

    // The processing function where the actual audio processing occurs
    process(inputs, outputs, parameters) {
        if (!this.isPlaying) {
            return true; // Keep the processor alive but inactive
        }
        const floatArray = new Float32Array(128);
        const output = outputs[0];
        const outputChannel = output[0];
        let step = 2;

        const buffer1Length = this.workBuffer[0].getLength();
        const buffer2Length = this.workBuffer[1].getLength();
        let lengthDiff = buffer1Length / buffer2Length;

        for (let i = 0; i < outputChannel.length; ++i) {
            const cnt = this.pos % buffer1Length;
            const pos1 = cnt;
            let pos2 = (Math.round(this.pos / lengthDiff)) % buffer2Length;

            if (cnt == 0) {
                console.log('   this.roundCount:', this.roundCount);
                console.log('buffer1Length:', buffer1Length, '/', buffer2Length, '/', lengthDiff);
                this.roundCount++;
            }

            for (let channel = 0; channel < output.length; ++channel) {
                const sample1 = this.workBuffer[0].channelData[channel][pos1];
                const sample2 = this.workBuffer[1].channelData[channel][pos2];
                let byteValue1 = Math.round((sample1 + 1) * 127.5);
                const byteValue2 = Math.round((sample2 + 1) * 127.5);

                // Adjust sample1 towards sample2 by a step
                if (byteValue1 < byteValue2) {
                    byteValue1 += step;
                    if (byteValue1 > byteValue2) {
                        byteValue1 = byteValue2;
                    }
                } else if (byteValue1 > byteValue2) {
                    byteValue1 -= step;
                    if (byteValue1 < byteValue2) {
                        byteValue1 = byteValue2;
                    }
                }

                const normalizedSample = (byteValue1 / 127.5) - 1;
                this.workBuffer[0].channelData[channel][pos1] = normalizedSample;
                floatArray[i] = normalizedSample;
                output[channel][i] = floatArray[i];
            }

            this.pos += 1;
        }

        return true;
    }
}

// Register the processor with the name 'processor'
registerProcessor('byteStepProcessor', ByteStepProcessor);