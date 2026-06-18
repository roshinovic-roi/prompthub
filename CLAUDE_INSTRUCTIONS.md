# PromptHub – הוראות לקלוד

## פרטי פרויקט

| פרט | ערך |
|-----|-----|
| אתר | https://prompthub-wheat.vercel.app |
| GitHub repo | roshinovic-roi/prompthub |
| קובץ ראשי | index.html (קובץ יחיד, vanilla JS) |
| GitHub token | ghp_***_שמור_בזיכרון_של_קלוד*** |
| Supabase URL | https://ezppnixdvsibmmokfzrb.supabase.co |
| Supabase Key | sb_publishable_Yf5IO7cbJD2-f6HdIOoCmA_AUP36Wcd |

---

## איך לדחוף קוד (תמיד ככה)

```bash
# 1. קבל SHA
SHA=$(curl -s -H "Authorization: token ghp_***_שמור_בזיכרון_של_קלוד***" \
  "https://api.github.com/repos/roshinovic-roi/prompthub/contents/index.html" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

# 2. דחוף
CONTENT=$(base64 -w 0 /home/claude/index.html)
curl -s -X PUT \
  -H "Authorization: token ghp_***_שמור_בזיכרון_של_קלוד***" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/roshinovic-roi/prompthub/contents/index.html" \
  -d "{\"message\":\"תיאור השינוי\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ עלה!' if 'commit' in d else '❌ '+str(d))"
```

Vercel מתעדכן אוטומטית תוך ~30 שניות אחרי כל push.

---

## Stack טכני

```
index.html (vanilla JS, RTL Hebrew)
    ↓
Vercel (serverless)
    ├── /api/claude.js  ← proxy לאנתרופיק (עוקף CORS)
    └── index.html      ← האפליקציה עצמה
    
Supabase (מסד נתונים)
    ├── prompts         ← כל הפרומפטים
    └── settings        ← הגדרות (API key וכו')
```

### טבלת prompts
| עמודה | סוג | תיאור |
|-------|-----|--------|
| id | uuid | מפתח ראשי, מיוצר אוטומטית |
| created_at | timestamptz | תאריך יצירה |
| title | text | כותרת |
| content | text | תוכן הפרומפט |
| topic | text | נושא |
| subtopic | text | תת-נושא |
| tool | text | כלי AI |
| type | text | כללי/חיובי/שלילי/מערכת |
| media_type | text | טקסט/תמונה/וידאו/אודיו/קוד |
| tags | text[] | תגיות |
| extra | jsonb | נתונים נוספים (refImage וכו') |

### טבלת settings
| key | value |
|-----|-------|
| api_key | מפתח Anthropic של המשתמש |

---

## פונקציות מפתח בקוד

| פונקציה | תפקיד |
|----------|--------|
| `sbFetch(path, opts)` | קריאות REST ל-Supabase |
| `svPrompt(p)` | שמירת פרומפט ל-Supabase |
| `delFromSB(id)` | מחיקת פרומפט מ-Supabase |
| `loadKeyFromSB()` | טעינת API key מ-Supabase בטעינה |
| `saveKey()` | שמירת API key ל-Supabase |
| `ld()` | טעינת כל הפרומפטים בטעינת האפליקציה |
| `svMeta()` | שמירת topics/subs/tools ל-localStorage |
| `renderAll()` | רינדור מחדש של כל הממשק |

---

## מה חינם ומה עולה (לרועי)

### חינם לגמרי
- כפתור **+** — הוספה ידנית
- עריכה, מחיקה, העתקה
- חיפוש וסינון
- שמירה/טעינה מ-Supabase

### עולה טוקנים (Anthropic API)
- ייבוא קובץ Word עם AI
- ייבוא תמונה/צילום מסך עם AI
- ייבוא טקסט מודבק עם AI

### עלויות משוערות
| פעולה | עלות |
|--------|------|
| ייבוא תמונה | ~$0.01–0.02 |
| Word עד 10 פרומפטים | ~$0.01 |
| Word 30–50 פרומפטים | ~$0.03–0.05 |
| הוספה ידנית | $0 |

---

## ספריות חיצוניות

- **Tabler Icons** — אייקונים
- **mammoth.js** — פענוח קבצי Word
- **Supabase REST API** — מסד נתונים (ללא SDK, קריאות fetch ישירות)

---

## נקודות חשובות לתיקונים

1. **RTL** — הממשק בעברית מימין לשמאל, `dir="rtl"`
2. **Mobile first** — כפתורים גדולים, bottom sheet modals
3. **topics/subs/tools** — נשמרים ב-localStorage (לא ב-Supabase)
4. **id פרומפטים** — Supabase מייצר UUID אוטומטית, אל תשלח id בשורה חדשה
5. **Supabase key חדש** — publishable key (לא anon), headers: `apikey` + `Authorization: Bearer`
