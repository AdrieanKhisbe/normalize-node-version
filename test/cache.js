import { env } from 'process'
import { writeFile, unlink } from 'fs'
import { promisify } from 'util'

import test from 'ava'
import { each } from 'test-each'
import globalCacheDir from 'global-cache-dir'

import normalizeNodeVersion from '../src/main.js'

const pWriteFile = promisify(writeFile)
const pUnlink = promisify(unlink)

// This uses a global environment variable to manipulate the cache file.
// Since this is global we:
//  - must use `test.serial()`
//  - must be done in a separate test file so it's in a different process than
//    the other tests
each(
  [
    // No cache
    { cache: undefined, input: '4', output: '4.9.1' },
    // Non-last version -> cache
    { cache: ['4.0.0', '1.2.3', '1.1.3'], input: '1.1', output: '1.1.3' },
    // Last version but no range -> cache
    { cache: ['4.0.0', '1.2.3'], input: '4.0.0', output: '4.0.0' },
    // Last version with range -> no cache
    { cache: ['4.0.0', '1.2.3'], input: '4', output: '4.9.1' },
    // Above last version -> no cache
    { cache: ['3.0.0', '1.2.3'], input: '4', output: '4.9.1' },
  ],
  ({ title }, { cache, input, output }) => {
    test.serial(`Caching | ${title}`, async t => {
      // eslint-disable-next-line fp/no-mutation
      env.TEST_CACHE_FILENAME = String(Math.random()).replace('.', '')

      const cacheDir = await globalCacheDir('normalize-node-version')
      const cacheFile = `${cacheDir}/${env.TEST_CACHE_FILENAME}`

      if (cache !== undefined) {
        await pWriteFile(cacheFile, JSON.stringify(cache))
      }

      const version = await normalizeNodeVersion(input)

      t.is(version, output)

      await pUnlink(cacheFile)

      // eslint-disable-next-line fp/no-delete
      delete env.TEST_CACHE_FILENAME
    })
  },
)
