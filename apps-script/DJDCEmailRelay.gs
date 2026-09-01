const DJDC_RELAY_SECRET_PROPERTY = "DJDC_RELAY_SECRET";
const DJDC_SENT_PREFIX = "sent:";
const DJDC_REPLAY_WINDOW_MS = 5 * 60 * 1000;
const DJDC_SENT_RETENTION_MS = 45 * 24 * 60 * 60 * 1000;

function doPost(e) {
  try {
    const request = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    const timestamp = Number(request.timestamp);
    const payloadJson = typeof request.payloadJson === "string" ? request.payloadJson : "";
    const requestSecret = typeof request.secret === "string" ? request.secret : "";
    const secret = PropertiesService.getScriptProperties().getProperty(DJDC_RELAY_SECRET_PROPERTY);
    if (!secret || !Number.isFinite(timestamp) || !payloadJson || !requestSecret) return jsonResponse({ ok: false, error: "Invalid relay request." });
    if (Math.abs(Date.now() - timestamp) > DJDC_REPLAY_WINDOW_MS) return jsonResponse({ ok: false, error: "Expired relay request." });
    if (!constantTimeEquals(secret, requestSecret)) return jsonResponse({ ok: false, error: "Unauthorized relay request." });

    const payload = JSON.parse(payloadJson);
    validatePayload(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const properties = PropertiesService.getScriptProperties();
      removeExpiredSentRecords(properties);
      const sentKey = `${DJDC_SENT_PREFIX}${payload.requestId}`;
      const sentRecord = properties.getProperty(sentKey);
      if (sentRecord) return jsonResponse({ ok: true, messageId: sentRecord.split("|")[1], duplicate: true });
      if (MailApp.getRemainingDailyQuota() < 1) return jsonResponse({ ok: false, error: "Daily Gmail recipient quota is exhausted." });
      MailApp.sendEmail({ to: payload.to, subject: payload.subject, body: payload.text, htmlBody: payload.html, name: "Digital Junction Development Co.", replyTo: payload.replyTo || Session.getActiveUser().getEmail() });
      const messageId = payload.requestId;
      properties.setProperty(sentKey, `${Date.now()}|${messageId}`);
      return jsonResponse({ ok: true, messageId });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "Email relay could not send the requested message." });
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Missing email payload.");
  ["requestId", "to", "subject", "text", "html", "messageType"].forEach(key => {
    if (typeof payload[key] !== "string" || !payload[key].trim()) throw new Error(`Missing ${key}.`);
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.to)) throw new Error("Invalid recipient.");
  if (payload.replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.replyTo)) throw new Error("Invalid reply-to address.");
  if (/[\r\n]/.test(payload.subject)) throw new Error("Invalid email subject.");
}

function removeExpiredSentRecords(properties) {
  const now = Date.now();
  const expiredKeys = Object.keys(properties.getProperties()).filter(key => {
    if (!key.startsWith(DJDC_SENT_PREFIX)) return false;
    const storedAt = Number((properties.getProperty(key) || "").split("|")[0]);
    return !Number.isFinite(storedAt) || now - storedAt > DJDC_SENT_RETENTION_MS;
  });
  expiredKeys.forEach(key => properties.deleteProperty(key));
}

function constantTimeEquals(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
