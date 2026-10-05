/* AudioContext resamples the microphone to 16 kHz before this worklet.
 * Transfer mono Float32 audio in batches; never play microphone audio back. */
class VoskCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.used = 0;
    this.stopped = false;
    this.port.onmessage = event => {
      if (event.data === 'flush') {
        this.stopped = true;
        this.flush();
        this.port.postMessage({ flushed: true });
      }
    };
  }
  flush() {
    if (!this.used) return;
    const audio = this.buffer.slice(0, this.used);
    this.port.postMessage({ audio }, [audio.buffer]);
    this.used = 0;
  }
  process(inputs) {
    if (this.stopped) return false;
    const channel = inputs[0]?.[0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.used++] = channel[i];
        if (this.used === this.buffer.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('retlex-vosk-capture', VoskCapture);
