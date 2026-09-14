import { supabase } from './supabase';

const VIDEOS_BUCKET = 'videos';

/**
 * O bucket `videos` é privado. `videos.storage_url` guarda o PATH do objeto
 * (`{uid}/{ts}.mp4`), não uma URL — exibir exige assinar na hora.
 *
 * Linhas antigas guardam a URL pública inteira (de quando o bucket estava
 * público); `toVideoPath` normaliza as duas formas.
 */
export function toVideoPath(storageUrl: string): string {
  if (!storageUrl.startsWith('http')) return storageUrl;
  const marker = `/${VIDEOS_BUCKET}/`;
  const i = storageUrl.indexOf(marker);
  return i === -1 ? storageUrl : storageUrl.slice(i + marker.length).split('?')[0];
}

/** URL temporária para reproduzir o vídeo. `null` se a assinatura falhar. */
export async function getVideoSignedUrl(
  storageUrl: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .createSignedUrl(toVideoPath(storageUrl), expiresInSeconds);
  return error ? null : data.signedUrl;
}
