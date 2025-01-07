import makeNoise from "./make-noise";
class NoiseGenerator extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        console.log(this)

        // Set the frequency of the sine wave (adjust as needed)
        this.frequency = 440;

        // Generate the sine wave buffer based on the processor buffer size and sample rate
        this.buffer = this.generateSineBuffer(
            options.outputChannelCount,
            this.sampleRate,
            this.frequency
        );

        // Initialize the phase of the sine wave
        this.phase = 0;
    }

    generateSineBuffer(length, sampleRate, frequency) {
        const buffer = new Float32Array(length);
        const omega = (2 * Math.PI * frequency) / sampleRate;


        for (let i = 0; i < length; i++) {
            buffer[i] = Math.sin(omega * i);
        }


        console.log(this,length, sampleRate, frequency)
        return buffer;
    }

    static get parameterDescriptors() {
        return [
            { name: "amplitude", defaultValue: 0.25, minValue: 0, maxValue: 1 }
        ];
    }
    process(inputs, outputs, parameters) {
      /*  const output = outputs[0];
        const outputChannel = output[0];

        // Copy the sine wave buffer to the output channel
        for (let i = 0; i < outputChannel.length; i++) {
            outputChannel[i] = this.buffer[this.phase];

            // Increment the phase, reset if exceeding buffer length
            this.phase = (this.phase + 1) % this.buffer.length;
        }

        return true; // Indicates that the processor is still active
*/
      return makeNoise(inputs, outputs, parameters);
    }
}
registerProcessor("noise-generator", NoiseGenerator);
