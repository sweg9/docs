<!-- Architecture > main flow. Colors come from VitePress variables, so it follows the light and dark themes.
     Icons: Simple Icons 13.21.0 (CC0; the logos stay their owners' trademarks) and Lucide 0.460.0 (ISC). -->
<template>
  <figure class="arch-diagram">
    <svg viewBox="0 0 720 716" role="img" aria-labelledby="ad-title ad-desc">
      <title id="ad-title">Main flow between the parts</title>
      <desc id="ad-desc">
        A trigger reaches the Routine Engine and the autonomy policy on the server, which sends run.start to the
        Control Orchestrator on the hub. The orchestrator tries the wireless channel adapters first, then passes the
        Safety Guard and the motion planner to press through the RAL. The State Verifier checks the result from camera
        crops and sends it to learning, which updates the Mapping Registry.
      </desc>
      <defs>
        <marker id="ad-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" class="sd-head" />
        </marker>
        <marker id="ad-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" class="sd-head-accent" />
        </marker>
        <symbol id="ad-i-kubernetes" viewBox="0 0 24 24"><path d="M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 0 1-2.075-2.597l2.578-.437.004.005a.44.44 0 0 1 .484.606zm-.833-2.129a.44.44 0 0 0 .173-.756l.002-.011L7.585 9.7a5.143 5.143 0 0 0-.73 3.255l2.514-.725.002-.009zm1.145-1.98a.44.44 0 0 0 .699-.337l.01-.005.15-2.62a5.144 5.144 0 0 0-3.01 1.442l2.147 1.523.004-.002zm.76 2.75l.723.349.722-.347.18-.78-.5-.623h-.804l-.5.623.179.779zm1.5-3.095a.44.44 0 0 0 .7.336l.008.003 2.134-1.513a5.188 5.188 0 0 0-2.992-1.442l.148 2.615.002.001zm10.876 5.97l-5.773 7.181a1.6 1.6 0 0 1-1.248.594l-9.261.003a1.6 1.6 0 0 1-1.247-.596l-5.776-7.18a1.583 1.583 0 0 1-.307-1.34L2.1 5.573c.108-.47.425-.864.863-1.073L11.305.513a1.606 1.606 0 0 1 1.385 0l8.345 3.985c.438.209.755.604.863 1.073l2.062 8.955c.108.47-.005.963-.308 1.34zm-3.289-2.057c-.042-.01-.103-.026-.145-.034-.174-.033-.315-.025-.479-.038-.35-.037-.638-.067-.895-.148-.105-.04-.18-.165-.216-.216l-.201-.059a6.45 6.45 0 0 0-.105-2.332 6.465 6.465 0 0 0-.936-2.163c.052-.047.15-.133.177-.159.008-.09.001-.183.094-.282.197-.185.444-.338.743-.522.142-.084.273-.137.415-.242.032-.024.076-.062.11-.089.24-.191.295-.52.123-.736-.172-.216-.506-.236-.745-.045-.034.027-.08.062-.111.088-.134.116-.217.23-.33.35-.246.25-.45.458-.673.609-.097.056-.239.037-.303.033l-.19.135a6.545 6.545 0 0 0-4.146-2.003l-.012-.223c-.065-.062-.143-.115-.163-.25-.022-.268.015-.557.057-.905.023-.163.061-.298.068-.475.001-.04-.001-.099-.001-.142 0-.306-.224-.555-.5-.555-.275 0-.499.249-.499.555l.001.014c0 .041-.002.092 0 .128.006.177.044.312.067.475.042.348.078.637.056.906a.545.545 0 0 1-.162.258l-.012.211a6.424 6.424 0 0 0-4.166 2.003 8.373 8.373 0 0 1-.18-.128c-.09.012-.18.04-.297-.029-.223-.15-.427-.358-.673-.608-.113-.12-.195-.234-.329-.349-.03-.026-.077-.062-.111-.088a.594.594 0 0 0-.348-.132.481.481 0 0 0-.398.176c-.172.216-.117.546.123.737l.007.005.104.083c.142.105.272.159.414.242.299.185.546.338.743.522.076.082.09.226.1.288l.16.143a6.462 6.462 0 0 0-1.02 4.506l-.208.06c-.055.072-.133.184-.215.217-.257.081-.546.11-.895.147-.164.014-.305.006-.48.039-.037.007-.09.02-.133.03l-.004.002-.007.002c-.295.071-.484.342-.423.608.061.267.349.429.645.365l.007-.001.01-.003.129-.029c.17-.046.294-.113.448-.172.33-.118.604-.217.87-.256.112-.009.23.069.288.101l.217-.037a6.5 6.5 0 0 0 2.88 3.596l-.09.218c.033.084.069.199.044.282-.097.252-.263.517-.452.813-.091.136-.185.242-.268.399-.02.037-.045.095-.064.134-.128.275-.034.591.213.71.248.12.556-.007.69-.282v-.002c.02-.039.046-.09.062-.127.07-.162.094-.301.144-.458.132-.332.205-.68.387-.897.05-.06.13-.082.215-.105l.113-.205a6.453 6.453 0 0 0 4.609.012l.106.192c.086.028.18.042.256.155.136.232.229.507.342.84.05.156.074.295.145.457.016.037.043.09.062.129.133.276.442.402.69.282.247-.118.341-.435.213-.71-.02-.039-.045-.096-.065-.134-.083-.156-.177-.261-.268-.398-.19-.296-.346-.541-.443-.793-.04-.13.007-.21.038-.294-.018-.022-.059-.144-.083-.202a6.499 6.499 0 0 0 2.88-3.622c.064.01.176.03.213.038.075-.05.144-.114.28-.104.266.039.54.138.87.256.154.06.277.128.448.173.036.01.088.019.13.028l.009.003.007.001c.297.064.584-.098.645-.365.06-.266-.128-.537-.423-.608zM16.4 9.701l-1.95 1.746v.005a.44.44 0 0 0 .173.757l.003.01 2.526.728a5.199 5.199 0 0 0-.108-1.674A5.208 5.208 0 0 0 16.4 9.7zm-4.013 5.325a.437.437 0 0 0-.404-.232.44.44 0 0 0-.372.233h-.002l-1.268 2.292a5.164 5.164 0 0 0 3.326.003l-1.27-2.296h-.01zm1.888-1.293a.44.44 0 0 0-.27.036.44.44 0 0 0-.214.572l-.003.004 1.01 2.438a5.15 5.15 0 0 0 2.081-2.615l-2.6-.44-.004.005z" /></symbol>
        <symbol id="ad-l-zap" viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></symbol>
        <symbol id="ad-l-repeat" viewBox="0 0 24 24"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></symbol>
        <symbol id="ad-l-scale" viewBox="0 0 24 24"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></symbol>
        <symbol id="ad-l-database" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></symbol>
        <symbol id="ad-l-trending-up" viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></symbol>
        <symbol id="ad-l-camera" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></symbol>
        <symbol id="ad-l-scan-search" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /><path d="m16 16-1.9-1.9" /></symbol>
        <symbol id="ad-l-split" viewBox="0 0 24 24"><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" /></symbol>
        <symbol id="ad-l-radio" viewBox="0 0 24 24"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" /></symbol>
        <symbol id="ad-l-shield-check" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></symbol>
        <symbol id="ad-l-badge-check" viewBox="0 0 24 24"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></symbol>
        <symbol id="ad-l-crosshair" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="22" x2="18" y1="12" y2="12" /><line x1="6" x2="2" y1="12" y2="12" /><line x1="12" x2="12" y1="6" y2="2" /><line x1="12" x2="12" y1="22" y2="18" /></symbol>
        <symbol id="ad-l-hand" viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></symbol>
        <symbol id="ad-l-lightbulb" viewBox="0 0 24 24"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></symbol>
        <symbol id="ad-l-toggle-right" viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="6" rx="6" ry="6" /><circle cx="16" cy="12" r="2" /></symbol>
        <symbol id="ad-l-laptop" viewBox="0 0 24 24"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" /></symbol>
      </defs>

      <rect class="sd-group" x="10" y="40" width="700" height="210" rx="10" />
      <use href="#ad-i-kubernetes" class="sd-brand sd-c-kubernetes" x="24" y="46" width="18" height="18" />
      <text class="sd-group-label" x="48" y="60">server · a pod on k8s</text>
      <rect class="sd-group" x="10" y="270" width="700" height="292" rx="10" />
      <use href="#ad-l-laptop" class="sd-line-icon" x="24" y="276" width="18" height="18" />
      <text class="sd-group-label" x="48" y="290">hub · on the laptop, outside k8s</text>
      <rect class="sd-zone" x="10" y="576" width="700" height="92" rx="10" />
      <text class="sd-zone-label" x="696" y="662" text-anchor="end">In the room</text>
      <rect class="sd-box" x="44" y="80" width="186" height="56" rx="8" />
      <use href="#ad-l-zap" class="sd-line-icon" x="56" y="97" width="22" height="22" />
      <text class="sd-title" x="86" y="104">Trigger</text>
      <text class="sd-sub" x="86" y="121">time, sensor, routine</text>
      <rect class="sd-box" x="260" y="80" width="200" height="56" rx="8" />
      <use href="#ad-l-repeat" class="sd-line-icon" x="272" y="97" width="22" height="22" />
      <text class="sd-title" x="302" y="104">Routine Engine</text>
      <text class="sd-sub" x="302" y="121">habits · FR-04, FR-05</text>
      <rect class="sd-box" x="490" y="80" width="210" height="56" rx="8" />
      <use href="#ad-l-scale" class="sd-line-icon" x="502" y="97" width="22" height="22" />
      <text class="sd-title" x="532" y="104">Autonomy policy</text>
      <text class="sd-sub" x="532" y="121">act/ask/suggest · FR-06</text>
      <rect class="sd-box" x="44" y="160" width="186" height="56" rx="8" />
      <use href="#ad-l-trending-up" class="sd-line-icon" x="56" y="177" width="22" height="22" />
      <text class="sd-title" x="86" y="184">Learning and log</text>
      <text class="sd-sub" x="86" y="201">scores, log · FR-12</text>
      <rect class="sd-box" x="260" y="160" width="200" height="56" rx="8" />
      <use href="#ad-l-database" class="sd-line-icon" x="272" y="177" width="22" height="22" />
      <text class="sd-title" x="302" y="184">Mapping Registry</text>
      <text class="sd-sub" x="302" y="201">Verified links · FR-02</text>
      <rect class="sd-box" x="44" y="310" width="186" height="56" rx="8" />
      <use href="#ad-l-camera" class="sd-line-icon" x="56" y="327" width="22" height="22" />
      <text class="sd-title" x="86" y="334">Camera</text>
      <text class="sd-sub" x="86" y="351">frames stay here</text>
      <rect class="sd-box" x="260" y="310" width="200" height="56" rx="8" />
      <use href="#ad-l-scan-search" class="sd-line-icon" x="272" y="327" width="22" height="22" />
      <text class="sd-title" x="302" y="334">Recognition</text>
      <text class="sd-sub" x="302" y="351">YOLO, DINOv2 · FR-01</text>
      <rect class="sd-box sd-strong" x="490" y="310" width="210" height="56" rx="8" />
      <use href="#ad-l-split" class="sd-line-icon" x="502" y="327" width="22" height="22" />
      <text class="sd-title" x="532" y="334">Orchestrator</text>
      <text class="sd-sub" x="532" y="351">channel order · FR-07</text>
      <rect class="sd-box" x="44" y="400" width="186" height="56" rx="8" />
      <use href="#ad-l-badge-check" class="sd-line-icon" x="56" y="417" width="22" height="22" />
      <text class="sd-title" x="86" y="424">State Verifier</text>
      <text class="sd-sub" x="86" y="441">result check · FR-08</text>
      <rect class="sd-box" x="260" y="400" width="200" height="56" rx="8" />
      <use href="#ad-l-radio" class="sd-line-icon" x="272" y="417" width="22" height="22" />
      <text class="sd-title" x="302" y="424">Channel adapters</text>
      <text class="sd-sub" x="302" y="441">IR, Wi-Fi, BT · FR-03</text>
      <rect class="sd-box sd-strong" x="490" y="400" width="210" height="56" rx="8" />
      <use href="#ad-l-shield-check" class="sd-line-icon" x="502" y="417" width="22" height="22" />
      <text class="sd-title" x="532" y="424">Safety Guard</text>
      <text class="sd-sub" x="532" y="441">people, risk · FR-10</text>
      <rect class="sd-box" x="260" y="490" width="200" height="56" rx="8" />
      <use href="#ad-l-hand" class="sd-line-icon" x="272" y="507" width="22" height="22" />
      <text class="sd-title" x="302" y="514">Hand (RAL)</text>
      <text class="sd-sub" x="302" y="531">press · FR-11</text>
      <rect class="sd-box" x="490" y="490" width="210" height="56" rx="8" />
      <use href="#ad-l-crosshair" class="sd-line-icon" x="502" y="507" width="22" height="22" />
      <text class="sd-title" x="532" y="514">Motion planner</text>
      <text class="sd-sub" x="532" y="531">actuator, push · FR-09</text>
      <rect class="sd-box" x="44" y="600" width="186" height="56" rx="8" />
      <use href="#ad-l-lightbulb" class="sd-line-icon" x="56" y="617" width="22" height="22" />
      <text class="sd-title" x="86" y="624">Lamp, fan</text>
      <text class="sd-sub" x="86" y="641">the device</text>
      <rect class="sd-box" x="260" y="600" width="200" height="56" rx="8" />
      <use href="#ad-l-toggle-right" class="sd-line-icon" x="272" y="617" width="22" height="22" />
      <text class="sd-title" x="302" y="624">Wall switch</text>
      <text class="sd-sub" x="302" y="641">pressed</text>
      <path class="sd-edge" d="M230 108 H260" marker-end="url(#ad-arrow)" />
      <path class="sd-edge" d="M460 108 H490" marker-end="url(#ad-arrow)" />
      <path class="sd-edge" d="M460 188 H560 V136" marker-end="url(#ad-arrow)" />
      <text class="sd-edge-label" x="514" y="206" text-anchor="middle">Verified mapping</text>
      <path class="sd-edge" d="M230 188 H260" marker-end="url(#ad-arrow)" />
      <path class="sd-edge sd-accent" d="M640 136 V310" marker-end="url(#ad-arrow-accent)" />
      <text class="sd-edge-label sd-accent-text" x="648" y="232">run.start</text>
      <path class="sd-edge" d="M230 338 H260" marker-end="url(#ad-arrow)" />
      <path class="sd-edge sd-accent" d="M360 310 V216" marker-end="url(#ad-arrow-accent)" />
      <text class="sd-edge-label sd-accent-text" x="368" y="262">candidates</text>
      <path class="sd-edge" d="M490 352 H475 V428 H460" marker-end="url(#ad-arrow)" />
      <text class="sd-edge-label" x="471" y="392" text-anchor="end">1 · wireless</text>
      <path class="sd-edge" d="M595 366 V400" marker-end="url(#ad-arrow)" />
      <text class="sd-edge-label" x="603" y="388">2 · press</text>
      <path class="sd-edge" d="M595 456 V490" marker-end="url(#ad-arrow)" />
      <path class="sd-edge" d="M490 518 H460" marker-end="url(#ad-arrow)" />
      <path class="sd-edge" d="M130 366 V400" marker-end="url(#ad-arrow)" />
      <text class="sd-edge-label" x="138" y="388">crops</text>
      <path class="sd-edge sd-accent" d="M44 428 H20 V188 H44" marker-end="url(#ad-arrow-accent)" />
      <text class="sd-edge-label sd-accent-text" x="24" y="236">result</text>
      <path class="sd-edge" d="M360 546 V600" marker-end="url(#ad-arrow)" />
      <path class="sd-edge" d="M260 628 H230" marker-end="url(#ad-arrow)" />
      <path class="sd-edge" d="M260 428 H245 V580 H130 V600" marker-end="url(#ad-arrow)" />
      <text class="sd-edge-label" x="140" y="594">wireless</text>
      <path class="sd-edge" d="M30 696 H66" marker-end="url(#ad-arrow)" />
      <text class="sd-sub" x="74" y="700">inside one mode</text>
      <path class="sd-edge sd-accent" d="M200 696 H236" marker-end="url(#ad-arrow-accent)" />
      <text class="sd-sub" x="244" y="700">between hub and server (hub messages)</text>
    </svg>
  </figure>
</template>

<style scoped>
.arch-diagram {
  margin: 16px 0;
  overflow-x: auto;
}
.arch-diagram svg {
  display: block;
  width: 100%;
  min-width: 560px;
  max-width: 720px;
  margin: 0 auto;
  height: auto;
  font-family: var(--vp-font-family-base);
}
.sd-zone { fill: none; stroke: var(--vp-c-text-3); stroke-width: 1.5; stroke-dasharray: 6 4; }
.sd-zone-label { fill: var(--vp-c-text-2); font-size: 13px; font-weight: 600; }
.sd-group { fill: var(--vp-c-default-soft); stroke: var(--vp-c-divider); stroke-width: 1.5; }
.sd-group-label { fill: var(--vp-c-text-1); font-size: 13px; font-weight: 600; }
.sd-ns { fill: var(--vp-c-bg); stroke: var(--vp-c-divider); stroke-width: 1; }
.sd-ns-label { fill: var(--vp-c-text-2); font-size: 12px; font-family: var(--vp-font-family-mono); }
.sd-box { fill: var(--vp-c-bg-soft); stroke: var(--vp-c-text-3); stroke-width: 1.2; }
.sd-strong { stroke: var(--vp-c-brand-1); stroke-width: 1.8; }
.sd-data { fill: var(--vp-c-bg-alt); }
.sd-planned { stroke-dasharray: 5 4; fill: var(--vp-c-bg); }
.sd-title { fill: var(--vp-c-text-1); font-size: 14px; font-weight: 600; }
.sd-sub { fill: var(--vp-c-text-2); font-size: 12px; }
.sd-edge { fill: none; stroke: var(--vp-c-text-2); stroke-width: 1.4; }
.sd-planned-edge { stroke-dasharray: 5 4; }
.sd-accent { stroke: var(--vp-c-brand-1); stroke-width: 2; }
.sd-head { fill: var(--vp-c-text-2); }
.sd-head-accent { fill: var(--vp-c-brand-1); }
.sd-edge-label { fill: var(--vp-c-text-2); font-size: 12px; }
.sd-accent-text { fill: var(--vp-c-brand-1); font-weight: 600; }
.sd-brand { stroke: none; }
.sd-c-kubernetes { fill: #326ce5; }
.sd-c-docker { fill: #2496ed; }
.sd-c-traefikproxy { fill: #24a1c1; }
.sd-c-fastapi { fill: #009688; }
.sd-c-sqlite { fill: #003b57; }
.sd-c-nginx { fill: #009639; }
.sd-c-grafana { fill: #f46800; }
.sd-c-python { fill: #3776ab; }
.sd-c-uv { fill: #de5fe9; }
.sd-c-opencv { fill: #5c3ee8; }
.sd-c-arduino { fill: #00878f; }
:global(.dark) .sd-c-sqlite { fill: #6cb4dc; }
:global(.dark) .sd-c-python { fill: #5a9bd5; }
:global(.dark) .sd-c-opencv { fill: #8b74f2; }
.sd-line-icon { fill: none; stroke: var(--vp-c-text-2); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
