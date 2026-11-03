// Copies the standards and skills from the harness repo into standards/ so the wiki
// shows them. harness stays the only place where they are edited.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const src = path.join(root, '.harness')
const out = path.join(root, 'standards')
const repo = 'https://github.com/sweg9/harness'

if (!fs.existsSync(src)) {
  execSync(`git clone --depth 1 ${repo}.git .harness`, { stdio: 'inherit' })
} else {
  try { execSync('git -C .harness pull --ff-only -q', { stdio: 'ignore' }) } catch { /* offline: keep the copy we have */ }
}

const note = (file) =>
  `::: info Synced from harness\nThis page is copied from [harness/${file}](${repo}/blob/main/${file}) at build time. Edit it there, not here.\n:::\n\n`

// Split "---\nfront\n---\nbody" and read simple "key: value" lines.
function parse(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { meta, body: m[2] }
}

// Put the sync note right under the first heading.
function withNote(body, file) {
  const lines = body.split('\n')
  const h = lines.findIndex((l) => l.startsWith('# '))
  if (h < 0) return note(file) + body
  lines.splice(h + 1, 0, '', note(file).trimEnd())
  return lines.join('\n')
}

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'skills'), { recursive: true })

for (const f of fs.readdirSync(path.join(src, 'standards'))) {
  if (!f.endsWith('.md')) continue
  const { meta, body } = parse(fs.readFileSync(path.join(src, 'standards', f), 'utf8'))
  const name = f === 'SKILL.md' ? 'index.md' : f
  const front = meta.description ? `---\ndescription: ${JSON.stringify(meta.description)}\n---\n\n` : ''
  fs.writeFileSync(path.join(out, name), front + withNote(body, `standards/${f}`))
}

const skills = []
for (const d of fs.readdirSync(src).sort()) {
  const file = path.join(src, d, 'SKILL.md')
  if (d === 'standards' || !fs.existsSync(file)) continue
  const { meta, body } = parse(fs.readFileSync(file, 'utf8'))
  skills.push({ name: meta.name || d, description: meta.description || '' })
  fs.writeFileSync(path.join(out, 'skills', `${d}.md`), withNote(body, `${d}/SKILL.md`))
}

const rows = skills.map((s) => `| [\`${s.name}\`](./${s.name}) | ${s.description.replace(/\|/g, '\\|')} |`).join('\n')
fs.writeFileSync(
  path.join(out, 'skills', 'index.md'),
  `# Skills\n\n${note('README.md').trimEnd()}\n\nClaude Code skills shared by every repo through the \`skills/\` submodule.\n\n| Skill | When to use |\n|---|---|\n${rows}\n`,
)
fs.writeFileSync(path.join(out, 'skills.json'), JSON.stringify(skills.map((s) => s.name)))
console.log(`synced standards and ${skills.length} skills from harness`)
