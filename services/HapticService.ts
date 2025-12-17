export class HapticService {
    public static enabled: boolean = true;

    /**
     * Trigger a haptic feedback pattern
     * @param pattern Vibrate pattern (ms)
     */
    public static vibrate(pattern: number | number[]) {
        if (!this.enabled || !navigator.vibrate) return;
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Ignore errors on unsupported devices
        }
    }

    // Presets
    public static light() { this.vibrate(10); }     // UI Click
    public static medium() { this.vibrate(40); }    // Dash / Hit
    public static heavy() { this.vibrate([80, 50, 80]); } // Explosion / Death
}
