<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-panel about-panel">
      <img class="about-icon" src="/metamark-icon.png" alt="MetaMark">
      <h2 class="about-title">MetaMark</h2>
      <p class="about-version">版本 0.1.0</p>
      <p class="about-desc">一个 Typora 风格的 Markdown 编辑器</p>
      <p class="about-tech">基于 Tauri 2 + Vue 3 + TypeScript</p>
      <hr class="about-divider" />
      <p class="about-copy">© 2026 MetaMark Team</p>
      <button @click="$emit('close')" class="btn-primary">确定</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 32px 28px 24px;
}

.about-panel {
  text-align: center;
}

.about-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.about-title {
  font-size: 22px;
  font-weight: 700;
  color: #222;
  margin-bottom: 4px;
}

.about-version {
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
}

.about-desc {
  font-size: 14px;
  color: #555;
  margin-bottom: 6px;
}

.about-tech {
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}

.about-divider {
  border: none;
  border-top: 1px solid #eee;
  margin-bottom: 12px;
}

.about-copy {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 20px;
}

.btn-primary {
  padding: 6px 28px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #1976d2;
  cursor: pointer;
  background: #1976d2;
  color: #fff;
}

.btn-primary:hover {
  background: #1565c0;
}
</style>
