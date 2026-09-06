export interface AudioRecordResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSeconds: number;
  audioUrl: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;

  async start(): Promise<void> {
    this.audioChunks = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Audio recording is not supported in this browser environment.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Detect supported mime type
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(250); // chunk every 250ms
  }

  async stop(): Promise<AudioRecordResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder was not initialized.'));
      }

      this.mediaRecorder.onstop = async () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        // Convert blob to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve({
            blob,
            base64: result,
            mimeType,
            durationSeconds,
            audioUrl,
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob);

        // Clean up stream tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}
