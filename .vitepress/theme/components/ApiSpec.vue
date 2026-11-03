<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{ src: string }>()

const spec = ref<any>(null)
const error = ref('')
const url = computed(() => withBase(props.src))

const METHODS = ['get', 'post', 'put', 'patch', 'delete']

function refName(ref: string) {
  return ref.split('/').pop() as string
}

function resolve(s: any): any {
  if (s?.$ref) return spec.value?.components?.schemas?.[refName(s.$ref)] ?? {}
  return s ?? {}
}

// Short type label: "string", "Mapping", "array<StageRecord>", "enum".
function typeOf(s: any): string {
  if (!s) return 'any'
  if (s.$ref) return refName(s.$ref)
  if (s.type === 'array') return `array<${typeOf(s.items)}>`
  if (s.format) return `${s.type} (${s.format})`
  return s.type || 'object'
}

function refOf(s: any): string | null {
  if (s?.$ref) return refName(s.$ref)
  if (s?.type === 'array' && s.items?.$ref) return refName(s.items.$ref)
  return null
}

function props_(s: any) {
  const r = resolve(s)
  const req: string[] = r.required || []
  return Object.entries(r.properties || {}).map(([name, p]: [string, any]) => ({
    name,
    schema: p,
    required: req.includes(name),
  }))
}

const operations = computed(() => {
  if (!spec.value) return []
  const tags: { name: string; description?: string }[] = spec.value.tags || []
  const groups = new Map<string, any[]>(tags.map((t) => [t.name, []]))
  for (const [path, item] of Object.entries<any>(spec.value.paths || {})) {
    for (const m of METHODS) {
      const op = item[m]
      if (!op) continue
      const tag = op.tags?.[0] || 'Other'
      if (!groups.has(tag)) groups.set(tag, [])
      const params = [...(item.parameters || []), ...(op.parameters || [])]
      const body = op.requestBody?.content?.['application/json']?.schema
      const responses = Object.entries<any>(op.responses || {}).map(([code, r]) => ({
        code,
        description: r.description,
        schema: r.content?.['application/json']?.schema,
      }))
      groups.get(tag)!.push({ id: `${m}-${path}`, method: m, path, op, params, body, responses })
    }
  }
  return [...groups.entries()]
    .filter(([, ops]) => ops.length)
    .map(([name, ops]) => ({ name, description: tags.find((t) => t.name === name)?.description, ops }))
})

const schemas = computed(() => Object.entries<any>(spec.value?.components?.schemas || {}))

onMounted(async () => {
  try {
    const [{ load }, res] = await Promise.all([import('js-yaml'), fetch(url.value)])
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    spec.value = load(await res.text())
  } catch (e: any) {
    error.value = `Could not load the spec: ${e?.message || e}`
  }
})
</script>

