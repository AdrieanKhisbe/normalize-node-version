import { versions, cwd as getCwd, chdir } from 'process'

import test from 'ava'

import { resolveVersionRangeAlias } from '../src/aliases.js'
import normalizeNodeVersion from '../src/main.js'

const resolveInFolder = (versionRange, folder) =>
  normalizeNodeVersion(versionRange, {
    cwd: `${__dirname}/fixtures/${folder}`,
  })

test.serial('Option cwd defaults to the current directory', async (t) => {
  const currentCwd = getCwd()
  chdir(`${__dirname}/fixtures/nvmrc-project`)

  try {
    const versionRange = await normalizeNodeVersion('.')
    t.is(versionRange, '12.14.1')
  } finally {
    chdir(currentCwd)
  }
})

test('Resolve . with node-version pseudo version', async (t) => {
  const versionRange = await resolveInFolder('.', 'node-version-project')
  t.is(versionRange, '12.12.0', 'nvmrc version not resolved')
})

test('Resolve . with nvmrc pseudo version', async (t) => {
  const versionRange = await resolveInFolder('.', 'nvmrc-project')
  t.is(versionRange, '12.14.1', 'nvmrc version not resolved')
})

test('Resolve . with nave pseudo version', async (t) => {
  const versionRange = await resolveInFolder('.', 'nave-project')
  t.is(versionRange, '12.16.1', '.nave version not resolved')
})

test('Resolve . in mixed project pseudo version, .node-version having precedence over .nvmrc', async (t) => {
  const versionRange = await resolveInFolder('.', 'mixed-project')
  t.is(versionRange, '12.12.0', 'not resolved to .node-version')
})

test('Resolve . default to process.version if no version file found', async (t) => {
  const versionRange = await normalizeNodeVersion('.', {
    cwd: `${__dirname}/../src`,
  })
  t.is(versionRange, versions.node, 'not resolved to .node-version')
})

test('Resolve - current node pseudo version', async (t) => {
  const versionRange = await normalizeNodeVersion('_')

  t.is(versionRange, versions.node, 'current version not resolved correctly')
})

test("Resolve nvm alias 'default' ", async (t) => {
  const versionRange = await resolveVersionRangeAlias('default', {
    env: { NVM_DIR: `${__dirname}/fixtures/nvm-dir` },
  })
  t.is(versionRange, '10.10', 'not nvm default alias')
})

test("Resolve nvm alias 'personal-alias' ", async (t) => {
  const versionRange = await resolveVersionRangeAlias('personal-alias', {
    env: { NVM_DIR: `${__dirname}/fixtures/nvm-dir` },
  })
  t.is(versionRange, '12.12', 'not resolved to default node-alias')
})

test("Fail to resolve missing nvm alias 'awol' ", async (t) => {
  await t.throwsAsync(() =>
    resolveVersionRangeAlias('awol', {
      env: { NVM_DIR: `${__dirname}/fixtures/nvm-dir` },
    }),
  )
})

test('Pass out versionRange if no NVM_DIR configured', async (t) => {
  const versionRange = await resolveVersionRangeAlias('awol', {
    // Force shadowing of tester NVM_DIR if he a nvm user
    env: { NVM_DIR: '' },
  })
  t.is(versionRange, 'awol', 'version range was not preserved')
})

test('Transfer node version that are not aliased [fully resolved]', async (t) => {
  const versionRange = await resolveVersionRangeAlias('v12.12.0')

  t.is(versionRange, 'v12.12.0', 'current version not resolved correctly')
})

test('Transfer node version that are not aliased [major version]', async (t) => {
  const versionRange = await resolveVersionRangeAlias('12')

  t.is(versionRange, '12', 'current version not resolved correctly')
})
