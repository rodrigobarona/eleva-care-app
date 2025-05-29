interface VideoPlayerProps {
  width?: number;
  height?: number;
  src: string;
  playsInline?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  className?: string;
  poster?: string; // URL for a poster image to show before video loads
}

// Reminder: To prevent layout shifts, ensure the parent container
// of this VideoPlayer has defined dimensions or an aspect ratio.
// Example: <div style={{ width: '100%', aspectRatio: '16/9' }}>
//            <VideoPlayer src="..." />
//          </div>
// Or ensure VideoPlayer itself receives explicit width/height for aspect ratio,
// and its container controls the final display size.
export function VideoPlayer({
  width,
  height,
  src,
  playsInline,
  autoPlay,
  muted,
  loop,
  controls,
  preload = 'metadata', // Default preload to metadata for better performance
  className,
  poster,
}: VideoPlayerProps) {
  return (
    <video
      width={width}
      height={height}
      style={{ height: '100%', width: '100%' }}
      playsInline={playsInline}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      controls={controls}
      preload={preload}
      className={className}
      poster={poster}
    >
      <source src={src} type="video/webm" />
      Your browser does not support the video tag.
      <track kind="captions" src={src} />
    </video>
  );
}
export default VideoPlayer;
