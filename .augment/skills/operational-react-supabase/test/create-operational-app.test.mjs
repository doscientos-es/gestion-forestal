import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const runFile = promisify(execFile)
const packageDirectory = resolve(import.meta.dirname, '..')
const command = join(packageDirectory, 'bin', 'create-operational-app.mjs')

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'create-operational-app-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function runCli(argumentsList) {
  return runFile(process.execPath, [command, ...argumentsList])
}

test('creates a personalized operational project from the single starter template', async () => {
  await withTemporaryDirectory(async (directory) => {
    const target = join(directory, 'acme-crm')
    const result = await runCli([target, '--name', '@acme/crm', '--title', 'CRM Acme'])
    const packageJson = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    const lockfile = await readFile(join(target, 'pnpm-lock.yaml'), 'utf8')
    const html = await readFile(join(target, 'index.html'), 'utf8')
    const appFrame = await readFile(join(target, 'src', 'app', 'app-frame.tsx'), 'utf8')

    assert.match(result.stdout, /Created @acme\/crm/)
    assert.equal(packageJson.name, '@acme/crm')
    assert.equal(packageJson.dependencies['@doscientos/ui'], '^0.1.31')
    assert.equal(packageJson.devDependencies['@doscientos/configs'], '^0.1.9')
    assert.equal(packageJson.scripts.test, 'vitest run')
    assert.equal(packageJson.scripts['quality:quick'], 'pnpm format:check && pnpm lint')
    assert.equal(packageJson.scripts['hooks:install'], 'node .githooks/install.mjs')
    assert.equal(
      packageJson.scripts.prepare,
      undefined,
      'generation must not silently install hooks',
    )
    assert.match(lockfile, /^lockfileVersion:/m)
    const hook = await readFile(join(target, '.githooks', 'pre-commit'), 'utf8')
    assert.match(hook, /exec pnpm quality:quick/)
    assert.doesNotMatch(hook, /\r|--fix|--write|stash|git add/)
    await readFile(join(target, '.githooks', 'install.mjs'), 'utf8')
    assert.match(
      await readFile(join(target, '.githooks', '.gitattributes'), 'utf8'),
      /pre-commit text eol=lf/,
    )
    assert.equal(
      packageJson.scripts['changelog:sync'],
      'changelog generate public/changelog.json --md CHANGELOG.md --soft',
    )
    assert.match(packageJson.scripts['changelog:check'], /--check/)
    assert.match(packageJson.scripts.build, /^pnpm changelog:sync/)
    assert.ok(packageJson.devDependencies['@doscientos/changelog'])
    const commitMsg = await readFile(join(target, '.githooks', 'commit-msg'), 'utf8')
    assert.match(commitMsg, /changelog lint-commit/)
    assert.doesNotMatch(commitMsg, /\r/)
    assert.match(
      await readFile(join(target, '.githooks', '.gitattributes'), 'utf8'),
      /commit-msg text eol=lf/,
    )
    assert.deepEqual(JSON.parse(await readFile(join(target, 'public', 'changelog.json'), 'utf8')), {
      releases: [],
    })
    await readFile(join(target, 'CHANGELOG.md'), 'utf8')
    assert.match(
      await readFile(join(target, '.prettierignore'), 'utf8'),
      /CHANGELOG\.md[\s\S]*public\/changelog\.json/,
    )
    const workflow = await readFile(join(target, '.github', 'workflows', 'ci.yml'), 'utf8')
    assert.match(workflow, /fetch-depth: 0/)
    assert.match(workflow, /pnpm install --frozen-lockfile/)
    assert.match(workflow, /pnpm quality/)
    assert.match(workflow, /pnpm build/)
    assert.match(html, /<title>CRM Acme<\/title>/)
    assert.match(appFrame, /CRM Acme/)
    assert.doesNotMatch(html, /__APP_TITLE__/)
    assert.doesNotMatch(appFrame, /__APP_TITLE__/)
    assert.match(appFrame, /href="#main-content"/)
    assert.match(appFrame, /tabIndex=\{-1\}/)
    assert.match(appFrame, /aria-current=/)
    assert.match(appFrame, /previousPath\.current !== pathname/)
    assert.match(appFrame, /starter-mobile-nav/)
    await readFile(join(target, 'src', 'routes', 'guia.tsx'), 'utf8')
    await readFile(join(target, 'src', 'app', 'theme.test.ts'), 'utf8')
    await readFile(
      join(target, 'src', 'features', 'customers', 'infrastructure', 'customer-fixtures.ts'),
      'utf8',
    )
    await assert.rejects(readFile(join(target, 'src', 'demos', 'customers.ts'), 'utf8'), {
      code: 'ENOENT',
    })
    await readFile(
      join(target, 'src', 'features', 'customers', 'ui', 'customer-create-dialog.tsx'),
      'utf8',
    )
    await readFile(join(target, '.env.example'), 'utf8')
    await readFile(join(target, '.gitignore'), 'utf8')
    await readFile(
      join(target, 'src', 'features', 'customers', 'application', 'customer-search.test.ts'),
      'utf8',
    )
  })
})

test('escapes a custom title in every shell occurrence and in the HTML document', async () => {
  await withTemporaryDirectory(async (directory) => {
    const target = join(directory, 'escaped-title')
    await runCli([target, '--title', 'Demo <&> {team}'])
    for (const file of ['index.html', 'src/app/app-frame.tsx']) {
      const content = await readFile(join(target, file), 'utf8')
      assert.match(content, /Demo &lt;&amp;&gt; &#123;team&#125;/)
      assert.doesNotMatch(content, /__APP_TITLE__|Demo <&>/)
    }
  })
})

test('reports a dry run without creating the destination', async () => {
  await withTemporaryDirectory(async (directory) => {
    const target = join(directory, 'dry-run-crm')
    const result = await runCli([target, '--dry-run'])

    assert.match(result.stdout, /Dry run: would create/)
    await assert.rejects(readFile(join(target, 'package.json'), 'utf8'), { code: 'ENOENT' })
  })
})

test('refuses to overwrite a non-empty directory', async () => {
  await withTemporaryDirectory(async (directory) => {
    const target = join(directory, 'existing-crm')
    const existingFile = join(target, 'keep.txt')
    await mkdir(target)
    await writeFile(existingFile, 'do not overwrite', { encoding: 'utf8' })

    await assert.rejects(runCli([target]), /Destination directory must be empty/)
    assert.equal(await readFile(existingFile, 'utf8'), 'do not overwrite')
  })
})
