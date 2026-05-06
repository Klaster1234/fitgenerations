'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Allow only popular video platforms — pre-validates we're dealing with safe links.
const ALLOWED_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.tiktok.com',
  'tiktok.com',
  'vm.tiktok.com',
  'www.instagram.com',
  'instagram.com',
  'vimeo.com',
  'www.vimeo.com',
];

const submitSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => {
      try {
        return ALLOWED_HOSTS.includes(new URL(u).host);
      } catch {
        return false;
      }
    }, 'Use a YouTube, TikTok, Instagram or Vimeo link'),
  caption: z.string().max(280).optional(),
  isPublic: z.coerce.boolean().default(true),
});

export type SubmitState = { ok: boolean; error?: string };

export async function submitChallengeVideo(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const parsed = submitSchema.safeParse({
    url: formData.get('url'),
    caption: formData.get('caption') || undefined,
    isPublic: formData.get('isPublic') ?? true,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'unauthorized' };

  const { error } = await supabase.from('challenge_videos').insert({
    user_id: userData.user.id,
    url: parsed.data.url,
    caption: parsed.data.caption ?? null,
    is_public: parsed.data.isPublic,
  });

  if (error) {
    console.error('challenge_videos insert failed', error);
    return { ok: false, error: 'db' };
  }

  revalidatePath('/[locale]/challenge', 'page');
  return { ok: true };
}
