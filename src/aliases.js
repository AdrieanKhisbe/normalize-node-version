import { promises as fs } from 'fs'
import { version as processVersion, env as processEnv } from 'process'

import findUp from 'find-up'
import { coerce } from 'semver'

export const NODE_VERSION_ALIAS = '.'
export const NODE_VERSION_FILES = ['.node-version', '.nvmrc', '.naverc']
export const NODE_LTS_CODE_NAMES = [
  'Argon',
  'Boron',
  'Carbon',
  'Dubnium',
  'Erbium',
  'Fermium',
  'Gallium',
  'Hydrogen',
  'Iron',
]
// v4 to v20 LTS retrieved from https://github.com/nodejs/Release/blob/master/CODENAMES.md

export const CURRENT_NODE_ALIAS = '_'

export const getVersionFromFile = async (filePath) => {
  if (filePath === undefined) return

  const fileContent = await fs.readFile(filePath, 'utf-8')
  return fileContent.trim()
}

export const resolveNvmAlias = async ({ nvmDir, alias } = {}) => {
  // !FIXME: special, node/stable -> latest
  // !FIXME: lts shortname
  // !FIXME: recursive alias [previousAliases arg?]
  const aliasPath = `${nvmDir}/alias/${alias}`
  if (
    !(await fs.stat(aliasPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    }))
  )
    throw new Error(`alias ${alias} does not exist`)
  return getVersionFromFile(aliasPath)
}

export const resolveNodeVersionAlias = async ({ cwd } = {}) => {
  const nodeVersionFile = await findUp(NODE_VERSION_FILES, { cwd })
  return getVersionFromFile(nodeVersionFile)
}

// NVM_DIR tell if installed
// stable: latest in versions/node (maybe chomped to minor)
// aliases: in the alias folder, lts/ in it
// Need recursion to resolve

// ! FIXME
// eslint-disable-next-line complexity
export const resolveVersionRangeAlias = async function (
  versionRange,
  { cwd, env = processEnv } = {},
) {
  if (versionRange === CURRENT_NODE_ALIAS) return processVersion

  if (versionRange === NODE_VERSION_ALIAS) {
    const resolvedVersion = await resolveNodeVersionAlias({ cwd })

    return resolvedVersion || processVersion
  }

  if (coerce(versionRange)) return versionRange

  // try to resolve alias
  if (env.NVM_DIR) {
    return resolveNvmAlias({ alias: versionRange, nvmDir: env.NVM_DIR })
  }

  return versionRange
}
