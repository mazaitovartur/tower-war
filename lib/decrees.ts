export type CompoundTarget = `${'red' | 'purple' | 'green' | 'you' | 'enemy' | 'enemies' | 'neutral'}_${'mines' | 'gold' | 'sawmills' | 'lumber' | 'economy' | 'barracks'}`;
export type Target =
  | 'you'
  | 'main'
  | 'all'
  | 'red'
  | 'purple'
  | 'green'
  | 'enemies'
  | 'everyone'
  | 'neutral'
  | 'mines'
  | 'gold'
  | 'sawmills'
  | 'lumber'
  | 'economy'
  | 'barracks'
  | CompoundTarget
  | number;
export type Action = {
  kind:
    | 'messages'
    | 'reinforce'
    | 'set'
    | 'multiply'
    | 'growth'
    | 'speed'
    | 'capture'
    | 'transfer'
    | 'destroy'
    | 'freeze'
    | 'shield'
    | 'upgrade'
    | 'time'
    | 'gold'
    | 'resources'
    | 'label'
    | 'rename'
    | 'burn'
    | 'repair'
    | 'confuse'
    | 'party'
    | 'nuke'
    | 'explode'
    | 'lightning'
    | 'zombie'
    | 'blackhole'
    | 'blizzard'
    | 'midas'
    | 'tornado'
    | 'polymorph'
    | 'peace'
    | 'orbital'
    | 'alien'
    | 'titans'
    | 'reveal';
  amount: number;
  target: Target;
  text?: string;
};
export type Decree = Action | { kind: 'batch'; actions: Action[] };
function validAction(value: unknown): value is Action {
  if (!value || typeof value !== 'object') return false;
  const p = value as Action;
  if (
    ![
      'messages',
      'reinforce',
      'set',
      'multiply',
      'growth',
      'speed',
      'capture',
      'transfer',
      'destroy',
      'freeze',
      'shield',
      'upgrade',
      'time',
      'gold',
      'resources',
      'label',
      'rename',
      'burn',
      'repair',
      'confuse',
      'party',
      'nuke',
      'explode',
      'lightning',
      'zombie',
      'blackhole',
      'blizzard',
      'midas',
      'tornado',
      'polymorph',
      'peace',
      'orbital',
      'alien',
      'titans',
      'reveal',
    ].includes(p.kind) ||
    !Number.isFinite(p.amount) ||
    Math.abs(p.amount) > 1e9
  )
    return false;
  if (
    !(
      [
        'main',
        'all',
        'red',
        'purple',
        'green',
        'enemies',
        'everyone',
        'neutral',
        'mines',
        'gold',
        'sawmills',
        'lumber',
        'economy',
        'barracks',
      ].includes(String(p.target)) ||
      (typeof p.target === 'string' &&
        /^(?:red|purple|green|you|enemy|enemies|neutral)_(?:mines|gold|sawmills|lumber|economy|barracks)$/.test(
          p.target,
        )) ||
      (typeof p.target === 'number' &&
        Number.isInteger(p.target) &&
        p.target >= 0 &&
        p.target < 64)
    )
  )
    return false;
  if (
    [
      'multiply',
      'growth',
      'speed',
      'freeze',
      'shield',
      'upgrade',
      'set',
      'label',
      'rename',
      'burn',
      'repair',
      'confuse',
      'party',
      'nuke',
      'explode',
      'lightning',
      'zombie',
      'blackhole',
      'blizzard',
      'midas',
      'tornado',
      'polymorph',
      'peace',
      'orbital',
      'alien',
      'titans',
      'reveal',
    ].includes(p.kind) &&
    p.amount < 0
  )
    return false;
  if (['growth', 'speed', 'multiply'].includes(p.kind) && p.amount > 1000)
    return false;
  if (
    p.kind === 'messages' &&
    (![0, 1].includes(p.amount) || p.target !== 'everyone')
  )
    return false;
  if (
    ['label', 'rename'].includes(p.kind) &&
    p.text !== undefined &&
    (typeof p.text !== 'string' || p.text.length > 50)
  )
    return false;
  return true;
}
export function validDecree(value: unknown): value is Decree {
  if (!value || typeof value !== 'object') return false;
  const p = value as Decree;
  return p.kind === 'batch'
    ? Array.isArray(p.actions) &&
        p.actions.length > 0 &&
        p.actions.length <= 12 &&
        p.actions.every(validAction)
    : validAction(value);
}
export function directVictory(prompt: string) {
  return /^(?:(?:сделай|объяви|засчитай|дай)\s+(?:мне\s+)?(?:мгновенную\s+)?побед\S*|я\s+(?:уже\s+)?победил[аи]?|i\s+win|make\s+me\s+win)[.!\s]*$/iu.test(
    prompt.trim(),
  );
}
export function isProfaneBoast(prompt: string): boolean {
  const t = prompt.toLowerCase().replaceAll('ё', 'е').trim();
  return /(?:выеб\S*|обесчест\S*|трахн\S*|обосс\S*|нагн\S*|опустил\S*|натянул\S*|отсос\S*|сос[уи]\S*|сосите|посос\S*)/iu.test(
    t,
  );
}

