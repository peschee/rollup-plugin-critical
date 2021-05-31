import {Plugin} from 'rollup';
import path from 'path';
const critical = require('critical');

const criticalSuffix = '_critical.min.css';

/**
 * Default `criticalConfig` passed in to `critical`
 */
const defaultCriticalConfig: Partial<CriticalConfig> = {
  inline: false,
  minify: true,
  extract: false,
  width: 1200,
  height: 1200,
  penthouse: {
    blockJSRequests: false
  }
};

interface CriticalPages {
  /** Combined with `criticalUrl` to determine the URLs to scrape for Critical CSS */
  uri: string;
  /** Critical CSS files are named with the `template` path, and saved to the `criticalBase` directory */
  template: string;
}

interface CriticalPluginConfig {
  /**
   * The base URL to use in combination with the `criticalPages` `uri`s to determine the URLs to scrape for Critical CSS.
   * This can also be a file system path. This is combined with `criticalPages.uri`
   * to determine pages to scrap for critical CSS.
   * Determines the `criticalConfig.src` property
   */
  criticalUrl: string;
  /**
   * The base file system path to where the generated Critical CSS file should be saved.
   * This is combined with `criticalPages.template` with `_critical.min.css` appended
   * to it to determine the saved critical CSS file name.
   * Determines the `criticalConfig.target` property
   */
  criticalBase?: string;
  /**
   * An array objects that contain the page `uri`s that are combined with the `criticalUrl` to
   * determine the URLs to scrape for Critical CSS. The resulting files are named with the
   * `template` path, and saved to the `criticalBase` directory
   */
  criticalPages: Partial<CriticalPages>[];
  /**
   * This is the full [config for critical](https://github.com/addyosmani/critical#options) that is passed
   * through to the `critical` package.
   * You may optionally override any properties you like here
   */
  criticalConfig?: Partial<CriticalConfig>;
}

/**
 * [Vite.js](https://vitejs.dev/) & [Rollup](https://rollupjs.org/) plugin for generating critical CSS
 * that uses the [critical](https://github.com/addyosmani/critical) generator under the hood.
 *
 * @param {CriticalPluginConfig} pluginConfig - the plugin configuration object
 * @param {Function} callback - callback upon completion of the critical CSS generation
 * @constructor
 */
function PluginCritical(pluginConfig: CriticalPluginConfig, callback?: Function): Plugin {
  return {
    name: 'critical',
    async writeBundle(outputOptions, bundle) {
      const css: Array<string> = [];
      // Find all of the generated CSS assets
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'asset' && chunk.fileName.endsWith('.css')) {
          const cssFile = path.join(outputOptions.dir || '', chunk.fileName);
          css.push(cssFile);
        }
      }
      // If we have no CSS, skip bundle
      if (!css.length) {
        return;
      }
      // Iterate through the pages
      for (const page of pluginConfig.criticalPages) {
        const criticalBase = pluginConfig.criticalBase;
        const criticalSrc = pluginConfig.criticalUrl + page.uri;
        const criticalDest = page.template + criticalSuffix;
        // Merge in our options
        const options = Object.assign(
            { css },
            defaultCriticalConfig,
            {
              base: criticalBase,
              src: criticalSrc,
              target: criticalDest,
            },
            pluginConfig.criticalConfig
        );
        // Generate the Critical CSS
        console.log(`Generating critical CSS from ${criticalSrc} to ${criticalDest}`);
        await critical.generate(options, (err: string) => {
          if (err) {
            console.error(err);
          }
          if (callback) {
            callback(err);
          }
        });
      }
    }
  }
}

export default PluginCritical
