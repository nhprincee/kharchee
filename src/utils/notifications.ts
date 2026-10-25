/**
 * Browser Notification & Vibration System for KHARCHE
 */

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";

  try {
    // Notification.requestPermission() standard promise
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    // Fallback callback for older browsers
    return new Promise((resolve) => {
      try {
        Notification.requestPermission((perm) => {
          resolve(perm);
        });
      } catch {
        resolve("denied");
      }
    });
  }
}

export function triggerVibration(pattern: number[] = [100, 50, 100]): boolean {
  if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }
  return false;
}

// Subtle synthesized audio chime using Web Audio API
export function playAlertChime(urgency: "warning" | "breach" | "test" = "warning") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = urgency === "breach" ? "sawtooth" : "sine";
    const now = ctx.currentTime;

    if (urgency === "breach") {
      // Urgent double beep
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Melodic gentle warning chime
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio context may require user gesture in some contexts
  }
}

export interface SendAlertResult {
  nativeSent: boolean;
  vibrated: boolean;
  title: string;
  body: string;
}

export function sendKharcheNotification(
  title: string,
  body: string,
  urgency: "warning" | "breach" | "test" = "warning"
): SendAlertResult {
  let nativeSent = false;
  const vibrated = triggerVibration([100, 50, 100]);
  playAlertChime(urgency);

  if (isNotificationSupported()) {
    try {
      if (Notification.permission === "granted") {
        const notif = new Notification(title, {
          body,
          icon: "https://api.iconify.design/lucide:wallet.svg?color=%2322d3ee",
          badge: "https://api.iconify.design/lucide:bell.svg?color=%23f59e0b",
          tag: `kharche-${urgency}`,
        });

        notif.onclick = () => {
          window.focus?.();
          notif.close();
        };

        // Auto close after 7 seconds
        setTimeout(() => notif.close(), 7000);
        nativeSent = true;
      }
    } catch {
      nativeSent = false;
    }
  }

  return {
    nativeSent,
    vibrated,
    title,
    body,
  };
}
