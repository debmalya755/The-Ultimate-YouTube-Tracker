export interface Shot {
  /** light rendition (720p) — small windows, weak hardware, save-data */
  src: string;
  /** sharp rendition (1080p) — fullscreen & large displays */
  srcHigh: string;
  /** instant-paint still while the clip buffers */
  poster: string;
  scene: string;
  title: string;
  meta: string;
}

/* Every URL below was verified against the Pexels CDN (HTTP 200 + size).
   4K renditions are deliberately avoided — 1080p is plenty behind grain,
   vignette and a slow push, and it decodes on hardware that 4K chokes. */
export const SHOTS: Shot[] = [
  {
    // 1.1 MB / 2.4 MB
    src: "https://videos.pexels.com/video-files/19217898/19217898-hd_1280_720_30fps.mp4",
    srcHigh:
      "https://videos.pexels.com/video-files/19217898/19217898-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.pexels.com/videos/19217898/aisle-alone-dark-darkness-19217898.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    scene: "SC.01",
    title: "THE STUDIO",
    meta: "INT. EDIT BAY — 02:14 AM",
  },
  {
    // 4.7 MB / 10.8 MB
    src: "https://videos.pexels.com/video-files/5223113/5223113-hd_1280_720_30fps.mp4",
    srcHigh:
      "https://videos.pexels.com/video-files/5223113/5223113-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.pexels.com/videos/5223113/communication-complex-computer-concept-5223113.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    scene: "SC.02",
    title: "THE TIMELINE",
    meta: "INT. TIMELINE — EXPORT PASS 26",
  },
  {
    // 2.2 MB / 4.3 MB
    src: "https://videos.pexels.com/video-files/20609204/20609204-hd_1280_720_24fps.mp4",
    srcHigh:
      "https://videos.pexels.com/video-files/20609204/20609204-hd_1920_1080_24fps.mp4",
    poster:
      "https://images.pexels.com/videos/20609204/metal-turning-machine_2-20609204.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    scene: "SC.03",
    title: "THE PUBLISH",
    meta: "YOUTUBE STUDIO — PROCESSING 4K",
  },
  {
    // 3.3 MB / 7.4 MB
    src: "https://videos.pexels.com/video-files/6754824/6754824-hd_1280_720_25fps.mp4",
    srcHigh:
      "https://videos.pexels.com/video-files/6754824/6754824-hd_1920_1080_25fps.mp4",
    poster:
      "https://images.pexels.com/videos/6754824/pexels-photo-6754824.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    scene: "SC.04",
    title: "THE CREATOR",
    meta: "INT. HOME DESK — 03:07 AM",
  },
  {
    // 8.1 MB / 15.4 MB
    src: "https://videos.pexels.com/video-files/1085656/1085656-hd_1280_720_25fps.mp4",
    srcHigh:
      "https://videos.pexels.com/video-files/1085656/1085656-hd_1920_1080_25fps.mp4",
    poster:
      "https://images.pexels.com/videos/1085656/free-video-1085656.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    scene: "SC.05",
    title: "ANALYTICS",
    meta: "YOUTUBE STUDIO — VIEWS CLIMBING",
  },
  {
    // only ships 1080p + 4K upstream — 1080p serves both tiers
    src: "https://videos.pexels.com/video-files/34240702/14511077_1920_1080_30fps.mp4",
    srcHigh:
      "https://videos.pexels.com/video-files/34240702/14511077_1920_1080_30fps.mp4",
    poster:
      "https://images.pexels.com/videos/34240702/laser-print-34240702.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    scene: "SC.06",
    title: "THUMBNAIL",
    meta: "DESIGN SUITE — CLICK-RATE RISING",
  },
];

/** swap the poster to a 1080p-wide crop for fullscreen */
export const posterFor = (shot: Shot, tier: "low" | "high") =>
  tier === "high"
    ? shot.poster.replace("h=630&w=1200", "h=1080&w=1920")
    : shot.poster;

export const PASSKEY = "JARVIS";
