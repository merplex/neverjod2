package com.neverjod.app;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioPlugin")
public class AudioPlugin extends Plugin {

    private int savedVolume = -1;

    @PluginMethod
    public void muteBeep(PluginCall call) {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                savedVolume = am.getStreamVolume(AudioManager.STREAM_NOTIFICATION);
                am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, 0);
            }
        } catch (Exception e) {
            // Ignore — muting is best-effort
        }
        call.resolve();
    }

    @PluginMethod
    public void unmuteBeep(PluginCall call) {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am != null && savedVolume >= 0) {
                am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, savedVolume, 0);
                savedVolume = -1;
            }
        } catch (Exception e) {
            // Ignore
        }
        call.resolve();
    }
}