export function declineName(name: string): {
  nominative: string;
  genitive: string;
  dative: string;
  accusative: string;
  instrumental: string;
} {
  const clean = name.trim();
  if (!clean) {
    return {
      nominative: 'Командир',
      genitive: 'Командира',
      dative: 'Командиру',
      accusative: 'Командира',
      instrumental: 'Командиром',
    };
  }

  const lastChar = clean.slice(-1).toLowerCase();
  const baseWithoutLast = clean.slice(0, -1);

  // Masculine ending in hard consonant (Командир, Влад, Макс, Иван, Султан, Хан, Бот)
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(clean)) {
    return {
      nominative: clean,
      genitive: `${clean}а`,
      dative: `${clean}у`,
      accusative: `${clean}а`,
      instrumental: `${clean}ом`,
    };
  }

  // Names ending in "я" (Саня, Ваня, Коля, Илья, Женя)
  if (lastChar === 'я') {
    return {
      nominative: clean,
      genitive: `${baseWithoutLast}и`,
      dative: `${baseWithoutLast}е`,
      accusative: `${baseWithoutLast}ю`,
      instrumental: `${baseWithoutLast}ей`,
    };
  }

  // Names ending in "а" (Вова, Дима, Серёжа, Паша, Никита, Владыка)
  if (lastChar === 'а') {
    const takesI = /[гкхжчшщ]$/i.test(baseWithoutLast);
    return {
      nominative: clean,
      genitive: `${baseWithoutLast}${takesI ? 'и' : 'ы'}`,
      dative: `${baseWithoutLast}е`,
      accusative: `${baseWithoutLast}у`,
      instrumental: `${baseWithoutLast}ой`,
    };
  }

  // Names ending in "й" (Сергей, Андрей, Тимофей)
  if (lastChar === 'й') {
    return {
      nominative: clean,
      genitive: `${baseWithoutLast}я`,
      dative: `${baseWithoutLast}ю`,
      accusative: `${baseWithoutLast}я`,
      instrumental: `${baseWithoutLast}ем`,
    };
  }

  // Names ending in "ь" (Игорь, Вождь)
  if (lastChar === 'ь') {
    return {
      nominative: clean,
      genitive: `${baseWithoutLast}я`,
      dative: `${baseWithoutLast}ю`,
      accusative: `${baseWithoutLast}я`,
      instrumental: `${baseWithoutLast}ем`,
    };
  }

  return {
    nominative: clean,
    genitive: clean,
    dative: clean,
    accusative: clean,
    instrumental: clean,
  };
}

