import fs from 'fs/promises';
import MagicString from 'magic-string';
import { consoleColors, wrapInColor, log } from './utils/log.js';

const virtualModuleId = 'virtual:hawk/globals';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

/**
 * Vite plugin that uploads sourcemaps to Hawk
 * and exposes release id to be available in global scope
 *
 * @param opts - plugin options
 * @param opts.token - Hawk integration token
 * @param [opts.release] - unique identifier of the release
 * @param [opts.removeSourceMaps] - true if the plugin should remove emitted source map files
 * @param [opts.collectorEndpoint] - sourcemaps collector endpoint overwrite
 * @returns plugin definition
 */
export default function hawkVitePlugin({
  token,
  release,
  removeSourceMaps = true,
  collectorEndpoint,
}) {
  if (!token) {
    console.error('Invalid integration token specified.');

    return;
  }

  if (!collectorEndpoint) {
    const integrationId = getIntegrationId(token);

    collectorEndpoint = `https://${integrationId}.k1.hawk.so/release`;
  }

  if (!release) {
    release = new Date();
  }

  let outDir = 'dist';

  return {
    name: 'hawk-vite-plugin',
    config: (config) => {
      /**
       * Save build dir
       */
      if (config.build && config.build.outDir) {
        outDir = config.build.outDir;
      }

      /**
       * Add sourcemap setting to vite config
       */
      return {
        build: {
          sourcemap: removeSourceMaps ? 'hidden' : true,
        },
      };
    },

    resolveId: (id) => {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    /**
     * Replaces import of virtual module with injection code
     *
     * @param {string} id - module id
     * @returns {string|undefined}
     */
    load: (id) => {
      if (id === resolvedVirtualModuleId) {
        return getInjectionCode(release);
      }
    },

    /**
     * Adds virtual module import to a script file
     *
     * @param {string} code - module source code
     * @param {string} id - module id
     * @returns transformation result
     */
    transform: (code, id) => {
      if (id === resolvedVirtualModuleId) {
        return;
      }

      if (id.includes('node_modules')) {
        return;
      }

      /* Id without params and hashes */
      const pureId = id.split(/[?|#]/).shift();

      const scriptExt = ['.js', '.ts', '.jsx', '.tsx', '.mjs'];

      const isScript = !!scriptExt.find(ext => pureId.endsWith(ext));

      if (!isScript) {
        return;
      }

      const ms = new MagicString(code);

      /* Adding import to script file to later replace it with data injecting code */
      ms.append(`\n\n;import "${virtualModuleId}";`);

      return {
        code: ms.toString(),
        map: ms.generateMap({ hires: true }),
      };
    },

    /**
     * Sends soucemaps to Hawk
     *
     * @param _
     * @param {*} bundlesInfo
     */
    writeBundle: async (_, bundlesInfo) => {
      const sourceMapFiles = getSourceMapsFileNames(bundlesInfo);

      for (const file of sourceMapFiles) {
        const filePath = outDir + '/' + file;

        await sendSourceMapFile(filePath, collectorEndpoint, token, release);

        if (removeSourceMaps) {
          await deleteSourceMapFile(filePath);
        }
      }
    },
  };
}

/**
 * Returns list of sourcemap files names from bundles info
 *
 * @param {*} bundlesInfo - info on built bundles
 * @returns {string[]}
 */
function getSourceMapsFileNames(bundlesInfo) {
  return Object.values(bundlesInfo)
    .filter(item => item.type === 'asset' && item.fileName.endsWith('.map'))
    .map(item => item.fileName);
}

/**
 * Sends single sourcemap file to Hawk collector
 *
 * @param {string} filePath - path to file to send
 * @param {string} collectorEndpoint - endpoint where file should be sent
 * @param {string} token - integration token
 * @param {string} releaseId - release id
 */
async function sendSourceMapFile(filePath, collectorEndpoint, token, releaseId) {
  const filename = filePath.split('/').pop();

  const file = await fs.readFile(filePath, { encoding: 'utf8' });
  const data = new Blob([ file ]);

  const formData = new FormData();

  formData.set('release', releaseId);
  formData.append('file', data, filename);

  try {
    const response = await fetch(collectorEndpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseData = await response.json();

    if (responseData.error) {
      throw new Error(responseData.message ?? responseData.error ?? 'Untitled error');
    }

    log(filePath + ' – ' + wrapInColor('sent', consoleColors.fgGreen), consoleColors.fgCyan, true);
  } catch (error) {
    log('(⌐■_■) Sending ' + filePath + ' failed: \n\n' + error.message, consoleColors.fgRed);
  }
}

/**
 * Returns integration id from integration token
 *
 * @param integrationToken - Hawk integration token
 * @returns {string|undefined}
 */
function getIntegrationId(integrationToken) {
  try {
    const decodedIntegrationTokenAsString = Buffer
      .from(integrationToken, 'base64')
      .toString('utf-8');
    const decodedIntegrationToken = JSON.parse(decodedIntegrationTokenAsString);
    const integrationId = decodedIntegrationToken.integrationId;

    if (!integrationId || integrationId === '') {
      throw new Error('Invalid Integration Token');
    }

    return integrationId;
  } catch (error) {
    console.error('Invalid Integration token');
  }
}

/**
 * Removes single source map file
 *
 * @param {string} file - sourcemap file
 */
async function deleteSourceMapFile(file) {
  await fs.unlink(file);
  log(`Map ${file} deleted`, consoleColors.fgCyan, true);
}

/**
 * Returns code for injecting release id value to global scope
 *
 * @param release - release id
 * @returns {string}
 */
function getInjectionCode(release) {
  const code = `
    var _global =
      typeof window !== 'undefined' ?
        window :
        typeof global !== 'undefined' ?
          global :
          typeof self !== 'undefined' ?
            self :
            {};

    _global.HAWK_RELEASE="${release}";`;

  return code;
}
