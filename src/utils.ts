import { Order } from './types';

/**
 * Checks if the business is currently open (5:00 AM to 11:00 PM)
 */
export function isStoreOpen(): boolean {
  const forceState = typeof window !== 'undefined' ? localStorage.getItem('lx_store_force_state') : null;
  if (forceState === 'open') return true;
  if (forceState === 'closed') return false;

  const now = new Date();
  const hours = now.getHours();
  // 5 AM (5) to 11 PM (23)
  return hours >= 5 && hours < 23;
}

/**
 * Returns a friendly text describing store availability
 */
export function getStoreStatusText(): string {
  if (isStoreOpen()) {
    return 'Open Now (Delivering until 11:00 PM)';
  } else {
    return 'Closed (Delivering 5:00 AM - 11:00 PM)';
  }
}

/**
 * Generates the next sequential Order ID in the format LX20260001
 */
export function generateOrderId(existingOrders: Order[]): string {
  const currentYear = new Date().getFullYear();
  
  // Find highest number from existing order IDs for current year
  let maxSeq = 0;
  const prefix = `LX${currentYear}`;
  
  existingOrders.forEach(o => {
    if (o.id.startsWith(prefix)) {
      const seqStr = o.id.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  // Pad with leading zeros to make it 4 digits, e.g. "0001"
  const seqPadded = String(nextSeq).padStart(4, '0');
  return `${prefix}${seqPadded}`;
}

/**
 * Formats current date as DD-MM-YYYY
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats current time as HH:MM AM/PM
 */
export function getFormattedTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Plays a clean, friendly synthesized notification sound using browser AudioContext
 * Works 100% offline and requires zero external assets.
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Play a friendly double chime (ding-dong!)
    const now = ctx.currentTime;
    
    // First chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5 note
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Second chime, slightly delayed and higher pitch
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.15); // C6 note
    gain2.gain.setValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);
  } catch (error) {
    console.warn('AudioContext failed to play sound:', error);
  }
}

/**
 * Exports JSON data to a downloadable CSV file
 */
export function exportToCSV(data: any[], headers: string[], filename: string) {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add headers
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
  
  // Add rows
  data.forEach(row => {
    const rowStr = row.map((val: any) => {
      const cleanVal = val === null || val === undefined ? '' : String(val);
      return `"${cleanVal.replace(/"/g, '""')}"`;
    }).join(",");
    csvContent += rowStr + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
