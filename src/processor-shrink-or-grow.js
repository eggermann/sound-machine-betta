import composition from "./composition";

Float32Array.prototype.concat = function () {

    /*var array1 = new Float32Array(10000000),
    array2 = new Float32Array(10000000);

var array3 = array1.concat(array2);*/
    var bytesPerIndex = 4,
        buffers = Array.prototype.slice.call(arguments);

    // add self
    buffers.unshift(this);

    buffers = buffers.map(function (item) {
        if (item instanceof Float32Array) {
            return item.buffer;
        } else if (item instanceof ArrayBuffer) {
            if (item.byteLength / bytesPerIndex % 1 !== 0) {
                throw new Error('One of the ArrayBuffers is not from a Float32Array');
            }
            return item;
        } else {
            throw new Error('You can only concat Float32Array, or ArrayBuffers');
        }
    });

    var concatenatedByteLength = buffers
        .map(function (a) {
            return a.byteLength;
        })
        .reduce(function (a, b) {
            return a + b;
        }, 0);

    var concatenatedArray = new Float32Array(concatenatedByteLength / bytesPerIndex);

    var offset = 0;
    buffers.forEach(function (buffer, index) {
        concatenatedArray.set(new Float32Array(buffer), offset);
        offset += buffer.byteLength / bytesPerIndex;
    });

    return concatenatedArray;
};

class WorkBuffer {
    constructor(buffer) {
        this.channelData = buffer.channelData;
    }

    getLength() {
        return this.channelData[0].length;
    }
}


const _ = {}

class SineWaveProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.phase = 0;
        this.sampleRate = options.processorOptions.sampleRate || 44100;
        this.originalSampleRate = options.processorOptions.originalSampleRate || 44100;
        this.isPlaying = false;
        this.pos = 0;
        this.delta = 0;
        this.roundCount = 0;

        this.workBuffer = []; // Buffer to hold audio data
        this.freshBuffers = [];


        this.port.onmessage = (event) => {
            /*if (event.data.command === 'start') {
                this.isPlaying = true;
                this.buffer = event.data.buffer; // Received audio data
            }*/

            if (event.data.command === 'addBuffer') {
                const newBuffer = new WorkBuffer(event.data.buffer); // Received audio data
                this.freshBuffers.push(newBuffer);
                console.log('newBuffer: ', newBuffer)
                if (this.isPlaying) {

                } else if (
                    this.freshBuffers.length % 2 == 0) {
                    const s1 = this.freshBuffers.shift();
                    const s2 = this.freshBuffers.shift();
      //              composition.arrangement(s1, s2);

                    this.workBuffer.push(s1, s2);

                    console.log('workBuffer: ', this.workBuffer);
                    this.isPlaying = true;

                }
            }
        }
    }

    static get parameterDescriptors() {
        return [];
    }

    setBuffer() {
        let buffer1Length = this.workBuffer[0].getLength();
        const buffer2Length = this.workBuffer[1].getLength();

        const sample1left = this.workBuffer[0].channelData[0];
        const sample1Right = this.workBuffer[0].channelData[1];

        let newArr1 = sample1left;
        let newArr2 = sample1Right

        const step = 1;

        if (buffer1Length > buffer2Length) {
            const cutWidth = (128 * step)
            const half = cutWidth / 2;

            // buffer1Length -= 128 * step;
            buffer1Length = Math.max(0, buffer1Length - cutWidth)
//cut middle peace out
          //  this.workBuffer[0].channelData[0] = sample1left.slice(half, buffer1Length - half);
//            this.workBuffer[0].channelData[1] = sample1Right.slice(half, buffer1Length - half);


            this.workBuffer[0].channelData[0] = sample1left.slice(0, buffer1Length );
            this.workBuffer[0].channelData[1] = sample1Right.slice(0, buffer1Length );
        }

        if (buffer1Length < buffer2Length) {
            const len = 128 * step;
            const halfLen = len / 2
            const floatArray = new Float32Array(len);

            try {
                const resultArray1 = new Float32Array(buffer1Length + len);
                resultArray1.set(sample1left, halfLen);
                resultArray1.set(floatArray, sample1left.length + halfLen);
                this.workBuffer[0].channelData[0] = resultArray1

                const resultArray2 = new Float32Array(buffer1Length + len);
                resultArray2.set(sample1Right, halfLen);
                resultArray2.set(floatArray, sample1Right.length + halfLen);
                this.workBuffer[0].channelData[1] = resultArray2
            } catch (er) {
            }
        }


    }

    process(inputs, outputs, parameters) {
        if (!this.isPlaying) {
            return true;
        }
        //     const windowLength = outputs[0][0].length;//128
//        const byteArray1 = new Uint8Array(windowLength * Float32Array.BYTES_PER_ELEMENT);
        const floatArray = new Float32Array(128);
        const output = outputs[0];
        const outputChannel = output[0];
        let step = 2;

        const buffer1Length = this.workBuffer[0].getLength();
        const buffer2Length = this.workBuffer[1].getLength();

        let lengthDiff = buffer1Length / buffer2Length ;
       // step= ( (lengthDiff*step)+step)/2;
       // lengthDiff=Math.max(lengthDiff-(lengthDiff/10),1)


        for (let i = 0; i < outputChannel.length; ++i) {
            const cnt = this.pos % buffer1Length;
            const pos1 = cnt;

         //   let pos2 = (Math.round(this.pos / lengthDiff)) % buffer2Length;
            let pos2 = (Math.round(this.pos / lengthDiff)) % buffer2Length;


            if (cnt == 0) {

                console.log('   this.roundCount:', this.roundCount)
                console.log('buffer1Length:', buffer1Length, '/', buffer2Length, '/', lengthDiff)
                this.roundCount++


                this.setBuffer();

            }


            //    pos2 = this.pos % buffer2Length;


            for (let channel = 0; channel < output.length; ++channel) {

                const sample1 = this.workBuffer[0].channelData[channel][pos1];
                const sample2 = this.workBuffer[1].channelData[channel][pos2];

                const byteValue2 = Math.round((sample2 + 1) * 127.5); // Map the sample to the range [0, 255]
                let byteValue1 = Math.round((sample1 + 1) * 127.5); // Map the sample to the range [0, 255]

                if (byteValue1 < byteValue2) {
                    byteValue1 += step;

                    if (byteValue1 > byteValue2) {
                        byteValue1 = byteValue2;
                    }
                }


                if (byteValue1 > byteValue2) {
                    byteValue1 -= step;

                    if (byteValue1 < byteValue2) {
                        byteValue1 = byteValue2;
                    }
                }


                const normalizedSample = (byteValue1 / 127.5) - 1;
                this.workBuffer[0].channelData[channel][pos1] = normalizedSample;


                floatArray[i] = normalizedSample
                output[channel][i] = floatArray[i];
            }

            this.pos += 1;
        }

        return true;
    }


}

registerProcessor('processor', SineWaveProcessor);
