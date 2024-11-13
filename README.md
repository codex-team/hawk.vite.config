# Hawk Vite Plugin

Vite plugin for sending releases with sourcemaps to Hawk.

## Install

```shell
yarn add @hawk.so/vite-plugin -D
```

## Connect

Include the plugin to the plugins list of `vite.config` file

```js
import hawkVitePlugin from '@hawk.so/vite-plugin';

export default defineConfig({
  plugins: [
    ...,
    hawkVitePlugin({
      token: '' // Your project's Integration Token
    })
  ]
})
```

### Plugin options

| name | type | required | description |
| -- | -- | -- | -- |
| `token` | string | **required** | Your project's Integration Token |
| `release` | string/number | optional | Unique identifier of the release. Used for source map consuming (see below) |
| `removeSourceMaps` | boolean | optional | Shows if the plugin should remove emitted source map files. Default is `true` |
| `collectorEndpoint` | string | optional | Sourcemaps collector endpoint overwrite |

### Connect Release to JavaScript catcher

After plugin finish its work, it will export release information to the global scope. 
You can access release identifier via `window.HAWK_RELEASE` in browser and `global.HAWK_RELEASE` in NodeJS and pass this data to the JavaScript Catcher on initialization.

#### TypeScript

To make TypeScript see typings for `window.HAWK_RELEASE` and `global.HAWK_RELEASE` their declaration in your "tsconfig.json"

```json
{
  "compilerOptions" : {
    "types": {
      "@hawk.so/vite-plugin/global"
    }
  }
}
```



