/**
 * Represents plugin options
 */
interface HawkVitePluginOptions {
  /**
   * Hawk integration token
   */
  token: string;

  /**
   * Unique identifier of the release
   */
  release?: string;

  /**
   * Whether to remove sourcemaps after uploading
   */
  removeSourceMaps?: boolean;

  /**
   * Sourcemaps collector endpoint overwrite
   */
  collectorEndpoint?: string
}

/**
 * Vite plugin that uploads sourcemaps to Hawk
 * and exposes release id to be available in global scope
 * @param options - plugin options
 */
declare function hawkVitePlugin(options: HawkVitePluginOptions): unknown;

export = hawkVitePlugin
