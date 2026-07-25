// ─────────────────────────────────────────────────────────────────────────────
// core/security/VmDetector.js — Virtual Machine Detection
// ─────────────────────────────────────────────────────────────────────────────
//
// Detects if the exam is running inside a virtual machine using a
// confidence scoring system. Checks BIOS, CPU hypervisor bit, MAC address
// prefixes, GPU models, and disk models.
//
// Returns a result object — does NOT extend BaseMonitor.
// ─────────────────────────────────────────────────────────────────────────────

const { exec } = require('child_process');
const os = require('os');

// MAC vendor prefixes for known VMs
const VM_MAC_PREFIXES = [
  '00:0c:29', '00:50:56', '00:05:69', // VMware
  '08:00:27', // VirtualBox
  '00:1c:42', // Parallels
  '52:54:00', // QEMU/KVM
];

// GPU substrings for known VMs
const VM_GPU_STRINGS = ['vmware', 'virtualbox', 'vbox', 'qemu', 'hyper-v', 'parallels', 'microsoft hyper-v', 'red hat qxl'];

// Disk substrings for known VMs
const VM_DISK_STRINGS = ['vbox', 'virtualbox', 'vmware', 'qemu', 'virtual hd', 'parallels'];

class VmDetector {
  constructor() {
    this.platform = os.platform();
  }

  /**
   * Run all VM detection checks and compute a confidence score.
   * @param {number} threshold - The score threshold to confirm a VM (e.g., 60)
   * @returns {Promise<{ isVm: boolean, confidence: number, vendor: string|null, signals: string[] }>}
   */
  async detect(threshold = 60) {
    console.log(`[VmDetector] Running VM detection (threshold: ${threshold})...`);

    let totalScore = 0;
    const signals = [];
    let primaryVendor = null;

    if (this.platform === 'win32') {
      const [cpu, bios, gpu, mac, disk] = await Promise.all([
        this._checkCpuWindows(),
        this._checkBiosWindows(),
        this._checkGpuWindows(),
        this._checkMacWindows(),
        this._checkDiskWindows()
      ]);

      if (cpu.score > 0) { totalScore += cpu.score; signals.push(cpu.signal); primaryVendor = primaryVendor || cpu.vendor; }
      if (bios.score > 0) { totalScore += bios.score; signals.push(bios.signal); primaryVendor = primaryVendor || bios.vendor; }
      if (gpu.score > 0) { totalScore += gpu.score; signals.push(gpu.signal); primaryVendor = primaryVendor || gpu.vendor; }
      if (mac.score > 0) { totalScore += mac.score; signals.push(mac.signal); primaryVendor = primaryVendor || mac.vendor; }
      if (disk.score > 0) { totalScore += disk.score; signals.push(disk.signal); primaryVendor = primaryVendor || disk.vendor; }
    } else if (this.platform === 'darwin') {
      const [hw, ioreg] = await Promise.all([
        this._checkHardwareMac(),
        this._checkIoregMac()
      ]);
      // On Mac, a direct hardware signature is usually definitive, so we give it 100 points
      if (hw.score > 0) { totalScore += hw.score; signals.push(hw.signal); primaryVendor = primaryVendor || hw.vendor; }
      if (ioreg.score > 0) { totalScore += ioreg.score; signals.push(ioreg.signal); primaryVendor = primaryVendor || ioreg.vendor; }
    } else {
      const [dmi, cpu] = await Promise.all([
        this._checkDmidecodeLinux(),
        this._checkCpuInfoLinux()
      ]);
      if (dmi.score > 0) { totalScore += dmi.score; signals.push(dmi.signal); primaryVendor = primaryVendor || dmi.vendor; }
      if (cpu.score > 0) { totalScore += cpu.score; signals.push(cpu.signal); primaryVendor = primaryVendor || cpu.vendor; }
    }

    const detected = totalScore >= threshold;

    let confidenceLevel = 'low';
    if (totalScore >= 80) confidenceLevel = 'high';
    else if (totalScore >= threshold) confidenceLevel = 'medium';

    if (detected) {
      console.warn(`[VmDetector] VM DETECTED! Score: ${totalScore}/${threshold} (Vendor: ${primaryVendor}). Indicators: ${signals.join(' | ')}`);
    } else if (totalScore > 0) {
      console.log(`[VmDetector] Suspicious signals found, but score (${totalScore}) is below threshold (${threshold}). Not flagging as VM.`);
    } else {
      console.log('[VmDetector] No VM signals detected. Running on real hardware.');
    }

    return {
      detected,
      score: totalScore,
      confidence: confidenceLevel,
      vendor: primaryVendor || (totalScore > 0 ? 'Unknown VM' : null),
      indicators: signals
    };
  }

