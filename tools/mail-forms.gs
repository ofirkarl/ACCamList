/* AC Cam List · rental forms from your mail
   Every 10 minutes this looks in your Gmail for new mail from Utopia with a rental form (a PDF whose name has "טופס") and
   puts the form in your AC Cam List account. The app files it into its production the next time it opens (or right away,
   if it's open). It runs in your own Google account and only reads mail; nothing is sent anywhere else.
   To start it: choose "setup" in the bar above and press ▶ Run, then allow it (Advanced → Go to ...). That's all. */

const PROJECT = "ac-cam-list";
const FROM = "utopiacam.com";
const PART = 180000;   // characters of base64 in one database document (the app reads the same pieces)
const FS = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/";

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("check").timeBased().everyMinutes(10).create();
  const P = PropertiesService.getScriptProperties();
  if (!P.getProperty("since")) P.setProperty("since", String(Math.floor(Date.now() / 1000) - 3 * 86400));   // the last 3 days too
  P.deleteProperty("uid");
  const n = check();
  Logger.log("Ready. Your AC Cam List account: " + uid_() + ". Forms brought in now: " + n + ". From now on every 10 minutes.");
}

function check() {
  const P = PropertiesService.getScriptProperties();
  const since = +(P.getProperty("since") || Math.floor(Date.now() / 1000) - 86400);
  const seen = JSON.parse(P.getProperty("seen") || "[]");
  const res = Gmail.Users.Messages.list("me", { q: "from:" + FROM + " has:attachment filename:pdf after:" + since, maxResults: 20 });
  let n = 0;
  (res.messages || []).forEach(function (ref) {
    if (seen.indexOf(ref.id) >= 0) return;
    const m = Gmail.Users.Messages.get("me", ref.id);
    const head = {}; (m.payload.headers || []).forEach(function (h) { head[h.name.toLowerCase()] = h.value; });
    parts_(m.payload).forEach(function (part, k) {
      const name = part.filename || "";
      if (!/\.pdf$/i.test(name) || !/טופס/.test(name) || !part.body || !part.body.attachmentId) return;
      const att = Gmail.Users.Messages.Attachments.get("me", ref.id, part.body.attachmentId);
      const b64 = typeof att.data === "string" ? att.data.replace(/-/g, "+").replace(/_/g, "/") : Utilities.base64Encode(att.data);
      put_("mail-" + ref.id + "-" + k, b64, { name: name, size: part.body.size || 0, at: +m.internalDate || Date.now(), subject: head.subject || "" });
      n++;
    });
    seen.push(ref.id);
  });
  P.setProperty("seen", JSON.stringify(seen.slice(-300)));
  return n;
}

// the form into the account: its pieces (users/<uid>/files/<id>_<i>), then a note that it came (users/<uid>/inbox/<id>)
function put_(id, b64, meta) {
  const u = uid_(), n = Math.max(1, Math.ceil(b64.length / PART));
  for (let i = 0; i < n; i++) fs_("users/" + u + "/files/" + id + "_" + i, { d: { stringValue: b64.slice(i * PART, (i + 1) * PART) }, i: { integerValue: String(i) }, n: { integerValue: String(n) }, type: { stringValue: "application/pdf" } });
  fs_("users/" + u + "/inbox/" + id, { name: { stringValue: meta.name }, type: { stringValue: "application/pdf" }, size: { integerValue: String(meta.size) }, parts: { integerValue: String(n) }, at: { integerValue: String(meta.at) }, subject: { stringValue: meta.subject }, src: { stringValue: "mail" } });
}

// your account in the app: the one listed as the app's maker (admins/<uid>)
function uid_() {
  const P = PropertiesService.getScriptProperties();
  let u = P.getProperty("uid");
  if (u) return u;
  const r = JSON.parse(UrlFetchApp.fetch(FS + "admins?pageSize=5", { headers: auth_(), muteHttpExceptions: true }).getContentText());
  if (!r.documents || !r.documents.length) throw new Error("No account found under admins/ in the app's database: " + JSON.stringify(r).slice(0, 300));
  u = r.documents[0].name.split("/").pop();
  P.setProperty("uid", u);
  return u;
}

function fs_(path, fields) {
  const r = UrlFetchApp.fetch(FS + path, { method: "patch", contentType: "application/json", headers: auth_(), payload: JSON.stringify({ fields: fields }), muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error("Couldn't save to the app's database (" + r.getResponseCode() + "): " + r.getContentText().slice(0, 300));
}

function auth_() { return { Authorization: "Bearer " + ScriptApp.getOAuthToken(), "X-Goog-User-Project": PROJECT }; }

function parts_(p) { const out = []; (function walk(x) { if (!x) return; out.push(x); (x.parts || []).forEach(walk); })(p); return out.filter(function (x) { return x.filename; }); }