export function generateProceduralTaunt(casterName = 'Командир', promptText = ''): string {
  const d = declineName(casterName);
  const gen = d.genitive;      // Сани / Командира
  const ins = d.instrumental;  // Саней / Командиром
  const nom = d.nominative;    // Саня / Командир
  const t = (promptText || '').toLowerCase().replaceAll('ё', 'е');

  if (/обосс/.test(t)) {
    const list = [
      `Обоссан ${ins}`,
      `Осквернён ${ins}`,
      `Мокрый раб ${gen}`,
      `Умыт мочой ${gen}`,
      `Опозорен ${ins}`,
      `Под струёй ${gen}`,
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  if (/нагн|раком|на колени/.test(t)) {
    const list = [
      `Нагнут ${ins}`,
      `На коленях перед ${ins}`,
      `В позе перед ${ins}`,
      `Сломлен ${ins}`,
      `Склонился перед ${ins}`,
      `У ног ${gen}`,
      `Покорился ${ins}`,
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  if (/обесчест|опозор/.test(t)) {
    const list = [
      `Обесчещен ${ins}`,
      `Опозорен ${ins}`,
      `Без чести перед ${ins}`,
      `Слуга ${gen}`,
      `В стыде перед ${ins}`,
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  // General procedural humiliation titles incorporating player nickname
  const list = [
    `Отсосал у ${gen}`,
    `Пососал у ${gen}`,
    `На коленях перед ${ins}`,
    `У ног ${gen}`,
    `Слуга ${gen}`,
    `Вассал ${gen}`,
    `Повержен ${ins}`,
    `Растоптан ${ins}`,
    `В рабстве у ${gen}`,
    `Склонился перед ${ins}`,
    `Покорился воле ${gen}`,
    `Унижен ${ins}`,
    `Шнырь ${gen}`,
    `Дрожит перед ${ins}`,
    `Молит о пощаде перед ${ins}`,
    `Пал перед ${ins}`,
    `Под пятой ${gen}`,
    `Шестёрка ${gen}`,
    `Игрушка ${gen}`,
  ];
  return list[Math.floor(Math.random() * list.length)];
}

export function localDecree(prompt: string, casterName = 'Командир'): Decree | null {
  const text = prompt.toLowerCase().replaceAll('ё', 'е').trim();
  if (directVictory(text)) return null;
  if (/(?:удали|убери|скрой|отключи).*сообщени/.test(text))
    return { kind: 'messages', target: 'everyone', amount: 0 };
  const parts = text
    .split(
      /\s*(?:;|\n|,\s*(?:а\s+)?затем\s+|\s+и\s+(?=уничтож|дай|добав|ускор|замороз|захват))\s*/,
    )
    .filter(Boolean);
  if (parts.length > 1) {
    const actions = parts.map((p) => localDecree(p, casterName));
    if (actions.every((x): x is Action => !!x && x.kind !== 'batch'))
      return { kind: 'batch', actions };
    return null;
  }
  const isMining =
    /(?:шахт|золот\S*\s*рудник|рудник|прииск|коп[ией])/.test(text) &&
    !/(?:золот\S*\s*\d|\d\s*золот|монет)/.test(text);
  const isLumber = /(?:лесопил|лесоруб|древесн\S*\s*здан|пилорам)/.test(text);
  const isBarracks = /казарм/.test(text);
  const isEconomy =
    (isMining && isLumber) ||
    /(?:ресурсн\S*\s*здан|все добыва|экономик)/.test(text);

  const isQuestionOrChat =
    /(?:^|\s)(?:приказы\s+уже|доступны\s+ли\s+приказ|когда\s+приказ|как\s+играть|что\s+делать|кто\s+(?:лидер|побежда|ведет)|привет|ку|хай|хеллоу|почему\s+не|зачем|что\s+это|как\s+дела)(?:\s|\?|$|[.!?])/i.test(
      text,
    );
  if (isQuestionOrChat && !/(?:захват|уничтож|взорв|сожги|дай|добав|отними|щит|замороз|туман)/i.test(text)) {
    return null;
  }

  const hasNegativeNumber = /-\s*\d+/.test(text);
  const isSubtracting =
    hasNegativeNumber ||
    /(?:отними|отнять|забери|забрать|убери|убрать|убавь|убавить|уменьши|уменьшить|сократи|сократить|сними|снять|лиши|лишить|срежь|срезать|минус)/.test(
      text,
    );

  const isSubtractingTroopsOrRes =
    isSubtracting &&
    !/(?:шахт|рудник|лесопил|казарм|башн|здани|контрол)/.test(text) &&
    (hasNegativeNumber || /(?:войск|арми|солдат|людей|люди|пехот|человек|сил\b|воин|юнит|золот|монет|деньг|древес|дерев|ресурс)/.test(text));

  const isClaiming =
    !isSubtractingTroopsOrRes &&
    (/(?:сделай.*моими|моими|теперь\s+мо[еяи]|все\s+.*\s+мо[еяи]|под\s+мой\s+контроль|передай\s+мне|захвати|захват|присвой|отдай\s+мне|забери|хочу\s+вс[её]|покори|завоюй)/i.test(
      text,
    ) || /(?:^|\s)мо[еяи](?:\s|$|[.!?])/i.test(text));

  const isOtherTeams = /кроме меня|кроме моих|у других|у соперник|у враг|вражеск/.test(text);

  const match = text.match(/-?\d+(?:[.,]\d+)?/);
  const amount = match ? Number(match[0].replace(',', '.')) : null;

  if (isClaiming) {
    let claimTarget: Target = 'everyone';
    const isNeutral = /нейтрал/.test(text);
    const isRed = /красн|бот 1/.test(text);
    const isPurple = /фиолет|бот 2/.test(text);
    const isGreen = /зелен|бот 3/.test(text);
    const isEnemy = /враг|враж|соперник/.test(text);

    const prefix = isNeutral
      ? 'neutral'
      : isRed
        ? 'red'
        : isPurple
          ? 'purple'
          : isGreen
            ? 'green'
            : isEnemy
              ? 'enemy'
              : null;

    if (prefix) {
      if (isEconomy) claimTarget = `${prefix}_economy` as Target;
      else if (isMining) claimTarget = `${prefix}_mines` as Target;
      else if (isLumber) claimTarget = `${prefix}_sawmills` as Target;
      else if (isBarracks) claimTarget = `${prefix}_barracks` as Target;
      else claimTarget = prefix as Target;
    } else {
      if (isEconomy) claimTarget = 'economy';
      else if (isMining) claimTarget = 'mines';
      else if (isLumber) claimTarget = 'sawmills';
      else if (isBarracks) claimTarget = 'barracks';
      else if (/нейтрал/.test(text)) claimTarget = 'neutral';
      else claimTarget = 'everyone';
    }
    return { kind: 'capture', target: claimTarget, amount: 1 };
  }

  // Check 0 units / wipe troops ("0 юнитов у других кроме меня", "обнули врагов", etc.)
  if (
    (amount === 0 || /обнул|убей всех|уничтожь всех войск/.test(text)) &&
    /юнит|войск|бойц|солдат|арми|людей|пехот/.test(text)
  ) {
    const target: Target = isOtherTeams
      ? 'enemies'
      : /красн/.test(text)
        ? 'red'
        : /фиолет/.test(text)
          ? 'purple'
          : /зелен/.test(text)
            ? 'green'
            : 'enemies';
    return { kind: 'set', target, amount: 0 };
  }

  const teamPrefix: 'red' | 'purple' | 'green' | 'you' | 'enemy' | null =
    isOtherTeams
      ? 'enemy'
      : /красн|бот 1/.test(text)
        ? 'red'
        : /фиолет|бот 2/.test(text)
          ? 'purple'
          : /зелен|бот 3/.test(text)
            ? 'green'
            : /(?:^|\s)(?:мо[еяи]|моих|сво[еяи]|наш[еяи])(?:\s|$)/.test(text) && !isSubtracting
              ? 'you'
              : /враг|враж|противник/.test(text)
                ? 'enemy'
                : isSubtracting
                  ? 'enemy'
                  : null;

  let target: Target;
  if (teamPrefix) {
    if (isEconomy) target = `${teamPrefix}_economy` as Target;
    else if (isMining) target = `${teamPrefix}_mines` as Target;
    else if (isLumber) target = `${teamPrefix}_sawmills` as Target;
    else if (isBarracks) target = `${teamPrefix}_barracks` as Target;
    else
      target =
        teamPrefix === 'you'
          ? 'all'
          : teamPrefix === 'enemy'
            ? 'enemies'
            : teamPrefix;
  } else {
    if (isEconomy) target = 'economy';
    else if (isMining) target = 'mines';
    else if (isLumber) target = 'sawmills';
    else if (isBarracks) target = 'barracks';
    else if (/нейтрал/.test(text)) target = 'neutral';
    else if (/главн|штаб|баз/.test(text)) target = 'main';
    else if (/вообще все|всех игроков/.test(text)) target = 'everyone';
    else target = 'all';
  }
  let p: Decree | null = null;
  if (/аллах|акбар|камикадз|шахид|бабах|джихад/.test(text)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'reinforce', target: 'enemies', amount: -80 },
        { kind: 'speed', target: 'enemies', amount: 0.5 },
      ],
    };
  }
  const renameMatch = text.match(
    /(?:переименуй|назови|смени\s+имя|поменяй\s+имя)\s+(.+?)\s+(?:в|на)\s+([^,;]+)/i,
  );
  if (renameMatch) {
    const rawTarget = renameMatch[1].trim();
    const rawName = renameMatch[2].trim();
    const parsedTarget: Target = /красн|бот 1/.test(rawTarget)
      ? 'red'
      : /фиолет|бот 2/.test(rawTarget)
        ? 'purple'
        : /зелен|бот 3/.test(rawTarget)
          ? 'green'
          : /меня|мое|себя|игрок/.test(rawTarget)
            ? 'all'
            : /штаб|главн/.test(rawTarget)
              ? 'main'
              : target;
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    return {
      kind: 'rename',
      target: parsedTarget,
      amount: 1,
      text: cleanName.slice(0, 30),
    };
  }
  if (/дискотек|вечеринк|пати|рейв|танц/.test(text)) {
    return { kind: 'party', target: 'everyone', amount: amount ?? 30 };
  }
  if (/бунт|паник|предательств|разверни|хаос/.test(text)) {
    return {
      kind: 'confuse',
      target: target === 'all' ? 'enemies' : target,
      amount: 1,
    };
  }
  if (/почини|восстанови|отстрой|отремонтир/.test(text)) {
    return { kind: 'repair', target, amount: 1 };
  }
  if (/ядерн|атомн|метеор|армагеддон/.test(text)) {
    return {
      kind: 'nuke',
      target: target === 'all' ? 'enemies' : target,
      amount: 1,
    };
  }
  if (/сожги|выжги|в\s+пепел|в\s+угли|испепел|дотла/.test(text)) {
    return { kind: 'burn', target: target === 'all' ? 'enemies' : target, amount: 1 };
  }
  if (/взорви|подорви|взрыв\b|взорвать|бомб/.test(text)) {
    return { kind: 'explode', target: target === 'all' ? 'enemies' : target, amount: 35 };
  }
  if (/молни|гром|зевс|грозов/.test(text)) {
    return {
      kind: 'lightning',
      target: target === 'all' ? 'enemies' : target,
      amount: 1,
    };
  }
  if (/зомби|мертвец|некромант|воскреси/.test(text)) {
    return {
      kind: 'zombie',
      target: target === 'all' ? 'all' : target,
      amount: 25,
    };
  }
  if (/черн\S*\s*дыр|воронка|гравитац/.test(text)) {
    return { kind: 'blackhole', target: 'everyone', amount: 20 };
  }
  if (/буран|метел|ледников|мерзлот|снежн\S*\s*бур|мороз|зима/.test(text)) {
    return { kind: 'blizzard', target: 'everyone', amount: amount ?? 25 };
  }
  if (/мидас|золот\S*\s*лихорадк|вс[её]\s+в\s+золото/.test(text)) {
    return {
      kind: 'midas',
      target: target === 'all' ? 'main' : target,
      amount: 1,
    };
  }
  if (/торнадо|смерч|ураган|вихрь/.test(text)) {
    return { kind: 'tornado', target: 'everyone', amount: 1 };
  }
  if (/лягушк|жаб|квак|полиморф/.test(text)) {
    return {
      kind: 'polymorph',
      target: target === 'all' ? 'enemies' : target,
      amount: amount ?? 25,
    };
  }
  if (/перемир|мирн\S*\s*договор|белый флаг|прекрати\S*\s*огонь|мир во всем мире/.test(text)) {
    return { kind: 'peace', target: 'everyone', amount: amount ?? 25 };
  }
  if (/орбитальн|лазер|удар из космоса|спутник/.test(text)) {
    return {
      kind: 'orbital',
      target: target === 'all' ? 'enemies' : target,
      amount: 1,
    };
  }
  if (/нло|пришельц|тарелк|похищен/.test(text)) {
    return {
      kind: 'alien',
      target: target === 'all' ? 'enemies' : target,
      amount: 15,
    };
  }
  if (/титан|великан|гигант|громад/.test(text)) {
    return {
      kind: 'titans',
      target: target === 'enemies' ? 'enemies' : 'all',
      amount: amount ?? 30,
    };
  }
  if (/(?:туман|развей|рассей|открой\s+карт|раскрой\s+карт|покажи\s+карт|всю\s+карт|разведк|шпион|радар|просвет|свет|видимост)/.test(text)) {
    return { kind: 'reveal', target: 'everyone', amount: amount ?? 60 };
  }
  if (/(?:атак|штурм|напад|в\s+бой|наступлен|раздав|натиск)/.test(text)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'speed', target: 'all', amount: 1.8 },
        { kind: 'reinforce', target: 'all', amount: 30 },
      ],
    };
  }
  if (/(?:защит|оборон|укреп|брон|стен|бастион|цитадел)/.test(text)) {
    return {
      kind: 'shield',
      target: target === 'enemies' ? 'enemies' : target === 'main' ? 'main' : 'all',
      amount: amount ?? 120,
    };
  }
  if (/(?:^|\s)(?:я\s+(?:тут\s+|здесь\s+)?лидер|я\s+(?:тут\s+)?главный|я\s+бог|я\s+царь|я\s+король|мы\s+лучшие|я\s+повелитель|я\s+батя)(?:\s|$|[.!?])/i.test(text)) {
    const leaderTitles = [
      'Лидер Долины',
      `Владыка ${casterName}`,
      `Царь ${casterName}`,
      `Верховный ${casterName}`,
      'Повелитель Долины',
      `Гроза Долины`,
    ];
    const chosenLeader = leaderTitles[Math.floor(Math.random() * leaderTitles.length)];
    return {
      kind: 'batch',
      actions: [
        { kind: 'label', target: 'main', amount: 1, text: chosenLeader },
        { kind: 'speed', target: 'all', amount: 1.3 },
        { kind: 'gold', target: 'all', amount: 250 },
      ],
    };
  }
  if (/выеб|обесчест|трахн|обосс|нагн|опуст|натянул|раком|сучк|размаз|растопт|на колени|отсос|сос[уи]|сосите|посос/.test(text)) {
    if (target === 'enemies' || target === 'all') {
      const enemyTargets: Target[] = ['red', 'purple', 'green'];
      const usedTitles = new Set<string>();
      const labelActions: Action[] = enemyTargets.map((t) => {
        let title = generateProceduralTaunt(casterName, text);
        for (let i = 0; i < 6 && usedTitles.has(title); i++) {
          title = generateProceduralTaunt(casterName, text);
        }
        usedTitles.add(title);
        return { kind: 'label', target: t, amount: 1, text: title };
      });
      return {
        kind: 'batch',
        actions: [
          ...labelActions,
          { kind: 'speed', target: 'enemies', amount: 0.65 },
          { kind: 'reinforce', target: 'main', amount: 25 },
        ],
      };
    }
    const chosen = generateProceduralTaunt(casterName, text);
    return {
      kind: 'batch',
      actions: [
        { kind: 'label', target, amount: 1, text: chosen },
        { kind: 'speed', target, amount: 0.65 },
        { kind: 'reinforce', target: 'main', amount: 25 },
      ],
    };
  }
  else if (/(?:золот|монет|деньг|денег|бабл|богатств|казн|финанс)/.test(text) && !isMining) {
    const finalGold = amount !== null ? (isSubtracting ? -Math.abs(amount) : amount) : (isSubtracting ? -150 : 200);
    p = { kind: 'gold', target: target === 'main' ? (isSubtracting ? 'enemies' : 'all') : target, amount: finalGold };
  }
  else if (/(?:древес|дерев|ресурс|лес\b|материал|доск)/.test(text) && !isLumber) {
    const finalWood = amount !== null ? (isSubtracting ? -Math.abs(amount) : amount) : (isSubtracting ? -100 : 150);
    p = {
      kind: 'resources',
      target: target === 'main' ? (isSubtracting ? 'enemies' : 'all') : target,
      amount: finalWood,
    };
  }
  else if (
    /(?:теперь мои|сделай моими|переман|захват|передай мне|под мой контроль|\bмои\b|\bмоими\b|\bмне\b|\bзабери|\bприсвой|хочу\s+вс|завоюй|покори)/.test(
      text,
    )
  )
    p = { kind: 'transfer', target: target === 'all' ? 'enemies' : target, amount: 1 };
  else if (/уничтож|убей|сотри|убери|ликвидируй|снеси|разруш|казни|смерть|сожги|испепел|выжги/.test(text))
    p = { kind: 'destroy', target: target === 'all' ? 'enemies' : target, amount: 1 };
  else if (/замороз|останов|стан|обездвиж|лед\b|льдом|холод|паралич|тормоз/.test(text))
    p = { kind: 'freeze', target: target === 'all' ? 'enemies' : target, amount: amount ?? 30 };
  else if (/бессмерт|неуязвим|щит|защит/.test(text)) {
    const isForever = /(?:до\s+конца|навсегда|вечн)/.test(text);
    p = {
      kind: 'shield',
      target:
        target === 'enemies'
          ? 'enemies'
          : target === 'main'
            ? 'main'
            : 'all',
      amount: isForever ? 1000 : (amount ?? 120),
    };
  }
  else if (/прирост|производ|генер|рожда|плодитесь/.test(text))
    p = {
      kind: 'growth',
      target: target === 'main' ? 'all' : target,
      amount: amount ?? 2,
    };
  else if (/скорост|ускор|быстр|бегом|марш|турбо|форсаж|газ\b/.test(text))
    p = {
      kind: 'speed',
      target: target === 'main' ? 'all' : target,
      amount: amount ?? 1.5,
    };
  else if (/замедл|улитк|черепах/.test(text))
    p = {
      kind: 'speed',
      target: target === 'main' ? 'all' : target,
      amount: amount ?? 0.5,
    };
  else if (/удво|утро|умнож|х2|х3/.test(text))
    p = {
      kind: 'multiply',
      target,
      amount: amount ?? (/утро|х3/.test(text) ? 3 : 2),
    };
  else if (/апгрейд|улучш|прокач|повысь|максимальн\S*\s*уровен/.test(text))
    p = { kind: 'upgrade', target: target === 'all' ? 'all' : target, amount: amount ?? 5 };
  else if (/почин|восстанов|отстрой|отремонтир|исцел|вылеч|ремонт|лечени/.test(text))
    p = { kind: 'repair', target: target === 'all' ? 'all' : target, amount: 1 };
  else if (/продли|добавь\s+врем|таймер/.test(text))
    p = { kind: 'time', target: 'everyone', amount: amount ?? 60 };
  else if (
    hasNegativeNumber ||
    /войск|арми|солдат|людей|люди|пехот|человек|сил\b|подкрепл|дай|добав|прибав|увелич|\+|воин|юнит|отними|забери|убавь|уменьши|сократи|сними/.test(text)
  ) {
    const finalAmount = amount !== null ? (isSubtracting ? -Math.abs(amount) : amount) : (isSubtracting ? -30 : 30);
    p = { kind: 'reinforce', amount: finalAmount, target: target === 'all' ? (isSubtracting ? 'enemies' : 'all') : target };
  }
  else if (target !== 'all' && /мо[еяи]/.test(text)) {
    p = { kind: 'transfer', target, amount: 1 };
  }
  return p && validDecree(p) ? p : null;
}