<template>
  <div class="api">
    <div v-if="error" class="state">{{ error }}</div>
    <div v-else-if="!spec" class="state">Loading API spec…</div>
    <template v-else>
      <div class="head">
        <div class="title">
          <span class="name">{{ spec.info?.title }}</span>
          <span class="chip">v{{ spec.info?.version }}</span>
          <span v-if="spec.info?.['x-status']" class="chip status">{{ spec.info['x-status'] }}</span>
        </div>
        <p v-if="spec.info?.description" class="desc">{{ spec.info.description }}</p>
        <div class="meta">
          <span v-for="s in spec.servers || []" :key="s.url" class="server"><code>{{ s.url }}</code> {{ s.description }}</span>
          <a :href="url" target="_blank" rel="noopener">Raw OpenAPI file</a>
        </div>
      </div>

      <section v-for="g in operations" :key="g.name" class="group">
        <h3 :id="'tag-' + g.name.toLowerCase()">{{ g.name }}</h3>
        <p v-if="g.description" class="desc">{{ g.description }}</p>
        <details v-for="o in g.ops" :key="o.id" class="op">
          <summary>
            <span class="method" :class="o.method">{{ o.method.toUpperCase() }}</span>
            <code class="path">{{ o.path }}</code>
            <span class="summary">{{ o.op.summary }}</span>
            <span v-for="t in o.op['x-requirements'] || []" :key="t" class="req">{{ t }}</span>
          </summary>
          <div class="body">
            <p v-if="o.op.description">{{ o.op.description }}</p>

            <template v-if="o.params.length">
              <h4>Parameters</h4>
              <table>
                <thead><tr><th>Name</th><th>In</th><th>Type</th><th>Description</th></tr></thead>
                <tbody>
                  <tr v-for="p in o.params" :key="p.in + p.name">
                    <td><code>{{ p.name }}</code><span v-if="p.required" class="must">required</span></td>
                    <td>{{ p.in }}</td>
                    <td><code>{{ typeOf(p.schema) }}</code><div v-if="p.schema?.enum" class="enum">{{ p.schema.enum.join(' | ') }}</div></td>
                    <td>{{ p.description }}</td>
                  </tr>
                </tbody>
              </table>
            </template>

            <template v-if="o.body">
              <h4>Request body <a v-if="refOf(o.body)" class="type" :href="'#schema-' + refOf(o.body)">{{ typeOf(o.body) }}</a></h4>
              <table v-if="props_(o.body).length">
                <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
                <tbody>
                  <tr v-for="f in props_(o.body)" :key="f.name">
                    <td><code>{{ f.name }}</code><span v-if="f.required" class="must">required</span></td>
                    <td><code>{{ typeOf(f.schema) }}</code><div v-if="f.schema.enum" class="enum">{{ f.schema.enum.join(' | ') }}</div></td>
                    <td>{{ f.schema.description }}</td>
                  </tr>
                </tbody>
              </table>
            </template>

            <h4>Responses</h4>
            <div v-for="r in o.responses" :key="r.code" class="resp">
              <span class="code" :class="'c' + r.code[0]">{{ r.code }}</span>
              <span>{{ r.description }}</span>
              <a v-if="refOf(r.schema)" class="type" :href="'#schema-' + refOf(r.schema)">{{ typeOf(r.schema) }}</a>
            </div>
          </div>
        </details>
      </section>

      <section class="group">
        <h3 id="schemas">Schemas</h3>
        <div v-for="[name, s] in schemas" :key="name" :id="'schema-' + name" class="schema">
          <div class="schema-name">{{ name }}</div>
          <p v-if="s.description" class="desc">{{ s.description }}</p>
          <table v-if="s.properties">
            <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr v-for="f in props_(s)" :key="f.name">
                <td><code>{{ f.name }}</code><span v-if="f.required" class="must">required</span></td>
                <td>
                  <a v-if="refOf(f.schema)" class="type" :href="'#schema-' + refOf(f.schema)">{{ typeOf(f.schema) }}</a>
                  <code v-else>{{ typeOf(f.schema) }}</code>
                  <div v-if="f.schema.enum" class="enum">{{ f.schema.enum.join(' | ') }}</div>
                </td>
                <td>{{ f.schema.description }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else-if="s.enum" class="enum">{{ s.enum.join(' | ') }}</div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.api {
  margin-top: 24px;
}
.state {
  padding: 32px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 14px;
}
.head {
  padding: 20px 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.name {
  font-size: 18px;
  font-weight: 650;
}
.chip {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
}
.chip.status {
  color: var(--vp-c-warning-1);
  background: var(--vp-c-warning-soft);
  text-transform: capitalize;
}
.desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.group h3 {
  margin-top: 40px;
}
.op {
  margin-top: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.op[open],
.op:hover {
  border-color: var(--vp-c-brand-soft);
}
.op summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  cursor: pointer;
  list-style: none;
}
.op summary::-webkit-details-marker {
  display: none;
}
.method {
  min-width: 58px;
  padding: 2px 0;
  border-radius: 6px;
  text-align: center;
  font: 700 11px/18px var(--vp-font-family-mono);
  letter-spacing: 0.04em;
}
.method.get { color: #0b7a55; background: rgba(16, 185, 129, 0.14); }
.method.post { color: #3646c7; background: rgba(69, 82, 214, 0.14); }
.method.put,
.method.patch { color: #a15c07; background: rgba(245, 158, 11, 0.16); }
.method.delete { color: #b42318; background: rgba(240, 68, 56, 0.14); }
.dark .method.get { color: #5ee0b0; }
.dark .method.post { color: #a5b0ff; }
.dark .method.put,
.dark .method.patch { color: #fbc35a; }
.dark .method.delete { color: #ff8a80; }
.path {
  font-size: 14px;
  font-weight: 600;
  background: none !important;
  padding: 0 !important;
  color: var(--vp-c-text-1) !important;
}
.summary {
  flex: 1;
  min-width: 160px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
.req {
  padding: 0 7px;
  border-radius: 999px;
  font: 600 11px/18px var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.body {
  padding: 4px 16px 16px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.body h4 {
  margin: 18px 0 6px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
}
.body table,
.schema table {
  display: table;
  width: 100%;
  margin: 6px 0 0;
  font-size: 13px;
}
.must {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-danger-1);
}
.enum {
  margin-top: 2px;
  font: 12px/1.5 var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}
.type {
  font: 600 12px var(--vp-font-family-mono);
  margin-left: 6px;
  text-transform: none;
  letter-spacing: 0;
}
.resp {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  font-size: 14px;
}
.code {
  min-width: 40px;
  padding: 1px 0;
  border-radius: 6px;
  text-align: center;
  font: 700 12px/18px var(--vp-font-family-mono);
}
.c2 { color: #0b7a55; background: rgba(16, 185, 129, 0.14); }
.c4 { color: #a15c07; background: rgba(245, 158, 11, 0.16); }
.c5 { color: #b42318; background: rgba(240, 68, 56, 0.14); }
.schema {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  scroll-margin-top: calc(var(--vp-nav-height) + 24px);
}
.schema-name {
  font: 700 14px var(--vp-font-family-mono);
}
</style>
