package com.ofirkarl.accamlist.send;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;

/** Takes the file AC Cam List hands over (name, type, message, the file itself in base64) and opens the share menu with it attached. */
public class SendActivity extends Activity {
    static final String AUTHORITY = "com.ofirkarl.accamlist.send.files";

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        try {
            Intent in = getIntent();
            String name = SharedFiles.safeName(in.getStringExtra("name"));
            String mime = in.getStringExtra("mime");
            String data = in.getStringExtra("data");
            if (data == null || data.isEmpty()) throw new IllegalArgumentException("no file");
            if (mime == null || mime.isEmpty()) mime = SharedFiles.typeOf(name);
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            File dir = SharedFiles.dir(this);
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) if (System.currentTimeMillis() - f.lastModified() > 86400000L) f.delete();
            File file = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
            Uri uri = Uri.parse("content://" + AUTHORITY + "/" + Uri.encode(name));
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            String subject = in.getStringExtra("subject"), text = in.getStringExtra("text");
            if (subject != null) send.putExtra(Intent.EXTRA_SUBJECT, subject);
            if (text != null) send.putExtra(Intent.EXTRA_TEXT, text);
            send.setClipData(ClipData.newRawUri(name, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            String app = in.getStringExtra("app");  // "whatsapp": straight to WhatsApp, to pick the chat there
            if ("whatsapp".equals(app)) {
                send.setPackage("com.whatsapp");
                try { startActivity(send); finish(); return; } catch (ActivityNotFoundException e) { send.setPackage(null); }
            }
            Intent chooser = Intent.createChooser(send, name);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(chooser);
        } catch (Exception e) {
            Toast.makeText(this, getString(R.string.failed), Toast.LENGTH_LONG).show();
        }
        finish();
    }
}
