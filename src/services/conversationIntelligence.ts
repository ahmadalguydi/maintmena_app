/**
 * Conversation Intelligence Service (Part 6.3)
 *
 * Pure client-side NLP heuristics — no new API, no LLM calls. Reads the
 * text of messages already present in the thread and extracts structured
 * "events" that the rest of the app can react to:
 *
 *   – PriceMentioned      → buyer or seller floated a number
 *   – ScopeDefined        → buyer articulated what they need fixed
 *   – CommitmentMade      → "I'll come at 4 PM", "بكرة بعد العصر"
 *   – SentimentShift      → thread sentiment crosses a threshold
 *   – QuestionAsked       → unresolved question older than N minutes
 *
 * These events power:
 *   – Thread Context Bar suggested replies
 *   – Notification priority escalation (Orchestrator)
 *   – Unconfirmed-commitment reminders
 *   – Soft-nudge "awaiting your response" prompts
 *
 * Language: supports English + Arabic (Saudi dialect).
 * Philosophy: high recall, conservative confidence. Every event has a
 * `confidence: 0..1` so consumers can threshold.
 */

export type IntelEventKind =
    | 'price_mentioned'
    | 'scope_defined'
    | 'commitment_made'
    | 'sentiment_shift'
    | 'question_asked';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface IntelMessage {
    id: string;
    sender_id: string;
    content: string;
    created_at: string; // ISO
    /**
     * Optional structured payload (image / file / location).
     * When present, the analyser treats it as a positive scope signal —
     * e.g., a buyer attaching a photo of a leak strengthens scope_defined.
     */
    payload?: { type: 'image' | 'file' | 'location'; [k: string]: unknown };
}

