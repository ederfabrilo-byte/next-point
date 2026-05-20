import { View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface VideoPlayerProps {
  url: string;
  height?: number;
}

export default function VideoPlayer({ url, height = 220 }: VideoPlayerProps) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View
      className="rounded-2xl overflow-hidden bg-black border border-border"
      style={{ height }}
    >
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        contentFit="contain"
        allowsFullscreen
        nativeControls
      />
    </View>
  );
}
