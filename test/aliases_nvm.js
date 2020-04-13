import test from 'ava'

import normalizeNodeVersion from '../src/main.js'

// CUT, then refcator
// const VERSIONS = {
// carbon: '8.17.0',
// node: '16.12.2',
// personal: '12.12.0',
// default: '10.10.0',
// }
//

const resolveWithNvm = (versionRange) =>
  normalizeNodeVersion(versionRange, {
    nvmDir: `${__dirname}/fixtures/nvm-dir`,
  })

test("Resolve nvm alias 'default'", async (t) => {
  const versionRange = await resolveWithNvm('default')
  t.is(versionRange, '10.10.0', 'not nvm default alias')
})

test("Resolve nvm alias 'personal-alias'", async (t) => {
  const versionRange = await resolveWithNvm('personal-alias')
  t.is(versionRange, '12.12.0', 'not resolved to default node-alias')
})

test("Resolve nvm alias 'node'", async (t) => {
  const versionRange = await resolveWithNvm('node')
  t.is(versionRange, '12.16.2', 'not resolved to default node-alias')
})

test("Resolve nvm alias 'stable'", async (t) => {
  const versionRange = await resolveWithNvm('stable')
  t.is(versionRange, '12.16.2', 'not resolved to default node-alias')
})

test("Resolve nvm alias 'lts/carbon'", async (t) => {
  const versionRange = await resolveWithNvm('lts/carbon')
  t.is(versionRange, '8.17.0', 'not resolved to lts/carbon')
})

test("Resolve nvm alias 'carbon'", async (t) => {
  const versionRange = await resolveWithNvm('carbon')
  t.is(versionRange, '8.17.0', 'not resolved to lts/carbon using implicit lts')
})

test('Fails if nvm default alias if no nvm', async (t) => {
  await t.throwsAsync(
    () =>
      normalizeNodeVersion('default', {
        nvmDir: '',
      }),
    { message: 'Invalid Node version: default' },
  )
})

test('Fail to resolve nvm alias if cycle exist', async (t) => {
  const AVA_TIMEOUT_CYCLE = 2000
  t.timeout(AVA_TIMEOUT_CYCLE)
  await t.throwsAsync(() => resolveWithNvm('cycle'), {
    message: 'Nvm alias cycle detected cycle -> ping -> pong -> ping',
  })
})

test("Fail to resolve missing nvm alias 'awol' ", async (t) => {
  await t.throwsAsync(() => resolveWithNvm('awol'))
})
