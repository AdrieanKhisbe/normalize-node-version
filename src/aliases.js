import { promises as fs } from 'fs'
import { version as processVersion, env as processEnv } from 'process'

import findUp from 'find-up'
import { coerce, rsort } from 'semver'

export const NODE_VERSION_ALIAS = '.'
export const NODE_VERSION_FILES = ['.node-version', '.nvmrc', '.naverc']
export const NODE_LATEST_ALIASES = ['stable', 'node', 'latest']
export const NODE_LTS_CODE_NAMES = [
  'argon',
  'boron',
  'carbon',
  'dubnium',
  'erbium',
  'fermium',
  'gallium',
  'hydrogen',
  'iron',
]
// v4 to v20 LTS retrieved from https://github.com/nodejs/Release/blob/master/CODENAMES.md

export const CURRENT_NODE_ALIAS = '_'

export const getVersionFromFile = async (filePath) => {
  if (filePath === undefined) return

  const fileContent = await fs.readFile(filePath, 'utf-8')
  return fileContent.trim()
}

export const resolveNvmLatestNode = async ({ nvmDir }) => {
  const nodeVersions = await fs.readdir(`${nvmDir}/versions/node`)
  return rsort(nodeVersions)[0]
}

export const ensureAliasPath = async ({ nvmDir, alias }) => {
  const aliasWithImplicitLts = NODE_LTS_CODE_NAMES.includes(alias)
    ? `lts/${alias}`
    : alias
  const aliasPath = `${nvmDir}/alias/${aliasWithImplicitLts}`

  await fs.stat(aliasPath).catch((error) => {
    if (error.code === 'ENOENT')
      throw new Error(`alias ${alias} does not exist`)
    throw error
  })

  return aliasPath
}

export const resolveNvmAlias = async ({
  nvmDir,
  alias,
  previousAliases = [],
} = {}) => {
  if (NODE_LATEST_ALIASES.includes(alias))
    return resolveNvmLatestNode({ nvmDir })

  if (previousAliases.includes(alias))
    throw new Error(
      `Nvm alias cycle detected ${previousAliases.join(' -> ')} -> ${alias}`,
    )
  const aliasPath = await ensureAliasPath({ nvmDir, alias })

  const resolvedVersion = await getVersionFromFile(aliasPath)
  if (coerce(resolvedVersion)) return resolvedVersion

  return resolveNvmAlias({
    nvmDir,
    alias: resolvedVersion,
    previousAliases: [...previousAliases, alias],
  })
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
