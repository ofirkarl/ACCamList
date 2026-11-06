package com.ofirkarl.accamlist.send;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Opened from the app drawer: what this helper does, and a way back to AC Cam List. */
public class AboutActivity extends Activity {
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        int pad = (int) (24 * getResources().getDisplayMetrics().density);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(pad, pad, pad, pad);
        TextView title = new TextView(this);
        title.setText(R.string.app_name);
        title.setTextSize(20);
        TextView body = new TextView(this);
        body.setText(R.string.about);
        body.setTextSize(15);
        body.setPadding(0, pad / 2, 0, pad / 2);
        Button open = new Button(this);
        open.setText(R.string.open_app);
        open.setOnClickListener(v -> { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://ofirkarl.github.io/ACCamList/"))); finish(); });
        box.addView(title); box.addView(body); box.addView(open);
        box.setGravity(Gravity.START);
        setContentView(box);
    }
}
