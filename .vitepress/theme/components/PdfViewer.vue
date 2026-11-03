<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'

const props = withDefaults(defineProps<{ src: string; title?: string; height?: string }>(), {
  title: '',
  height: '78vh',
})

const url = computed(() => withBase(props.src))
const fileName = computed(() => props.src.split('/').pop() || 'document.pdf')

const scroller = ref<HTMLElement>()
const pageEls = ref<HTMLElement[]>([])
const sizes = ref<{ w: number; h: number }[]>([])
const current = ref(1)
const pageInput = ref('1')
const zoom = ref(1)
const fitWidth = ref(0)
const loading = ref(true)
const error = ref('')

let doc: any = null
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
const visible = new Set<number>()
const drawn = new Map<number, number>() // page index -> width it was drawn at
const tasks = new Map<number, any>()

const pageWidth = computed(() => Math.max(240, Math.round(fitWidth.value * zoom.value)))
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)

async function draw(i: number) {
  if (!doc) return
  const w = pageWidth.value
  if (drawn.get(i) === w) return
  tasks.get(i)?.cancel()
  const page = await doc.getPage(i + 1)
  const base = page.getViewport({ scale: 1 })
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const viewport = page.getViewport({ scale: (w / base.width) * dpr })
  const canvas = pageEls.value[i]?.querySelector('canvas')
  if (!canvas) return
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport })
  tasks.set(i, task)
  try {
    await task.promise
    drawn.set(i, w)
  } catch (e: any) {
    // a newer render cancels this one; anything else is a real failure
    if (e?.name !== 'RenderingCancelledException') console.error('PdfViewer', e)
  }
}

function redrawVisible() {
  for (const i of visible) draw(i)
}

function observe() {
  io?.disconnect()
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = Number((e.target as HTMLElement).dataset.index)
        if (e.isIntersecting) {
          visible.add(i)
          draw(i)
        } else visible.delete(i)
      }
    },
    { root: scroller.value, rootMargin: '600px 0px' },
  )
  pageEls.value.forEach((el) => io!.observe(el))
}

function onScroll() {
  const s = scroller.value
  if (!s) return
  const mid = s.scrollTop + s.clientHeight / 3
  let n = 1
  pageEls.value.forEach((el, i) => {
    if (el.offsetTop <= mid) n = i + 1
  })
  if (n !== current.value) {
    current.value = n
    pageInput.value = String(n)
  }
}

function goTo(n: number) {
  const total = sizes.value.length
  const p = Math.min(Math.max(1, Math.round(n) || 1), total)
  const el = pageEls.value[p - 1]
  if (el && scroller.value) scroller.value.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
  current.value = p
  pageInput.value = String(p)
}

function setZoom(z: number) {
  const anchor = current.value
  zoom.value = Math.min(3, Math.max(0.5, Math.round(z * 100) / 100))
  nextTick(() => {
    const el = pageEls.value[anchor - 1]
    if (el && scroller.value) scroller.value.scrollTop = el.offsetTop - 16
    redrawVisible()
  })
}

function measure() {
  const s = scroller.value
  if (!s) return
  const pad = parseFloat(getComputedStyle(s).paddingLeft) || 0
  fitWidth.value = Math.min(s.clientWidth - pad * 2, 1000)
}

function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(current.value + 1) }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(current.value - 1) }
}

watch(pageWidth, () => nextTick(redrawVisible))

onMounted(async () => {
  try {
    const pdfjs: any = await import('pdfjs-dist')
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = worker
    doc = await pdfjs.getDocument(url.value).promise
    const list = []
    for (let i = 1; i <= doc.numPages; i++) {
      const v = (await doc.getPage(i)).getViewport({ scale: 1 })
      list.push({ w: v.width, h: v.height })
    }
    sizes.value = list
    loading.value = false
    await nextTick()
    measure()
    ro = new ResizeObserver(measure)
    ro.observe(scroller.value!)
    observe()
  } catch (e: any) {
    loading.value = false
    error.value = e?.message || 'Could not load the PDF.'
  }
})

onBeforeUnmount(() => {
  io?.disconnect()
  ro?.disconnect()
  tasks.forEach((t) => t.cancel())
  doc?.destroy()
})
</script>

<template>
  <div class="pdf" :style="{ '--pdf-height': height }">
    <div class="bar">
      <div class="name">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 2.5L17.5 8H14zM8 13h8v1.5H8zm0 3.5h8V18H8zM8 9.5h4V11H8z"/></svg>
        <span>{{ title || fileName }}</span>
      </div>
      <div class="controls" v-if="!error">
        <div class="group">
          <button type="button" title="Previous page" :disabled="current <= 1" @click="goTo(current - 1)">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>
          </button>
          <span class="pages">
            <input v-model="pageInput" inputmode="numeric" aria-label="Page" @keydown.enter="goTo(Number(pageInput))" @blur="goTo(Number(pageInput))" />
            <span>/ {{ sizes.length || '–' }}</span>
          </span>
          <button type="button" title="Next page" :disabled="current >= sizes.length" @click="goTo(current + 1)">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>
          </button>
        </div>
        <div class="group">
          <button type="button" title="Zoom out" @click="setZoom(zoom - 0.15)">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 11h14v2H5z"/></svg>
          </button>
          <button type="button" class="zoom" title="Fit width" @click="setZoom(1)">{{ zoomLabel }}</button>
          <button type="button" title="Zoom in" @click="setZoom(zoom + 0.15)">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
          </button>
        </div>
        <div class="group">
          <a :href="url" target="_blank" rel="noopener" title="Open in a new tab">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/></svg>
          </a>
          <a :href="url" :download="fileName" title="Download">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 4h2v8.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6zM5 18h14v2H5z"/></svg>
          </a>
        </div>
      </div>
    </div>
    <div ref="scroller" class="scroller" tabindex="0" @scroll.passive="onScroll" @keydown="onKey">
      <div v-if="loading" class="state">Loading PDF…</div>
      <div v-else-if="error" class="state">
        {{ error }} <a :href="url" target="_blank" rel="noopener">Open the file</a>
      </div>
      <div
        v-for="(s, i) in sizes"
        v-else
        :key="i"
        ref="pageEls"
        class="page"
        :data-index="i"
        :style="{ width: pageWidth + 'px', aspectRatio: `${s.w} / ${s.h}` }"
      >
        <canvas />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 10px 8px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name svg {
  flex: none;
  color: var(--vp-c-brand-1);
}
.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.group {
  display: flex;
  align-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  overflow: hidden;
}
.group button,
.group a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}
.group button:hover:not(:disabled),
.group a:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-default-soft);
}
.group button:disabled {
  opacity: 0.35;
  cursor: default;
}
.zoom {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 52px !important;
}
.pages {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}
.pages input {
  width: 34px;
  height: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
.scroller {
  height: var(--pdf-height);
  overflow: auto;
  padding: 24px;
  background: var(--vp-c-bg-alt);
  outline: none;
}
.page {
  margin: 0 auto 20px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12), 0 6px 20px -8px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}
.page:last-child {
  margin-bottom: 0;
}
.page canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.state {
  padding: 48px 0;
  text-align: center;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
@media (max-width: 640px) {
  .scroller {
    padding: 12px;
    height: 70vh;
  }
}
</style>
