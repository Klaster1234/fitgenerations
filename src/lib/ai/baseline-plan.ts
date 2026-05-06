import 'server-only';
import type { ExerciseCandidate, GeneratedPlan, Profile } from './plan-generator';

/**
 * Deterministic, no-AI fallback plan.
 *
 * Used when:
 *   • ANTHROPIC_API_KEY is not configured (e.g. before the user wires up keys)
 *   • the AI call throws (rate limit, model outage, bad JSON, etc.)
 *
 * The shape matches what plan-generator.generatePlan returns, so callers
 * can swap the two transparently.
 */

type Locale = Profile['locale'];

// Greetings + motivation + per-category exercise note, in all four locales.
// Kept short and warm — no jargon, no emojis (consistent with the AI prompt).
const COPY: Record<
  Locale,
  {
    greeting: string;
    motivation: string;
    note: Record<string, string>; // by category
  }
> = {
  en: {
    greeting: "Today's plan is ready.",
    motivation:
      'Four short blocks. Move at your pace — finish what you can today, the rest stays for tomorrow.',
    note: {
      warmup: 'Loosen up. Light, easy moves to wake the body.',
      functional: 'Steady work. Quality over speed — feel the muscle.',
      mobility: 'Open the joints. Slow and breathing-led.',
      flexibility: 'Stretch. Hold each position without forcing it.',
      cardio: 'Get the heart up gently. Talk-pace is fine.',
      cooldown: 'Slow down. End calmer than you started.',
      balance: 'Find the centre. Steady, eyes open or closed.',
      green: 'Outside if you can. Movement plus fresh air.',
      pair: 'Better with company — invite someone.',
      team: 'A group activity to keep on the radar.',
    },
  },
  pl: {
    greeting: 'Twój plan na dziś jest gotowy.',
    motivation:
      'Cztery krótkie bloki. Idź swoim tempem — zrób tyle, ile dasz radę. Reszta poczeka.',
    note: {
      warmup: 'Rozgrzewka. Spokojne, łagodne ruchy — budzimy ciało.',
      functional: 'Praca właściwa. Jakość ważniejsza od tempa — czuj mięsień.',
      mobility: 'Otwieramy stawy. Powoli, w rytmie oddechu.',
      flexibility: 'Rozciąganie. Zatrzymaj się bez forsowania.',
      cardio: 'Lekko podnieś tętno. Tempo „rozmowne" wystarczy.',
      cooldown: 'Wyciszenie. Skończ spokojniej niż zacząłeś.',
      balance: 'Złap środek. Stabilnie, z otwartymi lub zamkniętymi oczami.',
      green: 'Jeśli możesz — wyjdź na zewnątrz. Ruch i świeże powietrze.',
      pair: 'Lepsze w parze — zaproś kogoś bliskiego.',
      team: 'Aktywność grupowa — warto mieć w głowie.',
    },
  },
  it: {
    greeting: 'Il tuo piano di oggi è pronto.',
    motivation:
      'Quattro brevi blocchi. Vai al tuo ritmo — fai quel che puoi oggi, il resto resta per domani.',
    note: {
      warmup: 'Riscaldamento. Movimenti leggeri per svegliare il corpo.',
      functional: 'Lavoro principale. Qualità più che velocità — senti il muscolo.',
      mobility: 'Apri le articolazioni. Lento, guidato dal respiro.',
      flexibility: 'Allungamento. Tieni la posizione senza forzare.',
      cardio: 'Alza il battito con calma. Ritmo da chiacchierata.',
      cooldown: 'Defaticamento. Finisci più calmo di come hai iniziato.',
      balance: 'Trova il centro. Stabile, occhi aperti o chiusi.',
      green: 'Se puoi — fuori. Movimento e aria fresca.',
      pair: 'Meglio in coppia — invita qualcuno.',
      team: 'Attività di gruppo — tienila a mente.',
    },
  },
  uk: {
    greeting: 'Ваш план на сьогодні готовий.',
    motivation:
      "Чотири короткі блоки. Йдіть у своєму темпі — зробіть стільки, скільки зможете. Решта почекає.",
    note: {
      warmup: 'Розминка. Легкі, плавні рухи — будимо тіло.',
      functional: 'Основна робота. Якість важливіша за темп — відчуйте м\'яз.',
      mobility: 'Відкриваємо суглоби. Повільно, у ритмі дихання.',
      flexibility: 'Розтяжка. Затримайтеся без зайвого зусилля.',
      cardio: 'М\'яко підніміть пульс. Темп «розмовний» — ідеально.',
      cooldown: 'Заспокоєння. Завершіть тихіше, ніж почали.',
      balance: 'Знайдіть центр. Стабільно, з відкритими або заплющеними очима.',
      green: 'Якщо можна — на свіже повітря. Рух і кисень.',
      pair: 'Краще удвох — запросіть когось.',
      team: 'Групова активність — варто пам\'ятати.',
    },
  },
};

// Preferred order: warmup → functional → cooldown. Falls back to whatever
// is available if the catalogue is unbalanced.
const ORDER: string[] = ['warmup', 'functional', 'cooldown'];

/**
 * Build a 4-exercise plan from the (already-filtered-for-user) catalogue.
 * Items are ordered: 1× warmup, 2× functional, 1× cooldown when possible.
 */
export function buildBaselinePlan(
  catalogue: ExerciseCandidate[],
  profile: Profile,
): GeneratedPlan {
  const copy = COPY[profile.locale] ?? COPY.en;

  const byCategory = new Map<string, ExerciseCandidate[]>();
  for (const ex of catalogue) {
    const list = byCategory.get(ex.category) ?? [];
    list.push(ex);
    byCategory.set(ex.category, list);
  }

  // Pick: 1 warmup, 2 functional, 1 cooldown — fall back to any category
  // when one is empty so we never ship fewer than 3 items.
  const picks: ExerciseCandidate[] = [];
  const used = new Set<string>();
  const tryPick = (category: string) => {
    const list = byCategory.get(category);
    if (!list) return;
    const next = list.find((ex) => !used.has(ex.slug));
    if (next) {
      picks.push(next);
      used.add(next.slug);
    }
  };

  tryPick('warmup');
  tryPick('functional');
  tryPick('functional');
  tryPick('cooldown');

  // Fill any remaining slots from any category if the targeted ones missed.
  if (picks.length < 4) {
    const ordered = ORDER.flatMap((c) => byCategory.get(c) ?? []).concat(
      catalogue.filter((ex) => !ORDER.includes(ex.category)),
    );
    for (const ex of ordered) {
      if (picks.length >= 4) break;
      if (used.has(ex.slug)) continue;
      picks.push(ex);
      used.add(ex.slug);
    }
  }

  const items = picks.map((ex, i) => ({
    exercise_slug: ex.slug,
    duration_minutes: Math.min(Math.max(ex.duration_minutes, 3), 30),
    ai_note: copy.note[ex.category] ?? copy.note.functional,
    order: i + 1,
  }));

  const total = items.reduce((sum, it) => sum + it.duration_minutes, 0);

  return {
    greeting: copy.greeting,
    motivation: copy.motivation,
    total_minutes: total,
    items,
  };
}
