import { Texture } from 'pixi.js';
import { publicAsset } from '@shared/assetUrl';

export class VideoEngine {
  private static instance: VideoEngine | null = null;
  
  private fireVideoElement: HTMLVideoElement | null = null;
  private fireTexture: Texture | null = null;
  private isFireLoaded = false;

  private skyboxVideoElement: HTMLVideoElement | null = null;
  private skyboxTexture: Texture | null = null;
  private isSkyboxLoaded = false;

  public static getInstance(): VideoEngine {
    if (!VideoEngine.instance) {
      VideoEngine.instance = new VideoEngine();
    }
    return VideoEngine.instance;
  }

  public initFireVideo(videoUrl = publicAsset('/assets/videos/fire.mp4')): Promise<Texture> {
    return new Promise((resolve) => {
      // Append cache buster to force loading new video file
      const cacheBustUrl = `${videoUrl}?t=${Date.now()}`;

      const video = document.createElement('video');
      video.src = cacheBustUrl;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      video.oncanplay = () => {
        if (!this.isFireLoaded) {
          this.isFireLoaded = true;
          this.fireVideoElement = video;
          this.fireTexture = Texture.from(video);
          video.play().catch(() => {});
          resolve(this.fireTexture);
        }
      };

      video.onerror = () => {
        const fallbackVideo = document.createElement('video');
      fallbackVideo.src = `${publicAsset('/assets/videos/fire_transparent.webm')}?t=${Date.now()}`;
        fallbackVideo.autoplay = true;
        fallbackVideo.loop = true;
        fallbackVideo.muted = true;
        fallbackVideo.playsInline = true;
        fallbackVideo.oncanplay = () => {
          this.isFireLoaded = true;
          this.fireVideoElement = fallbackVideo;
          this.fireTexture = Texture.from(fallbackVideo);
          fallbackVideo.play().catch(() => {});
          resolve(this.fireTexture);
        };
        fallbackVideo.load();
      };

      video.load();
    });
  }

  public initSkyboxVideo(videoUrl = publicAsset('/assets/videos/synthwave_arcade_showcase.mp4')): Promise<Texture> {
    return new Promise((resolve) => {
      if (this.skyboxTexture && this.isSkyboxLoaded) {
        resolve(this.skyboxTexture);
        return;
      }

      const video = document.createElement('video');
      video.src = `${videoUrl}?t=${Date.now()}`;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      video.oncanplay = () => {
        if (!this.isSkyboxLoaded) {
          this.isSkyboxLoaded = true;
          this.skyboxVideoElement = video;
          this.skyboxTexture = Texture.from(video);
          video.play().catch(() => {});
          resolve(this.skyboxTexture);
        }
      };

      video.onerror = () => {
        this.skyboxTexture = Texture.WHITE;
        resolve(this.skyboxTexture);
      };

      video.load();
    });
  }

  public getFireTexture(): Texture | null {
    return this.fireTexture;
  }

  public getSkyboxTexture(): Texture | null {
    return this.skyboxTexture;
  }

  public destroy(): void {
    if (this.fireVideoElement) {
      this.fireVideoElement.pause();
      this.fireVideoElement.src = '';
      this.fireVideoElement = null;
    }
    if (this.skyboxVideoElement) {
      this.skyboxVideoElement.pause();
      this.skyboxVideoElement.src = '';
      this.skyboxVideoElement = null;
    }
    if (this.fireTexture) {
      this.fireTexture.destroy(true);
      this.fireTexture = null;
    }
    if (this.skyboxTexture) {
      this.skyboxTexture.destroy(true);
      this.skyboxTexture = null;
    }
    this.isFireLoaded = false;
    this.isSkyboxLoaded = false;
    VideoEngine.instance = null;
  }
}
