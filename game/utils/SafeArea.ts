export class SafeArea {
    /**
     * Gets the bottom safe area inset (e.g., Home Indicator on iOS).
     * Returns pixels in CSS mapping.
     */
    static get bottom(): number {
        // 1. Get CSS Environment Variable
        // Note: This requires viewport-fit=cover in meta tag
        const bottomEnv = getComputedStyle(document.documentElement).getPropertyValue("--sat"); // --sat is standard variable name often injected? No, usually env()
        // We can't read env() directly in JS easily without assigning it to a CSS var first.

        // Let's assume we injected it into :root in CSS, or just guess based on platform?
        // Better pattern: Assign env(safe-area-inset-bottom) to a CSS variable in App.css, then read it.
        const safeAreaRaw = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-bottom");
        const pxIndex = safeAreaRaw.indexOf('px');
        if (pxIndex > -1) {
            return parseFloat(safeAreaRaw);
        }
        return 0;
    }

    static get top(): number {
        const safeAreaRaw = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top");
        const pxIndex = safeAreaRaw.indexOf('px');
        if (pxIndex > -1) {
            return parseFloat(safeAreaRaw);
        }
        return 0;
    }

    /**
     * Returns true if the device likely has a notch or home bar.
     */
    static hasNotch(): boolean {
        return this.top > 20 || this.bottom > 10;
    }
}
