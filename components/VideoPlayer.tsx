import React, { forwardRef } from 'react';

interface VideoPlayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ canvasRef }, ref) => {
  return (
    <div className="relative w-full h-full bg-gray-950 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      ></video>
      <canvas ref={canvasRef} className="hidden"></canvas>
      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
        LIVE
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;