<script setup lang="ts">
import { ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { usePlayerStore } from '@/stores/player'
import { duration } from '@/utils/format'
const measuredHeight = defineModel<number>('height', { default: 0 })
const player = usePlayerStore()
const playerBar = ref<HTMLElement>()
const { height } = useElementSize(playerBar, { width: 0, height: 0 }, { box: 'border-box' })
watch(height, (value) => {
  measuredHeight.value = value
})
</script>

<template>
  <audio :ref="(element) => player.attach(element as HTMLAudioElement | null)" preload="none" />
  <section
    v-if="player.track"
    ref="playerBar"
    :class="['audio-player', { 'is-collapsed': player.collapsed }]"
    aria-label="音频播放器"
  >
    <div v-if="!player.collapsed" class="audio-player-inner">
      <div class="player-track">
        <RouterLink
          :to="`/works/${player.track.work_id}`"
          class="player-track-name"
          :title="player.track.name"
          >{{ player.track.name }}</RouterLink
        >
        <p
          :title="`${player.track.work_name} · ${player.track.chapter} · ${player.track.uploader}`"
        >
          {{ player.track.work_name }} · {{ player.track.chapter }} · {{ player.track.uploader }}
        </p>
      </div>
      <div class="player-controls">
        <button
          type="button"
          class="icon-button"
          :disabled="!player.canSeek"
          aria-label="后退 15 秒"
          title="后退 15 秒"
          @click="player.skip(-15)"
        >
          ↶<span>15</span>
        </button>
        <button
          type="button"
          class="resource-play-button player-toggle"
          :aria-label="player.active ? '暂停播放' : '继续播放'"
          :title="player.active ? '暂停播放' : '继续播放'"
          :aria-busy="player.loading"
          @click="player.toggle"
        >
          <span v-if="player.loading" class="playback-spinner" aria-hidden="true"></span>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path v-if="player.playing" d="M6 5h4v14H6zm8 0h4v14h-4z" />
            <path v-else d="m8 5 11 7-11 7z" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-button"
          :disabled="!player.canSeek"
          aria-label="前进 15 秒"
          title="前进 15 秒"
          @click="player.skip(15)"
        >
          ↷<span>15</span>
        </button>
      </div>
      <div class="player-progress">
        <span class="tabular">{{ duration(player.position) }}</span>
        <input
          type="range"
          min="0"
          :max="player.duration || 0"
          step="0.1"
          :value="player.position"
          :disabled="!player.canSeek"
          aria-label="播放进度"
          :aria-valuetext="`${duration(player.position)} / ${duration(player.duration)}`"
          @input="player.seek(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="tabular">{{ duration(player.duration) }}</span>
      </div>
      <select
        class="player-rate"
        :value="player.rate"
        aria-label="播放倍速"
        @change="player.setRate(Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="rate in [0.75, 1, 1.25, 1.5, 1.75, 2]" :key="rate" :value="rate">
          {{ rate }}×
        </option>
      </select>
      <div class="player-window-actions">
        <button
          type="button"
          class="icon-button player-collapse"
          aria-label="收起播放器"
          title="收起播放器"
          @click="player.collapsed = true"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button
        ><button
          type="button"
          class="icon-button player-close"
          aria-label="关闭播放器"
          title="关闭播放器"
          @click="player.stop"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <p v-if="player.error" class="player-error" role="alert">
        {{ player.error }}
        <button type="button" class="text-button" @click="player.resume">重试</button>
      </p>
    </div>
    <div v-else class="audio-player-mini">
      <button
        type="button"
        class="resource-play-button player-toggle"
        :aria-label="player.active ? '暂停播放' : '继续播放'"
        :aria-busy="player.loading"
        @click="player.toggle"
      >
        <span v-if="player.loading" class="playback-spinner" aria-hidden="true"></span
        ><svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path v-if="player.playing" d="M6 5h4v14H6zm8 0h4v14h-4z" />
          <path v-else d="m8 5 11 7-11 7z" />
        </svg>
      </button>
      <button
        type="button"
        class="player-mini-track"
        aria-label="展开播放器"
        :title="player.track.name"
        @click="player.collapsed = false"
      >
        <strong>{{ player.track.name }}</strong
        ><span>{{
          player.error
            ? '播放未完成，展开后重试'
            : `${duration(player.position)} / ${duration(player.duration)}`
        }}</span>
      </button>
      <button
        type="button"
        class="icon-button"
        aria-label="展开播放器"
        title="展开播放器"
        @click="player.collapsed = false"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.audio-player {
  position: fixed;
  inset: auto 0 0;
  z-index: 40;
  padding: 10px 32px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid #cdded3;
  background: #fff;
  box-shadow: 0 -4px 20px #203e2b0b;
}
.audio-player-inner {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) auto minmax(160px, 1fr) 78px 62px;
  align-items: center;
  gap: 16px;
  max-width: 1776px;
  margin: 0 auto;
}
.player-track {
  min-width: 0;
}
.player-track-name,
.player-track p {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-track-name {
  color: var(--green);
  font-size: 13px;
  font-weight: 550;
}
.player-track p {
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
}
.player-controls {
  display: flex;
  align-items: center;
  gap: 7px;
}
.player-controls > .icon-button {
  position: relative;
  width: 32px;
  height: 36px;
  font-size: 27px;
  line-height: 1;
}
.player-controls > .icon-button span {
  position: absolute;
  top: 15px;
  font-size: 9px;
}
.player-toggle {
  width: 34px;
  height: 34px;
  padding: 7px;
  background: var(--green);
  color: #fff;
  border-color: var(--green);
}
.player-toggle:hover {
  background: var(--green-dark);
  border-color: var(--green-dark);
}
.player-progress {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  color: var(--muted);
  font-size: 12px;
}
.player-progress span {
  flex-shrink: 0;
}
.player-progress input[type='range'] {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 30px;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  accent-color: var(--green);
  box-shadow: none;
  cursor: pointer;
}
.player-progress input[type='range']:disabled {
  cursor: default;
  opacity: 0.5;
}
.player-progress input[type='range']:focus-visible {
  outline: 2px solid #86b69a;
  outline-offset: 2px;
  border-radius: 4px;
}
.player-rate {
  width: 78px !important;
  min-height: 32px !important;
  padding: 5px 8px !important;
  font-size: 12px !important;
}
.player-close {
  width: 32px;
  height: 32px;
  font-size: 24px;
}
.player-window-actions {
  display: flex;
  align-items: center;
}
.player-window-actions .icon-button,
.audio-player-mini > .icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.player-window-actions svg,
.audio-player-mini > .icon-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.player-collapse {
  width: 30px;
  height: 32px;
  font-size: 24px;
}
.audio-player.is-collapsed {
  inset: auto 12px calc(12px + env(safe-area-inset-bottom)) auto;
  width: min(280px, calc(100vw - 24px));
  padding: 8px 10px;
  border: 1px solid #cdded3;
  border-radius: 12px;
  box-shadow: 0 4px 20px #203e2b18;
}
.audio-player-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}
.player-mini-track {
  flex: 1;
  min-width: 0;
  padding: 0;
  background: transparent;
  text-align: left;
}
.player-mini-track strong,
.player-mini-track span {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.player-mini-track strong {
  font-size: 12px;
  font-weight: 550;
  color: var(--green);
}
.player-mini-track span {
  color: var(--muted);
  font-size: 11px;
}
.player-error {
  grid-column: 1 / -1;
  color: #ac513d;
  font-size: 12px;
  overflow-wrap: anywhere;
}
@media (max-width: 900px) {
  .audio-player {
    padding-inline: 20px;
  }
  .audio-player-inner {
    grid-template-columns: minmax(0, 1fr) auto 78px 62px;
    gap: 8px 12px;
  }
  .player-progress {
    grid-row: 2;
    grid-column: 1 / -1;
  }
}
@media (max-width: 640px) {
  .audio-player {
    padding: 9px 12px calc(9px + env(safe-area-inset-bottom));
  }
  .audio-player-inner {
    grid-template-columns: minmax(0, 1fr) auto 62px 52px;
    gap: 6px;
  }
  .player-controls {
    gap: 1px;
  }
  .player-controls > .icon-button {
    width: 28px;
  }
  .player-toggle {
    width: 30px;
    height: 30px;
    padding: 6px;
  }
  .player-rate {
    width: 62px !important;
  }
  .player-track p {
    font-size: 11px;
  }
  .player-close {
    width: 26px;
  }
  .player-collapse {
    width: 26px;
  }
}
</style>