export interface IntelEvent {
    kind: IntelEventKind;
    messageId: string;
    senderId: string;
    at: string; // ISO
    confidence: number;
    /** Arbitrary extracted data. */
    extracted?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Price extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common SAR price mentions across English + Arabic.
 *   "300 SAR", "٣٠٠ ريال", "three hundred riyal", "سعري ٢٥٠"
 * We use loose regex and return NaN-safe numbers.
 */
const PRICE_REGEXES = [
    // 300 SAR, 300SAR, 300 ريال
    /(\d{2,5})\s*(?:sar|SAR|ريال|ر\.س|rs\.?)/g,
    // Arabic-Indic digits ٠-٩
    /([\u0660-\u0669]{2,5})\s*(?:ريال|ر\.س)/g,
    // "price is 300", "السعر 300" — but NOT followed by time/duration words
    // (avoids false positives like "I'll arrive at 3 pm" or "after 30 minutes")
    /(?:price|سعر(?:ه|ي)?|cost|تكلفة)[\s:=]*(\d{2,5})(?!\s*(?:min|mins|minutes|hour|hours|hr|hrs|am|pm|a\.m\.|p\.m\.|o['\u2019]?clock|دقيقة|دقائق|ساعة|ساعات|صباح|مساء))/gi,
];

const ARABIC_DIGITS_MAP: Record<string, string> = {
    '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
    '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
};

function normalizeDigits(str: string): string {
    return str.replace(/[\u0660-\u0669]/g, (d) => ARABIC_DIGITS_MAP[d] ?? d);
}

export function extractPrices(content: string): number[] {
    const normalized = normalizeDigits(content);
    const prices: number[] = [];
    for (const re of PRICE_REGEXES) {
        let m: RegExpExecArray | null;
        const r = new RegExp(re.source, re.flags);
        while ((m = r.exec(normalized)) !== null) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n >= 20 && n <= 100_000) prices.push(n);
        }
    }
    return prices;
}

// ═══════════════════════════════════════════════════════════════════════════
// Commitment detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Commitment phrases — "I'll come", "بجي", "راح آجي", "بكرة", times of day.
 */
const COMMITMENT_PATTERNS = {
    en: [
        /\b(i['\u2019]?ll|i will|gonna|going to)\s+(come|arrive|be there|stop by|visit)\b/i,
        /\b(see you|meet you)\s+(at|on|tomorrow|today|tonight)\b/i,
        /\b(tomorrow|today|tonight|morning|afternoon|evening)\b.*\b(at|by)\s+\d/i,
    ],
    ar: [
        /\b(راح|بجي|بكون|بجيك|بوصل|بآتي|بجي|راجع)\b/, // I'll come / I'll be back
        /\b(بكرة|اليوم|الليلة|الصبح|الظهر|العصر|المغرب|العشاء)\b/, // time markers
        /\b(أوعدك|متفقين|موعدنا|بإذن الله)\b/, // "agreed", "God willing"
    ],
};

/**
 * Extract a time anchor from content if present and valid.
 * Recognises 12h (3 pm, 3:30 PM) and 24h (15:00) formats.
 * Returns hour in 0–23 range, or null if no valid time was found.
 *
 * Why validate? Garbled inputs like "at 25" or "at 99 PM" should NOT
 * become spurious commitment anchors that the orchestrator then tries
 * to schedule reminders against.
 */
export function extractTimeAnchor(content: string): { hour: number; raw: string } | null {
    const normalized = normalizeDigits(content);
    // 12h with optional minutes + am/pm
    const re12 = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i;
    const m12 = normalized.match(re12);
    if (m12) {
        let h = parseInt(m12[1], 10);
        const isPm = /p/i.test(m12[3]);
        if (h >= 1 && h <= 12) {
            if (isPm && h !== 12) h += 12;
            if (!isPm && h === 12) h = 0;
            return { hour: h, raw: m12[0] };
        }
    }
    // 24h: 13:00, 09:30
    const re24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
    const m24 = normalized.match(re24);
    if (m24) {
        const h = parseInt(m24[1], 10);
        if (h >= 0 && h <= 23) return { hour: h, raw: m24[0] };
    }
    return null;
}

export function detectCommitment(content: string): { confidence: number; anchor?: string; hour?: number } {
    const ar = COMMITMENT_PATTERNS.ar.filter((re) => re.test(content)).length;
    const en = COMMITMENT_PATTERNS.en.filter((re) => re.test(content)).length;
    const totalHits = ar + en;
    if (totalHits === 0) return { confidence: 0 };
    // Extract the earliest matched token as anchor
    const allRegex = [...COMMITMENT_PATTERNS.ar, ...COMMITMENT_PATTERNS.en];
    let anchor: string | undefined;
    for (const re of allRegex) {
        const m = content.match(re);
        if (m?.[0]) { anchor = m[0]; break; }
    }
    // Try to attach a validated time anchor (0–23). Bumps confidence when present.
    const time = extractTimeAnchor(content);
    const baseConfidence = Math.min(0.95, 0.4 + totalHits * 0.25);
    const confidence = time ? Math.min(0.98, baseConfidence + 0.1) : baseConfidence;
    return {
        confidence,
        anchor: time ? `${anchor ?? ''} ${time.raw}`.trim() : anchor,
        hour: time?.hour,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Scope extraction
// ═══════════════════════════════════════════════════════════════════════════

const SCOPE_KEYWORDS = {
    en: ['leaking', 'broken', 'not working', 'doesn\'t work', 'installation', 'replace', 'fix', 'repair', 'clogged', 'dripping', 'short', 'smoking'],
    ar: ['تسريب', 'خربان', 'معطل', 'ما يشتغل', 'تركيب', 'استبدال', 'تصليح', 'إصلاح', 'مسدود', 'يقطر', 'شرارة', 'دخان'],
};

export function extractScope(content: string): { confidence: number; signals: string[] } {
    const hits: string[] = [];
    for (const kw of [...SCOPE_KEYWORDS.en, ...SCOPE_KEYWORDS.ar]) {
        if (new RegExp(`\\b${kw}\\b`, 'i').test(content)) hits.push(kw);
    }
    if (hits.length === 0) return { confidence: 0, signals: [] };
    return { confidence: Math.min(0.9, 0.3 + hits.length * 0.2), signals: hits };
}

// ═══════════════════════════════════════════════════════════════════════════
// Sentiment (lexicon-based, coarse)
// ═══════════════════════════════════════════════════════════════════════════

const POSITIVE_TERMS = [
    // English
    'thanks', 'thank you', 'great', 'perfect', 'excellent', 'appreciate', 'good', 'awesome', 'amazing', 'happy', 'satisfied', 'no problem', 'no worries',
    // MSA Arabic
    'شكراً', 'شكرا', 'ممتاز', 'تمام', 'الله يعافيك', 'أحسنت', 'رائع', 'جميل', 'مشكور',
    // Saudi dialect — common positive expressions
    'تمام التمام', 'تمام تمام', 'بس بس', 'ما عليه', 'ولا يهمك', 'كفو', 'يعطيك العافية',
    'ما قصرت', 'تسلم', 'الله يجزاك خير', 'ما فيه مشكلة', 'بكل سرور', 'حياك',
    'الله يبارك فيك', 'يا هلا', 'يا مرحبا', 'على راسي', 'من عيوني',
];
const NEGATIVE_TERMS = [
    // English
    'angry', 'upset', 'late', 'terrible', 'bad', 'unacceptable', 'never', 'cancel', 'refund', 'awful', 'horrible', 'rude', 'frustrated', 'disappointed',
    // MSA Arabic
    'متأخر', 'سيء', 'مزعل', 'مش مقبول', 'إلغاء', 'استرجاع', 'غير مقبول', 'محبط',
    // Saudi dialect — common negative expressions
    'مزفت', 'تعبتني', 'ما عجبني', 'ما حسيت بالراحة', 'مال يفهم', 'مو زين',
    'تعبان', 'زهقان', 'ما يصير', 'عيب', 'خايس', 'ضيعت وقتي', 'ما يستاهل',
];
const QUESTION_MARKS = ['؟', '?'];

export function scoreSentiment(content: string): { sentiment: Sentiment; score: number } {
    const lower = content.toLowerCase();
    let pos = 0; let neg = 0;
    for (const t of POSITIVE_TERMS) if (lower.includes(t.toLowerCase())) pos += 1;
    for (const t of NEGATIVE_TERMS) if (lower.includes(t.toLowerCase())) neg += 1;
    const net = pos - neg;
    if (net > 0) return { sentiment: 'positive', score: Math.min(1, net * 0.3) };
    if (net < 0) return { sentiment: 'negative', score: Math.min(1, -net * 0.3) };
    return { sentiment: 'neutral', score: 0 };
}

export function isQuestion(content: string): boolean {
    return QUESTION_MARKS.some((q) => content.includes(q));
}

// ═══════════════════════════════════════════════════════════════════════════
// Main analyser
// ═══════════════════════════════════════════════════════════════════════════

export interface ThreadIntel {
    events: IntelEvent[];
    lastCommitment?: IntelEvent;
    lastQuestionUnanswered?: IntelEvent;
    overallSentiment: Sentiment;
    lastPrices: number[];
}

/**
 * Analyse a thread of messages (ascending timestamp) and return structured intel.
 * Pure function — safe to run on every message update.
 */
export function analyseThread(messages: IntelMessage[]): ThreadIntel {
    const events: IntelEvent[] = [];
    const prices: number[] = [];
    let lastSentiment: Sentiment = 'neutral';
    let lastQuestionFromOther: IntelEvent | undefined;
    let lastCommitment: IntelEvent | undefined;

    let runningSentimentScore = 0;

    for (let i = 0; i < messages.length; i += 1) {
        const m = messages[i];
        // Allow text-empty messages IF they carry a payload (e.g., a photo of the leak)
        if (!m?.content && !m?.payload) continue;
        const text = m.content ?? '';

        // prices
        const p = extractPrices(text);
        if (p.length > 0) {
            prices.push(...p);
            events.push({
                kind: 'price_mentioned',
                messageId: m.id,
                senderId: m.sender_id,
                at: m.created_at,
                confidence: 0.9,
                extracted: { prices: p },
            });
        }

        // scope — text signals plus a structured-payload boost.
        // Photos / location pins are strong scope evidence: a buyer attaching
        // a picture of the broken AC is articulating the problem visually.
        const scope = extractScope(text);
        const payloadBoost = m.payload ? (m.payload.type === 'image' ? 0.5 : m.payload.type === 'location' ? 0.4 : 0.25) : 0;
        const scopeConfidence = Math.min(0.98, scope.confidence + payloadBoost);
        if (scopeConfidence > 0.4) {
            events.push({
                kind: 'scope_defined',
                messageId: m.id,
                senderId: m.sender_id,
                at: m.created_at,
                confidence: scopeConfidence,
                extracted: {
                    signals: scope.signals,
                    payloadType: m.payload?.type,
                },
            });
        }

        // commitment
        const commit = detectCommitment(text);
        if (commit.confidence > 0.5) {
            lastCommitment = {
                kind: 'commitment_made',
                messageId: m.id,
                senderId: m.sender_id,
                at: m.created_at,
                confidence: commit.confidence,
                extracted: { anchor: commit.anchor, hour: commit.hour },
            };
            events.push(lastCommitment);
        }

        // question
        if (isQuestion(text)) {
            const questionEvent: IntelEvent = {
                kind: 'question_asked',
                messageId: m.id,
                senderId: m.sender_id,
                at: m.created_at,
                confidence: 0.85,
            };
            events.push(questionEvent);
            // unanswered = no reply from the other party after it
            const answered = messages.slice(i + 1).some((later) => later.sender_id !== m.sender_id);
            if (!answered) lastQuestionFromOther = questionEvent;
        }

        // sentiment (rolling)
        const s = scoreSentiment(text);
        runningSentimentScore += s.sentiment === 'positive' ? s.score : s.sentiment === 'negative' ? -s.score : 0;
        lastSentiment = runningSentimentScore > 0.4 ? 'positive' : runningSentimentScore < -0.4 ? 'negative' : 'neutral';

        // sentiment-shift event (if last message flips polarity)
        if (i > 0) {
            const prev = scoreSentiment(messages[i - 1]?.content ?? '');
            if (prev.sentiment !== s.sentiment && s.sentiment !== 'neutral') {
                events.push({
                    kind: 'sentiment_shift',
                    messageId: m.id,
                    senderId: m.sender_id,
                    at: m.created_at,
                    confidence: 0.6,
                    extracted: { from: prev.sentiment, to: s.sentiment },
                });
            }
        }
    }

    return {
        events,
        lastCommitment,
        lastQuestionUnanswered: lastQuestionFromOther,
        overallSentiment: lastSentiment,
        lastPrices: prices.slice(-3), // last 3 prices mentioned
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Suggested replies
// ═══════════════════════════════════════════════════════════════════════════

export type JobLifecycleStage =
    | 'before_accept'
    | 'accepted'
    | 'on_the_way'
    | 'arrived'
    | 'in_progress'
    | 'awaiting_approval'
    | 'completed'
    | 'halted';

export interface SuggestedReply {
    id: string;
    label: { en: string; ar: string };
    /** Full message to send if tapped. */
    body: { en: string; ar: string };
    /** Priority: higher = show first. */
    weight: number;
}

/**
 * Derive smart suggested replies from the thread intel + current job stage + role.
 * Returns top 3 by weight.
 */
export function suggestReplies(
    intel: ThreadIntel,
    stage: JobLifecycleStage,
    role: 'buyer' | 'seller',
    myId: string,
): SuggestedReply[] {
    const suggestions: SuggestedReply[] = [];

    // 1) Unanswered question from the other party → priority
    if (intel.lastQuestionUnanswered && intel.lastQuestionUnanswered.senderId !== myId) {
        suggestions.push({
            id: 'sorry_missed',
            label: { en: 'Sorry, was busy — I\'ll reply now', ar: 'معذرة كنت مشغول، أرد الحين' },
            body: { en: 'Sorry for the delay — catching up now.', ar: 'آسف على التأخير — أرد الحين.' },
            weight: 10,
        });
    }

    // 2) Stage-specific
    if (role === 'seller') {
        if (stage === 'accepted') {
            suggestions.push({
                id: 'on_way_now',
                label: { en: 'I\'m heading out now', ar: 'متوجه لك الحين' },
                body: { en: 'I\'m on my way — will update when close.', ar: 'أنا في الطريق — أحدثك لما أكون قريب.' },
                weight: 8,
            });
            suggestions.push({
                id: 'share_eta',
                label: { en: 'ETA 20 min', ar: 'وصول بعد ٢٠ دقيقة' },
                body: { en: 'ETA about 20 minutes.', ar: 'الوصول تقريباً بعد ٢٠ دقيقة.' },
                weight: 7,
            });
        }
        if (stage === 'on_the_way') {
            suggestions.push({
                id: 'arrived_gate',
                label: { en: 'I\'m at the gate', ar: 'أنا عند البوابة' },
                body: { en: 'I\'m at the gate — please let me in.', ar: 'أنا عند البوابة — لو سمحت افتح.' },
                weight: 9,
            });
        }
        if (stage === 'in_progress') {
            suggestions.push({
                id: 'need_parts',
                label: { en: 'Need a part — quick trip', ar: 'أحتاج قطعة — رجعة سريعة' },
                body: { en: 'Need a small part — 15 min trip, back shortly.', ar: 'أحتاج قطعة صغيرة — جولة ١٥ دقيقة وأرجع.' },
                weight: 6,
            });
        }
        if (stage === 'awaiting_approval') {
            suggestions.push({
                id: 'price_breakdown',
                label: { en: 'Share price breakdown', ar: 'أرسل تفاصيل السعر' },
                body: {
                    en: 'Here\'s the breakdown: labor + parts. Happy to go over it.',
                    ar: 'التفاصيل: أجرة + قطع. أي سؤال أنا موجود.',
                },
                weight: 7,
            });
        }
    } else {
        // buyer
        if (stage === 'accepted' || stage === 'on_the_way') {
            suggestions.push({
                id: 'share_gate_code',
                label: { en: 'Share gate code', ar: 'أرسل رمز البوابة' },
                body: { en: 'Gate code: ', ar: 'رمز البوابة: ' },
                weight: 7,
            });
            suggestions.push({
                id: 'share_location_pin',
                label: { en: 'Send precise location', ar: 'أرسل الموقع' },
                body: { en: '📍 Sending you the exact pin.', ar: '📍 أرسل لك الموقع الدقيق.' },
                weight: 6,
            });
        }
        if (stage === 'in_progress') {
            suggestions.push({
                id: 'need_anything',
                label: { en: 'Need anything?', ar: 'تحتاج شي؟' },
                body: { en: 'Need anything from me?', ar: 'تحتاج شي مني؟' },
                weight: 5,
            });
        }
        if (stage === 'awaiting_approval') {
            suggestions.push({
                id: 'confirm_price',
                label: { en: 'Confirm price', ar: 'أؤكد السعر' },
                body: {
                    en: 'Price looks good — approving now.',
                    ar: 'السعر مناسب — أوافق الحين.',
                },
                weight: 8,
            });
            suggestions.push({
                id: 'need_clarification',
                label: { en: 'Need more detail', ar: 'أحتاج تفاصيل' },
                body: {
                    en: 'Can you break the price down for me?',
                    ar: 'ممكن تفصّل لي السعر؟',
                },
                weight: 6,
            });
        }
    }

    // 3) Price-adjacent
    if (intel.lastPrices.length > 0) {
        suggestions.push({
            id: 'noted_price',
            label: { en: 'Noted — reviewing', ar: 'مستلم — أراجع' },
            body: { en: 'Got it — reviewing and coming back to you.', ar: 'وصلني — أراجع وأرجع لك.' },
            weight: 3,
        });
    }

    // 4) Sentiment de-escalation
    if (intel.overallSentiment === 'negative') {
        suggestions.push({
            id: 'deescalate',
            label: { en: 'Can we hop on a call?', ar: 'نتكلم بالتلفون؟' },
            body: {
                en: 'Want to quickly hop on a call to sort this out?',
                ar: 'نتكلم بسرعة بالتلفون نحلها؟',
            },
            weight: 9,
        });
    }

    // dedupe by id, sort by weight desc, take top 3
    const seen = new Set<string>();
    return suggestions
        .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3);
}
