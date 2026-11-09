<script setup lang="ts">
defineProps<{ ready: boolean; bootError: string; absIconUrl: string; emosIconUrl: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="!ready" class="boot-screen">
    <img class="brand-mark" src="/favicon.svg" width="30" height="30" alt="" />
    <p>{{ bootError || '正在加载有声书…' }}</p>
    <button v-if="bootError" class="button primary" @click="$emit('retry')">再连一次</button>
  </div>
  <div v-else class="welcome">
    <main class="welcome-main">
      <img class="welcome-logo" src="/favicon.svg" width="56" height="56" alt="" />
      <h1>有声书</h1>
      <a class="button primary welcome-login" href="/api/sign"
        ><span class="welcome-login-label"
          ><img :src="emosIconUrl" width="24" height="24" alt="" />使用 EMOS 登录</span
        ><span aria-hidden="true">↗</span></a
      ><a
        class="button secondary welcome-abs abs-link"
        href="/web"
        target="_blank"
        rel="noopener noreferrer"
        ><img :src="absIconUrl" width="24" height="24" alt="" />前往 ABS 服务器</a
      >
    </main>
  </div>
</template>

<style scoped>
.brand-mark {
  display: block;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  object-fit: contain;
}
.boot-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #71856b;
}
.welcome {
  flex: 1;
  max-width: none;
  margin: 0;
  padding: 24px;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at 50% 28%, #dcebe1 0, transparent 58%), #f5f7f6;
}
.welcome-main {
  max-width: 420px;
  margin: 0;
  padding: 40px 36px;
  border: 1px solid #dce5df;
  border-radius: 18px;
  background: #fff;
  width: 100%;
  box-shadow: 0 18px 60px #2346330c;
  text-align: center;
}
.welcome-main h1 {
  margin: 0 0 32px;
  color: #385c42;
  font-size: 28px;
  font-weight: 650;
  line-height: 1.6;
  letter-spacing: 1px;
}
@media (max-width: 640px) {
  .welcome {
    padding: 18px;
  }
  .welcome-main {
    padding: 32px 24px;
  }
  .welcome-main h1 {
    font-size: 26px;
  }
}
.abs-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.abs-link img {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}
.welcome-logo {
  display: block;
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  border-radius: 14px;
  box-shadow: 0 8px 22px #28624718;
}
.welcome-login,
.welcome-abs {
  width: 100%;
  min-height: 46px;
  justify-content: flex-start;
  padding-inline: 18px;
  font-size: 15px;
}
.welcome-login > [aria-hidden] {
  margin-left: auto;
}
.welcome-abs {
  margin-top: 12px;
  gap: 10px;
}
.welcome-login-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.welcome-login-label img,
.welcome-abs img {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  object-fit: contain;
}
@media (max-width: 640px) {
  .brand-mark {
    width: 32px;
    height: 32px;
  }
}
</style>
