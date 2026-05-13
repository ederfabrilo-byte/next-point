-- Bucket para vídeos e frames de análise
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  false,
  524288000, -- 500MB
  array['video/mp4','video/quicktime','video/mpeg','video/webm','image/jpeg','image/png']
)
on conflict (id) do nothing;

-- Jogador pode fazer upload dos seus próprios vídeos e frames
create policy "videos: player upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Jogador pode ler seus próprios vídeos e frames
create policy "videos: player read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Edge Function (service role) pode ler tudo para processar
create policy "videos: service role read all"
  on storage.objects for select
  to service_role
  using (bucket_id = 'videos');
