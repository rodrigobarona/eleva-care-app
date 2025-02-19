interface VideoPlayerProps {
  width?: number;
  height?: number;
  src: string;
  playsInline?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  preload?: string;
  className?: string;
}
export function VideoPlayer({
  width,
  height,
  src,
  playsInline,
  autoPlay,
  muted,
  loop,
  controls,
  preload,
  className,
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
    >
      <source src={src} type="video/webm" />
      Your browser does not support the video tag.
    </video>
  );
}
export default VideoPlayer;
