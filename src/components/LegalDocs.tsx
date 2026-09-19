// Static legal copy shown inside Settings.

export const APP_VERSION = "2.0 Early";

const DOWNLOAD_POLICY = `Last Updated: August 29, 2026

This policy explains how downloads work within QBLOCK and the rules that apply when downloading games, content, updates, assets, or other files through the QBLOCK platform.

1. Official Downloads
All content downloaded through QBLOCK must be obtained through official QBLOCK systems or authorized creators. QBLOCK does not recommend downloading or installing files from unknown or unauthorized sources.

2. Game Downloads
Some QBLOCK games or experiences may require additional files to be downloaded before they can be played. These files may include maps, textures, models, sounds, scripts, updates, or other required game content. By starting a download, you agree to allow QBLOCK to download the required content to your device.

3. Updates
QBLOCK may automatically download updates or essential files when necessary to fix bugs or security issues, improve performance and stability, add new features or content, and keep games compatible with the current QBLOCK version. Updates may be required before you can continue playing certain games.

4. Creator Content
Creators may provide downloadable content for their games. Creators are responsible for ensuring that their content complies with QBLOCK's rules and applicable laws. QBLOCK may remove or restrict content that violates our policies.

5. Storage & Internet Usage
Downloading game content may use your device's storage space and internet connection. Download sizes may vary depending on the game or update. You are responsible for ensuring that your device has sufficient storage and an appropriate internet connection.

6. Security
QBLOCK may scan downloaded content for security threats and may prevent potentially harmful or unauthorized files from being installed or used. Users must not attempt to bypass QBLOCK's security systems or modify downloaded files in a way that compromises the platform or other users.

7. Unauthorized Files
You must not use QBLOCK to distribute or download malware or harmful software, stolen or unauthorized content, content designed to compromise another user's device or account, or files intended to bypass QBLOCK's security or moderation systems.

8. Download Availability
QBLOCK may limit, pause, remove, or disable downloads when necessary for maintenance, security, legal requirements, or platform stability. Certain content may also be unavailable in specific countries or regions.

9. User Responsibility
You are responsible for maintaining your device and ensuring that it meets the requirements necessary to download and run QBLOCK content. Do not share, redistribute, or commercially exploit QBLOCK files unless you have permission to do so.

10. Policy Enforcement
Violations of this policy may result in content removal, download restrictions, suspension, or termination of the user's QBLOCK account, depending on the severity of the violation. QBLOCK reserves the right to update this policy when necessary.

By downloading content through QBLOCK, you agree to follow this policy and the QBLOCK Terms of Service.`;

const TERMS_OF_SERVICE = `Last Updated: August 29, 2026

1. Your Account
You are responsible for everything that happens on your QBLOCK account, including keeping your login details private. Accounts may not be sold, shared, or transferred.

2. Using QBLOCK
Use QBLOCK lawfully and respectfully. Do not harass other players, exploit bugs, cheat, use unauthorized software, or attempt to disrupt the platform or its servers.

3. Content You Create
You keep ownership of what you create, and you grant QBLOCK a licence to host, display, and distribute it inside the platform. Do not upload content you do not have the rights to.

4. Moderation
QBLOCK may review, restrict, or remove content and may suspend or terminate accounts that break these terms or our policies, including the QBLOCK Download Policy.

5. Purchases & Currency
Virtual items and currency have no real-world value, are licensed rather than owned, and are non-refundable except where required by law.

6. Availability
QBLOCK is provided "as is". Features, games, and services may change, pause, or be discontinued at any time, and some content may be unavailable in certain regions.

7. Changes
We may update these terms. Continuing to use QBLOCK after an update means you accept the revised terms.

By using QBLOCK you agree to these Terms of Service and to the QBLOCK Download Policy.`;

export function LegalBody() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 dark:border-white/10 dark:text-white/70">
            QBLOCK {APP_VERSION}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-bold">Updated Aug 29, 2026</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-[14px] font-extrabold text-slate-900 dark:text-white">
          Terms of Service
        </h3>
        <div className="max-h-[220px] overflow-y-auto rounded-[14px] border border-black/10 dark:border-white/10 bg-[#fafbfc] dark:bg-[#15171c] p-3.5">
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            {TERMS_OF_SERVICE}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[14px] font-extrabold text-slate-900 dark:text-white">
          Download & Content Policy
        </h3>
        <div className="max-h-[220px] overflow-y-auto rounded-[14px] border border-black/10 dark:border-white/10 bg-[#fafbfc] dark:bg-[#15171c] p-3.5">
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            {DOWNLOAD_POLICY}
          </p>
        </div>
      </div>
    </div>
  );
}
