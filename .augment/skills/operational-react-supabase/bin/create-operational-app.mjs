#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = dirname(fileURLToPath(import.meta.url))
const templateDirectory = resolve(packageDirectory, '..', 'starter')

const usage = `Usage: pnpm dlx @doscientos/create-operational-app <directory> [options]

Options:
  --name <package-name>  Package name (defaults to the directory name)
  --title <title>        Application title (defaults to a humanized directory name)
  --dry-run              Show the project that would be generated without writing it
  --install              Run pnpm install after generating the project
  --help                 Show this help message`

function usageError(message) {
  return new Error(`${message}\n\n${usage}`)
}

function readOptionValue(argumentsList, index, option) {
  const argument = argumentsList[index]
  const equalsPrefix = `${option}=`

  if (argument.startsWith(equalsPrefix))
    return { value: argument.slice(equalsPrefix.length), nextIndex: index }

  const value = argumentsList[index + 1]
  if (!value) throw usageError(`${option} requires a value.`)
  return { value, nextIndex: index + 1 }
}

function parseArguments(argumentsList) {
  const options = {
    dryRun: false,
    install: false,
    name: undefined,
    title: undefined,
    target: undefined,
  }

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]

    if (argument === '--help' || argument === '-h') return { help: true }
    if (argument === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (argument === '--install') {
      options.install = true
      continue
    }
    if (argument === '--name' || argument.startsWith('--name=')) {
      const option = readOptionValue(argumentsList, index, '--name')
      options.name = option.value
      index = option.nextIndex
      continue
    }
    if (argument === '--title' || argument.startsWith('--title=')) {
      const option = readOptionValue(argumentsList, index, '--title')
      options.title = option.value
      index = option.nextIndex
      continue
    }
    if (argument.startsWith('-')) throw usageError(`Unknown option: ${argument}`)
    if (options.target) throw usageError('Only one destination directory can be provided.')
    options.target = argument
  }

  if (!options.target) throw usageError('A destination directory is required.')
  if (options.install && options.dryRun)
    throw usageError('--install cannot be used with --dry-run.')

  return options
}

function assertPackageName(name) {
  const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
  if (!packageNamePattern.test(name)) {
    throw usageError(
      'Package names must use lowercase letters, numbers, dots, underscores, or hyphens.',
    )
  }
}

function humanizeDirectoryName(target) {
  const name = basename(target)
    .replace(/[-_.]+/g, ' ')
    .trim()
  return name.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()) || 'Aplicación operativa'
}

function assertTitle(title) {
  if (!title || /[\u0000-\u001F\u007F]/.test(title)) {
    throw usageError('The application title must contain visible text only.')
  }
}

function escapeMarkup(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
}

async function assertEmptyDestination(destination) {
  try {
    const destinationStats = await stat(destination)
    if (!destinationStats.isDirectory())
      throw new Error(`Destination exists and is not a directory: ${destination}`)

    const entries = await readdir(destination)
    if (entries.length > 0) throw new Error(`Destination directory must be empty: ${destination}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

async function listFiles(directory, relativePath = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name
    const entryPath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath, entryRelativePath)))
    } else if (entry.isFile()) {
      files.push(entryRelativePath)
    }
  }

  return files
}

function renderTemplate(relativePath, contents, project) {
  const normalizedContents = contents.replaceAll('\r\n', '\n')

  if (relativePath === 'package.json') {
    return normalizedContents.replaceAll('__APP_PACKAGE_NAME__', project.name)
  }

  if (relativePath === 'index.html' || relativePath === 'src/app/app-frame.tsx') {
    return normalizedContents.replaceAll('__APP_TITLE__', escapeMarkup(project.title))
  }

  return normalizedContents
}

async function copyTemplate(destination, project) {
  for (const relativePath of await listFiles(templateDirectory)) {
    const source = resolve(templateDirectory, relativePath)
    const outputPath = relativePath === 'gitignore' ? '.gitignore' : relativePath
    const target = resolve(destination, outputPath)
    const contents = await readFile(source, 'utf8')

    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, renderTemplate(relativePath, contents, project), {
      encoding: 'utf8',
      flag: 'wx',
    })
  }
}

async function runPnpmInstall(destination) {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

  await new Promise((resolveInstall, rejectInstall) => {
    const child = spawn(pnpm, ['install'], { cwd: destination, stdio: 'inherit' })
    child.once('error', () =>
      rejectInstall(new Error('Could not run pnpm install. Install pnpm and retry manually.')),
    )
    child.once('exit', (code) => {
      if (code === 0) resolveInstall()
      else rejectInstall(new Error(`pnpm install failed with exit code ${code ?? 'unknown'}.`))
    })
  })
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage)
    return
  }

  const destination = resolve(process.cwd(), options.target)
  const name = (options.name ?? basename(destination)).trim()
  const title = (options.title ?? humanizeDirectoryName(destination)).trim()
  assertPackageName(name)
  assertTitle(title)
  await access(templateDirectory, constants.R_OK)
  await assertEmptyDestination(destination)

  const files = await listFiles(templateDirectory)
  if (options.dryRun) {
    console.log(`Dry run: would create ${files.length} files in ${destination}`)
    console.log(`Package: ${name}`)
    console.log(`Title: ${title}`)
    return
  }

  await mkdir(destination, { recursive: true })
  await copyTemplate(destination, { name, title })
  console.log(`Created ${name} in ${destination}`)
  console.log('Next: review the generated project, run pnpm quality, then pnpm build.')

  if (options.install) await runPnpmInstall(destination)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
