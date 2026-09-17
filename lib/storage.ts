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

/**
 * Pasta onde ficam os frames que o app extraiu no envio, para a IA poder
 * reavaliar o vídeo depois (novo contexto do Agente, análise incompleta) sem
 * baixar o vídeo de novo. A primeira pasta tem que ser o uid — é o que as
 * policies do bucket exigem.
 */
export function videoFramesPrefix(userId: string, videoId: string): string {
  return `${userId}/frames/${videoId}`;
}

/** Sobe os frames (base64 JPEG) do vídeo. Falha aqui não pode derrubar o envio. */
export async function saveVideoFrames(userId: string, videoId: string, framesB64: string[]): Promise<void> {
  const { decode } = await import('base64-arraybuffer');
  const prefix = videoFramesPrefix(userId, videoId);
  await Promise.all(
    framesB64.map((b64, i) =>
      supabase.storage
        .from(VIDEOS_BUCKET)
        .upload(`${prefix}/${i + 1}.jpg`, decode(b64), { contentType: 'image/jpeg', upsert: true })
        .then(({ error }) => { if (error) console.warn('[frames] não guardou', i + 1, error.message); })
    )
  );
}

/** Apaga os frames guardados (chamar ao excluir o vídeo). */
export async function removeVideoFrames(userId: string, videoId: string): Promise<void> {
  const prefix = videoFramesPrefix(userId, videoId);
  const { data } = await supabase.storage.from(VIDEOS_BUCKET).list(prefix);
  if (data?.length) {
    await supabase.storage.from(VIDEOS_BUCKET).remove(data.map((f) => `${prefix}/${f.name}`));
  }
}
