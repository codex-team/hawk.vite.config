import fs from 'fs/promises';
import { consoleColors, wrapInColor, log } from './utils/log.js';

/**
 * Vite plugin that uploads sourcemaps to Hawk
 *
 * @param opts - plugin options
 * @param opts.token - Hawk integration token
 * @param [opts.release] - unique identifier of the release
 * @param [opts.removeSourceMaps] - true if the plugin should remove emitted source map files
 * @param [opts.collectorEndpoint] - sourcemaps collector enpoint overwrite
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

  let outDir;

  return {
    name: 'hawk-vite-plugin',
    config: (config) => {
      /**
       * Save build dir
       */
      outDir = config.build.outDir || 'dist';

      /**
       * Add sourcemap setting to vite config
       */
      return {
        build: {
          sourcemap: true,
        },
      };
    },
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
      throw new Error(responseData.error);
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
