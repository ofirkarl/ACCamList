package com.ofirkarl.accamlist.send;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

/** Lets the app picked in the share menu read the file, and only that folder's files, by name and size. */
public class SharedFiles extends ContentProvider {
    static File dir(Context c) { File d = new File(c.getCacheDir(), "send"); d.mkdirs(); return d; }

    static String safeName(String n) {
        if (n == null || n.trim().isEmpty()) n = "Camera list.docx";
        n = n.replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]", " ").trim();
        if (n.length() > 120) n = n.substring(n.length() - 120);
        return n;
    }

    static String typeOf(String name) {
        String n = name.toLowerCase();
        if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (n.endsWith(".csv")) return "text/csv";
        return "application/octet-stream";
    }

    private File fileFor(Uri uri) throws FileNotFoundException {
        String name = uri.getLastPathSegment();
        if (name == null) throw new FileNotFoundException();
        try {
            File d = dir(getContext()).getCanonicalFile(), f = new File(d, name).getCanonicalFile();
            if (!d.equals(f.getParentFile()) || !f.isFile()) throw new FileNotFoundException();
            return f;
        } catch (IOException e) { throw new FileNotFoundException(); }
    }

    @Override public boolean onCreate() { return true; }

    @Override public String getType(Uri uri) { String n = uri.getLastPathSegment(); return n == null ? null : typeOf(n); }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(fileFor(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override public Cursor query(Uri uri, String[] projection, String sel, String[] args, String sort) {
        File f;
        try { f = fileFor(uri); } catch (FileNotFoundException e) { return null; }
        MatrixCursor c = new MatrixCursor(new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE });
        c.addRow(new Object[] { f.getName(), f.length() });
        return c;
    }

    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