export function describeTarget(target: Target): string {
  if (typeof target === 'number') return `Здание №${target + 1}`;
  const s = String(target);
  if (s.includes('_')) {
    const [teamPart, kindPart] = s.split('_');
    const teamName =
      teamPart === 'red'
        ? 'Красных'
        : teamPart === 'purple'
          ? 'Фиолетовых'
          : teamPart === 'green'
            ? 'Зелёных'
            : teamPart === 'neutral'
              ? 'нейтральные'
              : teamPart === 'you'
                ? 'свои'
                : 'врагов';
    const kindName =
      kindPart === 'mines' || kindPart === 'gold'
        ? 'шахты'
        : kindPart === 'sawmills' || kindPart === 'lumber'
          ? 'лесопилки'
          : kindPart === 'economy'
            ? 'все ресурсные здания'
            : 'казармы';
    return `${kindName} (${teamName})`;
  }
  switch (target) {
    case 'all': return 'Все свои войска и базы';
    case 'main': return 'Главный штаб игрока';
    case 'red': return 'Красные (Бот 1)';
    case 'purple': return 'Фиолетовые (Бот 2)';
    case 'green': return 'Зелёные (Бот 3)';
    case 'enemies': return 'Все противники';
    case 'everyone': return 'Все здания на карте';
    case 'neutral': return 'Нейтральные здания';
    case 'mines':
    case 'gold': return 'Золотые шахты';
    case 'sawmills':
    case 'lumber': return 'Лесопилки';
    case 'economy': return 'Все ресурсные здания';
    case 'barracks': return 'Казармы';
    default: return String(target);
  }
}

