-- Motivational badges (proposal: "motivational mechanisms").
-- Earning logic lives in the markExerciseDone Server Action.

insert into public.badges (slug, name, description, icon, criteria) values
  ('first-step',
    '{"en": "First step", "pl": "Pierwszy krok", "it": "Primo passo", "uk": "Перший крок"}',
    '{"en": "Complete your first exercise", "pl": "Wykonaj swoje pierwsze ćwiczenie", "it": "Completa il tuo primo esercizio", "uk": "Виконайте першу вправу"}',
    '🌱',
    '{"type": "logs_count", "min": 1}'),

  ('streak-3',
    '{"en": "3-day streak", "pl": "Seria 3 dni", "it": "Striscia di 3 giorni", "uk": "Серія 3 днів"}',
    '{"en": "Train 3 days in a row", "pl": "Trenuj 3 dni z rzędu", "it": "Allenati 3 giorni di fila", "uk": "Тренуйтеся 3 дні поспіль"}',
    '🔥',
    '{"type": "streak", "min": 3}'),

  ('streak-7',
    '{"en": "Week warrior", "pl": "Wojownik tygodnia", "it": "Guerriero della settimana", "uk": "Воїн тижня"}',
    '{"en": "Train 7 days in a row", "pl": "Trenuj 7 dni z rzędu", "it": "Allenati 7 giorni di fila", "uk": "Тренуйтеся 7 днів поспіль"}',
    '⭐',
    '{"type": "streak", "min": 7}'),

  ('streak-30',
    '{"en": "Month of motion", "pl": "Miesiąc w ruchu", "it": "Mese in movimento", "uk": "Місяць руху"}',
    '{"en": "Train 30 days in a row", "pl": "Trenuj 30 dni z rzędu", "it": "Allenati 30 giorni di fila", "uk": "Тренуйтеся 30 днів поспіль"}',
    '🏆',
    '{"type": "streak", "min": 30}'),

  ('ten-workouts',
    '{"en": "Ten and counting", "pl": "Dziesiątka", "it": "Decina", "uk": "Десятка"}',
    '{"en": "Complete 10 workouts in total", "pl": "Wykonaj łącznie 10 treningów", "it": "Completa 10 allenamenti in totale", "uk": "Виконайте 10 тренувань загалом"}',
    '💪',
    '{"type": "logs_count", "min": 10}'),

  ('diverse-five',
    '{"en": "Renaissance trainee", "pl": "Wszechstronny", "it": "Versatile", "uk": "Універсальний"}',
    '{"en": "Try 5 different exercise categories", "pl": "Wypróbuj 5 różnych kategorii ćwiczeń", "it": "Prova 5 diverse categorie di esercizi", "uk": "Спробуйте 5 різних категорій вправ"}',
    '🎨',
    '{"type": "diverse_categories", "min": 5}'),

  ('intergenerational',
    '{"en": "Bridge of generations", "pl": "Most pokoleń", "it": "Ponte delle generazioni", "uk": "Міст поколінь"}',
    '{"en": "Complete a pair / intergenerational exercise", "pl": "Wykonaj ćwiczenie w parze / międzypokoleniowe", "it": "Completa un esercizio in coppia / intergenerazionale", "uk": "Виконайте парну / міжпоколіннєву вправу"}',
    '🤝',
    '{"type": "category", "category": "pair"}'),

  ('green-mover',
    '{"en": "Green mover", "pl": "Eko-aktywny", "it": "Eco-attivo", "uk": "Еко-рухливий"}',
    '{"en": "Try a green sport (Nordic walking, tai-chi, plogging…)", "pl": "Wypróbuj zielony sport (Nordic walking, tai-chi, plogging…)", "it": "Prova uno sport verde (Nordic walking, tai-chi, plogging…)", "uk": "Спробуйте зелений спорт (Nordic walking, тай-чі, плогінг…)"}',
    '🌳',
    '{"type": "category", "category": "green"}');
