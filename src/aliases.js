import { promises as fs } from 'fs'
import { version as processVersion } from 'process'

import findUp from 'find-up'
import { coerce, rsort } from 'semver'

// `versionRange` can be one of the following aliases:
//   - `_`: current process's Node.js version
//   - `.`: current project's Node.js version using `.nvmrc`, etc.
export const resolveAlias = function (versionRange, opts) {
  const { nvmDir } = opts
  const getVersion = ALIASES[versionRange]

  if (getVersion !== undefined) {
    return getVersion(opts)
  }

  if (coerce(versionRange)) {
    return versionRange
  }

  // try to resolve alias
  if (nvmDir) {
    return resolveNvmAlias({ alias: versionRange, nvmDir })
  }

  return versionRange
}

const getCurrentVersion = function () {
  return processVersion
}

const getVersionFromFile = async (filePath) => {
  if (filePath === undefined) return

  const content = await fs.readFile(filePath, 'utf-8')
  return content.trim()
}

const getProjectVersion = async function ({ cwd }) {
  const nodeVersionFile = await findUp(NODE_VERSION_FILES, { cwd })

  return getVersionFromFile(nodeVersionFile)
}

const resolveNvmLatestNode = async ({ nvmDir }) => {
  const nodeVersions = await fs.readdir(`${nvmDir}/versions/node`)
  return rsort(nodeVersions)[0]
}

const ensureAliasPath = async ({ nvmDir, alias }) => {
  const aliasWithImplicitLts = NODE_LTS_CODE_NAMES.has(alias)
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

const resolveNvmAlias = async ({
  nvmDir,
  alias,
  previousAliases = [],
} = {}) => {
  if (NODE_LATEST_ALIASES.has(alias)) {
    return resolveNvmLatestNode({ nvmDir })
  }

  if (previousAliases.includes(alias)) {
    throw new Error(
      `Nvm alias cycle detected ${previousAliases.join(' -> ')} -> ${alias}`,
    )
  }

  const aliasPath = await ensureAliasPath({ nvmDir, alias })

  const resolvedVersion = await getVersionFromFile(aliasPath)
  if (coerce(resolvedVersion)) return resolvedVersion

  return resolveNvmAlias({
    nvmDir,
    alias: resolvedVersion,
    previousAliases: [...previousAliases, alias],
  })
}

const NODE_VERSION_FILES = ['.naverc', '.node-version', '.nvmrc']
const NODE_LATEST_ALIASES = new Set(['stable', 'node', 'latest'])
const NODE_LTS_CODE_NAMES = new Set([
  'argon',
  'boron',
  'carbon',
  'dubnium',
  'erbium',
  'fermium',
  'gallium',
  'hydrogen',
  'iron',
])

// List of available aliases
const ALIASES = {
  _: getCurrentVersion,
  '.': getProjectVersion,
}