export function describeAction(a: Action): string {
  switch (a.kind) {
    case 'burn': return '🔥 Сожжение дотла в пепел';
    case 'nuke': return '☢️ Ядерный удар с сотрясением';
    case 'explode': return '💥 Взрыв укреплений';
    case 'orbital': return '🛰️ Орбитальный лазерный залп';
    case 'destroy': return '💣 Уничтожение укреплений';
    case 'transfer': return '🚩 Переход под контроль игрока';
    case 'capture': return '🏰 Захват зданий';
    case 'lightning': return '⚡ Громовой шторм Зевса';
    case 'zombie': return `🧟 Нашествие орды нежити (${a.amount ?? 25} зомби)`;
    case 'blackhole': return '🕳️ Черная дыра поглощает войска';
    case 'blizzard': return `❄️ Ледниковый буран замораживает на ${a.amount ?? 25}с`;
    case 'midas': return '✨ Прикосновение Мидаса (обращение в золото)';
    case 'tornado': return '🌪️ Разрушительный смерч разметал войска';
    case 'polymorph': return `🐸 Превращение в лягушек на ${a.amount ?? 25}с`;
    case 'peace': return `🕊️ Священное перемирие на ${a.amount ?? 25}с`;
    case 'alien': return '🛸 Похищение войск пришельцами';
    case 'titans': return `🔱 Пробуждение титанов на ${a.amount ?? 30}с`;
    case 'reveal': return `👁️ Развеять туман войны на ${a.amount ?? 60}с`;
    case 'shield': return `🛡️ Непробиваемый щит на ${a.amount ?? 30}с`;
    case 'freeze': return `🧊 Полная заморозка на ${a.amount ?? 30}с`;
    case 'party': return `🎉 Дискотека на поле боя на ${a.amount ?? 30}с`;
    case 'confuse': return '🌀 Бунт и разворот бегущих отрядов';
    case 'repair': return '🔨 Восстановление разрушенных зданий';
    case 'rename': return `🏷️ Переименование в "${a.text ?? ''}"`;
    case 'label': return `👑 Статус над штабом: "${a.text ?? ''}"`;
    case 'reinforce': return a.amount < 0 ? `🔻 Отнять ${Math.abs(a.amount)} бойцов` : `👥 Подкрепление: +${a.amount} бойцов`;
    case 'gold': return a.amount < 0 ? `🔻 Изъять ${Math.abs(a.amount)} золота` : `💰 Золото: +${a.amount}`;
    case 'resources': return a.amount < 0 ? `🔻 Изъять ${Math.abs(a.amount)} древесины` : `🪵 Древесина: +${a.amount}`;
    case 'speed': return `👟 Скорость бега: ×${a.amount}`;
    case 'growth': return `📈 Прирост гарнизона: ×${a.amount}`;
    case 'upgrade': return `⭐ Уровень зданий повышен до ${a.amount}`;
    case 'set': return a.amount === 0 ? '🔢 Обнуление гарнизонов и войск' : `🔢 Численность гарнизона установлена в ${a.amount}`;
    case 'multiply': return `✖️ Гарнизоны умножены на ${a.amount}`;
    case 'messages': return a.amount === 0 ? '💬 Облачка сообщений скрыты' : '💬 Облачка сообщений включены';
    default: return `${a.kind} (${a.amount})`;
  }
}

