<script setup lang="ts">
const repositories = [
  { label: '前端', name: 'abs_web', url: 'https://github.com/somebyteorg/abs_web' },
  { label: '后端', name: 'abs_api', url: 'https://github.com/somebyteorg/abs_api' },
]
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>EMOS 有声书怎么发展，你也可以参与决定。</p>
      <nav class="footer-links" aria-label="反馈与代码贡献">
        <a
          class="button secondary small footer-link"
          href="https://voice.somebyte.org/project/261108"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="https://voice.somebyte.org/favicon.svg" width="18" height="18" alt="" />
          <span>回音墙 · 官方反馈</span>
          <span aria-hidden="true">↗</span>
        </a>
        <a
          v-for="repository in repositories"
          :key="repository.name"
          :href="repository.url"
          class="button secondary small footer-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.86c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          <span>GitHub · {{ repository.label }}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 20px;
  max-width: 1840px;
  margin: 0 auto;
  padding: 12px 32px calc(12px + env(safe-area-inset-bottom));
}
.footer-inner p {
  color: var(--muted);
  font-size: 13px;
}
.footer-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.footer-link {
  line-height: 20px;
}
.footer-link img,
.footer-link svg {
  display: block;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  object-fit: contain;
}
@media (max-width: 1200px) {
  .footer-inner {
    padding-inline: 24px;
  }
}
@media (max-width: 900px) {
  .footer-inner {
    padding-inline: 20px;
  }
}
@media (max-width: 640px) {
  .footer-inner {
    padding-inline: 16px;
  }
}
</style>
