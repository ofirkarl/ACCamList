# AC Cam List

רשימות ציוד מצלמה לעוזרי צלם: בוחרים בית השכרה, בונים את הרשימה מהקטלוג שלו ומייצאים ל-Word, PDF או CSV. אפליקציית דפדפן שאפשר להתקין למסך הבית.

## מבנה

- `index.html`, `sw.js`, `manifest.webmanifest`, `icons/`: האתר עצמו (GitHub Pages: https://ofirkarl.github.io/ACCamList/).
- `config.js`: החיבור ל-Firebase. כל עוד `firebase` הוא `null`, הכול נשמר רק בדפדפן.
- `tools/app-source.html`: קוד המקור של האפליקציה (הגרסה שב-Claude).
- `tools/standalone.js`: מה שמחליף את Claude מחוץ לו: Firebase (Firestore והתחברות אנונימית או עם Google), והורדת קבצים.
- `tools/build.py`: בונה את `index.html` ו-`sw.js` מקוד המקור (`python3 tools/build.py tools/app-source.html . <גרסה>`).
- `tools/firestore.rules`: כללי הגישה במסד הנתונים: כל אחד קורא וכותב רק את הרשימות שלו.