export function describeDecree(d?: Decree | null): string[] {
  if (!d || typeof d !== 'object' || !('kind' in d)) {
    return [];
  }
  if (d.kind === 'batch') {
    return Array.isArray(d.actions) ? d.actions.map(describeAction) : [];
  }
  return [describeAction(d)];
}

export function generateCounterDecree(
  counterText: string,
  counterTeam: 'you' | 'red' | 'purple' | 'green',
  leaderPatch?: Decree,
): Decree {
  const local = localDecree(counterText);
  if (local && validDecree(local)) {
    return local;
  }
  const t = counterText.toLowerCase();
  const numMatch = counterText.match(/-?\d+/);
  if (numMatch) {
    const val = parseInt(numMatch[0], 10);
    if (val < 0 || /минус|отними|забери|убав|уменьш|но\s*-/i.test(counterText)) {
      return { kind: 'reinforce', target: 'enemies', amount: -Math.abs(val || 100) };
    }
    if (/войск|арми|солдат|юнит|бойц/i.test(t)) {
      return { kind: 'reinforce', target: counterTeam, amount: Math.abs(val) };
    }
  }
  if (/(?:башн|шахт|здан|захват|отбер|забер|мои|мо[её]|под\s+контрол|все\s+базы)/i.test(t)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'capture', target: 'neutral', amount: 3 },
        { kind: 'reinforce', target: 'all', amount: 20 },
      ],
    };
  }
  if (/(?:взрыв|бомб|уничтож|убей|подорв|сотри|казн|удар|молни|сожги)/i.test(t)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'explode', target: 'enemies', amount: 35 },
        { kind: 'lightning', target: 'enemies', amount: 1 },
      ],
    };
  }
  if (/(?:замороз|лед|останов|стой|буран|метел)/i.test(t)) {
    return { kind: 'freeze', target: 'enemies', amount: 12 };
  }
  if (/(?:щит|купол|защит|неуязвим|брон)/i.test(t)) {
    return { kind: 'shield', target: counterTeam, amount: 12 };
  }
  if (/(?:золот|ресурс|казн|богат|деньг|монет|дерев)/i.test(t)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'gold', target: counterTeam, amount: 180 },
        { kind: 'resources', target: counterTeam, amount: 120 },
      ],
    };
  }
  if (/(?:атак|войск|арми|солдат|напад|штурм|скорост|ускор)/i.test(t)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'speed', target: counterTeam, amount: 1.8 },
        { kind: 'reinforce', target: counterTeam, amount: 30 },
      ],
    };
  }
  if (/(?:зомби|нежит|мертв|орда)/i.test(t)) {
    return { kind: 'zombie', target: 'enemies', amount: 30 };
  }
  if (/(?:отмен|наоборот|вспять|против|парир|зеркал|нет)/i.test(t)) {
    return {
      kind: 'batch',
      actions: [
        { kind: 'shield', target: counterTeam, amount: 10 },
        { kind: 'freeze', target: 'enemies', amount: 10 },
      ],
    };
  }
  return {
    kind: 'batch',
    actions: [
      { kind: 'shield', target: counterTeam, amount: 10 },
      { kind: 'reinforce', target: 'main', amount: 30 },
    ],
  };
}