  // ── Windows Checks ──────────────────────────────────────────────────────────

  _checkCpuWindows() {
    return new Promise((resolve) => {
      exec('systeminfo', { windowsHide: true, timeout: 15000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        if (output.includes('a hypervisor has been detected')) {
          resolve({ score: 40, signal: 'CPU Hypervisor bit detected', vendor: 'Hyper-V/Generic' });
        } else {
          resolve({ score: 0 });
        }
      });
    });
  }

  _checkBiosWindows() {
    return new Promise((resolve) => {
      exec('wmic computersystem get model,manufacturer /format:list', { windowsHide: true, timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        const vendor = this._extractVendor(output);
        if (vendor) {
          resolve({ score: 30, signal: `BIOS manufacturer matches ${vendor}`, vendor });
        } else {
          resolve({ score: 0 });
        }
      });
    });
  }

  _checkGpuWindows() {
    return new Promise((resolve) => {
      exec('wmic path Win32_VideoController get name', { windowsHide: true, timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        for (const str of VM_GPU_STRINGS) {
          if (output.includes(str)) {
            resolve({ score: 20, signal: `GPU name indicates VM (${str})`, vendor: this._extractVendor(str) });
            return;
          }
        }
        resolve({ score: 0 });
      });
    });
  }

  _checkMacWindows() {
    return new Promise((resolve) => {
      exec('wmic nic get macaddress', { windowsHide: true, timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        for (const prefix of VM_MAC_PREFIXES) {
          if (output.includes(prefix)) {
            resolve({ score: 20, signal: `MAC address prefix matches VM (${prefix})`, vendor: 'Generic VM' });
            return;
          }
        }
        resolve({ score: 0 });
      });
    });
  }

  _checkDiskWindows() {
    return new Promise((resolve) => {
      exec('wmic diskdrive get model', { windowsHide: true, timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        for (const str of VM_DISK_STRINGS) {
          if (output.includes(str)) {
            resolve({ score: 15, signal: `Disk model indicates VM (${str})`, vendor: this._extractVendor(str) });
            return;
          }
        }
        resolve({ score: 0 });
      });
    });
  }

  // ── Mac Checks ──────────────────────────────────────────────────────────────

  _checkHardwareMac() {
    return new Promise((resolve) => {
      exec('system_profiler SPHardwareDataType', { timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        const vendor = this._extractVendor(output);
        if (vendor) {
          resolve({ score: 100, signal: `System Profiler manufacturer matches ${vendor}`, vendor });
        } else {
          resolve({ score: 0 });
        }
      });
    });
  }

  _checkIoregMac() {
    return new Promise((resolve) => {
      exec('ioreg -l | grep -i -e "manufacturer" -e "product"', { timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        const vendor = this._extractVendor(output);
        if (vendor) {
          resolve({ score: 60, signal: `IORegistry manufacturer matches ${vendor}`, vendor });
        } else {
          resolve({ score: 0 });
        }
      });
    });
  }

  // ── Linux Checks ────────────────────────────────────────────────────────────

  _checkDmidecodeLinux() {
    return new Promise((resolve) => {
      exec('sudo dmidecode -s system-manufacturer 2>/dev/null || cat /sys/class/dmi/id/sys_vendor 2>/dev/null', { timeout: 10000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const output = stdout.toLowerCase();
        const vendor = this._extractVendor(output);
        if (vendor) {
          resolve({ score: 60, signal: `SMBIOS manufacturer matches ${vendor}`, vendor });
        } else {
          resolve({ score: 0 });
        }
      });
    });
  }

  _checkCpuInfoLinux() {
    return new Promise((resolve) => {
      exec('grep -c hypervisor /proc/cpuinfo 2>/dev/null', { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve({ score: 0 }); return; }
        const count = parseInt(stdout.trim(), 10);
        if (count > 0) {
          resolve({ score: 40, signal: 'CPU hypervisor flag detected', vendor: 'Hypervisor/Generic' });
        } else {
          resolve({ score: 0 });
        }
      });
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _extractVendor(text) {
    if (text.includes('vmware')) return 'VMware';
    if (text.includes('virtualbox') || text.includes('vbox') || text.includes('innotek') || text.includes('oracle vm')) return 'VirtualBox';
    if (text.includes('qemu')) return 'QEMU';
    if (text.includes('hyper-v') || text.includes('microsoft virtual')) return 'Hyper-V';
    if (text.includes('xen')) return 'Xen';
    if (text.includes('kvm') || text.includes('red hat virtio')) return 'KVM';
    if (text.includes('parallels')) return 'Parallels';
    if (text.includes('bochs')) return 'Bochs';
    if (text.includes('bhyve')) return 'bhyve';
    return null;
  }
}

module.exports = VmDetector;
