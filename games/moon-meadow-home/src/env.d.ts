/// <reference types="svelte" />
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MENU_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
/** Set by vite.config.ts `define`. */
declare const __BUILD_ID__: string;
declare const __TEST_BUILD__: boolean;
